import { test, expect, afterEach, describe } from 'bun:test'
import { tosiTable, derivedMaxVisibleRows } from './data-table.js'
import { initLocalization, i18n } from './localize.js'

/*
Accessible names for `<tosi-table>`'s two nameless controls.

The column-options button is an icon alone and an editable cell is an empty input, so neither
has any text to derive a name from — a screen reader announced 49 of them on the data-table
doc page as bare "button" and "edit text". `tests/a11y-names.pw.ts` covers the rendered,
UNLOCALIZED result in a real browser; what is only reachable here is the localized branch,
which emits the `data-tosi-localized` directive so the name follows a locale change.
*/

const TSV = [
  'en-US\tfr',
  'English\tFrench',
  'English\tFrançais',
  '🇺🇸\t🇫🇷',
  'Column Options\tOptions de colonne',
  'Price\tPrix',
].join('\n')

/*
The element must be CONNECTED before its `initAttributes` are readable: an element creator's
props are applied on connect, so `tosiTable({ localized: true }).localized` is still `false`
while it is detached. Adopters connect their elements, so this is a test artifact rather than
a defect — but left unnoticed it would have quietly pointed the localized assertions below at
the unlocalized path.
*/
function makeTable(props: Record<string, unknown> = {}): any {
  const el = tosiTable(props as any) as any
  document.body.append(el)
  return el
}

afterEach(() => {
  i18n.locale.value = 'en-US'
  document.body.replaceChildren()
})

test('an unlocalized table names its controls with the key verbatim', () => {
  const table = makeTable()
  expect(table.localized).toBe(false)
  expect(table.labelAttrs('Column Options')).toEqual({
    title: 'Column Options',
  })
  expect(table.labelAttrs('Price', 'aria-label')).toEqual({
    'aria-label': 'Price',
  })
})

test('a localized table emits the directive so the name follows the locale', () => {
  initLocalization(TSV)
  i18n.locale.value = 'fr'
  const table = makeTable({ localized: true })
  expect(table.localized).toBe(true)

  /*
  Both halves matter. The attribute is written translated UP FRONT so there is no frame
  showing the untranslated string, and the directive is what re-applies it when the locale
  changes later — the observer is filtered to the directive attribute itself, so writing
  `title` here does not re-enter it.
  */
  expect(table.labelAttrs('Column Options')).toEqual({
    title: 'Options de colonne',
    'data-tosi-localized': '{"title":"Column Options"}',
  })
  expect(table.labelAttrs('Price', 'aria-label')).toEqual({
    'aria-label': 'Prix',
    'data-tosi-localized': '{"aria-label":"Price"}',
  })
})

test('an empty key contributes no attributes at all', () => {
  /*
  A column with no `name` and no `prop` must not produce `title=""` — an empty name is not an
  absent one: it suppresses the fallback a browser would otherwise compute, which is strictly
  worse than leaving the control alone.
  */
  expect(makeTable().labelAttrs('')).toEqual({})
  expect(makeTable({ localized: true }).labelAttrs('')).toEqual({})
})

/*
#82: the row cap is a LAYOUT limit, not a rendering-cost limit.

A virtual `listBinding` renders only the visible window, so the UI side is O(1) in row count
and the array size is irrelevant to render cost. The one thing that scales is the spacer's
height, and the one hard failure is the browser refusing to lay out an element that tall — so
the cap belongs at `maxElementHeight / rowHeight`.

The old flat `10000` was ~42x under that AND silently `slice`d the rest, so a 25,000-row table
showed 10,000 and every count, filter and sort ran on the truncated set, self-consistently and
wrongly. Consumers routinely load 300k+ rows with no UI cost.
*/
test('#82: the cap derives from the layout ceiling, not a picked number', () => {
  // Chromium's real clamp, 2^24 - 2. At the default 30px rows that is ~559k, not 10k.
  expect(derivedMaxVisibleRows(16777214, 30)).toBe(559240)
  expect(derivedMaxVisibleRows(16777214, 40)).toBe(419430)
  // The number the reporter measured against a real table: 39.98px/row → ~419k at 40px.
  expect(derivedMaxVisibleRows(16777214, 40)).toBeGreaterThan(400000)
})

test('#82: it far exceeds the old flat cap, which is the whole point', () => {
  expect(derivedMaxVisibleRows(16777214, 30)).toBeGreaterThan(10000 * 40)
})

test('#82: no ceiling to probe, or no fixed row height, falls back rather than deriving from zero', () => {
  // No DOM to probe (SSR / happy-dom): a cap of 0 would render an empty table.
  expect(derivedMaxVisibleRows(0, 30)).toBe(10000)
  /*
  `rowHeight: 0` is not a failed measurement, it is a different regime: no fixed height means
  no virtualisation, so every row becomes a real DOM node and the cost genuinely is O(n).
  A cap earns its keep there; in virtual mode it does not.
  */
  expect(derivedMaxVisibleRows(16777214, 0)).toBe(10000)
})

test('#82: never derives a cap below one row', () => {
  expect(derivedMaxVisibleRows(10, 1000)).toBe(1)
})

test('#82: an explicit maxVisibleRows still wins', () => {
  const table = tosiTable({ rowHeight: 30 }) as any
  document.body.append(table)
  const derived = table.maxVisibleRows
  expect(derived).toBeGreaterThan(0)
  table.maxVisibleRows = 25
  expect(table.maxVisibleRows).toBe(25)
  table.remove()
})

/*
#84: a big table with rowHeight 0 is a misconfiguration, so say so.

The issue proposed binary-searching `captureScrollAnchor`'s walk. That optimises a
configuration you should not be in — `rowHeight: 0` turns virtualisation off, and the docs
recommend it for "smaller tables, or tables with variable row-heights". Nobody picks it for
thousands of rows deliberately; they arrive there by not setting a rowHeight.
*/
test('#84: a large non-virtual table warns on EVERY render, not once', () => {
  const warnings: string[] = []
  const realWarn = console.warn
  console.warn = (m?: unknown) => void warnings.push(String(m))
  try {
    const table = tosiTable({ rowHeight: 0 }) as any
    document.body.append(table)
    table.array = Array.from({ length: 1500 }, (_, i) => ({
      id: i,
      name: `r${i}`,
    }))
    table.render()
    table.render()
    table.render()
    /*
    Deliberately NOT once-per-table. This is a misconfiguration the developer can fix in one
    line, and it persists until they do — a single notice scrolls out of the console and is
    gone. Everything else in this file warns once precisely because it is NOT actionable
    that way; this one is.
    */
    const hits = warnings.filter((w) => w.includes('NOT VIRTUAL'))
    expect(hits.length).toBe(3)
    expect(hits[0]).toContain('1,500')
    expect(hits[0]).toContain('rowHeight')
    table.remove()
  } finally {
    console.warn = realWarn
  }
})

test('#84: a small non-virtual table is a legitimate choice and stays quiet', () => {
  const warnings: string[] = []
  const realWarn = console.warn
  console.warn = (m?: unknown) => void warnings.push(String(m))
  try {
    const table = tosiTable({ rowHeight: 0 }) as any
    document.body.append(table)
    table.array = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `r${i}`,
    }))
    table.render()
    expect(warnings.filter((w) => w.includes('NOT VIRTUAL')).length).toBe(0)
    table.remove()
  } finally {
    console.warn = realWarn
  }
})

test('#84: a virtual table never gets the advice, however many rows', () => {
  const warnings: string[] = []
  const realWarn = console.warn
  console.warn = (m?: unknown) => void warnings.push(String(m))
  try {
    const table = tosiTable({ rowHeight: 30 }) as any
    document.body.append(table)
    table.array = Array.from({ length: 5000 }, (_, i) => ({
      id: i,
      name: `r${i}`,
    }))
    table.render()
    expect(warnings.filter((w) => w.includes('NOT VIRTUAL')).length).toBe(0)
    table.remove()
  } finally {
    console.warn = realWarn
  }
})

/*
Order of operations: filter → sort → window (#147).

`maxVisibleRows` used to be applied FIRST, so both the filter and the sort saw only the first
N rows. Reported from production at 300k rows across two apps: a newly-created company
appended past the cap could never be found by search, because filtering ran over a window
that ended before it.

The window is a LAYOUT ceiling — the browser's maximum element height — so it belongs at the
end, against what will be drawn, not at the start against the data.
*/
describe('#147: the window is applied last', () => {
  const makeTable = (rows: any[], cap: number) => {
    const table = tosiTable() as any
    table.maxVisibleRows = cap
    table.columns = [{ name: 'name', prop: 'name' }]
    table.array = rows
    return table
  }
  const rows = Array.from({ length: 12_000 }, (_, i) => ({
    id: i,
    name: `co-${i}`,
    n: i,
  }))

  test('a matching row PAST the cap is found — the production symptom', () => {
    const table = makeTable(rows, 10_000)
    table.filter = (a: any[]) => a.filter((r) => r.name === 'co-11500')
    table.render()
    expect(table.visibleRows.length).toBe(1)
    expect(table.visibleRows[0].name).toBe('co-11500')
  })

  test('sorting sorts the TABLE, not an arbitrary window of it', () => {
    // Descending by n: the top row must be the largest in the whole array, not the
    // largest within the first `cap` rows.
    const table = makeTable(rows, 10_000)
    table.sort = (a: any, b: any) => b.n - a.n
    table.render()
    expect(table.visibleRows[0].n).toBe(11_999)
  })

  test('the cap still bounds what is RENDERED', () => {
    const table = makeTable(rows, 10_000)
    table.render()
    expect(table.visibleRows.length).toBe(10_000)
  })

  test('a filter narrowing below the cap renders everything it matched', () => {
    const table = makeTable(rows, 10_000)
    table.filter = (a: any[]) => a.filter((r) => r.n % 1000 === 0)
    table.render()
    expect(table.visibleRows.length).toBe(12)
  })

  test('sorting does not reorder the CALLER’s array', () => {
    /*
    `filter` defaults to `passThru`, which returns the array it was GIVEN, so an in-place
    sort would reorder the consumer's data.

    Needs `pinnedTopRows` to reach the hazard, which is the interesting part: without any
    pinning, `effectiveBaseData` returns `this._array.slice(…)` — a copy — and an in-place
    sort is harmless. WITH pinned rows it returns `this._array` itself. So the `.slice()`
    before `.sort()` is load-bearing on exactly one path, and a test written the obvious way
    passes whether or not the copy is there (verified by mutation).
    */
    const data = [{ n: 3 }, { n: 1 }, { n: 2 }]
    const table = makeTable(data, 100)
    table.pinnedTopRows = []
    table.sort = (a: any, b: any) => a.n - b.n
    table.render()
    expect(table.visibleRows.map((r: any) => r.n)).toEqual([1, 2, 3])
    expect(data.map((r) => r.n)).toEqual([3, 1, 2])
  })

  test('a render that changes no input reuses the memo — the 108ms sort is paid once', () => {
    /*
    Correcting the order moved the sort from "at most `cap` rows" to "every match". That is
    the price of sorting the real table, but `pinColumns()`, a schema change and a column
    resize all call `queueRender` without changing the row order, and re-sorting 300k rows
    for a column pin would read as the O(1)-in-rows claim breaking.
    */
    const table = makeTable(rows, 10_000)
    table.sort = (a: any, b: any) => b.n - a.n
    table.render()
    const first = table.visibleRows
    table.render()
    expect(table.visibleRows).toBe(first) // same array identity — not recomputed
  })

  test('changing the sort DOES invalidate it', () => {
    const table = makeTable(rows, 10_000)
    table.sort = (a: any, b: any) => b.n - a.n
    table.render()
    const first = table.visibleRows
    table.sort = (a: any, b: any) => a.n - b.n
    table.render()
    expect(table.visibleRows).not.toBe(first)
    expect(table.visibleRows[0].n).toBe(0)
  })
})

/*
The programmatic selection API must agree with what clicking can do (#157).

`selectRow`/`selectRows` stamped the selection key with no reference to `select`/`multiple`,
while the click path enforces the mode three separate ways. So the API could reach states no
amount of clicking could produce, and neither method fired `selectionChanged` — so a consumer
keeping its own UI in step silently missed every programmatic selection, including the
"restore selection after a data refresh" case these methods are documented for.
*/
describe('#157: selection API respects mode and notifies', () => {
  const rows = () => [{ id: 1 }, { id: 2 }, { id: 3 }]
  const make = (opts: Record<string, unknown>) => {
    const t = tosiTable() as any
    t.columns = [{ name: 'id', prop: 'id' }]
    Object.assign(t, opts)
    t.array = rows()
    t.render()
    return t
  }

  test('single-select: selectRows keeps ONE, like a click', () => {
    const t = make({ select: true, multiple: false })
    t.selectRows(t.array, true)
    expect(t.array.filter((r: any) => r[t.selectedKey]).length).toBe(1)
  })

  test('single-select: selecting REPLACES, it does not accumulate', () => {
    const t = make({ select: true, multiple: false })
    t.selectRow(t.array[0], true)
    t.selectRow(t.array[1], true)
    const selected = t.array.filter((r: any) => r[t.selectedKey])
    expect(selected.length).toBe(1)
    expect(selected[0].id).toBe(2)
  })

  test('multiple: accumulates, as before', () => {
    const t = make({ select: true, multiple: true })
    t.selectRows([t.array[0], t.array[2]], true)
    expect(t.array.filter((r: any) => r[t.selectedKey]).length).toBe(2)
  })

  test('`select: false` does NOT block programmatic selection', () => {
    /*
    `select` governs what the USER may do; refusing the program breaks headless use —
    restoring a selection after a refresh, driving a table from a controller, and this
    component's own pinned-row example, which selects a totals row on a table that never
    enables clicking. The invariant #157 is actually about is CARDINALITY, which `multiple`
    covers on its own.
    */
    const t = make({ select: false, multiple: false })
    t.selectRows(t.array, true)
    // Single-select cardinality still holds.
    expect(t.array.filter((r: any) => r[t.selectedKey]).length).toBe(1)
  })

  test('DEselection works even with selection disabled', () => {
    /*
    Gating selection preserves the invariant; gating deselection would strand rows that were
    selected before the mode changed, with no way to clear them. Deselection can only ever
    reduce a selection.
    */
    const t = make({ select: true, multiple: true })
    t.selectRows(t.array, true)
    t.select = false
    t.multiple = false
    t.deSelect()
    expect(t.array.filter((r: any) => r[t.selectedKey]).length).toBe(0)
  })

  test('selectionChanged fires — programmatic and user selection look the same', () => {
    const t = make({ select: true, multiple: true })
    let calls = 0
    t.selectionChanged = () => {
      calls += 1
    }
    t.selectRow(t.array[0], true)
    expect(calls).toBe(1)
    t.selectRows([t.array[1]], true)
    expect(calls).toBe(2)
    t.deSelect()
    expect(calls).toBe(3)
  })

  test('the raw stamp does NOT notify — what the once-per-click guarantee rests on', () => {
    /*
    A plain click deselects everything then selects one; a shift-range walks a span. If those
    went through the public API they would notify several times per interaction, so the click
    path uses `stampSelection` and notifies once at the end.

    Asserted on the primitive rather than by clicking: the virtual list renders no rows under
    happy-dom (it needs real layout), so a click test here would dispatch into an empty table
    and pass while checking nothing. End-to-end click behaviour lives in the Playwright table
    specs.
    */
    const t = make({ select: true, multiple: true })
    let calls = 0
    t.selectionChanged = () => {
      calls += 1
    }
    t.stampSelection(t.array, true)
    expect(calls).toBe(0)
    expect(t.array.filter((r: any) => r[t.selectedKey]).length).toBe(3)
  })
})

test('columns inferred from an empty array are not remembered (data that arrives later still gets columns)', () => {
  const table = tosiTable()
  expect(table.columns).toEqual([])
  table.array = [{ name: 'Ada', role: 'admin' }]
  expect(table.columns.map((c) => c.prop)).toEqual(['name', 'role'])
})

test('with no data, columns is one stable empty list, and handing it back does not fix the table at zero columns', () => {
  const table = tosiTable()
  // the same list every time it is asked (no new array per render)
  expect(table.columns).toBe(table.columns)
  // A round trip of `value` while empty used to store that [] as the columns, so the data
  // that followed was never inferred from.
  table.value = { ...table.value, array: [{ name: 'Ada', role: 'admin' }] }
  expect(table.columns.map((c) => c.prop)).toEqual(['name', 'role'])
})
