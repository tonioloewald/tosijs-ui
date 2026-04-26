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

test('row selection via data model', () => {
  const items = table.array
  table.deSelect()
  table.selectRow(items[0])
  table.selectRow(items[1])

  // Data model reflects selection immediately
  expect(items[0][table.selectedKey]).toBe(true)
  expect(items[1][table.selectedKey]).toBe(true)
  expect(table.selectedRows.length).toBe(2)

  // Deselect and verify data model
  table.deSelect()
  expect(table.selectedRows.length).toBe(0)
  expect(items[0][table.selectedKey]).not.toBe(true)
  expect(items[1][table.selectedKey]).not.toBe(true)
})

test('getCells and getItem', async () => {
  // Wait for list binding to stamp DOM elements
  const items = table.visibleRows
  let cells
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 3000
    const check = () => {
      cells = table.getCells(items[0])
      if (cells) return resolve()
      if (Date.now() > deadline) return reject(new Error(
        'getCells timed out — virtual scroll may not have rendered in this context'
      ))
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
  pinned?: 'left' | 'right'
  sort?: false | 'ascending' | 'descending'
  headerCell?: (options: ColumnOptions) => HTMLElement
  dataCell?: (options: ColumnOptions) => HTMLElement
}
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
    for (const c of cells) {
      c.classList.toggle('row-negative', total < 0)
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
  background: #eee;
  font-weight: bold;
}
.preview .row-negative {
  background: #fdd;
}
.preview .num-cell {
  font-variant-numeric: tabular-nums;
}
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

## Sorting

By default, the user can sort the table by any column which doesn't have a `sort === false`.

You can set the initial sort by setting the `sort` value of a specific column to `ascending`
or `descending`.

You can override this by setting the table's sort function (it's an `Array.sort()` callback)
to whatever you like, and you can replace the `headerCell` or set the `sort` of each column
to `false` if you have some specific sorting in mind.

You can disable sorting controls by adding the `nosort` attribute to the `<tosi-table>`.

## Hiding (and Showing) Columns

By default, the user can show / hide columns by clicking via the column header menu.
You can remove this option by adding the `nohide` attribute to the `<tosi-table>`

## Reordering Columns

By default, the user can reorder columns by dragging them around. You can disable this
by adding the `noreorder` attribute to the `<tosi-table>`.

## Row Height

If you set the `<tosi-table>`'s `rowHeight` to `0` it will render all its elements (i.e. not be virtual). This is
useful for smaller tables, or tables with variable row-heights.

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

import {
  Component as WebComponent,
  ElementCreator,
  elements,
  vars,
  varDefault,
  tosiValue,
  getListItem,
  getListBinding,
  bind,
  tosi,
} from 'tosijs'
import { trackDrag } from './track-drag'
import { SortCallback } from './make-sorter'
import { icons } from './icons'
import { popMenu, MenuItem } from './menu'
import * as dragAndDrop from './drag-and-drop'
import { tosiLocalized, localize } from './localize'

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

const { div, span, button } = elements

export interface ColumnOptions {
  name?: string
  prop: string
  width: number
  visible?: boolean
  align?: string
  pinned?: 'left' | 'right'
  sort?: false | 'ascending' | 'descending'
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

export class TosiTable extends WebComponent {
  static preferredTagName = 'tosi-table'

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
    ':host .grid': {
      overflow: 'auto',
      height: '100%',
      overscrollBehavior: 'none',
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
    ':host .th': {
      position: 'sticky',
      top: '0',
      zIndex: '2',
      background: varDefault.tosiTableHeaderBg(
        varDefault.tosiTableBg('var(--tosi-bg, #fff)')
      ),
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
    ':host .pinned-top': {
      position: 'sticky',
      zIndex: '2',
      background: varDefault.tosiTableBg('var(--tosi-bg, #fff)'),
    },
    ':host .pinned-top.col-pinned': {
      zIndex: '3',
    },
    ':host .pinned-bottom': {
      position: 'sticky',
      bottom: '0',
      zIndex: '2',
      background: varDefault.tosiTableBg('var(--tosi-bg, #fff)'),
    },
    ':host .pinned-bottom.col-pinned': {
      zIndex: '3',
    },
    ':host .td:focus, :host .th:focus': {
      outline: '2px solid var(--tosi-accent, #007AFF)',
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

  private _grid: HTMLElement | null = null

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
  }

  private _array: any[] = []
  private _columns: ColumnOptions[] | null = null
  private _filter: ArrayFilter = passThru
  private _sort?: SortCallback

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
    const { prop } = sortColumn

    return sortColumn.sort === 'ascending'
      ? (a: any, b: any) => (a[prop] > b[prop] ? 1 : -1)
      : (a: any, b: any) => (a[prop] > b[prop] ? -1 : 1)
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

  private cellClasses(base: string, si: StickyInfo): string {
    let cls = base
    if (si.left != null || si.right != null) cls += ' col-pinned'
    if (si.edgeClass) cls += ' ' + si.edgeClass
    return cls
  }

  private cellStyle(
    col: ColumnOptions,
    si: StickyInfo,
    extra?: Record<string, string>
  ): Record<string, string> {
    const style: Record<string, string> = {
      justifyContent: col.align || 'left',
      ...extra,
    }
    if (si.left != null) {
      style.position = 'sticky'
      style.left = si.left
    }
    if (si.right != null) {
      style.position = 'sticky'
      style.right = si.right
    }
    return style
  }

  private applyPinnedToCustomCell(
    cell: HTMLElement,
    colIndex: number,
    si: StickyInfo,
    style: Record<string, string>
  ): void {
    cell.setAttribute('aria-colindex', String(colIndex + 1))
    cell.tabIndex = -1
    cell.classList.add(...this.cellClasses('td', si).split(' '))
    Object.assign(cell.style, style)
  }

  private buildPinnedCells(
    rows: any[],
    cols: ColumnOptions[],
    stickyInfo: StickyInfo[],
    pin: 'top' | 'bottom',
    rowHeight: number,
    startRowIndex: number
  ): HTMLElement[] {
    const cells: HTMLElement[] = []
    for (let r = 0; r < rows.length; r++) {
      const rowItem = rows[r]
      const offset =
        pin === 'top'
          ? (r + 1) * rowHeight + 'px'
          : (rows.length - 1 - r) * rowHeight + 'px'
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c]
        const si = stickyInfo[c]
        cells.push(
          span(
            {
              class: this.cellClasses(`td pinned-${pin}`, si),
              role: 'gridcell',
              tabindex: -1,
              ariaRowindex: String(startRowIndex + r + 1),
              ariaColindex: String(c + 1),
              style: this.cellStyle(col, si, {
                position: 'sticky',
                [pin]: offset,
              }),
            },
            String(rowItem[col.prop] ?? '')
          )
        )
      }
    }
    return cells
  }

  getColumn(event: any): ColumnOptions | undefined {
    if (!this._grid) return undefined
    const pointerX =
      (event.touches !== undefined ? event.touches[0].clientX : event.clientX) -
      this._grid.getBoundingClientRect().x
    const epsilon = event.touches !== undefined ? 20 : 5
    const { scrollLeft, clientWidth, scrollWidth } = this._grid
    const cols = this.visibleColumns
    const rightScroll = scrollWidth - clientWidth - scrollLeft

    let boundaryX = 0
    return cols.find((options: ColumnOptions, i: number) => {
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
    if (this._grid) {
      this._grid.style.cursor = column !== undefined ? 'col-resize' : ''
    }
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
    if (!this._grid) return
    for (const elt of Array.from(this._grid.children)) {
      const item = getListItem(elt)
      if (item != null) {
        this.selectBinding(elt, item)
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
    const pickedItem = getListItem(target)
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

  private findCell(rowIndex: number, colIndex: number): HTMLElement | null {
    if (!this._grid) return null
    const cols = this.visibleColumns.length

    // Header cells (row -1)
    if (rowIndex === -1) {
      return this._grid.querySelector(
        `.th[aria-colindex="${colIndex + 1}"]`
      ) as HTMLElement | null
    }

    // Pinned cells use full-array-relative aria-rowindex
    // Virtual data cells use visible-data-relative aria-rowindex (set by bindList)
    // Try pinned first, then virtual
    const cell = this._grid.querySelector(
      `.pinned-top[aria-rowindex="${rowIndex + 1}"][aria-colindex="${colIndex + 1}"],` +
      `.pinned-bottom[aria-rowindex="${rowIndex + 1}"][aria-colindex="${colIndex + 1}"]`
    ) as HTMLElement | null
    if (cell) return cell

    // Virtual data cell: convert full-array index to visible-data index
    const dataRowIndex = rowIndex - this.pinnedTop
    return this._grid.querySelector(
      `[aria-rowindex="${dataRowIndex + 1}"][aria-colindex="${colIndex + 1}"]:not(.pinned-top):not(.pinned-bottom)`
    ) as HTMLElement | null
  }

  private _pendingFocus: { row: number; col: number } | null = null

  private onScrollEnd = () => {
    if (!this._pendingFocus) return
    const { row, col } = this._pendingFocus
    this._pendingFocus = null
    const cell = this.findCell(row, col)
    if (cell) cell.focus()
  }

  private focusCell(rowIndex: number, colIndex: number): void {
    if (!this._grid) return

    this._pendingFocus = { row: rowIndex, col: colIndex }

    const cell = this.findCell(rowIndex, colIndex)
    if (cell) {
      cell.focus()
      cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    } else {
      // Not in DOM — rough scroll to bring it into virtualisation range
      const dataRowIndex = rowIndex - this.pinnedTop
      if (dataRowIndex >= 0 && dataRowIndex < this.visibleRows.length) {
        this._grid.scrollTop = dataRowIndex * this.rowHeight
      }
    }
  }

  private handleKeyNav = (event: KeyboardEvent) => {
    if (!this._grid) return
    const el = event.target as HTMLElement
    const target = el.closest('.td') || el.closest('.th')
    if (!target) return

    const ariaCol = parseInt(target.getAttribute('aria-colindex') || '', 10)
    if (isNaN(ariaCol)) return
    const colIndex = ariaCol - 1

    const cols = this.visibleColumns.length
    const totalRows = this._array.length
    const meta = event.metaKey || event.ctrlKey
    const isHeader = target.classList.contains('th')

    // Determine current logical row index (-1 for header, 0-based full-array for data)
    let rowIndex: number
    if (isHeader) {
      rowIndex = -1
    } else if (
      target.classList.contains('pinned-top') ||
      target.classList.contains('pinned-bottom')
    ) {
      // Pinned cells: aria-rowindex is full-array-relative (1-based)
      const ariaRow = parseInt(target.getAttribute('aria-rowindex') || '', 10)
      if (isNaN(ariaRow)) return
      rowIndex = ariaRow - 1
    } else {
      // Virtual data cells: aria-rowindex is visible-data-relative (1-based)
      const ariaRow = parseInt(target.getAttribute('aria-rowindex') || '', 10)
      if (isNaN(ariaRow)) return
      rowIndex = this.pinnedTop + ariaRow - 1
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

    if (this._grid) {
      this._grid.style.gridTemplateColumns = columns
    }

    // Legacy CSS variables for backward compatibility
    this.style.setProperty('--tosi-table-grid-columns', columns)
    this.style.setProperty('--tosi-table-grid-row-width', rowWidth)
    this.style.setProperty('--grid-columns', columns)
    this.style.setProperty('--grid-row-width', rowWidth)

    // Update sticky positions for pinned columns after resize
    if (this._grid) {
      const stickyInfo = this.computeStickyInfo(cols)
      for (const cell of this._grid.querySelectorAll('.col-pinned')) {
        const ci = parseInt(cell.getAttribute('aria-colindex') || '', 10) - 1
        if (!isNaN(ci) && stickyInfo[ci]) {
          const si = stickyInfo[ci]
          if (si.left != null) (cell as HTMLElement).style.left = si.left
          if (si.right != null) (cell as HTMLElement).style.right = si.right
        }
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
            ? `${localize('Sort')} ${localize('Ascending')}`
            : 'Sort Ascending',
          icon: 'sortAscending',
          action() {
            sortByColumn(options)
          },
        },
        {
          caption: this.localized
            ? `${localize('Sort')} ${localize('Descending')}`
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
            ? `${localize('Hide')} ${localize('Column')}`
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
            ? `${localize('Show')} ${localize('Column')}`
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
    const pinIcon = options.pinned === 'left'
      ? 'pin'
      : options.pinned === 'right'
        ? 'pin0f'
        : 'pin50o'
    menu.push({
      caption: this.localized ? localize('Pin') : 'Pin',
      icon: pinIcon,
      menuItems: [
        {
          caption: this.localized ? localize('Left') : 'Left',
          icon: 'pin',
          enabled: () => options.pinned !== 'left',
          action() {
            options.pinned = 'left'
            queueRender()
          },
        },
        {
          caption: this.localized ? localize('Right') : 'Right',
          icon: 'pin0f',
          enabled: () => options.pinned !== 'right',
          action() {
            options.pinned = 'right'
            queueRender()
          },
        },
        {
          caption: this.localized ? localize('Unpin') : 'Unpin',
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
    return this.array.filter((obj) => obj[this.selectedKey])
  }

  getCells(itemOrCell: any): HTMLElement[] | undefined {
    if (!this._grid) return undefined
    const binding = getListBinding(this._grid)
    if (!binding) return undefined
    const item =
      itemOrCell instanceof Element ? getListItem(itemOrCell) : itemOrCell
    if (item == null) return undefined
    return binding.itemToElement.get(tosiValue(item)) as
      | HTMLElement[]
      | undefined
  }

  getItem(cell: Element): any {
    return getListItem(cell)
  }

  private draggedColumn?: ColumnOptions

  private dropColumn = (event: Event) => {
    const target = (event.target as HTMLElement).closest(
      '.drag-over'
    ) as HTMLElement
    const colIndex = parseInt(target.getAttribute('aria-colindex') || '', 10) - 1
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
    this.textContent = ''

    // Prepare data
    const pinnedTopData =
      this.pinnedTop > 0 ? this._array.slice(0, this.pinnedTop) : []
    const pinnedBottomData =
      this.pinnedBottom > 0 ? this._array.slice(-this.pinnedBottom) : []
    const maxIndex = Math.min(
      this._array.length - this.pinnedBottom,
      this.pinnedTop + this.maxVisibleRows
    )
    const visibleData = this.filter(
      this._array.slice(this.pinnedTop, maxIndex)
    )
    const { sort } = this
    if (sort) {
      visibleData.sort(sort)
    }
    this.rowData.visible = visibleData

    // Column layout
    const cols = this.visibleColumns
    if (cols.length === 0) return
    const stickyInfo = this.computeStickyInfo(cols)
    const rowHeight = this.rowHeight || 1

    this.style.setProperty(
      '--tosi-table-row-height',
      this.rowHeight > 0 ? `${this.rowHeight}px` : 'auto'
    )

    // Build header cells
    const { popColumnMenu } = this
    const headerCells = cols.map((col, i) => {
      const si = stickyInfo[i]

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
                ariaColindex: String(i + 1),
                style: this.cellStyle(col, si),
              },
              this.captionSpan(
                { style: { flex: '1' } },
                typeof col.name === 'string' ? col.name : col.prop
              ),
              menuButton
            )

      // Apply sticky to custom headerCell
      if (col.headerCell !== undefined) {
        this.applyPinnedToCustomCell(
          cell as HTMLElement,
          i,
          si,
          this.cellStyle(col, si)
        )
      }

      // Column reordering
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

      return cell
    })

    const pinnedTopCells = this.buildPinnedCells(
      pinnedTopData,
      cols,
      stickyInfo,
      'top',
      rowHeight,
      0
    )
    const pinnedBottomCells = this.buildPinnedCells(
      pinnedBottomData,
      cols,
      stickyInfo,
      'bottom',
      rowHeight,
      this._array.length - this.pinnedBottom
    )

    // Data cells via listBinding with itemsPerRow
    const selectEnabled = this.select || this.multiple
    const selectBindingFn = this.selectBinding
    const { rowRendered } = this
    const lastCol = cols.length - 1
    const rowRenderedBinding = rowRendered
      ? (cell: Element) => {
          const item = getListItem(cell)
          if (item != null) {
            const cells = this.getCells(item)
            if (cells) rowRendered(item, cells)
          }
        }
      : null
    const binding = (this.rowData.visible as any).listBinding(
      ({ span: s }: any, item: any, colIndex: number) => {
        const col = cols[colIndex]
        const si = stickyInfo[colIndex]
        const style = this.cellStyle(col, si)

        if (col.dataCell != null) {
          const customCell = col.dataCell(col)
          this.applyPinnedToCustomCell(
            customCell as HTMLElement,
            colIndex,
            si,
            style
          )
          if (rowRenderedBinding && colIndex === lastCol) {
            bind(customCell, item, { toDOM: rowRenderedBinding })
          }
          return customCell
        }

        const props: any = {
          class: this.cellClasses('td', si),
          role: 'gridcell',
          tabindex: -1,
          style,
          bindText: item[col.prop],
        }
        if (selectEnabled) {
          props.bind = {
            value: item,
            binding: { toDOM: selectBindingFn },
          }
        }
        // Fire rowRendered on the last cell of each row
        if (rowRenderedBinding && colIndex === lastCol) {
          props.bind = {
            value: item,
            binding: {
              toDOM(cell: Element) {
                if (selectEnabled) selectBindingFn(cell, getListItem(cell))
                rowRenderedBinding(cell)
              },
            },
          }
        }
        return s(props)
      },
      {
        virtual: {
          height: rowHeight,
          itemsPerRow: cols.length,
        },
      }
    )

    // Assemble grid
    const stickyTopHeight = (1 + this.pinnedTop) * rowHeight
    const stickyBottomHeight = this.pinnedBottom * rowHeight
    const grid = div(
      {
        class: 'grid',
        style: {
          gridTemplateColumns: cols.map((c) => c.width + 'px').join(' '),
          scrollPaddingTop: stickyTopHeight + 'px',
          scrollPaddingBottom: stickyBottomHeight + 'px',
        },
      },
      ...headerCells,
      ...pinnedTopCells,
      ...binding,
      ...pinnedBottomCells
    )

    this._grid = grid
    grid.addEventListener('scrollend', this.onScrollEnd)
    this.append(grid)
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
