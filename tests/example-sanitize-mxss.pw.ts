import { test, expect } from './fixtures'

/*
What a page's `sanitize` hook sees is what reaches the preview (1.17.0 review).

The hook's fragment used to be serialized and parsed again before insertion. HTML does not
round-trip through foreign content, so this payload parses with the <img> inside a <style>
(harmless, and what the hook inspects) and re-parses with a live <img onerror>.
*/
const PAYLOAD =
  '<form><math><mtext></form><form><mglyph><style></math><img src=x onerror="window.__pwned=1">'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

test('markup a sanitize hook passed cannot mutate into a live handler', async ({
  page,
}) => {
  await page.goto('/readme/')
  await page.waitForFunction(() => (window as any).xinjsui?.setExampleHooks)
  const result = await page.evaluate(async (payload) => {
    const ui = (window as any).xinjsui
    ui.setExampleHooks({
      sanitize: (fragment: DocumentFragment) => {
        for (const el of fragment.querySelectorAll('img, [onerror]'))
          el.remove()
      },
    })
    const pre = document.createElement('pre')
    const code = document.createElement('code')
    code.className = 'language-html'
    code.textContent = payload
    pre.append(code)
    const doc = document.createElement('div')
    doc.append(pre)
    document.body.append(doc)
    ui.LiveExample.insertExamples(doc)
    await new Promise((resolve) => setTimeout(resolve, 800))
    const preview = doc.querySelector('tosi-example .preview')
    ui.setExampleHooks({})
    return {
      rendered: preview !== null,
      liveImg: preview?.querySelectorAll('img[onerror]').length ?? -1,
      pwned: (window as any).__pwned === 1,
    }
  }, PAYLOAD)
  expect(result).toEqual({ rendered: true, liveImg: 0, pwned: false })
})
