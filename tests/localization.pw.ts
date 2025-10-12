import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('https://localhost:8787/')
  // await page.goto('https://ui.tosijs.net/')
})

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle(/^tosijs-ui$/)
})

test('localize works', async ({ page }) => {
  await page.locator('xin-locale-picker button').click()
  await page.getByTitle('fi').click()
  await expect(page.getByText('suodattaa')).toBeVisible()

  await page.locator('xin-locale-picker button').click()
  await page.getByTitle('en-US').click()
  await expect(page.getByText('example')).toBeVisible()
})
