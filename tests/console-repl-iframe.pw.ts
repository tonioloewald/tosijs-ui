import { test, expect } from '@playwright/test'

/*
In an :iframe example the REPL runs INSIDE the iframe, as the example does: $ / $$ and its own
variables, and `window` / `document` are the iframe's. Browser-only: happy-dom can't model a
second realm.
*/
test('the REPL of an iframe example lives in the iframe', async ({ page }) => {
  await page.goto('/component/')
  await page.waitForFunction(() => (window as any).xinjsui?.liveExample)
  const results = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const example = ui.liveExample()
    example.setAttribute('mode', 'iframe')
    document.body.prepend(example)
    await example.whenHydrated
    await new Promise((r) => setTimeout(r, 100))
    example.html = '<b class="x">inside</b>'
    example.js = "const secret = 'iframe scope'"
    await example.refresh()
    const out: Record<string, unknown> = {
      inIframe: !!example.querySelector('iframe.preview-iframe'),
    }
    for (const source of [
      "$('.x').textContent",
      "$$('.x').length",
      'secret',
      'preview.ownerDocument === document',
      "document.querySelectorAll('.x').length",
    ])
      out[source] = await example.consoleEval(source)
    example.remove()
    return out
  })
  expect(results).toEqual({
    inIframe: true,
    "$('.x').textContent": 'inside',
    "$$('.x').length": 1,
    secret: 'iframe scope',
    'preview.ownerDocument === document': true,
    // the iframe's document holds only the example's content, not the doc page's
    "document.querySelectorAll('.x').length": 1,
  })
})
