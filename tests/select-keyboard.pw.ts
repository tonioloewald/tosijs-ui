import { test, expect } from './fixtures'

/*
A select you pick from opens on Enter and on Space, like the button it is (1.17.0 review M1:
Enter was cancelled for the editable field's sake and stopped opening every select).
*/
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

for (const key of ['Enter', ' ']) {
  test(`a non-editable select opens on ${key === ' ' ? 'Space' : key}`, async ({
    page,
  }) => {
    await page.goto('/select/')
    await page.waitForFunction(() => (window as any).xinjsui?.tosiSelect)
    await page.evaluate(() => {
      const { tosiSelect } = (window as any).xinjsui
      const host = document.createElement('div')
      host.id = 'kb-host'
      host.style.cssText =
        'position:fixed;top:0;left:0;z-index:9999;background:#fff'
      document.body.append(host)
      host.append(tosiSelect({ options: 'one,two,three', value: 'one' }))
    })
    const button = page.locator('#kb-host tosi-select button[part="button"]')
    await button.focus()
    await page.keyboard.press(key)
    await expect(button).toHaveAttribute('aria-expanded', 'true')
  })
}
