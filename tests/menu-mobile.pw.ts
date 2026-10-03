import { test, expect, devices } from '@playwright/test'

/*
#2460: on iPhone a long menu popped low on the page ran past the visible area (it was sized
against 100vh, the LARGE viewport), and reaching its end meant scrolling the page, which
dismissed it. Sized against the visual viewport, it fits and scrolls inside itself.
*/
const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } =
  devices['iPhone 13']
test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent })

test('a long menu fits the visible area and scrolls itself, not the page', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'firefox',
    'Playwright has no mobile emulation in Firefox'
  )
  await page.goto('/menu/')
  await page.waitForFunction(() => (window as any).xinjsui?.popMenu)
  await page.waitForTimeout(1500) // let the page settle: a page scroll correctly dismisses menus
  const result = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const target = document.createElement('button')
    target.textContent = 'open'
    target.style.cssText = 'position: fixed; left: 20px; top: 55vh'
    document.body.append(target)
    ui.popMenu({
      target,
      position: 's',
      menuItems: Array.from({ length: 40 }, (_, i) => ({
        caption: `item ${i + 1}`,
        action() {},
      })),
    })
    await new Promise((r) => setTimeout(r, 300))
    const menu = document.querySelector(
      'tosi-float .tosi-menu, tosi-float .xin-menu'
    ) as HTMLElement
    const rect = menu.getBoundingClientRect()
    const vv = window.visualViewport!
    return {
      bottom: rect.bottom,
      visibleBottom: vv.offsetTop + vv.height,
      scrolls: menu.scrollHeight > menu.clientHeight,
      overscroll: getComputedStyle(menu).overscrollBehaviorY,
    }
  })
  expect(result.bottom).toBeLessThanOrEqual(result.visibleBottom + 1)
  expect(result.scrolls).toBe(true)
  expect(result.overscroll).toBe('contain')
})

test('an open menu stays put when the visible viewport changes (1.16.5 review B1)', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'firefox',
    'Playwright has no mobile emulation in Firefox'
  )
  await page.goto('/menu/')
  await page.waitForFunction(() => (window as any).xinjsui?.popMenu)
  await page.waitForTimeout(1500) // let the page settle: a page scroll correctly dismisses menus
  const result = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const target = document.createElement('button')
    target.textContent = 'open'
    target.style.cssText = 'position: fixed; left: 20px; top: 40vh'
    document.body.append(target)
    ui.popMenu({
      target,
      position: 's',
      menuItems: Array.from({ length: 6 }, (_, i) => ({
        caption: `item ${i}`,
        action() {},
      })),
    })
    await new Promise((r) => setTimeout(r, 300))
    const float = [
      ...document.querySelectorAll('tosi-float'),
    ].pop() as HTMLElement
    const before = float.getBoundingClientRect()
    // what Safari's toolbar showing or hiding does to an open page
    window.visualViewport!.dispatchEvent(new Event('resize'))
    await new Promise((r) => setTimeout(r, 100))
    const after = float.getBoundingClientRect()
    return {
      connected: float.isConnected,
      moved:
        Math.abs(before.top - after.top) + Math.abs(before.left - after.left),
      top: float.style.top,
    }
  })
  expect(result.connected).toBe(true)
  expect(result.top).not.toBe('') // re-fitted, not blanked
  expect(result.moved).toBeLessThan(1)
})
