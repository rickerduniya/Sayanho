import { useEffect, useState, useRef } from 'react';

export const useResizeObserver = <T extends HTMLElement>() => {
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
    const ref = useRef<T>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, []);

    return { ref, width: dimensions?.width || 0, height: dimensions?.height || 0 };
};
