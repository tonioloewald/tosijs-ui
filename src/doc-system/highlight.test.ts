import { test, expect, describe, afterEach, beforeEach } from 'bun:test'
import {
  grammarFor,
  ensureGrammar,
  highlightHtml,
  highlightBlocks,
  languagesIn,
  registerGrammar,
  registeredGrammars,
} from './highlight.js'

/*
Static code was highlighted NOWHERE before this: the pre-rendered page emitted a bare
`<pre><code class="language-ts">`, the client never touched it, and the ePub stripped the
language class. A doc system that publishes books had no highlighting in the books.
*/

describe('fence language → Prism grammar', () => {
  test.each([
    ['js', 'javascript'],
    ['ts', 'typescript'],
    ['tjs', 'javascript'],
    ['html', 'markup'],
    ['xml', 'markup'],
    ['sh', 'bash'],
    ['test', 'javascript'],
    ['rust', 'rust'],
  ])('%s → %s', (fence, grammar) => {
    expect(grammarFor(fence)).toBe(grammar)
  })

  test('an unmapped language passes through rather than throwing', () => {
    // An unknown language is a plain code block, not a build failure.
    expect(grammarFor('brainfuck')).toBe('brainfuck')
  })
})

describe('the BUILD path (string in, string out)', () => {
  test('emits token markup for a known language', async () => {
    const out = await highlightHtml(
      '<pre><code class="language-rust">fn main() {}</code></pre>'
    )
    expect(out).toContain('class="token keyword"')
    expect(out).toContain('data-highlighted')
  })

  test('an unknown language is left EXACTLY as it was', async () => {
    const html = '<pre><code class="language-zzz">???</code></pre>'
    expect(await highlightHtml(html)).toBe(html)
  })

  test('entities are decoded before tokenizing, and re-escaped after', async () => {
    // marked escapes `<` in code; Prism must see real source or it mis-tokenizes, and the
    // output must be escaped again or the page breaks.
    const out = await highlightHtml(
      '<pre><code class="language-js">a &lt; b &amp;&amp; c</code></pre>'
    )
    expect(out).toContain('&lt;')
    expect(out).not.toContain('a < b')
  })

  test('idempotent — running twice changes nothing', async () => {
    const once = await highlightHtml(
      '<pre><code class="language-rust">fn main() {}</code></pre>'
    )
    expect(await highlightHtml(once)).toBe(once)
  })

  test('HTML highlighted by something ELSE is left alone', async () => {
    /*
    Our own output is skipped by the `data-highlighted` attribute, which stops the regex
    matching at all — so the token-content check guards a different case: markup that carries
    tokens without our marker, i.e. highlighted upstream or hand-written. Tested separately
    because mutation showed the first test passes with that check removed, which made it look
    like dead code.
    */
    const external =
      '<pre><code class="language-rust"><span class="token keyword">fn</span></code></pre>'
    expect(await highlightHtml(external)).toBe(external)
  })

  test('languagesIn reports what a page needs, deduped', () => {
    const html =
      '<pre><code class="language-js">a</code></pre>' +
      '<pre><code class="language-JS">b</code></pre>' +
      '<pre><code class="language-rust">c</code></pre>'
    expect(languagesIn(html).sort()).toEqual(['js', 'rust'])
  })

  test('html with no code blocks is returned untouched, without loading Prism', async () => {
    const html = '<p>just prose</p>'
    expect(await highlightHtml(html)).toBe(html)
  })
})

describe('the DOM path', () => {
  const doc = () => {
    const root = document.createElement('div')
    return root
  }

  test('highlights static blocks and reports the count', async () => {
    const root = doc()
    // A display-only language: `ts` is EXECUTABLE and is live-example source on the web.
    root.innerHTML =
      '<pre><code class="language-rust">fn main() {}</code></pre>'
    expect(await highlightBlocks(root)).toBe(1)
    expect(root.querySelector('.token')).toBeTruthy()
  })

  test('an executable fence is skipped on the web — it is live-example SOURCE', async () => {
    /*
    Previously this held only by ORDERING: `insertExamples` wraps live blocks first, so the
    tag check caught them. Nothing enforced that order, and tokenizing example source is what
    cost seven doc tests earlier this cycle.
    */
    const root = doc()
    root.innerHTML = '<pre><code class="language-js">const x = 1</code></pre>'
    expect(await highlightBlocks(root)).toBe(0)
  })

  test("policy 'none' highlights everything — print and ePub have no live examples", async () => {
    // Major M1: the ePub defaulted to 'auto' and left 237 of 284 blocks plain, skipping
    // fences to protect live examples that cannot exist in a book.
    const root = doc()
    root.innerHTML = '<pre><code class="language-js">const x = 1</code></pre>'
    expect(await highlightBlocks(root, { policy: 'none' })).toBe(1)
    expect(root.querySelector('.token')).toBeTruthy()
  })

  test('SKIPS anything inside a live example — CodeMirror owns those', async () => {
    const root = doc()
    root.innerHTML =
      '<tosi-example><pre><code class="language-js">x</code></pre></tosi-example>'
    expect(await highlightBlocks(root)).toBe(0)
    expect(root.querySelector('.token')).toBeNull()
  })

  test('skips already-highlighted blocks — this is what keeps hydration identical', async () => {
    /*
    The build emits token markup; the client runs the same pass over the same DOM. If it
    re-highlighted, the hydrated page would differ from the pre-rendered one — the exact
    byte-identity the doc system's shared renderer exists to guarantee.
    */
    const root = doc()
    root.innerHTML = await highlightHtml(
      '<pre><code class="language-rust">fn main() {}</code></pre>'
    )
    expect(await highlightBlocks(root)).toBe(0)
  })

  test('an unknown grammar leaves its block alone but does not stop the others', async () => {
    const root = doc()
    root.innerHTML =
      '<pre><code class="language-zzz">???</code></pre>' +
      '<pre><code class="language-rust">fn main() {}</code></pre>'
    expect(await highlightBlocks(root)).toBe(1)
    expect(root.querySelector('.language-zzz')!.innerHTML).toBe('???')
  })
})

test('grammars load on demand, including ones CodeMirror does not bundle', async () => {
  // The reason for Prism over reusing CodeMirror: a prose or book corpus uses languages the
  // editor never needed.
  for (const lang of ['rust', 'python', 'bash', 'yaml', 'json'])
    expect(await ensureGrammar(lang), `${lang} grammar should load`).toBe(true)
})

/*
The coupling that broke a build: the highlighter and `insertExamples` must agree about which
fences are live examples. When they did not, the build tokenized the `html` fence of every
grouped example, `insertExamples` read spans instead of markup, and seven doc tests across two
pages failed as "Expected 0 to be 4" — a component reported broken when the pipeline was.
*/
describe('executable fences are NOT highlighted — they are live-example source', () => {
  test.each(['js', 'ts', 'tjs', 'html', 'css', 'test'])(
    '%s is left alone under the default policy',
    async (lang) => {
      const html = `<pre><code class="language-${lang}">const x = 1</code></pre>`
      expect(await highlightHtml(html)).toBe(html)
    }
  )

  test('`:static` makes an executable fence highlightable — that is the point of it', async () => {
    const out = await highlightHtml(
      '<pre data-example-mode="static"><code class="language-js">const x = 1</code></pre>'
    )
    expect(out).toContain('class="token keyword"')
  })

  test('under opt-in, an unmarked executable fence IS static, so it highlights', async () => {
    const html = '<pre><code class="language-js">const x = 1</code></pre>'
    expect(await highlightHtml(html, 'opt-in')).toContain(
      'class="token keyword"'
    )
  })

  test('under opt-in, a fence that ASKS to run is still left alone', async () => {
    const html =
      '<pre data-example-mode="inline"><code class="language-js">const x = 1</code></pre>'
    expect(await highlightHtml(html, 'opt-in')).toBe(html)
  })
})

describe('#155: a language can supply its own grammar', () => {
  test('a registered grammar WINS over the alias table', async () => {
    /*
    `tjs` aliases to `javascript` as a stopgap. tjs-lang is generating a real Prism definition
    from the same source that emits their TextMate grammars, and it must not have to wait on
    our release cadence to be used.
    */
    expect(grammarFor('tjs')).toBe('javascript') // the stopgap, absent a registration
    registerGrammar('tjs', {
      'tjs-example': { pattern: /:\s*'[^']*'/, alias: 'important' },
      keyword: /\b(?:function|test|wasm|given|extend)\b/,
    })
    expect(registeredGrammars()).toContain('tjs')
    expect(await ensureGrammar('tjs')).toBe(true)
    const out = await highlightHtml(
      `<pre data-example-mode="static"><code class="language-tjs">function greet(name: 'Alice') {}</code></pre>`
    )
    // The colon example is tokenized as ITSELF, not as a TypeScript type annotation —
    // which is the whole print argument in #155.
    expect(out).toContain('token tjs-example')
    // And the class stays `language-tjs`, so a theme can target it.
    expect(out).toContain('class="language-tjs"')
  })

  test('registration reaches the BUILD path, not just the browser', async () => {
    // A runtime-only registration would leave the ePub and print unhighlighted, which is
    // exactly where a wrong colour is permanent.
    const out = await highlightHtml(
      `<pre data-example-mode="static"><code class="language-tjs">test x() {}</code></pre>`
    )
    expect(out).toContain('data-highlighted')
  })
})

test('opt-in: executable fences ARE highlighted client-side (re-review)', async () => {
  /*
  `highlightBlocks` gained an `isLiveFence` filter, and the doc-browser called it without a
  policy — so it defaulted to 'auto' and skipped all six executable languages on an `opt-in`
  site. Those pages hard-load highlighted (the build passes the policy correctly) and lost
  every token on client-side navigation: B1's symptom, reintroduced for exactly the prose and
  book audience `opt-in` exists for.
  */
  const root = document.createElement('div')
  root.innerHTML = '<pre><code class="language-js">const x = 1</code></pre>'
  expect(await highlightBlocks(root, { policy: 'opt-in' })).toBe(1)

  // …and a fence that DOES ask to run is still skipped, even under opt-in.
  const live = document.createElement('div')
  live.innerHTML =
    '<pre data-example-mode="inline"><code class="language-js">const y = 2</code></pre>'
  expect(await highlightBlocks(live, { policy: 'opt-in' })).toBe(0)
})

/*
We must not steal a Prism the page already owns (quarterly review M3).

Prism lives on a free global and its grammar files register against whatever is there, so
load order decides the winner and neither side is told. Importing our copy over a host's
orphaned everything they had registered:

    globalThis.Prism is host?     false
    host custom lang reachable?   false
    host plugins reachable?       false
    host object itself intact?    true      ← their captured reference points at an orphan

Nothing errors. This is the #131 hazard class (`@codemirror/state` identity) in a worse
container — that one got `tosijs-ui/codemirror` as a real remedy; this had none.

The `manual` flag is the sharper half. We set it so Prism does not walk the whole document on
load, which is right for us — but writing it onto a HOST instance stops their `highlightAll()`
from ever running, and leaving it behind after a failed import does the same to a page that
never used us.
*/
describe('host Prism ownership (M3)', () => {
  const realPrism = (globalThis as any).Prism

  /*
  Reset BEFORE as well as after — this is what makes the test mean anything.

  `prism` is module-scoped and earlier tests in this file populate it, so `ensureGrammar`
  short-circuits on `if (!prism)` and never reaches the adopt path at all. The first version
  of this test asserted on a global that nothing had touched, and BOTH mutants survived:
  deleting the adopt branch, and leaking `manual` onto the host. A test that cannot fail is
  worse than no test, because it reads as coverage.
  */
  beforeEach(async () => {
    const { resetHighlightStateForTest } = await import('./highlight')
    resetHighlightStateForTest()
  })

  afterEach(async () => {
    if (realPrism === undefined) delete (globalThis as any).Prism
    else (globalThis as any).Prism = realPrism
    /*
    Clear the module cache too. `prism` is module-scoped and Bun shares module state across
    the whole process, so adopting a FAKE host here would otherwise leak into every later
    test — highlighting would silently use a stub with no grammars.
    */
    const { resetHighlightStateForTest } = await import('./highlight')
    resetHighlightStateForTest()
  })

  test('a host instance is adopted, not replaced, and keeps its languages and plugins', async () => {
    const host: any = {
      languages: { mylang: { keyword: /\bfoo\b/ } },
      plugins: { lineNumbers: {} },
      highlight: () => 'host',
      highlightAll: () => {},
    }
    ;(globalThis as any).Prism = host

    const { ensureGrammar } = await import('./highlight')
    await ensureGrammar('javascript')

    expect((globalThis as any).Prism).toBe(host)
    expect((globalThis as any).Prism.languages.mylang).toBeTruthy()
    expect((globalThis as any).Prism.plugins.lineNumbers).toBeTruthy()
    // And we did NOT impose our `manual` preference on an instance we do not own —
    // that would stop the host's own highlightAll() from ever running.
    expect((globalThis as any).Prism.manual).not.toBe(true)
  })
})

/*
`grammarFor` must agree with `highlight()` about a REGISTERED language (F19).

It consulted `ALIASES` only, so after `registerGrammar('tjs', …)` — the one thing a language
author does — it still answered `javascript` while `highlight()` used the supplied grammar.
A companion function that contradicts the main one on exactly the case you care about is worse
than no companion function, and this is the surface tjs-lang is about to build on.
*/
describe('grammarFor is registration-aware (F19)', () => {
  afterEach(async () => {
    const { resetHighlightStateForTest } = await import('./highlight')
    resetHighlightStateForTest()
  })

  test('an alias still resolves when nothing is registered', async () => {
    const { grammarFor } = await import('./highlight')
    expect(grammarFor('tjs')).toBe('javascript')
    expect(grammarFor('ts')).toBe('typescript')
  })

  test('a registered grammar wins over its alias', async () => {
    const { grammarFor, registerGrammar } = await import('./highlight')
    registerGrammar('tjs', { keyword: /\bgiven\b/ })
    expect(grammarFor('tjs')).toBe('tjs')
    // Unrelated languages are unaffected.
    expect(grammarFor('ts')).toBe('typescript')
  })
})
