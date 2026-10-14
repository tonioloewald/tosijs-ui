export declare const SUFFIX_RE: RegExp;
/** A name split into its base and its suffix tokens, in order, or null if it has none. */
export declare function splitSuffixes(name: string): {
    baseName: string;
    tokens: string[];
} | null;
/** The signed number in a numeric token: `_45r` is -45. */
export declare const suffixNumber: (token: string) => number;
