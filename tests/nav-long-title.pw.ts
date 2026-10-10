import { test, expect } from '@playwright/test'

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
    const page = await context.newPage()
    await page.goto('/')
    if (hydrated)
      await page.waitForFunction(() => !!(window as any).__docTestResults)
    const link = page.locator('.doc-nav summary > .doc-link').first()
    await expect(link).toBeVisible()
    const measure = () =>
      link.evaluate((a) => {
        const summary = a.parentElement as HTMLElement
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
