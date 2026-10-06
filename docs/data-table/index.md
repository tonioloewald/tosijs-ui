# table

A virtual data-table, configurable via a `columns` array (which will automatically be generated if not provided),
that displays gigantic tables with fixed headers (and live column-resizing) using a minimum of resources and cpu.

```js
import { tosiTable } from 'tosijs-ui'
import { input } from 'tosijs'.elements

const emojiRequest = await fetch('https://raw.githubusercontent.com/tonioloewald/emoji-metadata/master/emoji-metadata.json')
const emojiData = await emojiRequest.json()

const columns = [
  {
    name: "emoji",
    prop: "chars",
    align: "center",
    width: 80,
    sort: false,
    visible: true
  },
  {
    prop: "name",
    width: 300,
    // custom cell using bindings to make the field editable
    dataCell() {
      return input({
        class: 'td',
        bindValue: '^.name',
        title: 'name',
        onMouseup: (event) => { event.stopPropagation() },
        onTouchend: (event) => { event.stopPropagation() },
      })
    },
  },
  {
    prop: "category",
    sort: "ascending",
    width: 150
  },
  {
    prop: "subcategory",
    width: 150
  },
]

const table = tosiTable({
  multiple: true,
  array: emojiData,
  localized: true,
  columns,
  rowHeight: 40,
})

table.addEventListener('mouseover', (e) => {
  for (const el of table.querySelectorAll('.row-hover')) {
    el.classList.remove('row-hover')
  }
  const item = table.getItem(e.target)
  if (!item) return
  table.getCells(item)?.forEach(c => c.classList.add('row-hover'))
})

preview.append(table)
```
```css
.preview input.td {
  margin: 0;
  border-radius: 0;
  box-shadow: none !important;
}

.preview input.td:focus {
  background: #fff4;
}

.preview tosi-table {
  height: 100%;
}

.preview .row-hover {
  background: #08835810;
}
```
```test
const table = await waitFor('tosi-table')
await new Promise(resolve => {
  const check = () => {
    if (table.visibleRows.length > 0) return resolve()
    setTimeout(check, 100)
  }
  check()
})

test('table renders with data', () => {
  expect(table.multiple).toBe(true)
  expect(table.visibleRows.length).toBeGreaterThan(0)
  expect(table.array.length).toBeGreaterThan(0)
})

test('row selection: data model + aria-selected on row (incl. custom dataCell)', async () => {
  // Wait for listBinding to stamp DOM cells for the visible window
  const items = table.visibleRows
  await new Promise(resolve => {
    const check = () => {
      if (table.getCells(items[0]) && table.getCells(items[1])) return resolve()
      setTimeout(check, 100)
    }
    check()
  })

  table.deSelect()
  table.selectRow(items[0])
  table.selectRow(items[1])

  // Data model reflects selection immediately
  expect(items[0][table.selectedKey]).toBe(true)
  expect(items[1][table.selectedKey]).toBe(true)
  expect(table.selectedRows.length).toBe(2)

  // DOM: aria-selected lives on the row element. CSS targets
  // .tr[aria-selected] .td to highlight cells. The attribute is set via
  // toggleAttribute, so its value is "" (presence-only) — match accordingly.
  const cells0 = table.getCells(items[0])
  const cells1 = table.getCells(items[1])
  expect(cells0.length).toBe(table.visibleColumns.length)
  expect(cells1.length).toBe(table.visibleColumns.length)
  const row0 = cells0[0].closest('.tr')
  const row1 = cells1[0].closest('.tr')
  expect(row0.hasAttribute('aria-selected')).toBe(true)
  expect(row1.hasAttribute('aria-selected')).toBe(true)
  // The `name` column (index 1) uses a dataCell input — confirm the custom
  // element is the actual cell living inside the same selected row.
  expect(cells0[1].tagName).toBe('INPUT')
  expect(cells0[1].closest('.tr')).toBe(row0)

  // Deselect and verify both data model and DOM clear
  table.deSelect()
  expect(table.selectedRows.length).toBe(0)
  expect(items[0][table.selectedKey]).not.toBe(true)
  expect(items[1][table.selectedKey]).not.toBe(true)
  expect(row0.hasAttribute('aria-selected')).toBe(false)
  expect(row1.hasAttribute('aria-selected')).toBe(false)
})

test('getCells and getItem', async () => {
  // Wait for list binding to stamp DOM elements
  const items = table.visibleRows
  let cells
  await new Promise(resolve => {
    const check = () => {
      cells = table.getCells(items[0])
      if (cells) return resolve()
      setTimeout(check, 100)
    }
    check()
  })

  expect(cells.length).toBe(table.visibleColumns.length)

  // getItem round-trips back to the same item
  const item = table.getItem(cells[0])
  expect(item).toBe(items[0])

  // getCells from a cell element
  const cellsFromCell = table.getCells(cells[1])
  expect(cellsFromCell).toBe(cells)
})
```

> In the preceding example, the `name` column is *editable* (and *bound*, try editing something and scrolling
> it out of view and back) and `multiple` select is enabled. In the console, you can try `$('tosi-table').visibleRows`
> and $('tosi-table').selectedRows`.

You can set the `<tosi-table>`'s `array`, `columns`, and `filter` properties directly, or set its `value` to:

```
{
  array: any[],
  columns: ColumnOptions[] | null,
  filter?: ArrayFilter
}
```

## `ColumnOptions`

You can configure the table's columns by providing it an array of `ColumnOptions`:

```
export interface ColumnOptions {
  name?: string
  prop: string
  width: number
  visible?: boolean
  align?: string
  type?: string // valueRenderer type: 'currency(USD)', 'fixed(2)', 'bytes', 'boolean(check,x)', …
  pinned?: 'left' | 'right'
  sort?: false | 'ascending' | 'descending'
  headerCell?: (options: ColumnOptions) => HTMLElement
  dataCell?: (options: ColumnOptions) => HTMLElement
}
```

## Column value types

Give a column a `type` and it's formatted (and aligned) automatically — no hand-rolled
`dataCell`. The `type` is a [`valueRenderer`](value-renderer) string:

```
[
  { prop: 'name',    width: 160 },
  { prop: 'price',   width: 100, type: 'currency(USD)' }, // localized $, right-aligned
  { prop: 'weight',  width: 100, type: 'fixed(3)' },      // 3 decimals, right-aligned
  { prop: 'size',    width: 100, type: 'bytes' },         // 1.5 MB, right-aligned
  { prop: 'active',  width: 60,  type: 'boolean' },       // checkSquare / square, centered
]
```

Numeric types (`number`, `currency`, `fixed`, `percent`, `sci`, `eng`, `bytes`) right-align
by default; `boolean` centers and renders icons. An explicit `align` — or a `dataCell` —
always wins. Formatting follows the app locale (`setLocale()`). Numeric cells also get a
`-negative` or `-zero` state class by value sign, so the red "Change" values above come from
one CSS rule (`.-negative { color: #d32f2f }`), no cell renderer.

```js
import { tosiTable } from 'tosijs-ui'

const rows = [
  { item: 'Alpha Widget', price: 12.5, qty: 1240, change: 3.25, rate: 0.075, mass: 1.23456, size: 1_536_000, active: true, flagged: false },
  { item: 'Beta Gadget', price: 4.99, qty: 42, change: -1.5, rate: 0.2, mass: 0.5, size: 512, active: false, flagged: true },
  { item: 'Gamma Sprocket', price: 199, qty: 8, change: 0, rate: 1.5, mass: 12.005, size: 2_500_000_000, active: true, flagged: true },
  { item: 'Delta Cog', price: 0.75, qty: 99999, change: -0.12, rate: 0.004, mass: 0.001, size: 48_200, active: false, flagged: false },
]

const table = tosiTable({ style: { display: 'block', height: '240px' } })
table.value = {
  array: rows,
  columns: [
    { prop: 'item', name: 'Item', width: 150 },
    { prop: 'price', name: 'Price', width: 110, type: 'currency(USD)' },
    { prop: 'change', name: 'Change', width: 100, type: 'currency(USD)' }, // red negatives via CSS
    { prop: 'qty', name: 'Qty', width: 90, type: 'number' },
    { prop: 'rate', name: 'Rate', width: 80, type: 'percent(1)' },
    { prop: 'mass', name: 'Mass', width: 90, type: 'fixed(2)' },
    { prop: 'size', name: 'Size', width: 100, type: 'bytes' },
    { prop: 'active', name: 'Active', width: 80, type: 'boolean' },
    { prop: 'flagged', name: 'Flag', width: 80, type: 'boolean(check, x)' },
  ],
}
preview.append(table)
```
```css
.preview .-negative { color: #d32f2f; }
.preview .-zero { opacity: 0.45; }
```

## Pinned Columns and Rows

Set `pinned: 'left'` or `pinned: 'right'` on individual columns to pin
them during horizontal scroll. Pinned columns are sorted to the edges
automatically. You can also pin/unpin columns via the header menu, or by
dragging a column into/out of a pinned zone.

Set `pinnedTop` and `pinnedBottom` to pin the first/last N data rows
(pinned top rows appear below the header row).

All pinning uses CSS `position: sticky` for frame-perfect rendering with
no jitter.

```js
import { elements } from 'tosijs'
import { tosiTable, icons } from 'tosijs-ui'

const { button, span } = elements

const count = 100
const cols = ['Q1', 'Q2', 'Q3', 'Q4']
const numKeys = []
const rows = Array.from({ length: count }, (_, i) => {
  const row = { id: i + 1, name: 'Item ' + (i + 1) }
  for (const year of [2024, 2025, 2026]) {
    for (const q of cols) {
      const key = q + ' ' + year
      row[key] = Math.round((Math.random() * 200 - 100) * 100) / 100
      if (i === 0) numKeys.push(key)
    }
  }
  return row
})

// totals row
const totals = { id: '', name: 'Total' }
for (const key of numKeys) {
  totals[key] = Math.round(rows.reduce((sum, r) => sum + r[key], 0) * 100) / 100
}
rows.push(totals)

// custom cell that colors negative numbers red
function numCell(options) {
  return span({
    class: 'td num-cell',
    bindText: '^.' + options.prop,
    bind: {
      value: '^.' + options.prop,
      binding: {
        toDOM(el, val) {
          el.style.color = val < 0 ? '#c00' : ''
        }
      }
    }
  })
}

const dataColumns = numKeys.map(key => ({
  prop: key, width: 100, align: 'right', dataCell: numCell,
}))

const table = tosiTable({
  array: rows,
  rowHeight: 32,
  pinnedBottom: 1,
  rowRendered(item, cells) {
    const total = numKeys.reduce((sum, key) => sum + (item[key] || 0), 0)
    const rowClass = total < 0 ? 'row-negative' : 'row-positive'
    for (const c of cells) {
      if (c.classList.contains('num-cell')) {
        c.classList.add(rowClass)
      }
    }
  },
  columns: [
    { prop: 'id', name: '#', width: 50, align: 'right', pinned: 'left' },
    { prop: 'name', width: 120, pinned: 'left' },
    ...dataColumns,
    {
      prop: '_actions',
      name: '',
      width: 48,
      sort: false,
      pinned: 'right',
      dataCell() {
        return button(
          {
            class: 'td actions-btn',
            title: 'Row actions',
            onClick(e) { e.stopPropagation() },
            onMouseup(e) { e.stopPropagation() },
          },
          icons.moreVertical(),
        )
      },
    },
  ],
})

preview.append(table)
```
```css
.preview tosi-table {
  height: 100%;
}
.preview .actions-btn {
  border: none;
  padding: 0;
  cursor: pointer;
  display: block;
  text-align: center;
  width: 100%;
}
.preview tosi-table .pinned-bottom {
  background: var(--tosi-table-bg, var(--tosi-bg, #fff));
  font-weight: bold;
}
.preview .row-pinned .td {
  background: var(--tosi-table-bg, var(--tosi-bg, #fff));
}
.preview .num-cell {
  font-variant-numeric: tabular-nums;
}
```
```test
// `waitFor` is scoped to THIS example's preview. The previous version took the last
// `tosi-table` in the whole document, which silently meant "whichever example most
// recently finished appending one" — so adding an example further down the page could
// hand this test somebody else's table, and the wait below would then never resolve.
const table = await waitFor('tosi-table')
// Wait until the pinned row has been stamped AND its bindings have settled
// (numeric cells show their text, the actions button is in place).
await new Promise(resolve => {
  const check = () => {
    const row = table.querySelector('.tbody-pinned-bottom .tr')
    if (
      row &&
      row.querySelector('button') &&
      Array.from(row.children).some(c => c.classList.contains('num-cell') && c.textContent.trim().length > 0)
    ) return resolve()
    setTimeout(check, 100)
  }
  check()
})

test('pinned row goes through the same listBinding as virtual rows', () => {
  const totals = table.array[table.array.length - 1]
  const pinnedRow = table.querySelector('.tbody-pinned-bottom .tr')
  const pinnedCells = Array.from(pinnedRow.children)

  // Sanity: same number of cells as visible columns
  expect(pinnedCells.length).toBe(table.visibleColumns.length)

  // dataCell honoured: numeric columns kept their `num-cell` class, and the
  // _actions column rendered its <button>
  const numCells = pinnedCells.filter(c => c.classList.contains('num-cell'))
  expect(numCells.length).toBeGreaterThan(0)
  expect(pinnedCells.some(c => c.tagName === 'BUTTON')).toBe(true)

  // numCell uses bindText: '^.<prop>' — confirm path-bindings resolved
  // (this requires the cell to live inside a list-bound row).
  const renderedTexts = numCells.map(c => c.textContent?.trim() ?? '')
  expect(renderedTexts.every(t => t.length > 0)).toBe(true)
  expect(renderedTexts.some(t => /^-?\d/.test(t))).toBe(true)

  // rowRendered fired: numeric cells of this row carry `row-negative` or
  // `row-positive` based on the totals row's sign. Either way the loop did
  // *something* — so the test verifies the work happened regardless of the
  // randomized data.
  const total = Object.keys(totals)
    .filter(k => typeof totals[k] === 'number')
    .reduce((s, k) => s + totals[k], 0)
  const expected = total < 0 ? 'row-negative' : 'row-positive'
  expect(numCells.every(c => c.classList.contains(expected))).toBe(true)

  // getCells / getItem round-trip works for pinned items
  const cellsForTotals = table.getCells(totals)
  expect(cellsForTotals?.length).toBe(table.visibleColumns.length)
  expect(table.getItem(cellsForTotals[0])).toBe(totals)

  // Selection on a pinned row sets aria-selected on the row element
  table.deSelect()
  table.selectRow(totals)
  expect(pinnedRow.hasAttribute('aria-selected')).toBe(true)

  table.deSelect()
  expect(pinnedRow.hasAttribute('aria-selected')).toBe(false)
})
```

## Selection

`<tosi-table>` supports `select` and `multiple` boolean properties allowing rows to be selectable. Selected rows will
be given the `[aria-selected]` attribute, so style them as you wish.

`multiple` select supports shift-clicking and command/meta-clicking.

`<tosi-table>` provides an `selectionChanged(visibleSelectedRows: any[]): void` callback property allowing you to respond to changes
in the selection, and also `selectedRows` and `visibleSelectedRows` properties.

The following methods are also provided:

- `<tosi-table>.selectRow(row: any, select = true)` (de)selects specified row
- `<tosi-table>.selectRows(rows?: any[], select = true)` (de)selects specified rows
- `<tosi-table>.deSelect(rows?: any[])` deselects all or specified rows.

As of 1.15 these are a **supported programmatic surface**, not just internals:

- They **enforce the table's cardinality.** On a single-select table `selectRows([a, b, c], true)`
  no longer leaves three rows selected — a state no amount of clicking can produce. It keeps the
  last row and warns.
- They **fire `selectionChanged`**, unconditionally. Previously they did not, so a consumer
  keeping its own UI in step silently missed every programmatic selection — including
  "restore the selection after a data refresh", which is what these methods are documented for.

If your code both *drives* selection and *listens* for it, guard the feedback loop.
`<tosi-crud>` needed exactly this (`_applyingSelection`): the deselect half of a
replace-selection reported an empty selection, and the listener cleared the record mid-edit.

```typescript
this.applying = true
try {
  table.selectRows(rows, true)
} finally {
  this.applying = false
}
// …and in the handler:  if (this.applying) return
```

## Row Access

## How many rows can it show? (`maxVisibleRows`)

More than you are likely to have. The virtual `listBinding` renders only the visible window,
so **the UI cost is O(1) in row count** — 300,000 rows cost the same to scroll as 300. The
size of the array is simply not what binds.

What binds is *layout*: the spacer element that gives the scroll area its height, and the
maximum height a browser will lay out. So `maxVisibleRows` is derived at runtime from
`maxElementHeight / rowHeight` rather than being a number someone picked. At the default
30px rows that is on the order of **half a million to a million rows**, depending on the
engine — it is probed, because the ceiling is engine- and version-specific (two Chromium
measurements in this project sit a factor of two apart).

Set it yourself to override:

```typescript
table.maxVisibleRows = 50000
```

If a table ever does have more rows than the cap, it **says so in the console** with both
numbers, rather than truncating in silence — the older behaviour was a flat `10000` that
`slice`d the rest without a word, so counts, filters and sorts all ran on the truncated set
and agreed with each other while disagreeing with the data.

Past the layout ceiling the spacer stops growing, so the failure mode is "the far end cannot
be scrolled to", not an exception.

**`rowHeight: 0` is a different regime.** With no fixed row height there is no
virtualisation: every row becomes a real DOM node, the cost genuinely is O(n), and the cap
stays conservative on purpose.

Because the table uses a flat CSS grid (no `.tr` row elements), two methods
provide O(1) access between items and their cells:

- `<tosi-table>.getCells(itemOrCell)` — returns the `HTMLElement[]` of cells for a
  given data item or any cell in the row, or `undefined` if the row isn't
  currently rendered (virtual scroll)
- `<tosi-table>.getItem(cell)` — returns the data item bound to a cell element

These are useful for row-level hover effects, styling, and event handling:

```typescript
table.addEventListener('mouseover', (e) => {
  for (const el of table.querySelectorAll('.row-hover')) {
    el.classList.remove('row-hover')
  }
  const item = table.getItem(e.target)
  if (!item) return
  table.getCells(item)?.forEach(c => c.classList.add('row-hover'))
})
```

### `rowRendered` callback

For virtual tables, cells are created and destroyed as you scroll. The
`rowRendered` callback fires whenever a row's cells are rendered, letting
you apply styling that survives virtualisation:

```typescript
table.rowRendered = (item, cells) => {
  if (item.overdue) {
    cells.forEach(c => c.classList.add('overdue'))
  }
}
```

## Editing

Set `editable` and the cells become inputs. Give the table a `schema` and it knows what kind
of input each column wants and whether an edit is valid.

```js
import { tosiTable } from 'tosijs-ui'

const rows = [
  { sku: 'W-1', name: 'Widget', qty: 12, price: 9.99, active: true },
  { sku: 'G-9', name: 'Gasket', qty: 5, price: 1.5, active: false },
  { sku: 'B-3', name: 'Bracket', qty: 0, price: 24, active: true },
]

const log = document.createElement('pre')
const table = tosiTable({
  editable: true,
  style: { height: '160px' },
  schema: {
    type: 'object',
    properties: {
      sku: { type: 'string' },
      name: { type: 'string' },
      qty: { type: 'integer', minimum: 0 },
      price: { type: 'number' },
      active: { type: 'boolean' },
    },
  },
  columns: [
    { prop: 'sku', width: 80, editable: false },
    { prop: 'name', width: 140 },
    { prop: 'qty', width: 80 },
    { prop: 'price', width: 90 },
    { prop: 'active', width: 70 },
  ],
  array: rows,
})

table.addEventListener('change', (event) => {
  const { field, oldValue, newValue, error } = event.detail
  log.textContent =
    `${field}: ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}` +
    (error ? `  ⚠️ ${error}` : '')
})

preview.append(table, log)
```
```test
const table = await waitFor('tosi-table')
// Rows are list-bound, so the cells arrive after the element does.
await waitFor('[data-edit-prop="qty"]')
const cell = (prop) => table.querySelector(`[data-edit-prop="${prop}"]`)

test('the schema decides the control, and editable is per column', () => {
  expect(cell('qty').type).toBe('number')
  expect(cell('active').type).toBe('checkbox')
  expect(cell('name').type).toBe('text')
  // A column marked `editable: false` in an editable table stays read-only.
  expect(cell('sku')).toBe(null)
})

test('editing a cell writes the row and reports what changed', () => {
  const qty = cell('qty')
  const item = table.getItem(qty)
  let detail = null
  table.addEventListener('change', (e) => (detail = e.detail), { once: true })

  qty.focus()
  qty.value = '20'
  qty.dispatchEvent(new Event('change', { bubbles: true }))

  expect(item.qty).toBe(20)
  expect(detail.field).toBe('qty')
  expect(detail.oldValue).toBe(12)
  expect(detail.newValue).toBe(20)
  expect(detail.error).toBe(null)
})

```

**Commits on `change`, not on `input`.** An event per keystroke would make `3` a legitimate
intermediate state of typing `35`, and every listener, validator and save hook would see
values the user never meant to enter.

**`dataCell` always wins.** A column with its own cell renderer is never made editable — it
builds and binds itself, and the table has no business reaching into it. `editable: false` on
a column opts one out of an editable table; `editable: true` opts one in to a read-only one.

**Validation needs a `schema` and a registered validator** — see
[`setSchemaValidator`](/schema-form/). It is the same model `<tosi-schema-form>` uses, so a
cell and a field agree about what a property is. `<tosi-table>` itself imports no schema
library: a table is the component people use *without* one, and it must never make anyone
install something to build.

Without a schema the cells are text inputs and nothing is reported wrong, because nothing
described what right would be. An invalid edit is **still written**: the model holds what the user
typed and the cell says it is wrong, rather than the table refusing input and leaving them
guessing.

The `change` event carries `{ item, field, oldValue, newValue, error }`. Persisting is yours
to wire — see [`<tosi-crud>`](/crud/) for the same edits behind a `save()` store adapter.

## Sorting

By default, the user can sort the table by any column which doesn't have a `sort === false`.

You can set the initial sort by setting the `sort` value of a specific column to `ascending`
or `descending`.

You can override this by setting the table's sort function (it's an `Array.sort()` callback)
to whatever you like, and you can replace the `headerCell` or set the `sort` of each column
to `false` if you have some specific sorting in mind.

You can disable sorting controls by adding the `nosort` attribute to the `<tosi-table>`.

## Row Grouping

Rows that belong together — the lines of one invoice, the episodes of one series — can be
**clustered**, striped as a unit, and stripped of the values they all repeat.

Set `rowGroupId`, a function from a row to its group's id:

```typescript
table.rowGroupId = (row) => `${row.invoice}/${row.buyer}`
```

With it set, three things change:

- **Rows are clustered.** Any other sort is applied first and survives *within* each group;
  clustering then brings each group together. Groups appear in **first-appearance order**,
  so a group goes wherever its best-sorted row went — sort by amount and the biggest invoice
  is still first. (Ordering the groups by their *id* would have thrown the sort away.)
- Each row gets **`table-cluster-even`** or **`table-cluster-odd`**, alternating per *group*,
  not per row. A five-line invoice is one stripe.
- The classes are applied from the data, so they survive virtual scrolling. There is no
  `:nth-child` equivalent — only a screenful of rows exists at a time.

The default styling tints odd groups via `--tosi-table-cluster-odd-bg`; override that
variable, or the classes, to taste.

### `visibleGroupedRowIds`

An array of group ids that are shown **regardless of the filter**:

```typescript
table.visibleGroupedRowIds = ['INV-1001/Acme']
```

A search that matches one line of an invoice can then open the whole invoice, without the
filter having to know anything about grouping. Forced rows are added to the filter's result
rather than replacing it, so a filter that ranks as well as selects keeps its ranking.

### `nonRepeatingGroupedRowCells`

An array of property names whose columns render **only in the first row of each group**:

```typescript
table.nonRepeatingGroupedRowCells = ['invoice', 'buyer']
```

Set this **without** `rowGroupId` and the grouping is inferred: rows group by exactly those
values. So the common case — "show the invoice and buyer once per invoice" — is a single
line of configuration.

Pinned rows (`pinnedTopRows` / `pinnedBottomRows`) are deliberately exempt from grouping
altogether — they sit outside the clustering, so they are never striped and never hidden.

**How it works, and how to change it.** These cells render normally and are hidden by one
CSS rule: the row that heads a group gets `table-cluster-first`, those cells get
`cluster-repeat`, and the rest follows.

```typescript
.tr:not(.table-cluster-first) .cluster-repeat {
  color: transparent;
  user-select: none;
}
.tr:not(.table-cluster-first) .cluster-repeat > * {
  display: none;
}
```

Because it is only a rule about classes, a column with a custom `dataCell` is covered too —
the table tags the cell whoever built it. It also means you can override the effect
wholesale: dim the repeats instead of hiding them, show them on hover, or scope the rule to
one column.

**Never `display: none` on the cell itself, and not `visibility: hidden` either.** Every cell
is an item of the row's grid, so removing one does not leave a gap — it pulls each later cell
one column to the left and the row renders under the wrong headers. `visibility: hidden`
keeps the track but stops the cell painting its **background**, and a pinned column's opaque
background is the only thing masking the columns scrolling underneath it: repeated cells
become windows onto the scrolled content behind them.

So hide the content and keep the box — transparent text, `display: none` on element children
(which transparency does not reach), and `user-select: none` so what you copy matches what
you see.

For the same decision in JavaScript — inside a `dataCell` binding or a `rowRendered`
callback — **`table.isFirstInGroup(row)`** answers it directly. It is always `true` when the
table is ungrouped.

### `rowGroupCounts` — how much of each group is showing

A cell that reports on its group ("showing 2 of 7") or offers a **show-all** toggle needs to
know how many rows the group has, not just how many are on screen. That comparison is the
one thing a cell renderer cannot make for itself: the filter has already run, so a consumer
sees the survivors and has nothing to measure them against.

**`table.rowGroupCounts`** is a `Map` from group id to `{ visible, total }` — rendered rows
against rows before filtering — recomputed each render and available while cells render.
**`table.groupIdFor(row)`** gives a row's group id, which matters when the grouping was
*inferred* from `nonRepeatingGroupedRowCells`: you never wrote that function, so its ids are
otherwise unreproducible.

```typescript
// inside a dataCell binding, or rowRendered
const id = table.groupIdFor(row)
const { visible, total } = table.rowGroupCounts.get(id) ?? { visible: 0, total: 0 }
cell.textContent = visible < total ? `showing ${visible} of ${total}` : `${total} lines`

// …and the toggle is just a set of ids handed back to the table
expanded.has(id) ? expanded.delete(id) : expanded.add(id)
table.visibleGroupedRowIds = [...expanded]
```

Groups the filter removed **entirely** are still in the map, with `visible: 0` — otherwise
"nothing in this group matched" would be indistinguishable from "no such group", and the
first is precisely when a show-all toggle is worth offering. The map is always a `Map`
(empty when ungrouped), so `.get()` needs no null check. Pinned rows sit outside grouping
and are not counted.

### Example

Grouping the emoji table by category and subcategory. It is grouped by *inference* — only
`nonRepeatingGroupedRowCells` is set — so each subcategory is named once and striped as a
block. Scroll it: the table is virtual, so these rows are created and destroyed as you go,
and the stripes stay attached to the right groups because they are computed from the data
rather than from the DOM.

```js
import { tosiTable } from 'tosijs-ui'

const emojiRequest = await fetch('https://raw.githubusercontent.com/tonioloewald/emoji-metadata/master/emoji-metadata.json')
const emojiData = await emojiRequest.json()

const table = tosiTable({
  array: emojiData,
  rowHeight: 32,
  columns: [
    { prop: 'category', width: 170, sort: 'ascending' },
    { prop: 'subcategory', width: 170 },
    { prop: 'chars', name: 'emoji', width: 70, align: 'center', sort: false },
    { prop: 'name', width: 260 },
  ],
})

// no rowGroupId needed — grouping is inferred from these two columns
table.nonRepeatingGroupedRowCells = ['category', 'subcategory']

preview.append(table)
```
```css
.preview tosi-table {
  height: 100%;
}
```
```test
const table = await waitFor('tosi-table')
await new Promise(resolve => {
  const check = () => {
    if (table.visibleRows.length && table.getCells(table.visibleRows[0])) return resolve()
    setTimeout(check, 100)
  }
  check()
})

const rows = table.visibleRows
const groupOf = (row) => `${row.category}/${row.subcategory}`

// What the table SHOULD have concluded, derived independently from the data.
const groupIndex = new Map()
const firstOfGroup = new Set()
for (const row of rows) {
  const g = groupOf(row)
  if (groupIndex.has(g)) continue
  groupIndex.set(g, groupIndex.size)
  firstOfGroup.add(row)
}

test('grouping is inferred from nonRepeatingGroupedRowCells alone', () => {
  expect(table.rowGroupId).toBe(null)
  expect(rows.length).toBeGreaterThan(100)
  expect(groupIndex.size).toBeGreaterThan(2)
})

test('every group is one contiguous run — no group restarts', () => {
  // The clustering invariant, asserted on real data rather than a fixture.
  const started = new Set()
  let previous = null
  for (const row of rows) {
    const g = groupOf(row)
    if (g === previous) continue
    expect(started.has(g)).toBe(false)
    started.add(g)
    previous = g
  }
})

test('stripes are per group and survive virtualisation', () => {
  // Only a screenful is stamped — that IS the point. Asserting fewer stamped rows than
  // data rows is what makes this a test of virtual rendering and not of a static list.
  const stamped = rows.filter(row => table.getCells(row))
  expect(stamped.length).toBeGreaterThan(0)
  expect(stamped.length).toBeLessThan(rows.length)
  for (const row of stamped) {
    const classes = table.getCells(row)[0].closest('.tr').classList
    const even = groupIndex.get(groupOf(row)) % 2 === 0
    expect(classes.contains(even ? 'table-cluster-even' : 'table-cluster-odd')).toBe(true)
    // …and exactly one of the two, so a recycled row never keeps a stale stripe.
    expect(classes.contains('table-cluster-even')).toBe(!classes.contains('table-cluster-odd'))
  }
})

test('rowGroupCounts is keyed by groupIdFor, and totals the whole dataset', () => {
  // The integration that matters: the grouping here is INFERRED, so `groupIdFor` is the
  // only way to produce a key, and a mismatch between the two would make the map useless
  // while both halves still looked fine on their own.
  const counts = table.rowGroupCounts
  expect(counts.size).toBe(groupIndex.size)
  for (const row of rows) {
    expect(counts.has(table.groupIdFor(row))).toBe(true)
  }
  // No filter is set on this example, so every group is fully visible…
  let summed = 0
  for (const { visible, total } of counts.values()) {
    expect(visible).toBe(total)
    expect(total).toBeGreaterThan(0)
    summed += total
  }
  // …and the totals account for every row, rather than just the stamped ones.
  expect(summed).toBe(rows.length)
})

test('category and subcategory are shown once per group, and nothing else is hidden', () => {
  // Transparent text, not `visibility: hidden` — a hidden cell stops painting its
  // BACKGROUND, and a pinned column's background is what masks the columns scrolling
  // underneath it. Asserting on `visibility` is what let that ship.
  const shown = (cell) => {
    const s = getComputedStyle(cell)
    return !/rgba\(\d+, \d+, \d+, 0\)/.test(s.color)
  }
  const paintsBackground = (cell) =>
    getComputedStyle(cell).visibility !== 'hidden'
  let first = 0
  let repeated = 0
  for (const row of rows) {
    const cells = table.getCells(row)
    if (!cells) continue
    const isFirst = firstOfGroup.has(row)
    expect(table.isFirstInGroup(row)).toBe(isFirst)
    expect(cells[0].closest('.tr').classList.contains('table-cluster-first')).toBe(isFirst)
    // The grouped columns are hidden, not emptied — the value stays in the DOM and the
    // cell keeps its grid track, so later columns cannot shift left into it.
    expect(cells[0].textContent).not.toBe('')
    expect(shown(cells[0])).toBe(isFirst)
    expect(shown(cells[1])).toBe(isFirst)
    // REGRESSION: every cell must keep painting, repeated or not. A repeated cell in a
    // PINNED column that stops painting becomes a window onto the horizontally-scrolled
    // columns behind it.
    expect(paintsBackground(cells[0])).toBe(true)
    expect(paintsBackground(cells[1])).toBe(true)
    isFirst ? first++ : repeated++
    // Columns that did NOT opt in stay legible everywhere — this catches a rule that hides
    // the whole row rather than the repeated cells.
    expect(shown(cells[2])).toBe(true)
    expect(shown(cells[3])).toBe(true)
  }
  expect(first).toBeGreaterThan(0)
  expect(repeated).toBeGreaterThan(0)
})
```

## Hiding (and Showing) Columns

By default, the user can show / hide columns by clicking via the column header menu.
You can remove this option by adding the `nohide` attribute to the `<tosi-table>`

## Reordering Columns

By default, the user can reorder columns by dragging them around. You can disable this
by adding the `noreorder` attribute to the `<tosi-table>`.

## Column Width

Columns are laid out at the widths you give them, so a table whose columns add up to less
than its container leaves a strip of blank space on the right. Add the `full-width-header`
attribute and the leftover space goes to the last **unpinned** column instead:

```html
<tosi-table full-width-header></tosi-table>
```

Right-pinned columns are skipped because they sit against the right edge by definition —
stretching one would push the leftover space back into the middle of the table.

When the columns are wider than the container nothing changes: the table overflows and
scrolls horizontally exactly as it does without the attribute, and every column keeps the
width it was given. Header and body stay in step either way; they share one
`grid-template-columns`.

## Row Height

If you set the `<tosi-table>`'s `rowHeight` to `0` it will render all its elements (i.e. not be virtual). This is
useful for smaller tables, or tables with variable row-heights.

**Do not do this with a large table.** `rowHeight: 0` switches virtualisation off, so every
row becomes a real DOM node and sorting, filtering and group toggles walk all of them on
every render. Past 1,000 rows the table **warns on every render** until you set a
`rowHeight`, because there is no good reason to be in that configuration: if a table is big
enough for the cost to matter, it is big enough to virtualise, and virtual tables are O(1)
in row count.

The fix is one line:

```typescript
table.rowHeight = 30 // any non-zero height virtualises
```

## Scroll Stability

Sorting, filtering, or toggling `visibleGroupedRowIds` re-renders the table — and the reader
stays where they were. The table anchors on the **topmost visible row**, not on `scrollTop`,
and puts that row back at the same offset afterwards.

The distinction matters as soon as the row count changes. Expand a group above the viewport
and the same `scrollTop` shows entirely different rows, because everything below the
insertion has moved down; the same *row* at the same offset is what "where I was" actually
means. Sorting is the clearest case — the intent is "reorder what I am looking at", and
jumping to row 0 is close to the opposite.

If the anchor row is gone after the re-render — filtered away, or a wholly new dataset — the
table starts at the top, because there is nothing left to be faithful to.

Set **`preserveScroll = false`** to always start at the top, which is the right answer when a
render means "here is a different dataset" rather than "here is the same data, re-viewed":

```typescript
table.preserveScroll = false
```

> Consumers previously had to do this from outside, and it is harder than it looks
> ([#67](https://github.com/tonioloewald/tosijs-ui/issues/67)). Writing `scrollTop` in a
> single `requestAnimationFrame` after the change **silently fails**: the virtualising list
> sizes the spacer that gives the scroll container its height a frame later, so the write is
> clamped against a container that is momentarily one viewport tall. Any correct version had
> to re-apply across frames until it took. That now lives in the component.

## Styling

The component uses a flat CSS grid layout where every cell (header, data, pinned)
is a direct child of the grid container. This means standard CSS works for styling,
and `position: sticky` handles all pinning.

**Breaking change in v1.5.0:** The table no longer uses `.thead`, `.tbody`, or `.tr`
wrapper elements. All cells are direct children of a single `.grid` container.
Update any custom CSS targeting those classes:

- `.thead` → `.th` (header cells)
- `.tbody` → the `.grid` container itself
- `.tr` → no equivalent; cells are flat grid children
- `[part="pinnedTopRows"]` → `.pinned-top`
- `[part="pinnedBottomRows"]` → `.pinned-bottom`
- `.td-pinned`, `.th-pinned` → `.col-pinned`
- `.pin-left`, `.pin-right` → no longer needed (CSS `sticky` handles positioning)

## Localization

`<tosi-table>` supports the `localized` attribute which simply causes its default `headerCell`
to render a `<tosi-localized>` element instead of a span for its caption, and localize its
popup menu.

You'll need to make sure your localized strings include:

- Sort
- Show
- Hide
- Column
- Ascending
- Descending
- Pin
- Unpin
- Left
- Right
- Column Options

As well as any column names you want localized — these are also used as the accessible name
(`aria-label`) of each editable cell, so an editable table wants them present even if you are
happy with the untranslated headers.
