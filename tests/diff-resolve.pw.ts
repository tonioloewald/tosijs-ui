import { test, expect } from '@playwright/test'

/*
Clicking a resolution button must actually resolve the change.

This exists because the unit lane cannot see the failure. `<tosi-diff>` is a shadow-DOM
component and tosijs delegates `on*` handlers from above the shadow boundary, so a real click
is RETARGETED — `event.target` is the host, not the button — and the handler bailed on every
click. The happy-dom test called `.click()` on a node it had already looked up and asserted
the value moved; it passed against a component whose buttons did nothing in every browser.

So the assertion here is deliberately end-to-end: click the thing a person clicks, then read
the value a host would read. Anything narrower reintroduces the gap.
*/

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/diff/')
  await page.waitForFunction(
    () =>
      !!document
        .querySelector('tosi-diff[resolvable]')
        ?.shadowRoot?.querySelector('button[data-hunk]'),
    undefined,
    { timeout: 15000 }
  )
})

const diff = (page: import('@playwright/test').Page) =>
  page.locator('tosi-diff[resolvable]').first()

test('clicking a choice changes the resolved value', async ({ page }) => {
  const el = diff(page)
  const before = await el.evaluate((e: any) => e.value)

  await el.locator('button[data-choice="original"]').first().click()
  await expect
    .poll(async () => el.evaluate((e: any) => e.value))
    .not.toBe(before)

  // And back again — a choice is a toggle between two sides, not a one-way door.
  await el.locator('button[data-choice="modified"]').first().click()
  await expect.poll(async () => el.evaluate((e: any) => e.value)).toBe(before)
})

test('the pressed state follows the choice', async ({ page }) => {
  const el = diff(page)
  const pressed = () =>
    el.evaluate((e: any) =>
      [...e.shadowRoot.querySelectorAll('.diff-choices button')]
        .filter((b: any) => b.getAttribute('aria-pressed') === 'true')
        .map((b: any) => b.dataset.choice)
    )

  expect(await pressed()).toEqual(['modified', 'modified'])
  await el.locator('button[data-choice="original"]').first().click()
  await expect.poll(pressed).toEqual(['original', 'modified'])
})

test('a choice resolves ONLY its own change', async ({ page }) => {
  /*
  The failure this guards against is a handler that reads the wrong index and moves every
  hunk at once — indistinguishable from "it works" if you only ever check that something
  changed.
  */
  const el = diff(page)
  await el.locator('button[data-choice="original"]').nth(1).click()
  await expect.poll(pressedFor(el)).toEqual(['modified', 'original'])
})

function pressedFor(el: ReturnType<typeof diff>) {
  return async () =>
    el.evaluate((e: any) =>
      [...e.shadowRoot.querySelectorAll('.diff-choices button')]
        .filter((b: any) => b.getAttribute('aria-pressed') === 'true')
        .map((b: any) => b.dataset.choice)
    )
}
