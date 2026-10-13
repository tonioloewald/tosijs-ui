import { test, expect } from '@playwright/test'

/*
#216 item 3: a console line shows the JavaScript it became, behind a toggle, when the
dialect's transform returns its runtime setup apart from the line (`prelude` / `body`).

A stand-in dialect, because the tjs-lang this repo pins predates that split: `a is b` is
strict equality, and the setup ends in an assignment, as tjs's does. The unit tests hold the
evaluation rule; this holds that the toggle is reachable and works in a real page.
*/
test('a console line offers the JavaScript it became', async ({ page }) => {
  await page.goto('/component/')
  await page.waitForFunction(() => (window as any).xinjsui?.registerDialect)
  await page.evaluate(async () => {
    const { registerDialect, liveExample } = (window as any).xinjsui
    const prelude =
      'const __rt = { eq: (a, b) => a === b };\n__rt.last = __rt.eq;\n'
    registerDialect('prelang', {
      transform: (source: string) => {
        const body = source.replace(/(\w+) is (\w+)/g, '__rt.eq($1, $2)')
        return { code: prelude + body, prelude, body }
      },
    })
    const example = liveExample({ id: 'prelang-example' })
    example.dialect = 'prelang'
    example.options = { view: 'console' }
    example.js = `const five = 5\npreview.textContent = 'ready'`
    document.querySelector('main, body')!.prepend(example)
    await example.whenHydrated
  })
  const example = page.locator('#prelang-example')
  const field = example.locator('textarea.console-field')
  await expect(field).toBeVisible()

  await field.fill('const same = five is 5')
  await field.press('Enter')
  // A declaration has no value; the setup's last assignment must not stand in for one.
  await expect(example.locator('.console-result').last()).toHaveText(
    'undefined'
  )
  await field.fill('five is 5')
  await field.press('Enter')
  await expect(example.locator('.console-result').last()).toHaveText('true')

  const input = example.locator('.console-input').last()
  const shown = input.locator('.console-js')
  await expect(shown).toBeHidden()
  const toggle = input.getByRole('button', { name: 'JS' })
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(shown).toBeVisible()
  await expect(shown).toHaveText('__rt.eq(five, 5)')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.click()
  await expect(shown).toBeHidden()
})
