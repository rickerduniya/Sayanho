import { apiTracer } from './apiTracer';
import { CacheService } from '../services/CacheService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sayanho-g22t.onrender.com/api';

export interface PropertyResponse {
    properties: Record<string, string>[];
    alternativeCompany1: string;
    alternativeCompany2: string;
}

let __fetchReqId = 10000; // Start from 10000 to distinguish from axios requests

export const fetchProperties = async (itemName: string): Promise<PropertyResponse> => {
    // Check Cache
    const cacheKey = CacheService.generateKey('fetchProperties', { itemName });
    const cached = CacheService.get<PropertyResponse>(cacheKey);
    if (cached) return cached;

    const reqId = ++__fetchReqId;
    const url = `${API_BASE_URL}/properties/${encodeURIComponent(itemName)}`;
    const startTime = performance.now();

    // Add trace entry for request
    apiTracer.addTrace({
        id: reqId,
        timestamp: new Date().toISOString(),
        method: 'GET',
        url,
        requestHeaders: {},
        requestBody: null,
        requestParams: { itemName }
    });

    try {
        const response = await fetch(url);
        const duration = Math.round(performance.now() - startTime);

        if (!response.ok) {
            // Update trace with error
            const traces = apiTracer.getTraces();
            const traceEntry = traces.find(t => t.id === reqId);
            if (traceEntry) {
                traceEntry.duration = duration;
                traceEntry.responseStatus = response.status;
                traceEntry.responseStatusText = response.statusText;
                traceEntry.error = `Failed to fetch properties: ${response.statusText}`;
            }
            throw new Error(`Failed to fetch properties: ${response.statusText}`);
        }

        const data = await response.json();

        // Update trace with successful response
        const traces = apiTracer.getTraces();
        const traceEntry = traces.find(t => t.id === reqId);
        if (traceEntry) {
            traceEntry.duration = duration;
            traceEntry.responseStatus = response.status;
            traceEntry.responseStatusText = response.statusText;
            traceEntry.responseBody = data;
        }

        // Save to Cache
        CacheService.set(cacheKey, data);

        return data;
    } catch (error) {
        const duration = Math.round(performance.now() - startTime);

        // Update trace with error
        const traces = apiTracer.getTraces();
        const traceEntry = traces.find(t => t.id === reqId);
        if (traceEntry) {
            traceEntry.duration = duration;
            traceEntry.error = error instanceof Error ? error.message : String(error);
        }

        console.error('Error fetching properties:', error);
        throw error;
    }
};
