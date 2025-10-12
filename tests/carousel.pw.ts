import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('https://localhost:8787/')
  // await page.goto('https://ui.tosijs.net/')
})

test('carousel works', async ({ page }) => {
  await page.getByText('carousel').click()
  await expect(page.locator('h1')).toHaveText('carousel')

  // the constructor needs to have run successfull for these to be true
  await expect(page.locator('xin-carousel')).toHaveAttribute(
    'aria-roledescription',
    'carousel'
  )
  await expect(page.locator('xin-carousel')).toHaveAttribute(
    'aria-orientation',
    'horizontal'
  )

  await expect(page.getByText('item 2')).toBeVisible()
  await page.getByRole('button', { name: 'Next Slide' }).click()
  await expect(page.getByText('item 4')).toBeVisible()
})
