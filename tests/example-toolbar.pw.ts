import { test, expect } from './fixtures'

/*
The live-example toolbar is the fixture of a <tosi-affix> (1.16.32): a column beside the
preview, moving inside along the bottom when the example is maximized. Re-verified on every
path that rearranges the example (board #3484): the plain example, the inline views
(`{"view": "code"}` and `{"view": "console"}`), maximized, and the full code view.

On each, every toolbar control must be on screen and actually receive a click there (nothing
laid over it: the docked console, the code pane, the preview), and the toolbar must not cover
what it sits beside. The toolbar element itself is `display: contents` (the affix lays out
its controls), so its box is the union of its controls'.
*/

type Box = { x: number; y: number; width: number; height: number }

const byView = (page: any, view: string) =>
  page.locator(`tosi-example[data-options*='"view":"${view}"']`).first()
const plain = (page: any) =>
  page.locator('tosi-example:not([data-options])').first()

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/component/')
  await page.waitForFunction(
    () => document.querySelectorAll('tosi-example[data-options]').length > 0
  )
})

/**
Every control in the example's OWN toolbar is in the viewport and receives a click there.
Returns the toolbar's box and the boxes of the example's other parts, for overlap checks.
*/
async function toolbar(host: any) {
  await expect(
    host.locator('[part="exampleWidgets"] > button').first()
  ).toBeVisible()
  const report = await host.evaluate((el: HTMLElement) => {
    const box = (e: Element | null): Box | null => {
      if (!e) return null
      const r = e.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    }
    const example = el.querySelector(':scope > [part="example"]')!
    const bar = example.querySelector(':scope > [part="exampleWidgets"]')!
    const controls = [...bar.children] as HTMLElement[]
    const rects = controls.map((c) => c.getBoundingClientRect())
    const left = Math.min(...rects.map((r) => r.left))
    const top = Math.min(...rects.map((r) => r.top))
    return {
      bar: {
        x: left,
        y: top,
        width: Math.max(...rects.map((r) => r.right)) - left,
        height: Math.max(...rects.map((r) => r.bottom)) - top,
      },
      controls: controls.map((control, i) => {
        const r = rects[i]
        const hit = document.elementFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2
        )
        return {
          title: control.title,
          inViewport:
            r.width > 0 &&
            r.height > 0 &&
            r.left >= 0 &&
            r.top >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight,
          hit: !!hit && control.contains(hit),
          over: hit ? `${hit.tagName}.${hit.className}` : null,
        }
      }),
      preview: box(example.querySelector(':scope > .preview')),
      console: box(example.querySelector(':scope > .example-console')),
      editors: box(el.querySelector(':scope > .code-editors')),
    }
  })
  expect(report.controls.length).toBe(4)
  for (const control of report.controls)
    expect(control, control.title).toMatchObject({
      inViewport: true,
      hit: true,
    })
  return report as {
    bar: Box
    preview: Box | null
    console: Box | null
    editors: Box | null
  }
}

const overlaps = (a: Box | null, b: Box | null) =>
  !!a &&
  !!b &&
  a.x < b.x + b.width - 1 &&
  b.x < a.x + a.width - 1 &&
  a.y < b.y + b.height - 1 &&
  b.y < a.y + a.height - 1

test('a plain example: the toolbar is a column beside the preview', async ({
  page,
}) => {
  const host = plain(page)
  await host.scrollIntoViewIfNeeded()
  const { bar, preview } = await toolbar(host)
  expect(bar.height).toBeGreaterThan(bar.width)
  expect(overlaps(bar, preview)).toBe(false)
  expect(bar.x).toBeGreaterThanOrEqual(preview!.x + preview!.width - 1)
})

for (const view of ['code', 'console']) {
  test(`view: ${view} — the toolbar stays reachable and off the panes`, async ({
    page,
  }) => {
    const host = byView(page, view)
    await host.scrollIntoViewIfNeeded()
    await expect(host.locator('.code-editors')).toBeVisible()
    if (view === 'console')
      await expect(
        host.locator('[part="example"] > .example-console')
      ).toBeVisible()
    const found = await toolbar(host)
    expect(found.editors).not.toBeNull()
    expect(overlaps(found.bar, found.editors)).toBe(false)
    expect(overlaps(found.bar, found.preview)).toBe(false)
    if (view === 'console') {
      expect(found.console).not.toBeNull()
      expect(overlaps(found.bar, found.console)).toBe(false)
    }
  })
}

test('view: code in a narrow column — the toolbar is reachable on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/component/')
  const host = byView(page, 'code')
  await host.scrollIntoViewIfNeeded()
  await expect(host.locator('.code-editors')).toBeVisible()
  await expect(host).toHaveClass(/-vertical/)
  const found = await toolbar(host)
  expect(overlaps(found.bar, found.editors)).toBe(false)
})

test('maximized: the toolbar moves inside along the bottom, and back', async ({
  page,
}) => {
  const host = plain(page)
  await host.scrollIntoViewIfNeeded()
  const size = host.locator(
    ':scope > [part="example"] > [part="exampleWidgets"] > button[title="toggle preview size"]'
  )
  await size.click()
  await expect(host).toHaveClass(/-maximize/)
  const viewport = page.viewportSize()!
  const max = await toolbar(host)
  // a row along the bottom of the screen
  expect(max.bar.width).toBeGreaterThan(max.bar.height)
  expect(max.bar.y).toBeGreaterThan(viewport.height / 2)
  await expect(size.locator('.show-if-maximized')).toBeVisible()
  await expect(size.locator('.hide-if-maximized')).toBeHidden()
  await size.click()
  await expect(host).not.toHaveClass(/-maximize/)
  const back = await toolbar(host)
  expect(back.bar.height).toBeGreaterThan(back.bar.width)
  expect(overlaps(back.bar, back.preview)).toBe(false)
})

test('the full code view: the toolbar is reachable beside the open code', async ({
  page,
}) => {
  const host = plain(page)
  await host.scrollIntoViewIfNeeded()
  await host
    .locator(
      ':scope > [part="example"] > [part="exampleWidgets"] > button[title="view/edit code"]'
    )
    .click()
  await expect(host).toHaveClass(/-maximize/)
  await expect(host.locator('.code-editors')).toBeVisible()
  const found = await toolbar(host)
  expect(overlaps(found.bar, found.editors)).toBe(false)
})
