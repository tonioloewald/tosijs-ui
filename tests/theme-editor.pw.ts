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

  // A length is a number with arrows and a unit menu.
  const corners = editor.locator('[data-name="tosi-border-radius"]')
  const amount = corners.locator('.length-amount')
  await expect(amount).toHaveValue('4')
  await amount.focus()
  await amount.press('ArrowUp')
  await amount.press('ArrowUp')
  await expect(button).toHaveCSS('border-radius', '6px')
  await corners.locator('.length-unit').selectOption('rem')
  await expect(button).toHaveCSS('border-radius', '96px')
  await amount.fill('12')
  await corners.locator('.length-unit').selectOption('px')
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

test('a pasted Google Fonts link is linked, and its families are offered for font fields', async ({
  page,
}) => {
  const asked = page.waitForResponse(
    (response) =>
      response.url().includes('/__docstore/source') &&
      response.request().method() === 'HEAD'
  )
  await page.goto('/splitter/')
  await asked
  await page.waitForSelector('tosi-doc-system header')
  await page.locator('header button:has(svg)').last().click()
  await page.getByText('Theme Editor…').click()
  const panel = page.locator('.theme-editor-panel')
  const pasteField = panel.locator('[part="fontInput"]')

  await pasteField.fill('https://evil.example/x.css?family=Nope')
  await pasteField.press('Enter')
  await expect(panel.locator('[part="fontError"]')).toContainText(
    'fonts.googleapis.com'
  )

  const url =
    'https://fonts.googleapis.com/css2?family=Lora:wght@400;700&display=swap'
  await pasteField.fill(`<link href="${url}" rel="stylesheet">`)
  await pasteField.press('Enter')
  await expect(panel.locator('.font span')).toHaveText('Lora')
  await expect(
    page.locator(`link[data-tosi-theme-font][href="${url}"]`)
  ).toHaveCount(1)
  await expect(
    panel.locator('datalist option[value="\'Lora\', sans-serif"]')
  ).toHaveCount(1)

  // Closing without saving unlinks it again.
  await panel.getByRole('button', { name: 'Close the theme editor' }).click()
  await expect(page.locator('link[data-tosi-theme-font]')).toHaveCount(0)
})

test('given a pattern, the editor finds Material tokens; an edit flows down the chain, an override cuts it', async ({
  page,
}) => {
  await page.goto('/theme-stress-tests/')
  const editor = page
    .locator('tosi-example')
    .first()
    .locator('tosi-theme-editor')
  const tonal = page.locator('.md-demo .md-tonal')
  const text = (name: string) =>
    editor.locator(`[data-name="${name}"] input[type="text"]`)
  const container = editor.locator(
    '[data-name="md-sys-color-primary-container"]'
  )
  await expect(container).toHaveClass(/-derived/)

  // A root edit flows to what is mixed from it.
  const before = await tonal.evaluate(
    (el) => getComputedStyle(el).backgroundColor
  )
  await text('md-sys-color-primary').fill('#006400')
  await text('md-sys-color-primary').press('Enter')
  await expect
    .poll(() => tonal.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(before)

  // Overriding a link cuts it from its parent…
  await text('md-sys-color-primary-container').fill('#ffcc00')
  await text('md-sys-color-primary-container').press('Enter')
  await expect(tonal).toHaveCSS('background-color', 'rgb(255, 204, 0)')
  await expect(container).toHaveClass(/-tuned/)
  await expect(container.locator('.chain')).toBeHidden()
  await text('md-sys-color-primary').fill('#000080')
  await text('md-sys-color-primary').press('Enter')
  await expect(tonal).toHaveCSS('background-color', 'rgb(255, 204, 0)')

  // …and reset joins it again.
  await container.locator('.reset').click()
  await expect(tonal).not.toHaveCSS('background-color', 'rgb(255, 204, 0)')
  await expect(container).toHaveClass(/-derived/)
})

test('a translucent link keeps its alpha when its colour well changes it', async ({
  page,
}) => {
  await page.goto('/theme-stress-tests/')
  const editor = page
    .locator('tosi-example')
    .nth(1)
    .locator('tosi-theme-editor')
  const surface = editor.locator('[data-name="glass-surface"]')
  await expect(surface).toHaveClass(/-derived/)
  // A colour well cannot be driven through its native picker; set it as the picker would.
  await surface
    .locator('input[type="color"]')
    .evaluate((well: HTMLInputElement) => {
      well.value = '#ff0000'
      well.dispatchEvent(new Event('input', { bubbles: true }))
    })
  const value = await surface.locator('input[type="text"]').inputValue()
  expect(value.slice(0, 7)).toBe('#ff0000')
  // 20% white over nothing: the alpha byte is 0x33.
  expect(value.slice(7)).toBe('33')
  await expect(page.locator('.glass-demo .glass-panel')).toHaveCSS(
    'background-color',
    'rgba(255, 0, 0, 0.2)'
  )
})

test('the Style menu switches presets, remembers the choice, and applies it before hydration', async ({
  page,
}) => {
  await page.goto('/splitter/')
  await page.waitForSelector('tosi-doc-system header')
  const accent = () =>
    page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue('--brand-color').trim()
    )
  const original = await accent()
  await page.locator('header button:has(svg)').last().click()
  await page.getByText('Style', { exact: true }).click()
  await page.getByText('Material', { exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.body.classList.contains('tosi-style-material')
      )
    )
    .toBe(true)
  await expect.poll(accent).toBe('#6750a4')
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue('--tosi-radius').trim()
    )
  ).toBe('12px')

  // Opened with the doc system never defined: the head script alone puts the page in the
  // style. (Refusing the bundle's request is not enough: WebKit does not route every one.)
  const bare = await page.context().newPage()
  await bare.addInitScript(() => {
    const define = customElements.define.bind(customElements)
    customElements.define = (name, ...rest) => {
      if (name !== 'tosi-doc-system') define(name, ...rest)
    }
  })
  await bare.goto('/splitter/')
  expect(
    await bare.evaluate(() => ({
      defined: !!customElements.get('tosi-doc-system'),
      styled: document.documentElement.classList.contains(
        'tosi-style-material'
      ),
      accent: getComputedStyle(document.documentElement)
        .getPropertyValue('--brand-color')
        .trim(),
    }))
  ).toEqual({ defined: false, styled: true, accent: '#6750a4' })
  await bare.close()

  // Original puts the theme back as it was.
  await page.reload()
  await page.waitForSelector('tosi-doc-system header')
  await page.locator('header button:has(svg)').last().click()
  await page.getByText('Style', { exact: true }).click()
  await page.getByText('Original', { exact: true }).click()
  await expect.poll(accent).toBe(original)
})
