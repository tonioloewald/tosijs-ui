/*#
# schema-form

<!--{ "parent": "Components" }-->

A form generated from a [JSON Schema](https://json-schema.org/), with validation.

```js
import { tosiSchemaForm } from 'tosijs-ui'

const schemaForm = tosiSchemaForm({
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Full name' },
      email: { type: 'string', format: 'email' },
      age: { type: 'integer' },
      role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
      active: { type: 'boolean' },
    },
    required: ['name', 'email'],
  },
  value: { name: 'Ada', email: 'ada@example.com', role: 'admin', active: true },
})

const shown = document.createElement('pre')
schemaForm.addEventListener('change', () => {
  shown.textContent = JSON.stringify(schemaForm.value, null, 2)
})
shown.textContent = JSON.stringify(schemaForm.value, null, 2)

preview.append(schemaForm, shown)
```

## The model owns the data

`value` is the state and `change` fires when it changes — the same contract as every other
component here. The inputs are a **view** of `value`; they are never the source of truth.

That is not a stylistic preference. Reading data back out of rendered inputs, as most
schema-form libraries do, means a field your schema does not describe is **dropped on save** —
so editing one field can discard timestamps, provenance, or anything else added since the
schema was written. Here `value` is a plain object that is copied, never rebuilt:

```typescript
schemaForm.value = { name: 'Ada', _id: 'abc', updatedAt: '2020-01-01' }
// edit `name` in the UI …
schemaForm.value // → { name: 'Grace', _id: 'abc', updatedAt: '2020-01-01' }
```

Editing also never mutates the object you handed in — you get a new one, so
`diff(original, schemaForm.value)` is a usable dirty check.

## Validation

Errors come from [`tosijs-schema`](https://www.npmjs.com/package/tosijs-schema) and appear
under the field they belong to. `validate()` returns whether the current value conforms, and
`errors` is the list.

```js
import { tosiSchemaForm } from 'tosijs-ui'

const schemaForm = tosiSchemaForm({
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
    },
    required: ['name', 'email'],
  },
  value: { name: 'Ada', email: 'not-an-email' },
})

const report = document.createElement('pre')
const update = () => {
  report.textContent = schemaForm.validate()
    ? 'conforms ✅'
    : schemaForm.errors.map((e) => `${e.path || '(form)'}: ${e.message}`).join('\n')
}
schemaForm.addEventListener('change', update)
update()

preview.append(schemaForm, report)
```

`tosijs-schema` is an **optional peer**: install it to get validation. Without it the form
still renders and edits — it simply reports no errors.

## Nested objects

An object property becomes a `<details>` section, to any depth. Sections start **open** — a
form whose fields are hidden looks empty, and a user who does not know a section exists cannot
fill it in.

`required` is scoped to the object that declares it, which is what JSON Schema means: a
required `city` inside an optional `address` says *if you give an address, it needs a city*.

```js
import { tosiSchemaForm } from 'tosijs-ui'

preview.append(
  tosiSchemaForm({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: {
          type: 'object',
          title: 'Postal address',
          properties: {
            city: { type: 'string' },
            postcode: { type: 'string' },
            geo: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lon: { type: 'number' },
              },
            },
          },
          required: ['city'],
        },
      },
      required: ['name'],
    },
    value: { name: 'Ada', address: { city: 'London', geo: { lat: 51.5 } } },
  })
)
```
```test
const nestedForm = await waitFor('tosi-schema-form')

test('nested objects render as sections, with fully-qualified paths', () => {
  expect(nestedForm.querySelectorAll('details.schema-group').length).toBe(2)
  expect(nestedForm.querySelector('[data-path="address.geo.lat"]')).toBeTruthy()
  // Sections start open, or the form reads as empty.
  expect([...nestedForm.querySelectorAll('details')].every((d) => d.open)).toBe(true)
})

test('editing a nested field writes the nested path and keeps its siblings', () => {
  const lat = nestedForm.querySelector('[data-path="address.geo.lat"]')
  lat.value = '48.9'
  lat.dispatchEvent(new Event('input', { bubbles: true }))
  expect(nestedForm.value.address.geo.lat).toBe(48.9)
  expect(nestedForm.value.address.city).toBe('London')
  expect(nestedForm.value.name).toBe('Ada')
})
```

## Arrays

An array property renders its elements with add, remove and reorder controls. Items can be
scalars or objects, and objects can contain further arrays.

Editing an array **splices the model**. That is worth stating because the usual approach —
rewriting the DOM path strings of every following element — is where these components
famously corrupt data: reindexing a nested array with an unanchored pattern rewrites the
*outer* index, so moving `items[2].variants[1]` puts its data on `items[0]`. There are no
path strings here, so there is nothing to rewrite wrongly. The indices are wherever the
elements now are.

```js
import { tosiSchemaForm } from 'tosijs-ui'

preview.append(
  tosiSchemaForm({
    schema: {
      type: 'object',
      properties: {
        tags: { type: 'array', title: 'Tag', items: { type: 'string' } },
        items: {
          type: 'array',
          title: 'Line item',
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string' },
              qty: { type: 'integer' },
            },
            required: ['sku'],
          },
        },
      },
    },
    value: {
      tags: ['urgent', 'paid'],
      items: [
        { sku: 'WIDGET-1', qty: 2 },
        { sku: 'GASKET-9', qty: 5 },
      ],
    },
  })
)
```
```test
const arrayForm = await waitFor('tosi-schema-form')
const skus = () => arrayForm.value.items.map((i) => i.sku)

test('array elements render with their own paths', () => {
  expect(arrayForm.querySelector('[data-path="tags.0"]').value).toBe('urgent')
  expect(arrayForm.querySelector('[data-path="items.1.sku"]').value).toBe('GASKET-9')
})

test('add, reorder and remove all edit the model', () => {
  // One test: these steps share the form, and the live-example docs are explicit that
  // test() bodies run concurrently.
  const container = arrayForm.querySelector('[data-array="items"]')

  container.querySelector('.schema-add').click()
  expect(arrayForm.value.items.length).toBe(3)

  // Reorder the first two.
  const controls = container.querySelectorAll('.schema-item-controls')
  controls[1].querySelector('[title="move up"]').click()
  expect(skus().slice(0, 2)).toEqual(['GASKET-9', 'WIDGET-1'])

  // Remove the one we added.
  const after = arrayForm.querySelectorAll('[data-array="items"] .schema-item')
  after[2].querySelector('[title="remove"]').click()
  expect(arrayForm.value.items.length).toBe(2)
  expect(skus()).toEqual(['GASKET-9', 'WIDGET-1'])
})

test('an array edit does not disturb the rest of the form', () => {
  // Only the edited array is rebuilt. A form that rebuilt everything would throw away focus,
  // scroll and every open section elsewhere on the page.
  const tag = arrayForm.querySelector('[data-path="tags.0"]')
  arrayForm.querySelector('[data-array="items"] .schema-add').click()
  expect(arrayForm.querySelector('[data-path="tags.0"]')).toBe(tag)
  expect(arrayForm.value.tags).toEqual(['urgent', 'paid'])
})
```

## What it renders today

Scalars and enums: `string` (with `format` picking the input type), `number`, `integer`,
`boolean`, `enum`, `const`, **nested objects** and **arrays**. **Unions and tuple arrays
(`prefixItems`) are not supported yet** — a property using one is shown as a placeholder saying so, rather than being silently
omitted. A field that vanishes is indistinguishable from a schema that never mentioned it,
which is how an editor loses data without anyone noticing.

## Properties, methods, events

- `schema` — the JSON Schema. Setting it rebuilds the fields.
- `value` — the data. Setting it updates the inputs; it does **not** fire `change`.
- `readOnly` — disables the inputs.
- `errors` — `{ path, message }[]` for the current value.
- `validate()` — `true` when the value conforms.
- `change` — fires when the user edits a field.

```js
import { tosiSchemaForm } from 'tosijs-ui'

preview.append(
  tosiSchemaForm({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer' },
        active: { type: 'boolean' },
      },
      required: ['name'],
    },
    value: { name: 'Ada' },
  })
)
```
```test
const schemaForm = await waitFor('tosi-schema-form')

test('renders one control per schema property', () => {
  expect(schemaForm.querySelectorAll('[data-path]').length).toBeGreaterThan(3)
})

test('editing keeps unknown keys, fires change, and does not rebuild under the user', async () => {
  // ONE test, because these steps share the form. Splitting them made the third read the
  // second's value — the concurrency hazard the live-example docs warn about, hit while
  // writing the component that documents it. (Line comments, not a block: a `*` `/` inside
  // a doc comment closes it early — see #70.)
  schemaForm.value = { name: 'Ada', _id: 'keep-me' }
  await new Promise((r) => requestAnimationFrame(r))
  let fired = 0
  schemaForm.addEventListener('change', () => fired++)

  const input = schemaForm.querySelector('[data-path="name"]')
  input.value = 'Grace'
  input.dispatchEvent(new Event('input', { bubbles: true }))

  // The model owns the data — and a key the schema never mentioned survives the edit,
  // which is the whole reason output is not rebuilt from the inputs.
  expect(schemaForm.value.name).toBe('Grace')
  expect(schemaForm.value._id).toBe('keep-me')
  expect(fired).toBe(1)

  // Now type into it while focused. A render must NOT replace the element or clobber what
  // is being typed — the failure mode of every "the DOM is the model" schema form.
  input.focus()
  input.value = 'Ada Lovelace'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise((r) => requestAnimationFrame(r))
  expect(schemaForm.querySelector('[data-path="name"]')).toBe(input)
  expect(input.value).toBe('Ada Lovelace')
  expect(schemaForm.value.name).toBe('Ada Lovelace')
})

```
*/

/*{ "parent": "Components" }*/

import { Component as WebComponent, ElementCreator, elements } from 'tosijs'
import type { JSONSchema } from 'tosijs-schema'
import {
  fieldsFor,
  itemFields,
  insertAt,
  removeAt,
  moveItem,
  blankFor,
  getByPath,
  setByPath,
  collectErrors,
  errorFor,
  type Field,
  type Node,
  type FieldArray,
  type FieldError,
} from './schema-form/fields.js'

const {
  div,
  label,
  input,
  select,
  option,
  span,
  details,
  summary,
  button,
  form: formElement,
} = elements

/*
Validation is OPTIONAL.

`tosijs-schema` is an optional peer, so a consumer who only wants the form should not have to
install it. Resolved lazily and cached; when it is absent the form renders and edits exactly
as it otherwise would and simply reports no errors — which is a smaller failure than refusing
to render at all.
*/
let validateFn: ((v: any, s: any, onError: any) => boolean) | null | undefined
async function loadValidator(): Promise<void> {
  if (validateFn !== undefined) return
  try {
    validateFn = (await import('tosijs-schema')).validate as any
  } catch {
    validateFn = null
  }
}

export class TosiSchemaForm extends WebComponent {
  static preferredTagName = 'tosi-schema-form'

  static lightStyleSpec = {
    ':host': { display: 'block' },
    ':host .schema-form': { display: 'grid', gap: 'var(--tosi-spacing, 10px)' },
    ':host .schema-field': { display: 'grid', gap: '2px' },
    ':host .schema-field > label': { fontSize: '0.9em', opacity: '0.8' },
    ':host .schema-field.-invalid > input, :host .schema-field.-invalid > select':
      { outline: '2px solid var(--tosi-error, #c00)', outlineOffset: '-2px' },
    ':host .schema-error': {
      fontSize: '0.85em',
      color: 'var(--tosi-error, #c00)',
    },
    ':host .schema-error[hidden]': { display: 'none' },
    ':host .schema-group': {
      border: '1px solid var(--tosi-border, #0002)',
      borderRadius: 'var(--tosi-border-radius, 4px)',
      padding: 'var(--tosi-spacing-50, 5px)',
    },
    ':host .schema-group[open]': {
      display: 'grid',
      gap: 'var(--tosi-spacing, 10px)',
    },
    ':host .schema-group > summary': { cursor: 'pointer', opacity: '0.8' },
    ':host .schema-item': {
      display: 'grid',
      gap: 'var(--tosi-spacing-50, 5px)',
      gridTemplateColumns: '1fr auto',
      alignItems: 'end',
      borderTop: '1px solid var(--tosi-border, #0001)',
      paddingTop: 'var(--tosi-spacing-50, 5px)',
    },
    ':host .schema-item-controls': { display: 'flex', gap: '2px' },
    ':host .schema-add': { justifySelf: 'start' },
    ':host .schema-unsupported': {
      fontSize: '0.85em',
      opacity: '0.7',
      fontStyle: 'italic',
    },
  }

  static initAttributes = {
    readOnly: false,
  }

  private _schema: JSONSchema = {} as JSONSchema
  private _value: any = {}
  private _nodes: Node[] = []
  private _fields: Field[] = []
  /** The schema the current DOM was built for — see `render`. */
  private _builtFor: JSONSchema | null = null
  private _errors: FieldError[] = []

  get schema(): JSONSchema {
    return this._schema
  }

  set schema(schema: JSONSchema) {
    this._schema = schema ?? ({} as JSONSchema)
    this.queueRender()
  }

  get value(): any {
    return this._value
  }

  /** Setting `value` updates the inputs. It does NOT fire `change` — that is for edits. */
  set value(value: any) {
    this._value = value ?? {}
    this.queueRender()
  }

  /** `{ path, message }[]` for the current value, or `[]` with no validator installed. */
  get errors(): FieldError[] {
    return this._errors
  }

  /** Does the current value conform? `true` when no validator is installed. */
  validate(): boolean {
    this.refreshErrors()
    return this._errors.length === 0
  }

  private refreshErrors(): void {
    if (!validateFn) {
      this._errors = []
      return
    }
    const paths = this._fields.map((f) => f.path)
    this._errors = collectErrors(
      (onError) => validateFn!(this._value, this._schema, onError),
      paths
    )
  }

  /*
  Coerce a control's string back to what the schema asked for.

  An empty numeric field becomes `undefined` rather than `0` or `NaN`: "the user cleared it"
  and "the user typed zero" are different states, and conflating them writes a value nobody
  entered.
  */
  private coerce(field: Field, raw: string, checked: boolean): unknown {
    switch (field.kind) {
      case 'boolean':
        return checked
      case 'number':
        return raw === '' ? undefined : Number(raw)
      case 'integer':
        return raw === '' ? undefined : parseInt(raw, 10)
      case 'enum': {
        // The DOM only holds strings; recover the schema's own value by identity.
        const hit = field.options?.find((o) => String(o.value) === raw)
        return hit ? hit.value : raw
      }
      default:
        return raw
    }
  }

  private onFieldInput = (event: Event): void => {
    const el = event.target as HTMLInputElement | HTMLSelectElement
    const path = el.dataset?.path
    if (!path) return
    const field = this._fields.find((f) => f.path === path)
    if (!field) return
    this._value = setByPath(
      this._value,
      path,
      this.coerce(field, el.value, (el as HTMLInputElement).checked)
    )
    this.refreshErrors()
    this.syncErrors()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /*
  A nested object renders as an OPEN `<details>`.

  Open by default: a form whose fields are hidden behind closed sections looks empty, and a
  user who does not know a section exists cannot fill it in. Collapsing is something the user
  decides once a part is done — it is not a sensible initial state for an editor.
  */
  private buildNode(node: Node): HTMLElement {
    if (node.kind === 'array') return this.buildArray(node)
    if ('children' in node) {
      return details(
        { class: 'schema-group', open: true },
        summary(node.label),
        ...node.children.map((child) => this.buildNode(child))
      )
    }
    return this.buildField(node)
  }

  /*
  An array renders as its current elements plus an Add button.

  Add / remove / move edit the MODEL and then rebuild only THIS array's container — not the
  whole form. Rebuilding everything would throw away focus, scroll and every open `<details>`
  elsewhere on the page, which is the failure this component exists to avoid; the array's own
  items genuinely did change, so rebuilding those is honest.
  */
  private buildArray(node: FieldArray): HTMLElement {
    const container = details(
      { class: 'schema-group schema-array', open: true },
      summary(node.label)
    )
    container.dataset.array = node.path
    this.fillArray(container, node)
    return container
  }

  private fillArray(container: HTMLElement, node: FieldArray): void {
    const list = (getByPath(this._value, node.path) as unknown[]) ?? []
    // Keep the summary; replace the items.
    while (container.children.length > 1) container.lastElementChild!.remove()
    list.forEach((_item, index) => {
      const row = div({ class: 'schema-item' })
      const fields = itemFields(node.itemSchema, node.path, index)
      row.append(...fields.map((f) => this.buildNode(f)))
      row.append(
        div(
          { class: 'schema-item-controls' },
          button(
            {
              type: 'button',
              title: 'move up',
              disabled: index === 0,
              onClick: () => this.moveArrayItem(node, index, index - 1),
            },
            '↑'
          ),
          button(
            {
              type: 'button',
              title: 'move down',
              disabled: index === list.length - 1,
              onClick: () => this.moveArrayItem(node, index, index + 1),
            },
            '↓'
          ),
          button(
            {
              type: 'button',
              title: 'remove',
              onClick: () => this.removeArrayItem(node, index),
            },
            '✕'
          )
        )
      )
      container.append(row)
    })
    container.append(
      button(
        {
          type: 'button',
          class: 'schema-add',
          onClick: () => this.addArrayItem(node),
        },
        `Add ${node.label}`
      )
    )
    for (const el of container.querySelectorAll('input, select, button')) {
      ;(el as HTMLInputElement).disabled =
        this.readOnly || (el as HTMLInputElement).disabled
    }
  }

  private afterArrayEdit(node: FieldArray): void {
    this._fields = this.allFields()
    const container = this.querySelector(
      `[data-array="${CSS.escape(node.path)}"]`
    ) as HTMLElement | null
    if (container) this.fillArray(container, node)
    this.syncValues()
    this.refreshErrors()
    this.syncErrors()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  private addArrayItem(node: FieldArray): void {
    const list = (getByPath(this._value, node.path) as unknown[]) ?? []
    this._value = insertAt(
      this._value,
      node.path,
      list.length,
      blankFor(node.itemSchema)
    )
    this.afterArrayEdit(node)
  }

  private removeArrayItem(node: FieldArray, index: number): void {
    this._value = removeAt(this._value, node.path, index)
    this.afterArrayEdit(node)
  }

  private moveArrayItem(node: FieldArray, from: number, to: number): void {
    this._value = moveItem(this._value, node.path, from, to)
    this.afterArrayEdit(node)
  }

  /*
  Every leaf currently on screen, arrays expanded against the CURRENT value.

  Recomputed after any array edit because the field set genuinely changed — which is exactly
  why `leafFields` refuses to guess at array leaves from the schema alone.
  */
  private allFields(): Field[] {
    const expand = (nodes: Node[]): Field[] =>
      nodes.flatMap((node) => {
        if (node.kind === 'array') {
          const list = (getByPath(this._value, node.path) as unknown[]) ?? []
          return list.flatMap((_x, i) =>
            expand(itemFields(node.itemSchema, node.path, i))
          )
        }
        if ('children' in node) return expand(node.children)
        return [node]
      })
    return expand(this._nodes)
  }

  private buildField(field: Field): HTMLElement {
    if (field.kind === 'unsupported') {
      return div(
        { class: 'schema-field' },
        label(field.label),
        span({ class: 'schema-unsupported' }, `${field.reason}`)
      )
    }
    // `dataset` is set imperatively, not through the element creator: passing
    // `{ dataset: {...} }` makes tosijs assign to `element.dataset`, which is readonly, and
    // the resulting "Attempted to assign to readonly property" aborts the whole render with
    // no clue which prop caused it.
    const shared: any = { onInput: this.onFieldInput }
    const control =
      field.kind === 'enum'
        ? select(
            shared,
            ...(field.required ? [] : [option({ value: '' }, '—')]),
            ...(field.options ?? []).map((o) =>
              option({ value: String(o.value) }, o.label)
            )
          )
        : field.kind === 'boolean'
        ? input({ ...shared, type: 'checkbox', onChange: this.onFieldInput })
        : input({
            ...shared,
            type:
              field.kind === 'number' || field.kind === 'integer'
                ? 'number'
                : field.inputType ?? 'text',
            ...(field.kind === 'integer' ? { step: 1 } : {}),
            ...(field.required ? { required: true } : {}),
            ...(field.kind === 'const' ? { readonly: true } : {}),
          })
    control.dataset.path = field.path
    const wrapper = div(
      { class: 'schema-field' },
      label(field.label),
      control,
      span({ class: 'schema-error', hidden: true })
    )
    wrapper.dataset.field = field.path
    return wrapper
  }

  /*
  Put the current value into the controls — WITHOUT touching the one being typed in.

  Skipping the focused element is the whole point. A form that writes every value on every
  render moves the caret to the end mid-word, and one that rebuilds the tree destroys focus
  outright. Both are what "the DOM is the model" designs do by construction, and both are the
  class of bug this project has spent real time removing from `<tosi-table>`.
  */
  private syncValues(): void {
    for (const field of this._fields) {
      const el = this.querySelector(
        `[data-path="${CSS.escape(field.path)}"]`
      ) as HTMLInputElement | HTMLSelectElement | null
      if (!el || el === document.activeElement) continue
      const current = getByPath(this._value, field.path)
      if (field.kind === 'boolean') {
        ;(el as HTMLInputElement).checked = current === true
        continue
      }
      const next =
        current === undefined || current === null ? '' : String(current)
      if (el.value !== next) el.value = next
    }
  }

  private syncErrors(): void {
    for (const field of this._fields) {
      const wrapper = this.querySelector(
        `[data-field="${CSS.escape(field.path)}"]`
      )
      if (!wrapper) continue
      const message = errorFor(this._errors, field.path)
      const slot = wrapper.querySelector('.schema-error') as HTMLElement | null
      wrapper.classList.toggle('-invalid', Boolean(message))
      if (slot) {
        slot.textContent = message ?? ''
        slot.hidden = !message
      }
    }
  }

  content = null

  connectedCallback(): void {
    super.connectedCallback()
    // Validation is optional and lazily resolved; re-render once it is known either way.
    void loadValidator().then(() => this.queueRender())
  }

  /*
  Rebuild ONLY when the schema changed.

  A value change syncs the existing controls instead. That distinction is the difference
  between a form you can type in and one that fights you — and it is why `value` is the
  model rather than a seed for the DOM.
  */
  render(): void {
    super.render()
    if (this._builtFor !== this._schema) {
      this._nodes = fieldsFor(this._schema)
      // Leaves are what carry values and errors; groups are structure only.
      this._fields = this.allFields()
      this.textContent = ''
      this.append(
        formElement(
          { class: 'schema-form', onSubmit: (e: Event) => e.preventDefault() },
          ...this._nodes.map((n) => this.buildNode(n))
        )
      )
      this._builtFor = this._schema
    }
    for (const el of this.querySelectorAll('input, select')) {
      ;(el as HTMLInputElement).disabled = this.readOnly
    }
    this.syncValues()
    this.refreshErrors()
    this.syncErrors()
  }
}

export const tosiSchemaForm =
  TosiSchemaForm.elementCreator() as ElementCreator<TosiSchemaForm>
