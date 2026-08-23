/*#
# crud

<!--{ "parent": "Components" }-->

Search, list, edit — [`<tosi-table>`](/data-table/) and
[`<tosi-schema-form>`](/schema-form/) over a store you supply.

```js
import { tosiCrud } from 'tosijs-ui'

// A store is three promise-returning methods. This one is an array in a closure; yours
// might be `fetch`, a DocStore, or IndexedDB — the component neither knows nor cares.
let records = [
  { id: 1, name: 'Ada Lovelace', role: 'admin', active: true },
  { id: 2, name: 'Grace Hopper', role: 'admin', active: true },
  { id: 3, name: 'Katherine Johnson', role: 'editor', active: false },
]

preview.append(
  tosiCrud({
    hashNamespace: 'people',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'integer', title: 'ID' },
        name: { type: 'string' },
        role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
        active: { type: 'boolean' },
      },
      required: ['name'],
    },
    store: {
      async list({ search }) {
        const term = (search ?? '').toLowerCase()
        return records.filter((r) => r.name.toLowerCase().includes(term))
      },
      async save(record) {
        const id = record.id ?? Math.max(0, ...records.map((r) => r.id)) + 1
        const saved = { ...record, id }
        records = records.some((r) => r.id === id)
          ? records.map((r) => (r.id === id ? saved : r))
          : [...records, saved]
        return saved
      },
      async delete(record) {
        records = records.filter((r) => r.id !== record.id)
      },
    },
  })
)
```
```test
const crud = await waitFor('tosi-crud')
await crud.whenIdle()

test('search, select, edit, save — and the URL remembers where you were', async () => {
  // One test: every step shares this component, and test() bodies run concurrently.
  expect(crud.rows.length).toBe(3)

  // Selecting a row loads it into the form and records it in the hash.
  crud.select(crud.rows[1])
  await crud.whenIdle()
  expect(crud.value.name).toBe('Grace Hopper')
  expect(location.hash).toContain('people.id=2')

  // Editing writes the form's model; saving sends it to the store and re-lists.
  const name = crud.form.querySelector('[data-path="name"]')
  name.value = 'Grace B. Hopper'
  name.dispatchEvent(new Event('input', { bubbles: true }))
  await crud.save()
  expect(crud.rows.find((r) => r.id === 2).name).toBe('Grace B. Hopper')

  // Searching re-queries the store.
  crud.search = 'ada'
  await crud.whenIdle()
  expect(crud.rows.length).toBe(1)
})
```

## The store is the only thing you have to write

```typescript
interface CrudStore {
  list(query: { search?: string }): Promise<any[]>
  save?(record: any): Promise<any>     // returns the saved record
  delete?(record: any): Promise<void>
}
```

There is **no transport in here** — no `fetch`, no URL convention, no envelope format. REST,
a DocStore, IndexedDB, an array in a closure and a mock in a test all satisfy the same three
methods. Omit `save` and the form is read-only; omit `delete` and its button is not shown.

`save` returns the saved record because the server usually knows things the client does not:
the id of a new record, a timestamp, a computed field. That returned record is what the form
then holds.

## The parts stay usable on their own

`<tosi-crud>` composes public components and exposes them — `.table` and `.form` are the real
elements, so anything you can do to a `<tosi-table>` you can do here:

```typescript
crud.table.columns = [{ prop: 'name', width: 200 }, { prop: 'role', width: 100 }]
crud.form.readOnly = true
```

It is a convenience, never the only way to reach them. Compose the three yourself when your
layout wants something else — that is a supported thing to do, not a fallback.

## Schema: give one, or let it infer

With a `schema`, the form renders it and the table takes its columns **from the schema** —
which is better than the table's own inference, because that reads `Object.keys(array[0])` and
so loses the column for any property the first row happens not to have.

Without one, the form infers a schema from the record it edits (see
[schema-form](/schema-form/)) and the table falls back to inferring its own columns. That
works, and it costs a lazy import of `tosijs-schema` before the first field appears — so give
a schema when you have one.

```js
import { tosiCrud } from 'tosijs-ui'

let rows = [
  { sku: 'W-1', qty: 2, price: 9.99 },
  { sku: 'G-9', qty: 5, price: 1.5 },
]

preview.append(
  tosiCrud({
    hashNamespace: 'stock',
    idPath: 'sku',
    schema: {
      type: 'object',
      properties: {
        sku: { type: 'string', title: 'SKU' },
        qty: { type: 'integer', title: 'Quantity' },
        price: { type: 'number' },
      },
      required: ['sku'],
    },
    store: {
      async list() {
        return rows
      },
      async save(record) {
        rows = rows.map((r) => (r.sku === record.sku ? record : r))
        return record
      },
    },
  })
)
```
```test
const stock = await waitFor('tosi-crud')
await stock.whenIdle()

test('columns come from the schema, titles and all', () => {
  expect(stock.table.columns.map((c) => c.prop)).toEqual(['sku', 'qty', 'price'])
  expect(stock.table.columns[0].name).toBe('SKU')
  // No `delete` on the store, so no delete button is shown — a disabled or dead button
  // advertises an affordance that does not exist.
  expect(stock.querySelector('.crud-delete').hidden).toBe(true)
  expect(stock.querySelector('.crud-save').hidden).toBe(false)
})
```

## The URL remembers where you were

The search term and the selected record's id live in the page hash via
[`hashState`](/hash-state/), so a filtered list with a record open is a link you can send
someone. Set `hashNamespace` to keep two of them from colliding, or `hashMode="memory"` to
keep the URL out of it entirely.

Typing **replaces** the current history entry; selecting a record **pushes** one — so back
takes you out of the record you opened rather than un-typing your search one letter at a time.

## Failures are shown, never swallowed

If `list`, `save` or `delete` rejects, the message is displayed and an `error` event is
dispatched with `{ operation, error }`. Nothing is retried behind your back and nothing
reports success on a failure.

Out-of-order responses are dropped: every `list` carries a sequence number and a late reply
from a slower earlier query is discarded rather than overwriting newer results. That is the
classic search-as-you-type bug — you stop typing and the list flips back to the results for a
prefix.

```js
import { tosiCrud } from 'tosijs-ui'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const all = ['alpha', 'alps', 'alphabet'].map((name, id) => ({ id, name }))

preview.append(
  tosiCrud({
    hashNamespace: 'slow',
    store: {
      async list({ search }) {
        // A short term is SLOWER, so a stale reply is guaranteed to land last — which is
        // exactly the race a real network produces by accident.
        await wait(search && search.length > 2 ? 0 : 150)
        return all.filter((r) => r.name.startsWith(search ?? ''))
      },
      async save() {
        throw new Error('the server said no')
      },
    },
  })
)
```
```test
const slow = await waitFor('tosi-crud')
await slow.whenIdle()

test('a stale reply is dropped, and a failed save is reported not swallowed', async () => {
  // Fire the slow query, then the fast one, without waiting in between.
  slow.search = 'al'
  slow.search = 'alph'
  await slow.whenIdle()
  // 'alph' matches alpha + alphabet; 'al' would have matched all three. The late reply from
  // the earlier query must not put the list back to a prefix the user has finished typing.
  expect(slow.rows.map((r) => r.name)).toEqual(['alpha', 'alphabet'])

  // A rejecting save reports the failure three ways and claims success none of them.
  slow.select(slow.rows[0])
  let event = null
  slow.addEventListener('error', (e) => (event = e.detail), { once: true })
  let threw = false
  try {
    await slow.save()
  } catch (e) {
    threw = true
  }
  await slow.whenIdle()
  expect(threw).toBe(true)
  expect(event.operation).toBe('save')
  expect(slow.querySelector('.crud-status').textContent).toBe('the server said no')
})
```

## Properties, methods, events

- `store` — the adapter. Setting it re-lists.
- `schema` — optional JSON Schema for the form and the table's columns.
- `idPath` — which property identifies a record (default `'id'`).
- `search` — the current search term.
- `rows` — the records currently listed.
- `value` — the selected record (the form's live model).
- `table` / `form` — the composed elements.
- `refresh()` / `select(record)` / `save()` / `remove()` / `createNew()`
- `whenIdle()` — resolves when no store operation is in flight; for tests, mostly.
- `change` — the selection or the saved record changed.
- `error` — a store operation failed.
*/

/*{ "parent": "Components" }*/

import { Component as WebComponent, ElementCreator, elements } from 'tosijs'
import type { JSONSchema } from './schema-form/json-schema.js'
import { tosiTable, type ColumnOptions, type TosiTable } from './data-table.js'
import { tosiSchemaForm, type TosiSchemaForm } from './schema-form.js'
import { hashState, type HashState, type HashStateMode } from './hash-state.js'
import { localize } from './localize.js'
import { getByPath } from './schema-form/fields.js'

const { div, input, button } = elements

export interface CrudQuery {
  search?: string
  [key: string]: unknown
}

/**
 * Everything the component needs from your data layer.
 *
 * Three promise-returning methods and no transport: the point is that REST, a DocStore,
 * IndexedDB, an in-memory array and a mock all satisfy this without the component learning
 * anything about any of them.
 */
export interface CrudStore {
  list(query: CrudQuery): Promise<any[]>
  /** returns the saved record — the server usually knows the id, the timestamp, the rest */
  save?(record: any): Promise<any>
  delete?(record: any): Promise<void>
}

interface CrudParts {
  search: HTMLInputElement
  table: TosiTable
  form: TosiSchemaForm
  detail: HTMLElement
  status: HTMLElement
  saveButton: HTMLButtonElement
  deleteButton: HTMLButtonElement
  newButton: HTMLButtonElement
}

/*
Columns from a schema, so ONE description of the shape drives both surfaces.

`<tosi-table>`'s own inference reads `Object.keys(array[0])`, so a property missing from the
first row silently loses its column. When a schema is given it is the better source: it knows
every property, their titles, and their types — including ones no row happens to have filled
in.
*/
export function columnsFromSchema(schema: JSONSchema): ColumnOptions[] {
  if (!schema?.properties) return []
  return Object.entries(schema.properties).map(([prop, propSchema]) => {
    const types = Array.isArray(propSchema.type)
      ? propSchema.type
      : [propSchema.type]
    const type = types.find((t) => t && t !== 'null')
    const column: ColumnOptions = {
      prop,
      name: (propSchema as any).title,
      // Narrow for a number, wide for prose — a starting point the consumer can override
      // wholesale by setting `table.columns`.
      width:
        type === 'boolean'
          ? 80
          : type === 'integer' || type === 'number'
          ? 100
          : 180,
    }
    if (type === 'boolean') column.type = 'boolean(✓,✗)' as any
    return column
  })
}

export class TosiCrud extends WebComponent<CrudParts> {
  static preferredTagName = 'tosi-crud'

  static lightStyleSpec = {
    ':host': {
      display: 'grid',
      gridTemplateRows: 'auto minmax(0, 1fr) auto',
      gap: 'var(--tosi-spacing, 10px)',
      minHeight: '300px',
    },
    ':host .crud-toolbar': {
      display: 'flex',
      gap: 'var(--tosi-spacing-50, 5px)',
      alignItems: 'center',
    },
    ':host .crud-search': { flex: '1 1 auto', minWidth: '0' },
    ':host .crud-body': {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
      gap: 'var(--tosi-spacing, 10px)',
      minHeight: '0',
    },
    ':host .crud-detail': {
      display: 'grid',
      gridTemplateRows: 'minmax(0, 1fr) auto',
      gap: 'var(--tosi-spacing-50, 5px)',
      overflow: 'auto',
    },
    ':host .crud-detail[hidden]': { display: 'none' },
    ':host .crud-actions': {
      display: 'flex',
      gap: 'var(--tosi-spacing-50, 5px)',
    },
    ':host .crud-status': { fontSize: '0.85em', opacity: '0.8' },
    ':host .crud-status.-error': {
      color: 'var(--tosi-error, #c00)',
      opacity: '1',
    },
    ':host tosi-table': { minHeight: '200px' },
  }

  static initAttributes = {
    idPath: 'id',
    hashNamespace: 'crud',
    hashMode: 'hash',
    /** ms to wait after a keystroke before querying — a remote store is not free */
    searchDelay: 200,
  }

  private _store: CrudStore | null = null
  private _schema: JSONSchema | null = null
  private _rows: any[] = []
  private _selected: any = null
  private _error = ''
  private _pending = 0
  /*
  Every `list` carries a sequence number and only the newest reply is accepted.

  Without it, a slow query for `a` can land after a fast one for `abc` and put the list back
  to the results for a prefix the user has already finished typing — the classic
  search-as-you-type bug, and one that only shows up on a real network.
  */
  private _listSeq = 0
  private _idle: Array<() => void> = []
  private _hash: HashState | null = null
  private _stopHash: (() => void) | null = null
  private _searchTimer: any = null

  get store(): CrudStore | null {
    return this._store
  }

  set store(store: CrudStore | null) {
    this._store = store
    if (this.hydrated) void this.refresh()
  }

  get schema(): JSONSchema | null {
    return this._schema
  }

  set schema(schema: JSONSchema | null) {
    this._schema = schema
    this.queueRender()
  }

  get rows(): any[] {
    return this._rows
  }

  /** The selected record — the form's live model, so it includes unsaved edits. */
  get value(): any {
    return this.hydrated && this._selected
      ? this.parts.form.value
      : this._selected
  }

  get table(): TosiTable {
    return this.parts.table
  }

  get form(): TosiSchemaForm {
    return this.parts.form
  }

  get search(): string {
    return this._hash?.get('q') ?? ''
  }

  set search(term: string) {
    this._hash?.set('q', term || undefined)
    if (this.hydrated) this.parts.search.value = term
    void this.refresh()
  }

  /**
   * Resolves when no store operation is in flight AND the DOM has caught up.
   *
   * Both halves matter to a caller: rendering is queued for the next frame, so "the store
   * answered" and "the list shows the answer" are different moments.
   */
  async whenIdle(): Promise<void> {
    if (this._pending > 0) {
      await new Promise<void>((resolve) => this._idle.push(resolve))
    }
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }

  private settle(): void {
    if (this._pending > 0) return
    const waiting = this._idle
    this._idle = []
    for (const resolve of waiting) resolve()
  }

  /*
  One place where a store call is awaited, so nothing can quietly succeed on a failure.

  A rejection is shown, dispatched as an `error` event, and re-thrown to the caller of the
  public method — a `save()` that failed must not resolve as if it worked.
  */
  private async run<T>(operation: string, work: () => Promise<T>): Promise<T> {
    this._pending++
    this._error = ''
    this.queueRender()
    try {
      return await work()
    } catch (error) {
      this._error = (error as Error)?.message ?? String(error)
      this.dispatchEvent(
        new CustomEvent('error', { detail: { operation, error } })
      )
      throw error
    } finally {
      this._pending--
      this.queueRender()
      this.settle()
    }
  }

  async refresh(): Promise<void> {
    if (!this._store) return
    const seq = ++this._listSeq
    const rows = await this.run('list', () =>
      this._store!.list({ search: this.search || undefined })
    )
    // A late reply from an earlier query is not news — drop it rather than overwrite the
    // results of the query the user is actually waiting on.
    if (seq !== this._listSeq) return
    this._rows = rows ?? []
    this.queueRender()
  }

  select(record: any): void {
    this._selected = record ?? null
    // Into the form NOW, not at the next render: `crud.value` is the form's model, and a
    // caller that selects and then reads it back should not have to wait a frame.
    this.showSelected()
    const id = record ? getByPath(record, this.idPath) : undefined
    // A selection is somewhere to come BACK from, so it pushes; typing replaces.
    this._hash?.set(
      'id',
      id === undefined || id === null ? undefined : String(id),
      { push: true }
    )
    this.queueRender()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /** Start a blank record. Nothing is stored until `save()`. */
  createNew(): void {
    this._selected = {}
    this.showSelected()
    this._hash?.set('id', undefined)
    this.queueRender()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  async save(): Promise<any> {
    if (!this._store?.save || !this._selected) return
    const record = this.parts.form.value
    const saved = await this.run('save', () => this._store!.save!(record))
    // The store's answer wins: it knows the new id, the timestamp, the computed fields.
    this._selected = saved ?? record
    this.showSelected()
    await this.refresh()
    this.queueRender()
    this.dispatchEvent(new Event('change', { bubbles: true }))
    return this._selected
  }

  async remove(): Promise<void> {
    if (!this._store?.delete || !this._selected) return
    await this.run('delete', () => this._store!.delete!(this._selected))
    this._selected = null
    this._hash?.set('id', undefined)
    await this.refresh()
    this.queueRender()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  private onSearchInput = (event: Event): void => {
    const term = (event.target as HTMLInputElement).value
    this._hash?.set('q', term || undefined)
    // Debounced, because a remote store should not be queried per keystroke.
    clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(() => void this.refresh(), this.searchDelay)
  }

  private onSelectionChanged = (selected: any[]): void => {
    this.select(selected[0] ?? null)
  }

  content = () => [
    div(
      { class: 'crud-toolbar' },
      input({
        part: 'search',
        class: 'crud-search',
        type: 'search',
        placeholder: localize('search…'),
        onInput: this.onSearchInput,
      }),
      button({ part: 'newButton', class: 'crud-new' }, localize('New'))
    ),
    div(
      { class: 'crud-body' },
      tosiTable({ part: 'table', select: true }),
      div(
        { part: 'detail', class: 'crud-detail' },
        tosiSchemaForm({ part: 'form' }),
        div(
          { class: 'crud-actions' },
          button({ part: 'saveButton', class: 'crud-save' }, localize('Save')),
          button(
            { part: 'deleteButton', class: 'crud-delete' },
            localize('Delete')
          )
        )
      )
    ),
    div({ part: 'status', class: 'crud-status' }),
  ]

  connectedCallback(): void {
    super.connectedCallback()
    this._hash = hashState({
      namespace: this.hashNamespace,
      mode: this.hashMode as HashStateMode,
    })
    // The back button changes the hash without going through us.
    this._stopHash = this._hash.observe(() => this.queueRender())

    this.parts.table.selectionChanged = this.onSelectionChanged
    this.parts.newButton.onclick = () => this.createNew()
    this.parts.saveButton.onclick = () => void this.save()
    this.parts.deleteButton.onclick = () => void this.remove()
    this.parts.form.addEventListener('change', () => this.queueRender())
    this.parts.search.value = this.search

    void this.refresh()
  }

  disconnectedCallback(): void {
    clearTimeout(this._searchTimer)
    this._stopHash?.()
    this._hash?.stop()
    super.disconnectedCallback()
  }

  /*
  Reconnect the selection from the hash.

  This is what makes a link to a record work, and what makes the back button walk back out of
  one. It runs whenever the rows change too, so a record that was not in the list yet gets
  picked up once it is.
  */
  /** Put the selected record into the form. Idempotent, so render can call it too. */
  private showSelected(): void {
    if (!this.hydrated) return
    this.parts.detail.hidden = !this._selected
    if (this._selected && this.parts.form.value !== this._selected) {
      this.parts.form.value = this._selected
    }
  }

  private syncSelectionFromHash(): void {
    const id = this._hash?.get('id')
    if (id === undefined) return
    const current =
      this._selected && String(getByPath(this._selected, this.idPath))
    if (current === id) return
    const match = this._rows.find(
      (row) => String(getByPath(row, this.idPath)) === id
    )
    if (match) this._selected = match
  }

  render(): void {
    super.render()
    this.syncSelectionFromHash()

    if (this._schema) {
      this.parts.form.schema = this._schema
      // Set columns once: replacing them on every render would throw away a consumer's own
      // column widths and hidden/pinned state along with them.
      if (!this.parts.table.columns?.length) {
        this.parts.table.columns = columnsFromSchema(this._schema)
      }
    }
    this.parts.table.array = this._rows

    const selected = this._selected
    this.showSelected()

    const canSave = Boolean(this._store?.save)
    const canDelete = Boolean(this._store?.delete)
    this.parts.saveButton.hidden = !canSave
    // No `delete` on the store means no button — a disabled one advertises an affordance
    // that does not exist.
    this.parts.deleteButton.hidden = !canDelete
    this.parts.newButton.hidden = !canSave
    this.parts.form.readOnly = !canSave
    this.parts.saveButton.disabled = this._pending > 0
    this.parts.deleteButton.disabled =
      this._pending > 0 || getByPath(selected ?? {}, this.idPath) === undefined

    this.parts.status.classList.toggle('-error', Boolean(this._error))
    this.parts.status.textContent = this._error
      ? this._error
      : this._pending > 0
      ? localize('loading…')
      : localize('{count} records', { count: this._rows.length })
  }
}

export const tosiCrud = TosiCrud.elementCreator() as ElementCreator<TosiCrud>
