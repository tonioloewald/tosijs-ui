import { test, expect } from './fixtures'

/*
More tabs than fit: the tab names scroll and the after-tabs controls stay where they are. The
row used to push the controls past the component's clipped edge (a live example's close button,
at phone width, #252).
*/
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/tabs/')
  await page.waitForFunction(() => (window as any).xinjsui?.tosiTabs)
})

test('the tab names scroll; the controls stay inside, and the underline follows', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { tosiTabs } = (window as any).xinjsui
    const frame = () =>
      new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)))
    const button = document.createElement('button')
    button.slot = 'after-tabs'
    button.textContent = 'X'
    const bodies = Array.from({ length: 8 }, (_, i) => {
      const div = document.createElement('div')
      div.setAttribute('name', `tab number ${i}`)
      return div
    })
    const tabs = tosiTabs(...bodies, button)
    tabs.style.cssText =
      'position: fixed; top: 0; left: 0; width: 240px; height: 100px'
    document.body.append(tabs)
    await frame()
    const strip = tabs.shadowRoot.querySelector('[part="tabs"]')
    const underline = tabs.shadowRoot.querySelector('[part="selected"]')
    const rect = (el: Element) => el.getBoundingClientRect()
    const host = rect(tabs)
    const inside = rect(button).right <= host.right + 0.5
    const overflows = strip.scrollWidth > strip.clientWidth

    // Selecting a tab out of view scrolls it in, and the underline is under it.
    tabs.value = 7
    await frame()
    const last = strip.children[7]
    // 1.5px: scrollLeft and clientWidth are whole pixels, the strip's width is not.
    const lastVisible =
      rect(last).right <= rect(strip).right + 1.5 &&
      rect(last).left >= rect(strip).left - 1.5
    // The underline slides (a transition), so read where it is going, not where it is.
    const goal = () => ({
      left: rect(strip).left + parseFloat(underline.style.marginLeft),
      width: parseFloat(underline.style.width),
    })
    const underAligned =
      Math.abs(goal().left - rect(last).left) < 1.5 &&
      Math.abs(goal().width - rect(last).width) < 1.5

    // Scrolled back to the start, the selected tab is out of view: no underline under the
    // controls, and it moved with the scroll rather than sliding after it.
    strip.scrollLeft = 0
    await frame()
    const clipped =
      goal().left + goal().width <= rect(strip).right + 1.5 &&
      underline.style.transition === 'none'
    tabs.remove()
    return { inside, overflows, lastVisible, underAligned, clipped }
  })
  expect(result).toEqual({
    inside: true,
    overflows: true,
    lastVisible: true,
    underAligned: true,
    clipped: true,
  })
})
