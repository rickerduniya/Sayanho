import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { apiTracer, ApiTraceEntry } from '../utils/apiTracer';
import { X, Trash2, Copy, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';

interface NetworkMonitorProps {
    onClose: () => void;
}

export const NetworkMonitor: React.FC<NetworkMonitorProps> = ({ onClose }) => {
    const { colors, theme } = useTheme();
    const [traces, setTraces] = useState<ApiTraceEntry[]>([]);
    const [selectedTraceId, setSelectedTraceId] = useState<number | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    // Initial load and subscription
    useEffect(() => {
        const updateTraces = () => {
            const currentTraces = apiTracer.getTraces();
            setTraces(currentTraces);

            // Auto-select latest if nothing selected or auto-scroll is on? 
            // Better to just update the list.
        };

        updateTraces();
        apiTracer.addListener(updateTraces);

        return () => {
            apiTracer.removeListener(updateTraces);
        };
    }, []);

    const handleClear = () => {
        apiTracer.clearTraces();
        setSelectedTraceId(null);
    };

    const handleCopy = async () => {
        try {
            await apiTracer.copyToClipboard();
            alert('Trace log copied to clipboard');
        } catch (e) {
            console.error('Failed to copy', e);
        }
    };

    const StatusBadge = ({ status, error }: { status?: number; error?: string }) => {
        if (error) return <span className="text-red-500 font-bold text-xs bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">ERR</span>;
        if (!status) return <span className="text-gray-500 text-xs">—</span>;

        let colorClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        if (status >= 200 && status < 300) colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        else if (status >= 400 && status < 500) colorClass = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        else if (status >= 500) colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

        return <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${colorClass}`}>{status}</span>;
    };

    const MethodBadge = ({ method }: { method: string }) => {
        let color = '#64748b'; // default
        if (method === 'GET') color = '#3b82f6';
        if (method === 'POST') color = '#22c55e';
        if (method === 'PUT') color = '#f59e0b';
        if (method === 'DELETE') color = '#ef4444';

        return <span className="text-xs font-bold" style={{ color }}>{method}</span>;
    };

    const selectedTrace = traces.find(t => t.id === selectedTraceId);

    return (
        <div
            className="fixed top-14 right-4 bottom-4 w-[600px] z-[9999] flex flex-col shadow-2xl rounded-xl overflow-hidden border animate-slide-in-right"
            style={{
                backgroundColor: colors.panelBackground,
                borderColor: colors.border,
                color: colors.text
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
                <div className="flex items-center gap-2">
                    <span className="font-semibold">Network Monitor</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {traces.length} requests
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopy} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500" title="Copy Log">
                        <Copy size={16} />
                    </button>
                    <button onClick={handleClear} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500" title="Clear">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 rounded text-gray-500">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area - Split View */}
            <div className="flex flex-1 overflow-hidden h-full">
                {/* List - Left Side (or Top if mobile, but this is desktop tool) */}
                <div
                    className="flex-1 flex flex-col overflow-y-auto border-r"
                    style={{ borderColor: colors.border }}
                >
                    {traces.length === 0 ? (
                        <div className="p-8 text-center opacity-50 text-sm">No requests recorded</div>
                    ) : (
                        traces.map(trace => (
                            <div
                                key={trace.id}
                                onClick={() => setSelectedTraceId(trace.id)}
                                className={`px-3 py-2 border-b cursor-pointer text-sm hover:bg-black/5 dark:hover:bg-white/5 flex gap-2 items-start transition-colors ${selectedTraceId === trace.id ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                style={{ borderColor: colors.border }}
                            >
                                <div className="mt-0.5"><MethodBadge method={trace.method} /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="truncate font-mono text-xs opacity-80" title={trace.url}>
                                        {trace.url.replace(/^https?:\/\/[^/]+/, '')}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs opacity-60">
                                        <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
                                        {trace.duration && <span>{trace.duration}ms</span>}
                                    </div>
                                </div>
                                <div className="mt-0.5">
                                    <StatusBadge status={trace.responseStatus} error={trace.error} />
                                </div>
                            </div>
                        ))
                    )}
                    {/* Spacer to allow scrolling to bottom */}
                    <div className="h-4"></div>
                </div>

                {/* Details - Right Side */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20 p-0">
                    {selectedTrace ? (
                        <div className="p-4 space-y-4">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1">General</h3>
                                <div className="bg-white dark:bg-slate-900 p-3 rounded border text-sm font-mono break-all select-text cursor-text" style={{ borderColor: colors.border }}>
                                    <div className="mb-1"><span className="opacity-50 select-none">URL: </span>{selectedTrace.url}</div>
                                    <div className="mb-1"><span className="opacity-50 select-none">Method: </span>{selectedTrace.method}</div>
                                    <div className="mb-1"><span className="opacity-50 select-none">Status: </span>{selectedTrace.responseStatus || 'Pending'}</div>
                                    <div><span className="opacity-50 select-none">Time: </span>{new Date(selectedTrace.timestamp).toLocaleString()}</div>
                                </div>
                            </div>

                            {selectedTrace.requestBody && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1">Request Body</h3>
                                    <pre className="bg-white dark:bg-slate-900 p-3 rounded border text-xs overflow-auto max-h-60 select-text cursor-text" style={{ borderColor: colors.border }}>
                                        {typeof selectedTrace.requestBody === 'string'
                                            ? selectedTrace.requestBody
                                            : JSON.stringify(selectedTrace.requestBody, null, 2)}
                                    </pre>
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1">Response</h3>
                                {selectedTrace.error ? (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm select-text cursor-text">
                                        {selectedTrace.error}
                                    </div>
                                ) : (
                                    <pre className="bg-white dark:bg-slate-900 p-3 rounded border text-xs overflow-auto max-h-[400px] select-text cursor-text" style={{ borderColor: colors.border }}>
                                        {selectedTrace.responseBody
                                            ? (typeof selectedTrace.responseBody === 'string' ? selectedTrace.responseBody : JSON.stringify(selectedTrace.responseBody, null, 2))
                                            : <span className="opacity-50 italic">No body or pending...</span>}
                                    </pre>
                                )}
                            </div>

                            {(selectedTrace.requestHeaders || selectedTrace.responseHeaders) && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1">Headers</h3>
                                    <div className="bg-white dark:bg-slate-900 p-3 rounded border text-xs overflow-auto select-text cursor-text" style={{ borderColor: colors.border }}>
                                        {selectedTrace.requestHeaders && (
                                            <div className="mb-2">
                                                <div className="font-bold opacity-70 mb-1">Request</div>
                                                {Object.entries(selectedTrace.requestHeaders).map(([k, v]) => (
                                                    <div key={k} className="flex gap-2"><span className="opacity-50">{k}:</span> <span className="break-all">{v}</span></div>
                                                ))}
                                            </div>
                                        )}
                                        {selectedTrace.responseHeaders && (
                                            <div>
                                                <div className="font-bold opacity-70 mb-1">Response</div>
                                                {Object.entries(selectedTrace.responseHeaders).map(([k, v]) => (
                                                    <div key={k} className="flex gap-2"><span className="opacity-50">{k}:</span> <span className="break-all">{v}</span></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                            <RefreshCw size={48} className="mb-2" />
                            <p>Select a request trace to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
