import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('https://localhost:8787/')
  // await page.goto('https://ui.tosijs.net/')
})

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle(/^tosijs-ui$/)
})

test('localize works', async ({ page }) => {
  // Open settings menu, then Language submenu (first menu item)
  await page.locator('button[title="links and settings"]').click()
  await page.locator('xin-float button').first().click()
  await page.getByTitle('fi').click()
  await expect(page.getByText('suodattaa')).toBeVisible()

  // Switch back to English (menu text is now localized, so use first button)
  await page.locator('button[title="links and settings"]').click()
  await page.locator('xin-float button').first().click()
  await page.getByTitle('en-US').click()
  await expect(page.locator('xin-localized').getByText('example')).toBeVisible()
})
