import { test, expect } from '@playwright/test'

/*
The doc nav's search field has its own clear button: `type="search"` alone gave one only in
some browsers and states (Chromium while focused, Safari with text, Firefox never).

(The native button is hidden by `::-webkit-search-cancel-button { display: none }`. That isn't
asserted here: getComputedStyle cannot read that pseudo-element — Chromium returns the input's
own display. It was checked by screenshot instead.)
*/
test.beforeEach(async ({ page }) => {
  await page.goto('/menu/')
})

const field = (page: any) =>
  page.locator('input[type="search"][aria-label="Search documentation"]')
const clear = (page: any) => page.locator('.nav-search-clear')

test('the clear button shows with text, in every browser, and clears the filter', async ({
  page,
}) => {
  await expect(clear(page)).toBeHidden()
  await field(page).fill('menu')
  await page.mouse.move(0, 0) // not hovering, and…
  await page.locator('body').click({ position: { x: 600, y: 400 } }) // …not focused
  await expect(clear(page)).toBeVisible()
  await clear(page).click()
  await expect(field(page)).toHaveValue('')
  await expect(field(page)).toBeFocused()
  await expect(clear(page)).toBeHidden()
})

test('Escape clears the search', async ({ page }) => {
  await field(page).fill('menu')
  await field(page).press('Escape')
  await expect(field(page)).toHaveValue('')
  await expect(clear(page)).toBeHidden()
})
