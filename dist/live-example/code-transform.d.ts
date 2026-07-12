import { Dialect, ExampleContext, TransformFn } from './types';
export declare const AsyncFunction: Function;
/**
 * Sanitize a context module key into a JS identifier used as the binding name
 * in rewritten imports and as the AsyncFunction parameter. Must be applied
 * consistently on both sides. e.g. 'tosijs-ui' -> 'tosijsui',
 * '@babylonjs/core' -> 'babylonjscore'.
 */
export declare function contextVarName(key: string): string;
/**
 * Rewrite import statements (from the example context) to const bindings:
 *   import { x } from 'tosijs'        -> const { x } = tosijs
 *   import * as B from '@babylonjs'   -> const B = babylonjs   (context key)
 *   import Foo from 'my-lib'          -> const Foo = mylib
 * The `.elements` accessor form (`import { x } from 'tosijs'.elements`) is
 * preserved. Any static import that isn't from a context module (or uses an
 * unsupported form) throws a clear error rather than becoming a SyntaxError in
 * the AsyncFunction body.
 */
export declare function rewriteImports(code: string, contextKeys: string[]): string;
/**
 * Best-effort list of the identifiers a snippet binds at the TOP level (column 0,
 * so genuinely function-scope, not inside a block). Handles `const/let/var` incl.
 * single-line destructuring, and `function`/`class` declarations. Used to introspect
 * an example's live locals for tjs autocomplete — imperfect is fine, since the
 * capture epilogue guards every name individually.
 */
export declare function extractTopLevelBindingNames(code: string): string[];
/**
 * Build an epilogue that captures the values of `names` (as they stand at the end
 * of a run) into `captureVar(scopeObject)`. Each binding is read behind its own
 * try/catch so a stale/over-matched name can't abort the whole capture, and the
 * whole thing is a trailing block so it never shadows user code. Returns '' when
 * there's nothing to capture.
 */
export declare function buildScopeCapture(names: string[], captureVar: string): string;
/**
 * Execute code as an async function with injected context
 */
export declare function executeCode(code: string, context: ExampleContext, transform: TransformFn): Promise<void>;
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
