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
  /*
  Wait for the NAVIGATION first, then for the nav to return — two waits, not one budget covering
  both. Polling `navRight` alone conflates "the click did not navigate" with "the layout did not
  update", and under a loaded lane the single budget expired on firefox with no way to tell which
  had happened. Splitting them means the failure names itself; 6/6 in isolation said the logic
  was fine and only the test's phrasing was not.
  */
  await page.waitForFunction(
    () => location.pathname === '/data-table/',
    undefined,
    { timeout: 15_000 }
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

  /*
  And the button is STILL offered — the whole round trip.

  It used to ride `compact` directly. That is right for a responsive page (wide enough to show
  both, nothing to toggle), but opening the nav on a full-screen page leaves compact mode by
  design, so the button vanished with it and stranded the reader in the normal layout with no
  way back to full screen.
  */
  expect(
    after.toggleVisible,
    `the button must survive its own click: ${JSON.stringify(after)}`
  ).toBe(true)

  await page.evaluate(() =>
    (
      document.querySelector('button.iconic[title="navigation"]') as HTMLElement
    )?.click()
  )
  await expect
    .poll(async () => (await navState(page)).navRight, { timeout: 10_000 })
    .toBeLessThanOrEqual(0)
})

test('the full-screen demo fills the content area, edge to edge', async ({
  page,
}) => {
  /*
  "The content is the viewport" is the promise, and two inline styles were quietly breaking it.
  `.doc-content` gets its `max-width` AND its `padding` as inline styles from the doc-browser,
  so a stylesheet cannot override either — the page rendered as a demo inset by 32px, in a box
  that collapsed to its own content height instead of filling. Both now route through variables,
  the way the measure already did.
  */
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/full-screen-demo/')
  await page.waitForFunction(
    () => !!document.querySelector('tosi-sidenav'),
    undefined,
    { timeout: 15_000 }
  )
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const box = document.querySelector('.fs-demo') as HTMLElement | null
          const el = document.querySelector('.doc-content') as HTMLElement
          if (!box) return null
          const b = box.getBoundingClientRect()
          const c = el.getBoundingClientRect()
          return Math.round(b.width) === Math.round(c.width) &&
            Math.round(b.height) === Math.round(c.height)
            ? 'fills'
            : `${Math.round(b.width)}x${Math.round(b.height)} in ${Math.round(
                c.width
              )}x${Math.round(c.height)}`
        }),
      { timeout: 15_000 }
    )
    .toBe('fills')

  // and the text is actually rendered inside it, not clipped or collapsed away
  const text = await page.evaluate(() => {
    const p = document.querySelector('.fs-demo p') as HTMLElement | null
    const box = document.querySelector('.fs-demo') as HTMLElement
    if (!p) return null
    const pr = p.getBoundingClientRect()
    const br = box.getBoundingClientRect()
    return {
      visible: pr.width > 0 && pr.height > 0,
      inside: pr.top >= br.top && pr.bottom <= br.bottom,
    }
  })
  expect(text?.visible, 'the caption renders').toBe(true)
  expect(text?.inside, 'and sits inside the box').toBe(true)
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

/*
BACK, which this suite navigated past entirely until a reader noticed.

`doc-system.pw.ts` already covers Back for URL, title and content, so popstate was not
untested — but nothing checked what it does to a page's LAYOUT, and every test here reached its
pages by clicking links. The gap was reported from the keyboard as "sometimes the full-screen
page and the full-screen page with the nav open look like different history entries", which is
the kind of thing only someone actually using it can see: the mechanism turned out to be
different from the guess, but the observation was correct.

These pin what Back does today so that changing it has to be deliberate. Whether it SHOULD work
this way is an open decision in TODO.md — the alternative is remembering a reader's override per
history entry — and these are written to fail loudly if someone implements that, rather than to
argue it is right.

They earn their keep differently, and it is worth saying which is which. The second one is a
REGRESSION test: dropping the `removeAttribute('data-layout')` on navigation fails it, so the
popstate path is genuinely covered. The first is a CONTRACT tripwire — it survives every
mutation tried against it, because the paths it walks are already covered elsewhere. Its job is
to make the open decision visible when someone acts on it, not to catch a bug today. A test that
cannot fail is usually decoration; this one is deliberate, and labelling it is the difference.
*/

test('Back to a full-screen page re-asserts full-screen', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/full-screen-demo/')
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 15_000 })
    .toBe('compact/content')

  // Open the nav, so there is an override for Back to discard.
  await page.evaluate(() =>
    (
      document.querySelector('button.iconic[title="navigation"]') as HTMLElement
    )?.click()
  )
  await expect
    .poll(async () => (await navState(page)).navRight, { timeout: 10_000 })
    .toBeGreaterThan(0)

  await page.evaluate(() =>
    (
      document.querySelector('a.doc-link[href="/data-table/"]') as HTMLElement
    )?.click()
  )
  await page.waitForFunction(
    () => location.pathname === '/data-table/',
    undefined,
    { timeout: 15_000 }
  )

  await page.goBack()
  await page.waitForFunction(
    () => location.pathname === '/full-screen-demo/',
    undefined,
    { timeout: 15_000 }
  )
  /*
  The page's declared layout wins over the override you left. Predictable — a full-screen page
  is full-screen whenever you arrive at it — and also the thing that reads as the page
  forgetting. Measured, not asserted from the code: the toggle creates no history entry, so this
  is Back restoring metadata rather than replaying a state.
  */
  await expect
    .poll(async () => (await navState(page)).navRight, { timeout: 15_000 })
    .toBeLessThanOrEqual(0)
  expect((await navState(page)).alwaysCompact).toBe(true)
})

test('Back from full-screen to prose restores the reading column', async ({
  page,
}) => {
  /*
  The direction that would break silently. Arriving at a prose page by Back rather than by a
  link is the same code path in principle and a different one in practice — popstate — and a
  full-screen page leaves state behind it that has to be undone.
  */
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/data-table/')
  await page.waitForFunction(
    () => !!document.querySelector('tosi-sidenav'),
    undefined,
    { timeout: 15_000 }
  )
  const prose = await contentWidth(page)
  expect(prose.content, 'starts in the measure').toBeLessThan(900)

  await page.evaluate(() =>
    (
      document.querySelector(
        'a.doc-link[href="/full-screen-demo/"]'
      ) as HTMLElement
    )?.click()
  )
  await expect
    .poll(async () => (await contentWidth(page)).layout, { timeout: 15_000 })
    .toBe('full-screen')

  await page.goBack()
  await page.waitForFunction(
    () => location.pathname === '/data-table/',
    undefined,
    { timeout: 15_000 }
  )
  await expect
    .poll(async () => (await contentWidth(page)).layout, { timeout: 15_000 })
    .toBe(null)
  const back = await contentWidth(page)
  expect(
    back.content,
    `the measure must come back on popstate too: ${JSON.stringify(back)}`
  ).toBeLessThan(900)
  await expect
    .poll(async () => (await navState(page)).navRight, { timeout: 10_000 })
    .toBeGreaterThan(0)
})

test('on a narrow screen, tapping a nav link switches to the content', async ({
  page,
}) => {
  /*
  A regression from the full-screen work, reported from a phone-width window: the sidebar fills
  the screen, you tap a link, and the nav stays up — the article you asked for never appears.

  Cause: leaving full-screen was written as the tidy mirror of entering it, `navVisible = true`.
  That setter's show-the-nav branch writes `contentVisible = false`, and it ran on every
  navigation to a non-full-screen page — after the nav click handler had set `contentVisible =
  true` to do precisely this. The layout code was overwriting a decision that belongs to the
  reader.

  Nothing in this suite could catch it. Every layout test ran at 1400px, where normal mode shows
  the nav and the content together and `contentVisible` has no visible effect. The bug was
  invisible at every width the tests used.
  */
  await page.setViewportSize({ width: 500, height: 900 })
  await page.goto('/data-table/')
  await page.waitForFunction(
    () => !!document.querySelector('tosi-sidenav'),
    undefined,
    { timeout: 15_000 }
  )
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 15_000 })
    .toMatch(/^compact\//)

  // Open the nav, the way a reader does to reach the links at this width.
  await page.evaluate(() => {
    const sn = document.querySelector('tosi-sidenav') as any
    sn.navVisible = true
  })
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 10_000 })
    .toBe('compact/nav')

  await page.evaluate(() =>
    (
      document.querySelector('a.doc-link[href="/carousel/"]') as HTMLElement
    )?.click()
  )
  await page.waitForFunction(
    () => location.pathname === '/carousel/',
    undefined,
    { timeout: 15_000 }
  )

  /*
  The whole point: having navigated, you are looking at what you navigated TO. Asserted on the
  sidenav's own state rather than on a pixel, because at this width the two panes take turns and
  "which one is showing" is exactly what `value` reports.
  */
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 15_000 })
    .toBe('compact/content')
})

test('a full-screen page still hides the nav at a narrow width', async ({
  page,
}) => {
  // The other side of the asymmetry: entering full-screen must still state what it needs, and
  // the fix above must not have turned that into a no-op at narrow widths.
  await page.setViewportSize({ width: 500, height: 900 })
  await page.goto('/full-screen-demo/')
  await page.waitForFunction(
    () => !!document.querySelector('tosi-sidenav'),
    undefined,
    { timeout: 15_000 }
  )
  await expect
    .poll(async () => (await navState(page)).value, { timeout: 15_000 })
    .toBe('compact/content')
})
