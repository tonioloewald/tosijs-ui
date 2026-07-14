import { test, expect } from '@playwright/test'

/*
Hydration must be PURELY ADDITIVE — nothing already on the page may move.

That is the whole thesis of the pre-rendered doc-site ("pre-render the chrome, hydrate
in place — drop the opacity gate"), and until now nothing enforced it. Two regressions
shipped underneath it, both found by review rather than by a test:

  - the nav was styled by TWO hand-copied rule sets (static `<a>` vs hydrated
    `<a class="doc-link">`) which drifted, so every page painted brand-coloured
    underlines and 2.5px padding, then reflowed ~4px per row into 5px/15px padding;
  - the title was derived TWICE and flipped from the real headTitle to
    "tosijs-ui — tosijs-ui" the moment the bundle loaded.

Both are invisible to every other lane: the page ends up correct, so nothing is red.
The only way to catch them is to look at the page BEFORE JS and AFTER JS and demand
they agree. Which is what this does.
*/

const NAV_LINK = '.doc-nav a'

/** Geometry + the styling that drove the observed reflow, for the first N nav links. */
const navMetrics = () =>
  Array.from(document.querySelectorAll('.doc-nav a'))
    .slice(0, 8)
    .map((a) => {
      const s = getComputedStyle(a)
      const r = a.getBoundingClientRect()
      return {
        text: (a.textContent || '').trim(),
        padding: s.padding,
        borderBottomWidth: s.borderBottomWidth,
        height: Math.round(r.height),
        x: Math.round(r.x),
      }
    })

test('the nav does not move when the page hydrates', async ({ browser }) => {
  // With JS disabled we see exactly what a no-JS reader (and a crawler) sees.
  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await noJs.newPage()
  await staticPage.goto('/')
  await staticPage.locator(NAV_LINK).first().waitFor()
  const before = await staticPage.evaluate(navMetrics)
  await noJs.close()

  // ...and with JS on, after the component has upgraded.
  const live = await browser.newContext({ javaScriptEnabled: true })
  const livePage = await live.newPage()
  await livePage.goto('/')
  await livePage.waitForFunction(
    () => !!customElements.get('tosi-doc-system'),
    undefined,
    { timeout: 20_000 }
  )
  await livePage.locator(NAV_LINK).first().waitFor()
  const after = await livePage.evaluate(navMetrics)
  await live.close()

  expect(before.length).toBeGreaterThan(3) // the static nav is really there
  expect(after.map((m) => m.text)).toEqual(before.map((m) => m.text))

  // The reflow the duplicated stylesheet caused, stated as an assertion.
  for (const [i, b] of before.entries()) {
    expect(after[i].padding, `padding moved for "${b.text}"`).toBe(b.padding)
    expect(after[i].height, `row height moved for "${b.text}"`).toBe(b.height)
    expect(after[i].x, `text shifted for "${b.text}"`).toBe(b.x)
    expect(
      after[i].borderBottomWidth,
      `underline appeared/vanished for "${b.text}"`
    ).toBe(b.borderBottomWidth)
  }
})

test('the page is readable with no JavaScript at all', async ({ browser }) => {
  // The other half of the thesis: pre-rendered means READABLE, not just present.
  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const page = await noJs.newPage()
  await page.goto('/')

  await expect(page.locator('h1').first()).toBeVisible()
  // Real links, not JS-driven routing — a crawler must be able to walk the corpus.
  const hrefs = await page
    .locator(`${NAV_LINK}`)
    .evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute('href'))
    )
  expect(hrefs.length).toBeGreaterThan(3)
  expect(hrefs.every((h) => !!h && h !== '#')).toBe(true)
  await noJs.close()
})
