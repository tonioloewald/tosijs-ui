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
 * Load the live-example transform.
 *
 * tjs-lang is the engine: `js` blocks transpile with `dialect: 'js'`, which
 * leaves vanilla JavaScript untouched (no footgun rewriting) — so swapping in
 * tjs is behavior-neutral for plain-JS examples, while giving descriptive
 * transpile errors and a path to real TS support.
 *
 * Degraded mode: if tjs-lang can't be loaded, plain JS still runs unchanged
 * (`dialect: 'js'` is a no-op on it), so we just pass the code through.
 */
export declare function loadTransform(): Promise<TransformFn>;
