import { ElementCreator, XinStyleSheet } from 'tosijs';
export interface PaletteResult {
    title: string;
    description?: string;
    path?: string;
    icon?: string | Element;
    kind?: string;
    group?: string;
    score?: number;
    action?: (result: PaletteResult, palette: TosiPalette) => void | boolean;
    [key: string]: any;
}
export type PaletteSource = (query: string, context: {
    signal: AbortSignal;
    palette: TosiPalette;
}) => PaletteResult[] | null | undefined | Promise<PaletteResult[] | null | undefined>;
export type PaletteRenderer = (result: PaletteResult, query: string) => Element;
/** Does this keydown match a shortcut such as `mod+k` or `ctrl+shift+p`? */
export declare function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean;
/** The shortcut as a person reads it: `mod+k` is ⌘K on a Mac, Ctrl K elsewhere. */
export declare function describeShortcut(shortcut: string): string;
/** `text` with every occurrence of the query's words wrapped in <mark>, as nodes (no HTML). */
export declare function highlight(text: string, query: string): Node[];
/** Group by `group`, groups in the order of their best result, best first within each. */
export declare function rankResults(results: PaletteResult[]): PaletteResult[];
/** The row a result gets when its kind has no renderer of its own. */
export declare function defaultPaletteRow(result: PaletteResult, query: string): Element;
declare const TosiPalette_base: import("tosijs").WithAttributes<{
    placeholder: string;
    shortcut: string;
    multiline: boolean;
    timeout: number;
    quickLinksCaption: string;
    trigger: string;
    compactWidth: number;
    emptyCaption: string;
}>;
export declare class TosiPalette extends TosiPalette_base {
    static preferredTagName: string;
    static lightStyleSpec: XinStyleSheet;
    sources: PaletteSource[];
    renderers: Record<string, PaletteRenderer>;
    rank: ((results: PaletteResult[], query: string) => PaletteResult[]) | null;
    quickLinks: PaletteResult[];
    value: string;
    /** What is listed now, in order. */
    results: PaletteResult[];
    private active;
    private searching;
    private generation;
    private pending;
    private problems;
    private dialogElement;
    private listElement;
    private spinner;
    private field;
    private listId;
    private onDocumentKeydown;
    private onFieldInput;
    private onFieldKeydown;
    private onListPointer;
    private onDialogClick;
    private onCancel;
    private clearField;
    content: () => (HTMLButtonElement | HTMLDialogElement)[];
    private resizeObserver;
    private compact;
    private onResize;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** The query field: a text box when `multiline`, re-made when that changes. */
    private ensureField;
    private grow;
    open(): void;
    close(): void;
    /** Run every source for `query`, listing results as each answers. */
    search(query: string): void;
    /** List `results`, keeping the first one active. */
    private show;
    private setActive;
    private moveActive;
    /** Act on a result: the `action` event, then its own action, then close (unless it said not to). */
    choose(result: PaletteResult): void;
    /** Enter with nothing chosen: hand the query itself to whoever listens. */
    private submit;
    render(): void;
}
export declare const tosiPalette: ElementCreator<TosiPalette>;
export {};
