import { CanvasItem } from '../types';

interface SnapResult {
    x: number;
    y: number;
    horizontalGuides: number[];
    verticalGuides: number[];
}

export const calculateAlignmentGuides = (
    movingItem: CanvasItem,
    otherItems: CanvasItem[],
    newX: number,
    newY: number,
    snapThreshold: number = 5,
    nearbyThreshold: number = 100,
    scale: number = 1
): SnapResult => {
    const result: SnapResult = {
        x: newX,
        y: newY,
        horizontalGuides: [],
        verticalGuides: []
    };

    const snapDist = snapThreshold / scale;
    const guideDist = nearbyThreshold / scale;

    // Moving Item Edges
    const mWidth = movingItem.size.width;
    const mHeight = movingItem.size.height;

    const mLeft = newX;
    const mRight = newX + mWidth;
    const mCenterX = newX + mWidth / 2;

    const mTop = newY;
    const mBottom = newY + mHeight;
    const mCenterY = newY + mHeight / 2;

    let bestDeltaX = Infinity;
    let bestDeltaY = Infinity;

    // Helper to add guide if unique
    const addHGuide = (y: number) => {
        if (!result.horizontalGuides.includes(y)) result.horizontalGuides.push(y);
    };
    const addVGuide = (x: number) => {
        if (!result.verticalGuides.includes(x)) result.verticalGuides.push(x);
    };

    for (const item of otherItems) {
        if (item.uniqueID === movingItem.uniqueID) continue;

        // Target Item Edges
        const tLeft = item.position.x;
        const tRight = item.position.x + item.size.width;
        const tCenterX = item.position.x + item.size.width / 2;

        const tTop = item.position.y;
        const tBottom = item.position.y + item.size.height;
        const tCenterY = item.position.y + item.size.height / 2;

        // --- Vertical Alignment (X) ---

        // Check for Guides (Nearby)
        if (Math.abs(mLeft - tLeft) < guideDist || Math.abs(mRight - tLeft) < guideDist) addVGuide(tLeft);
        if (Math.abs(mLeft - tRight) < guideDist || Math.abs(mRight - tRight) < guideDist) addVGuide(tRight);
        if (Math.abs(mCenterX - tCenterX) < guideDist) addVGuide(tCenterX);

        // Check for Snapping (Closest)
        // Left to Left
        let delta = tLeft - mLeft;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaX)) bestDeltaX = delta;

        // Left to Right
        delta = tRight - mLeft;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaX)) bestDeltaX = delta;

        // Right to Left
        delta = tLeft - mRight;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaX)) bestDeltaX = delta;

        // Right to Right
        delta = tRight - mRight;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaX)) bestDeltaX = delta;

        // Center to Center
        delta = tCenterX - mCenterX;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaX)) bestDeltaX = delta;


        // --- Horizontal Alignment (Y) ---

        // Check for Guides (Nearby)
        if (Math.abs(mTop - tTop) < guideDist || Math.abs(mBottom - tTop) < guideDist) addHGuide(tTop);
        if (Math.abs(mTop - tBottom) < guideDist || Math.abs(mBottom - tBottom) < guideDist) addHGuide(tBottom);
        if (Math.abs(mCenterY - tCenterY) < guideDist) addHGuide(tCenterY);

        // Check for Snapping (Closest)
        // Top to Top
        delta = tTop - mTop;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaY)) bestDeltaY = delta;

        // Top to Bottom
        delta = tBottom - mTop;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaY)) bestDeltaY = delta;

        // Bottom to Top
        delta = tTop - mBottom;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaY)) bestDeltaY = delta;

        // Bottom to Bottom
        delta = tBottom - mBottom;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaY)) bestDeltaY = delta;

        // Center to Center
        delta = tCenterY - mCenterY;
        if (Math.abs(delta) < snapDist && Math.abs(delta) < Math.abs(bestDeltaY)) bestDeltaY = delta;
    }

    // Apply Snap
    if (bestDeltaX !== Infinity) result.x += bestDeltaX;
    if (bestDeltaY !== Infinity) result.y += bestDeltaY;

    return result;
};
