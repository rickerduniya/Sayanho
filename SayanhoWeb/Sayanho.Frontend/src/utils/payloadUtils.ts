/**
 * Payload Optimization Utilities
 * 
 * Reduces network payload size by:
 * 1. Stripping unnecessary fields (undoStack, redoStack, svgContent, etc.)
 * 2. Converting connectors to lightweight format (IDs instead of full objects)
 * 3. GZIP compression
 */

import pako from 'pako';
import { CanvasSheet, CanvasItem, Connector } from '../types';

/**
 * Lightweight connector for API transfers (uses IDs instead of full CanvasItem objects)
 */
export interface LightConnector {
    sourceItemId: string;
    sourcePointKey: string;
    targetItemId: string;
    targetPointKey: string;
    materialType: "Cable" | "Wiring";
    properties?: Record<string, string>;
    currentValues?: Record<string, string>;
    alternativeCompany1?: string;
    alternativeCompany2?: string;
    laying?: Record<string, string>;
    accessories?: Record<string, string>[];
    length?: number;
    isVirtual?: boolean;
}

/**
 * Lightweight canvas item for API transfers
 * Removes: svgContent
 */
export interface LightCanvasItem {
    uniqueID: string;
    name: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    connectionPoints: Record<string, { x: number; y: number }>;
    properties: Record<string, string>[];
    alternativeCompany1: string;
    alternativeCompany2: string;
    iconPath?: string;
    locked: boolean;
    idPoints: Record<string, { x: number; y: number }>;
    incomer: Record<string, string>;
    outgoing: Record<string, string>[];
    accessories: Record<string, string>[];
    rotation?: number;
}

/**
 * Lightweight sheet for API transfers
 * Removes: undoStack, redoStack
 */
export interface LightCanvasSheet {
    sheetId: string;
    name: string;
    canvasItems: LightCanvasItem[];
    storedConnectors: LightConnector[];
    existingLinePoints: { x: number; y: number }[][];
    existingConnections: string[];
    scale: number;
    viewportX?: number; // Optional: included for storage, excluded for analysis/LLM
    viewportY?: number;
}

/**
 * Convert a CanvasItem to lightweight format
 */
export function createLightItem(item: CanvasItem): LightCanvasItem {
    return {
        uniqueID: item.uniqueID,
        name: item.name,
        position: item.position,
        size: item.size,
        connectionPoints: item.connectionPoints,
        properties: item.properties,
        alternativeCompany1: item.alternativeCompany1,
        alternativeCompany2: item.alternativeCompany2,
        iconPath: item.iconPath,
        locked: item.locked,
        idPoints: item.idPoints,
        incomer: item.incomer,
        outgoing: item.outgoing,
        accessories: item.accessories,
        rotation: item.rotation
        // Omitted: svgContent
    };
}

/**
 * Convert a Connector to lightweight format (uses IDs instead of full objects)
 */
export function createLightConnector(connector: Connector): LightConnector {
    return {
        sourceItemId: connector.sourceItem?.uniqueID || '',
        sourcePointKey: connector.sourcePointKey,
        targetItemId: connector.targetItem?.uniqueID || '',
        targetPointKey: connector.targetPointKey,
        materialType: connector.materialType,
        properties: connector.properties,
        // currentValues omitted - these are calculated at runtime via NetworkAnalyzer
        alternativeCompany1: connector.alternativeCompany1,
        alternativeCompany2: connector.alternativeCompany2,
        laying: connector.laying,
        accessories: connector.accessories,
        length: connector.length,
        isVirtual: connector.isVirtual
        // Omitted: sourceItem, targetItem (full objects), currentValues (runtime calculation)
    };
}

/**
 * Strip a CanvasSheet of unnecessary data for API transfer
 */
export function stripSheetForApi(sheet: CanvasSheet, includeViewport: boolean = false): LightCanvasSheet {
    const light: LightCanvasSheet = {
        sheetId: sheet.sheetId,
        name: sheet.name,
        canvasItems: sheet.canvasItems.map(createLightItem),
        storedConnectors: sheet.storedConnectors.map(createLightConnector),
        existingLinePoints: sheet.existingLinePoints,
        existingConnections: sheet.existingConnections,
        scale: sheet.scale
        // Omitted: undoStack, redoStack
    };

    if (includeViewport) {
        light.viewportX = sheet.viewportX;
        light.viewportY = sheet.viewportY;
    }

    return light;
}

/**
 * Strip multiple sheets for API transfer
 */
export function stripSheetsForApi(sheets: CanvasSheet[], includeViewport: boolean = false): LightCanvasSheet[] {
    return sheets.map(s => stripSheetForApi(s, includeViewport));
}

/**
 * Compress data using GZIP
 * @returns Blob with compressed data
 */
export async function compressPayload(data: unknown): Promise<Blob> {
    const jsonString = JSON.stringify(data);
    const compressed = pako.gzip(jsonString);
    return new Blob([compressed], { type: 'application/octet-stream' });
}

/**
 * Decompress GZIP data
 * @param blob Compressed blob
 * @returns Decompressed JSON object
 */
export async function decompressPayload<T>(blob: Blob): Promise<T> {
    const arrayBuffer = await blob.arrayBuffer();
    const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
    return JSON.parse(decompressed) as T;
}

/**
 * Calculate and log payload size reduction
 */
export function logPayloadStats(original: unknown, optimized: unknown, label: string): void {
    const originalSize = JSON.stringify(original).length;
    const optimizedSize = JSON.stringify(optimized).length;
    const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    console.log(`[Payload] ${label}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${reduction}% reduction before compression)`);
}

/**
 * Filter out text boxes and UI elements from sheets
 * Used for operations that only need electrical components (auto-rating, estimates)
 */
export function filterTextBoxesFromSheets(sheets: CanvasSheet[]): CanvasSheet[] {
    return sheets.map(sheet => {
        const electricalItems = sheet.canvasItems.filter(item => item.name !== 'Text');
        const electricalItemIds = new Set(electricalItems.map(i => i.uniqueID));

        // Filter connectors to only include those connected to electrical items
        const electricalConnectors = sheet.storedConnectors.filter(conn =>
            electricalItemIds.has(conn.sourceItem?.uniqueID || '') &&
            electricalItemIds.has(conn.targetItem?.uniqueID || '')
        );

        return {
            ...sheet,
            canvasItems: electricalItems,
            storedConnectors: electricalConnectors
        };
    });
}
