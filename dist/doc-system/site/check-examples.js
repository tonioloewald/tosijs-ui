/*
Build-time transpile check for live examples.

Every executable code block in the corpus (`js` / `tjs` / `ts` / `test`) is put
through the SAME front half of the runtime pipeline the live-example component
uses — `rewriteImports` → the tjs-lang transform → `new AsyncFunction(...)` — so a
block that can't build is caught *at authoring time*, on every page, instead of
silently rendering an error only when someone opens that page. The two outcomes
are graded differently (this is the point):

  - a real **syntax / transpile error** is broken code → a `problem` that FAILS
    the build;
  - an **unsupported import** (a non-context package, no import-resolver) is fine
    code the doc environment just can't run → a `warning`: the block is treated as
    display-only and the build survives. It's almost always illustrative code that
    should have been tagged `typescript` instead of `ts` — a mistagging shouldn't
    take the whole build down with it.

`html` / `css` and display-only languages (`typescript`, `json`, …) are not
executed, so they're skipped.

Build-time only (bun). Never import from browser code.
*/
import { marked } from 'marked';
import { rewriteImports, AsyncFunction, loadTransform, UnsupportedImportError, } from '../../live-example/code-transform.js';
// The default live-example context (matches the IIFE globals the pages provide).
// A project that sets a custom `context` on its <tosi-doc-system> can pass its
// own keys; these are the tosijs-ui defaults.
const DEFAULT_CONTEXT_KEYS = ['tosijs', 'tosijs-ui'];
const EXECUTABLE = new Set(['js', 'tjs', 'ts', 'test']);
// ONE transpiler for the whole PROCESS, not one per corpus and certainly not one per
// example. It's stateless, and it's a native object that strands ~40KB of RSS per
// CONSTRUCTION — invisible to the JS heap, so nothing GCs it (same family as the
// Bun.build arena leak, oven-sh/bun#34053).
//
// This lived inside checkExamples() as a `let` — which made the comment above it true
// of a single call and false of the process: checkExamples runs once per dev rebuild,
// so it was reconstructed thousands of times over a days-long watch session. Module
// scope is the difference between "once" and "once per rebuild". Lazily created, so a
// corpus with no `ts` examples never makes one at all.
let tsTranspiler;
/** The bare dialect from a fence info string ('js#my-id' → 'js'); '' if none. */
function dialectOf(info) {
    return (info ?? '').match(/^[a-z]+/)?.[0] ?? '';
}
/** Collect every fenced code block in a doc (recursing into lists/quotes). */
function collectCodeTokens(text) {
    const out = [];
    const walk = (tokens) => {
        for (const t of tokens) {
            if (t.type === 'code')
                out.push({ lang: dialectOf(t.lang), text: t.text });
            if (Array.isArray(t.tokens))
                walk(t.tokens);
            if (Array.isArray(t.items))
                walk(t.items); // list items
        }
    };
    walk(marked.lexer(text));
    return out;
}
/**
 * Transpile-check every executable block in the corpus. Returns the problems and
 * the `tjs` bakes (which it computes anyway while checking — no double transpile).
 */
export async function checkExamples(docs, opts = {}) {
    /*
    ADDITIVE, not replacing.
  
    The obvious call is `contextKeys: ['my-lib']`, and replacing would silently drop `tosijs` /
    `tosijs-ui` — demoting every framework example on the site to display-only, with a GREEN
    build, because an unresolvable import warns rather than fails. The failure mode of this
    option is exactly the failure mode it exists to prevent.
    */
    const contextKeys = [
        ...DEFAULT_CONTEXT_KEYS,
        ...(opts.contextKeys ?? []),
    ].filter((key, i, all) => all.indexOf(key) === i);
    const problems = [];
    const warnings = [];
    const bakes = new Map();
    for (const doc of docs) {
        for (const block of collectCodeTokens(doc.text)) {
            if (!EXECUTABLE.has(block.lang))
                continue;
            // `test` blocks are conventional JS/TS, transpiled as plain js.
            const dialect = block.lang === 'test' ? 'js' : block.lang;
            try {
                const rewritten = rewriteImports(block.text, contextKeys, opts.importPrefix);
                let js;
                if (dialect === 'ts') {
                    // Use bun's own transpiler — network-free (the runtime `ts` path
                    // fetches the TypeScript compiler from a CDN, which can't run here).
                    // We only need to validate that the source builds, not reproduce tjs
                    // lowering exactly.
                    tsTranspiler ??= new Bun.Transpiler({ loader: 'ts' });
                    js = tsTranspiler.transformSync(rewritten);
                }
                else if (dialect === 'tjs') {
                    const transform = await loadTransform('tjs');
                    js = (await transform(rewritten, { transforms: ['typescript'] })).code;
                }
                else {
                    js = rewritten; // `js` / `test` are already JS
                }
                // Syntax-validate the way the component does before running it.
                new AsyncFunction(js);
                // Bake only tjs: build and runtime share the SAME tjs transform, so the
                // baked JS is byte-identical to what the page produces at runtime. (`ts`
                // is transpiled here with bun but at runtime by the CDN TS compiler, so it
                // stays on the runtime path — see self-contained-examples-plan.md.)
                if (dialect === 'tjs') {
                    let docBakes = bakes.get(doc.filename);
                    if (!docBakes)
                        bakes.set(doc.filename, (docBakes = new Map()));
                    docBakes.set(block.text, { dialect: 'tjs', js });
                }
            }
            catch (err) {
                const entry = {
                    filename: doc.filename,
                    title: doc.title,
                    lang: block.lang,
                    error: err.message || String(err),
                    snippet: block.text.split('\n').slice(0, 3).join('\n'),
                };
                // An unsupported import means the block references deps the environment
                // can't provide — not broken code. Warn (display-only), don't fail the
                // build. A real syntax/transpile error is a genuine problem.
                if (err instanceof UnsupportedImportError)
                    warnings.push(entry);
                else
                    problems.push(entry);
            }
        }
    }
    return { problems, warnings, bakes };
}
/** Format problems for a build log. */
export function formatExampleProblems(problems) {
    return problems
        .map((p) => `  ✗ ${p.filename} (${p.lang}) — ${p.title}\n` +
        `    ${p.error}\n` +
        p.snippet
            .split('\n')
            .map((l) => `      | ${l}`)
            .join('\n'))
        .join('\n\n');
}
