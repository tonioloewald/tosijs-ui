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
