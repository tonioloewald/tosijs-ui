import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // await page.goto('https://ui.tosijs.net/')
})

test('has title', async ({ page }) => {
  // The doc-browser rewrites document.title per-doc (`<doc> — tosijs-ui`) once it
  // hydrates, and the background inline-test runner cycles docs, so only the
  // project name is stable — assert it's present rather than an exact match.
  await expect(page).toHaveTitle(/tosijs-ui/)
})

test('localize works', async ({ page }) => {
  // The settings menu is `localized: true`, so its own captions translate — a
  // reliably-visible localization signal that (unlike nav entries) never sits
  // inside a collapsed group. "Color Theme" ⇄ "Väriteema" (Finnish).
  const openSettings = () => page.locator('button[title="settings"]').click()
  // Anchor the Language item on its globe icon (circle r=10 — unique among the
  // settings-menu icons) so it's locale-independent even after "Language"
  // becomes "Kieli".
  const languageItem = page.locator('tosi-float button', {
    has: page.locator('svg circle[r="10"]'),
  })
  // Locale flags are `<span title="fi">…`; exact + tosi-float scope so the match
  // can't leak to unrelated titled elements (e.g. a dev overlay's "Filter
  // events…" control that a substring `fi` match would also hit).
  const localeOption = (locale: string) =>
    page.locator('tosi-float').getByTitle(locale, { exact: true })
  const menuCaption = (text: string) =>
    page.locator('tosi-float').getByText(text, { exact: true })

  // Switch to Finnish, then reopen the menu to see its captions localized.
  await openSettings()
  await languageItem.click()
  await localeOption('fi').click()
  await openSettings()
  await expect(menuCaption('Väriteema')).toBeVisible()

  // Switch back to English (globe item still works — locale-independent anchor).
  await languageItem.click()
  await localeOption('en-US').click()
  await openSettings()
  await expect(menuCaption('Color Theme')).toBeVisible()
})
