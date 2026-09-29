import type { ExampleContext, TransformFn } from './types.js';
/** Per-example options, from the JSON after the fence language: ```tjs {"debug": true} */
export type DialectOptions = Record<string, unknown>;
export interface DialectRunContext {
    /** The example's output element. HTML and CSS blocks are already applied to it. */
    preview: HTMLElement;
    /** This example's fence options (`{}` when it has none). */
    options: DialectOptions;
    /** Aborted when the example re-runs (an edit) or is removed; stop long work on it. */
    signal: AbortSignal;
    /** What the page provides to examples (`tosijs`, `tosijs-ui`, …), keyed by module name. */
    context: ExampleContext;
    /** Show a value as the example's result, below its preview. */
    report(result: unknown): void;
}
export interface DialectSpec {
    /** Name shown on the example's source tab, e.g. `AJS`. Defaults to the dialect name. */
    label?: string;
    /** Code-editor mode for the source (`javascript`, `tjs`, `ajs`, …). Defaults to the name. */
    editorMode?: string;
    /**
     * Source → JavaScript. The example runs the result the way it runs a `js` block, with
     * imports from the page's context modules already rewritten.
     */
    transform?: (source: string, options: DialectOptions) => {
        code: string;
    } | Promise<{
        code: string;
    }>;
    /**
     * Run the source yourself. A non-`undefined` return value is reported as the example's
     * result. Throwing fails the example, exactly as a throwing `js` block does.
     */
    run?: (source: string, context: DialectRunContext) => unknown;
}
/**
 * Add a dialect, or replace a built-in one (`registerDialect('tjs', { transform })` runs tjs
 * examples through the site's own tjs-lang build instead of the pinned copy).
 *
 * Call it before the doc system starts: examples take their dialect when they are created,
 * and a fence in an unregistered language is shown as plain code.
 */
export declare function registerDialect(name: string, spec: DialectSpec): void;
/** The registered spec for a dialect, or `undefined`. */
export declare function getDialect(name: string): DialectSpec | undefined;
/** Is this dialect's `js`/`tjs`/`ts` built-in still in place (not replaced by the site)? */
export declare function isBuiltInDialect(name: string): boolean;
/**
 * The transform an example in `name` runs its source through, or `undefined` for a `run`
 * dialect (which executes the source itself). An unknown name runs as plain JavaScript —
 * the same thing an unregistered language's example did before there was a registry.
 */
export declare function dialectTransform(name: string, options?: DialectOptions): Promise<TransformFn | undefined>;
/**
 * Show a `run` dialect's result below the example's preview: a string as written, anything
 * else as JSON (falling back to `String()` for what JSON cannot represent).
 */
export declare function showDialectResult(preview: HTMLElement, value: unknown): void;
