/** Tag for code run as a live example, so its frames are identifiable. */
export declare const EXAMPLE_SOURCE_URL = "inline-example";
/** Tag for code run as a doc test. */
export declare const TEST_SOURCE_URL = "inline-test";
export interface UserFrame {
    url: string;
    line: number;
    col: number;
}
export declare function firstUserStackFrame(stack: string | undefined): UserFrame | null;
export declare function stackLineOffset(): number;
/** The author's line number for a reported frame, or null if it cannot be trusted. */
export declare function authorLine(frame: UserFrame | null): number | null;
/** The trimmed source line `frame.line` refers to, if we have the source. */
export declare function sourceLineAt(source: string | null, lineNum: number): string | null;
/**
 * `message | the offending source (line N)` when the error can be located, and the plain
 * message when it cannot — never a worse message than before.
 */
export declare function describeError(err: unknown, source: string | null): string;
/**
 * Explain a failure of the `AsyncFunction` CONSTRUCTOR, which throws before any user code runs
 * and therefore produces no locatable frame.
 *
 * The discriminator is worth the extra construction: if the same body compiles with **no**
 * parameters, the body is fine and the parameter list is at fault — which is a statement about
 * the caller's `context` keys, not about anything the author wrote. That is exactly the case
 * that reported as `Arg string terminates parameters early`, a message naming nothing anyone
 * could act on.
 */
export declare function diagnoseConstruction(err: unknown, paramNames: string[], code: string, construct: (...args: string[]) => unknown): string;
