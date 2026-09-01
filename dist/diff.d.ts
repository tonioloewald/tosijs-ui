import { Component, ElementCreator, PartsMap } from 'tosijs';
export type DiffOp = 'context' | 'add' | 'remove';
export interface DiffLine {
    op: DiffOp;
    text: string;
}
/** Which side of a change block won. */
export type DiffResolution = 'original' | 'modified';
/**
 * A run of unchanged lines, or one CHANGE — the unit a reviewer accepts or rejects.
 *
 * `diffLines` emits removes and adds in walk order, which for a multi-line edit can
 * interleave (`r a`, `+ A`, `r b`, `+ B`). That is fine to *read* and wrong to *resolve*:
 * accepting half of an edit is not a state anybody asked for. Grouping every consecutive
 * non-context run into one block is what makes "do I want this change?" a single decision.
 */
export type DiffBlock = {
    kind: 'context';
    lines: string[];
} | {
    kind: 'change';
    removed: string[];
    added: string[];
};
/** Group a line diff into context runs and change blocks, in display order. */
export declare function diffBlocks(lines: DiffLine[]): DiffBlock[];
/**
 * Rebuild the text implied by a set of per-change choices.
 *
 * The invariant worth holding onto, and the reason this is a pure function with its own
 * tests: all-`original` reproduces the original EXACTLY and all-`modified` reproduces the
 * modified exactly. A resolver that cannot round-trip its own endpoints is one you cannot
 * trust in the middle.
 */
export declare function resolveDiff(blocks: DiffBlock[], choices: DiffResolution[]): string;
/**
 * Line-level diff of two strings via longest-common-subsequence, returning each
 * line tagged `context` (unchanged), `remove` (only in `before`), or `add` (only
 * in `after`), in display order.
 */
export declare function diffLines(before: string, after: string): DiffLine[];
/** A run of text within a changed line, flagged if it is part of what actually differs. */
export interface TokenRun {
    text: string;
    changed: boolean;
}
/**
 * Word-level diff of two lines, as runs that reassemble each input exactly.
 *
 * Returns everything flagged `changed` when the lines are too long to diff cheaply, or when
 * they share nothing — in both cases the containing line highlight already says it.
 */
export declare function diffTokens(before: string, after: string): {
    removed: TokenRun[];
    added: TokenRun[];
};
interface DiffParts extends PartsMap {
    body: HTMLElement;
}
export declare class TosiDiff extends Component<DiffParts> {
    static preferredTagName: string;
    static initAttributes: {
        original: string;
        modified: string;
        resolvable: boolean;
        originalLabel: string;
        modifiedLabel: string;
    };
    static shadowStyleSpec: {
        ':host': {
            display: string;
            overflow: string;
            font: string;
            background: string;
            color: string;
        };
        ':host([hidden])': {
            display: string;
        };
        '.diff-line': {
            display: string;
            gridTemplateColumns: string;
            whiteSpace: string;
            wordBreak: string;
        };
        '.diff-line .line-text': {
            minWidth: string;
            whiteSpace: string;
            wordBreak: string;
        };
        '.diff-line .marker': {
            textAlign: string;
            userSelect: string;
            opacity: string;
        };
        '.diff-add': {
            background: string;
        };
        '.diff-add .marker': {
            color: string;
        };
        '.diff-remove': {
            background: string;
        };
        '.diff-remove .marker': {
            color: string;
        };
        '.diff-hunk': {
            display: string;
            position: string;
            margin: string;
            borderRadius: string;
            boxShadow: string;
        };
        '.diff-choices': {
            display: string;
            gap: string;
            alignItems: string;
            padding: string;
        };
        '.diff-choices button': {
            font: string;
            cursor: string;
            padding: string;
            borderRadius: string;
            border: string;
            color: string;
            background: string;
        };
        '.diff-choices button[aria-pressed="true"]': {
            background: string;
            color: string;
        };
        '.diff-line .text.changed': {
            borderRadius: string;
            padding: string;
        };
        '.diff-add .text.changed': {
            background: string;
        };
        '.diff-remove .text.changed': {
            background: string;
        };
        '.diff-line[data-choice]': {
            cursor: string;
        };
        '.diff-line[data-choice]:hover': {
            filter: string;
        };
        '.diff-line.not-chosen': {
            opacity: string;
            textDecoration: string;
            textDecorationColor: string;
        };
    };
    content: () => HTMLDivElement[];
    private _resolutions;
    private resolvedOriginal;
    private resolvedModified;
    /** One entry per change block, in document order. */
    get resolutions(): DiffResolution[];
    set resolutions(choices: DiffResolution[]);
    private get blocks();
    /** Number of decisions this diff asks for. `0` means the two texts agree. */
    get changeCount(): number;
    /**
     * The text implied by the current choices. With everything accepted this is exactly
     * `modified`, and with everything rejected exactly `original`, so a host that never shows
     * the controls still gets a sensible value.
     */
    get value(): string;
    private setAll;
    acceptAll: () => void;
    rejectAll: () => void;
    private syncResolutions;
    private choose;
    private lineElement;
    render(): void;
}
export declare const tosiDiff: ElementCreator<TosiDiff>;
export {};
