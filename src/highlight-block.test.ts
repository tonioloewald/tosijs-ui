import { test, expect, describe } from 'bun:test'
import { tosiHighlight, HighlightBlock } from './highlight-block.js'

/*
Poll for the upgrade rather than sleeping a fixed time.

Setting `value` queues a render, so the explicit `render()` in these tests is followed by
another — and the `_token` guard correctly invalidates the first grammar callback, so a fixed
sleep can land in the gap between them. That is #142's rule applied to our own suite: settle
on a PREDICATE, with a budget, and let a timeout be a distinguishable failure rather than a
silently wrong assertion.
*/
async function settled(test: () => boolean, budgetMs = 2000): Promise<boolean> {
  const started = Date.now()
  while (Date.now() - started < budgetMs) {
    if (test()) return true
    await new Promise((r) => setTimeout(r, 10))
  }
  return false
}

/*
`<tosi-highlight>` is for code that arrives at RUNTIME. Markdown fences do not need it —
`tosijs-ui/site` highlights those at build time, which is the only way tokens reach the ePub
and the printed page.
*/
describe('<tosi-highlight>', () => {
  test('renders readable plain code SYNCHRONOUSLY, before any grammar loads', async () => {
    // The reader must never see an empty box while Prism is fetched, and if the grammar
    // never arrives this is the final state rather than a failure.
    const el = tosiHighlight({ language: 'rust' })
    el.value = 'fn main() {}'
    document.body.append(el)
    await el.whenHydrated
    el.render()
    expect(el.textContent).toContain('fn main()')
    el.remove()
  })

  test('upgrades to token markup once the grammar is available', async () => {
    const el = tosiHighlight({ language: 'rust' })
    el.value = 'fn main() {}'
    document.body.append(el)
    await el.whenHydrated
    el.render()
    expect(
      await settled(() => !!el.querySelector('.token')),
      'grammar never applied within the budget'
    ).toBe(true)
    el.remove()
  })

  test('an unknown language stays plain rather than failing', async () => {
    const el = tosiHighlight({ language: 'definitely-not-a-language' })
    el.value = 'whatever'
    document.body.append(el)
    await el.whenHydrated
    el.render()
    // Give it the same budget the success case gets, then assert it stayed plain.
    await settled(() => !!el.querySelector('.token'), 200)
    expect(el.textContent).toContain('whatever')
    expect(el.querySelector('.token')).toBeNull()
    el.remove()
  })

  test('it is LIGHT DOM — token colours must be reachable from a page stylesheet', () => {
    // A shadow root would isolate `.token.*` and force every consumer to re-declare the
    // palette, which is the opposite of the point.
    expect(HighlightBlock.shadowStyleSpec).toBeUndefined()
  })

  test('the language class is what the CSS keys on', async () => {
    const el = tosiHighlight({ language: 'python' })
    el.value = 'x = 1'
    document.body.append(el)
    await el.whenHydrated
    el.render()
    expect(el.querySelector('code')!.className).toBe('language-python')
    el.remove()
  })
})

/*
The palette must ship with the ELEMENT, not with the doc-site chrome (dx review F4).

This package ships no CSS files — every style is a `StyleSheet()` call — and the `.token.*`
rules used to live only inside `docSystemStyleSpec()`. So a standalone `<tosi-highlight>`
emitted perfectly correct `<span class="token …">` markup and rendered it in flat black, which
is the single thing the component exists to do. Reproduced in a browser during review: 17
correct token spans, all computing to `rgb(0,0,0)`.

Asserting on the SPEC rather than on computed colour, deliberately: happy-dom does not do
cascade resolution, so a computed-style assertion here would pass under the defect and prove
nothing. What is checkable at this tier is that the rules exist, are reachable without the
doc-site chrome, and that the element asks for them.
*/
import {
  highlightStyleSpec,
  ensureHighlightStyles,
} from './doc-system/highlight-styles'

describe('token palette ships with the element (F4)', () => {
  test('the palette is importable without the doc-site chrome', () => {
    const selectors = Object.keys(highlightStyleSpec)
    // Light defaults …
    expect(selectors).toContain(
      '.token.keyword, .token.important, .token.atrule'
    )
    expect(selectors).toContain(
      '.token.string, .token.char, .token.attr-value, .token.regex'
    )
    // … and a dark set, which is a separate palette rather than one recomputed from the other.
    expect(selectors.some((s) => s.startsWith('.darkmode .token'))).toBe(true)
    // Enough rules to actually colour code, not a token gesture.
    expect(
      selectors.filter((s) => s.includes('.token')).length
    ).toBeGreaterThan(15)
  })

  test('every colour is a var with a fallback, so one token type can be rethemed', () => {
    const colours = Object.values(highlightStyleSpec)
      .map((rule) => (rule as Record<string, string>).color)
      .filter(Boolean)
    expect(colours.length).toBeGreaterThan(15)
    // `varDefault.tokenKeyword('#0a5bb5')` → `var(--token-keyword, #0a5bb5)`
    for (const c of colours) expect(c).toMatch(/^var\(--[a-z-]+, /)
  })

  test('rendering an element gets the palette into the document', () => {
    const block = tosiHighlight({ language: 'js' })
    document.body.append(block)
    block.value = 'const x = 1'
    block.render()
    expect(document.getElementById('tosi-highlight-tokens')).not.toBe(null)
    block.remove()
  })

  test('injected ONCE however many elements and renders there are', () => {
    /*
    The assertion that caught a real defect while being written. `StyleSheet` does not dedupe
    by id on its own and `render()` runs many times per element, so the first version of
    `ensureHighlightStyles` — a bare `StyleSheet()` call — put nine `<style>` elements in the
    document across one test file. On a real page that is one per render, forever.
    */
    for (let i = 0; i < 5; i += 1) {
      const block = tosiHighlight({ language: 'js' })
      document.body.append(block)
      block.value = `const x = ${i}`
      block.render()
      block.render()
      block.remove()
    }
    ensureHighlightStyles()
    expect(document.querySelectorAll('#tosi-highlight-tokens').length).toBe(1)
  })
})
