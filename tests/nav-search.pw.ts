import { test, expect } from './fixtures'

/*
The doc browser's search is a palette (board #3454): the field in the nav opens a centred modal
of results ranked by rough relevance, and you navigate from those. It no longer filters the
sidebar (the maintainer's call, 2026-10-21).
*/
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/menu/')
})

const trigger = (page: any) =>
  page.locator('tosi-palette.doc-search .palette-trigger')
const dialog = (page: any) => page.locator('tosi-palette.doc-search dialog')
const query = (page: any) =>
  page.locator('tosi-palette.doc-search .palette-input')
const options = (page: any) =>
  page.locator('tosi-palette.doc-search [role="option"]')

test('the nav search opens a centred palette, and the sidebar is not filtered', async ({
  page,
}) => {
  const navLinks = await page.locator('.doc-nav a:visible').count()
  await expect(trigger(page)).toHaveAccessibleName(/Search documentation/)
  await trigger(page).click()
  await expect(dialog(page)).toBeVisible()
  await expect(query(page)).toBeFocused()
  // Before typing: quick links.
  await expect(
    page.locator('tosi-palette.doc-search .palette-group').first()
  ).toHaveText('Quick links')
  await query(page).fill('select')
  const box = (await dialog(page).boundingBox())!
  const viewport = page.viewportSize()!
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2)
  // The page whose title IS the query comes first.
  await expect(options(page).first().locator('.palette-title')).toHaveText(
    'select'
  )
  // Typing does not touch the sidebar.
  expect(await page.locator('.doc-nav a:visible').count()).toBe(navLinks)
})

test('Enter navigates to the chosen page and closes the palette', async ({
  page,
}) => {
  await trigger(page).click()
  await query(page).fill('select')
  await expect(options(page).first()).toHaveClass(/-active/)
  await query(page).press('Enter')
  await expect(dialog(page)).toBeHidden()
  await expect(page).toHaveURL(/\/select\/$/)
})

test('arrow keys move through results; Escape closes and returns focus', async ({
  page,
}) => {
  await trigger(page).click()
  await query(page).fill('menu')
  await expect(options(page).first()).toHaveClass(/-active/)
  await query(page).press('ArrowDown')
  await expect(options(page).nth(1)).toHaveClass(/-active/)
  await expect(query(page)).toHaveAttribute(
    'aria-activedescendant',
    (await options(page).nth(1).getAttribute('id'))!
  )
  await query(page).press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect(trigger(page)).toBeFocused()
})

test('the shortcut opens it from anywhere on the page', async ({ page }) => {
  await page.locator('body').click({ position: { x: 600, y: 400 } })
  await page.keyboard.press('ControlOrMeta+k')
  await expect(dialog(page)).toBeVisible()
  await expect(query(page)).toBeFocused()
})

test('the search sits in the header, not the sidebar, and shrinks to its icon when squeezed', async ({
  page,
}) => {
  await expect(page.locator('header > tosi-palette.doc-search')).toHaveCount(1)
  await expect(page.locator('.doc-nav tosi-palette, .nav-search')).toHaveCount(
    0
  )
  const palette = page.locator('header > tosi-palette.doc-search')
  await expect(palette).not.toHaveClass(/-icon/)
  await expect(palette.locator('.palette-trigger-label')).toBeVisible()
  // Narrow enough that, even with the header links moved into the menu, the field has no room.
  await page.setViewportSize({ width: 320, height: 700 })
  await expect(palette).toHaveClass(/-icon/)
  await expect(palette.locator('.palette-trigger-label')).toBeHidden()
  // still opens, as an icon
  await trigger(page).click()
  await expect(dialog(page)).toBeVisible()
  await query(page).press('Escape')
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(palette).not.toHaveClass(/-icon/)
})

test('on a page with no header, the shortcut still opens the search', async ({
  page,
}) => {
  await page.goto('/no-header-demo/')
  await expect(page.locator('header')).toBeHidden()
  await expect(trigger(page)).toBeHidden()
  await page.locator('body').click({ position: { x: 600, y: 400 } })
  await page.keyboard.press('ControlOrMeta+k')
  await expect(dialog(page)).toBeVisible()
  await query(page).fill('menu')
  await query(page).press('Enter')
  await expect(page).toHaveURL(/\/menu\/$/)
  // back in the header on a page that has one
  await expect(page.locator('header > tosi-palette.doc-search')).toHaveCount(1)
})

/** WCAG contrast of two computed CSS colours (rgb/rgba). */
function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
    const f = (v: number) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl)
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

for (const theme of ['light', 'dark'] as const) {
  test(`palette text is readable in the header's subtree (${theme})`, async ({
    page,
  }) => {
    // The header recolours --text-color to white for the brand bar; the dialog lives under it.
    await page.addInitScript((theme) => {
      localStorage.setItem(
        'tosi-doc-system-prefs',
        JSON.stringify({ theme, highContrast: false, locale: '' })
      )
    }, theme)
    await page.goto('/menu/')
    await trigger(page).click()
    await query(page).fill('menu')
    const [fg, bg, group] = await page.evaluate(() => {
      const dialog = document.querySelector('tosi-palette.doc-search dialog')!
      const title = dialog.querySelector(
        '[role="option"]:not(.-active) .palette-title'
      )!
      return [
        getComputedStyle(title).color,
        getComputedStyle(dialog).backgroundColor,
        getComputedStyle(dialog.querySelector('.palette-input')!).color,
      ]
    })
    expect(contrast(fg, bg)).toBeGreaterThan(4.5)
    expect(contrast(group, bg)).toBeGreaterThan(4.5)
  })
}

test('on a narrow header the links move into the settings menu', async ({
  page,
}) => {
  const links = page.locator('header > .header-link')
  await expect(links.first()).toBeVisible()
  await page.setViewportSize({ width: 390, height: 800 })
  await expect(links.first()).toBeHidden()
  await page.locator('header button[title="settings"]').click()
  await expect(
    page.locator('tosi-menu .tosi-menu-item, .tosi-menu-item').filter({
      hasText: /github/i,
    })
  ).toHaveCount(1)
})
