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
 * Load sucrase transform function
 */
export declare function loadTransform(): Promise<TransformFn>;
