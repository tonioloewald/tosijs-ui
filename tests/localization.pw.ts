import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // await page.goto('https://ui.tosijs.net/')
})

test('the title survives hydration unchanged', async ({ page, browser }) => {
  // This asserted /^tosijs-ui$/, went red on the real bug (issue #6: the browser
  // re-derived the title on hydration, ignoring `headTitle`, so the home page flipped
  // to "tosijs-ui — tosijs-ui"), and was then loosened to /tosijs-ui/ — a regex that
  // passes on the doubled value. A guard relaxed to accommodate the bug it exists to
  // catch is not a guard.
  //
  // Assert the INVARIANT, not a literal: whatever the no-JS reader sees in <title> is
  // what must still be there after hydration. (A hard-coded string would only pin
  // today's copy — and did: changing `headTitle` in the README broke it.)
  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await noJs.newPage()
  await staticPage.goto('/')
  const staticTitle = await staticPage.title()
  await noJs.close()

  expect(staticTitle.length).toBeGreaterThan(0)
  // The bug's signature: the project name appearing twice.
  expect(staticTitle).not.toMatch(/tosijs-ui.*tosijs-ui/)

  await page.goto('/')
  await expect(page).toHaveTitle(staticTitle) // pre-hydration
  await page.locator('tosi-doc-system').waitFor({ state: 'attached' })
  await expect(page.locator('.doc-nav .doc-link').first()).toBeVisible()
  await expect(page).toHaveTitle(staticTitle) // post-hydration: unchanged
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
