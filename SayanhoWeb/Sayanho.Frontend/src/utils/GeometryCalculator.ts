import { CanvasItem, Point, Size } from '../types/index';

export const calculateGeometry = (item: CanvasItem): { size: Size, connectionPoints: Record<string, Point> } | null => {
    const properties = item.properties[0];
    if (!properties) return null;

    let width = 0;
    let height = 0;
    let newConnectionPoints: Record<string, Point> = {};

    // === LT CUBICAL PANEL (uses Incomer Count + outgoing array) ===
    if (item.name === "LT Cubical Panel") {
        const rawCount = parseInt(properties["Incomer Count"] || "1", 10);
        const incomerCount = isNaN(rawCount) ? 1 : Math.max(rawCount, 1);
        const outgoings = item.outgoing || [];

        // --- MATCHING CONSTANTS WITH PANEL RENDERER ---
        const margin = 5;
        const topSpace = 85;
        const busbarHeight = 10;
        const outgoingLength = 60;
        const bottomLabelSpace = 35;

        const outgoingSpacing = 65;
        const minSectionWidth = 140;
        const couplerWidth = 80;

        // --- CALCULATE WIDTHS ---
        const sectionWidths: number[] = [];
        for (let i = 1; i <= incomerCount; i++) {
            const sectionOutgoings = outgoings.filter((o: any) => o["Section"] === i.toString());
            const outCount = Math.max(sectionOutgoings.length, 1);
            let sWidth = outCount * outgoingSpacing;
            if (sWidth < minSectionWidth) sWidth = minSectionWidth;
            sectionWidths.push(sWidth);
        }

        width = margin * 2;
        sectionWidths.forEach((w, i) => {
            width += w;
            if (i < sectionWidths.length - 1) width += couplerWidth;
        });

        height = margin + topSpace + busbarHeight + outgoingLength + bottomLabelSpace + margin;

        // --- CONNECTION POINTS ---
        let currentX = margin;

        for (let sec = 1; sec <= incomerCount; sec++) {
            const sectionWidth = sectionWidths[sec - 1];
            const sectionCenter = currentX + sectionWidth / 2;
            const sectionOutgoings = outgoings.filter((o: any) => o["Section"] === sec.toString());

            // Incomer Point (Top) - Matches Red Dot in Renderer
            newConnectionPoints[`in${sec}`] = { x: sectionCenter, y: margin };

            // Outgoing Points (Bottom) - Matches Green Dots in Renderer
            const outCount = Math.max(sectionOutgoings.length, 1);
            const totalOutWidth = (outCount - 1) * outgoingSpacing;
            const startOutX = sectionCenter - (totalOutWidth / 2);

            sectionOutgoings.forEach((out: any, idx: number) => {
                const ox = startOutX + idx * outgoingSpacing;
                // Global index matching
                const globalIdx = outgoings.findIndex((o: any) => o === out);
                // Matches Green Dot Y pos: totalHeight - margin
                newConnectionPoints[`out${globalIdx + 1}`] = { x: ox, y: height - margin };
            });

            currentX += sectionWidth + (sec < incomerCount ? couplerWidth : 0);
        }

        return {
            size: { width, height },
            connectionPoints: newConnectionPoints
        };
    }

    // === DISTRIBUTION BOARDS (use "Way" property) ===
    let way = 0;
    const wayText = properties["Way"];
    if (!wayText) return null;

    // Extract Way count
    if (item.name === "SPN DB") {
        const match = wayText.match(/2\+(\d+)/);
        way = match ? parseInt(match[1]) : 4;
    } else {
        const match = wayText.match(/\d+/);
        way = match ? parseInt(match[0]) : 4;
    }

    if (item.name === "HTPN") {
        width = 56 * way * 3;
        height = 170;

        // In
        const inX = width / 2;
        const inY = 0;
        newConnectionPoints["in"] = { x: inX, y: inY };

        // Out
        const xStart = 40;
        const xIncrement = 55;
        const yValue = height;
        let k = 1;

        ["Red Phase", "Yellow Phase", "Blue Phase"].forEach(phase => {
            for (let i = 1; i <= way; i++) {
                const key = `out${i}_${phase}`;
                const x = xStart + (k - 1) * xIncrement;

                newConnectionPoints[key] = { x: x, y: yValue };
                k++;
            }
        });

    } else if (item.name === "VTPN") {
        width = 70 * way;
        height = 170;

        // In
        const inX = width / 2;
        const inY = 0;
        newConnectionPoints["in"] = { x: inX, y: inY };

        // Out
        const xStart = 50;
        const xIncrement = 65;
        const yValue = height;

        for (let i = 1; i <= way; i++) {
            const key = `out${i}`;
            const x = xStart + (i - 1) * xIncrement;

            newConnectionPoints[key] = { x: x, y: yValue };
        }

    } else if (item.name === "SPN DB") {
        width = 60 * way;
        height = 170;

        // In
        const inX = width / 2;
        const inY = 0;
        newConnectionPoints["in"] = { x: inX, y: inY };

        // Out
        const xStart = 40;
        const xIncrement = 55;
        const yValue = height;

        for (let i = 1; i <= way; i++) {
            const key = `out${i}`;
            const x = xStart + (i - 1) * xIncrement;

            newConnectionPoints[key] = { x: x, y: yValue };
        }
    } else {
        return null;
    }

    return {
        size: { width, height },
        connectionPoints: newConnectionPoints
    };
};
