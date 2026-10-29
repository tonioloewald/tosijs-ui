import { test, expect, isolateThirdParty } from './fixtures'

/*
A section whose title wraps keeps its disclosure triangle beside the first line (#219).

The link is an inline-block; uncapped, a long one does not fit beside the marker, so it drops
to the next line whole and the triangle sits alone on a row that looks like an empty entry.
Checked before hydration (the static nav) and after, since both paint from the same rule.
*/
for (const hydrated of [false, true]) {
  test(`a long section title stays on the triangle's line (${
    hydrated ? 'hydrated' : 'static'
  })`, async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      javaScriptEnabled: hydrated,
      viewport: { width: 1400, height: 900 },
    })
    await isolateThirdParty(context)
    const page = await context.newPage()
    await page.goto('/')
    if (hydrated)
      await page.waitForFunction(() => !!(window as any).__docTestResults)
    const link = page.locator('.doc-nav .nav-branch-head > .doc-link').first()
    await expect(link).toBeVisible()
    const measure = () =>
      link.evaluate((a) => {
        const summary = a.parentElement as HTMLElement // the section head
        const style = getComputedStyle(a)
        return {
          // how far below the summary's top the link starts
          drop:
            a.getBoundingClientRect().top - summary.getBoundingClientRect().top,
          lines:
            a.getBoundingClientRect().height / parseFloat(style.lineHeight),
          overflow: summary.scrollWidth - summary.clientWidth,
        }
      })
    const short = await measure()
    await link.evaluate((a) => {
      a.textContent =
        'TypeScript: The Good, the Bad, and the Ugly, at Some Length'
    })
    const long = await measure()
    expect(long.lines, 'the title must actually wrap').toBeGreaterThan(1.5)
    expect(
      Math.abs(long.drop - short.drop),
      'the link starts on the same line as when it was short'
    ).toBeLessThan(2)
    expect(long.overflow, 'and does not overflow the nav').toBeLessThanOrEqual(
      1
    )
    await context.close()
  })
}

/*
A nav section is a toggle button beside its link, not a <summary> around it (#3520). The
button says whether the section is open, opens and closes it, and without JavaScript every
section is open, since nothing could open one.
*/
test('a nav section toggle opens and closes its section', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  await page.waitForFunction(() => !!(window as any).__docTestResults)
  // Pinned by id: a `:not(.-open)` locator would re-resolve to the NEXT closed section.
  const id = await page
    .locator(
      '.doc-nav .nav-branch:not(.-open) > .nav-branch-head > .nav-toggle'
    )
    .first()
    .getAttribute('aria-controls')
  const closed = page.locator(`.nav-toggle[aria-controls="${id}"]`)
  await expect(closed).toHaveAttribute('aria-expanded', 'false')
  const list = page.locator(`#${await closed.getAttribute('aria-controls')}`)
  await expect(list).toBeHidden()
  await closed.click()
  await expect(closed).toHaveAttribute('aria-expanded', 'true')
  await expect(list).toBeVisible()
  await closed.click()
  await expect(list).toBeHidden()
  await expect(page.locator('.doc-nav summary')).toHaveCount(0)
})

test('without JavaScript every nav section is open', async ({ browser }) => {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    javaScriptEnabled: false,
    viewport: { width: 1400, height: 900 },
  })
  await isolateThirdParty(context)
  const page = await context.newPage()
  await page.goto('/')
  const lists = page.locator('.doc-nav .nav-branch > ul')
  expect(await lists.count()).toBeGreaterThan(0)
  for (const list of await lists.all()) await expect(list).toBeVisible()
  await context.close()
})
