// Touch gesture utilities for mobile support

export interface TouchGesture {
    type: 'tap' | 'longPress' | 'pinch' | 'pan';
    x: number;
    y: number;
    scale?: number;
    deltaX?: number;
    deltaY?: number;
}

export class TouchHandler {
    private touchStartTime: number = 0;
    private longPressTimer: number | null = null;
    private initialTouches: Touch[] = [];
    private initialDistance: number = 0;
    private initialScale: number = 1;
    private lastCenter: { x: number, y: number } = { x: 0, y: 0 };
    private onGesture: (gesture: TouchGesture) => void;

    constructor(onGesture: (gesture: TouchGesture) => void) {
        this.onGesture = onGesture;
    }

    handleTouchStart = (e: TouchEvent) => {
        this.touchStartTime = Date.now();
        this.initialTouches = Array.from(e.touches);

        if (e.touches.length === 1) {
            // Single touch - might be tap or long press
            const touch = e.touches[0];

            // Start long press timer
            this.longPressTimer = window.setTimeout(() => {
                this.onGesture({
                    type: 'longPress',
                    x: touch.clientX,
                    y: touch.clientY
                });
            }, 500); // 500ms for long press

        } else if (e.touches.length === 2) {
            // Two fingers - pinch or pan
            this.clearLongPressTimer();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            this.initialDistance = this.getDistance(touch1, touch2);
            this.lastCenter = this.getCenter(touch1, touch2);
        }
    };

    handleTouchMove = (e: TouchEvent, currentScale: number) => {
        this.clearLongPressTimer(); // Cancel long press if moving

        if (e.touches.length === 2) {
            // Pinch to zoom or two-finger pan
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const currentDistance = this.getDistance(touch1, touch2);
            const currentCenter = this.getCenter(touch1, touch2);

            // Calculate scale change
            if (this.initialDistance > 0) {
                const scaleChange = currentDistance / this.initialDistance;
                this.onGesture({
                    type: 'pinch',
                    x: currentCenter.x,
                    y: currentCenter.y,
                    scale: scaleChange
                });
                this.initialDistance = currentDistance;
            }

            // Calculate pan delta
            const deltaX = currentCenter.x - this.lastCenter.x;
            const deltaY = currentCenter.y - this.lastCenter.y;

            if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                this.onGesture({
                    type: 'pan',
                    x: currentCenter.x,
                    y: currentCenter.y,
                    deltaX,
                    deltaY
                });
            }

            this.lastCenter = currentCenter;
        }
    };

    handleTouchEnd = (e: TouchEvent) => {
        this.clearLongPressTimer();

        // If it's a quick tap (< 300ms) with single touch
        if (this.initialTouches.length === 1 && e.changedTouches.length === 1) {
            const touchDuration = Date.now() - this.touchStartTime;
            if (touchDuration < 300) {
                const touch = e.changedTouches[0];
                this.onGesture({
                    type: 'tap',
                    x: touch.clientX,
                    y: touch.clientY
                });
            }
        }

        this.initialTouches = [];
        this.initialDistance = 0;
    };

    private clearLongPressTimer() {
        if (this.longPressTimer) {
            window.clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    private getDistance(touch1: Touch, touch2: Touch): number {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private getCenter(touch1: Touch, touch2: Touch): { x: number, y: number } {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    cleanup() {
        this.clearLongPressTimer();
    }
}
