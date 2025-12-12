import { CanvasItem } from '../types';

export class PanelRenderer {

    static generateSvg(item: CanvasItem): string {
        const properties = item.properties?.[0] || {};
        const outgoings = item.outgoing || [];

        // --- 1. CONFIGURATION & DIMENSIONS ---

        const rawCount = parseInt(properties["Incomer Count"] || "1", 10);
        const incomerCount = isNaN(rawCount) ? 1 : Math.max(rawCount, 1);
        // Default to "Normal" coupler if multiple incomers and not specified
        // Logic moved to individual section rendering


        // Layout Constants (Minimal Margins, Clean Style)
        const margin = 5;
        const topSpace = 85;
        const busbarY = margin + topSpace;
        const busbarHeight = 10;
        const outgoingTopY = busbarY + busbarHeight;
        const outgoingLength = 60;
        const bottomLabelSpace = 35;
        const outgoingSpacing = 65; // Distance between outgoing circuits
        const minSectionWidth = 140; // Wide enough for Incomer symbol
        const couplerWidth = 80;

        // --- 2. CALCULATE SECTION WIDTHS ---

        const sectionWidths: number[] = [];
        for (let i = 1; i <= incomerCount; i++) {
            const sectionOutgoings = outgoings.filter((o: any) => o["Section"] === i.toString());
            // Width is determined by number of outgoings
            const outCount = Math.max(sectionOutgoings.length, 1);
            // Incomer symbol needs space, usually centers over the section
            // Section width = (outCount * spacing) + padding
            // We want incomer centered.
            let width = outCount * outgoingSpacing;
            if (width < minSectionWidth) width = minSectionWidth;

            sectionWidths.push(width);
        }

        // Total Dimensions
        let totalWidth = margin * 2;
        sectionWidths.forEach((w, i) => {
            totalWidth += w;
            if (i < sectionWidths.length - 1) totalWidth += couplerWidth;
        });

        const totalHeight = margin + topSpace + busbarHeight + outgoingLength + bottomLabelSpace + margin;

        // --- 3. START SVG GENERATION ---

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`;

        // Define Styles/Defs if needed (markers etc)
        // Red/Green indicators for connection points
        const redDot = `<circle r="4" fill="#FF0000" stroke="none"/>`;
        const greenDot = `<circle r="4" fill="#00FF00" stroke="none"/>`;

        // Outer Border
        svg += `<rect id="border" x="${margin}" y="${margin}" width="${totalWidth - margin * 2}" height="${totalHeight - margin * 2}" fill="none" stroke="#000" stroke-width="2"/>`;

        // --- 4. RENDER SECTIONS ---

        let currentX = margin;

        for (let sec = 1; sec <= incomerCount; sec++) {
            const sectionWidth = sectionWidths[sec - 1];
            const sectionCenter = currentX + sectionWidth / 2;
            const sectionOutgoings = outgoings.filter((o: any) => o["Section"] === sec.toString());

            // A. INCOMER (Top) - Straight Line Only (No Switch)
            const incomerYStart = margin;
            const incomerType = properties[`Incomer${sec}_Type`];
            const incomerRating = properties[`Incomer${sec}_Rating`];

            // Vertical Line from busbar
            svg += `<line x1="${sectionCenter}" y1="${busbarY + busbarHeight}" x2="${sectionCenter}" y2="${busbarY + busbarHeight - 20}" stroke="#000" stroke-width="2.5"/>`;

            // Switch Symbol (diagonal)
            svg += `<line x1="${sectionCenter}" y1="${busbarY + busbarHeight - 20}" x2="${sectionCenter + 10}" y2="${busbarY + busbarHeight - 40}" stroke="#000" stroke-width="2.5"/>`;

            // Continue line up to connection point
            svg += `<line x1="${sectionCenter}" y1="${busbarY + busbarHeight - 40}" x2="${sectionCenter}" y2="${margin}" stroke="#000" stroke-width="2.5"/>`;
            // Text Labels (to the right, visible)
            if (incomerRating) {
                svg += `<text x="${sectionCenter + 16}" y="${incomerYStart + 18}" font-family="Arial" font-size="9" fill="#000" font-weight="bold">${incomerRating}</text>`;
                if (incomerType) {
                    svg += `<text x="${sectionCenter + 16}" y="${incomerYStart + 27}" font-family="Arial" font-size="8" fill="#000">FP</text>`;
                    svg += `<text x="${sectionCenter + 16}" y="${incomerYStart + 36}" font-family="Arial" font-size="8" fill="#000">${incomerType}</text>`;
                }
            }
            // Incomer label above
            svg += `<text x="${sectionCenter + 25}" y="${incomerYStart + 10}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="bold" fill="#000">I/C ${sec}</text>`;


            // B. BUSBAR (Hollow Rectangle)
            // It should cover all outgoings
            // If outgoings are wider than minSection, it spans them. 
            // VTPN style: Busbar is a continuous thick line across the section.
            // Hollow rectangle busbar (not filled line)
            const busbarStartX = currentX + 5;
            const busbarEndX = currentX + sectionWidth - 5;
            const busbarRectHeight = 10;

            // Draw hollow rectangle
            svg += `<rect x="${busbarStartX}" y="${busbarY}" width="${busbarEndX - busbarStartX}" height="${busbarRectHeight}" fill="#fff" stroke="#000" stroke-width="2"/>`;


            const busbarMaterial = properties["Busbar Material"] || "Aluminium";
            // const totalBusbarWidth = sectionWidths.reduce((a, b) => a + b, 0) + (incomerCount - 1) * couplerWidth;
            // const labelX = margin + totalBusbarWidth / 2;
            // Left-aligned Text Block
            svg += `<text x="${margin + 6}" y="${incomerYStart + 15}" text-anchor="left" font-family="Arial" font-size="11" fill="#000" font-weight="bold">Cubicle Panel</text>`;
            svg += `<text x="${margin + 6}" y="${busbarY - 18}" text-anchor="left" font-family="Arial" font-size="11" fill="#000" font-weight="bold">${busbarMaterial}</text>`;
            svg += `<text x="${margin + 6}" y="${busbarY - 7}" text-anchor="left" font-family="Arial" font-size="11" fill="#000" font-weight="bold">Busbar</text>`;



            // C. OUTGOINGS (Bottom)
            // Distribute outgoings evenly, or start from left?
            // VTPN distributes them.
            // Let's center the group of outgoings within the section width
            const outCount = Math.max(sectionOutgoings.length, 1);
            const totalOutWidth = (outCount - 1) * outgoingSpacing;
            const startOutX = sectionCenter - (totalOutWidth / 2);

            sectionOutgoings.forEach((out: any, idx: number) => {
                const ox = startOutX + idx * outgoingSpacing;

                // Vertical Line from busbar
                svg += `<line x1="${ox}" y1="${busbarY + busbarHeight}" x2="${ox}" y2="${busbarY + busbarHeight + 20}" stroke="#000" stroke-width="2.5"/>`;

                // Switch Symbol (diagonal)
                svg += `<line x1="${ox}" y1="${busbarY + busbarHeight + 40}" x2="${ox + 10}" y2="${busbarY + busbarHeight + 20}" stroke="#000" stroke-width="2.5"/>`;

                // Continue line down to connection point
                svg += `<line x1="${ox}" y1="${busbarY + busbarHeight + 40}" x2="${ox}" y2="${totalHeight - margin}" stroke="#000" stroke-width="2.5"/>`;



                // Text Labels (to the left)
                const rating = out["Current Rating"] || "";
                const type = out["Type"] || "MCB";
                const pole = out["Pole"] || "TP";

                const globalIdx = outgoings.findIndex((o: any) => o === out) + 1;
                svg += `<text x="${ox - 6}" y="${busbarY + busbarHeight + 20}" text-anchor="end" font-family="Arial" font-size="8" fill="#000" font-weight="bold">OG${globalIdx}</text>`;
                if (rating) svg += `<text x="${ox - 6}" y="${busbarY + busbarHeight + 28}" text-anchor="end" font-family="Arial" font-size="7" fill="#000">${rating}</text>`;
                if (pole) svg += `<text x="${ox - 6}" y="${busbarY + busbarHeight + 35}" text-anchor="end" font-family="Arial" font-size="7" fill="#000">${pole}</text>`;
                if (type) svg += `<text x="${ox - 6}" y="${busbarY + busbarHeight + 42}" text-anchor="end" font-family="Arial" font-size="7" fill="#000">${type}</text>`;
            });

            // D. BUS COUPLER (with gap after switch)
            if (sec < incomerCount) {
                const couplerCenterX = currentX + sectionWidth + couplerWidth / 2;
                const couplerType = properties[`BusCoupler${sec}_Type`] || "MCCB"; // Default to MCCB/Switch

                // Text Label
                svg += `<text x="${couplerCenterX}" y="${busbarY - 10}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#000">Bus Couplar</text>`;

                const leftBusEnd = currentX + sectionWidth - 5;
                const rightBusStart = currentX + sectionWidth + couplerWidth + 5;

                if (couplerType === "None" || couplerType === "Direct") {
                    // Solid Busbar (No Switch)
                    svg += `<rect x="${leftBusEnd}" y="${busbarY}" width="${rightBusStart - leftBusEnd}" height="10" fill="#fff" stroke="#000" stroke-width="2"/>`;
                    svg += `<text x="${couplerCenterX}" y="${busbarY + 20}" text-anchor="middle" font-family="Arial" font-size="7" fill="#000">(Direct)</text>`;
                } else {
                    // Switch / MCCB
                    const switchGap = 12; // Gap after diagonal

                    // Left busbar segment (hollow rectangle continuing)
                    svg += `<rect x="${leftBusEnd}" y="${busbarY}" width="15" height="10" fill="#fff" stroke="#000" stroke-width="2"/>`;

                    // Diagonal Switch Blade
                    svg += `<line x1="${leftBusEnd + 15}" y1="${busbarY + 5}" x2="${leftBusEnd + 25}" y2="${busbarY - 5}" stroke="#000" stroke-width="2.5"/>`;

                    // Right busbar segment (after gap, hollow rectangle)
                    svg += `<rect x="${leftBusEnd + 25 + switchGap}" y="${busbarY}" width="${rightBusStart - (leftBusEnd + 25 + switchGap)}" height="10" fill="#fff" stroke="#000" stroke-width="2"/>`;
                }
            }

            currentX += sectionWidth + (sec < incomerCount ? couplerWidth : 0);
        }

        svg += '</svg>';
        return svg;
    }
}
