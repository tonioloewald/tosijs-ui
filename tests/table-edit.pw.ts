import { test, expect } from '@playwright/test'

/*
Schema validation of an edited cell, tested on a REAL page rather than in the doc tier.

Inline `test` bodies run CONCURRENTLY and share the page, so two of them registering
`{ once: true }` listeners on the same table steal each other's events: the invalid-edit test
would capture the valid-edit test's event and read `error: null`. That is the documented
hazard, not a component fault — the behaviour reproduces perfectly in a browser, three
independent probes over.

One assertion per event source is the fix, and it belongs where each spec gets its own page.

The doc tier still covers control types, the per-column `editable` opt-out, and the change
event for a valid edit.
*/

/*
The background doc-test runner is OFF for these.

It executes the page's own inline `test` blocks on load — which edit the very cells these
specs assert on. That race is almost certainly why the assertion would not settle in the doc
tier either: the page was editing itself underneath the test.
*/
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

/*
Wait for the custom element to upgrade AND its list-bound cells to stamp.

Polling inside `page.evaluate` is not enough: on WebKit the element is in the DOM before it
has upgraded, so `.editable` is undefined and `find()` returns nothing at all.
*/
const editableTableReady = (page: any) =>
  page.waitForFunction(() =>
    [...document.querySelectorAll('tosi-table')].some(
      (t: any) => t.editable && t.querySelector('[data-edit-prop="qty"]')
    )
  )

test('an edit the schema forbids is flagged — not refused, and not accepted quietly', async ({
  page,
}) => {
  await page.goto('/data-table/')
  await editableTableReady(page)
  const result = await page.evaluate(() => {
    const table = [...document.querySelectorAll('tosi-table')].find(
      (t: any) => t.editable
    ) as any
    // Rows are list-bound; wait for the cells rather than the element.
    const qty = table.querySelectorAll(
      '[data-edit-prop="qty"]'
    )[1] as HTMLInputElement
    const item = table.getItem(qty)
    let detail: any = null
    table.addEventListener('change', (e: any) => (detail = e.detail), {
      once: true,
    })
    qty.focus()
    qty.value = '-4' // the schema says minimum: 0
    qty.dispatchEvent(new Event('change', { bubbles: true }))
    return {
      error: detail?.error ?? null,
      field: detail?.field ?? null,
      oldValue: detail?.oldValue ?? null,
      newValue: detail?.newValue ?? null,
      flagged: qty.classList.contains('cell-invalid'),
      written: item.qty,
    }
  })
  expect(result.error).toBeTruthy()
  expect(result.field).toBe('qty')
  expect(result.newValue).toBe(-4)
  expect(result.flagged).toBe(true)
  // The model holds what the user typed. Refusing the input would leave them guessing at
  // what the table wanted instead.
  expect(result.written).toBe(-4)
})

test('a valid edit reports no error and clears the flag', async ({ page }) => {
  await page.goto('/data-table/')
  await editableTableReady(page)
  const result = await page.evaluate(() => {
    const table = [...document.querySelectorAll('tosi-table')].find(
      (t: any) => t.editable
    ) as any
    const qty = table.querySelectorAll(
      '[data-edit-prop="qty"]'
    )[1] as HTMLInputElement
    let detail: any = null
    table.addEventListener('change', (e: any) => (detail = e.detail), {
      once: true,
    })
    qty.focus()
    qty.value = '7'
    qty.dispatchEvent(new Event('change', { bubbles: true }))
    return {
      // NOT `detail?.error ?? 'MISSING'`: a valid edit reports `error: null`, and `??`
      // treats null as nullish — the sentinel would swallow the very value under test.
      fired: detail !== null,
      error: detail === null ? 'NO-EVENT' : detail.error,
      flagged: qty.classList.contains('cell-invalid'),
    }
  })
  expect(result.fired).toBe(true)
  expect(result.error).toBe(null)
  expect(result.flagged).toBe(false)
})

/*
TYPE, with a per-character delay. This is the gap that let silent numeric corruption ship.

Every other test in this file — and the inline doc test — assigns `.value` programmatically
and dispatches a synthetic `change`. So does `page.keyboard.type()` with no delay: it never
lets a frame run between keystrokes. Neither can observe what happens when a BINDING reacts
to an intermediate value.

The defect: two-way `bindValue` wrote the model on every `input`, and `<input type=number>`
sanitizes an intermediate `"19."` to `""` per the HTML value-sanitization algorithm — so the
binding wrote `""` back into the focused input and the digits already typed vanished.
`19.95` committed as **95**, `-4` as **4**, both with `error: null`.
*/

const typeInto = async (page: any, prop: string, text: string) => {
  const cell = page.locator(`[data-edit-prop="${prop}"]`).first()
  await cell.click()
  await cell.fill('')
  await page.keyboard.type(text, { delay: 80 })
  await cell.blur()
  return page.evaluate((p: string) => {
    const table = [...document.querySelectorAll('tosi-table')].find(
      (t: any) => t.editable
    ) as any
    return table.getItem(table.querySelector(`[data-edit-prop="${p}"]`))[p]
  }, prop)
}

test('a decimal typed at human speed survives', async ({ page }) => {
  await page.goto('/data-table/')
  await editableTableReady(page)
  expect(await typeInto(page, 'price', '19.95')).toBe(19.95)
})

test('a leading minus sign survives', async ({ page }) => {
  await page.goto('/data-table/')
  await editableTableReady(page)
  expect(await typeInto(page, 'qty', '-4')).toBe(-4)
})

test('a value typed one character at a time is not partially committed', async ({
  page,
}) => {
  // `1.5` used to commit `5`: the `.` wiped the field and the binding put the empty string
  // back, so only what came after survived.
  await page.goto('/data-table/')
  await editableTableReady(page)
  expect(await typeInto(page, 'price', '0.25')).toBe(0.25)
})

test('every edit in one focus session reports a real oldValue', async ({
  page,
}) => {
  /*
  `_editStart` was seeded on focus and DELETED on every commit, so only the first edit of a
  session had a baseline — the shipped demo printed `undefined → true`. And because the delete
  ran before the equality guard, clearing a numeric cell as the second commit compared
  `undefined` to `undefined`, returned early, and skipped the coercion write entirely: a
  schema-typed integer left holding the raw string.
  */
  await page.goto('/data-table/')
  await editableTableReady(page)
  const result = await page.evaluate(async () => {
    const table = [...document.querySelectorAll('tosi-table')].find(
      (t: any) => t.editable
    ) as any
    const cell = table.querySelector(
      '[data-edit-prop="qty"]'
    ) as HTMLInputElement
    const item = table.getItem(cell)
    const seen: any[] = []
    table.addEventListener('change', (e: any) =>
      seen.push({ old: e.detail.oldValue, new: e.detail.newValue })
    )
    cell.focus()
    for (const v of ['5', '6', '7']) {
      cell.value = v
      cell.dispatchEvent(new Event('change', { bubbles: true }))
    }
    // …then clear it, which used to fire nothing and leave the raw string behind.
    cell.value = ''
    cell.dispatchEvent(new Event('change', { bubbles: true }))
    return { seen, stored: item.qty }
  })
  expect(result.seen.map((s: any) => s.new)).toEqual([5, 6, 7, undefined])
  // Each edit's "before" is the previous edit's "after" — that is what a baseline means.
  expect(result.seen.map((s: any) => s.old)).toEqual([12, 5, 6, 7])
  expect(result.stored).toBeUndefined()
})
