import { ExampleContext, TransformFn } from './types';
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
 * Tries three strategies in order:
 * 1. `import('sucrase')` — works for ESM consumers who installed the peer dep
 * 2. CDN import — works for IIFE consumers and when sucrase isn't installed
 * 3. Passthrough fallback — plain JS still works, TypeScript errors clearly
 */
export declare function loadTransform(): Promise<TransformFn>;
