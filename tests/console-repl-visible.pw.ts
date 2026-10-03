import { test, expect, devices } from '@playwright/test'

/*
The Console tab's REPL input lives at the very bottom of the full-screen code panel. Sized
100vh, that bottom sat under iPhone Safari's toolbar and the REPL couldn't be seen (1.16.4,
found by the maintainer on an iPhone). Sized 100dvh, the panel ends where the visible area does.
*/
const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } =
  devices['iPhone 13']
test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent })

test('the REPL input is inside the visible viewport when the code panel is open', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'firefox',
    'Playwright has no mobile emulation in Firefox'
  )
  await page.goto('/component/')
  const example = page
    .locator('tosi-example', { hasText: 'words logged' })
    .first()
  await example.scrollIntoViewIfNeeded()
  await example.evaluate((e: any) => e.showCode())
  await example.getByText('Console', { exact: true }).first().click()
  const field = example.locator('textarea.console-field')
  await expect(field).toBeVisible()
  const box = (await field.boundingBox())!
  const visibleBottom = await page.evaluate(
    () => window.visualViewport!.offsetTop + window.visualViewport!.height
  )
  expect(box.y + box.height).toBeLessThanOrEqual(visibleBottom + 1)
  // and the panel itself uses the dynamic viewport unit
  expect(
    await example.evaluate((e: Element) => getComputedStyle(e).height)
  ).toBe(`${await page.evaluate(() => window.innerHeight)}px`)
})
