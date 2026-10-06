import { test, expect, type Page } from '@playwright/test'

/*
#210 item 3: an example whose whole output is `console.log` was an empty box. What it logged
is now shown where the preview would be — but only when the preview rendered nothing, and
never by writing into `preview`, which example code and `test` blocks own.
*/
async function example(page: Page, id: string, js: string) {
  await page.goto('/component/')
  await page.waitForFunction(() => (window as any).xinjsui?.liveExample)
  await page.evaluate(
    async ({ id, js }) => {
      const ui: any = (window as any).xinjsui
      const ex = ui.liveExample()
      ex.id = id
      document.querySelector('main, body')!.prepend(ex)
      await ex.whenHydrated
      ex.js = js
      await ex.refresh()
      ex.scrollIntoView()
    },
    { id, js }
  )
  return page.locator('#' + id)
}

test('an example that only logs shows its output in place of the empty preview', async ({
  page,
}) => {
  const ex = await example(
    page,
    'logs-only',
    `console.log('hello from the example'); console.warn('careful')`
  )
  const output = ex.locator('[part="output"]')
  await expect(output).toBeVisible()
  await expect(output).toContainText('hello from the example')
  await expect(output.locator('.console-warn')).toHaveText('careful')
  // The preview itself is untouched: still there, still empty.
  expect(
    await ex.locator('.preview').evaluate((el) => el.childNodes.length)
  ).toBe(0)
  // …and it no longer reserves an empty box above the output.
  const previewBox = await ex.locator('.preview').boundingBox()
  expect(previewBox?.height ?? 0).toBeLessThan(2)
})

test('an example that renders keeps its preview; logs stay in the Console tab', async ({
  page,
}) => {
  const ex = await example(
    page,
    'renders',
    `console.log('quiet'); preview.append(Object.assign(document.createElement('b'), { textContent: 'rendered' }))`
  )
  await expect(ex.locator('.preview b')).toHaveText('rendered')
  await expect(ex.locator('[part="output"]')).toBeHidden()
})

test('output steps aside the moment the example renders after all', async ({
  page,
}) => {
  const ex = await example(
    page,
    'late',
    `console.log('loading'); setTimeout(() => preview.append(Object.assign(document.createElement('b'), { textContent: 'arrived' })), 600)`
  )
  const output = ex.locator('[part="output"]')
  await expect(output).toBeVisible()
  await expect(ex.locator('.preview b')).toHaveText('arrived')
  await expect(output).toBeHidden()
})

test('a line logged after the run settles still appears', async ({ page }) => {
  const ex = await example(
    page,
    'async-log',
    `setTimeout(() => console.log('later'), 400)`
  )
  await expect(ex.locator('[part="output"]')).toContainText('later')
})
