import { test, expect } from '@playwright/test'

/*
#82: the row cap must come from what the browser can actually lay out.

Unit tests cover `derivedMaxVisibleRows` (pure), but the PROBE needs a real layout engine —
happy-dom returns 0 for `getBoundingClientRect`, so the one part that talks to the browser is
exactly the part unit tests cannot reach. Hence a browser test.

It deliberately asserts a RANGE, not a constant. Two real measurements from this project sit a
factor of two apart — Chrome 151 clamps at 16777214px (2^24 − 2), this Playwright Chromium at
33554428px (2^25 − 4) — so pinning the number would fail on a browser upgrade while telling us
nothing we want to know. What matters is that it is probed, plausible, and enormously larger
than the flat 10000 it replaced.
*/
test('#82: the layout ceiling is probed, and yields far more than the old flat cap', async ({
  page,
}) => {
  await page.goto('/data-table/')
  await page.waitForFunction(
    () => !!customElements.get('tosi-table'),
    undefined,
    {
      timeout: 15_000,
    }
  )

  /*
  Call the SHIPPED probe, not a copy of it.

  This used to reimplement the probe inline — one ask at 1e9 — which made it a test of the
  test rather than of the component, and the copies disagreed the moment the real one was
  fixed. Worse, both carried the same wrong assumption: that every engine CLAMPS an
  over-large height. Firefox returns 0 instead, so `probeMaxElementHeight` fell back to the
  flat 10000 that this very issue exists to replace, on every Firefox page, silently.
  */
  const probed = await page.evaluate(() =>
    (window as any).xinjsui.probeMaxElementHeight()
  )

  // Actually clamped — if the engine laid out all 1e9 the probe measured the request.
  expect(probed).toBeLessThan(1_000_000_000)
  expect(probed).toBeGreaterThan(1_000_000)

  // The point of the issue: at the default 30px rows this must dwarf the old 10000.
  const rows = Math.floor(probed / 30)
  expect(rows).toBeGreaterThan(100_000)

  // And the shipped table agrees with the probe rather than carrying its own number.
  const tableCap = await page.evaluate(() => {
    const t = document.createElement('tosi-table') as any
    document.body.append(t)
    const cap = t.maxVisibleRows
    t.remove()
    return cap
  })
  expect(tableCap).toBeGreaterThan(100_000)
})
