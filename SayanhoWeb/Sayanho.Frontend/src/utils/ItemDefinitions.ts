import { Point, Size } from '../types';

export const STATIC_ITEM_DEFINITIONS: Record<string, { size: Size, connectionPoints: Record<string, Point> }> = {
    "Portal": {
        size: { width: 60, height: 40 },
        connectionPoints: {
            "port": { x: 60, y: 20 }
        }
    },
    "Source": {
        size: { width: 60, height: 60 },
        connectionPoints: {
            "out": { x: 30, y: 60 }
        }
    },
    "Main Switch": {
        size: { width: 100, height: 100 },
        connectionPoints: {
            "in": { x: 50, y: 0 },
            "out": { x: 50, y: 100 }
        }
    },
    "Change Over Switch": {
        size: { width: 100, height: 100 },
        connectionPoints: {
            "in1": { x: 31, y: 0 },
            "in2": { x: 85, y: 0 },
            "out": { x: 58, y: 100 }
        }
    },
    "Bulb": {
        size: { width: 60, height: 60 },
        connectionPoints: {
            "in": { x: 30, y: 0 }
        }
    },
    "Tube Light": {
        size: { width: 80, height: 48 },
        connectionPoints: {
            "in": { x: 40, y: 0 }
        }
    },
    "Ceiling Fan": {
        size: { width: 60, height: 60 },
        connectionPoints: {
            "in": { x: 30, y: 0 }
        }
    },
    "Exhaust Fan": {
        size: { width: 60, height: 60 },
        connectionPoints: {
            "in": { x: 30, y: 0 }
        }
    },
    "Split AC": {
        size: { width: 80, height: 60 },
        connectionPoints: {
            "in": { x: 40, y: 0 }
        }
    },
    "AC Point": {
        size: { width: 80, height: 60 },
        connectionPoints: {
            "in": { x: 40, y: 0 }
        }
    },
    "Geyser": {
        size: { width: 60, height: 60 },
        connectionPoints: {
            "in": { x: 30, y: 0 }
        }
    },
    "Geyser Point": {
        size: { width: 60, height: 60 },
        connectionPoints: {
            "in": { x: 30, y: 0 }
        }
    },
    "Call Bell": {
        size: { width: 60, height: 60 },
        connectionPoints: {
            "in": { x: 30, y: 0 }
        }
    },
    "Point Switch Board": {
        size: { width: 100, height: 100 },  // C# size - SVG will be stretched from 100 to 120 width
        connectionPoints: {
            // Use exact C# connection points - they match the stretched SVG positions
            "in": { x: 50, y: 0 },      // C# uses (50,0) but that seems wrong, SVG center at 50 becomes 60 when stretched
            "out1": { x: 5, y: 35 },    // SVG at 5 becomes 6 (5 * 1.2)
            "out2": { x: 5, y: 65 },    // SVG at 5 becomes 6 (5 * 1.2)
            "out3": { x: 10, y: 95 },   // SVG at 10 becomes 12 (10 * 1.2)
            "out4": { x: 30, y: 95 },   // SVG at 30 becomes 36 (30 * 1.2)
            "out5": { x: 50, y: 95 },   // SVG at 50 becomes 60 (50 * 1.2)
            "out6": { x: 70, y: 95 },   // SVG at 70 becomes 84 (70 * 1.2)
            "out7": { x: 90, y: 95 },  // SVG at 90 becomes 108 (90 * 1.2)
            "out8": { x: 95, y: 65 },  // SVG at 95 becomes 114 (95 * 1.2)
            "out9": { x: 95, y: 35 }   // SVG at 95 becomes 114 (95 * 1.2)
        }
    },
    "Avg. 5A Switch Board": {
        size: { width: 100, height: 100 },
        connectionPoints: {
            "in": { x: 50, y: 0 }
        }
    },
    "LT Cubical Panel": {
        size: { width: 300, height: 200 },
        connectionPoints: {}
    },
    // Default fallback for others
    "default": {
        size: { width: 60, height: 60 },
        connectionPoints: {
            "in": { x: 30, y: 0 }
        }
    }
};

export const getItemDefinition = (name: string) => {
    return STATIC_ITEM_DEFINITIONS[name] || STATIC_ITEM_DEFINITIONS["default"];
};
