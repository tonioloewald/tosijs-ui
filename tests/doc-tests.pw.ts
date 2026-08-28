import { test, expect } from '@playwright/test'

/*
The inline ` ```test ` blocks in the doc corpus are the only automated coverage of many
components — including `test('the wasm kernel actually compiled (no silent fallback to
JS)')`, the sole guard on the headline inline-WASM feature. Until now they ran only under
`bun run test-browser`, which drives a haltija Electron: a fragile, not-in-CI lane that
could not even start from a common ambient state.

This runs the same tier through Playwright instead — no haltija, inside the existing e2e
job. The doc-browser's background runner already executes EVERY page-with-tests in hidden
iframes on localhost and resolves `window.__docTestResults` with the totals; we just wait
for it and assert nothing failed. One navigation gates the whole corpus.
*/

interface PageResult {
  passed: boolean
  totalPassed: number
  totalFailed: number
  tests: { name: string; passed: boolean; error?: string }[]
}
interface DocTestResults {
  passed: number
  failed: number
  pages: Record<string, PageResult>
}

/*
Run the whole tier at a given viewport.

Factored because the second call is the point: the tier had only ever run at the runner's
hardcoded 800x600, and a doc-system layout regression at phone width shipped in 1.12.3 and was
found by a reader rather than the suite. Every test ran wide, where the nav and the content show
together and the bug is invisible.

An iframe is a real viewport — verified that `matchMedia('(max-width: 600px)')` matches inside a
390px frame and not a 1200px one — so a narrow pass exercises real layout, not a simulation.

What it does NOT give is touch: an iframe inherits the host's input characteristics, so
`(pointer: coarse)` stays false and `maxTouchPoints` stays 0 whatever the size. Faking those by
redefining `navigator.maxTouchPoints` would be worse than skipping it — the property would lie
while the media queries told the truth. Touch belongs to a Playwright context (`hasTouch`,
`devices[…]`), not to this runner.
*/
async function runTierAt(
  page: any,
  viewport: { width: number; height: number } | null
) {
  if (viewport) {
    // Read by the doc-browser before it creates the test iframe. Must be set before load.
    await page.addInitScript((vp: unknown) => {
      ;(globalThis as any).__tosiTestViewport = vp
    }, viewport)
  }
  // Chromium + Firefox only. On WebKit the runner's per-page iframes never post their
  // `tosi-tests-done` signal, so every page-with-tests waits out the runner's 30s
  // per-page timeout — the corpus still finishes, but at ~30s × pages it blows past any
  // sane CI budget. This is a pre-existing WebKit-specific issue in the iframe runner
  // (the old haltija lane only ever drove one Chromium-based engine, so WebKit doc-tests
  // never ran at all); it does NOT indicate a broken example — chromium+firefox run all
  // of them green. Tracked in TODO.md. Two engines, including the inline-WASM guard, is
  // a real gate; letting WebKit's runner quirk block it would be the tail wagging the dog.
  await page.goto('/')
  // The runner is localhost-gated and starts ~1s after load; `__docTestResults` is a
  // Promise that resolves once pagesTested >= pagesWithTests. Playwright awaits the
  // returned promise, so this blocks until the whole corpus has run (or the timeout).
  const results = (await page.evaluate(
    () => window.__docTestResults as unknown as Promise<DocTestResults>
  )) as DocTestResults

  // A corpus with real tests must actually have run some — a silent "0 tested" would
  // let this pass vacuously while gating nothing.
  const ran = results.passed + results.failed
  expect(
    ran,
    'no inline doc tests ran — the runner never started'
  ).toBeGreaterThan(0)

  if (results.failed > 0) {
    const detail = Object.entries(results.pages)
      .filter(([, p]) => !p.passed)
      .map(([file, p]) => {
        const failed = p.tests
          .filter((t) => !t.passed)
          .map((t) => `    ✗ ${t.name}${t.error ? ` — ${t.error}` : ''}`)
          .join('\n')
        return `  ${file} (${p.totalFailed} failed):\n${failed}`
      })
      .join('\n')
    throw new Error(
      `${results.failed} inline doc test(s) failed across ${
        Object.values(results.pages).filter((p) => !p.passed).length
      } page(s):\n${detail}`
    )
  }

  expect(results.failed).toBe(0)
}

test('every inline doc test passes (the whole ```test tier)', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'WebKit: iframe test-runner does not signal per-page completion — see TODO.md'
  )
  test.setTimeout(180_000)
  await runTierAt(page, null) // the runner's own default, 800x600
})

test('the whole tier passes at phone width too', async ({
  page,
  browserName,
}) => {
  /*
  The pass that would have caught 1.12.3's narrow-layout regression, and the reason the runner's
  viewport became overridable at all. 390x844 is a common phone logical size; the point is not
  the exact number but that it is below every breakpoint the doc system uses.
  */
  test.skip(
    browserName === 'webkit',
    'WebKit: iframe test-runner does not signal per-page completion — see TODO.md'
  )
  test.setTimeout(180_000)
  await runTierAt(page, { width: 390, height: 844 })
})
