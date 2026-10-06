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

```js
import { tosiCrud } from 'tosijs-ui'

const crud = tosiCrud({
  store: { async list() { return [{ id: 1, name: 'Ada', role: 'admin' }] } },
})
preview.append(crud)

// `.table` and `.form` are the real elements — once the component has hydrated.
await new Promise((r) => requestAnimationFrame(r))
crud.table.columns = [
  { prop: 'name', width: 200 },
  { prop: 'role', width: 100 },
]
crud.form.readOnly = true
```
```test
const crud = await waitFor('tosi-crud')
await crud.whenIdle()

test('the composed parts are reachable, and the wrapper does not undo you', async () => {
  expect(crud.table.columns.map((c) => c.prop)).toEqual(['name', 'role'])
  // `readOnly` used to be reassigned on every queued render, so this reverted a frame later
  // — the second line of a two-line example, silently undone.
  crud.form.readOnly = true
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => requestAnimationFrame(r))
  expect(crud.form.readOnly).toBe(true)
})
```

Before it hydrates, `.table` and `.form` are `null` rather than throwing — so a guard reads
as a guard:

It is a convenience, never the only way to reach them. Compose the three yourself when your
layout wants something else — that is a supported thing to do, not a fallback.

## Schema: give one, or let it infer

With a `schema`, the form renders it and the table takes its columns **from the schema** —
which is better than the table's own inference, because that reads `Object.keys(array[0])` and
so loses the column for any property the first row happens not to have.

Without one, the form infers a schema from the record it edits (see
[schema-form](/schema-form/)) and the table falls back to inferring its own columns. That
works **provided a validator is registered** — inference is its `inferSchema`, not a lazy
import (the seam replaced that). With no validator and no schema the table still lists rows
from its own inference while the form has nothing to render, which is the most confusing
combination there is, so give a schema when you have one.

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
