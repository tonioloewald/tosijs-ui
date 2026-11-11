import { test, expect } from './fixtures'

/*
<tosi-splitter>: drag and keyboard divide two flex neighbours' space, never below the minimum
size or the items' own min-width, in a row or a column. And the live example's code view
uses one between the preview and the code.
*/

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/splitter/')
  await page.waitForSelector('.split-row tosi-splitter[aria-orientation]')
})

const rowSplitter = (page: any) => page.locator('.split-row tosi-splitter')
const width = (page: any, selector: string) =>
  page
    .locator(selector)
    .evaluate((el: HTMLElement) => el.getBoundingClientRect().width)

test('a row splitter is a narrow vertical separator with a col-resize cursor', async ({
  page,
}) => {
  const splitter = rowSplitter(page)
  await expect(splitter).toHaveAttribute('role', 'separator')
  await expect(splitter).toHaveAttribute('aria-orientation', 'vertical')
  await expect(splitter).toHaveCSS('cursor', 'col-resize')
  const box = (await splitter.boundingBox())!
  expect(box.width).toBeLessThan(10)
  await expect(page.locator('.split-column tosi-splitter')).toHaveCSS(
    'cursor',
    'row-resize'
  )
})

test('dragging moves the boundary, and the ratio survives the container resizing', async ({
  page,
}) => {
  const splitter = rowSplitter(page)
  const left = '.split-row section:first-child'
  const before = await width(page, left)
  const box = (await splitter.boundingBox())!
  const changes = await page.evaluate(() => {
    ;(window as any).__changes = 0
    document
      .querySelector('.split-row tosi-splitter')!
      .addEventListener('change', () => (window as any).__changes++)
  })
  void changes
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, {
    steps: 5,
  })
  await page.mouse.up()
  expect(Math.round((await width(page, left)) - before)).toBe(60)
  expect(await page.evaluate(() => (window as any).__changes)).toBe(1)
  await expect(splitter).toBeFocused()

  const share = await splitter.evaluate((el: any) => el.value)
  await page
    .locator('.split-row')
    .evaluate((el: HTMLElement) => (el.style.width = '300px'))
  const after = await splitter.evaluate((el: any) => el.value)
  expect(Math.abs(after - share)).toBeLessThan(0.02)
})

test('keys move it by step; Home and End stop at the minimums', async ({
  page,
}) => {
  const splitter = rowSplitter(page)
  const left = '.split-row section:first-child'
  const right = '.split-row section:last-child'
  await splitter.focus()
  const before = await width(page, left)
  await page.keyboard.press('ArrowRight')
  expect(Math.round((await width(page, left)) - before)).toBe(16)
  await page.keyboard.press('Shift+ArrowLeft')
  expect(Math.round((await width(page, left)) - before)).toBe(16 - 64)

  // The default minimum: 44px.
  await page.keyboard.press('End')
  expect(Math.round(await width(page, right))).toBe(44)
  await expect(splitter).toHaveAttribute('aria-valuenow', /^\d+$/)

  // An item's own larger min-width wins.
  await page
    .locator(left)
    .evaluate((el: HTMLElement) => (el.style.minWidth = '120px'))
  await page.keyboard.press('Home')
  expect(Math.round(await width(page, left))).toBe(120)

  // Double-click restores what the items' own styles give them.
  await splitter.dblclick()
  const [l, r] = [await width(page, left), await width(page, right)]
  expect(Math.abs(l - r)).toBeLessThan(2)
})

test('the minimums hold as the container shrinks, and the split comes back as it grows', async ({
  page,
}) => {
  const splitter = rowSplitter(page)
  const row = page.locator('.split-row')
  const right = '.split-row section:last-child'
  await row.evaluate((el: HTMLElement) => (el.style.width = '600px'))
  await splitter.evaluate((el: any) => (el.value = 0.8))
  const chosen = await splitter.evaluate((el: any) => el.value)

  // At 200px, 80% would leave the right side about 39px.
  await row.evaluate((el: HTMLElement) => (el.style.width = '200px'))
  await expect.poll(async () => Math.round(await width(page, right))).toBe(44)

  await row.evaluate((el: HTMLElement) => (el.style.width = '600px'))
  await expect
    .poll(async () => splitter.evaluate((el: any) => el.value))
    .toBeCloseTo(chosen, 2)

  // Too small for both minimums: left alone, not thrashed.
  await row.evaluate((el: HTMLElement) => (el.style.width = '60px'))
  await page.waitForTimeout(100)
  const pinned = await width(page, right)
  await page.waitForTimeout(100)
  expect(await width(page, right)).toBe(pinned)
})

test('a column splitter moves along the column', async ({ page }) => {
  const splitter = page.locator('.split-column tosi-splitter')
  const top = page.locator('.split-column section:first-child')
  const height = () =>
    top.evaluate((el: HTMLElement) => el.getBoundingClientRect().height)
  await splitter.focus()
  const before = await height()
  await page.keyboard.press('ArrowDown')
  expect(Math.round((await height()) - before)).toBe(16)
})

test("the live example's code view has a splitter between the preview and the code", async ({
  page,
}) => {
  const example = page.locator('tosi-example').first()
  const splitter = example.locator('> tosi-splitter')
  await expect(splitter).toBeHidden()
  await example.evaluate((el: any) => el.showInline('code'))
  await expect(splitter).toBeVisible()
  const preview = example.locator('> [part="example"]')
  const before = (await preview.boundingBox())!
  const box = (await splitter.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2, {
    steps: 5,
  })
  await page.mouse.up()
  const after = (await preview.boundingBox())!
  expect(Math.round(after.width - before.width)).toBe(50)

  await example.evaluate((el: any) => el.closeCode())
  await expect(splitter).toBeHidden()
})
