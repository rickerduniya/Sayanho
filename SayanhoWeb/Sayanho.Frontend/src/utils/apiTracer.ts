export interface ApiTraceEntry {
    id: number;
    timestamp: string;
    method: string;
    url: string;
    requestHeaders?: Record<string, string>;
    requestBody?: any;
    requestParams?: any;
    responseStatus?: number;
    responseStatusText?: string;
    responseHeaders?: Record<string, string>;
    responseBody?: any;
    duration?: number;
    error?: string;
}

class ApiTracer {
    private traces: ApiTraceEntry[] = [];
    private maxTraces = 100; // Keep last 100 traces

    addTrace(trace: ApiTraceEntry) {
        this.traces.push(trace);
        // Keep only the last maxTraces entries
        if (this.traces.length > this.maxTraces) {
            this.traces = this.traces.slice(-this.maxTraces);
        }
    }

    getTraces(): ApiTraceEntry[] {
        return [...this.traces];
    }

    clearTraces() {
        this.traces = [];
    }

    getFormattedTraces(): string {
        if (this.traces.length === 0) {
            return 'No API traces recorded yet.';
        }

        let output = '='.repeat(80) + '\n';
        output += 'API TRACE LOG\n';
        output += `Generated: ${new Date().toISOString()}\n`;
        output += `Total Requests: ${this.traces.length}\n`;
        output += '='.repeat(80) + '\n\n';

        this.traces.forEach((trace, index) => {
            output += `\n${'─'.repeat(80)}\n`;
            output += `[${index + 1}/${this.traces.length}] Request ID: ${trace.id}\n`;
            output += `${'─'.repeat(80)}\n`;
            output += `Timestamp: ${trace.timestamp}\n`;
            output += `Method: ${trace.method}\n`;
            output += `URL: ${trace.url}\n`;

            if (trace.requestParams && Object.keys(trace.requestParams).length > 0) {
                output += `\nQuery Parameters:\n`;
                output += JSON.stringify(trace.requestParams, null, 2) + '\n';
            }

            if (trace.requestHeaders && Object.keys(trace.requestHeaders).length > 0) {
                output += `\nRequest Headers:\n`;
                output += JSON.stringify(trace.requestHeaders, null, 2) + '\n';
            }

            if (trace.requestBody !== undefined && trace.requestBody !== null) {
                output += `\nRequest Body:\n`;
                if (typeof trace.requestBody === 'string') {
                    output += trace.requestBody + '\n';
                } else if (trace.requestBody instanceof Blob) {
                    output += `[Blob: ${trace.requestBody.size} bytes, type: ${trace.requestBody.type}]\n`;
                } else {
                    output += JSON.stringify(trace.requestBody, null, 2) + '\n';
                }
            }

            if (trace.duration !== undefined) {
                output += `\nDuration: ${trace.duration}ms\n`;
            }

            if (trace.error) {
                output += `\n❌ ERROR:\n${trace.error}\n`;
            } else if (trace.responseStatus !== undefined) {
                output += `\nResponse Status: ${trace.responseStatus} ${trace.responseStatusText || ''}\n`;

                if (trace.responseHeaders && Object.keys(trace.responseHeaders).length > 0) {
                    output += `\nResponse Headers:\n`;
                    output += JSON.stringify(trace.responseHeaders, null, 2) + '\n';
                }

                if (trace.responseBody !== undefined && trace.responseBody !== null) {
                    output += `\nResponse Body:\n`;
                    if (typeof trace.responseBody === 'string') {
                        // Truncate very long strings
                        const maxLength = 5000;
                        if (trace.responseBody.length > maxLength) {
                            output += trace.responseBody.substring(0, maxLength) + `\n... [truncated, total length: ${trace.responseBody.length}]\n`;
                        } else {
                            output += trace.responseBody + '\n';
                        }
                    } else if (trace.responseBody instanceof Blob) {
                        output += `[Blob: ${trace.responseBody.size} bytes, type: ${trace.responseBody.type}]\n`;
                    } else {
                        const jsonStr = JSON.stringify(trace.responseBody, null, 2);
                        const maxLength = 5000;
                        if (jsonStr.length > maxLength) {
                            output += jsonStr.substring(0, maxLength) + `\n... [truncated, total length: ${jsonStr.length}]\n`;
                        } else {
                            output += jsonStr + '\n';
                        }
                    }
                }
            }
        });

        output += `\n${'='.repeat(80)}\n`;
        output += 'END OF TRACE LOG\n';
        output += '='.repeat(80) + '\n';

        return output;
    }

    copyToClipboard(): Promise<void> {
        const formatted = this.getFormattedTraces();
        return navigator.clipboard.writeText(formatted);
    }
}

export const apiTracer = new ApiTracer();
