import { Dialect, ExampleContext, TransformFn } from './types.js';
export declare const AsyncFunction: Function;
/**
 * Thrown by `rewriteImports` when an example has a static import the environment
 * can't satisfy (a non-context package with no import-resolver). This is NOT a code
 * defect — the code is fine, the doc environment just doesn't provide the dependency
 * — so the build check treats it as a *warning* (the block is display-only) rather
 * than a fatal error, and can tell it apart from a real syntax/transpile error.
 */
export declare class UnsupportedImportError extends Error {
    /** The offending `import …` statement. */
    readonly statement: string;
    constructor(message: string, 
    /** The offending `import …` statement. */
    statement: string);
}
/**
 * Sanitize a context module key into a JS identifier used as the binding name in rewritten
 * imports and as the AsyncFunction parameter. Must be applied consistently on both sides —
 * e.g. `'tosijs-ui'` -> `tosijsui`, `'@babylonjs/core'` -> `babylonjscore`.
 *
 * THE ONE COPY. `test-harness.ts` carried its own `key.replace(/-/g, '')`, which stripped
 * hyphens and left slashes and `@` — so a perfectly ordinary specifier like
 * `'tosijs-3d/demo-utils'` became the parameter name `tosijs3d/demoutils` and every test in
 * that file died with V8's "Arg string terminates parameters early" (tosijs-ui#111/#112).
 * The examples on the same page rendered fine, because THEY used this function. Two copies of
 * one rule, and only one of them maintained.
 *
 * A context key is an import specifier — a string. Nothing about `'@scope/pkg'` suggests it
 * must also be a valid identifier, so this makes one rather than demanding one.
 */
export declare function contextVarName(key: string): string;
/**
 * Turn context keys into a parameter list a Function constructor will accept.
 *
 * Sanitizing each key independently is not sufficient: `'tosijs-3d'` and `'tosijs/3d'` both
 * reduce to `tosijs3d`, and duplicate parameter names are a SyntaxError in a strict body — which
 * a doc test is.
 *
 * A collision THROWS, and deliberately does not quietly rename. `rewriteImports` derives its
 * binding from the same rule, so a suffixed parameter (`tosijs3d2`) would leave one of the two
 * modules bound to a name no rewritten import ever references — importing from it would return
 * undefined, at runtime, with nothing to read. Two specifiers that reduce to one identifier is a
 * genuine ambiguity in the configuration, and the only useful thing to do with an ambiguity is
 * name it. The message is the whole point: "Arg string terminates parameters early" is what this
 * replaces.
 */
export declare function contextParamNames(keys: string[]): string[];
export declare function rewriteImports(code: string, contextKeys: string[], importPrefix?: string | undefined): string;
/**
 * Execute code as an async function with injected context
 */
export declare function executeCode(code: string, context: ExampleContext, transform: TransformFn): Promise<void>;
export declare const TJS_VERSION = "0.13.11";
/**
 * tjs inline-test API (from tjs-lang/lang):
 *   extractTests(src) → { code (test-stripped), tests, testRunner }
 *   testUtils — a string defining `expect`/`assert` etc. for the runner
 * Run with: `new AsyncFunction(...ctx, execJs + testUtils + 'return ' + testRunner)`
 * which resolves to `{ passed, failed, results }`.
 */
export interface TjsTestApi {
    extractTests: (source: string) => {
        code: string;
        tests: {
            description: string;
        }[];
        testRunner: string;
    };
    testUtils: string;
}
export interface TjsTestResult {
    passed: number;
    failed: number;
    results: {
        description: string;
        passed: boolean;
        error?: string;
    }[];
}
/** Load the tjs inline-test API (memoized). null if tjs-lang is unavailable. */
export declare function loadTjsTestApi(): Promise<TjsTestApi | null>;
/**
 * Load a live-example transform for a given source dialect.
 *
 * tjs-lang is the engine:
 * - `js`  → `tjs(code, { dialect: 'js' })`, which leaves vanilla JavaScript
 *           untouched (no footgun rewriting) — behavior-neutral for plain JS.
 * - `tjs` → `tjs(code, { dialect: 'tjs' })`, the full tjs lowering (structural
 *           `==`, type guards, runtime instrumentation).
 * - `ts`  → `fromTS(code)` → tjs source → `tjs(…, { dialect: 'tjs' })`. The
 *           TypeScript compiler is loaded lazily, only here.
 *
 * The dialect is baked into the returned closure, so callers just pass code.
 *
 * Degraded mode: if tjs-lang can't be loaded, plain JS still runs unchanged
 * (`dialect: 'js'` is a no-op on it), so we pass the code through. A `ts` page
 * with no from-ts available likewise falls back to running the source as JS.
 */
export declare function loadTransform(dialect?: Dialect): Promise<TransformFn>;
