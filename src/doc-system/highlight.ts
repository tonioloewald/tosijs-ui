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

import { isLiveFence, type ExamplePolicy } from './example-policy.js'

/** Languages Prism has built in — no grammar file to load. */
const BUILTIN = new Set([
  'markup',
  'html',
  'xml',
  'css',
  'clike',
  'javascript',
  'js',
])

/**
 * Fence language → Prism grammar name. Prism's names differ from the ones authors write,
 * and an unmapped alias silently produces no highlighting rather than an error — which is
 * the failure mode this whole codebase keeps finding, so the map is explicit.
 */
const ALIASES: Record<string, string> = {
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
}

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
const registered = new Map<string, unknown>()

/**
 * Supply a Prism grammar for a fence language. Overrides the built-in alias mapping.
 * Call before the first highlight — at module scope in a bundle entry, or in `prebuild`.
 */
export function registerGrammar(fenceLang: string, grammar: unknown): void {
  registered.set(fenceLang.toLowerCase(), grammar)
}

/** Registered grammars, for tests and diagnostics. */
export function registeredGrammars(): string[] {
  return [...registered.keys()]
}

export function grammarFor(fenceLang: string): string {
  const l = fenceLang.toLowerCase()
  return ALIASES[l] ?? l
}

/*
A STATIC map of grammar loaders (blocker B1 of the 1.15.0 review).

This was `import(<template>)` — a bare specifier computed at runtime — and **no browser can
resolve it.** Measured in headless chromium against the built site: `<tosi-highlight
language="rust">` rendered 0 token spans with no console output, and a page showing 531 tokens
on a hard load showed 23 after one client-side navigation, because only Prism's seven builtins
were reachable. Every language named as the REASON for choosing Prism — typescript, json,
bash, python, rust, yaml — was unavailable in the one environment the component runs in. Under
webpack the same specifier fails the other way, pulling a context module over all ~600 grammar
files.

The unit test asserted `ensureGrammar('rust') === true` and passed, because BUN resolves what
a browser cannot. A test that can only agree with you is worse than none — it is why this
shipped. The browser assertion now lives in the Playwright lane, where the claim is about.

Static thunks are what a bundler can see. The list is CAPPED deliberately: a map over every
grammar Prism ships would flatten ~290 files into the iife entry, which is the bundle-weight
problem #120 exists to avoid. These are the languages a doc or book corpus actually uses;
anything else stays plain, and `registerGrammar` covers a language that ships its own.
*/
const GRAMMARS: Record<string, () => Promise<unknown>> = {
  bash: () => import('prismjs/components/prism-bash.js'),
  c: () => import('prismjs/components/prism-c.js'),
  cpp: () => import('prismjs/components/prism-cpp.js'),
  csharp: () => import('prismjs/components/prism-csharp.js'),
  diff: () => import('prismjs/components/prism-diff.js'),
  docker: () => import('prismjs/components/prism-docker.js'),
  go: () => import('prismjs/components/prism-go.js'),
  graphql: () => import('prismjs/components/prism-graphql.js'),
  ini: () => import('prismjs/components/prism-ini.js'),
  java: () => import('prismjs/components/prism-java.js'),
  json: () => import('prismjs/components/prism-json.js'),
  jsx: () => import('prismjs/components/prism-jsx.js'),
  kotlin: () => import('prismjs/components/prism-kotlin.js'),
  less: () => import('prismjs/components/prism-less.js'),
  makefile: () => import('prismjs/components/prism-makefile.js'),
  markdown: () => import('prismjs/components/prism-markdown.js'),
  php: () => import('prismjs/components/prism-php.js'),
  python: () => import('prismjs/components/prism-python.js'),
  ruby: () => import('prismjs/components/prism-ruby.js'),
  rust: () => import('prismjs/components/prism-rust.js'),
  scss: () => import('prismjs/components/prism-scss.js'),
  sql: () => import('prismjs/components/prism-sql.js'),
  swift: () => import('prismjs/components/prism-swift.js'),
  toml: () => import('prismjs/components/prism-toml.js'),
  tsx: () => import('prismjs/components/prism-tsx.js'),
  typescript: () => import('prismjs/components/prism-typescript.js'),
  yaml: () => import('prismjs/components/prism-yaml.js'),
}

/** Grammars this build can load — for tests, diagnostics, and the docs. */
export function loadableGrammars(): string[] {
  return Object.keys(GRAMMARS).sort()
}

type PrismLike = {
  languages: Record<string, unknown>
  highlight: (code: string, grammar: unknown, lang: string) => string
}

let prism: PrismLike | undefined
let warnedNoPrism = false
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
const grammarLoads = new Map<string, Promise<boolean>>()

/**
 * Load Prism and the grammar for `lang`. Returns false when the grammar does not exist —
 * an unknown language is not an error, it is a code block that stays plain.
 *
 * Grammar files are loaded by dynamic import so a bundler can code-split them and a build
 * only pays for the languages its corpus actually uses.
 */
export async function ensureGrammar(lang: string): Promise<boolean> {
  const grammar = grammarFor(lang)
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
      if (!scope) continue
      const sc = scope as { Prism?: { manual?: boolean } }
      sc.Prism = { ...(sc.Prism ?? {}), manual: true }
    }
    try {
      prism = ((await import('prismjs')) as { default?: PrismLike })
        .default as PrismLike
    } catch {
      /*
      Prism is a real DEPENDENCY, so reaching here means something is genuinely wrong —
      a broken install, a bundler that dropped it, a sandbox without node_modules. Not the
      ordinary "you did not install the optional extra" case it used to be.

      It shipped as a devDependency first (an adopter's build resolved it only by hoisting
      luck), then as an optional peer — which broke a consumer's build outright, because the
      static grammar map must resolve at bundle time. CLAUDE.md records the same fork for
      tosijs-schema: a literal import fails without the package, a variable specifier cannot
      resolve in a browser. There is no third option, so it is a dependency.
      */
      if (!warnedNoPrism) {
        warnedNoPrism = true
        console.warn(
          'prismjs could not be loaded — static code blocks will not be syntax-highlighted ' +
            '(site, ePub and print alike). It is a dependency of tosijs-ui, so this usually ' +
            'means a broken install: try reinstalling.'
        )
      }
      return false
    }
  }
  /*
  A registered grammar is installed into Prism under the FENCE name, not the alias — so
  `tjs` becomes a real Prism language rather than resolving to `javascript`, and the emitted
  class stays `language-tjs` for a theme to target.
  */
  const supplied = registered.get(lang.toLowerCase())
  if (supplied) {
    prism.languages[lang.toLowerCase()] = supplied
    return true
  }
  if (prism.languages[grammar]) return true
  if (BUILTIN.has(grammar)) return Boolean(prism.languages[grammar])

  let load = grammarLoads.get(grammar)
  if (!load) {
    load = (async () => {
      const thunk = GRAMMARS[grammar]
      /*
      Not in the map: a plain code block, not an error — distinct from a LOAD FAILURE below,
      which is a real problem and says so. Conflating the two is what let B1 ship silently.
      */
      if (!thunk) return false
      try {
        await thunk()
      } catch (err) {
        console.warn(
          `prismjs grammar "${grammar}" failed to load — code blocks in that language ` +
            `will not be highlighted.`,
          err
        )
        return false
      }
      return Boolean(prism!.languages[grammar])
    })()
    grammarLoads.set(grammar, load)
  }
  return load
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
export function highlight(code: string, lang: string): string | null {
  const key = lang.toLowerCase()
  const grammar = registered.has(key) ? key : grammarFor(lang)
  const g = prism?.languages[grammar]
  if (!prism || !g) return null
  return prism.highlight(code, g, grammar)
}

/** A `<pre><code class="language-*">` that has not been highlighted yet. */
const isPlain = (code: Element) =>
  !code.querySelector('.token') && !code.hasAttribute('data-highlighted')

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
export async function highlightBlocks(
  root: ParentNode,
  opts: { liveExampleTag?: string; policy?: ExamplePolicy } = {}
): Promise<number> {
  const liveTag = opts.liveExampleTag ?? 'tosi-example'
  /*
  `policy` matters for targets with no live examples — the PRINT path passes `'none'`, so an
  executable fence is highlighted rather than skipped. On the web the default is right: those
  blocks are live-example source and tokenizing them hands the example markup where it
  expected code.
  */
  const policy: ExamplePolicy = opts.policy ?? 'auto'
  const blocks = [...root.querySelectorAll('pre > code[class*="language-"]')]
    .filter((code) => isPlain(code))
    .filter((code) => !(code as Element).closest(liveTag))
    /*
    Also ask the shared predicate, not only "is it already inside a live example".
    
    The tag check alone works by ORDERING — `insertExamples` runs first, so live blocks are
    already wrapped by the time this runs. That is true today and is not a property anything
    enforces; if the two ever swapped, this would tokenize live-example SOURCE and the example
    would read markup where it expected code, which is the defect that cost seven doc tests
    earlier this cycle. Asking `isLiveFence` makes it true by construction — and makes
    `policy` load-bearing, so the print path's `'none'` actually means something.
    */
    .filter((code) => {
      const el = code as Element
      const mode =
        (el.parentElement as HTMLElement | null)?.getAttribute(
          'data-example-mode'
        ) ?? undefined
      const lang =
        el.className.match(/language-([A-Za-z0-9_+#-]+)/)?.[1]?.toLowerCase() ??
        ''
      return !isLiveFence(lang, mode, policy)
    })

  if (blocks.length === 0) return 0

  const langOf = (code: Element) =>
    (
      code.className.match(/language-([A-Za-z0-9_+#-]+)/)?.[1] ?? ''
    ).toLowerCase()

  // Load every grammar the page needs BEFORE highlighting any of it, so a page is never
  // left half-highlighted — which looks like a rendering bug rather than a missing grammar.
  const langs = [...new Set(blocks.map(langOf))].filter(Boolean)
  const available = new Set<string>()
  await Promise.all(
    langs.map(async (l) => {
      if (await ensureGrammar(l)) available.add(l)
    })
  )

  let count = 0
  for (const code of blocks) {
    const lang = langOf(code)
    if (!available.has(lang)) continue
    const html = highlight(code.textContent ?? '', lang)
    if (html === null) continue
    code.innerHTML = html
    code.setAttribute('data-highlighted', '')
    count += 1
  }
  return count
}

/*
The BUILD path: string in, string out.

Deliberately not happy-dom, though the build already has it. CLAUDE.md's rule is that
native-heavy APIs must not run in a long-lived process, and this would run once per page per
watch rebuild — 66 pages times a dev server that lives for days is exactly the shape that took
the machine down twice. A regex is sound here because we own the producer: `renderDocMarkdown`
emits marked's code-block markup and nothing else matches this pattern.
*/

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

/** Undo marked's escaping so Prism sees real source; Prism re-escapes as it tokenizes. */
function decodeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m)
}

/** Every fence language present in rendered markdown — what grammars a page needs. */
export function languagesIn(html: string): string[] {
  return [
    ...new Set(
      [...html.matchAll(/<code class="language-([A-Za-z0-9_+#-]+)"/g)].map(
        (m) => m[1].toLowerCase()
      )
    ),
  ]
}

/**
 * Highlight every code block in rendered-markdown HTML.
 *
 * Leaves a block alone when its grammar is unavailable — an unknown language is a plain code
 * block, not a build failure. Already-highlighted blocks are skipped by the same
 * `data-highlighted` marker the DOM pass uses, so running both is safe.
 */
export async function highlightHtml(
  html: string,
  policy: ExamplePolicy = 'auto'
): Promise<string> {
  const langs = languagesIn(html)
  if (langs.length === 0) return html
  const available = new Set<string>()
  await Promise.all(
    langs.map(async (l) => {
      if (await ensureGrammar(l)) available.add(l)
    })
  )
  if (available.size === 0) return html

  /*
  Matches the `<pre>` too, because the fence's `:mode` lives there as `data-example-mode` and
  the live-example decision needs it. Skipping live fences is not an optimisation — a live
  example reads its SOURCE out of this element, and tokenizing it hands the example markup
  where it expected code.
  */
  return html.replace(
    /(<pre([^>]*)>)<code class="language-([A-Za-z0-9_+#-]+)">([\s\S]*?)<\/code>/g,
    (whole, preTag: string, preAttrs: string, lang: string, body: string) => {
      const l = lang.toLowerCase()
      const mode = preAttrs.match(/data-example-mode="([a-z]+)"/)?.[1]
      if (isLiveFence(l, mode, policy)) return whole
      if (!available.has(l)) return whole
      if (body.includes('class="token')) return whole
      const out = highlight(decodeEntities(body), l)
      if (out === null) return whole
      return `${preTag}<code class="language-${lang}" data-highlighted>${out}</code>`
    }
  )
}
