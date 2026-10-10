import { test, expect } from '@playwright/test'

/*
Headings have ids, so an in-page link goes somewhere (board #3178).

Before this every heading was a bare `<h2>`, and `[text](#that-heading)` rendered as a link
that did nothing. Checked without JavaScript (the static page and the browser's own fragment
navigation), on arrival with it, and for a click inside the hydrated page.
*/
const ID = 'bundles--live-examples-read-this'
const nearTop = (page: any) =>
  page.evaluate((id: string) => {
    const el = document.getElementById(id)
    return el ? el.getBoundingClientRect().top : null
  }, ID)

for (const js of [false, true]) {
  test(`arriving at /page/#heading shows that heading (${
    js ? 'hydrated' : 'no JavaScript'
  })`, async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      javaScriptEnabled: js,
      viewport: { width: 1400, height: 900 },
    })
    const page = await context.newPage()
    await page.goto(`/doc-site-system/#${ID}`)
    if (js) await page.waitForFunction(() => !!(window as any).__docTestResults)
    await expect
      .poll(() => nearTop(page), { timeout: 10_000 })
      .toBeLessThan(300)
    expect(await nearTop(page)).toBeGreaterThanOrEqual(0)
    await context.close()
  })
}

test('an in-page link scrolls to its heading and keeps the document', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/doc-site-system/')
  await page.waitForFunction(() => !!(window as any).__docTestResults)
  expect(await nearTop(page)).toBeGreaterThan(900)
  // A link an author would write: [see bundles](#bundles--live-examples-read-this)
  await page.evaluate((id) => {
    const a = document.createElement('a')
    a.href = `#${id}`
    a.textContent = 'see bundles'
    a.id = 'in-page-link'
    document.querySelector('.doc-content, [part="content"], main')!.prepend(a)
  }, ID)
  await page.locator('#in-page-link').click()
  await expect.poll(() => nearTop(page)).toBeLessThan(300)
  expect(new URL(page.url()).pathname).toBe('/doc-site-system/')
  expect(new URL(page.url()).hash).toBe(`#${ID}`)
  // still the same page, not a re-mount onto the home doc
  await expect(page.locator(`#${ID}`)).toBeVisible()
})
