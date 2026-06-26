import { Component, ElementCreator, PartsMap } from 'tosijs';
export type DiffOp = 'context' | 'add' | 'remove';
export interface DiffLine {
    op: DiffOp;
    text: string;
}
/**
 * Line-level diff of two strings via longest-common-subsequence, returning each
 * line tagged `context` (unchanged), `remove` (only in `before`), or `add` (only
 * in `after`), in display order.
 */
export declare function diffLines(before: string, after: string): DiffLine[];
interface DiffParts extends PartsMap {
    body: HTMLElement;
}
export declare class TosiDiff extends Component<DiffParts> {
    static preferredTagName: string;
    static initAttributes: {
        original: string;
        modified: string;
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
    };
    content: () => HTMLDivElement[];
    render(): void;
}
export declare const tosiDiff: ElementCreator<TosiDiff>;
export {};
