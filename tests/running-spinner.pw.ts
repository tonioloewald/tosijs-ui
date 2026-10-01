import { test, expect, type Page } from '@playwright/test'

/*
The spinner a `run` dialect shows while pending (1.16.2), checked where it is SEEN: a real
browser, not happy-dom. It must be visible, centred over the example, and still under
prefers-reduced-motion.
*/
async function startSlowRun(page: Page) {
  await page.goto('/component/')
  await page.waitForFunction(() => (window as any).xinjsui?.registerDialect)
  await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    ui.registerDialect('pwslow', {
      run: () => new Promise((r) => setTimeout(() => r('ok'), 4000)),
    })
    const ex = ui.liveExample()
    ex.id = 'spinner-under-test'
    document.querySelector('main, body')!.prepend(ex)
    await ex.whenHydrated
    await new Promise((r) => setTimeout(r, 100))
    ex.dialect = 'pwslow'
    ex.js = 'wait'
    void ex.refresh()
    ex.scrollIntoView()
  })
  return page.locator('#spinner-under-test')
}

test('a pending run shows a spinning ring, centred over the example', async ({
  page,
}) => {
  const example = await startSlowRun(page)
  const spinner = example.locator('[part="running"]')
  await expect(spinner).toBeVisible({ timeout: 2000 })
  const outer = (await example.locator('[part="example"]').boundingBox())!
  const ring = (await spinner.boundingBox())!
  const dx = ring.x + ring.width / 2 - (outer.x + outer.width / 2)
  const dy = ring.y + ring.height / 2 - (outer.y + outer.height / 2)
  expect(Math.abs(dx)).toBeLessThan(2)
  expect(Math.abs(dy)).toBeLessThan(2)
  expect(
    await spinner.evaluate((el) => getComputedStyle(el).animationName)
  ).toBe('tosi-example-spin')
})

test('under prefers-reduced-motion it is a still ring', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const example = await startSlowRun(page)
  const spinner = example.locator('[part="running"]')
  await expect(spinner).toBeVisible({ timeout: 2000 })
  await expect(spinner).toHaveClass(/still/)
  expect(
    await spinner.evaluate((el) => getComputedStyle(el).animationName)
  ).toBe('none')
})
