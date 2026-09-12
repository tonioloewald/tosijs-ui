import { test, expect } from '@playwright/test'

/*
Syntax highlighting must work IN A BROWSER — the environment it is for.

Blocker B1 of the 1.15.0 review: grammars were loaded by a bare, runtime-computed specifier
(`import(\`prismjs/components/prism-${lang}.js\`)`) that no browser can resolve. The unit test
asserted `ensureGrammar('rust') === true` and PASSED, because Bun resolves what a browser
cannot — a test that could only ever agree with the author, which is why it shipped.

Measured then: `<tosi-highlight language="rust">` rendered 0 token spans with no console
output, and a page showing 531 tokens on a hard load dropped to 23 after one client-side
navigation. These assertions are the instrument that was missing.
*/

test('a non-builtin grammar loads and highlights in the browser', async ({
  page,
}) => {
  await page.goto('/highlight-block/')
  // The component's own documented example uses `rust` — not one of Prism's seven builtins,
  // and one of the languages cited as the REASON for choosing Prism.
  const el = page.locator('tosi-highlight').first()
  await expect(el).toBeAttached()
  await expect(el.locator('.token').first()).toBeAttached({ timeout: 15_000 })
  expect(await el.locator('.token').count()).toBeGreaterThan(2)
})

test('client-side navigation keeps highlighting — hydration must not lose tokens', async ({
  page,
}) => {
  /*
  The build-time pass runs under Bun and always worked; the CLIENT pass was the broken one,
  so a hard load looked fine and navigating to the same page did not.

  Must be a REAL in-page navigation — clicking a nav link. A first draft used two
  `page.goto()` calls, which are two full loads: it exercised the build-time pass twice and
  passed happily with the defect reinstated. Mutation testing caught that, which is the only
  reason this assertion means anything.
  */
  await page.goto('/doc-site-system/')
  const onLoad = await page.locator('pre code .token').count()
  expect(
    onLoad,
    'the build-time pass should have highlighted this page'
  ).toBeGreaterThan(50)

  // Click through to another doc, in-page.
  const away = page.locator('.doc-nav a', { hasText: 'icons' }).first()
  await away.click()
  await page.waitForFunction(
    () => !location.pathname.includes('doc-site-system'),
    undefined,
    { timeout: 10_000 }
  )
  // …and back, which renders the original markdown CLIENT-SIDE this time.
  await page.goBack()
  await page.waitForFunction(
    () => location.pathname.includes('doc-site-system'),
    undefined,
    {
      timeout: 10_000,
    }
  )
  await page.waitForTimeout(1500)
  const afterNav = await page.locator('pre code .token').count()

  expect(
    afterNav,
    `tokens collapsed after client-side navigation (${onLoad} → ${afterNav}) — grammars are ` +
      `not loading in the browser, which is blocker B1 returning`
  ).toBeGreaterThan(onLoad * 0.8)
})

test('no console error while highlighting', async ({ page }) => {
  // A grammar that fails to LOAD now warns; a grammar that does not exist is silent. Neither
  // should produce an error on a normal page.
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/doc-site-system/')
  await page.waitForTimeout(1500)
  expect(errors.filter((e) => /prism|grammar|highlight/i.test(e))).toEqual([])
})
