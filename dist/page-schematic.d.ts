export interface SchematicOptions {
    /** the element to draw, with what is inside it; `document.body` by default */
    root?: Element;
    /** elements matching this are left out, with what is inside them */
    skip?: string;
    /** at most this many boxes */
    maxNodes?: number;
    /** at most this many characters of SVG */
    maxBytes?: number;
}
/**
 * Draw what is on screen as an SVG schematic. It fits `maxNodes` and `maxBytes`, simplified
 * and stamped as truncated when the page is bigger than that.
 */
export declare function pageSchematic(options?: SchematicOptions): string;
