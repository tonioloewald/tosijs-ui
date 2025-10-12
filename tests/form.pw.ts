import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('https://localhost:8787/')
  // await page.goto('https://ui.tosijs.net/')
})

test('forms work', async ({ page }) => {
  await page.getByText('forms').click()
  await expect(page.locator('h1')).toHaveText('forms')

  await expect(page.getByLabel('Required Field')).toHaveValue('')
  // await expect(page.locator('xin-form')).toBeVisible()
})
