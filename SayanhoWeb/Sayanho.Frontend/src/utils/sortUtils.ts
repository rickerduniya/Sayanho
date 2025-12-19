export const compareOptionStrings = (a: string, b: string): number => {
    const aa = (a ?? '').toString();
    const bb = (b ?? '').toString();

    if (aa === bb) return 0;

    const tokenize = (s: string): Array<string | number> => {
        const tokens: Array<string | number> = [];
        const re = /(\d+(?:\.\d+)?)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = re.exec(s)) !== null) {
            const start = match.index;
            if (start > lastIndex) {
                tokens.push(s.slice(lastIndex, start).toLowerCase());
            }
            tokens.push(parseFloat(match[1]));
            lastIndex = re.lastIndex;
        }

        if (lastIndex < s.length) {
            tokens.push(s.slice(lastIndex).toLowerCase());
        }

        return tokens;
    };

    const at = tokenize(aa);
    const bt = tokenize(bb);

    const len = Math.max(at.length, bt.length);
    for (let i = 0; i < len; i++) {
        const x = at[i];
        const y = bt[i];

        if (x === undefined) return -1;
        if (y === undefined) return 1;

        if (typeof x === 'number' && typeof y === 'number') {
            if (x !== y) return x - y;
            continue;
        }

        if (typeof x === 'string' && typeof y === 'string') {
            const cmp = x.localeCompare(y);
            if (cmp !== 0) return cmp;
            continue;
        }

        // If token types differ, keep numbers before letters at same position
        if (typeof x === 'number') return -1;
        return 1;
    }

    return aa.localeCompare(bb);
};

export const sortOptionStringsAsc = (values: string[]): string[] => {
    return [...values].sort(compareOptionStrings);
};
