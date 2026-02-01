import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('https://localhost:8787/')
  // await page.goto('https://ui.tosijs.net/')
})

test('carousel works', async ({ page }) => {
  await page.getByText('carousel').click()
  await expect(page.locator('h1')).toHaveText('carousel')

  // the constructor needs to have run successfully for these to be true
  await expect(page.locator('xin-carousel')).toHaveAttribute(
    'aria-roledescription',
    'carousel'
  )
  await expect(page.locator('xin-carousel')).toHaveAttribute(
    'aria-orientation',
    'horizontal'
  )

  // verify carousel has items and navigation works
  const carousel = page.locator('xin-carousel')
  await expect(carousel.locator('xin-icon').first()).toBeVisible()
  await page.getByRole('button', { name: 'next slide' }).click()
  // carousel should still be functional after navigation
  await expect(carousel).toHaveAttribute('aria-roledescription', 'carousel')
})
