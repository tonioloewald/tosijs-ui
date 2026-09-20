/** The minimum `window` surface this needs — so a test can supply a fake. */
export interface PrintableWindow {
    document: {
        readyState: string;
    };
    addEventListener: (type: string, handler: () => void, options?: {
        once?: boolean;
    }) => void;
    print: () => void;
}
export interface PrintWhenReadyOptions {
    /**
     * Settle time between highlighting and `print()`. A real browser needs a beat to lay the
     * tokens out; a test passes 0.
     */
    delayMs?: number;
    /** Injected for tests. */
    setTimeoutFn?: (fn: () => void, ms: number) => unknown;
}
/**
 * Highlight, then print — after the window has actually loaded.
 *
 * Returns a promise that resolves once `print()` has been scheduled, so a caller (or a test)
 * can await the decision rather than the dialog.
 *
 * A failing highlight still prints. Plain code beats a print dialog that never opens: the
 * reader asked for a document, and an un-highlighted one is a worse document rather than no
 * document.
 */
export declare function printWhenReady(win: PrintableWindow, highlight: () => Promise<unknown>, opts?: PrintWhenReadyOptions): Promise<void>;
