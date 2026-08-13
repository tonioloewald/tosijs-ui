import { test, expect } from '@playwright/test'

// Regression: in Firefox the selection highlight did not move when a different
// segment was clicked — the radio's checked state updated correctly, but
// `label:has(:checked)` was not re-evaluated, so the previously-selected segment
// stayed highlighted. The highlight is now driven by an explicit `.current` class.
test('clicking a different segment moves the highlight (single-select)', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!customElements.get('tosi-segmented'))

  await page.evaluate(() => {
    const el = document.createElement('tosi-segmented')
    el.id = 'repro'
    el.setAttribute('choices', 'yes, no, maybe')
    el.setAttribute('value', 'yes')
    // distinctive measurable highlight color
    el.style.setProperty(
      '--segmented-option-current-background',
      'rgb(255, 0, 0)'
    )
    /*
    Pin the fixture above the site's own floating chrome.

    Appended plainly, it lands at the end of <body> — the bottom of the page, which is
    exactly where the doc-site's test-status badge sits (`position: fixed; bottom; left;
    z-index: 1000`). Playwright would scroll the fixture into view, land it under that
    badge, and refuse the click: "element is visible, enabled and stable … <span
    part='label'>Running</span> from <tosi-doc-system> subtree intercepts pointer events",
    retrying to the 30s timeout. It bit only on webkit/firefox and only under load, because
    the badge reads "Running" for exactly as long as the background doc-test runner works —
    which is longer on a busy machine. Nothing about <tosi-segmented> was involved.

    This is not `force: true` in disguise. The click stays a real pointer click on a real
    element, and Playwright's actionability checks all still apply — the fixture is simply
    no longer underneath an unrelated overlay.
    */
    el.style.position = 'fixed'
    el.style.top = '0'
    el.style.left = '0'
    el.style.zIndex = '2000'
    document.body.appendChild(el)
  })

  await page.waitForFunction(() => {
    const el = document.getElementById('repro') as any
    return el && el.shadowRoot.querySelectorAll('label').length >= 3
  })

  const read = () =>
    page.evaluate(() => {
      const el = document.getElementById('repro') as any
      const labels = [
        ...el.shadowRoot.querySelectorAll('label'),
      ] as HTMLElement[]
      const inputs = [
        ...el.shadowRoot.querySelectorAll('input'),
      ] as HTMLInputElement[]
      return {
        value: el.value,
        checkedValues: inputs.filter((i) => i.checked).map((i) => i.value),
        highlighted: labels
          .map((l, i) =>
            getComputedStyle(l).backgroundColor === 'rgb(255, 0, 0)' ? i : -1
          )
          .filter((i) => i >= 0),
      }
    })

  // initial: first segment selected and highlighted
  expect(await read()).toEqual({
    value: 'yes',
    checkedValues: ['yes'],
    highlighted: [0],
  })

  // click the second segment ("no") — real pointer click, locators pierce shadow DOM
  await page.locator('#repro label').nth(1).click()

  // exactly one segment selected/highlighted, and it is the second one
  expect(await read()).toEqual({
    value: 'no',
    checkedValues: ['no'],
    highlighted: [1],
  })
})

// The same `:has(:checked)` invalidation bug affected `multiple` (checkbox) mode
// in Firefox: un-checking a box left its highlight stuck. The `.current` class
// fix is mode-agnostic, so toggling boxes adds/removes highlights correctly.
test('toggling checkboxes adds and removes highlights (multiple)', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!customElements.get('tosi-segmented'))

  await page.evaluate(() => {
    const el = document.createElement('tosi-segmented')
    el.id = 'multi'
    el.setAttribute('multiple', '')
    el.setAttribute('choices', 'a, b, c')
    el.setAttribute('value', 'a,b')
    el.style.setProperty(
      '--segmented-option-current-background',
      'rgb(255, 0, 0)'
    )
    // Pinned above the floating test-status badge — see the note in the first test.
    el.style.position = 'fixed'
    el.style.top = '0'
    el.style.left = '0'
    el.style.zIndex = '2000'
    document.body.appendChild(el)
  })

  await page.waitForFunction(() => {
    const el = document.getElementById('multi') as any
    return el && el.shadowRoot.querySelectorAll('label').length >= 3
  })

  const read = () =>
    page.evaluate(() => {
      const el = document.getElementById('multi') as any
      const labels = [
        ...el.shadowRoot.querySelectorAll('label'),
      ] as HTMLElement[]
      return {
        value: el.value,
        highlighted: labels
          .map((l, i) =>
            getComputedStyle(l).backgroundColor === 'rgb(255, 0, 0)' ? i : -1
          )
          .filter((i) => i >= 0),
      }
    })

  // initial: a and b selected/highlighted
  expect(await read()).toEqual({ value: 'a,b', highlighted: [0, 1] })

  // un-check "b" — its highlight must clear
  await page.locator('#multi label').nth(1).click()
  expect(await read()).toEqual({ value: 'a', highlighted: [0] })

  // check "c" — its highlight must appear
  await page.locator('#multi label').nth(2).click()
  expect(await read()).toEqual({ value: 'a,c', highlighted: [0, 2] })
})
