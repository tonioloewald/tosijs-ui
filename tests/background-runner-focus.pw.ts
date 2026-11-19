import { test, expect } from './fixtures'

/*
The background test runner loads other pages into a hidden frame, and their examples call
`focus()`. Safari lets a frame take focus from its parent that way, so a reader typing a
checklist comment on a phone was thrown out of the field mid-sentence (1.19.0). The runner
now starts no page while the reader is in a field they focused themselves, and abandons one
it is running when they enter one.
*/

test('the background runner leaves a field the reader is typing in alone', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'true')
  )
  await page.goto('/')
  await expect(page.locator('tosi-doc-system')).toBeVisible()
  await expect(page.locator('iframe[src*="_testMode"]')).toHaveCount(1)
  await page.evaluate(() => {
    const field = document.createElement('textarea')
    field.id = 'reader-field'
    field.style.cssText = 'position: fixed; bottom: 0; left: 0; z-index: 9999'
    document.body.append(field)
  })
  const field = page.locator('#reader-field')
  await field.click()
  // Long enough for the runner to reach pages whose examples focus things.
  for (let word = 0; word < 25; word++) {
    await page.keyboard.type('word ', { delay: 60 })
    await page.waitForTimeout(400)
    await expect(field).toBeFocused()
  }
  await expect(field).toHaveValue('word '.repeat(25))
  // Leaving the field lets the runner go on.
  await field.blur()
  await expect(page.locator('iframe[src*="_testMode"]')).toHaveCount(1, {
    timeout: 10_000,
  })
})
