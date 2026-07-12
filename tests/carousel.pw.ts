import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // await page.goto('https://ui.tosijs.net/')
})

test('carousel works', async ({ page }) => {
  // Go straight to the carousel doc — the nav entry now lives under a
  // collapsed "Components" group, and this test is about the component, not
  // nav disclosure. Path routing serves a real pre-rendered page that hydrates.
  await page.goto('/carousel/')
  await expect(page.locator('h1')).toHaveText('carousel')

  // the constructor needs to have run successfully for these to be true
  await expect(page.locator('tosi-carousel')).toHaveAttribute(
    'aria-roledescription',
    'carousel'
  )
  await expect(page.locator('tosi-carousel')).toHaveAttribute(
    'aria-orientation',
    'horizontal'
  )

  // verify carousel has items and navigation works
  const carousel = page.locator('tosi-carousel')
  await expect(carousel.locator('tosi-icon').first()).toBeVisible()
  await page.getByRole('button', { name: 'next slide' }).click()
  // carousel should still be functional after navigation
  await expect(carousel).toHaveAttribute('aria-roledescription', 'carousel')
})
