import { test, expect } from '@playwright/test'

/*
Cover for the `layout` page metadata (#105): a route can opt out of the reading column.

The measure is the default for a reason — 44em is roughly what people read comfortably — so
these assert BOTH directions. A feature that makes every page wide would pass a test that only
ever checks the wide one.
*/

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

/*
Reads the attribute off `<tosi-doc-system>`, which is where BOTH the static generator and the
doc-browser put it — and specifically not off `.doc-content`'s parent, which is a wrapper div
that hydration inserts. An earlier version of this helper read the div and reported a layout
the styles were not using, which made a broken navigation look fine.
*/
const contentWidth = (page: any) =>
  page.evaluate(() => {
    const el = document.querySelector('.doc-content') as HTMLElement
    const host = el.closest('tosi-doc-system') as HTMLElement
    return {
      content: Math.round(el.getBoundingClientRect().width),
      // The box the content sits IN, which excludes the nav. `full-width` keeps the nav by
      // design, so measuring against the whole doc-system would be measuring the nav too.
      available: Math.round(
        (el.parentElement as HTMLElement).getBoundingClientRect().width
      ),
      host: Math.round(host.getBoundingClientRect().width),
      layout: host.getAttribute('data-layout') ?? null,
    }
  })

test('a page with layout: full-width fills the available width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  const m = await contentWidth(page)
  expect(m.layout).toBe('full-width')
  /*
  Measured against the HOST rather than a pixel count: the point is "it is not held to the
  reading column", and the host box already accounts for the nav and the padding. A hard number
  would encode this viewport and this nav width, neither of which the feature is about.
  */
  expect(
    m.content,
    `full-width content should fill its container: ${JSON.stringify(m)}`
  ).toBeGreaterThan(m.available * 0.95)
  // And it must actually be wide — filling a container that happens to be narrow would
  // satisfy the line above while proving nothing.
  expect(m.content).toBeGreaterThan(900)
})

test('a page without it keeps the reading column', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/data-table/')
  const m = await contentWidth(page)
  expect(m.layout).toBe(null)
  // 44em at a normal root size is well under 900px; the host at this viewport is far wider.
  expect(
    m.content,
    `prose must stay in its measure: ${JSON.stringify(m)}`
  ).toBeLessThan(900)
  expect(m.content).toBeLessThan(m.available * 0.9)
})

test('the layout is right on FIRST PAINT, before hydration', async ({
  page,
}) => {
  /*
  The reason it is stamped into the served HTML rather than applied on load. A layout applied
  by script shows the reading column first and snaps wide — the same flicker class the
  nav-hydration fix chased in 1.7.3. Asserting it on the raw markup is the only way to catch a
  regression to "apply it in showDoc and hope".
  */
  const html = await (await page.request.get('/')).text()
  expect(html).toContain('data-layout="full-width"')
})

test('SPA navigation moves the layout with the page, both ways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  expect((await contentWidth(page)).layout).toBe('full-width')

  // full-width -> prose: the measure must come BACK, which is the direction a naive
  // "set the attribute when the doc asks for it" implementation forgets.
  await page.evaluate(() =>
    (
      document.querySelector('a.doc-link[href="/data-table/"]') as HTMLElement
    )?.click()
  )
  await expect
    .poll(async () => (await contentWidth(page)).layout, { timeout: 15_000 })
    .toBe(null)
  const prose = await contentWidth(page)
  expect(prose.content).toBeLessThan(prose.available * 0.9)

  // prose -> full-width again
  await page.evaluate(() =>
    (document.querySelector('a.doc-link[href="/"]') as HTMLElement)?.click()
  )
  await expect
    .poll(async () => (await contentWidth(page)).layout, { timeout: 15_000 })
    .toBe('full-width')
})
