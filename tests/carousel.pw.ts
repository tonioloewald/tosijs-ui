import { test, expect } from '@playwright/test'

/*
#204: the dots are 8px but must be tappable at ~44px, and a resize must not leave the carousel
resting between slides. Both need real layout, so they live here rather than in happy-dom.
*/
test.beforeEach(async ({ page }) => {
  await page.goto('/carousel/')
  await page.locator('tosi-carousel').first().scrollIntoViewIfNeeded()
})

test('a tap on, or just above or below, each dot hits that dot and no other', async ({
  page,
}) => {
  const results = await page
    .locator('tosi-carousel')
    .first()
    .evaluate((carousel: any) => {
      const dots = [
        ...carousel.shadowRoot.querySelectorAll('.dot'),
      ] as Element[]
      // by index, not identity: render() rebuilds the dots
      const hitIndex = (x: number, y: number) =>
        dots.indexOf(carousel.shadowRoot.elementFromPoint(x, y))
      return dots.map((dot, index) => {
        const box = dot.getBoundingClientRect()
        const cx = box.left + box.width / 2
        const cy = box.top + box.height / 2
        // the drawn dot is 8px; 15px above or below is outside it
        return {
          index,
          height: box.height,
          center: hitIndex(cx, cy),
          above: hitIndex(cx, cy - 15),
          below: hitIndex(cx, cy + 15),
        }
      })
    })
  expect(results.length).toBeGreaterThan(1)
  for (const r of results) {
    expect(r.height).toBeGreaterThanOrEqual(44)
    expect([r.center, r.above, r.below]).toEqual([r.index, r.index, r.index])
  }
})

test('a resize re-seats the current slide instead of resting between two', async ({
  page,
}) => {
  const carousel = page.locator('tosi-carousel').first()
  await carousel.evaluate((c: any) => {
    c.auto = 0
    c.page = 2
  })
  await page.waitForTimeout(800) // the snap animation
  await page.setViewportSize({ width: 700, height: 800 })
  await page.waitForTimeout(400)
  const { scrollLeft, expected } = await carousel.evaluate((c: any) => {
    const scroller = c.shadowRoot.querySelector('[part="scroller"]')
    return {
      scrollLeft: scroller.scrollLeft,
      expected: c.page * scroller.offsetWidth,
    }
  })
  expect(Math.abs(scrollLeft - expected)).toBeLessThan(2)
})
