import { test, expect } from '@playwright/test'

/*
#216: a fence opens its example with the code showing, in the page.

The unit tests cover the state. What only a browser can show is the claim itself: two panes
side by side, neither full-screen, and a console you can type into where the preview was.
*/
const example = (page: any, view: string) =>
  page.locator(`tosi-example[data-options*='"view":"${view}"']`)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/component/')
  await page.waitForFunction(
    () => document.querySelectorAll('tosi-example[data-options]').length > 0
  )
})

test('view: code shows the preview beside the editor, in the page', async ({
  page,
}) => {
  const host = example(page, 'code')
  await host.scrollIntoViewIfNeeded()
  const editors = host.locator('.code-editors')
  await expect(editors).toBeVisible()
  await expect(host).not.toHaveClass(/-maximize/)
  const button = host.locator('.preview button')
  await expect(button).toBeVisible()
  const [left, right, whole] = await Promise.all([
    host.locator('.preview').boundingBox(),
    editors.boundingBox(),
    host.boundingBox(),
  ])
  // Side by side, inside the example's own box, which is nowhere near the viewport's size.
  expect(right!.x).toBeGreaterThanOrEqual(left!.x + left!.width - 1)
  expect(whole!.height).toBeLessThan(500)
  // The way out is on screen: at the reading column's width the tab bar used to push it off.
  const close = await host.locator('button[title="close code"]').boundingBox()
  // +1: WebKit reports the flush-right button a 64th of a pixel past the box.
  expect(close!.x + close!.width).toBeLessThanOrEqual(
    whole!.x + whole!.width + 1
  )
  // The example still works with the code open.
  await button.click()
  await expect(button).toHaveText('clicked 1 times')
})

test('view: console puts a working console where the preview would be', async ({
  page,
}) => {
  const host = example(page, 'console')
  await host.scrollIntoViewIfNeeded()
  const dock = host.locator('[part="example"] > .example-console')
  await expect(dock).toBeVisible()
  await expect(host).not.toHaveClass(/-maximize/)
  await expect(dock).toContainText('total is 6')
  const [left, right] = await Promise.all([
    dock.boundingBox(),
    host.locator('.code-editors').boundingBox(),
  ])
  expect(right!.x).toBeGreaterThanOrEqual(left!.x + left!.width - 1)
  // Type a line, see the answer, in the example's own scope.
  const field = dock.locator('textarea')
  await field.fill('total * 2')
  await field.press('Enter')
  await expect(dock.locator('.console-result').last()).toHaveText('12')
  // Closing the code returns the example to what it would otherwise have shown.
  await host.locator('button[title="close code"]').click()
  await expect(host.locator('.code-editors')).toBeHidden()
  await expect(dock).toHaveCount(0)
})

test('in a narrow column the two panes stack', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/component/')
  const host = example(page, 'code')
  await host.scrollIntoViewIfNeeded()
  const editors = host.locator('.code-editors')
  await expect(editors).toBeVisible()
  const [top, bottom] = await Promise.all([
    host.locator('[part="example"]').boundingBox(),
    editors.boundingBox(),
  ])
  expect(bottom!.y).toBeGreaterThanOrEqual(top!.y + top!.height - 1)
  expect(top!.height).toBeGreaterThan(200)
})
