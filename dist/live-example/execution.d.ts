import { ExampleContext, TransformFn } from './types';
/**
 * Register web components in an iframe's customElements registry
 */
export declare function registerComponentsInIframe(iframeWindow: Window, context: ExampleContext): void;
export interface ExecutionOptions {
    html: string;
    css: string;
    js: string;
    context: ExampleContext;
    transform: TransformFn;
    onError?: (error: Error) => void;
}
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
