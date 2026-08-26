import { test, expect } from '@playwright/test'

/*
Cover for the `layout` page metadata (#105): a route can opt out of the reading column.

The measure is the default for a reason — 44em is roughly what people read comfortably — so
these assert BOTH directions. A feature that makes every page wide would pass a test that only
ever checks the wide one.
*/

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

/*
Reads the attribute off `<tosi-doc-system>`, which is where BOTH the static generator and the
doc-browser put it — and specifically not off `.doc-content`'s parent, which is a wrapper div
that hydration inserts. An earlier version of this helper read the div and reported a layout
the styles were not using, which made a broken navigation look fine.
*/
const contentWidth = (page: any) =>
  page.evaluate(() => {
    const el = document.querySelector('.doc-content') as HTMLElement
    const host = el.closest('tosi-doc-system') as HTMLElement
    return {
      content: Math.round(el.getBoundingClientRect().width),
      // The box the content sits IN, which excludes the nav. `full-width` keeps the nav by
      // design, so measuring against the whole doc-system would be measuring the nav too.
      available: Math.round(
        (el.parentElement as HTMLElement).getBoundingClientRect().width
      ),
      host: Math.round(host.getBoundingClientRect().width),
      layout: host.getAttribute('data-layout') ?? null,
    }
  })

test('a page with layout: full-width fills the available width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  const m = await contentWidth(page)
  expect(m.layout).toBe('full-width')
  /*
  Measured against the HOST rather than a pixel count: the point is "it is not held to the
  reading column", and the host box already accounts for the nav and the padding. A hard number
  would encode this viewport and this nav width, neither of which the feature is about.
  */
  expect(
    m.content,
    `full-width content should fill its container: ${JSON.stringify(m)}`
  ).toBeGreaterThan(m.available * 0.95)
  // And it must actually be wide — filling a container that happens to be narrow would
  // satisfy the line above while proving nothing.
  expect(m.content).toBeGreaterThan(900)
})

test('a page without it keeps the reading column', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/data-table/')
  /*
  Wait for hydration before measuring, and the reason is worth knowing.

  Two things constrain the content and neither covers the whole load. The stylesheet's
  `tosi-doc-system:not(:defined) .doc-content` rule holds until the custom element is defined;
  the doc-browser's inline `max-width` takes over after it runs. Between those two moments
  nothing applies, and a measurement landing there reads full width — which is exactly how this
  test failed once on webkit while passing everywhere else.

  (That gap is also a real, if sub-frame, flash of unmeasured prose on every load. Pre-existing,
  not introduced here, and noted in TODO.md rather than fixed under cover of this change.)
  */
  await page.waitForFunction(
    () => !!document.querySelector('tosi-sidenav'),
    undefined,
    { timeout: 15_000 }
  )
  const m = await contentWidth(page)
  expect(m.layout).toBe(null)
  // 44em at a normal root size is well under 900px; the host at this viewport is far wider.
  expect(
    m.content,
    `prose must stay in its measure: ${JSON.stringify(m)}`
  ).toBeLessThan(900)
  expect(m.content).toBeLessThan(m.available * 0.9)
})

test('the layout is right on FIRST PAINT, before hydration', async ({
  page,
}) => {
  /*
  The reason it is stamped into the served HTML rather than applied on load. A layout applied
  by script shows the reading column first and snaps wide — the same flicker class the
  nav-hydration fix chased in 1.7.3. Asserting it on the raw markup is the only way to catch a
  regression to "apply it in showDoc and hope".
  */
  const html = await (await page.request.get('/')).text()
  expect(html).toContain('data-layout="full-width"')
})

test('SPA navigation moves the layout with the page, both ways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  expect((await contentWidth(page)).layout).toBe('full-width')

  // full-width -> prose: the measure must come BACK, which is the direction a naive
  // "set the attribute when the doc asks for it" implementation forgets.
  await page.evaluate(() =>
    (
      document.querySelector('a.doc-link[href="/data-table/"]') as HTMLElement
    )?.click()
  )
  await expect
    .poll(async () => (await contentWidth(page)).layout, { timeout: 15_000 })
    .toBe(null)
  const prose = await contentWidth(page)
  expect(prose.content).toBeLessThan(prose.available * 0.9)

  // prose -> full-width again
  await page.evaluate(() =>
    (document.querySelector('a.doc-link[href="/"]') as HTMLElement)?.click()
  )
  await expect
    .poll(async () => (await contentWidth(page)).layout, { timeout: 15_000 })
    .toBe('full-width')
})

const fullScreenShape = (page: any) =>
  page.evaluate(() => {
    const nav = document.querySelector('.doc-nav') as HTMLElement | null
    const el = document.querySelector('.doc-content') as HTMLElement
    const host = document.querySelector('tosi-doc-system') as HTMLElement
    const nr = nav?.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    return {
      // The nav is moved OFF-SCREEN rather than shrunk — compact mode slides it out with a
      // negative margin — so its width says nothing and its right edge says everything.
      navRight: nr ? Math.round(nr.right) : -1,
      contentLeft: Math.round(er.left),
      content: Math.round(er.width),
      host: Math.round(host.getBoundingClientRect().width),
    }
  })

test('full-screen gives the content the whole viewport and puts the nav away', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/full-screen-demo/')
  await page.waitForFunction(
    () => !!document.querySelector('tosi-sidenav'),
    undefined,
    {
      timeout: 15_000,
    }
  )
  await expect
    .poll(async () => (await fullScreenShape(page)).content, {
      timeout: 15_000,
    })
    .toBe(1400)

  const m = await fullScreenShape(page)
  expect(m.content, `content is the viewport: ${JSON.stringify(m)}`).toBe(
    m.host
  )
  expect(m.contentLeft).toBe(0)
  expect(
    m.navRight,
    `the nav must be entirely off-screen: ${JSON.stringify(m)}`
  ).toBeLessThanOrEqual(0)
})

test('full-screen is right before hydration too', async ({ page }) => {
  /*
  With the bundle blocked there is no `<tosi-sidenav>` at all — the markup is a plain `<nav>` —
  so this is the stylesheet's half of the job, and the half that decides the FIRST paint.
  */
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.route('**/hydrate.js*', (r: any) => r.abort())
  await page.goto('/full-screen-demo/')
  const navWidth = await page.evaluate(() => {
    const nav = document.querySelector('.doc-nav') as HTMLElement | null
    return nav ? Math.round(nav.getBoundingClientRect().width) : -1
  })
  expect(navWidth, 'no nav before hydration either').toBe(0)
})

test('navigating away from full-screen brings the nav back', async ({
  page,
}) => {
  /*
  The direction that gets forgotten. `alwaysCompact` is sticky by nature — nothing resets it on
  its own — so leaving a full-screen page has to explicitly put the sidenav back, or every page
  after it inherits a layout it never asked for.
  */
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/full-screen-demo/')
  await expect
    .poll(async () => (await fullScreenShape(page)).content, {
      timeout: 15_000,
    })
    .toBe(1400)

  await page.evaluate(() =>
    (
      document.querySelector('a.doc-link[href="/data-table/"]') as HTMLElement
    )?.click()
  )
  await expect
    .poll(async () => (await fullScreenShape(page)).navRight, {
      timeout: 15_000,
    })
    .toBeGreaterThan(0)
  const back = await contentWidth(page)
  expect(back.layout).toBe(null)
  expect(
    back.content,
    `the measure is back: ${JSON.stringify(back)}`
  ).toBeLessThan(900)
})

const navState = (page: any) =>
  page.evaluate(() => {
    const sn = document.querySelector('tosi-sidenav') as any
    const nav = document.querySelector('.doc-nav') as HTMLElement | null
    const btn = document.querySelector(
      'button.iconic[title="navigation"]'
    ) as HTMLElement | null
    return {
      alwaysCompact: sn?.alwaysCompact ?? null,
      value: sn?.value ?? null,
      toggleVisible: btn ? btn.getBoundingClientRect().width > 0 : false,
      navRight: nav ? Math.round(nav.getBoundingClientRect().right) : -1,
    }
  })

test('the navigation button works on a full-screen page', async ({ page }) => {
  /*
  It did not, and it looked like it did — which is the worst combination. The button was
  visible and its handler ran, but `applyFullScreen` was also wired to the sidenav's change
  event: the click flipped the state, the sidenav changed, the handler fired, and the layout
  was re-applied over the top. So the nav could not be opened at all on a full-screen page.
  */
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/full-screen-demo/')
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 15_000 })
    .toBe('compact/content')

  /*
  Polled, not read once. The button's visibility rides a separate binding from the sidenav's
  state, so it lands on its own schedule — asserting it the instant the state poll returned
  failed on webkit while passing elsewhere, which is a race in the test rather than a defect.
  */
  await expect
    .poll(async () => (await navState(page)).toggleVisible, { timeout: 10_000 })
    .toBe(true)
  const before = await navState(page)
  expect(before.navRight, 'the nav starts off-screen').toBeLessThanOrEqual(0)

  await page.evaluate(() =>
    (
      document.querySelector('button.iconic[title="navigation"]') as HTMLElement
    )?.click()
  )

  /*
  It returns to the NORMAL layout rather than taking the nav full-screen: at this width that
  means nav beside content, which is what someone reaching for "navigation" wants. On a narrow
  viewport the same click lands in compact/nav instead.
  */
  await expect
    .poll(async () => (await navState(page)).navRight, { timeout: 10_000 })
    .toBeGreaterThan(0)
  const after = await navState(page)
  expect(after.alwaysCompact, 'the full-screen presentation is left').toBe(
    false
  )
  expect(after.value).toBe('normal')
})

test('the next full-screen page is full-screen again after an override', async ({
  page,
}) => {
  /*
  A reader's override lasts until they navigate, not beyond it. Applying the layout only on
  transition — which is what stopped the button being undone — would otherwise leave the NEXT
  full-screen page un-full-screened, because the wish never changed.
  */
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/full-screen-demo/')
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 15_000 })
    .toBe('compact/content')

  await page.evaluate(() =>
    (
      document.querySelector('button.iconic[title="navigation"]') as HTMLElement
    )?.click()
  )
  await expect
    .poll(async () => (await navState(page)).alwaysCompact, { timeout: 10_000 })
    .toBe(false)

  /*
  Navigating to a full-screen page WITHOUT passing through a prose one, which is the path the
  reset actually protects. Going via prose resets the flag as a side effect, so a test that took
  that route passed even with the reset removed — mutation testing caught that, and this is the
  version that fails without it.
  */
  await page.evaluate(() =>
    (
      document.querySelector(
        'a.doc-link[href="/full-screen-demo/"]'
      ) as HTMLElement
    )?.click()
  )
  await expect
    .poll(async () => (await navState(page)).navRight, { timeout: 15_000 })
    .toBeLessThanOrEqual(0)
  await expect
    .poll(async () => (await navState(page)).alwaysCompact, { timeout: 15_000 })
    .toBe(true)
})

test('hiding the nav on a NARROW screen does not outstay the request', async ({
  page,
}) => {
  /*
  The subtle half of `navVisible`. On a wide screen, hiding the nav has to force compact mode —
  nothing else would take it off screen. On a narrow one the width already produces compact, so
  forcing it as well would make the request permanent: the nav would stay away after the window
  was widened, because nothing would ever clear the flag.

  So the setter forces compact only when the width would not have. This asserts the consequence
  rather than the flag: hide the nav while narrow, widen, and the normal layout comes back.
  */
  await page.setViewportSize({ width: 500, height: 900 })
  await page.goto('/data-table/')
  await page.waitForFunction(
    () => !!document.querySelector('tosi-sidenav'),
    undefined,
    { timeout: 15_000 }
  )
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 10_000 })
    .toMatch(/^compact\//)

  await page.evaluate(() => {
    const sn = document.querySelector('tosi-sidenav') as any
    sn.navVisible = false
  })
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 10_000 })
    .toBe('compact/content')

  // Widen: the responsive behaviour must be intact, not overridden for good.
  await page.setViewportSize({ width: 1400, height: 900 })
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 10_000 })
    .toBe('normal')
  const m = await navState(page)
  expect(
    m.alwaysCompact,
    `a narrow-screen request must not have been made permanent: ${JSON.stringify(
      m
    )}`
  ).toBe(false)
})
