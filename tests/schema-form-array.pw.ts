import { test, expect } from '@playwright/test'

/*
Keyboard survival across an array edit.

`fillArray` destroys and recreates every row, so after clicking ↓ the button you clicked no
longer exists — `document.activeElement` fell to `<body>`, and you could not press ↓ twice to
move an item two places or add two rows from the keyboard. Focus is restored by role and
index: you moved row 3 down, so the control you want next is the same one on row 4.
*/

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/schema-form/')
  await page.waitForFunction(() =>
    document.querySelector('[data-array="items"]')
  )
})

test('moving an item twice in a row works from the keyboard', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const form = [...document.querySelectorAll('tosi-schema-form')].find((f) =>
      f.querySelector('[data-array="items"]')
    ) as any
    const container = form.querySelector('[data-array="items"]')
    const skus = () =>
      [...container.querySelectorAll('[data-path^="items."]')]
        .filter((el: any) => el.dataset.path.endsWith('.sku'))
        .map((el: any) => el.value)
    const before = skus()

    // Click ↓ on the first row, then press it again — which used to be impossible, because
    // the button had been destroyed and focus was on <body>.
    // Add a third row so "move down" is not disabled at the destination.
    ;(container.querySelector('.schema-add') as HTMLButtonElement).click()
    ;(
      container
        .querySelectorAll('.schema-item')[0]
        .querySelector('.schema-move-down') as HTMLButtonElement
    ).click()
    const active = document.activeElement as HTMLElement
    const rows = [...container.querySelectorAll('.schema-item')]
    const focusedAfterFirst =
      active?.classList.contains('schema-move-down') === true &&
      rows[1]?.contains(active) === true
    if (focusedAfterFirst) (active as HTMLButtonElement).click()
    return { before, after: skus(), focusedAfterFirst }
  })
  expect(result.focusedAfterFirst).toBe(true)
  // The first item moved down twice — only possible if the button survived the first click.
  expect(result.after[2]).toBe(result.before[0])
})

test('adding an item lands focus in the new row', async ({ page }) => {
  const focused = await page.evaluate(async () => {
    const form = [...document.querySelectorAll('tosi-schema-form')].find((f) =>
      f.querySelector('[data-array="tags"]')
    ) as any
    const container = form.querySelector('[data-array="tags"]')
    ;(container.querySelector('.schema-add') as HTMLButtonElement).click()
    const active = document.activeElement as HTMLElement
    const rows = [...container.querySelectorAll('.schema-item')]
    return {
      inLastRow: rows[rows.length - 1]?.contains(active) ?? false,
      isControl: active?.tagName,
    }
  })
  expect(focused.inLastRow).toBe(true)
  expect(['INPUT', 'SELECT']).toContain(focused.isControl)
})

test('the keystroke path does no per-field DOM lookup, at any field count', async ({
  page,
}) => {
  /*
  `syncValues` and `syncErrors` each ran one root-scoped attribute `querySelector` PER FIELD on
  every keystroke -- an O(fields) scan repeated O(fields) times. Measured on the built component
  before indexing: 200 fields 9.8ms/keystroke, 400 -> 40ms, 800 -> **240ms**. Four doublings,
  each quadrupling. Validation itself was 0.19ms against 315ms of lookup at 3200 fields, so the
  cost was never the validating.

  THIS COUNTS SELECTOR CALLS RATHER THAN TIMING THEM, and that is the whole point.

  Two earlier versions of this test asserted wall-clock and both flaked. A `< 10ms` per-keystroke
  ceiling failed on firefox at 12.8ms during a full 171-spec parallel run and passed 3/3 in
  isolation. Replacing it with a ratio -- 4x the fields should cost ~4x, not ~16x -- was meant to
  be contention-proof on the theory that load scales both measurements together. It does not:
  the same firefox that measured 21ms -> 56ms (2.67x) in isolation measured 28ms -> 259ms (9.25x)
  under load, because the larger form is the one that suffers under memory pressure. A ratio
  wide enough to absorb that is too wide to catch anything.

  The call count has no such problem. It is an integer, it is identical on all three engines,
  and it is **0** -- every lookup on this path now goes through `_index`. So the assertion is
  that per-keystroke DOM lookups do not grow with field count, which is the actual defect class,
  stated exactly and without a threshold to tune.

  Mutation-tested, and the mutations are worth recording because one of them is instructive.
  Re-finding the error slot per field -- the single line this replaced -- takes the count to
  400/1600 and fails the assertion with those numbers. Restoring the root-scoped scan in
  `syncValues` does NOT fail it, and that is correct: a keystroke runs `refreshErrors()` and
  `syncErrors()` only. `syncValues` is deliberately off this path, because writing values back
  into the control the user is typing in is the bug it would cause. So this test guards the
  keystroke path exactly, and the structural-edit path that DOES call `syncValues` is unguarded
  -- noted in TODO.md.

  What this does NOT cover: a quadratic regression that never calls `querySelector` (an O(N)
  array walk per field, say). That needs a timing test, and a timing test needs a quiet machine
  -- also TODO.md, rather than pretended at here.
  */
  const lookups = await page.evaluate(async () => {
    const { tosiSchemaForm } = (window as any).xinjsui
    const countFor = async (fields: number) => {
      const props: Record<string, unknown> = {}
      for (let i = 0; i < fields; i++) props['f' + i] = { type: 'string' }
      const form = tosiSchemaForm({
        schema: { type: 'object', properties: props },
        value: {},
      })
      document.body.append(form)
      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((r) => requestAnimationFrame(r))
      const el = form.querySelector('[data-path="f0"]') as HTMLInputElement

      // Count on the prototypes, so a call on ANY node or scope is seen -- narrowing a
      // root-scoped scan to a per-wrapper one would otherwise read as a fix when it is only a
      // smaller version of the same per-field work.
      const protos: any[] = [
        Element.prototype,
        Document.prototype,
        DocumentFragment.prototype,
      ]
      const saved = protos.map((proto) => [
        proto,
        proto.querySelector,
        proto.querySelectorAll,
      ])
      let calls = 0
      for (const proto of protos) {
        const qs = proto.querySelector
        const qsa = proto.querySelectorAll
        proto.querySelector = function (...a: any[]) {
          calls++
          return qs.apply(this, a)
        }
        proto.querySelectorAll = function (...a: any[]) {
          calls++
          return qsa.apply(this, a)
        }
      }
      const KEYSTROKES = 10
      for (let k = 0; k < KEYSTROKES; k++) {
        el.value = 'x'.repeat((k % 8) + 1)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
      for (const [proto, qs, qsa] of saved as any[]) {
        proto.querySelector = qs
        proto.querySelectorAll = qsa
      }
      form.remove()
      return calls / KEYSTROKES
    }
    return { at400: await countFor(400), at1600: await countFor(1600) }
  })

  // Not `toBe(0)` on each: the assertion is about GROWTH, and a future keystroke path that
  // legitimately does a fixed handful of lookups is not the bug. Quadrupling the field count
  // must not move the number.
  expect(
    lookups.at1600,
    `per-keystroke DOM lookups must not scale with field count: ${JSON.stringify(
      lookups
    )}`
  ).toBeLessThanOrEqual(lookups.at400 + 4)
})

test('the structural-edit path does no per-field DOM lookup either', async ({
  page,
}) => {
  /*
  The sibling of the keystroke guard above, covering the path that one provably cannot see.

  A keystroke runs `refreshErrors()` and `syncErrors()`. Adding or removing an array item runs
  `afterStructuralEdit()`, and that DOES call `syncValues()` — which the keystroke path
  deliberately skips, because writing values back into the control the user is typing in is the
  bug it would cause. So a root-scoped per-field scan reintroduced in `syncValues` is invisible
  to the keystroke test; mutation-testing it there passes, which is how this gap was found
  rather than assumed.

  Measured: **1** call per add at 200 fields and 1 at 800 — flat, because `syncValues` goes
  through `_index` like everything else. The assertion is again about growth, not the constant.
  */
  const lookups = await page.evaluate(async () => {
    const { tosiSchemaForm } = (window as any).xinjsui
    const countFor = async (fields: number) => {
      const props: Record<string, unknown> = {}
      for (let i = 0; i < fields; i++) props['f' + i] = { type: 'string' }
      props.tags = { type: 'array', items: { type: 'string' } }
      const form = tosiSchemaForm({
        schema: { type: 'object', properties: props },
        value: { tags: ['x'] },
      })
      document.body.append(form)
      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((r) => requestAnimationFrame(r))
      const add = form.querySelector(
        '[data-array="tags"] .schema-add'
      ) as HTMLButtonElement
      if (!add)
        throw new Error('no add button — the harness, not the component')

      const protos: any[] = [
        Element.prototype,
        Document.prototype,
        DocumentFragment.prototype,
      ]
      const saved = protos.map((proto) => [
        proto,
        proto.querySelector,
        proto.querySelectorAll,
      ])
      let calls = 0
      for (const proto of protos) {
        const qs = proto.querySelector
        const qsa = proto.querySelectorAll
        proto.querySelector = function (...a: any[]) {
          calls++
          return qs.apply(this, a)
        }
        proto.querySelectorAll = function (...a: any[]) {
          calls++
          return qsa.apply(this, a)
        }
      }
      const ADDS = 5
      for (let k = 0; k < ADDS; k++) add.click()
      for (const [proto, qs, qsa] of saved as any[]) {
        proto.querySelector = qs
        proto.querySelectorAll = qsa
      }
      form.remove()
      return calls / ADDS
    }
    return { at200: await countFor(200), at800: await countFor(800) }
  })

  expect(
    lookups.at800,
    `per-add DOM lookups must not scale with field count: ${JSON.stringify(
      lookups
    )}`
  ).toBeLessThanOrEqual(lookups.at200 + 4)
})

test('keystroke cost grows with field count linearly, not quadratically', async ({
  page,
}) => {
  /*
  The COMPANION to the two lookup-count guards, and it exists because a call count has one
  blind spot they cannot cover: a quadratic path that never calls `querySelector` at all — an
  O(N) array walk per field, say — is invisible to counting. This measures time, so it sees any
  shape of regression, and sees none of the constant-factor waste the counts are good at. They
  are complementary, and the mutations below demonstrate that rather than asserting it.

  Wall-clock was REMOVED from this file once, for flaking, so it is worth recording what
  changed. At Playwright's default 9 workers the same 4x-fields measurement gave firefox 2.67x
  in isolation and 9.25x under the full run — load and regression were indistinguishable, and
  no threshold could separate them. The lane now runs at 6 workers (see playwright.config.ts,
  where the 82s-vs-81s measurement lives), and the two distributions overlap:

      isolated, n=9:     3.20 - 4.57   (all three engines)
      under full load:   2.64 - 4.14   (all three engines)

  Linear predicts 4.0 for 4x the fields; quadratic predicts 16. The threshold is 8, the
  geometric midpoint — 1.75x above the worst measurement seen and 2x below quadratic.

  Mutation-tested in both directions, which is what makes "complementary" a claim rather than a
  hope:

    - an O(N) scan per field in `syncErrors` using NO selector at all -> 9.63x
      (44.5ms -> 428.6ms). Fails HERE; both lookup-count guards pass, because there is nothing
      to count. This is the case that justifies keeping a timing test at all.
    - re-finding the error slot per field -> stays linear at ~4x and passes here, while the
      keystroke count guard fails at 400 -> 1600 lookups. Constant-factor waste is exactly what
      timing is bad at.

  (A caution for whoever runs the next mutation: build with its output visible. A first attempt
  at the mutation above "passed" because the rebuild had been silenced with `>/dev/null 2>&1`
  and the lane tested a stale bundle. And do not grep `dist/iife.js` to check a mutation landed
  — minification renames locals, so the string is gone whether or not the code is there.)
  */
  const measure = await page.evaluate(async () => {
    const { tosiSchemaForm } = (window as any).xinjsui
    const KEYSTROKES = 40
    const totalFor = async (fields: number) => {
      const props: Record<string, unknown> = {}
      for (let i = 0; i < fields; i++) props['f' + i] = { type: 'string' }
      const form = tosiSchemaForm({
        schema: { type: 'object', properties: props },
        value: {},
      })
      document.body.append(form)
      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((r) => requestAnimationFrame(r))
      const el = form.querySelector('[data-path="f0"]') as HTMLInputElement
      const started = performance.now()
      for (let k = 0; k < KEYSTROKES; k++) {
        el.value = 'x'.repeat((k % 8) + 1)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
      const total = performance.now() - started
      form.remove()
      return total
    }
    // Best of three. Contention can only ADD time, so the minimum is the least contaminated
    // measurement available — and 40 keystrokes keeps both totals clear of firefox's clamped
    // `performance.now()`, which quantised the 10-keystroke version onto 0.5ms and 1.0ms.
    const best = async (fields: number) =>
      Math.min(
        await totalFor(fields),
        await totalFor(fields),
        await totalFor(fields)
      )
    const small = await best(400)
    const large = await best(1600)
    return { small, large }
  })

  // A zero denominator makes the ratio Infinity or NaN and the assertion meaningless either
  // way; if the small case is unmeasurable, say so rather than divide by it.
  expect(
    measure.small,
    `400-field total was unmeasurable: ${JSON.stringify(measure)}`
  ).toBeGreaterThan(1)
  expect(
    measure.large / measure.small,
    `4x the fields (400 -> 1600) should cost ~4x, not ~16x: ${JSON.stringify(
      measure
    )}`
  ).toBeLessThan(8)
})
