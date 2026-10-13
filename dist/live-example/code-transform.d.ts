import { Dialect, ExampleContext, TransformFn, TransformResult } from './types.js';
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
/**
 * Fail with a sentence, not a destructuring error, when an example imports a module the site
 * listed in its context but never supplied (#210 item 4).
 *
 * `bundleEntry` REPLACES tosijs-ui's bundle, and with it the `xinjs` / `xinjsui` globals the
 * doc system reads its default context from. The key is then present and its value
 * `undefined`, so `import { elements } from 'tosijs-ui'` became `const { elements } =
 * undefined` and the reader was told "Cannot destructure property 'elements' of 'tosijsui'"
 * about a line they did not write.
 */
export declare function assertContextProvided(code: string, context: Record<string, unknown>): void;
/**
 * `rewriteImports` for code that is about to RUN against a context: checks first that every
 * module it imports was actually supplied (`assertContextProvided`). Tests, inline tjs tests
 * and `executeCode` go through this. The example itself pairs the two calls by hand in
 * execution.ts, because a pre-compiled example skips the rewrite but still needs the check.
 * The REPL deliberately uses plain `rewriteImports`: a REPL line is not a module.
 */
export declare function rewriteContextImports(code: string, context: Record<string, unknown>): string;
export declare function rewriteImports(code: string, contextKeys: string[], importPrefix?: string | undefined): string;
/**
 * Execute code as an async function with injected context
 */
export declare function executeCode(code: string, context: ExampleContext, transform: TransformFn): Promise<void>;
export declare const TJS_VERSION = "0.14.0-rc.5";
export declare const TYPESCRIPT_VERSION = "5.9.3";
export declare const TYPESCRIPT_URL = "https://esm.sh/typescript@5.9.3";
type StripExports = (code: string) => string;
/**
 * @internal For TESTS only: a function stands in for tjs-lang's `stripExports`, `null` acts
 * as a tjs-lang that has none, and `undefined` goes back to whatever was loaded.
 */
export declare function setStripExportsForTests(stand: StripExports | null | undefined): void;
/**
 * `code` without its `export`s, when the tjs-lang this process can load is able to remove
 * them; otherwise `code` unchanged. For a caller that transpiles by some other route (the
 * build check lowers `ts` with Bun, not with tjs-lang) and must still answer "will this
 * run?" the way the page does.
 */
export declare function withoutExports(code: string): Promise<string>;
/**
 * Generated documentation for a `tjs` source (#184 part 3): tjs-lang's
 * `generateDocsMarkdown(source, tjs(source).types)`, where the signature IS the docs.
 *
 * FEATURE-DETECTED: tjs-lang's browser bundle exports the generator from the 0.14 release
 * candidates on (the pinned 0.14.0-rc.5 has it; 0.13.13 did not). With an older tjs-lang
 * this resolves to null and the built-in `tjs` shows no Docs tab; such a site can supply
 * docs itself through `registerDialect('tjs', { transform, docs })`.
 */
export type DocsFn = (source: string) => string;
export declare function loadTjsDocs(): Promise<DocsFn | null>;
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
 * What an example keeps of a tjs-lang transpile, with `export` removed when tjs-lang can
 * do that (see `noteStripExports`).
 *
 * The build's example check has a SECOND route for `ts` (it lowers with Bun, because it
 * cannot fetch the TypeScript compiler; `check-examples.ts`), so a rule added here that
 * decides whether an example runs must be added there too. `withoutExports` is that pairing
 * for `export`, and it was missed the first time.
 *
 * Keeps tjs-lang's `testRunner` beside the code when it returns one (#210 item 1). It is one
 * property read on a transpile that already happened, and it is the only runner built from
 * the test bodies as tjs-lang REWROTE them; `extractTests` builds its own from raw text.
 * Keeps `prelude` and `body` when it returns both (#216), for the console.
 */
export declare function shapeTjsOutput(out: {
    code: string;
    testRunner?: unknown;
    prelude?: unknown;
    body?: unknown;
}, stripExports?: StripExports | null | undefined): TransformResult;
/**
 * Load a live-example transform for a given source dialect.
 *
 * tjs-lang is the engine:
 * - `js`  → `tjs(code, { dialect: 'js' })`, which leaves vanilla JavaScript
 *           untouched (no footgun rewriting) — behavior-neutral for plain JS.
 * - `tjs` → `tjs(code, { dialect: 'tjs' })`, the full tjs lowering (structural
 *           `==`, type guards, runtime instrumentation).
 * - `ts`  → `fromTS(code)` → tjs source → `tjs(…)` with NO dialect, so the annotation
 *           `fromTS` writes decides: converted TypeScript keeps JavaScript's semantics
 *           (no runtime parameter guards, `new` allowed). The TypeScript compiler is
 *           loaded lazily, only here.
 *
 * The dialect is baked into the returned closure, so callers just pass code.
 *
 * Degraded mode: if tjs-lang can't be loaded, plain JS still runs unchanged
 * (`dialect: 'js'` is a no-op on it), so we pass the code through. A `ts` page
 * with no from-ts available likewise falls back to running the source as JS.
 */
/**
 * Is a REAL transform available for this dialect, or would `loadTransform` degrade?
 *
 * `loadTransform` falls back to identity when tjs-lang cannot be resolved, which is right at
 * RUNTIME — an example that will not transpile should still render as something. It is wrong
 * for a build-time CHECK: identity means the block is then parsed as raw JavaScript, so valid
 * TJS produces a confident syntax error attributed to the author's document.
 *
 * That is what happened (tosijs-ui#154): ~30 "errors" in correct TJS, each advising the
 * author to fix code that was already right, with the one line explaining the degradation
 * printed far away. Callers that DIAGNOSE must ask this first and skip what they cannot
 * actually check.
 */
export declare function transformAvailable(dialect: Dialect): Promise<boolean>;
export declare function loadTransform(dialect?: Dialect): Promise<TransformFn>;
export {};
