import { CanvasItem, Connector } from '../types';

interface SnapResult {
    x: number;
    y: number;
    snappedX: boolean;
    snappedY: boolean;
}

interface AlignmentResult {
    x: number;
    y: number;
    horizontalGuides: number[];
    verticalGuides: number[];
}

export const calculateSnapPosition = (
    movedItem: CanvasItem,
    newX: number,
    newY: number,
    otherItems: CanvasItem[],
    connections: Connector[],
    tolerance: number = 5
): SnapResult => {
    let finalX = newX;
    let finalY = newY;
    let snappedX = false;
    let snappedY = false;

    let minDeltaX = tolerance;
    let minDeltaY = tolerance;

    // Filter connections that are attached to the moved item
    const relevantConnections = connections.filter(c =>
        c.sourceItem.uniqueID === movedItem.uniqueID || c.targetItem.uniqueID === movedItem.uniqueID
    );

    relevantConnections.forEach(conn => {
        // Determine if moved item is source or target
        const isSource = conn.sourceItem.uniqueID === movedItem.uniqueID;

        const myKey = isSource ? conn.sourcePointKey : conn.targetPointKey;
        const otherKey = isSource ? conn.targetPointKey : conn.sourcePointKey;
        const otherId = isSource ? conn.targetItem.uniqueID : conn.sourceItem.uniqueID;

        // Find the partner item's current position from the fresh list
        const otherItem = otherItems.find(i => i.uniqueID === otherId);
        if (!otherItem || !otherItem.connectionPoints || !movedItem.connectionPoints) return;

        const myPoint = movedItem.connectionPoints[myKey];
        const otherPoint = otherItem.connectionPoints[otherKey];

        if (!myPoint || !otherPoint) return;

        // Calculate absolute positions
        const myAbsX = newX + myPoint.x;
        const myAbsY = newY + myPoint.y;

        const otherAbsX = otherItem.position.x + otherPoint.x;
        const otherAbsY = otherItem.position.y + otherPoint.y;

        const diffX = otherAbsX - myAbsX;
        const diffY = otherAbsY - myAbsY; // If diffY is 0, they are horizontally aligned

        // Check Horizontal Alignment (Make Y the same) -> Straight horizontal wire
        // We want to snap if they are 'almost' horizontal
        if (Math.abs(diffY) < minDeltaY) {
            minDeltaY = Math.abs(diffY);
            finalY = newY + diffY;
            snappedY = true;
        }

        // Check Vertical Alignment (Make X the same) -> Straight vertical wire
        // We want to snap if they are 'almost' vertical
        if (Math.abs(diffX) < minDeltaX) {
            minDeltaX = Math.abs(diffX);
            finalX = newX + diffX;
            snappedX = true;
        }
    });

    return { x: finalX, y: finalY, snappedX, snappedY };
};

export const calculateAlignmentGuides = (
    item: CanvasItem,
    otherItems: CanvasItem[],
    x: number,
    y: number,
    snapThreshold: number,
    nearbyThreshold: number,
    scale: number
): AlignmentResult => {
    let newX = x;
    let newY = y;
    const horizontalGuides: number[] = [];
    const verticalGuides: number[] = [];

    // Simple bounds based alignment (edges and center)
    const itemW = item.size.width;
    const itemH = item.size.height;
    const centerX = x + itemW / 2;
    const centerY = y + itemH / 2;
    const rightX = x + itemW;
    const bottomY = y + itemH;

    let snappedX = false;
    let snappedY = false;

    for (const other of otherItems) {
        if (other.uniqueID === item.uniqueID) continue;

        const otherX = other.position.x;
        const otherY = other.position.y;
        const otherW = other.size.width;
        const otherH = other.size.height;
        const otherCX = otherX + otherW / 2;
        const otherCY = otherY + otherH / 2;
        const otherR = otherX + otherW;
        const otherB = otherY + otherH;

        // Vertical Alignments (X-axis modification)
        if (!snappedX) {
            // Left to Left
            if (Math.abs(x - otherX) < snapThreshold) { newX = otherX; verticalGuides.push(otherX); snappedX = true; }
            // Left to Right
            else if (Math.abs(x - otherR) < snapThreshold) { newX = otherR; verticalGuides.push(otherR); snappedX = true; }
            // Right to Left
            else if (Math.abs(rightX - otherX) < snapThreshold) { newX = otherX - itemW; verticalGuides.push(otherX); snappedX = true; }
            // Right to Right
            else if (Math.abs(rightX - otherR) < snapThreshold) { newX = otherR - itemW; verticalGuides.push(otherR); snappedX = true; }
            // Center to Center
            else if (Math.abs(centerX - otherCX) < snapThreshold) { newX = otherCX - itemW / 2; verticalGuides.push(otherCX); snappedX = true; }
        }

        // Horizontal Alignments (Y-axis modification)
        if (!snappedY) {
            // Top to Top
            if (Math.abs(y - otherY) < snapThreshold) { newY = otherY; horizontalGuides.push(otherY); snappedY = true; }
            // Top to Bottom
            else if (Math.abs(y - otherB) < snapThreshold) { newY = otherB; horizontalGuides.push(otherB); snappedY = true; }
            // Bottom to Top
            else if (Math.abs(bottomY - otherY) < snapThreshold) { newY = otherY - itemH; horizontalGuides.push(otherY); snappedY = true; }
            // Bottom to Bottom
            else if (Math.abs(bottomY - otherB) < snapThreshold) { newY = otherB - itemH; horizontalGuides.push(otherB); snappedY = true; }
            // Center to Center
            else if (Math.abs(centerY - otherCY) < snapThreshold) { newY = otherCY - itemH / 2; horizontalGuides.push(otherCY); snappedY = true; }
        }
    }

    return { x: newX, y: newY, horizontalGuides, verticalGuides };
};
