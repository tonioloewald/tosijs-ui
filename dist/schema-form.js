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

## Unions

`anyOf` and `oneOf` describe several shapes a value may take, and most of them are not
"pick a variant" at all. Each is rendered as what it actually is:

| the union | what you get |
| --- | --- |
| `[X, {type: 'null'}]` | just an X, not required — this is what an optional field looks like |
| all branches `const` | a `<select>`; a branch `title` is its label |
| all branches objects | a variant picker plus the fields of the matching branch |
| anything else | a placeholder naming the shapes, e.g. *a union of string \| object* |

A variant union finds its **discriminator** — the property every branch pins to a different
`const` — and uses it both to tell which branch the value matches and to label the choices.
An OpenAPI-style `discriminator: {propertyName}` is honoured when present, but plain JSON
Schema needs no extra ceremony. The discriminator is **not** rendered as a field of its own:
the picker is that control, and two controls for one value is an invitation to set them
differently.

Switching branch writes the new branch's `const` marks and **deletes nothing** — switch back
and your data is still there. `filter()` is what strips a value to a schema; a form is an
editor.

```js
import { tosiSchemaForm } from 'tosijs-ui'

const unionForm = tosiSchemaForm({
  schema: {
    type: 'object',
    properties: {
      nickname: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      notify: {
        title: 'Notify',
        anyOf: [
          { const: 'all', title: 'Everything' },
          { const: 'mentions', title: 'Mentions only' },
          { const: 'none', title: 'Nothing' },
        ],
      },
      shape: {
        anyOf: [
          {
            type: 'object',
            title: 'Circle',
            properties: { kind: { const: 'circle' }, r: { type: 'number' } },
            required: ['kind', 'r'],
          },
          {
            type: 'object',
            title: 'Rectangle',
            properties: {
              kind: { const: 'rect' },
              w: { type: 'number' },
              h: { type: 'number' },
            },
            required: ['kind', 'w', 'h'],
          },
        ],
      },
    },
    required: ['nickname'],
  },
  value: { notify: 'mentions', shape: { kind: 'circle', r: 3 } },
})

const shown = document.createElement('pre')
const show = () => {
  shown.textContent = JSON.stringify(unionForm.value, null, 2)
}
unionForm.addEventListener('change', show)
show()

preview.append(unionForm, shown)
```
```test
const unionForm = await waitFor('tosi-schema-form')
const picker = unionForm.querySelector('[data-union="shape"] .schema-variant')

test('unions render as what they actually are', async () => {
  // ONE test: every step below shares this form, and test() bodies run concurrently.

  // A nullable union is just the field — and `required` in the schema does not make an
  // empty value invalid when null is a branch.
  expect(unionForm.querySelector('[data-path="nickname"]').type).toBe('text')

  // An all-const union is a select, labelled by branch titles.
  const notify = unionForm.querySelector('[data-path="notify"]')
  expect(notify.tagName).toBe('SELECT')
  // `notify` is not required, so the first option is the empty one — an optional field has
  // to offer a way back to "not set".
  expect([...notify.options].map((o) => o.textContent)).toEqual([
    '—',
    'Everything',
    'Mentions only',
    'Nothing',
  ])
  expect(notify.value).toBe('mentions')

  // The variant picker shows the matching branch's fields — and NOT the discriminator,
  // which the picker itself is.
  expect(picker.value).toBe('0')
  expect(unionForm.querySelector('[data-path="shape.r"]').value).toBe('3')
  expect(unionForm.querySelector('[data-path="shape.kind"]')).toBe(null)

  // Switching branch swaps the fields, writes the new mark, and keeps the old data.
  picker.value = '1'
  picker.dispatchEvent(new Event('change', { bubbles: true }))
  expect(unionForm.value.shape.kind).toBe('rect')
  expect(unionForm.value.shape.r).toBe(3)
  expect(unionForm.querySelector('[data-path="shape.w"]')).toBeTruthy()
  expect(unionForm.querySelector('[data-path="shape.r"]')).toBe(null)

  // Setting `value` to a different variant re-renders the branch, without a schema change.
  unionForm.value = { shape: { kind: 'circle', r: 9 } }
  await new Promise((r) => requestAnimationFrame(r))
  expect(picker.value).toBe('0')
  expect(unionForm.querySelector('[data-path="shape.r"]').value).toBe('9')

  // Through all of that the picker itself was never replaced — switching variant with the
  // keyboard must not take focus off the control you are operating.
  expect(unionForm.querySelector('[data-union="shape"] .schema-variant')).toBe(
    picker
  )
})
```

### `oneOf` is rendered, but it is not validated

`tosijs-schema` enforces `anyOf` and **silently ignores `oneOf`** — `validate` returns `true`
for a value no branch accepts ([#8](https://github.com/tonioloewald/tosijs-schema/issues/8)).
Since `oneOf` is how nearly every real schema spells a variant union, refusing it would refuse
most schemas; instead the field says so, because a green form over an unchecked value is worse
than an honest note. The same note appears for any other keyword the validator ignores, such
as `exclusiveMinimum`.

```js
import { tosiSchemaForm } from 'tosijs-ui'

preview.append(
  tosiSchemaForm({
    schema: {
      type: 'object',
      properties: {
        shape: {
          oneOf: [
            {
              type: 'object',
              title: 'Circle',
              properties: { kind: { const: 'circle' }, r: { type: 'number' } },
            },
            {
              type: 'object',
              title: 'Square',
              properties: { kind: { const: 'square' }, side: { type: 'number' } },
            },
          ],
        },
      },
    },
    value: { shape: { kind: 'square', side: 2 } },
  })
)
```
```test
const oneOfForm = await waitFor('tosi-schema-form')

test('a oneOf union renders, and says it is not validated', () => {
  expect(oneOfForm.querySelector('[data-path="shape.side"]').value).toBe('2')
  expect(oneOfForm.querySelector('.schema-unvalidated').textContent).toBe(
    'oneOf is not validated'
  )
})
```

## Format plugins

`registerFieldPlugin(format, plugin)` claims a schema `format` and renders it yourself. The
plugin owns the **control**; the form still owns the label and the error slot, so a plugin
does not have to re-implement either and cannot drift from the rest of the form.

```typescript
registerFieldPlugin('percent', {
  // build the control element
  render({ value, set, elements }) { return elements.div() },
  // put a value back into it
  sync(element, value) {},
  // injected into its own stylesheet when the plugin registers
  styles: { '.my-widget': { display: 'flex' } },
})
```

`sync` is **required**. A control that cannot take a value back is not compatible with a form
whose model owns the data, and finding that out while writing the plugin beats finding it out
when a save silently reverts. The form calls it whenever `value` changes underneath — never by
replacing your element, which would ruin a slider mid-drag.

**Register whenever you like — there is no "too late".** Styles are injected when the plugin
registers, into their own stylesheet, and any form on screen that uses the format rebuilds.
(Forms that do not use it are left alone.) The component this design learned from merged
plugin styles into its style spec *once, when the component was defined*, so a plugin
registered a moment later rendered correctly and completely unstyled — with no error. Its
workaround was a bare `import './plugin'` placed above the component definition: load-bearing,
invisible, and unavailable to anyone registering from application code.

```js
import { tosiSchemaForm, registerFieldPlugin } from 'tosijs-ui'

const pluginForm = tosiSchemaForm({
  schema: {
    type: 'object',
    properties: {
      label: { type: 'string' },
      confidence: { type: 'number', format: 'percent', title: 'Confidence' },
    },
  },
  value: { label: 'match', confidence: 0.85 },
})
const shown = document.createElement('pre')
const show = () => {
  shown.textContent = JSON.stringify(pluginForm.value)
}
pluginForm.addEventListener('change', show)
show()
preview.append(pluginForm, shown)

// Let the form render FIRST, with no plugin for `percent` — otherwise this example would
// quietly be testing early registration, which was never the hard case.
await new Promise((r) => requestAnimationFrame(r))

// Registered AFTER the form is already on screen — which is the normal case, and works.
registerFieldPlugin('percent', {
  render({ value, set, elements: { div, input, span } }) {
    const readout = span({ class: 'percent-readout' })
    const slider = input({
      type: 'range',
      min: 0,
      max: 1,
      step: 0.01,
      onInput(event) {
        const next = Number(event.target.value)
        readout.textContent = `${Math.round(next * 100)}%`
        set(next)
      },
    })
    const control = div({ class: 'percent-control' }, slider, readout)
    slider.value = String(value ?? 0)
    readout.textContent = `${Math.round((value ?? 0) * 100)}%`
    return control
  },
  sync(element, value) {
    const slider = element.querySelector('input')
    slider.value = String(value ?? 0)
    element.querySelector('.percent-readout').textContent = `${Math.round(
      (value ?? 0) * 100
    )}%`
  },
  styles: {
    '.percent-control': { display: 'flex', gap: '8px', alignItems: 'center' },
    '.percent-readout': { minWidth: '3em', fontVariantNumeric: 'tabular-nums' },
  },
})
```
```test
const pluginForm = await waitFor('tosi-schema-form')

test('a plugin registered after the form renders takes effect, styles and all', async () => {
  await new Promise((r) => requestAnimationFrame(r))
  const control = pluginForm.querySelector('[data-plugin="confidence"]')
  expect(control.querySelector('input').type).toBe('range')
  expect(control.querySelector('.percent-readout').textContent).toBe('85%')

  // The styles went in on registration, not when the component was defined — the whole
  // point. A silently unstyled plugin is the defect this seam exists to make impossible.
  expect(getComputedStyle(control).display).toBe('flex')

  // Dragging the slider writes the MODEL, through the plugin's `set`.
  const slider = control.querySelector('input')
  slider.value = '0.4'
  slider.dispatchEvent(new Event('input', { bubbles: true }))
  expect(pluginForm.value.confidence).toBe(0.4)
  // …and the field the plugin does not own is untouched.
  expect(pluginForm.value.label).toBe('match')

  // Setting `value` syncs THROUGH the plugin rather than replacing its element.
  pluginForm.value = { label: 'match', confidence: 0.6 }
  await new Promise((r) => requestAnimationFrame(r))
  expect(pluginForm.querySelector('[data-plugin="confidence"]')).toBe(control)
  expect(control.querySelector('.percent-readout').textContent).toBe('60%')
})
```

## Read-only

`readOnly` disables the inputs and **hides** the add, remove and reorder controls rather than
grey them out. A dead row of buttons is a form advertising affordances it will not honour;
there is nothing to explain if they are not there.

## What it renders today

Scalars and enums: `string` (with `format` picking the input type), `number`, `integer`,
`boolean`, `enum`, `const`, **nested objects**, **arrays** and **unions**. **Tuple arrays
(`prefixItems`) are not supported yet** — a property using one is shown as a placeholder
saying so, rather than being silently omitted. A field that vanishes is indistinguishable from
a schema that never mentioned it, which is how an editor loses data without anyone noticing.

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
import { Component as WebComponent, elements } from 'tosijs';
import { fieldsFor, itemFields, branchFields, matchBranch, selectBranch, insertAt, removeAt, moveItem, blankFor, getByPath, setByPath, collectErrors, errorFor, } from './schema-form/fields.js';
import { unenforcedNote } from './schema-form/unenforced.js';
import { fieldPlugin, onFieldPluginsChanged, schemaUsesFormat, } from './schema-form/plugins.js';
export { registerFieldPlugin, } from './schema-form/plugins.js';
const { div, label, input, select, option, span, details, summary, button, form: formElement, } = elements;
/*
Validation is OPTIONAL.

`tosijs-schema` is an optional peer, so a consumer who only wants the form should not have to
install it. Resolved lazily and cached; when it is absent the form renders and edits exactly
as it otherwise would and simply reports no errors — which is a smaller failure than refusing
to render at all.
*/
let validateFn;
async function loadValidator() {
    if (validateFn !== undefined)
        return;
    try {
        validateFn = (await import('tosijs-schema')).validate;
    }
    catch {
        validateFn = null;
    }
}
export class TosiSchemaForm extends WebComponent {
    static preferredTagName = 'tosi-schema-form';
    static lightStyleSpec = {
        ':host': { display: 'block' },
        ':host .schema-form': { display: 'grid', gap: 'var(--tosi-spacing, 10px)' },
        ':host .schema-field': { display: 'grid', gap: '2px' },
        ':host .schema-field > label': { fontSize: '0.9em', opacity: '0.8' },
        ':host .schema-field.-invalid > input, :host .schema-field.-invalid > select': { outline: '2px solid var(--tosi-error, #c00)', outlineOffset: '-2px' },
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
        ':host .schema-item-controls[hidden], :host .schema-add[hidden]': {
            display: 'none',
        },
        ':host .schema-union': { display: 'grid', gap: '2px' },
        ':host .schema-variant-fields': {
            display: 'grid',
            gap: 'var(--tosi-spacing, 10px)',
            paddingTop: 'var(--tosi-spacing-50, 5px)',
        },
        ':host .schema-unvalidated': {
            fontSize: '0.85em',
            opacity: '0.7',
            fontStyle: 'italic',
        },
        ':host .schema-add': { justifySelf: 'start' },
        ':host .schema-unsupported': {
            fontSize: '0.85em',
            opacity: '0.7',
            fontStyle: 'italic',
        },
    };
    static initAttributes = {
        readOnly: false,
    };
    _schema = {};
    _value = {};
    _nodes = [];
    _fields = [];
    /** The schema the current DOM was built for — see `render`. */
    _builtFor = null;
    _errors = [];
    get schema() {
        return this._schema;
    }
    set schema(schema) {
        this._schema = schema ?? {};
        this.queueRender();
    }
    get value() {
        return this._value;
    }
    /** Setting `value` updates the inputs. It does NOT fire `change` — that is for edits. */
    set value(value) {
        this._value = value ?? {};
        this.queueRender();
    }
    /** `{ path, message }[]` for the current value, or `[]` with no validator installed. */
    get errors() {
        return this._errors;
    }
    /** Does the current value conform? `true` when no validator is installed. */
    validate() {
        this.refreshErrors();
        return this._errors.length === 0;
    }
    refreshErrors() {
        if (!validateFn) {
            this._errors = [];
            return;
        }
        const paths = this._fields.map((f) => f.path);
        this._errors = collectErrors((onError) => validateFn(this._value, this._schema, onError), paths);
    }
    /*
    Coerce a control's string back to what the schema asked for.
  
    An empty numeric field becomes `undefined` rather than `0` or `NaN`: "the user cleared it"
    and "the user typed zero" are different states, and conflating them writes a value nobody
    entered.
    */
    coerce(field, raw, checked) {
        switch (field.kind) {
            case 'boolean':
                return checked;
            case 'number':
                return raw === '' ? undefined : Number(raw);
            case 'integer':
                return raw === '' ? undefined : parseInt(raw, 10);
            case 'enum': {
                // The DOM only holds strings; recover the schema's own value by identity.
                const hit = field.options?.find((o) => String(o.value) === raw);
                return hit ? hit.value : raw;
            }
            default:
                return raw;
        }
    }
    onFieldInput = (event) => {
        const el = event.target;
        const path = el.dataset?.path;
        if (!path)
            return;
        const field = this._fields.find((f) => f.path === path);
        if (!field)
            return;
        this._value = setByPath(this._value, path, this.coerce(field, el.value, el.checked));
        this.refreshErrors();
        this.syncErrors();
        this.dispatchEvent(new Event('change', { bubbles: true }));
    };
    /*
    A nested object renders as an OPEN `<details>`.
  
    Open by default: a form whose fields are hidden behind closed sections looks empty, and a
    user who does not know a section exists cannot fill it in. Collapsing is something the user
    decides once a part is done — it is not a sensible initial state for an editor.
    */
    buildNode(node) {
        /*
        A plugin is tried FIRST, and for every kind of node — a registered `format` claims the
        property whatever shape it is, so a plugin can render something the form has no control
        for at all (its own `unsupported` placeholder is the fallback, not the ceiling).
        */
        const plugin = fieldPlugin(node.schema?.format);
        if (plugin)
            return this.buildPluginField(node, plugin);
        if (node.kind === 'array')
            return this.buildArray(node);
        if (node.kind === 'union')
            return this.buildUnion(node);
        if ('children' in node) {
            return details({ class: 'schema-group', open: true }, summary(node.label), ...node.children.map((child) => this.buildNode(child)));
        }
        return this.buildField(node);
    }
    /*
    An array renders as its current elements plus an Add button.
  
    Add / remove / move edit the MODEL and then rebuild only THIS array's container — not the
    whole form. Rebuilding everything would throw away focus, scroll and every open `<details>`
    elsewhere on the page, which is the failure this component exists to avoid; the array's own
    items genuinely did change, so rebuilding those is honest.
    */
    buildArray(node) {
        const container = details({ class: 'schema-group schema-array', open: true }, summary(node.label));
        container.dataset.array = node.path;
        this.fillArray(container, node);
        return container;
    }
    fillArray(container, node) {
        const list = getByPath(this._value, node.path) ?? [];
        // Keep the summary; replace the items.
        while (container.children.length > 1)
            container.lastElementChild.remove();
        list.forEach((_item, index) => {
            const row = div({ class: 'schema-item' });
            const fields = itemFields(node.itemSchema, node.path, index);
            row.append(...fields.map((f) => this.buildNode(f)));
            row.append(div({ class: 'schema-item-controls' }, button({
                type: 'button',
                title: 'move up',
                disabled: index === 0,
                onClick: () => this.moveArrayItem(node, index, index - 1),
            }, '↑'), button({
                type: 'button',
                title: 'move down',
                disabled: index === list.length - 1,
                onClick: () => this.moveArrayItem(node, index, index + 1),
            }, '↓'), button({
                type: 'button',
                title: 'remove',
                onClick: () => this.removeArrayItem(node, index),
            }, '✕')));
            container.append(row);
        });
        container.append(button({
            type: 'button',
            class: 'schema-add',
            onClick: () => this.addArrayItem(node),
        }, `Add ${node.label}`));
    }
    /*
    A variant union renders as a picker plus the fields of the branch it currently matches.
  
    The picker is the discriminator — that field is deliberately not rendered a second time
    underneath, because two controls for one value is an invitation to set them differently.
    */
    buildUnion(node) {
        const picker = select({
            class: 'schema-variant',
            onChange: (event) => this.onVariantChange(node, event),
        }, 
        /*
        A hidden empty option, so a value matching NO branch shows as "—" rather than silently
        claiming to be the first variant. Hidden rather than absent because the picker element
        is reused: adding and removing an option would change the control under the user, and
        "no variant" is not something they can choose — only something the data can be.
        */
        option({ value: '', hidden: true }, '—'), ...node.branches.map((branch, i) => option({ value: String(i) }, branch.label)));
        const container = div({ class: 'schema-field schema-union' }, label(node.label), picker, ...(node.unvalidated?.length
            ? [
                span({ class: 'schema-unvalidated' }, unenforcedNote(node.unvalidated)),
            ]
            : []), div({ class: 'schema-variant-fields' }));
        container.dataset.union = node.path;
        this.fillUnion(container, node);
        return container;
    }
    /*
    Only the branch's FIELDS are rebuilt — the picker itself is left alone.
  
    Replacing it would take focus off the control the user just operated, which is the exact
    failure this component exists to avoid; changing variant with the keyboard would drop you
    back to the top of the form on every keystroke.
    */
    fillUnion(container, node) {
        const index = matchBranch(node.branches, getByPath(this._value, node.path));
        const picker = container.querySelector('.schema-variant');
        const next = index === -1 ? '' : String(index);
        if (picker && picker.value !== next)
            picker.value = next;
        const body = container.querySelector('.schema-variant-fields');
        body.replaceChildren(...branchFields(node, this._value).map((child) => this.buildNode(child)));
        container.dataset.branch = String(index);
    }
    onVariantChange(node, event) {
        const index = Number(event.target.value);
        if (!Number.isInteger(index))
            return;
        this._value = selectBranch(this._value, node, index);
        const container = this.querySelector(`[data-union="${CSS.escape(node.path)}"]`);
        if (container)
            this.fillUnion(container, node);
        this.afterStructuralEdit();
    }
    /*
    Re-fill any union whose value no longer matches the branch on screen.
  
    This is what makes `form.value = {...}` work for variants: the schema did not change, so
    the form is not rebuilt, but the fields a union shows are a function of the VALUE. Unions
    nested inside a re-filled union are handled by the outer refill and then simply agree.
    */
    syncVariants() {
        for (const node of this.expanded()) {
            if (node.kind !== 'union')
                continue;
            const container = this.querySelector(`[data-union="${CSS.escape(node.path)}"]`);
            if (!container)
                continue;
            const index = matchBranch(node.branches, getByPath(this._value, node.path));
            if (container.dataset.branch !== String(index))
                this.fillUnion(container, node);
        }
    }
    /** The shared tail of every edit that changes WHICH fields exist. */
    afterStructuralEdit() {
        this._fields = this.allFields();
        this.applyReadOnly();
        this.syncValues();
        this.syncPlugins();
        this.refreshErrors();
        this.syncErrors();
        this.dispatchEvent(new Event('change', { bubbles: true }));
    }
    afterArrayEdit(node) {
        const container = this.querySelector(`[data-array="${CSS.escape(node.path)}"]`);
        if (container)
            this.fillArray(container, node);
        this.afterStructuralEdit();
    }
    addArrayItem(node) {
        const list = getByPath(this._value, node.path) ?? [];
        this._value = insertAt(this._value, node.path, list.length, blankFor(node.itemSchema));
        this.afterArrayEdit(node);
    }
    removeArrayItem(node, index) {
        this._value = removeAt(this._value, node.path, index);
        this.afterArrayEdit(node);
    }
    moveArrayItem(node, from, to) {
        this._value = moveItem(this._value, node.path, from, to);
        this.afterArrayEdit(node);
    }
    /*
    Everything currently on screen — leaves and unions — with arrays expanded to the elements
    the CURRENT value has and unions to the branch it currently matches.
  
    Recomputed after any structural edit because the field set genuinely changed, which is
    exactly why `leafFields` refuses to guess at array or union leaves from the schema alone.
    */
    expanded() {
        const expand = (nodes) => nodes.flatMap((node) => {
            // A plugin-claimed node is a LEAF whatever its shape — the plugin renders it whole,
            // so the form must not also expand its children into fields nobody rendered.
            if (fieldPlugin(node.schema?.format))
                return [node];
            if (node.kind === 'union')
                return [node, ...expand(branchFields(node, this._value))];
            if (node.kind === 'array') {
                const list = getByPath(this._value, node.path) ?? [];
                return list.flatMap((_x, i) => expand(itemFields(node.itemSchema, node.path, i)));
            }
            if ('children' in node)
                return expand(node.children);
            return [node];
        });
        return expand(this._nodes);
    }
    /** Every leaf that carries a value — the union pickers are structure, not data. */
    allFields() {
        return this.expanded().filter((node) => node.kind !== 'union' && !fieldPlugin(node.schema?.format));
    }
    /** The plugin-rendered fields, which sync through the plugin rather than the DOM. */
    pluginFields() {
        return this.expanded().flatMap((node) => {
            const plugin = fieldPlugin(node.schema?.format);
            return plugin ? [{ node, plugin }] : [];
        });
    }
    /*
    Read-only DISABLES the inputs and HIDES the structural controls.
  
    Hiding rather than disabling is deliberate: a greyed-out "Add" and a row of dead ↑ ↓ ✕
    buttons is a form telling the user about affordances it will not honour. There is nothing
    to explain if they are not there. (The component this design learned from disabled them —
    its SF-5.) Whole-form and idempotent, so it can run after any partial refill.
    */
    applyReadOnly() {
        for (const el of this.querySelectorAll('input, select')) {
            ;
            el.disabled = this.readOnly;
        }
        for (const el of this.querySelectorAll('.schema-item-controls, .schema-add')) {
            ;
            el.hidden = this.readOnly;
        }
    }
    /*
    A plugin owns the CONTROL; the form still owns the label and the error slot.
  
    That split is deliberate. A plugin that had to render its own label and error would have to
    re-implement them to match, and every plugin would drift a little — and the error is the
    form's knowledge, not the plugin's.
    */
    buildPluginField(node, plugin) {
        const control = plugin.render({
            schema: node.schema,
            path: node.path,
            label: node.label,
            required: node.required,
            value: getByPath(this._value, node.path),
            set: (value) => {
                this._value = setByPath(this._value, node.path, value);
                this.refreshErrors();
                this.syncErrors();
                this.dispatchEvent(new Event('change', { bubbles: true }));
            },
            elements,
        });
        control.dataset.plugin = node.path;
        const wrapper = div({ class: 'schema-field' }, label(node.label), control, span({ class: 'schema-error', hidden: true }));
        wrapper.dataset.field = node.path;
        return wrapper;
    }
    buildField(field) {
        if (field.kind === 'unsupported') {
            return div({ class: 'schema-field' }, label(field.label), span({ class: 'schema-unsupported' }, `${field.reason}`));
        }
        // `dataset` is set imperatively, not through the element creator: passing
        // `{ dataset: {...} }` makes tosijs assign to `element.dataset`, which is readonly, and
        // the resulting "Attempted to assign to readonly property" aborts the whole render with
        // no clue which prop caused it.
        const shared = { onInput: this.onFieldInput };
        const control = field.kind === 'enum'
            ? select(shared, ...(field.required ? [] : [option({ value: '' }, '—')]), ...(field.options ?? []).map((o) => option({ value: String(o.value) }, o.label)))
            : field.kind === 'boolean'
                ? input({ ...shared, type: 'checkbox', onChange: this.onFieldInput })
                : input({
                    ...shared,
                    type: field.kind === 'number' || field.kind === 'integer'
                        ? 'number'
                        : field.inputType ?? 'text',
                    ...(field.kind === 'integer' ? { step: 1 } : {}),
                    ...(field.required ? { required: true } : {}),
                    ...(field.kind === 'const' ? { readonly: true } : {}),
                });
        control.dataset.path = field.path;
        const wrapper = div({ class: 'schema-field' }, label(field.label), control, span({ class: 'schema-error', hidden: true }));
        wrapper.dataset.field = field.path;
        return wrapper;
    }
    /*
    Put the current value into the controls — WITHOUT touching the one being typed in.
  
    Skipping the focused element is the whole point. A form that writes every value on every
    render moves the caret to the end mid-word, and one that rebuilds the tree destroys focus
    outright. Both are what "the DOM is the model" designs do by construction, and both are the
    class of bug this project has spent real time removing from `<tosi-table>`.
    */
    syncValues() {
        for (const field of this._fields) {
            const el = this.querySelector(`[data-path="${CSS.escape(field.path)}"]`);
            if (!el || el === document.activeElement)
                continue;
            const current = getByPath(this._value, field.path);
            if (field.kind === 'boolean') {
                ;
                el.checked = current === true;
                continue;
            }
            const next = current === undefined || current === null ? '' : String(current);
            if (el.value !== next)
                el.value = next;
        }
    }
    /*
    Plugin controls take their value through the plugin's own `sync`, never by having their
    element replaced — the form has no idea what is inside one, and a slider being dragged is
    exactly the thing a rebuild would ruin.
    */
    syncPlugins() {
        for (const { node, plugin } of this.pluginFields()) {
            const el = this.querySelector(`[data-plugin="${CSS.escape(node.path)}"]`);
            if (!el || el.contains(document.activeElement))
                continue;
            plugin.sync(el, getByPath(this._value, node.path));
        }
    }
    syncErrors() {
        for (const field of this._fields) {
            const wrapper = this.querySelector(`[data-field="${CSS.escape(field.path)}"]`);
            if (!wrapper)
                continue;
            const message = errorFor(this._errors, field.path);
            const slot = wrapper.querySelector('.schema-error');
            wrapper.classList.toggle('-invalid', Boolean(message));
            if (slot) {
                slot.textContent = message ?? '';
                slot.hidden = !message;
            }
        }
    }
    content = null;
    connectedCallback() {
        super.connectedCallback();
        live.add(this);
        // Validation is optional and lazily resolved; re-render once it is known either way.
        void loadValidator().then(() => this.queueRender());
    }
    disconnectedCallback() {
        live.delete(this);
        super.disconnectedCallback();
    }
    /** Throw away the DOM and build it again — a schema change, or a new plugin. */
    rebuild() {
        this._builtFor = null;
        this.queueRender();
    }
    /*
    Rebuild ONLY when the schema changed.
  
    A value change syncs the existing controls instead. That distinction is the difference
    between a form you can type in and one that fights you — and it is why `value` is the
    model rather than a seed for the DOM.
    */
    render() {
        super.render();
        if (this._builtFor !== this._schema) {
            this._nodes = fieldsFor(this._schema);
            this.textContent = '';
            this.append(formElement({ class: 'schema-form', onSubmit: (e) => e.preventDefault() }, ...this._nodes.map((n) => this.buildNode(n))));
            this._builtFor = this._schema;
        }
        this.syncVariants();
        this._fields = this.allFields();
        this.applyReadOnly();
        this.syncValues();
        this.syncPlugins();
        this.refreshErrors();
        this.syncErrors();
    }
}
/*
Forms currently on screen, so registering a plugin can reach them.

Without this, a plugin registered from application code — after the page has rendered, which
is the normal case — would take effect only on the NEXT form. That asymmetry is what made the
component this design learned from need a load-bearing bare import above its component
definition (its SF-4), and it is a trap because everything looks fine until it doesn't.
*/
const live = new Set();
onFieldPluginsChanged((format) => {
    // Only the forms that actually use the format — a registration is not an excuse to throw
    // away the DOM of every unrelated form on the page.
    for (const form of live) {
        if (schemaUsesFormat(form.schema, format))
            form.rebuild();
    }
});
export const tosiSchemaForm = TosiSchemaForm.elementCreator();
