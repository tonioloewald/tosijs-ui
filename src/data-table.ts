/*#
# table

A virtual data-table, configurable via a `columns` array (which will automatically be generated if not provided),
that displays gigantic tables with fixed headers (and live column-resizing) using a minimum of resources and cpu.

```js
import { dataTable } from 'tosijs-ui'
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

preview.append(dataTable({
  multiple: true,
  array: emojiData,
  localized: true,
  columns,
  rowHeight: 40,
  pinnedBottom: 2
}))
```
```css
.preview input.td {
  margin: 0;
  border-radius: 0;
  box-shadow: none !important;
  background: #fff4;
}

.preview xin-table {
  height: 100%;
}

.preview xin-table [part="pinnedTopRows"],
.preview xin-table [part="pinnedBottomRows"] {
  background: #ddd;
}
```

> In the preceding example, the `name` column is *editable* (and *bound*, try editing something and scrolling
> it out of view and back) and `multiple` select is enabled. In the console, you can try `$('xin-table').visibleRows`
> and $('xin-table').selectedRows`.

You can set the `<xin-table>`'s `array`, `columns`, and `filter` properties directly, or set its `value` to:

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
  sort?: false | 'ascending' | 'descending'
  headerCell?: (options: ColumnOptions) => HTMLElement
  dataCell?: (options: ColumnOptions) => HTMLElement
}
```

## Selection

`<xin-table>` supports `select` and `multiple` boolean properties allowing rows to be selectable. Selected rows will
be given the `[aria-selected]` attribute, so style them as you wish.

`multiple` select supports shift-clicking and command/meta-clicking.

`<xin-table>` provides an `selectionChanged(visibleSelectedRows: any[]): void` callback property allowing you to respond to changes
in the selection, and also `selectedRows` and `visibleSelectedRows` properties.

The following methods are also provided:

- `<xin-table>.selectRow(row: any, select = true)` (de)selects specified row
- `<xin-table>.selectRows(rows?: any[], select = true)` (de)selects specified rows
- `<xin-table>.deSelect(rows?: any[])` deselects all or specified rows.

These are rather fine-grained but they're used internally by the selection code so they may as well be documented.

## Sorting

By default, the user can sort the table by any column which doesn't have a `sort === false`.

You can set the initial sort by setting the `sort` value of a specific column to `ascending`
or `descending`.

You can override this by setting the table's sort function (it's an `Array.sort()` callback)
to whatever you like, and you can replace the `headerCell` or set the `sort` of each column
to `false` if you have some specific sorting in mind.

You can disable sorting controls by adding the `nosort` attribute to the `<xin-table>`.

## Hiding (and Showing) Columns

By default, the user can show / hide columns by clicking via the column header menu.
You can remove this option by adding the `nohide` attribute to the `<xin-table>`

## Reordering Columns

By default, the user can reorder columns by dragging them around. You can disable this
by adding the `noreorder` attribute to the `<xin-table>`.

## Row Height

If you set the `<xin-table>`'s `rowHeight` to `0` it will render all its elements (i.e. not be virtual). This is
useful for smaller tables, or tables with variable row-heights.

## Styling

Aside from row height (see previous) the component doesn't use the shadowDOM, so it's easy to override
its styles.

## Pinned Rows

The table supports two attributes, `pinnedTop` and `pinnedBottom` that let you pin the specified number
of top and bottom rows.

## Localization

`<xin-table>` supports the `localized` attribute which simply causes its default `headerCell`
to render a `<xin-localized>` element instead of a span for its caption, and localize its
popup menu.

You'll need to make sure your localized strings include:

- Sort
- Show
- Hide
- Column
- Ascending
- Descending

As well as any column names you want localized.
*/

import {
  Component as WebComponent,
  ElementCreator,
  elements,
  vars,
  varDefault,
  xinValue,
  getListItem,
  tosi,
  touch,
} from 'tosijs'
import { trackDrag } from './track-drag'
import { SortCallback } from './make-sorter'
import { icons } from './icons'
import { popMenu, MenuItem } from './menu'
import * as dragAndDrop from './drag-and-drop'
import { xinLocalized, localize } from './localize'

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

const { div, span, button, template } = elements

export interface ColumnOptions {
  name?: string
  prop: string
  width: number
  visible?: boolean
  align?: string
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

export class DataTable extends WebComponent {
  select = false
  multiple = false
  nosort = false
  nohide = false
  noreorder = false
  selectionChanged: SelectCallback = () => {
    /* do not care */
  }
  localized = false

  private selectedKey = Symbol('selected')
  private selectBinding = (elt: Element, obj: any) => {
    elt.toggleAttribute('aria-selected', obj[this.selectedKey] === true)
  }

  pinnedTop = 0
  pinnedBottom = 0
  maxVisibleRows = 10000

  get value(): TableData {
    return {
      array: this.array,
      filter: this.filter,
      columns: this.columns,
    }
  }

  set value(data: TableData) {
    const { array, columns, filter } = xinValue(data)
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
    pinnedTop: [] as any[],
    pinnedBottom: [] as any[],
  }

  private _array: any[] = []
  private _columns: ColumnOptions[] | null = null
  private _filter: ArrayFilter = passThru
  charWidth = 15
  rowHeight = 30
  minColumnWidth = 30

  get virtual(): { height: number } | undefined {
    return this.rowHeight > 0 ? { height: this.rowHeight } : undefined
  }

  constructor() {
    super()

    this.rowData = tosi({
      [this.instanceId]: this.rowData,
    })[this.instanceId]

    this.initAttributes(
      'rowHeight',
      'charWidth',
      'minColumnWidth',
      'select',
      'multiple',
      'pinnedTop',
      'pinnedBottom',
      'nosort',
      'nohide',
      'noreorder',
      'localized'
    )
  }

  get array(): any[] {
    return this._array
  }

  set array(newArray: any[]) {
    this._array = xinValue(newArray)
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

  set sort(sortFunc: ArrayFilter) {
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
    return this.columns.filter((c) => c.visible !== false)
  }

  content = null

  getColumn(event: any): ColumnOptions | undefined {
    const x =
      (event.touches !== undefined ? event.touches[0].clientX : event.clientX) -
      this.getBoundingClientRect().x
    const epsilon = event.touches !== undefined ? 20 : 5
    let boundaryX = 0
    const log: any[] = []
    const column = this.visibleColumns.find((options: ColumnOptions) => {
      if (options.visible !== false) {
        boundaryX += options.width
        log.push(boundaryX)
        return Math.abs(x - boundaryX) < epsilon
      }
    })
    return column
  }

  private setCursor = (event: Event) => {
    const column = this.getColumn(event)
    if (column !== undefined) {
      this.style.cursor = 'col-resize'
    } else {
      this.style.cursor = ''
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
  }

  selectRows(rows?: any[], select = true) {
    for (const row of rows || this.array) {
      this.selectRow(row, select)
    }
  }

  deSelect(rows?: any[]) {
    this.selectRows(rows, false)
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
    const tr = target.closest('.tr')
    if (!(tr instanceof HTMLElement)) {
      return
    }
    const pickedItem = getListItem(tr)
    if (pickedItem === false) {
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
    for (const row of Array.from(this.querySelectorAll('.tr'))) {
      const item = getListItem(row)
      this.selectBinding(row, item)
    }
  }

  connectedCallback(): void {
    super.connectedCallback()

    this.addEventListener('mousemove', this.setCursor)
    this.addEventListener('mousedown', this.resizeColumn)
    this.addEventListener('touchstart', this.resizeColumn, { passive: true })
    this.addEventListener('mouseup', this.updateSelection)
    this.addEventListener('touchend', this.updateSelection)
  }

  setColumnWidths() {
    this.style.setProperty(
      '--grid-columns',
      this.visibleColumns.map((c) => c.width + 'px').join(' ')
    )
    this.style.setProperty(
      '--grid-row-width',
      this.visibleColumns.reduce((w, c) => w + c.width, 0) + 'px'
    )
  }

  sortByColumn = (
    columnOptions: ColumnOptions,
    direction: 'ascending' | 'descending' | 'auto' = 'auto'
  ) => {
    for (const column of this.columns.filter(
      (c) => xinValue(c.sort) !== false
    )) {
      if (xinValue(column) === columnOptions) {
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
            : 'Sort Ascending',
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

    popMenu({
      target,
      localized: this.localized,
      menuItems: menu,
    })
  }

  get captionSpan(): ElementCreator {
    return this.localized ? xinLocalized : span
  }

  headerCell = (options: ColumnOptions) => {
    const { popColumnMenu } = this
    let ariaSort = 'none'
    let sortIcon: SVGElement | undefined
    switch (options.sort) {
      case 'ascending':
        sortIcon = icons.sortAscending()
        ariaSort = 'descending'
        break
      case false:
        break
      default:
        break
      case 'descending':
        ariaSort = 'ascending'
        sortIcon = icons.sortDescending()
    }

    const menuButton = !(this.nosort && this.nohide)
      ? button(
          {
            class: 'menu-trigger',
            onClick(event: Event) {
              popColumnMenu(event.target as HTMLElement, options)
              event.stopPropagation()
            },
          },
          sortIcon || icons.moreVertical()
        )
      : {}

    return options.headerCell !== undefined
      ? options.headerCell(options)
      : span(
          {
            class: 'th',
            role: 'columnheader',
            ariaSort,
            style: {
              ...this.cellStyle,
              justifyContent: options.align || 'left',
            },
          },
          this.captionSpan(
            typeof options.name === 'string' ? options.name : options.prop
          ),
          span({ style: { flex: '1' } }),
          menuButton
        )
  }

  dataCell = (options: ColumnOptions) => {
    if (options.dataCell !== undefined) {
      return options.dataCell(options)
    }
    return span({
      class: 'td',
      role: 'cell',
      style: {
        ...this.cellStyle,
        justifyContent: options.align || 'left',
      },
      bindText: `^.${options.prop}`,
    })
  }

  get visibleRows(): any[] {
    return xinValue(this.rowData.visible) as any[]
  }

  get visibleSelectedRows(): any[] {
    return this.visibleRows.filter((obj) => obj[this.selectedKey])
  }

  get selectedRows(): any[] {
    return this.array.filter((obj) => obj[this.selectedKey])
  }

  rowTemplate(columns: ColumnOptions[]): HTMLTemplateElement {
    return template(
      div(
        {
          class: 'tr',
          role: 'row',
          bind: {
            value: '^',
            binding: { toDOM: this.selectBinding },
          },
        },
        ...columns.map(this.dataCell)
      )
    )
  }

  private draggedColumn?: ColumnOptions

  private dropColumn = (event: Event) => {
    const target = (event.target as HTMLElement).closest(
      '.drag-over'
    ) as HTMLElement
    const targetIndex = Array.from(target.parentElement!.children).indexOf(
      target
    )
    const dropped = this.visibleColumns[targetIndex]
    const draggedIndex = this.columns.indexOf(this.draggedColumn!)
    const droppedIndex = this.columns.indexOf(dropped)
    this.columns.splice(draggedIndex, 1)
    this.columns.splice(droppedIndex, 0, this.draggedColumn!)
    console.log({ event, target, targetIndex, draggedIndex, droppedIndex })
    this.queueRender()

    event.preventDefault()
    event.stopPropagation()
  }

  render() {
    super.render()

    this.rowData.pinnedTop =
      this.pinnedTop > 0 ? this._array.slice(0, this.pinnedTop) : []
    this.rowData.pinnedBottom =
      this.pinnedBottom > 0
        ? this._array.slice(this._array.length - this.pinnedBottom)
        : []
    this.rowData.visible = this.filter(
      this._array.slice(
        this.pinnedTop,
        Math.min(
          this.maxVisibleRows,
          this._array.length - this.pinnedTop - this.pinnedBottom
        )
      )
    )

    const { sort } = this
    if (sort) {
      this.rowData.visible.sort(sort)
    }

    this.textContent = ''

    this.style.display = 'flex'
    this.style.flexDirection = 'column'
    const { visibleColumns } = this
    this.style.setProperty('--row-height', `${this.rowHeight}px`)
    this.setColumnWidths()

    if (!this.noreorder) {
      dragAndDrop.init()
    }
    const dragId = this.instanceId + '-column-header'
    const columnHeaders = visibleColumns.map((column) => {
      const header = this.headerCell(column)
      if (!this.noreorder) {
        header.setAttribute('draggable', 'true')
        header.dataset.drag = dragId
        header.dataset.drop = dragId
        header.addEventListener('dragstart', () => {
          this.draggedColumn = column
        })
        header.addEventListener('drop', this.dropColumn)
      }
      return header
    })
    this.append(
      div(
        { class: 'thead', role: 'rowgroup', style: { touchAction: 'none' } },
        div(
          {
            class: 'tr',
            role: 'row',
          },
          ...columnHeaders
        )
      )
    )
    if (this.pinnedTop > 0) {
      this.append(
        div(
          {
            part: 'pinnedTopRows',
            class: 'tbody',
            role: 'rowgroup',
            style: {
              flex: '0 0 auto',
              overflow: 'hidden',
              height: `${this.rowHeight * this.pinnedTop}px`,
            },
            bindList: {
              value: this.rowData.pinnedTop,
              virtual: this.virtual,
            },
          },
          this.rowTemplate(visibleColumns)
        )
      )
    }
    this.append(
      div(
        {
          part: 'visibleRows',
          class: 'tbody',
          role: 'rowgroup',
          style: {
            content: ' ',
            minHeight: '100px',
            flex: '1 1 100px',
            overflow: 'hidden auto',
          },
          bindList: {
            value: this.rowData.visible,
            virtual: this.virtual,
          },
        },
        this.rowTemplate(visibleColumns)
      )
    )
    if (this.pinnedBottom > 0) {
      this.append(
        div(
          {
            part: 'pinnedBottomRows',
            class: 'tbody',
            role: 'rowgroup',
            style: {
              flex: '0 0 auto',
              overflow: 'hidden',
              height: `${this.rowHeight * this.pinnedBottom}px`,
            },
            bindList: {
              value: this.rowData.pinnedBottom,
              virtual: this.virtual,
            },
          },
          this.rowTemplate(visibleColumns)
        )
      )
    }
  }
}

export const dataTable = DataTable.elementCreator({
  tag: 'xin-table',
  styleSpec: {
    ':host': {
      overflow: 'auto hidden',
    },
    ':host .thead, :host .tbody': {
      width: vars.gridRowWidth,
    },
    ':host .tr': {
      display: 'grid',
      gridTemplateColumns: vars.gridColumns,
      height: vars.rowHeight,
      lineHeight: vars.rowHeight,
    },
    ':host .td, :host .th': {
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      display: 'flex',
      alignItems: 'center',
    },
    ':host .th .menu-trigger': {
      color: 'currentColor',
      background: 'none',
      padding: 0,
      lineHeight: vars.touchSize,
      height: vars.touchSize,
      width: vars.touchSize,
    },
    ':host [draggable="true"]': {
      cursor: 'ew-resize',
    },
    ':host [draggable="true"]:active': {
      background: varDefault.draggedHeaderBg('#0004'),
      color: varDefault.draggedHeaderColor('#fff'),
    },
    ':host .drag-over': {
      background: varDefault.dropHeaderBg('#fff4'),
    },
  },
}) as ElementCreator<DataTable>
