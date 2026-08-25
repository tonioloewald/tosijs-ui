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

test('the keystroke path is linear, not quadratic, in field count', async ({
  page,
}) => {
  /*
  `syncValues` and `syncErrors` each ran one root-scoped attribute `querySelector` PER FIELD
  on every keystroke — an O(fields) scan repeated O(fields) times. Measured on the built
  component before indexing: 200 fields 9.8ms/keystroke, 400 → 40ms, 800 → **240ms**. Four
  doublings, each quadrupling. Validation itself was 0.19ms against 315ms of lookup at 3200
  fields, so the cost was never the validating.

  The ceiling here is deliberately loose — this is a timing test on shared CI hardware and it
  exists to catch a return to quadratic, not to police milliseconds. 240ms would blow through
  it by 24×.
  */
  const perKeystroke = await page.evaluate(async () => {
    const { tosiSchemaForm } = (window as any).xinjsui
    const props: Record<string, unknown> = {}
    for (let i = 0; i < 800; i++) props['f' + i] = { type: 'string' }
    const form = tosiSchemaForm({
      schema: { type: 'object', properties: props },
      value: {},
    })
    document.body.append(form)
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => requestAnimationFrame(r))
    const el = form.querySelector('[data-path="f0"]') as HTMLInputElement
    const started = performance.now()
    for (let k = 0; k < 10; k++) {
      el.value = 'x'.repeat(k + 1)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const cost = (performance.now() - started) / 10
    form.remove()
    return cost
  })
  expect(perKeystroke).toBeLessThan(10)
})
