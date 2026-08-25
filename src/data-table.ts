/*#
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

These are rather fine-grained but they're used internally by the selection code so they may as well be documented.

## Row Access

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

## Row Height

If you set the `<tosi-table>`'s `rowHeight` to `0` it will render all its elements (i.e. not be virtual). This is
useful for smaller tables, or tables with variable row-heights.

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

As well as any column names you want localized.
*/

/*{ "parent": "Components" }*/

import {
  Component as WebComponent,
  ElementCreator,
  elements,
  vars,
  varDefault,
  tosiValue,
  getListItem,
  getListBinding,
  tosi,
} from 'tosijs'
import { trackDrag } from './track-drag.js'
import { SortCallback } from './make-sorter.js'
import { naturalSorter } from './natural-compare.js'
import {
  RowGroupIdFn,
  GroupRenderMeta,
  GroupCount,
  resolveRowGroupId,
  withForcedGroups,
  clusterByGroup,
  groupRenderMeta,
  groupCounts,
} from './row-grouping.js'
import { icons } from './icons.js'
import {
  valueRenderer,
  ValueRenderer,
  ValueRendererType,
} from './value-renderer.js'
import type { JSONSchema } from './schema-form/json-schema.js'
import {
  fieldForProperty,
  collectErrors,
  coerceToSchema,
  fieldEditable,
  type Field,
} from './schema-form/fields.js'
import { getSchemaValidator, warnNoValidator } from './schema-form/validator.js'
import { popMenu, MenuItem } from './menu.js'
import * as dragAndDrop from './drag-and-drop.js'
import { tosiLocalized, localize, localizePhrase } from './localize.js'

function defaultWidth(
  array: any[],
  prop: string,
  charWidth: number
): number | boolean {
  const example = array.find(
    (item) => item[prop] !== undefined && item[prop] !== null
  )
  if (example !== undefined) {
    const value = example[prop]
    switch (typeof value) {
      case 'string':
        if (value.match(/^\d+(\.\d+)?$/)) {
          return 6 * charWidth
        } else if (value.includes(' ')) {
          return 20 * charWidth
        } else {
          return 12 * charWidth
        }
      case 'number':
        return 6 * charWidth
      case 'boolean':
        return 5 * charWidth
      case 'object':
        return false
      default:
        return 8 * charWidth
    }
  }
  return false
}

const { div, span, button, input, select, option } = elements

export interface ColumnOptions {
  name?: string
  prop: string
  width: number
  visible?: boolean
  align?: string
  // A `valueRenderer` type string — e.g. `'currency(USD)'`, `'fixed(2)'`, `'bytes'`,
  // `'boolean(check,x)'`. When set (and `dataCell` is not), the cell is formatted by
  // that renderer and the column takes the renderer's default alignment (numerics
  // right, booleans center) unless `align` is set explicitly. See `valueRenderer`.
  type?: ValueRendererType
  pinned?: 'left' | 'right'
  sort?: false | 'ascending' | 'descending'
  /**
   * What this column SORTS by, when that differs from what it stores.
   *
   * Defaults to `row[prop]`. A column with a custom `dataCell` renders whatever it likes
   * while the sort keys on `prop` — so when those differ, clicking "Sort Ascending"
   * reorders rows by a value the reader cannot see, which reads as "sorting is broken"
   * rather than "sorting a different field" (tosijs-ui#62).
   *
   *     { name: 'Invoice #', prop: 'Customer invoice ID', dataCell: invoiceCell,
   *       sortValue: (row) => row['Invoice number'] || row['Customer invoice ID'] }
   *
   * Every other escape hatch costs more: `table.sort` is table-wide (one derived column
   * means reimplementing sorting for all of them), replacing `headerCell` means
   * reimplementing the header menu, and changing `prop` breaks CSV export and anything
   * else keyed on it.
   */
  sortValue?: (row: any) => unknown
  /**
   * Whether this column's cells are editable. Defaults to the table's `editable`.
   *
   * Set `false` on a computed or identifying column of an otherwise-editable table, or
   * `true` to make one column editable in a read-only one. A column with its own
   * `dataCell` is never made editable — a custom cell builds and binds itself, and the
   * table has no business reaching into it.
   */
  editable?: boolean
  headerCell?: (options: ColumnOptions) => HTMLElement
  dataCell?: (options: ColumnOptions) => HTMLElement
}

export interface TableData {
  columns?: ColumnOptions[] | null
  array: any[]
  filter?: ArrayFilter | null
}

export type ArrayFilter = (array: any[]) => any[]

const passThru = (array: any[]) => array

export type SelectCallback = (selected: any[]) => void

interface StickyInfo {
  left?: string
  right?: string
  edgeClass?: string
}

// One ValueRenderer per typed column, cached: `Intl.*Format` construction is the
// expensive part and a column's renderer is stable for its lifetime. Returns null
// when the column has no `type` or supplies its own `dataCell` (which always wins).
const columnRenderers = new WeakMap<ColumnOptions, ValueRenderer>()
function columnRenderer(col: ColumnOptions): ValueRenderer | null {
  if (!col.type || col.dataCell) return null
  let renderer = columnRenderers.get(col)
  if (!renderer) {
    renderer = valueRenderer(col.type)
    columnRenderers.set(col, renderer)
  }
  return renderer
}

export class TosiTable extends WebComponent {
  static preferredTagName = 'tosi-table'

  // Layout: a single .scroll-area inside :host is the only scroll container
  // (both axes). It also hosts the virtualised visible-rows listBinding, so
  // virtualisation reads from the same scroll context that sticky cells stick
  // against. The header, optional pinned-top tbody, and optional pinned-bottom
  // tbody are siblings inside .scroll-area; the pinned tbodies use
  // `display: contents` so their stamped .tr rows participate in
  // .scroll-area's layout directly. Each .tr is its own CSS grid keyed off
  // --tosi-table-grid-columns, so column resize updates one variable and every
  // row reflows.
  static lightStyleSpec = {
    ':host': {
      '--tosi-table-row-height': '32px',
      '--tosi-table-touch-size': 'var(--tosi-touch-size, 44px)',
      '--tosi-table-dragged-header-bg': '#0004',
      '--tosi-table-dragged-header-color': '#fff',
      '--tosi-table-drop-header-bg': '#fff4',
      display: 'block',
      overflow: 'hidden',
      background: varDefault.tosiTableBg('var(--tosi-bg, #fff)'),
    },
    ':host .scroll-area': {
      width: '100%',
      height: '100%',
      overflow: 'auto',
      overscrollBehavior: 'none',
    },
    // The thead and pinned tbodies are layout pass-throughs so their .tr rows
    // are direct children of .scroll-area for sticky positioning. Without
    // display:contents, the .tr can only stick within its narrow parent and
    // scrolls out of view as soon as the parent does.
    ':host .thead, :host .tbody': {
      display: 'contents',
    },
    ':host .tr': {
      display: 'grid',
      gridTemplateColumns: vars.tosiTableGridColumns,
      width: vars.tosiTableGridRowWidth,
      height: vars.tosiTableRowHeight,
      background: varDefault.tosiTableBg('var(--tosi-bg, #fff)'),
    },
    ':host .thead .tr': {
      position: 'sticky',
      top: '0',
      zIndex: '2',
      background: varDefault.tosiTableHeaderBg(
        varDefault.tosiTableBg('var(--tosi-bg, #fff)')
      ),
    },
    // Per-row sticky offsets are set inline in tagPinnedRows so multiple
    // pinned rows stack instead of overlapping at the same sticky position.
    ':host .tbody-pinned-top .tr, :host .tbody-pinned-bottom .tr': {
      position: 'sticky',
      zIndex: '1',
    },
    ':host .th, :host .td': {
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      display: 'flex',
      alignItems: 'center',
      height: vars.tosiTableRowHeight,
      lineHeight: vars.tosiTableRowHeight,
    },
    ':host .col-pinned': {
      position: 'sticky',
      zIndex: '1',
      background: varDefault.tosiTableBg('var(--tosi-bg, #fff)'),
    },
    ':host .th.col-pinned': {
      zIndex: '3',
      background: varDefault.tosiTableHeaderBg(
        varDefault.tosiTableBg('var(--tosi-bg, #fff)')
      ),
    },
    /*
    Alternating cluster backgrounds, applied by REDEFINING the table background variable on
    the row rather than by setting `background` on it.

    Two things fall out of that, and both are the reason for it. `.col-pinned` cells carry
    their own opaque background — they have to, they scroll over other cells — so a plain
    row background would leave a pinned column reading as a hole through every other group;
    inheriting the variable stripes them automatically. And it keeps the stripe out of the
    specificity contest with `.tr[aria-selected] .td`, which sets `background` directly and
    must keep winning — a selected row that renders as merely striped is unusable.

    Only odd groups are tinted, so the default is a stripe over the table's own background
    rather than two competing colours.
    */
    /*
    Cells of a `nonRepeatingGroupedRowCells` column, on every row but the first of its
    group. Never `display: none` on the cell: every cell is an item of the row's grid, so
    removing one pulls each later cell a column to the left and the row renders under the
    wrong headers. Hidden cells hold their track and drop out of the accessibility tree,
    which is what is wanted for a value the group already stated once.
    */
    /*
    Hide the CONTENT, keep the BOX.

    This was `visibility: hidden`, which also stops the cell painting its background — and a
    `.col-pinned` cell's opaque background is the only thing masking the columns sliding
    underneath it when the table is scrolled horizontally. So repeated cells in a pinned
    column became windows onto the scrolled content behind them (reported against 1.10.0's
    row grouping).

    `color: transparent` leaves the box painted, so the background still masks. Element
    children (an icon renderer, a custom `dataCell`'s input) need `display: none` — they are
    not text and transparency does not reach them. `user-select: none` keeps the invisible
    text out of a selection, so what you copy matches what you see.

    Note this is deliberately NOT hidden from assistive technology, unlike the old rule. A
    screen-reader user has no visual grouping cue, so hearing the invoice number on each row
    of its group is more useful than silence — the value really is that row's data, and only
    the visual repetition was worth removing.
    */
    ':host .tr:not(.table-cluster-first) .cluster-repeat': {
      color: 'transparent',
      userSelect: 'none',
    },
    ':host .tr:not(.table-cluster-first) .cluster-repeat > *': {
      display: 'none',
    },
    ':host .tr.table-cluster-odd': {
      _tosiTableBg: varDefault.tosiTableClusterOddBg(
        'color-mix(in srgb, var(--tosi-text, #000) 6%, var(--tosi-bg, #fff))'
      ),
    },
    ':host .tr[aria-selected] .td': {
      background: varDefault.tosiTableSelectedBg(
        'var(--tosi-accent, #0064d222)'
      ),
    },
    ':host .td:focus, :host .th:focus': {
      outline: '2px solid var(--tosi-accent, #0064d2)',
      outlineOffset: '-2px',
      zIndex: '1',
    },
    ':host .col-pinned:focus': {
      zIndex: '4',
    },
    ':host .col-edge-right': {
      boxShadow: '1px 0 0 var(--tosi-table-edge-color, #0002)',
    },
    ':host .col-edge-left': {
      boxShadow: '-1px 0 0 var(--tosi-table-edge-color, #0002)',
    },
    ':host .row-edge-bottom': {
      boxShadow: '0 1px 0 var(--tosi-table-edge-color, #0002)',
    },
    ':host .row-edge-top': {
      boxShadow: '0 -1px 0 var(--tosi-table-edge-color, #0002)',
    },
    ':host .th .menu-trigger': {
      color: 'currentColor',
      background: 'none',
      padding: 0,
      lineHeight: vars.tosiTableTouchSize,
      height: vars.tosiTableTouchSize,
      width: vars.tosiTableTouchSize,
    },
    ':host [draggable="true"]': {
      cursor: 'ew-resize',
    },
    ':host [draggable="true"]:active': {
      background: vars.tosiTableDraggedHeaderBg,
      color: vars.tosiTableDraggedHeaderColor,
    },
    ':host .drag-over': {
      background: vars.tosiTableDropHeaderBg,
    },
  }

  static initAttributes = {
    rowHeight: 30,
    charWidth: 15,
    minColumnWidth: 30,
    select: false,
    multiple: false,
    pinnedTop: 0,
    pinnedBottom: 0,
    nosort: false,
    nohide: false,
    noreorder: false,
    localized: false,
    nopreservescroll: false,
    editable: false,
  }

  /**
   * Optional JSON Schema for the row shape. Drives editable cells and validates edits.
   *
   * The SAME model `<tosi-schema-form>` uses (`src/schema-form/fields.ts`), so a cell and a
   * field agree about what a property is — one description of the data, two surfaces. That
   * was the point of building the model DOM-free: #44 asked for an editable table, and the
   * alternative was a second, drifting answer to "what control does this property want".
   */
  private _schema: JSONSchema | null = null

  get schema(): JSONSchema | null {
    return this._schema
  }

  set schema(schema: JSONSchema | null) {
    this._schema = schema
    this.queueRender()
  }

  selectionChanged: SelectCallback = () => {
    /* do not care */
  }

  rowRendered: ((item: any, cells: HTMLElement[]) => void) | null = null

  private selectedKey = Symbol('selected')
  private selectBinding = (elt: Element, obj: any) => {
    if (obj == null) return
    elt.toggleAttribute('aria-selected', obj[this.selectedKey] === true)
  }

  maxVisibleRows = 10000

  // Region elements rendered in render(). The visible-rows listBinding lives
  // on _scrollArea (the single scroll container); pinned tbodies are
  // display:contents wrappers each holding their own listBinding.
  private _head: HTMLElement | null = null
  private _scrollArea: HTMLElement | null = null
  private _tbodyTop: HTMLElement | null = null
  private _tbodyBottom: HTMLElement | null = null
  private _pinnedRowEdgeObserver: MutationObserver | null = null
  // Cache the cells array per row to preserve array identity across getCells
  // calls — consumers compare by reference.
  private _rowCellsCache = new WeakMap<Element, HTMLElement[]>()

  // Resolve the row item from a cell or any element inside a row. Cells live
  // inside list-bound `.tr` rows, so getListItem walks up to find the item.
  private itemFor(cell: Element): any {
    return getListItem(cell)
  }

  // Resolve the cells of a row by checking each region's listBinding.
  private cellsFor(item: any): HTMLElement[] | undefined {
    const key = tosiValue(item)
    for (const region of [
      this._tbodyTop,
      this._scrollArea,
      this._tbodyBottom,
    ]) {
      if (!region) continue
      const binding = getListBinding(region)
      if (!binding) continue
      const rowEls = binding.itemToElement.get(key) as Element[] | undefined
      if (rowEls && rowEls.length > 0) {
        const row = rowEls[0]
        let cached = this._rowCellsCache.get(row)
        if (!cached) {
          cached = Array.from(row.children) as HTMLElement[]
          this._rowCellsCache.set(row, cached)
        }
        return cached
      }
    }
    return undefined
  }

  get value(): TableData {
    return {
      array: this.array,
      filter: this.filter,
      columns: this.columns,
    }
  }

  set value(data: TableData) {
    const { array, columns, filter } = tosiValue(data)
    if (
      this._array !== array ||
      this._columns !== columns ||
      this._filter !== filter
    ) {
      this.queueRender()
    }
    this._array = array || []
    this._columns = columns || null
    this._filter = filter || passThru
  }

  private rowData = {
    visible: [] as any[],
    pinnedTopData: [] as any[],
    pinnedBottomData: [] as any[],
  }

  private _array: any[] = []
  private _columns: ColumnOptions[] | null = null
  private _filter: ArrayFilter = passThru
  private _sort?: SortCallback
  private _rowGroupId: RowGroupIdFn | null = null
  private _visibleGroupedRowIds: string[] | null = null
  private _nonRepeatingGroupedRowCells: string[] | null = null
  // Optional explicit arrays of pinned items. When set, they are managed
  // separately from `array` and override the `pinnedTop` / `pinnedBottom`
  // count-based slicing.
  private _pinnedTopRows?: any[]
  private _pinnedBottomRows?: any[]

  get pinnedTopRows(): any[] | undefined {
    return this._pinnedTopRows
  }

  set pinnedTopRows(rows: any[] | undefined) {
    this._pinnedTopRows = rows ? tosiValue(rows) : undefined
    this.queueRender()
  }

  get pinnedBottomRows(): any[] | undefined {
    return this._pinnedBottomRows
  }

  set pinnedBottomRows(rows: any[] | undefined) {
    this._pinnedBottomRows = rows ? tosiValue(rows) : undefined
    this.queueRender()
  }

  // Resolve pinned-top items. If pinnedTopRows is set, it wins; otherwise
  // slice the first `pinnedTop` items from `_array`.
  get effectivePinnedTopData(): any[] {
    if (this._pinnedTopRows) return this._pinnedTopRows
    return this.pinnedTop > 0 ? this._array.slice(0, this.pinnedTop) : []
  }

  get effectivePinnedBottomData(): any[] {
    if (this._pinnedBottomRows) return this._pinnedBottomRows
    return this.pinnedBottom > 0 ? this._array.slice(-this.pinnedBottom) : []
  }

  // Visible (non-pinned) data. With explicit pinnedTopRows/pinnedBottomRows,
  // _array is rendered untouched; otherwise we slice off the count-pinned ends.
  private get effectiveBaseData(): any[] {
    if (this._pinnedTopRows || this._pinnedBottomRows) return this._array
    return this._array.slice(
      this.pinnedTop,
      this._array.length - this.pinnedBottom
    )
  }

  constructor() {
    super()

    this.rowData = tosi({
      [this.instanceId]: this.rowData,
    })[this.instanceId]
  }

  get array(): any[] {
    return this._array
  }

  set array(newArray: any[]) {
    this._array = tosiValue(newArray)
    this.queueRender()
  }

  get filter(): ArrayFilter {
    return this._filter
  }

  set filter(filterFunc: ArrayFilter) {
    if (this._filter !== filterFunc) {
      this._filter = filterFunc
      this.queueRender()
    }
  }

  get rowGroupId(): RowGroupIdFn | null {
    return this._rowGroupId
  }

  set rowGroupId(fn: RowGroupIdFn | null) {
    if (this._rowGroupId !== fn) {
      this._rowGroupId = fn
      this.queueRender()
    }
  }

  get visibleGroupedRowIds(): string[] | null {
    return this._visibleGroupedRowIds
  }

  set visibleGroupedRowIds(ids: string[] | null) {
    this._visibleGroupedRowIds = ids ? tosiValue(ids) : null
    this.queueRender()
  }

  get nonRepeatingGroupedRowCells(): string[] | null {
    return this._nonRepeatingGroupedRowCells
  }

  set nonRepeatingGroupedRowCells(props: string[] | null) {
    this._nonRepeatingGroupedRowCells = props ? tosiValue(props) : null
    this.queueRender()
  }

  /** The grouping function in force, or null when the table is ungrouped. */
  /*
  Per-RENDER memo of row -> group id.

  The id is computed several times for the same row in one pass — clustering, parity,
  first-of-group, the counts, then again per stamped row for its classes — and the inferred
  form does a `JSON.stringify` each time. On a few thousand grouped rows that adds up.

  Replaced on every render rather than kept, and that is the whole safety argument: a cached
  id must never outlive the values it was derived from. Mutate a row and the next render
  starts a fresh map, so a stale id cannot survive into a grouping that disagrees with the
  data. Keeping one across renders would buy a little more and risk exactly the bug this
  feature is about — rows silently clustered by what they used to say.
  */
  private _groupIdMemo = new WeakMap<object, string>()

  private get groupIdFn(): RowGroupIdFn | null {
    const groupId = resolveRowGroupId(
      this._rowGroupId,
      this._nonRepeatingGroupedRowCells
    )
    if (!groupId) return null
    const memo = this._groupIdMemo
    return (row: any): string => {
      // WeakMap keys must be objects; a primitive row is rare but must not throw.
      if (row === null || typeof row !== 'object') return groupId(row)
      const hit = memo.get(row)
      if (hit !== undefined) return hit
      const id = groupId(row)
      memo.set(row, id)
      return id
    }
  }

  /**
   * This row's group id, or null when the table is ungrouped.
   *
   * Public because the grouping may be INFERRED from `nonRepeatingGroupedRowCells`, in which
   * case the consumer never wrote the function and cannot reproduce its ids — which would
   * leave `rowGroupCounts` keyed by strings they have no way to construct.
   */
  groupIdFor(row: any): string | null {
    const groupId = this.groupIdFn
    return groupId ? groupId(row) : null
  }

  /**
   * Per-group `{ visible, total }` counts — rendered rows against rows before filtering.
   *
   * For cells that report or control their own group: "showing 2 of 7", or a toggle that
   * adds the group to `visibleGroupedRowIds`. The table is the only thing that sees both
   * sides of the filter, so this is the piece a custom cell renderer cannot derive itself.
   *
   * Recomputed each render, and always a Map — empty when ungrouped — so callers can `.get()`
   * without a null check. Groups filtered away entirely are present with `visible: 0`;
   * pinned rows sit outside grouping and are not counted.
   */
  get rowGroupCounts(): Map<string, GroupCount> {
    return this._rowGroupCounts
  }

  /*
  Grouping facts for the CURRENT visible rows, recomputed each render.

  The table is virtual-scrolled, so a stamped row cannot ask the DOM which group it is in or
  whether it is the first of one — it asks this instead. Null whenever the table is
  ungrouped, which is also what makes every grouping code path below a single null check.
  */
  private _grouping: GroupRenderMeta<any> | null = null
  private _rowGroupCounts: Map<string, GroupCount> = new Map()

  /**
   * Keep the reader in place across a re-render (default `true`).
   *
   * Set `false` when a render means "here is a different dataset" rather than "here is the
   * same data, re-viewed" — then starting at the top is the correct answer.
   *
   * Backed by the `nopreservescroll` ATTRIBUTE so it is settable from markup like every
   * other boolean here (`nosort`, `nohide`, `noreorder`). The inverted name is not
   * gratuitous: this defaults to `true`, and a presence-only attribute can only ever turn
   * something ON — so a `preservescroll` attribute could never express "off", which is the
   * only thing anyone needs to say. Getting this wrong is unfixable after release without a
   * rename, so it is settled here rather than later.
   */
  get preserveScroll(): boolean {
    return !this.nopreservescroll
  }

  set preserveScroll(value: boolean) {
    this.nopreservescroll = !value
  }

  /*
  The row the reader was looking at, captured before the DOM is thrown away.

  Anchored to a ROW rather than to `scrollTop`, because the pixel is not what anyone means by
  "where I was". Expand a group above the viewport and the same `scrollTop` shows entirely
  different rows; the same row at the same offset is what stays put.
  */
  /** Horizontal scroll offset to put back after a re-render. */
  private _scrollLeft = 0

  /** In-flight scroll restore, so a newer one supersedes it and gestures can cancel it. */
  private _scrollRestore: AbortController | null = null

  private _scrollAnchor: {
    item: any
    /** pixels from the top edge of the scroll container */
    offset: number
    scrollTop: number
    index: number
  } | null = null

  get sort(): SortCallback | undefined {
    if (this._sort) {
      return this._sort
    }
    const sortColumn = this._columns?.find(
      (c) => c.sort === 'ascending' || c.sort === 'descending'
    )
    if (!sortColumn) {
      return undefined
    }
    /*
    Two defects lived in these three lines (tosijs-ui#62).

    It keyed on `prop`, so a column whose `dataCell` shows something else sorted by a value
    the reader cannot see. And `>` is a LEXICAL compare, so any column of numeric strings
    sorted by first digit — `'9' > '399'` is true, and real data is full of numeric strings
    from CSV, BigQuery and JSON. Worse, `a > b ? 1 : -1` never returns 0, so two equal
    values each claimed to be greater than the other; `Array.sort` is entitled to turn an
    inconsistent comparator into arbitrary output rather than merely wrong output.
    */
    const { prop, sortValue } = sortColumn
    const key = sortValue ?? ((row: any) => row[prop])
    return naturalSorter(key, sortColumn.sort === 'ascending')
  }

  set sort(sortFunc: SortCallback | undefined) {
    if (this._sort !== sortFunc) {
      this._sort = sortFunc
      this.queueRender()
    }
  }

  get columns(): ColumnOptions[] {
    if (!Array.isArray(this._columns)) {
      const { _array } = this
      this._columns = Object.keys(_array[0] || {}).map((prop: string) => {
        const width = defaultWidth(_array, prop, this.charWidth)
        return {
          name: prop.replace(/([a-z])([A-Z])/g, '$1 $2').toLocaleLowerCase(),
          prop,
          align:
            typeof _array[0][prop] === 'number' ||
            (_array[0][prop] !== '' && !isNaN(_array[0][prop]))
              ? 'right'
              : 'left',
          visible: width !== false,
          width: width ? width : 0,
        } as ColumnOptions
      })
    }
    return this._columns
  }

  set columns(newColumns: ColumnOptions[]) {
    this._columns = newColumns
    this.queueRender()
  }

  get visibleColumns(): ColumnOptions[] {
    const visible = this.columns.filter((c) => c.visible !== false)
    const left = visible.filter((c) => c.pinned === 'left')
    const middle = visible.filter((c) => !c.pinned)
    const right = visible.filter((c) => c.pinned === 'right')
    return [...left, ...middle, ...right]
  }

  /** @deprecated Set pinned: 'left' on individual columns instead */
  get pinnedLeft(): number {
    return this.visibleColumns.filter((c) => c.pinned === 'left').length
  }

  /** @deprecated Set pinned: 'left' on individual columns instead */
  set pinnedLeft(n: number) {
    const visible = this.columns.filter((c) => c.visible !== false)
    for (const col of visible) {
      if (col.pinned === 'left') delete col.pinned
    }
    for (let i = 0; i < n && i < visible.length; i++) {
      visible[i].pinned = 'left'
    }
    this.queueRender()
  }

  /** @deprecated Set pinned: 'right' on individual columns instead */
  get pinnedRight(): number {
    return this.visibleColumns.filter((c) => c.pinned === 'right').length
  }

  /** @deprecated Set pinned: 'right' on individual columns instead */
  set pinnedRight(n: number) {
    const visible = this.columns.filter((c) => c.visible !== false)
    for (const col of visible) {
      if (col.pinned === 'right') delete col.pinned
    }
    for (let i = visible.length - n; i < visible.length; i++) {
      if (i >= 0) visible[i].pinned = 'right'
    }
    this.queueRender()
  }

  content = null

  private computeStickyInfo(cols: ColumnOptions[]): StickyInfo[] {
    const info: StickyInfo[] = cols.map(() => ({}))

    // Left-pinned columns
    let leftOffset = 0
    let lastLeft = -1
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].pinned !== 'left') break
      info[i].left = leftOffset + 'px'
      leftOffset += cols[i].width
      lastLeft = i
    }
    if (lastLeft >= 0) {
      info[lastLeft].edgeClass = 'col-edge-right'
    }

    // Right-pinned columns
    let rightOffset = 0
    let firstRight = cols.length
    for (let i = cols.length - 1; i >= 0; i--) {
      if (cols[i].pinned !== 'right') break
      info[i].right = rightOffset + 'px'
      rightOffset += cols[i].width
      firstRight = i
    }
    if (firstRight < cols.length) {
      info[firstRight].edgeClass = 'col-edge-left'
    }

    return info
  }

  private cellClasses(base: string, si: StickyInfo, repeats = false): string {
    let cls = base
    if (si.left != null || si.right != null) cls += ' col-pinned'
    if (si.edgeClass) cls += ' ' + si.edgeClass
    if (repeats) cls += ' cluster-repeat'
    return cls
  }

  private rowClasses(
    region: 'visible' | 'pinned-top' | 'pinned-bottom'
  ): string {
    return region === 'visible' ? 'tr' : 'tr row-pinned'
  }

  // Tag the boundary rows of each pinned tbody so consumers can style them,
  // and assign per-row sticky offsets so stacked pinned rows don't overlap
  // at the same `top`/`bottom` value. listBinding inserts listTop/listBottom
  // padding divs around its stamped rows, so we walk `.tr` children rather
  // than relying on :first-child / :last-child.
  private tagPinnedRows = () => {
    this.tagPinnedTbody(this._tbodyTop, 'top')
    this.tagPinnedTbody(this._tbodyBottom, 'bottom')
  }

  private tagPinnedTbody(
    tbody: HTMLElement | null,
    axis: 'top' | 'bottom'
  ): void {
    if (!tbody) return
    const rows = Array.from(tbody.querySelectorAll('.tr')) as HTMLElement[]
    if (rows.length === 0) return
    // For top-pinned, header occupies row 0 so first pinned row sits at
    // 1*rowHeight; for bottom-pinned, last row sticks at 0 with earlier rows
    // stacked above it.
    const last = rows.length - 1
    const edgeClass = axis === 'top' ? 'row-edge-bottom' : 'row-edge-top'
    rows.forEach((r, i) => {
      r.classList.remove(edgeClass)
      const steps = axis === 'top' ? i + 1 : last - i
      r.style[axis] = `calc(var(--tosi-table-row-height) * ${steps})`
    })
    const edgeRow = axis === 'top' ? rows[last] : rows[0]
    edgeRow.classList.add(edgeClass)
  }

  private cellStyle(
    col: ColumnOptions,
    si: StickyInfo,
    extra?: Record<string, string>
  ): Record<string, string> {
    // position: sticky lives in `.col-pinned` (added by cellClasses), so only
    // the per-cell offsets need to be set inline here.
    const style: Record<string, string> = {
      // Explicit align wins; else the column type's default (numerics right,
      // booleans center); else left.
      justifyContent: col.align || columnRenderer(col)?.align || 'left',
      ...extra,
    }
    if (si.left != null) style.left = si.left
    if (si.right != null) style.right = si.right
    return style
  }

  private applyGridCellAttrs(
    cell: HTMLElement,
    colIndex: number,
    si: StickyInfo,
    style: Record<string, string>,
    repeats = false
  ): void {
    cell.setAttribute('aria-colindex', String(colIndex + 1))
    cell.tabIndex = -1
    cell.classList.add(...this.cellClasses('td', si, repeats).split(' '))
    Object.assign(cell.style, style)
  }

  /** Is this column editable? Table-level default, per-column override, `dataCell` wins. */
  private columnEditable(col: ColumnOptions): boolean {
    if (col.dataCell !== undefined) return false
    if (!(col.editable ?? this.editable)) return false
    /*
    A `const` column is not editable, whatever the table says.

    The form has always rendered `const` readonly; the table rendered it as a freely editable
    text box, so the same property was editable or not depending on which component you were
    looking at. `fieldEditable` is now the one answer to that question.
    */
    const field = this.fieldFor(col.prop)
    return field ? fieldEditable(field) : true
  }

  /*
  The value a cell had when the user started editing it.

  Captured on focus rather than diffed after the fact: `bindValue` writes the model as the
  user types, so by the time `change` fires the old value is already gone. Keyed by element
  in a WeakMap so a recycled virtual-scroll row cannot leak an entry.
  */
  private _editStart = new WeakMap<Element, unknown>()

  private onCellFocus = (event: Event): void => {
    const el = (event.target as HTMLElement).closest(
      '[data-edit-prop]'
    ) as HTMLInputElement | null
    if (!el) return
    const item = this.getItem(el)
    if (item) this._editStart.set(el, tosiValue(item[el.dataset.editProp!]))
  }

  /*
  Commit on `change`, not on `input`.

  `input` fires per keystroke, so an event per character would make "3" a legitimate
  intermediate state of typing "35" — every listener, every validator and every save hook
  would see values the user never meant to enter. `change` fires when they are done with the
  cell.
  */
  private onCellChange = (event: Event): void => {
    const el = (event.target as HTMLElement).closest(
      '[data-edit-prop]'
    ) as HTMLInputElement | null
    if (!el) return
    /*
    The input's own `change` stops here; the table re-emits its own.

    Native `change` bubbles, so without this a consumer listening on the table receives BOTH
    — theirs with a `detail`, the input's with none — indistinguishable except by checking
    for a property that should always be there. The doc example destructured `event.detail`
    and the hydration lane caught it as a page error, which is the honest version of "our own
    documentation could not use this API correctly".

    The cell's native event is an implementation detail of an editable cell. The table's
    `change` is the contract.
    */
    event.stopPropagation()
    const prop = el.dataset.editProp!
    const item = this.getItem(el)
    if (!item) return
    const field = this.fieldFor(prop)
    const newValue = coerceToSchema(field, el.value, el.checked, el.type)
    const oldValue = this._editStart.get(el)
    this._editStart.delete(el)
    if (newValue === oldValue) return
    item[prop] = newValue
    const message = this.validateCell(item, prop, newValue)
    el.classList.toggle('cell-invalid', Boolean(message))
    if (message) el.title = message
    else el.removeAttribute('title')
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        detail: {
          item: tosiValue(item),
          field: prop,
          oldValue,
          newValue,
          error: message ?? null,
        },
      })
    )
  }

  /** The model's answer for one column, cached per render pass. */
  private fieldFor(prop: string): Field | undefined {
    return fieldForProperty(this.schema, prop)
  }

  /*
  Coerce the DOM's string back to what the schema asked for.

  Same rule the form uses: an emptied numeric cell becomes `undefined`, not `0` and not
  `NaN`. "The user cleared it" and "the user typed zero" are different facts, and writing one
  for the other puts a number in the data that nobody entered.
  */
  /**
   * Validate one edited cell against the schema. `undefined` when it conforms — or when
   * there is no schema, because a table with no description of its data cannot be wrong
   * about it.
   */
  private validateCell(
    item: any,
    prop: string,
    _value: unknown
  ): string | undefined {
    if (!this.schema) return undefined
    const validator = getSchemaValidator()
    if (!validator) {
      warnNoValidator('an editable <tosi-table> with a schema')
      return undefined
    }
    const errors = collectErrors(
      (onError: (path: string, message: string) => void) =>
        validator.validate(tosiValue(item), this.schema!, {
          onError,
          // Not sampling mode: a table that says "valid" must have looked at every row.
          strict: true,
        }),
      [prop]
    )
    return errors.find((e: { path: string }) => e.path === prop)?.message
  }

  /*
  An editable cell is an ordinary bound input.

  `bindValue` is the established idiom here — it is what the doc example has always used for
  a hand-rolled editable column — and it keeps the cell reactive to changes from elsewhere.
  The pointer handlers stop the row-selection listener seeing a click that was aimed at the
  input: without them, clicking into a cell to edit it also selects the row.
  */
  private buildEditableCell(
    col: ColumnOptions,
    colIndex: number,
    si: StickyInfo,
    style: Record<string, string>,
    repeats: boolean
  ): HTMLElement {
    const field = this.fieldFor(col.prop)
    const stop = (event: Event) => event.stopPropagation()
    const shared: any = {
      class: this.cellClasses('td', si, repeats) + ' cell-editable',
      role: 'gridcell',
      tabindex: -1,
      ariaColindex: String(colIndex + 1),
      style,
      onMouseup: stop,
      onTouchend: stop,
      onFocus: this.onCellFocus,
      onChange: this.onCellChange,
    }
    let cell: HTMLElement
    if (field?.kind === 'enum') {
      cell = select(
        { ...shared, bindValue: `^.${col.prop}` },
        ...(field.required ? [] : [option({ value: '' }, '—')]),
        ...(field.options ?? []).map((o) =>
          option({ value: String(o.value) }, o.label)
        )
      )
    } else {
      const isBool =
        field?.kind === 'boolean' || col.type?.startsWith('boolean') === true
      const isNum = field?.kind === 'number' || field?.kind === 'integer'
      cell = input({
        ...shared,
        type: isBool
          ? 'checkbox'
          : isNum
          ? 'number'
          : field?.inputType ?? 'text',
        ...(field?.kind === 'integer' ? { step: 1 } : {}),
        bindValue: `^.${col.prop}`,
      } as any)
    }
    cell.dataset.editProp = col.prop
    return cell
  }

  // Build a single data cell for a column. Cells live inside list-bound `.tr`
  // rows, so path-based bindings inside col.dataCell() (e.g. bindText:'^.prop')
  // resolve against the row's list-instance automatically.
  private buildCell(
    col: ColumnOptions,
    colIndex: number,
    si: StickyInfo,
    item: any,
    grouped = true
  ): HTMLElement {
    const style = this.cellStyle(col, si)
    /*
    A non-repeating cell renders completely normally and is HIDDEN BY CSS on rows that are
    not the first of their group — `.tr:not(.table-cluster-first) .cluster-repeat`.

    The alternative was to bind these cells to the row rather than to their own value, so a
    toDOM could decide whether to write anything. That worked, but it special-cased the
    binding, re-rendered the cell whenever any property of the row changed, and could not
    touch a `dataCell` column at all — a custom cell builds and binds itself. A class costs
    one string and covers every kind of cell identically, including custom ones.

    It must be `visibility`, never `display: none`: rows are CSS grids and every cell is a
    grid item, so removing one shifts every later cell a column left and the row renders
    under the wrong headers.
    */
    const repeats =
      grouped && this._nonRepeatingGroupedRowCells?.includes(col.prop) === true
    if (col.dataCell !== undefined) {
      const cell = col.dataCell(col) as HTMLElement
      this.applyGridCellAttrs(cell, colIndex, si, style, repeats)
      return cell
    }
    if (this.columnEditable(col)) {
      return this.buildEditableCell(col, colIndex, si, style, repeats)
    }
    // A `type` column formats through its cached ValueRenderer. The binding's toDOM
    // runs per stamped row, so it stays locale-reactive and works for icon cells
    // (which replace children) as well as text.
    const renderer = columnRenderer(col)
    if (renderer) {
      return span({
        class: this.cellClasses('td', si, repeats),
        role: 'gridcell',
        tabindex: -1,
        ariaColindex: String(colIndex + 1),
        style,
        bind: {
          value: item[col.prop],
          binding: {
            toDOM(el: HTMLElement, val: unknown) {
              renderer.toDOM(el, val)
            },
          },
        },
      } as any)
    }
    return span({
      class: this.cellClasses('td', si, repeats),
      role: 'gridcell',
      tabindex: -1,
      ariaColindex: String(colIndex + 1),
      style,
      bindText: item[col.prop],
    } as any)
  }

  /*
  Alternating cluster classes, resolved from the row's own group id.

  Parity is a fact about the GROUP, so a row only has to recompute its id to find it — no
  index, no DOM position, and therefore no dependence on which rows the virtual scroller
  happens to have stamped. Both classes are removed when ungrouped because listBinding
  RECYCLES row elements: a row that keeps a stale `table-cluster-odd` after grouping is
  turned off (or after a re-render moves it to the other parity) is the obvious bug here.
  */
  private tagClusterParity(rowEl: Element, value: any): void {
    const grouping = this._grouping
    const parity = grouping
      ? grouping.parity.get(this.groupIdFn!(value))
      : undefined
    rowEl.classList.toggle('table-cluster-even', parity === 'even')
    rowEl.classList.toggle('table-cluster-odd', parity === 'odd')
    /*
    `table-cluster-first` is how a custom `dataCell` opts into the same behaviour without
    any new API: it builds and binds its own element, so the table cannot blank it, but a
    `.tr:not(.table-cluster-first) .my-cell` rule can. Tagging the row costs nothing and
    covers the case in CSS rather than in a callback.
    */
    rowEl.classList.toggle(
      'table-cluster-first',
      parity !== undefined && !this.isRepeatedGroupRow(value)
    )
  }

  /**
   * Is this row the first of its group? Always true when the table is ungrouped.
   *
   * Exposed for custom `dataCell` columns, which render themselves and so have to decide
   * for themselves whether to show a value the rest of the group repeats.
   */
  isFirstInGroup(row: any): boolean {
    return !this.isRepeatedGroupRow(row)
  }

  /*
  Is this row a repeat within its group — i.e. should its non-repeating cells be blank?

  `tosiValue` is the identity unwrap: a stamped row's item arrives as a proxy, while the
  set was built from the raw rows. This is the same key tosijs itself uses for
  `binding.itemToElement`, so matching it is what makes the lookup hit.
  */
  private isRepeatedGroupRow(value: any): boolean {
    const grouping = this._grouping
    if (!grouping) return false
    return !grouping.firstRows.has(tosiValue(value))
  }

  // Build a `.tr` row element with all cells for a single item. The row is
  // bound to the item so selection state and rowRendered fire correctly.
  // Note: listBinding sets role="listitem" on stamped elements; that's good
  // enough — selectors throughout this file use `.tr` for row matching.
  private buildRow(
    item: any,
    cols: ColumnOptions[],
    stickyInfo: StickyInfo[],
    rowClass = 'tr',
    grouped = true
  ): HTMLElement {
    const cells = cols.map((col, i) =>
      this.buildCell(col, i, stickyInfo[i], item, grouped)
    )
    const selectBindingFn = this.selectBinding
    const props: any = { class: rowClass }
    // `item` here is the placeholder proxy from template-build time. The
    // actual stamped row's item is delivered to toDOM as the second arg
    // (resolved via the rewritten path) — use that, not the closure-captured
    // placeholder.
    props.bind = {
      value: item,
      binding: {
        toDOM: (rowEl: Element, value: any) => {
          selectBindingFn(rowEl, value)
          if (grouped) this.tagClusterParity(rowEl, value)
          const fn = this.rowRendered
          if (fn) {
            fn(value, Array.from(rowEl.children) as HTMLElement[])
          }
        },
      },
    }
    return div(props, ...cells)
  }

  // Build the header row (one `.tr` of header cells inside a `.thead`).
  private buildHeaderCell(
    col: ColumnOptions,
    colIndex: number,
    si: StickyInfo
  ): HTMLElement {
    const { popColumnMenu } = this
    let ariaSort = 'none'
    let sortIcon: SVGElement | undefined
    switch (col.sort) {
      case 'ascending':
        sortIcon = icons.sortAscending()
        ariaSort = 'descending'
        break
      case 'descending':
        ariaSort = 'ascending'
        sortIcon = icons.sortDescending()
        break
    }

    const menuButton = !(this.nosort && this.nohide)
      ? button(
          {
            class: 'menu-trigger',
            onClick(event: Event) {
              popColumnMenu(event.target as HTMLElement, col)
              event.stopPropagation()
            },
          },
          sortIcon || icons.moreVertical()
        )
      : {}

    const cell =
      col.headerCell !== undefined
        ? col.headerCell(col)
        : span(
            {
              class: this.cellClasses('th', si),
              role: 'columnheader',
              tabindex: -1,
              ariaSort,
              ariaColindex: String(colIndex + 1),
              style: this.cellStyle(col, si),
            },
            this.captionSpan(
              { style: { flex: '1' } },
              typeof col.name === 'string' ? col.name : col.prop
            ),
            menuButton
          )

    if (col.headerCell !== undefined) {
      this.applyGridCellAttrs(
        cell as HTMLElement,
        colIndex,
        si,
        this.cellStyle(col, si)
      )
      cell.classList.remove('td')
      cell.classList.add('th')
      cell.setAttribute('role', 'columnheader')
    }

    if (!this.noreorder && cell.children[0]) {
      dragAndDrop.init()
      const dragId = this.instanceId + '-column-header'
      const caption = cell.children[0] as HTMLElement
      caption.setAttribute('draggable', 'true')
      caption.style.pointerEvents = 'all'
      caption.dataset.drag = dragId
      ;(cell as HTMLElement).dataset.drop = dragId
      caption.addEventListener('dragstart', () => {
        this.draggedColumn = col
      })
      cell.addEventListener('drop', this.dropColumn)
    }

    return cell as HTMLElement
  }

  private buildHeader(
    cols: ColumnOptions[],
    stickyInfo: StickyInfo[]
  ): HTMLElement {
    const headerCells = cols.map((col, i) =>
      this.buildHeaderCell(col, i, stickyInfo[i])
    )
    return div(
      { class: 'thead', role: 'rowgroup' },
      div({ class: 'tr', role: 'row' }, ...headerCells)
    )
  }

  // Build a pinned tbody (top or bottom) — a `display: contents` wrapper with
  // its own non-virtualised listBinding so each pinned row goes through the
  // same dataCell / rowRendered / `^.prop` pipeline as the virtual rows. The
  // wrapper has no box of its own, so its stamped rows are layout children of
  // .scroll-area and share its single sticky context. Returns null when the
  // region is empty so render() can drop it from the DOM.
  private buildPinnedBody(
    rowsProxy: any,
    cols: ColumnOptions[],
    stickyInfo: StickyInfo[],
    region: 'pinned-top' | 'pinned-bottom'
  ): HTMLElement | null {
    const data = tosiValue(rowsProxy) as any[] | undefined
    if (!data || data.length === 0) return null
    const part = region === 'pinned-top' ? 'pinnedTopRows' : 'pinnedBottomRows'
    const rowClass = this.rowClasses(region)
    const binding = (rowsProxy as any).listBinding(
      /*
      `grouped: false` — pinned rows sit outside the clustering entirely. They are not in
      the visible data, so they have no parity, and blanking their non-repeating cells
      would empty a pinned header/summary row purely because it is not in `firstRows`.
      */
      (_elements: any, item: any) =>
        this.buildRow(item, cols, stickyInfo, rowClass, false),
      {}
    )
    return div(
      {
        class: `tbody tbody-${region}`,
        role: 'rowgroup',
        part,
      },
      ...binding
    )
  }

  getColumn(event: any): ColumnOptions | undefined {
    if (!this._scrollArea) return undefined
    const pointerX =
      (event.touches !== undefined ? event.touches[0].clientX : event.clientX) -
      this._scrollArea.getBoundingClientRect().x
    const epsilon = event.touches !== undefined ? 20 : 5
    const { scrollLeft, clientWidth, scrollWidth } = this._scrollArea
    const cols = this.visibleColumns
    const rightScroll = scrollWidth - clientWidth - scrollLeft

    let boundaryX = 0
    return cols.find((options: ColumnOptions) => {
      if (options.visible === false) return false
      boundaryX += options.width
      let visualBoundary: number
      if (options.pinned === 'left') {
        visualBoundary = boundaryX
      } else if (options.pinned === 'right') {
        visualBoundary = boundaryX - scrollLeft - rightScroll
      } else {
        visualBoundary = boundaryX - scrollLeft
      }
      return Math.abs(pointerX - visualBoundary) < epsilon
    })
  }

  private setCursor = (event: Event) => {
    const column = this.getColumn(event)
    this.style.cursor = column !== undefined ? 'col-resize' : ''
  }

  private resizeColumn = (event: any) => {
    const column = this.getColumn(event)
    if (column !== undefined) {
      const origWidth = Number(column.width)
      const isTouchEvent = event.touches !== undefined
      const touchIdentifier = isTouchEvent
        ? event.touches[0].identifier
        : undefined
      trackDrag(
        event,
        (dx, _dy, event: any) => {
          const touch = isTouchEvent
            ? [...event.touches].find(
                (touch: any) => touch.identifier === touchIdentifier
              )
            : true
          if (touch === undefined) {
            return true
          }
          const width = origWidth + dx
          column.width =
            width > this.minColumnWidth ? width : this.minColumnWidth
          this.setColumnWidths()
          if (event.type === 'mouseup') {
            return true
          }
        },
        'col-resize'
      )
    }
  }

  selectRow(row: any, select = true) {
    if (select) {
      row[this.selectedKey] = true
    } else {
      delete row[this.selectedKey]
    }
    this.updateSelectionVisuals()
  }

  selectRows(rows?: any[], select = true) {
    for (const row of rows || this.array) {
      if (select) {
        row[this.selectedKey] = true
      } else {
        delete row[this.selectedKey]
      }
    }
    this.updateSelectionVisuals()
  }

  deSelect(rows?: any[]) {
    this.selectRows(rows, false)
  }

  private updateSelectionVisuals() {
    // Apply selection state to every body row currently in the DOM. Header
    // rows live inside .thead and don't have a list-instance, so itemFor
    // returns null and they're skipped.
    const rows = this._scrollArea?.querySelectorAll('.tr') ?? []
    for (const row of rows) {
      const item = this.itemFor(row)
      if (item != null) {
        this.selectBinding(row, item)
      }
    }
  }

  // tracking click / shift-click
  private rangeStart?: any
  private updateSelection = (event: Event) => {
    if (!this.select && !this.multiple) {
      return
    }
    const { target } = event
    if (!(target instanceof HTMLElement)) {
      return
    }
    const pickedItem = this.itemFor(target)
    if (pickedItem == null) {
      return
    }
    const mouseEvent = event as MouseEvent
    // prevent ugly selection artifacts
    const selection = window.getSelection()
    if (selection !== null) {
      selection.removeAllRanges()
    }
    const rows = this.visibleRows
    if (
      this.multiple &&
      mouseEvent.shiftKey &&
      rows.length > 0 &&
      this.rangeStart !== pickedItem
    ) {
      const mode =
        this.rangeStart === undefined ||
        this.rangeStart[this.selectedKey] === true
      const [start, finish] = [
        this.rangeStart !== undefined ? rows.indexOf(this.rangeStart) : 0,
        rows.indexOf(pickedItem),
      ].sort((a, b) => a - b)

      // if start is -1 then one of the items is no longer visible
      if (start > -1) {
        for (let idx = start; idx <= finish; idx++) {
          const row = rows[idx]
          this.selectRow(row, mode)
        }
      }
    } else if (this.multiple && mouseEvent.metaKey) {
      this.selectRow(pickedItem, !pickedItem[this.selectedKey])
      const pickedIndex = rows.indexOf(pickedItem)
      const nextItem = rows[pickedIndex + 1]
      const previousItem = pickedIndex > 0 ? rows[pickedIndex - 1] : undefined
      if (nextItem !== undefined && nextItem[this.selectedKey] === true) {
        this.rangeStart = nextItem
      } else if (
        previousItem !== undefined &&
        previousItem[this.selectedKey] === true
      ) {
        this.rangeStart = previousItem
      } else {
        this.rangeStart = undefined
      }
    } else {
      this.rangeStart = pickedItem
      this.deSelect()
      this.selectRow(pickedItem, true)
    }
    this.selectionChanged(this.visibleSelectedRows)
    this.updateSelectionVisuals()
  }

  // Resolve a (rowIndex, colIndex) coordinate to a DOM cell.
  // rowIndex semantics: -1 = header, 0..pinnedTop.length-1 = pinned-top rows,
  // then visible rows, then pinned-bottom rows.
  private findCell(rowIndex: number, colIndex: number): HTMLElement | null {
    if (rowIndex === -1) {
      return this.querySelector(
        `.thead .th[aria-colindex="${colIndex + 1}"]`
      ) as HTMLElement | null
    }

    const top = this.effectivePinnedTopData
    const visible = this.visibleRows
    const bottom = this.effectivePinnedBottomData

    let item: any
    if (rowIndex < top.length) {
      item = top[rowIndex]
    } else if (rowIndex < top.length + visible.length) {
      item = visible[rowIndex - top.length]
    } else if (rowIndex < top.length + visible.length + bottom.length) {
      item = bottom[rowIndex - top.length - visible.length]
    } else {
      return null
    }

    const cells = this.cellsFor(item)
    return (cells?.[colIndex] as HTMLElement | undefined) ?? null
  }

  private _pendingFocus: { row: number; col: number } | null = null

  /*
  Note the topmost row the reader can see, and how far down the container it sits.

  Runs before `render()` empties the table. The header is skipped because it is STICKY — it
  intersects the top of the viewport at every scroll position, so anchoring to it would
  answer "where am I" identically no matter where you are.
  */
  private captureScrollAnchor(): void {
    this._scrollAnchor = null
    this._scrollLeft = 0
    const area = this._scrollArea
    if (!this.preserveScroll || !area) return
    /*
    Horizontal position is captured SEPARATELY, and before the vertical early-return.

    It needs no anchor row: columns keep their identity across a data re-render, so the
    pixel offset means the same thing afterwards — unlike `scrollTop`, where inserting rows
    above moves everything. Capturing it inside the row loop would also have missed the case
    that matters most: a table scrolled sideways but still at the TOP, which used to return
    early here and lose its columns.

    The wide tables are the ones that need this. A wide table with pinned columns is read
    scrolled sideways — the pinned columns are the identity, the interesting ones are off to
    the right — so snapping back to column 0 changes what the row appears to say while the
    pinned columns sit still. (#86)
    */
    this._scrollLeft = area.scrollLeft
    if (area.scrollTop <= 0) return
    const areaTop = area.getBoundingClientRect().top
    const previous = (tosiValue(this.rowData.visible) as any[]) ?? []
    for (const el of area.querySelectorAll('.tr')) {
      if (el.closest('.thead') || el.classList.contains('row-pinned')) continue
      const rect = el.getBoundingClientRect()
      if (rect.height === 0 || rect.bottom <= areaTop) continue
      const item = tosiValue(getListItem(el))
      const index = previous.indexOf(item)
      if (index < 0) continue
      this._scrollAnchor = {
        item,
        offset: rect.top - areaTop,
        scrollTop: area.scrollTop,
        index,
      }
      return
    }
  }

  /*
  Put the anchor row back where it was.

  Why this converges rather than simply assigning a number: the virtualising `listBinding`
  sizes the spacer that gives `.scroll-area` its height a frame AFTER render returns, so a
  scrollTop written immediately is silently CLAMPED against a container that is momentarily
  one viewport tall (measured in #67: scrollHeight 812 at frame 0, 137920 at frame 1). It is
  also why a consumer cannot fix this from outside without reimplementing this loop.

  Two strategies, and the second is what makes the first self-correcting:
  - the anchor's element is not stamped yet (virtual, far from the current position), so
    estimate arithmetically — with a fixed `rowHeight` the content shifts by exactly the
    change in the row's index — which scrolls close enough for it to be stamped;
  - the element IS present, so measure the real gap and close it exactly. This is also the
    whole answer when `rowHeight` is 0 and every row is already in the DOM.

  Bounded, because a target the container genuinely cannot reach (collapsing a group near the
  bottom really does shorten the content) must terminate rather than spin.
  */
  private restoreScrollAnchor(newData: any[]): void {
    const anchor = this._scrollAnchor
    const left = this._scrollLeft
    this._scrollAnchor = null
    this._scrollLeft = 0
    // The anchor row may be gone — filtered away, or a wholly new dataset — and there is
    // then nothing vertical to be faithful to. The COLUMNS are still there either way, so
    // the horizontal position is restored independently (#86).
    const newIndex = anchor ? newData.indexOf(anchor.item) : -1
    const restoreRow = !!anchor && newIndex >= 0
    if (!restoreRow && !left) return

    /*
    The restore must yield to the user, and to itself.

    It writes `scrollTop` on every frame of its budget, and `preserveScroll` defaults true —
    so this runs after EVERY sort, filter and group toggle. Without these two guards a wheel
    or touch gesture during that window is dragged back to the anchor, and a second sort
    while the first restore is still converging leaves two chains fighting over the same
    container.

    An `AbortController` covers both: the listeners come off when the restore finishes, and
    a newer restore aborts the older one. Passive listeners, so watching for a gesture cannot
    itself delay scrolling.
    */
    this._scrollRestore?.abort()
    const restore = new AbortController()
    this._scrollRestore = restore
    for (const kind of ['wheel', 'touchstart', 'pointerdown']) {
      this._scrollArea?.addEventListener(kind, () => restore.abort(), {
        once: true,
        passive: true,
        signal: restore.signal,
      })
    }

    let framesLeft = 8
    const step = () => {
      // The user took over, or a newer render started its own restore.
      if (restore.signal.aborted) return
      const area = this._scrollArea
      if (!area) return
      // Re-asserted each frame for the same reason the vertical value is: the grid's width
      // is not final when render returns, so an early write is clamped to a narrow content
      // box and silently lost.
      if (left && area.scrollLeft !== left) area.scrollLeft = left
      if (!restoreRow) {
        if (--framesLeft > 0) requestAnimationFrame(step)
        else restore.abort()
        return
      }
      const row = this.getCells(anchor!.item)?.[0]?.closest('.tr')
      if (row) {
        const delta =
          row.getBoundingClientRect().top -
          area.getBoundingClientRect().top -
          anchor!.offset
        // Sub-pixel: scrollTop reads back fractionally on a scaled display, so an equality
        // test would never be satisfied and this would burn every frame it has.
        if (Math.abs(delta) < 1) {
          restore.abort() // settled — drop the gesture listeners
          return
        }
        area.scrollTop += delta
      } else if (this.rowHeight > 0) {
        area.scrollTop =
          anchor!.scrollTop + (newIndex - anchor!.index) * this.rowHeight
      }
      if (--framesLeft > 0) requestAnimationFrame(step)
      else restore.abort() // budget spent — drop the gesture listeners
    }
    /*
    ONE chain. `step` re-arms itself, so calling it here starts the loop; the extra
    `requestAnimationFrame(step)` that used to sit below started a SECOND chain against the
    same `framesLeft`, spending the 8-frame budget in about four real frames — on exactly the
    slow machine that needs them most.
    */
    step()
  }

  private handleScrollEnd = () => {
    if (!this._pendingFocus) return
    const { row, col } = this._pendingFocus
    this._pendingFocus = null
    const cell = this.findCell(row, col)
    if (cell) cell.focus()
  }

  private focusCell(rowIndex: number, colIndex: number): void {
    this._pendingFocus = { row: rowIndex, col: colIndex }

    const cell = this.findCell(rowIndex, colIndex)
    if (cell) {
      cell.focus()
      cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    } else if (this._scrollArea) {
      // Not in DOM — rough scroll to bring it into virtualisation range
      const top = this.effectivePinnedTopData
      const dataRowIndex = rowIndex - top.length
      if (dataRowIndex >= 0 && dataRowIndex < this.visibleRows.length) {
        this._scrollArea.scrollTop = dataRowIndex * this.rowHeight
      }
    }
  }

  private handleKeyNav = (event: KeyboardEvent) => {
    const el = event.target as HTMLElement
    /*
    Grid navigation must not steal keys from an editable cell.

    Arrows, Home and End belong to the CARET while you are typing. Swallowing them meant the
    caret could not be moved and focus jumped to another cell mid-edit — committing a partial
    edit through the blur — and on an enum `<select>` ArrowUp/Down meant the cell could not be
    changed by keyboard at all.

    Escape and Tab are deliberately still ours: Escape leaves the cell, Tab moves on, and both
    are what a keyboard user reaches for to GET OUT. Everything else is the input's.
    */
    if (
      el.closest('[data-edit-prop]') &&
      event.key !== 'Escape' &&
      event.key !== 'Tab'
    ) {
      return
    }
    const target = el.closest('.td') || el.closest('.th')
    if (!target) return

    const ariaCol = parseInt(target.getAttribute('aria-colindex') || '', 10)
    if (isNaN(ariaCol)) return
    const colIndex = ariaCol - 1

    const cols = this.visibleColumns.length
    const top = this.effectivePinnedTopData
    const visible = this.visibleRows
    const bottom = this.effectivePinnedBottomData
    const totalRows = top.length + visible.length + bottom.length
    const meta = event.metaKey || event.ctrlKey
    const isHeader = target.classList.contains('th')

    // Resolve the row's logical index in the unified row-space:
    //   -1 = header, 0..top-1 = pinned-top, then visible, then pinned-bottom.
    let rowIndex: number
    if (isHeader) {
      rowIndex = -1
    } else {
      const row = target.closest('.tr') as HTMLElement | null
      if (!row) return
      const item = getListItem(row)
      if (item == null) return
      const idxTop = top.indexOf(item)
      const idxVisible = idxTop === -1 ? visible.indexOf(item) : -1
      const idxBottom =
        idxTop === -1 && idxVisible === -1 ? bottom.indexOf(item) : -1
      if (idxTop !== -1) {
        rowIndex = idxTop
      } else if (idxVisible !== -1) {
        rowIndex = top.length + idxVisible
      } else if (idxBottom !== -1) {
        rowIndex = top.length + visible.length + idxBottom
      } else {
        return
      }
    }

    let nextRow = rowIndex
    let nextCol = colIndex

    switch (event.key) {
      case 'ArrowUp':
        nextRow = meta ? 0 : Math.max(-1, rowIndex - 1)
        break
      case 'ArrowDown':
        nextRow = meta ? totalRows - 1 : Math.min(totalRows - 1, rowIndex + 1)
        break
      case 'ArrowLeft':
        nextCol = meta ? 0 : Math.max(0, colIndex - 1)
        break
      case 'ArrowRight':
        nextCol = meta ? cols - 1 : Math.min(cols - 1, colIndex + 1)
        break
      case 'Tab':
        if (event.shiftKey) {
          if (colIndex > 0) {
            nextCol = colIndex - 1
          } else if (rowIndex > 0) {
            nextRow = rowIndex - 1
            nextCol = cols - 1
          } else {
            return // let tab leave the table
          }
        } else {
          if (colIndex < cols - 1) {
            nextCol = colIndex + 1
          } else if (rowIndex < totalRows - 1) {
            nextRow = rowIndex + 1
            nextCol = 0
          } else {
            return // let tab leave the table
          }
        }
        break
      case 'Home':
        if (meta) {
          nextRow = 0
          nextCol = 0
        } else {
          nextCol = 0
        }
        break
      case 'End':
        if (meta) {
          nextRow = totalRows - 1
          nextCol = cols - 1
        } else {
          nextCol = cols - 1
        }
        break
      default:
        return
    }

    if (nextRow !== rowIndex || nextCol !== colIndex) {
      event.preventDefault()
      this.focusCell(nextRow, nextCol)
    }
  }

  connectedCallback(): void {
    super.connectedCallback()

    this.addEventListener('mousemove', this.setCursor)
    this.addEventListener('mousedown', this.resizeColumn)
    this.addEventListener('touchstart', this.resizeColumn, { passive: true })
    this.addEventListener('mouseup', this.updateSelection)
    this.addEventListener('touchend', this.updateSelection)
    this.addEventListener('keydown', this.handleKeyNav)
  }

  setColumnWidths() {
    const cols = this.visibleColumns
    const columns = cols.map((c) => c.width + 'px').join(' ')
    const rowWidth = cols.reduce((w, c) => w + c.width, 0) + 'px'

    // The CSS variable is consumed by every `.tr` (display:grid) and by .thead
    // / .tbody for explicit width — one var, all rows reflow.
    this.style.setProperty('--tosi-table-grid-columns', columns)
    this.style.setProperty('--tosi-table-grid-row-width', rowWidth)
    // Legacy aliases
    this.style.setProperty('--grid-columns', columns)
    this.style.setProperty('--grid-row-width', rowWidth)

    // Update sticky positions for column-pinned cells across all regions
    const stickyInfo = this.computeStickyInfo(cols)
    for (const cell of this.querySelectorAll('.col-pinned')) {
      const ci = parseInt(cell.getAttribute('aria-colindex') || '', 10) - 1
      if (!isNaN(ci) && stickyInfo[ci]) {
        const si = stickyInfo[ci]
        if (si.left != null) (cell as HTMLElement).style.left = si.left
        if (si.right != null) (cell as HTMLElement).style.right = si.right
      }
    }
  }

  sortByColumn = (
    columnOptions: ColumnOptions,
    direction: 'ascending' | 'descending' | 'auto' = 'auto'
  ) => {
    for (const column of this.columns.filter(
      (c) => tosiValue(c.sort) !== false
    )) {
      if (tosiValue(column) === columnOptions) {
        if (direction === 'auto') {
          column.sort = column.sort === 'ascending' ? 'descending' : 'ascending'
        } else {
          column.sort = direction
        }
        this.queueRender()
      } else {
        delete column.sort
      }
    }
  }

  /*
  Menu captions carry `#annotation` disambiguators — `Right#direction`, not `Right`.

  A lone word gives a translator no context, and our own shipped table proves what that
  costs: `Right` came back as the CORRECT sense rather than the direction in four of nine
  languages (sv `Rätt`, zh `正确的`, es `Bien`, it `Giusto`), `Column` as `柱子` (a pillar),
  and `Sort` as `种类` / `종류` (a kind of thing). The annotation is the disambiguator, and it
  is a `localize` feature, not a convention: see the localize docs.

  Annotating the key is backward compatible — `localize('Right#direction')` falls back to a
  bare `Right` row when there is no annotated one, so an existing translation table keeps
  working untouched.
  */
  popColumnMenu = (target: HTMLElement, options: ColumnOptions) => {
    const { sortByColumn } = this
    const hiddenColumns = this.columns.filter(
      (column) => column.visible === false
    )
    const queueRender = this.queueRender.bind(this)
    const menu: MenuItem[] = []
    if (!this.nosort && options.sort !== false) {
      menu.push(
        {
          caption: this.localized
            ? localizePhrase('Sort Ascending', [
                'Sort#order',
                'Ascending#sort-order',
              ])
            : 'Sort Ascending',
          icon: 'sortAscending',
          action() {
            sortByColumn(options)
          },
        },
        {
          caption: this.localized
            ? localizePhrase('Sort Descending', [
                'Sort#order',
                'Descending#sort-order',
              ])
            : 'Sort Descending',
          icon: 'sortDescending',
          action() {
            sortByColumn(options, 'descending')
          },
        }
      )
    }
    if (!this.nohide) {
      if (menu.length) {
        menu.push(null)
      }
      menu.push(
        {
          caption: this.localized
            ? localizePhrase('Hide Column', ['Hide#conceal', 'Column#table'])
            : 'Hide Column',
          icon: 'eyeOff',
          enabled: () => options.visible !== true,
          action() {
            options.visible = false
            queueRender()
          },
        },
        {
          caption: this.localized
            ? localizePhrase('Show Column', ['Show#reveal', 'Column#table'])
            : 'Show Column',
          icon: 'eye',
          enabled: () => hiddenColumns.length > 0,
          menuItems: hiddenColumns.map((column) => {
            return {
              caption: column.name || column.prop,
              action() {
                delete column.visible
                queueRender()
              },
            }
          }),
        }
      )
    }

    if (menu.length) {
      menu.push(null)
    }
    const pinIcon =
      options.pinned === 'left'
        ? 'pin'
        : options.pinned === 'right'
        ? 'pin0f'
        : 'pin50o'
    menu.push({
      caption: this.localized ? localize('Pin#fasten') : 'Pin',
      icon: pinIcon,
      menuItems: [
        {
          caption: this.localized ? localize('Left#direction') : 'Left',
          icon: 'pin',
          enabled: () => options.pinned !== 'left',
          action() {
            options.pinned = 'left'
            queueRender()
          },
        },
        {
          caption: this.localized ? localize('Right#direction') : 'Right',
          icon: 'pin0f',
          enabled: () => options.pinned !== 'right',
          action() {
            options.pinned = 'right'
            queueRender()
          },
        },
        {
          caption: this.localized ? localize('Unpin#unfasten') : 'Unpin',
          icon: 'unPin',
          enabled: () => !!options.pinned,
          action() {
            delete options.pinned
            queueRender()
          },
        },
      ],
    })

    popMenu({
      target,
      localized: this.localized,
      menuItems: menu,
    })
  }

  get captionSpan(): ElementCreator {
    return this.localized ? tosiLocalized : span
  }

  get visibleRows(): any[] {
    return tosiValue(this.rowData.visible) as any[]
  }

  get visibleSelectedRows(): any[] {
    return this.visibleRows.filter((obj) => obj[this.selectedKey])
  }

  get selectedRows(): any[] {
    // With the array form, pinned items live outside _array — include them
    // in the search. With the count form, they're already inside _array.
    if (this._pinnedTopRows || this._pinnedBottomRows) {
      const all = [
        ...(this._pinnedTopRows ?? []),
        ...this._array,
        ...(this._pinnedBottomRows ?? []),
      ]
      return all.filter((obj) => obj[this.selectedKey])
    }
    return this._array.filter((obj) => obj[this.selectedKey])
  }

  getCells(itemOrCell: any): HTMLElement[] | undefined {
    const item =
      itemOrCell instanceof Element ? this.itemFor(itemOrCell) : itemOrCell
    return item == null ? undefined : this.cellsFor(item)
  }

  getItem(cell: Element): any {
    return this.itemFor(cell)
  }

  private draggedColumn?: ColumnOptions

  private dropColumn = (event: Event) => {
    const target = (event.target as HTMLElement).closest(
      '.drag-over'
    ) as HTMLElement
    const colIndex =
      parseInt(target.getAttribute('aria-colindex') || '', 10) - 1
    const dropped = this.visibleColumns[colIndex]
    const draggedIndex = this.columns.indexOf(this.draggedColumn!)
    const droppedIndex = this.columns.indexOf(dropped)
    // Inherit pinning from the drop target's zone
    this.draggedColumn!.pinned = dropped.pinned
    this.columns.splice(draggedIndex, 1)
    this.columns.splice(droppedIndex, 0, this.draggedColumn!)
    this.queueRender()

    event.preventDefault()
    event.stopPropagation()
  }

  render() {
    super.render()
    // Before the DOM the reader was scrolling ceases to exist.
    this.captureScrollAnchor()
    this.textContent = ''

    // Resolve data sources
    const pinnedTopData = this.effectivePinnedTopData
    const pinnedBottomData = this.effectivePinnedBottomData
    const baseData = this.effectiveBaseData
    const cap = Math.min(baseData.length, this.maxVisibleRows)
    const scope = baseData.slice(0, cap)
    // Fresh per render — see `_groupIdMemo`. Must happen before `groupIdFn` is read.
    this._groupIdMemo = new WeakMap()
    const groupId = this.groupIdFn
    let visibleData = this.filter(scope)
    /*
    Forcing runs BEFORE the sort, so a row re-admitted by `visibleGroupedRowIds` is ordered
    like any other row rather than being tacked on the end.
    */
    if (groupId) {
      visibleData = withForcedGroups(
        visibleData,
        scope,
        groupId,
        this._visibleGroupedRowIds
      )
    }
    const { sort } = this
    if (sort) visibleData.sort(sort)
    // Clustering LAST — the spec is "grouped, then sorted within the grouping", so any
    // other sort is applied first and survives inside each group.
    if (groupId) {
      visibleData = clusterByGroup(visibleData, groupId)
      this._grouping = groupRenderMeta(visibleData, groupId)
      // Counted from `scope` (pre-filter) against the final rendered set, and assigned
      // BEFORE the rows below are stamped, so a cell renderer can read it as it renders.
      this._rowGroupCounts = groupCounts(scope, visibleData, groupId)
    } else {
      this._grouping = null
      this._rowGroupCounts = new Map()
    }

    this.rowData.pinnedTopData = pinnedTopData
    this.rowData.pinnedBottomData = pinnedBottomData
    this.rowData.visible = visibleData

    // Column layout
    const cols = this.visibleColumns
    if (cols.length === 0) return
    const stickyInfo = this.computeStickyInfo(cols)

    this.style.setProperty(
      '--tosi-table-row-height',
      this.rowHeight > 0 ? `${this.rowHeight}px` : 'auto'
    )
    this.setColumnWidths()

    // Build the regions. Header + optional pinned tbodies are siblings
    // alongside the visible-rows listBinding, all inside a single .scroll-area
    // which is the only scroll container. Pinned tbodies use display: contents
    // so their stamped rows participate in .scroll-area's layout directly,
    // sharing one sticky context with the visible rows and the header.
    this._head = this.buildHeader(cols, stickyInfo)
    this._tbodyTop = this.buildPinnedBody(
      this.rowData.pinnedTopData,
      cols,
      stickyInfo,
      'pinned-top'
    )
    this._tbodyBottom = this.buildPinnedBody(
      this.rowData.pinnedBottomData,
      cols,
      stickyInfo,
      'pinned-bottom'
    )

    // The visible-rows listBinding is bound directly to .scroll-area so
    // virtualisation observes the same scroll container that sticky cells
    // stick against.
    const visibleBinding = (this.rowData.visible as any).listBinding(
      (_elements: any, item: any) => this.buildRow(item, cols, stickyInfo),
      this.rowHeight > 0 ? { virtual: { height: this.rowHeight } } : {}
    )

    this._scrollArea = div(
      { class: 'scroll-area', part: 'visibleRows' },
      ...[
        this._head,
        this._tbodyTop,
        ...visibleBinding,
        this._tbodyBottom,
      ].filter(Boolean)
    )
    this._scrollArea.addEventListener('scrollend', this.handleScrollEnd)

    this.append(this._scrollArea)

    this.observePinnedRowMutations()
    this.tagPinnedRows()
    this.restoreScrollAnchor(visibleData)
  }

  // Edge classes need to track listBinding mutations (pinned data may change
  // without a full re-render), so observe each pinned tbody and re-tag on
  // childList changes.
  private observePinnedRowMutations(): void {
    this._pinnedRowEdgeObserver?.disconnect()
    this._pinnedRowEdgeObserver = new MutationObserver(this.tagPinnedRows)
    for (const tbody of [this._tbodyTop, this._tbodyBottom]) {
      if (tbody) {
        this._pinnedRowEdgeObserver.observe(tbody, { childList: true })
      }
    }
  }
}

/** @deprecated Use TosiTable instead */
export type DataTable = TosiTable
/** @deprecated Use TosiTable instead */
export const DataTable: typeof TosiTable = TosiTable

export const tosiTable = TosiTable.elementCreator() as ElementCreator<TosiTable>

/** @deprecated Use tosiTable instead */
export const dataTable = tosiTable

/** @deprecated Use tosiTable instead */
export const xinTable = tosiTable
