import { test, expect, afterEach } from 'bun:test'
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
