import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Go straight to the form doc. Its nav link lives inside a collapsed nav
  // section, and this test is about the form component, not navigation —
  // nav-link navigation is covered by doc-system.pw.ts.
  await page.goto('/form/')
  // await page.goto('https://ui.tosijs.net/form/')
})

test('forms work', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('forms')

  // The doc's first example has <tosi-field caption="Required field">; the
  // field renders a real <label>, so it's reachable by its caption.
  await expect(page.getByLabel('Required field').first()).toHaveValue('')
  // await expect(page.locator('tosi-form')).toBeVisible()
})
