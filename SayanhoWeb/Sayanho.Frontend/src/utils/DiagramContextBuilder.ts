/**
 * DiagramContextBuilder - Utility for building rich diagram context for AI interactions
 * 
 * This utility analyzes the current diagram state and provides structured information
 * that the AI can use to understand and interact with the electrical diagram.
 */

import { CanvasSheet, CanvasItem, Connector } from '../types';
import { ApplicationSettings } from './ApplicationSettings';

export interface LoadAnalysis {
    totalPower: number;
    totalCurrent: number;
    perPhase: {
        R: { power: number; current: number; items: string[] };
        Y: { power: number; current: number; items: string[] };
        B: { power: number; current: number; items: string[] };
        unassigned: { power: number; current: number; items: string[] };
    };
    itemBreakdown: Array<{ name: string; power: number; phase: string }>;
}

export interface PhaseBalanceResult {
    isBalanced: boolean;
    imbalancePercent: number;
    maxPhase: string;
    minPhase: string;
    recommendation: string;
    phasePowers: { R: number; Y: number; B: number };
}

export interface CableRecommendation {
    minSize: string;
    recommended: string;
    current: number;
    options: Array<{
        size: string;
        rating: string;
        suitability: string;
    }>;
}

export interface DiagramSummary {
    totalItems: number;
    totalConnectors: number;
    sheets: Array<{
        name: string;
        itemCount: number;
        connectorCount: number;
        items: Array<{
            name: string;
            id: string;
            properties: Record<string, string>;
        }>;
    }>;
    itemTypes: Record<string, number>;
    connectionTypes: { Cable: number; Wiring: number };
}

// Cable sizing lookup table (current rating in Amps)
const CABLE_RATINGS: Record<string, number> = {
    '0.5': 3,
    '0.75': 6,
    '1.0': 10,
    '1.5': 15,
    '2.5': 21,
    '4': 28,
    '6': 36,
    '10': 50,
    '16': 68,
    '25': 89,
    '35': 110,
    '50': 134,
    '70': 171,
    '95': 207,
    '120': 239,
    '150': 275,
    '185': 314,
    '240': 370
};

export class DiagramContextBuilder {
    /**
     * Build a comprehensive markdown summary of the diagram for AI context
     */
    static buildContext(sheets: CanvasSheet[]): string {
        let context = "## Current Diagram State\n\n";
        
        sheets.forEach((sheet, idx) => {
            context += `### Sheet ${idx + 1}: ${sheet.name}\n`;
            context += `- Items: ${sheet.canvasItems.length}\n`;
            context += `- Connections: ${sheet.storedConnectors.length}\n\n`;
            
            if (sheet.canvasItems.length > 0) {
                context += "**Items:**\n";
                sheet.canvasItems.forEach(item => {
                    const props = item.properties?.[0] || {};
                    const propStr = Object.entries(props)
                        .filter(([k, v]) => v && !['Label', 'NetId', 'Direction'].includes(k))
                        .map(([k, v]) => `${k}=${v}`)
                        .join(', ');
                    context += `- ${item.name} (ID: ${item.uniqueID.substring(0, 8)})${propStr ? ` [${propStr}]` : ''}\n`;
                });
                context += "\n";
            }
            
            if (sheet.storedConnectors.length > 0) {
                context += "**Connections:**\n";
                sheet.storedConnectors.forEach((conn, i) => {
                    const source = conn.sourceItem?.name || 'Unknown';
                    const target = conn.targetItem?.name || 'Unknown';
                    const current = conn.currentValues?.Current || '0 A';
                    const type = conn.materialType || 'Unknown';
                    const cable = conn.properties?.Size || '';
                    context += `- ${source} → ${target} (${type}${cable ? `, ${cable}` : ''}, Current: ${current})\n`;
                });
                context += "\n";
            }
        });
        
        return context;
    }

    /**
     * Get detailed load analysis across all sheets
     */
    static getLoadAnalysis(sheets: CanvasSheet[]): LoadAnalysis {
        const result: LoadAnalysis = {
            totalPower: 0,
            totalCurrent: 0,
            perPhase: {
                R: { power: 0, current: 0, items: [] },
                Y: { power: 0, current: 0, items: [] },
                B: { power: 0, current: 0, items: [] },
                unassigned: { power: 0, current: 0, items: [] }
            },
            itemBreakdown: []
        };

        sheets.forEach(sheet => {
            sheet.canvasItems.forEach(item => {
                const props = item.properties?.[0] || {};
                const powerStr = props['Power'] || '';
                
                if (powerStr) {
                    const power = parseFloat(powerStr.split(' ')[0]) || 0;
                    const phase = props['Phase'] || 'unassigned';
                    const diversification = ApplicationSettings.getDiversificationFactor(item.name);
                    const effectivePower = power * diversification;
                    const voltage = phase === 'ALL' ? 415 : 230;
                    const current = effectivePower / voltage;
                    
                    result.totalPower += effectivePower;
                    result.totalCurrent += current;
                    
                    result.itemBreakdown.push({
                        name: item.name,
                        power: effectivePower,
                        phase: phase
                    });

                    if (phase === 'R' || phase === 'Y' || phase === 'B') {
                        result.perPhase[phase].power += effectivePower;
                        result.perPhase[phase].current += current;
                        result.perPhase[phase].items.push(item.name);
                    } else if (phase === 'ALL') {
                        // 3-phase load is divided equally
                        const perPhasePower = effectivePower / 3;
                        const perPhaseCurrent = current / 3;
                        result.perPhase.R.power += perPhasePower;
                        result.perPhase.R.current += perPhaseCurrent;
                        result.perPhase.Y.power += perPhasePower;
                        result.perPhase.Y.current += perPhaseCurrent;
                        result.perPhase.B.power += perPhasePower;
                        result.perPhase.B.current += perPhaseCurrent;
                    } else {
                        result.perPhase.unassigned.power += effectivePower;
                        result.perPhase.unassigned.current += current;
                        result.perPhase.unassigned.items.push(item.name);
                    }
                }
            });
        });

        return result;
    }

    /**
     * Check phase balance and provide recommendations
     */
    static getPhaseBalance(sheets: CanvasSheet[]): PhaseBalanceResult {
        const load = this.getLoadAnalysis(sheets);
        const phases = ['R', 'Y', 'B'] as const;
        const powers = {
            R: load.perPhase.R.power,
            Y: load.perPhase.Y.power,
            B: load.perPhase.B.power
        };

        const maxPower = Math.max(powers.R, powers.Y, powers.B);
        const minPower = Math.min(powers.R, powers.Y, powers.B);
        const avgPower = (powers.R + powers.Y + powers.B) / 3;
        
        const maxPhase = phases.find(p => powers[p] === maxPower) || 'R';
        const minPhase = phases.find(p => powers[p] === minPower) || 'R';
        
        // Calculate imbalance as percentage deviation from average
        const imbalancePercent = avgPower > 0 
            ? ((maxPower - minPower) / avgPower) * 100 
            : 0;
        
        // Industry standard: less than 10% is balanced
        const isBalanced = imbalancePercent <= 10;

        let recommendation = '';
        if (isBalanced) {
            recommendation = 'Phases are well balanced. No action needed.';
        } else if (imbalancePercent <= 20) {
            recommendation = `Minor imbalance detected. Consider moving some loads from Phase ${maxPhase} to Phase ${minPhase}.`;
        } else {
            recommendation = `Significant phase imbalance! Move loads from Phase ${maxPhase} (${powers[maxPhase].toFixed(0)}W) to Phase ${minPhase} (${powers[minPhase].toFixed(0)}W).`;
        }

        return {
            isBalanced,
            imbalancePercent: Math.round(imbalancePercent * 10) / 10,
            maxPhase,
            minPhase,
            recommendation,
            phasePowers: powers
        };
    }

    /**
     * Get cable size recommendation based on current
     */
    static getCableRecommendation(current: number, phases: string = '1-phase'): CableRecommendation {
        const is3Phase = phases.includes('3');
        const effectiveCurrent = is3Phase ? current / 1.732 : current;
        
        const options: CableRecommendation['options'] = [];
        let recommended = '';
        let minSize = '';

        for (const [size, rating] of Object.entries(CABLE_RATINGS)) {
            if (rating >= effectiveCurrent) {
                if (!minSize) minSize = size;
                
                let suitability = 'Suitable';
                if (rating >= effectiveCurrent * 1.25) {
                    suitability = 'Recommended (25% headroom)';
                    if (!recommended) recommended = size;
                }
                if (rating >= effectiveCurrent * 1.5) {
                    suitability = 'Oversized (50%+ headroom)';
                }

                options.push({
                    size: `${size} sq.mm`,
                    rating: `${rating}A`,
                    suitability
                });

                // Only show 4 options
                if (options.length >= 4) break;
            }
        }

        if (!recommended) recommended = minSize;

        return {
            minSize: `${minSize} sq.mm`,
            recommended: `${recommended} sq.mm`,
            current: Math.round(effectiveCurrent * 100) / 100,
            options
        };
    }

    /**
     * Get comprehensive diagram summary
     */
    static getDiagramSummary(sheets: CanvasSheet[], sheetName?: string): DiagramSummary {
        const filteredSheets = sheetName 
            ? sheets.filter(s => s.name.toLowerCase().includes(sheetName.toLowerCase()))
            : sheets;

        const itemTypes: Record<string, number> = {};
        let totalItems = 0;
        let totalConnectors = 0;
        let cableCount = 0;
        let wiringCount = 0;

        const sheetSummaries = filteredSheets.map(sheet => {
            totalItems += sheet.canvasItems.length;
            totalConnectors += sheet.storedConnectors.length;

            sheet.storedConnectors.forEach(c => {
                if (c.materialType === 'Cable') cableCount++;
                else wiringCount++;
            });

            const items = sheet.canvasItems.map(item => {
                itemTypes[item.name] = (itemTypes[item.name] || 0) + 1;
                return {
                    name: item.name,
                    id: item.uniqueID.substring(0, 8),
                    properties: item.properties?.[0] || {}
                };
            });

            return {
                name: sheet.name,
                itemCount: sheet.canvasItems.length,
                connectorCount: sheet.storedConnectors.length,
                items
            };
        });

        return {
            totalItems,
            totalConnectors,
            sheets: sheetSummaries,
            itemTypes,
            connectionTypes: { Cable: cableCount, Wiring: wiringCount }
        };
    }

    /**
     * Find items by name (partial match)
     */
    static findItems(sheets: CanvasSheet[], query: string): CanvasItem[] {
        const results: CanvasItem[] = [];
        const lowerQuery = query.toLowerCase();

        sheets.forEach(sheet => {
            sheet.canvasItems.forEach(item => {
                if (item.name.toLowerCase().includes(lowerQuery)) {
                    results.push(item);
                }
            });
        });

        return results;
    }

    /**
     * Get connectors for a specific item
     */
    static getConnectorsForItem(sheets: CanvasSheet[], itemId: string): Connector[] {
        const results: Connector[] = [];

        sheets.forEach(sheet => {
            sheet.storedConnectors.forEach(conn => {
                if (conn.sourceItem?.uniqueID === itemId || conn.targetItem?.uniqueID === itemId) {
                    results.push(conn);
                }
            });
        });

        return results;
    }
}
