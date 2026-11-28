/** The body's bytes, or `null` once it is over `maxBytes`. */
export declare function readBodyCapped(request: Request, maxBytes: number): Promise<Uint8Array | null>;
/** The body as UTF-8 text, or `null` once it is over `maxBytes`. */
export declare function readTextCapped(request: Request, maxBytes: number): Promise<string | null>;
/**
 * The body parsed as JSON: `{ value }`, `{ tooLarge: true }`, or `{ invalid: true }` when it is
 * not JSON.
 */
export declare function readJsonCapped(request: Request, maxBytes: number): Promise<{
    value: unknown;
} | {
    tooLarge: true;
} | {
    invalid: true;
}>;
