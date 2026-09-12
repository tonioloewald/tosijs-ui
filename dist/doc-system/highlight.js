/*
Syntax highlighting for STATIC code blocks — the ones that are not live examples.

Before this, display-only code was highlighted nowhere: the pre-rendered page emitted a bare
`<pre><code class="language-ts">`, the client never touched it, and the ePub stripped the
language class entirely. A doc system that publishes a book had no highlighting in the book.

Two properties shape the design.

**It runs at BUILD time, not only in the browser.** A component that highlights on hydration
reaches neither the ePub (readers may not run JS at all), nor print, nor a no-JS reader, nor a
search engine — which is most of where static code is read. So the primary path is a pass over
rendered HTML during the build, emitting `<span class="token …">` that needs only CSS.

**The client pass SKIPS already-highlighted blocks.** `renderDocMarkdown` is deliberately the
one renderer for build and client so the static page hydrates byte-identically; highlighting
as a separate DOM pass keeps that true. The build's HTML already contains the tokens, the
client sees them and leaves them alone, and only client-side navigation to a freshly rendered
page does any work.

Prism rather than reusing CodeMirror, which we already ship: #120 is an open issue about
CodeMirror being in every IIFE at 94% of the bundle, and routing static highlighting through
it would deepen exactly the dependency that issue wants to escape. Prism's core is ~2kb and
grammars load per language, which also covers the languages a prose or book corpus uses and
CodeMirror does not bundle (shell, python, rust, json, yaml, diff).
*/
import { isLiveFence } from './example-policy.js';
/** Languages Prism has built in — no grammar file to load. */
const BUILTIN = new Set([
    'markup',
    'html',
    'xml',
    'css',
    'clike',
    'javascript',
    'js',
]);
/**
 * Fence language → Prism grammar name. Prism's names differ from the ones authors write,
 * and an unmapped alias silently produces no highlighting rather than an error — which is
 * the failure mode this whole codebase keeps finding, so the map is explicit.
 */
const ALIASES = {
    js: 'javascript',
    ts: 'typescript',
    tjs: 'javascript', // tjs is JS with type annotations in default values
    jsx: 'jsx',
    tsx: 'tsx',
    html: 'markup',
    xml: 'markup',
    svg: 'markup',
    vue: 'markup',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    console: 'bash',
    yml: 'yaml',
    md: 'markdown',
    rs: 'rust',
    py: 'python',
    rb: 'ruby',
    golang: 'go',
    'c++': 'cpp',
    cs: 'csharp',
    scss: 'scss',
    less: 'less',
    json5: 'json5',
    dockerfile: 'docker',
    make: 'makefile',
    test: 'javascript', // doc-test blocks are JS
};
/*
Grammars supplied by a consumer, keyed by FENCE language.

The alias table below maps fence names onto Prism's built-in grammars, and it is the wrong
seam for a language that ships its own. tjs-lang is generating a Prism definition for TJS from
the same source that already emits their TextMate grammars (tosijs-ui#155), and hardcoding it
here would put their grammar behind our release cadence.

Registered grammars WIN over the alias table, and are used by the build-time pass as well as
the browser — so a registered language reaches the pre-rendered page, the ePub and print, not
just a hydrated tab.

  import { registerGrammar } from 'tosijs-ui/site'
  import { tjsGrammar } from 'tjs-lang/prism'
  registerGrammar('tjs', tjsGrammar)

Why this matters more than usual: a wrong token colour is cosmetic on the web and permanent in
a printed book. TJS's colon examples (`greet(name: 'Alice')`) are VALUES, and rendering them
with TypeScript's type colour makes the page assert the exact misreading the document exists to
correct.
*/
const registered = new Map();
/**
 * Supply a Prism grammar for a fence language. Overrides the built-in alias mapping.
 * Call before the first highlight — at module scope in a bundle entry, or in `prebuild`.
 */
export function registerGrammar(fenceLang, grammar) {
    registered.set(fenceLang.toLowerCase(), grammar);
}
/** Registered grammars, for tests and diagnostics. */
export function registeredGrammars() {
    return [...registered.keys()];
}
export function grammarFor(fenceLang) {
    const l = fenceLang.toLowerCase();
    return ALIASES[l] ?? l;
}
let prism;
let warnedNoPrism = false;
/*
Memoize the PROMISE, not an "attempted" flag.

The first version kept a `Set` of grammars it had started loading and returned false on a
second call — so two concurrent callers raced: the first began the import, the second saw the
grammar already in the set and returned false for a language that was loading perfectly well.
Observed exactly that, from a component and a test asking for `rust` at the same moment, and
the symptom is a code block that stays plain with no error anywhere to find.

Caching the promise makes concurrent callers await the same load and get the same answer,
which is what "ensure" should have meant.
*/
const grammarLoads = new Map();
/**
 * Load Prism and the grammar for `lang`. Returns false when the grammar does not exist —
 * an unknown language is not an error, it is a code block that stays plain.
 *
 * Grammar files are loaded by dynamic import so a bundler can code-split them and a build
 * only pays for the languages its corpus actually uses.
 */
export async function ensureGrammar(lang) {
    const grammar = grammarFor(lang);
    if (!prism) {
        /*
        `Prism.manual = true` BEFORE the import, or Prism highlights the entire document by
        itself on load.
    
        That is its documented default and it is wrong for us twice over: it would walk every
        `<pre><code>` on the page including the ones that are live-example SOURCE, and it stamps
        its own `class` and `tabindex` on the `<pre>` — observed rewriting an element this module
        had deliberately left alone. Every pass here is deliberate and scoped; none of it should
        happen as a side effect of an import.
    
        Prism reads the flag off `window.Prism` at load time, which is why this is a global
        assignment rather than a property set afterwards — by then it has already run.
        */
        for (const scope of [
            globalThis,
            typeof window !== 'undefined' ? window : undefined,
        ]) {
            /*
            BOTH globals, because they are not always the same object — under happy-dom
            `globalThis !== window`, and Prism reads the flag off ITS `_self`, which resolves to
            `window` there. Setting only `globalThis` looked correct and silently did nothing: the
            DOM still got walked, `<pre>` still gained `class` and `tabindex`, and the flag read
            back as `undefined` after import.
            */
            if (!scope)
                continue;
            const sc = scope;
            sc.Prism = { ...(sc.Prism ?? {}), manual: true };
        }
        try {
            prism = (await import('prismjs'))
                .default;
        }
        catch {
            /*
            Prism is an OPTIONAL PEER — absent it, code blocks stay plain. That is a real
            degradation (no highlighting on the site, in the ePub or in print), so it says so ONCE
            rather than returning a quiet false.
      
            It shipped as a devDependency in the first cut of this feature, which meant an
            adopter's build imported it from `dist/` and it resolved only by hoisting luck: their
            doc site would have had no highlighting at all and nothing would have said why. Same
            shape as the `chokidar` regression this project already records.
            */
            if (!warnedNoPrism) {
                warnedNoPrism = true;
                console.warn('prismjs not found — static code blocks will not be syntax-highlighted ' +
                    '(site, ePub and print alike). Install it: bun add -d prismjs');
            }
            return false;
        }
    }
    /*
    A registered grammar is installed into Prism under the FENCE name, not the alias — so
    `tjs` becomes a real Prism language rather than resolving to `javascript`, and the emitted
    class stays `language-tjs` for a theme to target.
    */
    const supplied = registered.get(lang.toLowerCase());
    if (supplied) {
        prism.languages[lang.toLowerCase()] = supplied;
        return true;
    }
    if (prism.languages[grammar])
        return true;
    if (BUILTIN.has(grammar))
        return Boolean(prism.languages[grammar]);
    let load = grammarLoads.get(grammar);
    if (!load) {
        load = (async () => {
            try {
                await import(
                /* @vite-ignore */ `prismjs/components/prism-${grammar}.js`);
            }
            catch {
                return false; // no such grammar — a plain code block, not an error
            }
            return Boolean(prism.languages[grammar]);
        })();
        grammarLoads.set(grammar, load);
    }
    return load;
}
/**
 * Highlight `code` as `lang`, returning HTML with `<span class="token …">` markup.
 * Returns null when the grammar is unavailable, so the caller leaves the block alone
 * rather than emitting something worse than plain text.
 *
 * `ensureGrammar` must have resolved true for this language first — kept separate because
 * the DOM pass wants to load every grammar a page needs before touching anything, so a
 * page never highlights half its blocks.
 */
export function highlight(code, lang) {
    const key = lang.toLowerCase();
    const grammar = registered.has(key) ? key : grammarFor(lang);
    const g = prism?.languages[grammar];
    if (!prism || !g)
        return null;
    return prism.highlight(code, g, grammar);
}
/** A `<pre><code class="language-*">` that has not been highlighted yet. */
const isPlain = (code) => !code.querySelector('.token') && !code.hasAttribute('data-highlighted');
/**
 * Highlight every static code block under `root`, in place.
 *
 * Skips anything inside a live example — those are CodeMirror's, and double-highlighting
 * would fight it — and anything already highlighted, which is what keeps the build's output
 * and the client's hydration byte-identical.
 *
 * Returns the number of blocks highlighted, so a caller can report or assert on it. A
 * silent zero is indistinguishable from "nothing needed doing", which is the ambiguity this
 * codebase has been burned by; the count makes it answerable.
 */
export async function highlightBlocks(root, opts = {}) {
    const liveTag = opts.liveExampleTag ?? 'tosi-example';
    const blocks = [...root.querySelectorAll('pre > code[class*="language-"]')]
        .filter((code) => isPlain(code))
        .filter((code) => !code.closest(liveTag));
    if (blocks.length === 0)
        return 0;
    const langOf = (code) => (code.className.match(/language-([A-Za-z0-9_+#-]+)/)?.[1] ?? '').toLowerCase();
    // Load every grammar the page needs BEFORE highlighting any of it, so a page is never
    // left half-highlighted — which looks like a rendering bug rather than a missing grammar.
    const langs = [...new Set(blocks.map(langOf))].filter(Boolean);
    const available = new Set();
    await Promise.all(langs.map(async (l) => {
        if (await ensureGrammar(l))
            available.add(l);
    }));
    let count = 0;
    for (const code of blocks) {
        const lang = langOf(code);
        if (!available.has(lang))
            continue;
        const html = highlight(code.textContent ?? '', lang);
        if (html === null)
            continue;
        code.innerHTML = html;
        code.setAttribute('data-highlighted', '');
        count += 1;
    }
    return count;
}
/*
The BUILD path: string in, string out.

Deliberately not happy-dom, though the build already has it. CLAUDE.md's rule is that
native-heavy APIs must not run in a long-lived process, and this would run once per page per
watch rebuild — 66 pages times a dev server that lives for days is exactly the shape that took
the machine down twice. A regex is sound here because we own the producer: `renderDocMarkdown`
emits marked's code-block markup and nothing else matches this pattern.
*/
const ENTITIES = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
};
/** Undo marked's escaping so Prism sees real source; Prism re-escapes as it tokenizes. */
function decodeEntities(s) {
    return s.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);
}
/** Every fence language present in rendered markdown — what grammars a page needs. */
export function languagesIn(html) {
    return [
        ...new Set([...html.matchAll(/<code class="language-([A-Za-z0-9_+#-]+)"/g)].map((m) => m[1].toLowerCase())),
    ];
}
/**
 * Highlight every code block in rendered-markdown HTML.
 *
 * Leaves a block alone when its grammar is unavailable — an unknown language is a plain code
 * block, not a build failure. Already-highlighted blocks are skipped by the same
 * `data-highlighted` marker the DOM pass uses, so running both is safe.
 */
export async function highlightHtml(html, policy = 'auto') {
    const langs = languagesIn(html);
    if (langs.length === 0)
        return html;
    const available = new Set();
    await Promise.all(langs.map(async (l) => {
        if (await ensureGrammar(l))
            available.add(l);
    }));
    if (available.size === 0)
        return html;
    /*
    Matches the `<pre>` too, because the fence's `:mode` lives there as `data-example-mode` and
    the live-example decision needs it. Skipping live fences is not an optimisation — a live
    example reads its SOURCE out of this element, and tokenizing it hands the example markup
    where it expected code.
    */
    return html.replace(/(<pre([^>]*)>)<code class="language-([A-Za-z0-9_+#-]+)">([\s\S]*?)<\/code>/g, (whole, preTag, preAttrs, lang, body) => {
        const l = lang.toLowerCase();
        const mode = preAttrs.match(/data-example-mode="([a-z]+)"/)?.[1];
        if (isLiveFence(l, mode, policy))
            return whole;
        if (!available.has(l))
            return whole;
        if (body.includes('class="token'))
            return whole;
        const out = highlight(decodeEntities(body), l);
        if (out === null)
            return whole;
        return `${preTag}<code class="language-${lang}" data-highlighted>${out}</code>`;
    });
}
