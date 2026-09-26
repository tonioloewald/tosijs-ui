import { test, expect, type Page } from '@playwright/test'

/*
Document-level shortcut listeners must go away with their element.

<tosi-menu> added its keydown listener with `capture: true` and removed it WITHOUT, which in a
real browser removes nothing: every menu ever disconnected kept firing its shortcuts. happy-dom
removes the listener regardless, so only a real browser can see this. <tosi-select> gained the
same kind of listener for option shortcuts (#188) and is held to the same rule.
*/

async function open(page: Page) {
  await page.goto('/')
  await page.waitForFunction(() => !!(window as any).xinjsui?.tosiSelect)
}

test('a removed <tosi-menu> no longer fires its shortcut', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    const w = window as any
    w.__fired = 0
    const menu = w.xinjsui.tosiMenu({
      menuItems: [
        { caption: 'Go', shortcut: 'ctrl-g', action: () => w.__fired++ },
      ],
    })
    document.body.append(menu)
    menu.remove()
  })
  await page.keyboard.press('Control+g')
  expect(await page.evaluate(() => (window as any).__fired)).toBe(0)
})

test('a <tosi-select> option shortcut picks it; removed, it stops', async ({
  page,
}) => {
  await open(page)
  await page.evaluate(() => {
    const w = window as any
    w.__changes = 0
    const select = w.xinjsui.tosiSelect({
      options: [
        { caption: 'One', value: 'one', shortcut: 'ctrl-1' },
        { caption: 'Two', value: 'two', shortcut: 'ctrl-2' },
      ],
      value: 'one',
    })
    select.id = 'sc'
    select.addEventListener('change', () => w.__changes++)
    document.body.append(select)
  })
  await page.keyboard.press('Control+2')
  await expect
    .poll(() =>
      page.evaluate(() => (document.querySelector('#sc') as any).value)
    )
    .toBe('two')
  // `change` comes from the select's next render (a frame later), for a click as for a
  // shortcut, so wait for the event rather than assume it arrived with the value.
  await expect
    .poll(() => page.evaluate(() => (window as any).__changes))
    .toBe(1)

  await page.evaluate(() => {
    const w = window as any
    w.__removed = document.querySelector('#sc')
    w.__removed.remove()
  })
  await page.keyboard.press('Control+1')
  await page.waitForTimeout(100)
  expect(await page.evaluate(() => (window as any).__removed.value)).toBe('two')
})
