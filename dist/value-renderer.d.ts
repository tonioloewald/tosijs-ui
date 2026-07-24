export type Alignment = 'left' | 'right' | 'center';
/**
 * A value-renderer type string. The bare base names autocomplete; parameterized
 * forms (`fixed(2)`, `currency(EUR)`, `boolean(check,x)`) come in through the
 * `string` fallback — TypeScript can't express the parenthesized-argument grammar,
 * but tjs-lang validates the full string. The `& {}` keeps the literal suggestions
 * from being widened away by the `string` member.
 */
export type ValueRendererType = 'number' | 'currency' | 'fixed' | 'percent' | 'sci' | 'eng' | 'bytes' | 'boolean' | (string & {});
export interface ValueRenderer {
    /** Default alignment for the type — 'right' for numerics, 'center' for booleans. */
    align?: Alignment;
    /** Format a value to text (numeric types) or a Node (icon types). Locale-reactive. */
    format(value: unknown): string | Node;
    /** Render a value into an element (sets textContent, or replaces children with a node). */
    toDOM(element: HTMLElement, value: unknown): void;
}
interface ParsedType {
    base: string;
    args: string[];
}
/** Parse `base(arg1, arg2)` — the type-string mini-syntax. */
export declare function parseValueType(type: string): ParsedType;
/** Build a reusable renderer for a value type string (see the type table above). */
export declare function valueRenderer(type: ValueRendererType): ValueRenderer;
export {};
