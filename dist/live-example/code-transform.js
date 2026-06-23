export const AsyncFunction = (async () => {
    /* placeholder */
}).constructor;
/**
 * Sanitize a context module key into a JS identifier used as the binding name
 * in rewritten imports and as the AsyncFunction parameter. Must be applied
 * consistently on both sides. e.g. 'tosijs-ui' -> 'tosijsui',
 * '@babylonjs/core' -> 'babylonjscore'.
 */
export function contextVarName(key) {
    return key.replace(/[^a-zA-Z0-9_$]/g, '');
}
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
export function rewriteImports(code, contextKeys) {
    let result = code;
    for (const moduleName of contextKeys) {
        const js = contextVarName(moduleName);
        const m = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // import { a, b } from 'mod'
        result = result.replace(new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'${m}'`, 'g'), (_, names) => `const { ${names.replace(/\s+/g, ' ').trim()} } = ${js}`);
        // import * as X from 'mod'
        result = result.replace(new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s+from\\s*'${m}'`, 'g'), (_, name) => `const ${name} = ${js}`);
        // import X from 'mod'  (default)
        result = result.replace(new RegExp(`import\\s+(\\w+)\\s+from\\s*'${m}'`, 'g'), (_, name) => `const ${name} = ${js}`);
    }
    // Anything still a static import is unsupported — fail loudly with the line.
    const leftover = result.match(/^\s*import\s+['"{*\w][^\n]*/m);
    if (leftover) {
        throw new Error(`live example: unsupported import \`${leftover[0].trim()}\` — only imports ` +
            `from the example context (${contextKeys.join(', ')}) are supported, in ` +
            `{ named }, * as ns, or default form.`);
    }
    return result;
}
/**
 * Execute code as an async function with injected context
 */
export async function executeCode(code, context, transform) {
    const rewrittenCode = rewriteImports(code, Object.keys(context));
    const transformedCode = transform(rewrittenCode, {
        transforms: ['typescript'],
    }).code;
    const contextKeys = Object.keys(context).map(contextVarName);
    const contextValues = Object.values(context);
    // @ts-expect-error AsyncFunction constructor typing
    const func = new AsyncFunction(...contextKeys, transformedCode);
    await func(...contextValues);
}
// tjs-lang/lang is the TS-compiler-free entry (the TypeScript path lives behind
// tjs-lang/lang/from-ts and is not loaded here). The `+esm` form is required:
// the prebuilt bundle imports `acorn`/`tosijs-schema`, which jsdelivr's esm
// build resolves (a raw file load would fail on those bare imports). Pinned to
// match the dev dep.
const TJS_CDN = 'https://cdn.jsdelivr.net/npm/tjs-lang@0.8.2/lang/+esm';
async function loadTjs() {
    // Installed peer (ESM consumers / dev build)
    try {
        const { tjs } = (await import('tjs-lang/lang'));
        if (typeof tjs === 'function')
            return tjs;
    }
    catch {
        // not installed — try CDN
    }
    // CDN (IIFE consumers, or when tjs-lang isn't installed)
    try {
        const { tjs } = (await import(/* webpackIgnore: true */ TJS_CDN));
        if (typeof tjs === 'function')
            return tjs;
    }
    catch {
        // unavailable — fall through to degraded mode
    }
    return null;
}
// Load tjs once per page, not once per example. refresh() runs on every render
// (and renders fire repeatedly while tests run), so a per-call import + parse
// would re-pay tjs's cost each time and make every preview swap visibly lag —
// the engine load is memoized and transform output is cached by source.
let tjsOnce;
const resultCache = new Map();
let warnedNoTjs = false;
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
export async function loadTransform() {
    const tjs = await (tjsOnce ??= loadTjs());
    if (!tjs && !warnedNoTjs) {
        warnedNoTjs = true;
        console.warn('tjs-lang not available — live examples run as raw JavaScript ' +
            '(TypeScript examples will not transpile). Install with: npm install tjs-lang');
    }
    return (code) => {
        const cached = resultCache.get(code);
        if (cached)
            return cached;
        // runTests:false — examples must not run tjs inline tests at transpile time
        // (the default throws on failure, which would break the example render).
        const result = tjs
            ? { code: tjs(code, { dialect: 'js', runTests: false }).code }
            : { code };
        resultCache.set(code, result);
        return result;
    };
}
