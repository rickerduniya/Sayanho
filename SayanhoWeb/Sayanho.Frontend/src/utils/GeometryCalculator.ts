import { CanvasItem, Point, Size } from '../types/index';

export const calculateGeometry = (item: CanvasItem): { size: Size, connectionPoints: Record<string, Point> } | null => {
    const properties = item.properties[0];
    if (!properties) return null;

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

    let width = 0;
    let height = item.size.height; // Height usually doesn't change based on Way, or does it? 
    // C# doesn't explicitly change height in the main logic, but SVG content might.
    // HTPN: svgDocument.Width = 56 * way * 3;
    // VTPN: svgDocument.Width = 70 * way;
    // SPN DB: svgDocument.Width = 60 * way;

    // Heights are implicit from the SVG content or previous size. 
    // However, connection points Y values are fixed (140, 160).
    // Let's assume height is sufficient to cover connection points.
    // Here we are calculating logical size.

    let newConnectionPoints: Record<string, Point> = {};

    if (item.name === "HTPN") {
        width = 56 * way * 3;
        // Height seems to be around 140+ based on connection points. 
        // Updated to 170 to fit the visual content (lines end at ~162)
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
