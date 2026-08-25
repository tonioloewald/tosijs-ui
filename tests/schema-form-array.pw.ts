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
