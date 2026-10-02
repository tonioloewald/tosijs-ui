import { ExampleContext, TransformFn } from './types.js';
/**
 * Register web components in an iframe's customElements registry.
 *
 * Uses two strategies:
 * 1. Scans context exports for creator functions with a `tagName` property
 * 2. Scans the iframe HTML for any custom-element tags (contain a hyphen)
 *    and registers them from the main window's customElements registry
 */
export declare function registerComponentsInIframe(iframeWindow: Window, context: ExampleContext): void;
export interface ExecutionOptions {
    html: string;
    css: string;
    js: string;
    context: ExampleContext;
    /**
     * The tjs/ts transpiler. Optional ONLY when `compiledJs` is supplied — then the
     * source is already transpiled and no transpiler is loaded or called.
     */
    transform?: TransformFn;
    /**
     * Build-time transpiled JS for the source block (the bake — see
     * self-contained-examples-plan.md). When present it is run VERBATIM: the
     * `rewriteImports` + `transform` step is skipped entirely, so a page runs the
     * example without loading the tjs transpiler. Already equals
     * `transform(rewriteImports(js, contextKeys))`, so scope-capture still applies.
     */
    compiledJs?: string;
    onError?: (error: Error) => void;
    /**
     * Receives the example's top-level locals after a successful run, so tjs
     * autocomplete can introspect the REAL values (e.g. a `const app = tosi(…)`
     * proxy) the user just created. Captured in-run — no re-execution, so no
     * doubled side effects.
     */
    onScope?: (scope: Record<string, unknown>) => void;
    /**
     * Receives an evaluator that runs source IN the example's own scope (the Console tab's
     * REPL): its top-level `const`/`let`/functions/imports are all reachable, and it returns the
     * completion value, as a browser console does. See `withReplHook`.
     */
    onRepl?: (evaluate: (source: string) => unknown) => void;
    /**
     * The `console` the example's code sees (see example-console.ts). Injected as a parameter,
     * like `preview`, so it shadows the global for this run only. Omitted: the real console.
     */
    console?: Console;
}
/**
 * Give the Console tab's REPL the example's own scope.
 *
 * Prepends `__tosiReplHook((src) => eval(src));` to the example's body. A DIRECT `eval` inside
 * the example's function runs in that function's scope, so the closure can reach every
 * top-level binding — `const`, `let`, functions, rewritten imports — whenever the REPL calls
 * it, and returns the completion value (`const n = 2; n * 21` → 42), like a browser console.
 *
 * At the START, not the end: an example that returns early or throws would never reach an
 * epilogue. The closure is only CALLED later, after the bindings are initialised. On the same
 * line as the first line of code, so error line numbers still match the example's source.
 * (Scope capture, the alternative, needs the optional tjs-lang and only saw runs made with the
 * code panel already open, so `words` in the obvious first REPL input was undefined.)
 */
export declare function withReplHook(prepared: {
    code: string;
    extraContext: Record<string, unknown>;
}, onRepl?: (evaluate: (source: string) => unknown) => void): {
    code: string;
    extraContext: Record<string, unknown>;
};
/**
 * Append a scope-capture epilogue to already-transformed example code when a
 * consumer wants the run's locals. Returns the (possibly unchanged) code plus the
 * extra context entry to inject. The epilogue no-ops if the example binds nothing.
 */
export declare function withScopeCapture(transformedCode: string, onScope?: (scope: Record<string, unknown>) => void): Promise<{
    code: string;
    extraContext: Record<string, unknown>;
}>;
/**
 * Execute code inline (directly in the page)
 */
export declare function executeInline(options: ExecutionOptions & {
    exampleElement: HTMLElement;
    styleElement: HTMLStyleElement;
    widgetsElement: HTMLElement;
}): Promise<HTMLElement>;
/**
 * Execute code in an isolated iframe
 */
export declare function executeInIframe(options: ExecutionOptions & {
    exampleElement: HTMLElement;
    widgetsElement: HTMLElement;
}): Promise<HTMLElement | null>;
