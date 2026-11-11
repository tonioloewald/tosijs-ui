import { ElementCreator, XinStyleSheet } from 'tosijs';
/** The limits the first neighbour's size must stay within, in pixels. */
export interface SplitLimits {
    total: number;
    min: number;
    max: number;
}
/**
 * The limits on the first neighbour's size when two items sharing `total` pixels must each
 * stay within their own minimum and maximum. When they cannot both be satisfied, the range
 * collapses to the current size rather than inventing one.
 */
export declare function splitLimits(current: number, total: number, first: {
    min: number;
    max: number;
}, second: {
    min: number;
    max: number;
}): SplitLimits;
declare const TosiSplitter_base: import("tosijs").WithAttributes<{
    /** the smallest either neighbour may become, in pixels */
    minSize: number;
    /** how far an arrow key moves it, in pixels (Shift: four times as far) */
    step: number;
}>;
export declare class TosiSplitter extends TosiSplitter_base {
    static preferredTagName: string;
    static lightStyleSpec: XinStyleSheet;
    private axis;
    private neighbours;
    private sizeOf;
    private bounds;
    /** The first neighbour's current size and the limits it may move within. */
    private measure;
    private apply;
    private padding;
    private chosen?;
    private moveTo;
    private refit;
    /** The first neighbour's share of the space the two share, from 0 to 1. */
    get value(): number;
    set value(share: number);
    /** Put both neighbours back to the sizes their own styles give them. */
    reset: () => void;
    private updateAria;
    private handleKey;
    private handlePointerDown;
    private resizeObserver?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const tosiSplitter: ElementCreator<TosiSplitter>;
export {};
