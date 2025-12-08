import { CanvasItem, Connector } from '../types';

interface GraphNode {
    item: CanvasItem;
    inDegree: number;
    outNeighbors: GraphNode[];
    level: number;
}

export const applyAutoLayout = (items: CanvasItem[], connectors: Connector[]): CanvasItem[] => {
    if (items.length === 0) return items;

    // 1. Build Graph
    const nodeMap = new Map<string, GraphNode>();
    items.forEach(item => {
        nodeMap.set(item.uniqueID, {
            item,
            inDegree: 0,
            outNeighbors: [],
            level: 0
        });
    });

    connectors.forEach(conn => {
        const sourceId = conn.sourceItem.uniqueID;
        const targetId = conn.targetItem.uniqueID;

        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);

        if (sourceNode && targetNode) {
            // Determine direction. 
            // In C#, it checks for "out" -> "in". 
            // Here we assume source -> target is the flow unless specified otherwise.
            // We can refine this if needed.
            sourceNode.outNeighbors.push(targetNode);
            targetNode.inDegree++;
        }
    });

    // 2. Compute Levels (Kahn's Algorithm / Topological Sort with leveling)
    const queue: GraphNode[] = [];
    const nodes = Array.from(nodeMap.values());

    nodes.forEach(node => {
        if (node.inDegree === 0) {
            queue.push(node);
            node.level = 0;
        }
    });

    // If no nodes have inDegree 0 (cycle), pick one arbitrarily or handle it.
    // For now, if queue is empty but nodes exist, pick the first one.
    if (queue.length === 0 && nodes.length > 0) {
        nodes[0].level = 0;
        queue.push(nodes[0]);
    }

    const sortedNodes: GraphNode[] = [];

    // We need to process levels. 
    // To handle cycles correctly in a layout, we might need a more robust approach, 
    // but a simple BFS-like traversal for levels works for DAGs.
    // For cycles, we'll just visit nodes.

    // Reset inDegrees for the traversal to avoid modifying original graph if we needed it, 
    // but here we can just decrement.

    // Actually, for layering, we want: Level(v) = max(Level(u)) + 1 for all u -> v
    // We can use a longest path algorithm on the DAG.

    // Let's try a simple approach:
    // Assign level 0 to roots.
    // Propagate levels.

    // To handle cycles, we limit iterations or track visited.
    const visited = new Set<string>();

    // Re-initialize queue with all roots
    const processQueue: GraphNode[] = nodes.filter(n => n.inDegree === 0);
    if (processQueue.length === 0 && nodes.length > 0) processQueue.push(nodes[0]);

    processQueue.forEach(n => visited.add(n.item.uniqueID));

    while (processQueue.length > 0) {
        const u = processQueue.shift()!;

        u.outNeighbors.forEach(v => {
            v.level = Math.max(v.level, u.level + 1);
            // In a true topological sort we'd decrement inDegree.
            // Here we just want to propagate levels.
            // If we haven't visited v or we found a longer path, we might want to re-process?
            // Simple BFS is shortest path (min level). We want max level (longest path) for proper layering.
            // But for simple layout, let's just ensure v.level > u.level.

            // To avoid infinite loops in cycles, check if we've processed v too many times?
            // Or just use the topological sort approach.

            v.inDegree--;
            if (v.inDegree === 0) {
                processQueue.push(v);
                visited.add(v.item.uniqueID);
            }
        });
    }

    // Handle remaining nodes (cycles)
    nodes.forEach(node => {
        if (!visited.has(node.item.uniqueID)) {
            // Assign a level deeper than max current level
            const maxLevel = Math.max(...nodes.map(n => n.level));
            node.level = maxLevel + 1;
            visited.add(node.item.uniqueID);
        }
    });

    // 3. Arrange
    const levels: GraphNode[][] = [];
    nodes.forEach(node => {
        if (!levels[node.level]) levels[node.level] = [];
        levels[node.level].push(node);
    });

    const HORIZONTAL_SPACING = 60;
    const VERTICAL_SPACING = 120;
    const START_X = 50;
    const START_Y = 50;

    let currentY = START_Y;
    const newItems = [...items];

    levels.forEach(levelNodes => {
        if (!levelNodes || levelNodes.length === 0) return;

        let currentX = START_X;

        // Sort nodes in level to minimize crossing? (Simple sort by name for now)
        levelNodes.sort((a, b) => a.item.name.localeCompare(b.item.name));

        levelNodes.forEach(node => {
            const itemIndex = newItems.findIndex(i => i.uniqueID === node.item.uniqueID);
            if (itemIndex !== -1) {
                newItems[itemIndex] = {
                    ...newItems[itemIndex],
                    position: { x: currentX, y: currentY }
                };
                currentX += (node.item.size?.width || 100) + HORIZONTAL_SPACING;
            }
        });

        const maxHeight = Math.max(...levelNodes.map(n => n.item.size?.height || 100));
        currentY += maxHeight + VERTICAL_SPACING;
    });

    return newItems;
};
