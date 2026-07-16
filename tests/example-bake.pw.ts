import { test, expect } from '@playwright/test'

/*
Slice 2 of self-contained examples (self-contained-examples-plan.md): a page's tjs
examples are baked at build time into hidden <script type="application/tosi-transpiled">
tags, so a READER (tests off — the default off localhost) runs them WITHOUT loading the
tjs transpiler.

The doc-test harness defaults tests ON on localhost, so we force the reader state by
seeding localStorage before any page script runs. Then we assert the tjs example on the
component page renders its preview AND that /tjs/tjs-browser.js is never requested.
*/

const TESTS_KEY = 'tosijs-ui-tests-enabled'

test.skip(
  ({ browserName }) => browserName === 'webkit',
  'iframe runner parity with the doc-test lane'
)

test('a reader (tests off) runs a baked tjs example without loading the transpiler', async ({
  page,
}) => {
  await page.addInitScript(
    ([key]) => localStorage.setItem(key, 'false'),
    [TESTS_KEY]
  )

  const transpilerRequests: string[] = []
  page.on('request', (req) => {
    const url = req.url()
    if (/\/tjs\/.*\.js/.test(url) || /tjs-browser/.test(url)) {
      transpilerRequests.push(url)
    }
  })

  await page.goto('/component/')

  // The component page has both js and tjs examples; wait for previews to run
  // (each example replaces its <pre> blocks with a <tosi-example> whose .preview
  // fills in). If the bake path were broken, a tjs preview would be empty or error.
  const firstExample = page.locator('tosi-example').first()
  await expect(firstExample).toBeVisible()
  await expect(firstExample.locator('.preview').first()).toBeVisible({
    timeout: 15_000,
  })
  // No execution error surfaced anywhere on the page.
  await expect(page.locator('tosi-example .preview-error')).toHaveCount(0)

  // Explicitly assert a tjs example (the bake payoff) rendered real preview text —
  // it ran from the embedded transpiled JS, not the transpiler.
  const tjsRendered = await page.evaluate(() =>
    [...document.querySelectorAll('tosi-example')]
      .filter((e: any) => e.dialect === 'tjs')
      .map((e) => (e.querySelector('.preview')?.textContent || '').trim())
  )
  expect(tjsRendered.length).toBeGreaterThan(0)
  for (const text of tjsRendered) expect(text.length).toBeGreaterThan(0)

  // Give any lazy transpiler fetch a chance to have fired, then assert it didn't.
  await page.waitForTimeout(500)
  expect(
    transpilerRequests,
    `transpiler should not load on the reader path, got: ${transpilerRequests.join(', ')}`
  ).toHaveLength(0)
})

test('slice 2b: a SPA-navigated page runs its baked tjs examples without the transpiler', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )

  const transpilerRequests: string[] = []
  page.on('request', (req) => {
    if (/tjs-browser/.test(req.url())) transpilerRequests.push(req.url())
  })

  // Land on the home page (NOT the component page) so the component page is reached
  // by client-side navigation — which re-renders markdown from docs.json (where the
  // bakes now live), not the adopted pre-rendered DOM.
  await page.goto('/')
  await expect(page.locator('tosi-example').first()).toBeVisible()

  // SPA-navigate to the component page (has the tjs examples) by clicking its nav
  // link — the doc-browser intercepts internal links and re-renders client-side. The
  // link lives in a collapsed nav, so click it in-page (the delegated handler still
  // catches the bubbling event) rather than via a visibility-gated Playwright click.
  await page.evaluate(() =>
    (
      document.querySelector('a.doc-link[href="/component/"]') as HTMLElement
    )?.click()
  )

  // Its tjs examples render from the docs.json bakes.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            [...document.querySelectorAll('tosi-example')].filter(
              (e: any) => e.dialect === 'tjs'
            ).length
        ),
      { timeout: 15_000 }
    )
    .toBeGreaterThan(0)
  const tjsRendered = await page.evaluate(() =>
    [...document.querySelectorAll('tosi-example')]
      .filter((e: any) => e.dialect === 'tjs')
      .map((e) => (e.querySelector('.preview')?.textContent || '').trim())
  )
  for (const text of tjsRendered) expect(text.length).toBeGreaterThan(0)
  await expect(page.locator('tosi-example .preview-error')).toHaveCount(0)

  await page.waitForTimeout(500)
  expect(
    transpilerRequests,
    `transpiler should not load on the SPA-nav reader path, got: ${transpilerRequests.join(', ')}`
  ).toHaveLength(0)
})

test('control: with tests enabled the transpiler DOES load (proves the probe works)', async ({
  page,
}) => {
  await page.addInitScript(
    ([key]) => localStorage.setItem(key, 'true'),
    [TESTS_KEY]
  )

  let loadedTranspiler = false
  page.on('request', (req) => {
    if (/tjs-browser/.test(req.url())) loadedTranspiler = true
  })

  await page.goto('/component/')
  await expect(page.locator('tosi-example').first()).toBeVisible()
  // Tests-on path transpiles (runs inline tjs tests) — the transpiler loads.
  await expect.poll(() => loadedTranspiler, { timeout: 15_000 }).toBe(true)
})
