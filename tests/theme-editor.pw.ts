import { existsSync, readFileSync, rmSync } from 'node:fs'
import { test, expect } from './fixtures'

/*
<tosi-theme-editor> with real typing (its fields are in a shadow root, where the creator's
delegated `on…` handlers never hear a `change`), and the doc site's "Theme Editor…" panel:
offered on localhost, applied live, saved through /__docstore/source to the lane's scratch
theme file, never the repo's.
*/

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

test('typing a value applies it, and a mode button previews that mode', async ({
  page,
}) => {
  await page.goto('/theme-editor/')
  const editor = page.locator('tosi-example tosi-theme-editor').first()
  await expect(editor.locator('[data-name="accent"]')).toBeVisible()
  const button = page.locator('.theme-editor-demo button').first()

  const accent = editor.locator('[data-name="accent"] input[type="text"]')
  await accent.fill('#0064d2')
  await accent.press('Tab')
  await expect(button).toHaveCSS('background-color', 'rgb(0, 100, 210)')
  await expect(editor.locator('[data-name="accent"]')).toHaveClass(/-tuned/)

  const corners = editor.locator(
    '[data-name="tosi-border-radius"] input[type="text"]'
  )
  await corners.fill('12px')
  await corners.press('Enter')
  await expect(button).toHaveCSS('border-radius', '12px')

  // Mounting changed nothing; picking a mode previews it.
  await expect(page.locator('html')).not.toHaveClass(/high-contrast/)
  await editor.locator('[data-mode="highContrast"]').click()
  await expect(page.locator('html')).toHaveClass(/high-contrast/)
  await expect(editor.locator('[data-mode="highContrast"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  )

  await editor.locator('[part="reset"]').click()
  await expect(button).toHaveCSS('border-radius', '4px')
})

test('the settings menu opens the theme editor above Color Theme, and Save posts the theme', async ({
  page,
  browserName,
}) => {
  // The engines run at once against one scratch file: each saves its own colour, so a theme
  // another engine just saved never looks like this edit already made.
  const colours = { chromium: '#0b7a5c', firefox: '#7a5c0b', webkit: '#5c0b7a' }
  const colour = colours[browserName]
  // The lane's server saves the theme to a scratch file (playwright.config.ts), never the
  // repo's: WebKit does not route every request, so an intercept was not a guarantee.
  const scratch = 'test-results/e2e-theme.json'
  rmSync(scratch, { force: true })
  // The menu offers the editor once the page has asked whether it may save the theme.
  const asked = page.waitForResponse(
    (response) =>
      response.url().includes('/__docstore/source') &&
      response.request().method() === 'HEAD'
  )
  await page.goto('/splitter/')
  await asked
  await page.waitForSelector('tosi-doc-system header')
  await page.locator('header button:has(svg)').last().click()

  // Directly above Color Theme.
  const editorItem = (await page.getByText('Theme Editor…').boundingBox())!
  const colorItem = (await page.getByText('Color Theme').boundingBox())!
  expect(colorItem.y).toBeGreaterThan(editorItem.y)
  expect(colorItem.y - editorItem.y).toBeLessThan(editorItem.height * 2)

  await page.getByText('Theme Editor…').click()
  const panel = page.locator('.theme-editor-panel')
  const accent = panel.locator('[data-name="accent"] input[type="text"]')
  await accent.fill(colour)
  await accent.press('Enter')
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.body).getPropertyValue('--brand-color')
      )
    )
    .toBe(colour)
  await expect(panel.locator('.theme-panel-status')).toHaveText('Not saved')

  await panel.getByRole('button', { name: 'Save' }).click()
  await expect(panel.locator('.theme-panel-status')).toHaveText(
    `Saved to ${scratch}`
  )
  // Another engine may have saved since; the file holds a theme, and one of ours.
  expect(Object.values(colours)).toContain(
    JSON.parse(readFileSync(scratch, 'utf8')).base.accent
  )
  expect(existsSync('tosijs-theme.json')).toBe(false)

  // Closing takes the preview away.
  await panel.getByRole('button', { name: 'Close the theme editor' }).click()
  await expect(panel).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.body).getPropertyValue('--brand-color')
      )
    )
    .not.toBe(colour)
})
