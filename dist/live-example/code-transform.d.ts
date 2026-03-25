import { ExampleContext, TransformFn } from './types';
export declare const sucraseSrc: () => string;
export declare const AsyncFunction: Function;
/**
 * Rewrite import statements to use context variables
 * e.g., `import { x } from 'tosijs'` -> `const { x } = tosijs`
 */
export declare function rewriteImports(code: string, contextKeys: string[]): string;
/**
 * Execute code as an async function with injected context
 */
export declare function executeCode(code: string, context: ExampleContext, transform: TransformFn): Promise<void>;
/**
 * Load sucrase transform function.
 *
 * webpackIgnore prevents bundlers (webpack/CRA) from rewriting
 * this dynamic import of an external CDN URL.
 * Falls back to a passthrough that errors on TypeScript.
 */
export declare function loadTransform(): Promise<TransformFn>;
