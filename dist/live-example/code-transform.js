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
const OPEN = '([{';
const CLOSE = ')]}';
/** Index of the first `ch` at bracket depth 0, or -1. */
function indexAtDepth0(src, ch) {
    let depth = 0;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (OPEN.includes(c))
            depth++;
        else if (CLOSE.includes(c))
            depth--;
        else if (c === ch && depth === 0) {
            if (ch === '=') {
                // Only a bare assignment counts — skip ==, =>, <=, >=, !=.
                const next = src[i + 1];
                const prev = src[i - 1];
                if (next === '=' || next === '>' || (prev && '=!<>'.includes(prev)))
                    continue;
            }
            return i;
        }
    }
    return -1;
}
/** Split on `,` at bracket depth 0, so nested commas (`{ a: { b, c } }`) don't split. */
function splitAtDepth0(src) {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (OPEN.includes(c))
            depth++;
        else if (CLOSE.includes(c))
            depth--;
        else if (c === ',' && depth === 0) {
            parts.push(src.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(src.slice(start));
    return parts.filter((p) => p.trim() !== '');
}
/**
 * Blank out the CONTENTS of strings, template literals, comments and regex literals,
 * preserving length and newlines so every index still lines up with the original.
 *
 * The scanner below counts brackets and matches `^const` over raw text, which made it
 * wrong in two ways that both failed silently:
 *
 *   const label = 'Items ('      → an unbalanced '(' inside a string ran the depth
 *                                  counter away, swallowing the REST OF THE FILE, so
 *                                  every later binding vanished from completions.
 *   `const in a template`        → matched at column 0 inside a template literal and
 *                                  yielded the name `in`, and the epilogue then emitted
 *                                  `try{__tosiScope.in=in}` — a PARSE error, which no
 *                                  try/catch can absorb, killing the whole example.
 *
 * Identifiers never live inside literals, so masking loses nothing we want.
 */
export function maskLiterals(code) {
    const out = code.split('');
    const blank = (from, to) => {
        for (let i = from; i < to && i < out.length; i++) {
            if (out[i] !== '\n')
                out[i] = ' ';
        }
    };
    // A `/` starts a regex (not division) only where a value can't precede it.
    const regexAllowedAfter = /[=(,:[!&|?{};+\-*%~^<>]$/;
    let i = 0;
    while (i < code.length) {
        const c = code[i];
        const next = code[i + 1];
        if (c === '/' && next === '/') {
            const end = code.indexOf('\n', i);
            blank(i, end === -1 ? code.length : end);
            i = end === -1 ? code.length : end;
        }
        else if (c === '/' && next === '*') {
            const end = code.indexOf('*/', i + 2);
            blank(i, end === -1 ? code.length : end + 2);
            i = end === -1 ? code.length : end + 2;
        }
        else if (c === "'" || c === '"') {
            let j = i + 1;
            while (j < code.length && code[j] !== c) {
                if (code[j] === '\\')
                    j++;
                if (code[j] === '\n')
                    break; // unterminated — don't run away
                j++;
            }
            blank(i + 1, j); // keep the quotes — see NB below
            i = j + 1;
        }
        else if (c === '`') {
            // Template literal: skip to the matching backtick, stepping over ${…} (which can
            // nest braces and contain more backticks).
            let j = i + 1;
            let braces = 0;
            while (j < code.length) {
                if (code[j] === '\\')
                    j += 2;
                else if (braces === 0 && code[j] === '`')
                    break;
                else if (code[j] === '$' && code[j + 1] === '{') {
                    braces++;
                    j += 2;
                }
                else if (braces > 0 && code[j] === '{') {
                    braces++;
                    j++;
                }
                else if (braces > 0 && code[j] === '}') {
                    braces--;
                    j++;
                }
                else
                    j++;
            }
            blank(i + 1, j); // keep the backticks
            i = j + 1;
        }
        else if (c === '/') {
            const before = code.slice(0, i).replace(/\s+$/, '');
            if (before === '' || regexAllowedAfter.test(before)) {
                let j = i + 1;
                let inClass = false;
                while (j < code.length) {
                    if (code[j] === '\\')
                        j++;
                    else if (code[j] === '[')
                        inClass = true;
                    else if (code[j] === ']')
                        inClass = false;
                    else if (code[j] === '/' && !inClass)
                        break;
                    else if (code[j] === '\n')
                        break; // unterminated — it was division after all
                    j++;
                }
                blank(i + 1, j); // keep the slashes
                i = j + 1;
            }
            else
                i++; // division
        }
        else
            i++;
    }
    return out.join('');
}
// Reserved words are identifier-SHAPED but can't be read as one: emitting
// `try{__tosiScope.in=in}` is a SyntaxError that no try/catch absorbs, and it takes the
// whole example down with it. Masking should already prevent these from being matched;
// this is the belt to that suspenders.
const RESERVED = new Set(('break case catch class const continue debugger default delete do else enum export ' +
    'extends false finally for function if import in instanceof new null return super ' +
    'switch this throw true try typeof var void while with yield let static implements ' +
    'interface package private protected public await').split(' '));
const isCapturableName = (name) => /^[A-Za-z_$][\w$]*$/.test(name) && !RESERVED.has(name);
/** Pull the bound identifiers out of one declaration's left-hand side. */
function patternNames(lhs) {
    lhs = lhs.trim();
    if (!lhs)
        return [];
    if (/^[{[]/.test(lhs)) {
        // Object/array destructuring. Split depth-0 commas (NOT a naive `split(',')`,
        // which shreds `{ a: { b, c } }`), then per element: drop a rest `...`, take the
        // TARGET of `key: target` (the target is what's bound, and may itself be a
        // pattern), drop any `= default`, and recurse into nested patterns.
        const names = [];
        for (let part of splitAtDepth0(lhs.slice(1, -1))) {
            part = part.trim().replace(/^\.\.\./, '');
            if (!part)
                continue;
            const colon = indexAtDepth0(part, ':');
            if (colon !== -1)
                part = part.slice(colon + 1).trim();
            const eq = indexAtDepth0(part, '=');
            if (eq !== -1)
                part = part.slice(0, eq).trim();
            if (/^[{[]/.test(part)) {
                names.push(...patternNames(part));
            }
            else {
                const m = part.match(/^[A-Za-z_$][\w$]*/);
                if (m)
                    names.push(m[0]);
            }
        }
        return names;
    }
    const m = lhs.match(/^[A-Za-z_$][\w$]*/);
    return m ? [m[0]] : [];
}
/**
 * Read a `const/let/var` declaration starting at `from` — across newlines, so a
 * wrapped destructure (`const {\n  app,\n} = …`) is captured whole. Ends at a depth-0
 * `;`, or at a newline where the statement is plainly complete (the previous
 * non-space char isn't an operator/comma continuing it). Anything unbalanced keeps
 * reading, because depth > 0.
 */
function readDeclaration(code, from) {
    let depth = 0;
    let i = from;
    for (; i < code.length; i++) {
        const c = code[i];
        if (OPEN.includes(c))
            depth++;
        else if (CLOSE.includes(c))
            depth--;
        else if (depth === 0 && c === ';')
            break;
        else if (depth === 0 && c === '\n') {
            const soFar = code.slice(from, i).trimEnd();
            const last = soFar[soFar.length - 1];
            if (last !== undefined && !',=+-*/%&|?:<>!~^'.includes(last))
                break;
        }
    }
    // FAIL SAFE. Running to EOF with depth > 0 means the brackets never balanced, and
    // consuming the tail would silently drop every binding after this point (the old
    // behaviour, and the whole bug). Masking should make this unreachable; if it happens
    // anyway, give up on THIS declaration only — take the first line and let the scan
    // resume — rather than swallowing the rest of the example.
    if (i >= code.length && depth > 0) {
        const eol = code.indexOf('\n', from);
        return code.slice(from, eol === -1 ? code.length : eol);
    }
    return code.slice(from, i);
}
/**
 * Best-effort list of the identifiers a snippet binds at the TOP level (column 0, so
 * genuinely function-scope, not inside a block). Handles `const/let/var` — including
 * MULTI-LINE destructuring, MULTIPLE declarators (`const a = 1, b = 2`), nested
 * patterns, aliases, defaults and rest — plus `function`/`class` declarations.
 *
 * This is a scanner, not a parse. tjs-lang already owns an acorn-based
 * `collectScopeSymbols()` that does this properly, but it has no public export
 * (filed upstream); when it lands, drive this off it. Meanwhile imperfect is safe:
 * the capture epilogue guards every name individually, so an over- or under-match
 * degrades completions rather than breaking the example.
 */
export function extractTopLevelBindingNames(code) {
    // Scan MASKED source: literals and comments are blanked (same length, same newlines),
    // so a stray bracket or a `const` inside a string can't derail the scan. Indices still
    // line up with `code`, and identifiers only ever live outside literals.
    const masked = maskLiterals(code);
    const names = new Set();
    const declRe = /^(?:export\s+)?(const|let|var|function\*?|class)\s+/gm;
    let m;
    while ((m = declRe.exec(masked)) !== null) {
        const kind = m[1];
        const from = m.index + m[0].length;
        if (kind === 'class' || kind.startsWith('function')) {
            const id = masked.slice(from).match(/^[A-Za-z_$][\w$]*/);
            if (id)
                names.add(id[0]);
            continue;
        }
        const decl = readDeclaration(masked, from);
        // Each depth-0 comma starts another declarator (`const a = 1, b = 2`).
        for (const declarator of splitAtDepth0(decl)) {
            const eq = indexAtDepth0(declarator, '=');
            const lhs = eq === -1 ? declarator : declarator.slice(0, eq);
            for (const n of patternNames(lhs))
                names.add(n);
        }
        // Don't rescan inside the declaration we just consumed.
        declRe.lastIndex = from + decl.length;
    }
    return [...names].filter(isCapturableName);
}
/**
 * Build an epilogue that captures the values of `names` (as they stand at the end
 * of a run) into `captureVar(scopeObject)`. Each binding is read behind its own
 * try/catch so a stale/over-matched name can't abort the whole capture, and the
 * whole thing is a trailing block so it never shadows user code. Returns '' when
 * there's nothing to capture.
 */
export function buildScopeCapture(names, captureVar) {
    // Filter HERE too, not just at extraction. Every other guard in this file is a
    // runtime try/catch, but an unreadable name (`in`, `class`, `2bad`) makes the
    // epilogue itself unparseable — and a SyntaxError takes the whole example down
    // before a single line of it runs. This is the last line of defence, so it must not
    // trust its caller.
    const capturable = names.filter(isCapturableName);
    if (capturable.length === 0)
        return '';
    const assigns = capturable
        .map((n) => `try{__tosiScope.${n}=${n}}catch(_e){}`)
        .join('');
    return `\n;{const __tosiScope={};${assigns}${captureVar}(__tosiScope)}`;
}
/**
 * Execute code as an async function with injected context
 */
export async function executeCode(code, context, transform) {
    const rewrittenCode = rewriteImports(code, Object.keys(context));
    const transformedCode = (await transform(rewrittenCode, {
        transforms: ['typescript'],
    })).code;
    const contextKeys = Object.keys(context).map(contextVarName);
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
// example actually transforms. Pinned to match the dev dep.
const TJS_VERSION = '0.9.1';
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
