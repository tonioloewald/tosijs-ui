import { ExampleContext, TransformFn } from './types';
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
