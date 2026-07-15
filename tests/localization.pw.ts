import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('https://localhost:8787/')
  // await page.goto('https://ui.tosijs.net/')
})

test('the title has no doubled project name (issue #6)', async ({ page }) => {
  // beforeEach navigated with JS on, so this is the HYDRATED title. The bug: the
  // doc-browser re-suffixed a title that already contained the project name, so the
  // home page flipped to "tosijs-ui — tosijs-ui" the moment the bundle loaded. The
  // static generator and the runtime now share one `pageTitle` rule (doc-title.ts).
  const title = await page.title()
  expect(title.length).toBeGreaterThan(0)
  expect(title).not.toMatch(/tosijs-ui.*tosijs-ui/i)
})

test('localize works', async ({ page }) => {
  // Open settings menu, then Language submenu (first menu item)
  await page.locator('button[title="links and settings"]').click()
  await page.locator('tosi-float button').first().click()
  await page.getByTitle('fi').click()
  await expect(page.getByText('suodattaa')).toBeVisible()

  // Switch back to English (menu text is now localized, so use first button)
  await page.locator('button[title="links and settings"]').click()
  await page.locator('tosi-float button').first().click()
  await page.getByTitle('en-US').click()
  await expect(page.locator('tosi-localized').getByText('example')).toBeVisible()
})
