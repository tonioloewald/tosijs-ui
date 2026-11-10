import { test, expect } from './fixtures'

/*
#3764: over plain http on a non-localhost name the page is not a secure context, and
`crypto.randomUUID` does not exist. A live example called it in a class field, so every
example failed to construct and the doc site never hydrated past its static link list.
Playwright serves localhost (a secure context), so the method is removed by hand.
*/
test('a page with live examples hydrates without crypto.randomUUID', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => {
    // WebKit's benign layout notice, unrelated to this bug.
    if (!error.message.startsWith('ResizeObserver loop'))
      errors.push(error.message)
  })
  await page.addInitScript(() => {
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
    ;(crypto as any).randomUUID = undefined
  })
  await page.goto('/tabs/')
  await expect(
    page.locator('tosi-doc-system tosi-example').first()
  ).toBeAttached()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const example = document.querySelector('tosi-example') as any
        return typeof example?.uuid === 'string' && example.uuid.length === 36
      })
    )
    .toBe(true)
  expect(errors).toEqual([])
})
