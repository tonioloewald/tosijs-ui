import { ExampleContext, TransformFn } from './types';
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
    transform: TransformFn;
    onError?: (error: Error) => void;
    /**
     * Receives the example's top-level locals after a successful run, so tjs
     * autocomplete can introspect the REAL values (e.g. a `const app = tosi(…)`
     * proxy) the user just created. Captured in-run — no re-execution, so no
     * doubled side effects.
     */
    onScope?: (scope: Record<string, unknown>) => void;
}
/**
 * Append a scope-capture epilogue to already-transformed example code when a
 * consumer wants the run's locals. Returns the (possibly unchanged) code plus the
 * extra context entry to inject. The epilogue no-ops if the example binds nothing.
 */
export declare function withScopeCapture(transformedCode: string, onScope?: (scope: Record<string, unknown>) => void): {
    code: string;
    extraContext: Record<string, unknown>;
};
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
