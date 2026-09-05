export const AsyncFunction = (async () => {
    /* placeholder */
}).constructor;
/**
 * Thrown by `rewriteImports` when an example has a static import the environment
 * can't satisfy (a non-context package with no import-resolver). This is NOT a code
 * defect — the code is fine, the doc environment just doesn't provide the dependency
 * — so the build check treats it as a *warning* (the block is display-only) rather
 * than a fatal error, and can tell it apart from a real syntax/transpile error.
 */
export class UnsupportedImportError extends Error {
    statement;
    constructor(message, 
    /** The offending `import …` statement. */
    statement) {
        super(message);
        this.statement = statement;
        this.name = 'UnsupportedImportError';
    }
}
/**
 * Sanitize a context module key into a JS identifier used as the binding name in rewritten
 * imports and as the AsyncFunction parameter. Must be applied consistently on both sides —
 * e.g. `'tosijs-ui'` -> `tosijsui`, `'@babylonjs/core'` -> `babylonjscore`.
 *
 * THE ONE COPY. `test-harness.ts` carried its own `key.replace(/-/g, '')`, which stripped
 * hyphens and left slashes and `@` — so a perfectly ordinary specifier like
 * `'tosijs-3d/demo-utils'` became the parameter name `tosijs3d/demoutils` and every test in
 * that file died with V8's "Arg string terminates parameters early" (tosijs-ui#111/#112).
 * The examples on the same page rendered fine, because THEY used this function. Two copies of
 * one rule, and only one of them maintained.
 *
 * A context key is an import specifier — a string. Nothing about `'@scope/pkg'` suggests it
 * must also be a valid identifier, so this makes one rather than demanding one.
 */
export function contextVarName(key) {
    const stripped = key.replace(/[^a-zA-Z0-9_$]/g, '');
    /*
    A leading digit is still not an identifier, and `'3d-tools'` is a name someone will pick.
    Reserved words are the same problem wearing a different hat — `'class'`, `'new'`, `'import'`
    are all plausible package names. Prefixing is enough for both, and keeps the result readable
    in a stack trace, which a hash would not.
    */
    if (!stripped)
        return '_ctx';
    if (/^[0-9]/.test(stripped) || RESERVED.has(stripped))
        return `_${stripped}`;
    return stripped;
}
/*
Parameter names, not general JS: only words that cannot appear in a parameter list matter here.
`await` is included because a doc test body is async.
*/
const RESERVED = new Set(('break case catch class const continue debugger default delete do else enum export extends ' +
    'false finally for function if implements import in instanceof interface let new null ' +
    'package private protected public return static super switch this throw true try typeof ' +
    'var void while with yield await').split(' '));
/**
 * Turn context keys into a parameter list a Function constructor will accept.
 *
 * Sanitizing each key independently is not sufficient: `'tosijs-3d'` and `'tosijs/3d'` both
 * reduce to `tosijs3d`, and duplicate parameter names are a SyntaxError in a strict body — which
 * a doc test is.
 *
 * A collision THROWS, and deliberately does not quietly rename. `rewriteImports` derives its
 * binding from the same rule, so a suffixed parameter (`tosijs3d2`) would leave one of the two
 * modules bound to a name no rewritten import ever references — importing from it would return
 * undefined, at runtime, with nothing to read. Two specifiers that reduce to one identifier is a
 * genuine ambiguity in the configuration, and the only useful thing to do with an ambiguity is
 * name it. The message is the whole point: "Arg string terminates parameters early" is what this
 * replaces.
 */
export function contextParamNames(keys) {
    const byName = new Map();
    return keys.map((key) => {
        const name = contextVarName(key);
        const already = byName.get(name);
        if (already !== undefined) {
            throw new Error(`example context keys ${JSON.stringify(already)} and ${JSON.stringify(key)} both reduce to the identifier "${name}", so an import from one of them could not be ` +
                `told from the other. Rename one of the context keys.`);
        }
        byName.set(name, key);
        return name;
    });
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
/**
 * Turn the import specifiers a `X as Y` clause carries into destructuring pairs:
 * `a, b as c` → `a, b: c`.
 */
function destructureClause(names) {
    return names
        .split(',')
        .map((n) => {
        const as = n.trim().match(/^(\w+)\s+as\s+(\w+)$/);
        return as ? `${as[1]}: ${as[2]}` : n.trim();
    })
        .filter(Boolean)
        .join(', ');
}
/**
 * Rewrite the import statements the context DIDN'T inject into dynamic imports the
 * import-resolver service worker can fulfil — a bare specifier `pkg` becomes
 * `await import('<prefix>pkg')`, a `./x` / `https://…` specifier a direct dynamic
 * import. This is what lets a live example pull real npm code from anywhere; it only
 * runs when the resolver is enabled (a `prefix` is known). See import-resolver-plan.md.
 */
function rewriteBareImportsToDynamic(code, prefix) {
    const urlFor = (spec) => /^(\.|\/|https?:)/.test(spec) ? spec : prefix + spec;
    return (code
        // import <clause> from '<spec>'   ({ a, b } | * as X | X | X, { a })
        // NB the trailing `[ \t]*;?` must NOT eat the newline, or the next line glues on.
        .replace(/import\s+([^;'"]+?)\s+from\s+(['"])([^'"]+)\2[ \t]*;?/g, (match, clause, q, spec) => {
        const imp = `await import(${q}${urlFor(spec)}${q})`;
        const c = clause.trim();
        let m;
        if ((m = c.match(/^\{([^}]*)\}$/)))
            return `const { ${destructureClause(m[1])} } = ${imp}`;
        if ((m = c.match(/^\*\s+as\s+(\w+)$/)))
            return `const ${m[1]} = ${imp}`;
        if ((m = c.match(/^(\w+)$/)))
            return `const ${m[1]} = (${imp}).default`;
        if ((m = c.match(/^(\w+)\s*,\s*\{([^}]*)\}$/)))
            return `const { default: ${m[1]}, ${destructureClause(m[2])} } = ${imp}`;
        return match; // unhandled form — left to fail loudly below
    })
        // side-effect only: import '<spec>'
        .replace(/import\s+(['"])([^'"]+)\1[ \t]*;?/g, (_m, q, spec) => `await import(${q}${urlFor(spec)}${q})`));
}
/** The import-resolver prefix, if the SW was registered on this page (runtime). */
function resolverPrefix() {
    return globalThis.__TOSI_IMPORT_RESOLVER?.prefix;
}
export function rewriteImports(code, contextKeys, 
// The import-resolver prefix (e.g. '/lib/'). When set — or when the SW is registered
// on the page — non-context imports become dynamic imports the worker resolves.
// Omitted + no SW → the old behavior: a non-context import is unsupported.
importPrefix = resolverPrefix()) {
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
    // With the resolver on, route the imports the context didn't inject to the SW.
    if (importPrefix) {
        result = rewriteBareImportsToDynamic(result, importPrefix);
    }
    // Anything still a static import is unsupported — fail loudly with the line.
    const leftover = result.match(/^\s*import\s+['"{*\w][^\n]*/m);
    if (leftover) {
        const statement = leftover[0].trim();
        throw new UnsupportedImportError(`live example: unsupported import \`${statement}\` — imports ` +
            `from the example context (${contextKeys.join(', ')}) are supported in ` +
            `{ named }, * as ns, or default form` +
            (importPrefix
                ? `, and other packages resolve via the import-resolver.`
                : ` (enable importResolver to import other packages).`), statement);
    }
    return result;
}
/**
 * Execute code as an async function with injected context
 */
export async function executeCode(code, context, transform) {
    const rewrittenCode = rewriteImports(code, Object.keys(context));
    const transformedCode = (await transform(rewrittenCode, {
        transforms: ['typescript'],
    })).code;
    const contextKeys = contextParamNames(Object.keys(context));
    const contextValues = Object.values(context);
    // @ts-expect-error AsyncFunction constructor typing
    const func = new AsyncFunction(...contextKeys, transformedCode);
    await func(...contextValues);
}
// tjs-lang/browser is a SELF-CONTAINED transpiler bundle (acorn/tosijs-schema
// inlined, zero bare imports), so it loads as a raw CDN file — no `+esm` rewrite
// needed. The TypeScript path lives behind tjs-lang/browser/from-ts (also
// self-contained) and is loaded only for `ts` examples; from-ts in turn fetches
// the TypeScript compiler lazily at runtime, so tsc is never pulled in until a TS
// example actually transforms.
//
// PINNED TO MATCH THE DEV DEP, and the two live in different files — this constant and
// package.json's exact `tjs-lang` entry. `code-transform.test.ts` asserts they agree, because
// a CDN version that drifts from the installed one is invisible until it isn't: the tests run
// against the local bundle and the published site runs against whatever this string says.
// Flagged by tjs-lang in tosijs-ui#135, alongside noticing we had sat on a deprecated 0.13.4.
export const TJS_VERSION = '0.13.11';
// Where to fetch a tjs-lang browser bundle from, in priority order:
//  1. SAME-ORIGIN — the doc-site build copies the bundles next to the iife and
//     sets `__TJS_LOCAL_BASE`, so the transpiler ships in lockstep with the page,
//     works offline, and is immune to CDN propagation lag. Preferred when present.
//  2. CDN chain (jsdelivr → unpkg → esm.sh) — for IIFE consumers who don't serve
//     it same-origin. A freshly-published version 404s on one CDN until it caches
//     it (minutes–hours) and any one can blip, so we try several. The module-cache
//     service worker caches all three hosts.
function bundleUrls(file) {
    const localBase = globalThis
        .__TJS_LOCAL_BASE;
    return [
        ...(typeof localBase === 'string' ? [`${localBase}${file}`] : []),
        `https://cdn.jsdelivr.net/npm/tjs-lang@${TJS_VERSION}/dist/${file}`,
        `https://unpkg.com/tjs-lang@${TJS_VERSION}/dist/${file}`,
        `https://esm.sh/tjs-lang@${TJS_VERSION}/dist/${file}`,
    ];
}
/** Try each URL in turn; return the first module that loads, else null. */
async function importFirstAvailable(urls) {
    for (const url of urls) {
        try {
            // variable specifier → bundlers leave it as a runtime import (external)
            const m = await import(/* webpackIgnore: true */ /* @vite-ignore */ url);
            if (m)
                return m;
        }
        catch {
            // try the next source
        }
    }
    return null;
}
async function loadTjs() {
    // Installed peer (ESM consumers / dev build) — static specifier so bundlers
    // resolve it to the local package.
    try {
        const { tjs } = (await import('tjs-lang/browser'));
        if (typeof tjs === 'function')
            return tjs;
    }
    catch {
        // not installed — try same-origin / CDN
    }
    const m = await importFirstAvailable(bundleUrls('tjs-browser.js'));
    if (m && typeof m.tjs === 'function')
        return m.tjs;
    return null;
}
let testApiOnce;
async function loadTjsTestApiImpl() {
    const sources = [
        () => import('tjs-lang/browser'),
        () => importFirstAvailable(bundleUrls('tjs-browser.js')),
    ];
    for (const load of sources) {
        try {
            const m = (await load());
            if (m &&
                typeof m.extractTests === 'function' &&
                typeof m.testUtils === 'string') {
                return { extractTests: m.extractTests, testUtils: m.testUtils };
            }
        }
        catch {
            // try next source
        }
    }
    return null;
}
/** Load the tjs inline-test API (memoized). null if tjs-lang is unavailable. */
export function loadTjsTestApi() {
    return (testApiOnce ??= loadTjsTestApiImpl());
}
// from-ts pulls in the TypeScript compiler, so it's loaded lazily and only when a
// `ts` example is actually transformed — never for `js`/`tjs` pages.
async function loadFromTs() {
    try {
        const { fromTS } = (await import('tjs-lang/browser/from-ts'));
        if (typeof fromTS === 'function')
            return fromTS;
    }
    catch {
        // not installed — try same-origin / CDN
    }
    const m = await importFirstAvailable(bundleUrls('tjs-browser-from-ts.js'));
    if (m && typeof m.fromTS === 'function')
        return m.fromTS;
    return null;
}
// Load tjs once per page, not once per example. refresh() runs on every render
// (and renders fire repeatedly while tests run), so a per-call import + parse
// would re-pay tjs's cost each time and make every preview swap visibly lag —
// the engine load is memoized and transform output is cached by dialect+source.
let tjsOnce;
let fromTsOnce;
/**
 * Memoized transform output, keyed by dialect + full source text.
 *
 * BOUNDED, and it has to be. The key contains the whole source, so a *changed*
 * example is a new entry and the superseded one is never looked up again — the cache
 * only ever grows, one entry per version of every example ever transformed. On a page
 * you merely read, that is a handful of entries. But this module is also imported by
 * the doc-site BUILD (check-examples), and — more to the point — the doc system is an
 * *authoring* system: in an edit-in-place session, every keystroke-to-save produces a
 * fresh source string, so an unbounded map grows for as long as the page is open,
 * holding both the source and its transpiled output forever.
 *
 * A plain insertion-ordered eviction is enough here: re-transforming a cold example
 * costs a few ms, and the working set is "the examples on this page".
 */
const RESULT_CACHE_MAX = 256;
const resultCache = new Map();
const cacheResult = (key, result) => {
    if (resultCache.size >= RESULT_CACHE_MAX) {
        // Map preserves insertion order, so the first key is the oldest.
        const oldest = resultCache.keys().next().value;
        if (oldest !== undefined)
            resultCache.delete(oldest);
    }
    resultCache.set(key, result);
};
let warnedNoTjs = false;
let warnedNoFromTs = false;
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
export async function loadTransform(dialect = 'js') {
    // `js` needs no transpiler. tjs's `js` dialect leaves vanilla JS untouched, and
    // the build check guarantees js/`test` blocks ARE vanilla JS (a TS-typed one
    // fails `new AsyncFunction` at build). So identity is behaviorally exact — and it
    // keeps the tjs bundle off the first-paint path for the common all-`js`-examples
    // page. `tjs`/`ts` still load it. See self-contained-examples-plan.md.
    if (dialect === 'js')
        return (code) => ({ code });
    const tjs = await (tjsOnce ??= loadTjs());
    if (!tjs && !warnedNoTjs) {
        warnedNoTjs = true;
        console.warn('tjs-lang not available — live examples run as raw JavaScript ' +
            '(tjs/TypeScript examples will not transpile). Install with: npm install tjs-lang');
    }
    const fromTS = dialect === 'ts' ? await (fromTsOnce ??= loadFromTs()) : null;
    if (dialect === 'ts' && !fromTS && !warnedNoFromTs) {
        warnedNoFromTs = true;
        console.warn('tjs-lang/browser/from-ts not available — `ts` examples run as raw JavaScript.');
    }
    return (code) => {
        const cacheKey = `${dialect}\0${code}`;
        const cached = resultCache.get(cacheKey);
        if (cached)
            return cached;
        // runTests:false — examples must not run tjs inline tests at transpile time
        // (the default throws on failure, which would break the example render).
        if (!tjs) {
            const result = { code };
            cacheResult(cacheKey, result);
            return result;
        }
        if (dialect === 'ts') {
            // async: fromTS lazy-loads the TypeScript compiler on first use.
            return (async () => {
                const tjsSource = fromTS
                    ? (await fromTS(code, { emitTJS: true })).code
                    : code;
                const result = {
                    code: tjs(tjsSource, { dialect: 'tjs', runTests: false }).code,
                };
                cacheResult(cacheKey, result);
                return result;
            })();
        }
        const result = { code: tjs(code, { dialect, runTests: false }).code };
        cacheResult(cacheKey, result);
        return result;
    };
}
