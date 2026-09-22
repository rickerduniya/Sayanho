// Detection Wake Service
// ---------------------------------------------------------------------------
// The floor-plan detection model runs on a Hugging Face Space, which suspends
// its container when idle. The first Detect Rooms call after a quiet period
// otherwise pays the full cold start (container boot + model load, often a
// minute or more) while the user stares at a spinner — and the existing
// fetchWithRetry 503 loop only starts warming it at that point.
//
// Mirrors serverWakeService (same shape, same subscriber pattern) with two
// differences that matter for HF Spaces:
//
//  1. The probe target is the Space root (`GET /`), which serves the cheap
//     Gradio landing page — never `/predict`, which would run the model.
//  2. A 503 response means ASLEEP here (HF uses 503 for sleeping/building
//     Spaces), whereas for our own backend any HTTP response counts as awake.
//
// Started twice: at app boot in main.tsx (earliest — overlaps landing page)
// and on every login/session-restore in AuthContext, so the Space is warm by
// the time the user reaches Detect Rooms. detectLayout also calls
// ensureAwake() right before POSTing, and reports real traffic via
// noteActivity() so the keep-alive only pings during genuine idle periods.

export const HF_SPACE_ROOT = 'https://nilche111-floorplan3d-api.hf.space';

export type DetectionStatus =
    | 'unknown'      // nothing attempted yet
    | 'checking'     // a probe is in flight and has been fast so far
    | 'waking'       // probe is taking long enough that this is a cold start
    | 'ready'        // Space answered successfully
    | 'unreachable'; // gave up after exhausting retries

export interface DetectionStatusSnapshot {
    status: DetectionStatus;
    /** ms spent on the current wake attempt (0 when not waking). */
    elapsedMs: number;
    /** Timestamp of the last successful Space response, or null. */
    lastSuccessAt: number | null;
    /** How many probe attempts the current wake cycle has made. */
    attempt: number;
}

type Listener = (snapshot: DetectionStatusSnapshot) => void;

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

/** Show "waking up" only after the probe has been slow enough to mean a cold start. */
const COLD_START_NOTICE_DELAY_MS = 2_000;

/** Per-probe timeout. HF cold boots load a model, so this is generous. */
const PROBE_TIMEOUT_MS = 20_000;

/** Total budget for one wake cycle before we report the Space unreachable. */
const WAKE_BUDGET_MS = 4 * 60_000;

/** Delay between failed probes. */
const RETRY_DELAY_MS = 5_000;

/** Send a keep-alive ping once Space traffic has been idle this long. */
const IDLE_PING_INTERVAL_MS = 10 * 60_000; // 10 minutes

/** How often we check whether the idle threshold has been crossed. */
const IDLE_CHECK_INTERVAL_MS = 60_000;

/** Elapsed-time refresh rate while waking, so the UI can count up. */
const TICK_INTERVAL_MS = 500;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const listeners = new Set<Listener>();

let status: DetectionStatus = 'unknown';
let attempt = 0;
let wakeStartedAt: number | null = null;
let lastSuccessAt: number | null = null;
let lastActivityAt = 0;

let wakePromise: Promise<boolean> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let idleTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

const snapshot = (): DetectionStatusSnapshot => ({
    status,
    elapsedMs: wakeStartedAt ? Date.now() - wakeStartedAt : 0,
    lastSuccessAt,
    attempt
});

const emit = () => {
    const current = snapshot();
    listeners.forEach(listener => {
        try {
            listener(current);
        } catch (error) {
            console.error('[DetectionWake] listener failed', error);
        }
    });
};

const setStatus = (next: DetectionStatus) => {
    if (status === next) return;
    status = next;
    emit();
};

const startTicking = () => {
    if (tickTimer) return;
    tickTimer = setInterval(emit, TICK_INTERVAL_MS);
};

const stopTicking = () => {
    if (!tickTimer) return;
    clearInterval(tickTimer);
    tickTimer = null;
};

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Single cheap probe of the Space root. Resolves true when the Space answered
 * with anything other than 503 — a 503 from Hugging Face means the Space is
 * sleeping or still building, so unlike our own backend it must NOT count as
 * awake. Only transport failures, timeouts and 503s count as still-asleep.
 */
const probeOnce = async (): Promise<boolean> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        const response = await fetch(`${HF_SPACE_ROOT}/?_:${Date.now()}`, {
            method: 'GET',
            signal: controller.signal,
            // The probe carries no credentials and must not be cached.
            credentials: 'omit',
            cache: 'no-store'
        });
        return response.status !== 503;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
};

const markSuccess = () => {
    lastSuccessAt = Date.now();
    lastActivityAt = lastSuccessAt;
    attempt = 0;
    wakeStartedAt = null;
    stopTicking();
    setStatus('ready');
    // setStatus is a no-op if we were already 'ready', but the timestamps above
    // changed, so make sure subscribers still see the fresh snapshot.
    emit();
};

const runWakeCycle = async (budgetMs: number): Promise<boolean> => {
    wakeStartedAt = Date.now();
    attempt = 0;
    setStatus('checking');
    startTicking();

    const noticeTimer = setTimeout(() => {
        if (status === 'checking') setStatus('waking');
    }, COLD_START_NOTICE_DELAY_MS);

    try {
        while (Date.now() - wakeStartedAt < budgetMs) {
            attempt += 1;
            emit();

            const awake = await probeOnce();
            if (awake) {
                clearTimeout(noticeTimer);
                markSuccess();
                return true;
            }

            // Still asleep. On a cold start this is expected for the first
            // minute or more, so keep going until the budget is spent.
            setStatus('waking');
            await sleep(RETRY_DELAY_MS);
        }

        clearTimeout(noticeTimer);
        stopTicking();
        setStatus('unreachable');
        return false;
    } finally {
        clearTimeout(noticeTimer);
        stopTicking();
        wakePromise = null;
        if (status !== 'ready' && status !== 'unreachable') {
            // Defensive: never leave subscribers stuck on a transient status.
            setStatus('unreachable');
        }
    }
};

// ---------------------------------------------------------------------------
// Keep-alive
// ---------------------------------------------------------------------------

const keepAliveTick = () => {
    // Nothing to keep alive if we never reached the Space, or if the browser
    // knows it is offline. Also skip while a wake cycle is already running.
    if (wakePromise) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        // Background tabs get throttled; we ping again on becoming visible.
        return;
    }

    const idleFor = Date.now() - lastActivityAt;
    if (idleFor < IDLE_PING_INTERVAL_MS) return;

    void (async () => {
        const awake = await probeOnce();
        if (awake) {
            // Note the ping itself as the new activity marker so the next ping
            // is a full interval away.
            lastSuccessAt = Date.now();
            lastActivityAt = lastSuccessAt;
            setStatus('ready');
        } else {
            // The Space went to sleep despite the keep-alive. Start a full
            // wake cycle so subscribers see it honestly.
            void detectionWake.ensureAwake({ force: true });
        }
    })();
};

const handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return;
    // Coming back to the tab is the moment the user is most likely to detect,
    // so verify the Space is still up if we have been away a while.
    if (Date.now() - lastActivityAt >= IDLE_PING_INTERVAL_MS) {
        void detectionWake.ensureAwake({ force: true });
    }
};

const handleOnline = () => {
    void detectionWake.ensureAwake({ force: true });
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const detectionWake = {
    /**
     * Begin waking the Space and start the keep-alive loop. Safe to call
     * repeatedly; only the first call does the setup work.
     *
     * Call this as early as possible (app boot) and again at login, so the
     * cold start overlaps with time the user spends elsewhere.
     */
    start(): Promise<boolean> {
        if (!started) {
            started = true;

            idleTimer = setInterval(keepAliveTick, IDLE_CHECK_INTERVAL_MS);

            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', handleVisibilityChange);
            }
            if (typeof window !== 'undefined') {
                window.addEventListener('online', handleOnline);
            }
        }

        return this.ensureAwake();
    },

    /**
     * Ensure a wake cycle is running. Concurrent callers share one cycle.
     *
     * @param force Re-probe even if the Space previously answered.
     * @param budgetMs Override the wake budget for this cycle — the
     * pre-detect check uses a shorter budget so a dead Space fails fast and
     * the normal retry path takes over instead of stalling detection.
     */
    ensureAwake({ force = false, budgetMs = WAKE_BUDGET_MS }: { force?: boolean; budgetMs?: number } = {}): Promise<boolean> {
        if (wakePromise) return wakePromise;
        if (!force && status === 'ready') return Promise.resolve(true);

        wakePromise = runWakeCycle(budgetMs);
        return wakePromise;
    },

    /**
     * Record that real Space traffic just succeeded. Called after a
     * successful detectLayout so the keep-alive only fires during genuine
     * idle periods rather than on a fixed schedule.
     */
    noteActivity(): void {
        lastActivityAt = Date.now();
        lastSuccessAt = lastActivityAt;
        if (status !== 'ready') {
            setStatus('ready');
        }
    },

    /**
     * Record that a Space request failed at the transport level (no HTTP
     * response) or with a 503. That usually means the instance was suspended
     * again, so we start a wake cycle rather than letting the next detect
     * pay the cold start.
     */
    noteTransportFailure(): void {
        if (wakePromise) return;
        void this.ensureAwake({ force: true });
    },

    getSnapshot(): DetectionStatusSnapshot {
        return snapshot();
    },

    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        listener(snapshot());
        return () => {
            listeners.delete(listener);
        };
    },

    /** Test/teardown helper. Not used in normal app flow. */
    stop(): void {
        if (idleTimer) {
            clearInterval(idleTimer);
            idleTimer = null;
        }
        stopTicking();
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline);
        }
        started = false;
    }
};
