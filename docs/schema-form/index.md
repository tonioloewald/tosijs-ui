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

### Give it a validator

The form does not import a validation library. It asks for two functions, and you supply
them once, anywhere before or after the form renders:

```typescript
import { setSchemaValidator } from 'tosijs-ui'
import { validate, inferSchema, unenforcedKeywords } from 'tosijs-schema' // ^1.8.0

setSchemaValidator({ validate, inferSchema, unenforcedKeywords })
```

Pass **all three**. `unenforcedKeywords` is what lets the form ask the validator *"which
keywords do you not check?"* — omit it and the form falls back to a built-in list frozen at
tosijs-schema 1.7.0, so every `oneOf` and `exclusiveMinimum` field is labelled "not validated"
while the validator is checking it. The note exists to stop the form lying; the two-argument
recipe makes it the thing lying.

**Already done for you** in the CDN `<script>` build and in a `tosijs-ui/site` doc site —
those are bundles we build, so they register it themselves. Only an ESM consumer writes the
line.

Without a validator **and with a `schema`**, the form still renders and edits; it simply
reports no errors, warns once in the console, and `validationAvailable` reads `false` — so a
Save handler can tell *"this conforms"* from *"nobody checked"*, which `validate() === true`
alone cannot.

Without a validator **and without a `schema`** there is nothing to infer fields from, so the
form has none. It says that on screen rather than rendering an empty box, and the console
warning names *that* problem rather than the validation one — a message about error reporting
is the wrong thing to read while looking at a blank form.

Why a seam rather than an import: a bare `import('tosijs-schema')` in shipped code is either
resolved by your bundler — which **fails the build** for anyone who did not install it,
including people using only `<tosi-table>` — or left external, which cannot resolve in a
browser and kills validation for everyone. There is no third option, so the component asks
for the functions instead of the package. The upside is that they are just functions: an Ajv
wrapper, a house validator or a test stub all work. `tosijs-schema` is the one we ship docs
for, not a requirement.

## Non-conforming data

The form is an **editor, not a gate**. Give it a value that violates its schema and it renders
that value, validates on load, and marks the offending fields. It does not coerce the data,
strip it, refuse it, or stop you saving it.

Enforcement is yours, deliberately. The form has no validator of its own, so a save gate built
in here would pass silently for every consumer who never registered one — a gate that opens
when nothing checked is worse than no gate, because it reads as enforcement. `validate()` and
`validationAvailable` are the seam instead, and they are three lines in your save handler:

```typescript
if (form.validationAvailable && !form.validate()) {
  // your call: refuse, warn, save a draft
}
```

**Known limitation, tracked as
[#162](https://github.com/tonioloewald/tosijs-ui/issues/162).** In three cases the offending
value is kept in `value` but cannot be seen on screen:

- **A value the typed control cannot hold shows as empty.** `age: "abc"` against
  `{ type: 'integer' }` renders an empty `number` input, because the browser discards a value
  it cannot parse; an enum value not in the list leaves the `select` blank. `value.age` is
  still `"abc"` — but the field looks unset, and typing into it overwrites something you were
  never shown.
- **A union value matching no branch renders no fields** for that subtree. It survives in
  `value` and is uneditable.
- **An error whose path has no rendered field is invisible** — an extra property, or an error
  against the object as a whole. It is in `errors`, so `validate()` returns `false` over a form
  that looks clean.

The fix being built for the first two is a panel listing what could not be displayed, with the
option to purge it. Until then, treat `errors` as the authority on what is wrong and the fields
as a partial view of it.

## No schema? It infers one

Give it a `value` and no `schema` and it derives one with `inferSchema` from
the registered validator's `inferSchema` — useful for editing a record whose shape you don't
have written down. With no validator there is nothing to infer from, and the form says so
rather than rendering an empty box.

```js
import { tosiSchemaForm } from 'tosijs-ui'

const inferred = tosiSchemaForm({
  value: {
    title: 'Dorothea',
    pages: 812,
    inPrint: true,
    author: { surname: 'Eliot' },
  },
})
const shown = document.createElement('pre')
const show = () => {
  shown.textContent = JSON.stringify(inferred.schema, null, 2)
}
inferred.addEventListener('change', show)
show()
preview.append(inferred, shown)
```
```test
const inferred = await waitFor('tosi-schema-form')

test('a schema is derived from the value, and it is the one you can read back', async () => {
  // Inference needs a registered validator that can do it. On this doc site the iife
  // registers one, so the fields arrive on a render rather than after a module load — there
  // is no lazy import any more, the seam replaced it.
  const pages = await waitFor('[data-path="pages"]', 5000)

  // Types come from the data: a whole number is an integer, a nested object is a section.
  expect(pages.type).toBe('number')
  expect(inferred.querySelector('[data-path="inPrint"]').type).toBe('checkbox')
  expect(inferred.querySelector('[data-path="author.surname"]')).toBeTruthy()

  // `$inferred` marks it as OBSERVED rather than authored, and nothing is required —
  // one sample is evidence of what was there, not of what must be.
  expect(inferred.schema.$inferred).toBe(true)
  expect(inferred.schema.required).toBeUndefined()

  // Inference happens ONCE. Editing must not re-derive the schema and rebuild the form
  // out from under whoever is typing.
  const built = inferred.schema
  pages.value = '900'
  pages.dispatchEvent(new Event('input', { bubbles: true }))
  expect(inferred.value.pages).toBe(900)
  expect(inferred.schema).toBe(built)
})
```

An inferred schema describes **the sample you gave it** — nothing more. It carries
`$inferred: true` so you can tell it from one you wrote, it is open
(`additionalProperties: true`) so `filter()` cannot strip a key that happened to be absent,
and it has **no `required`**: asserting that a field is mandatory because one example filled
it in is exactly the guess that makes inferred schemas reject valid future data.

It is inferred **once**, so typing never rebuilds the form. Read it back from `.schema`, edit
it, and set it again if you want something different — that round trip is the point.

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
  controls[1].querySelector('.schema-move-up').click()
  expect(skus().slice(0, 2)).toEqual(['GASKET-9', 'WIDGET-1'])

  // Remove the one we added.
  const after = arrayForm.querySelectorAll('[data-array="items"] .schema-item')
  after[2].querySelector('.schema-remove').click()
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

### When a keyword is not validated, the field says so

A validator enforces a subset of JSON Schema, and the parts outside it are the dangerous ones:
not an error, not a warning — a value the schema forbids, accepted, with `ok === true`. So any
field whose schema uses a keyword the **registered validator** does not check carries a note
saying which.

The form asks the validator itself, whenever it can answer (`unenforcedKeywords`, which
`tosijs-schema` exports from 1.8.0 — it was ask 3 of
[#8](https://github.com/tonioloewald/tosijs-schema/issues/8), filed from here). Only a
validator that cannot answer falls back to a local list, because the validator in use is the
only thing that actually knows.

That distinction is not academic: `tosijs-schema` **used to ignore `oneOf`** — `validate`
returned `true` for a value no branch accepted — and 1.8.0 enforces it. A hard-coded list
would now be claiming "oneOf is not validated" over a field being checked, which is the note
lying in the component whose whole point is that it does not.

> **Prefer `anyOf` for a discriminated union.** 1.8.0 validates `oneOf` by trying every branch
> with no short-circuit, where `anyOf` stops at the first match. Same result, more work.

```js
import { tosiSchemaForm } from 'tosijs-ui'

preview.append(
  tosiSchemaForm({
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', exclusiveMinimum: 0 },
        tags: { type: 'array', items: { type: 'string' }, uniqueItems: true },
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
    value: { score: 0, tags: ['a', 'a'], shape: { kind: 'square', side: 2 } },
  })
)
```
```test
const oneOfForm = await waitFor('tosi-schema-form')

test('the note tracks the VALIDATOR, not a hard-coded list', () => {
  expect(oneOfForm.querySelector('[data-path="shape.side"]').value).toBe('2')

  const notes = [...oneOfForm.querySelectorAll('.schema-unvalidated')].map(
    (n) => n.textContent
  )
  // Against tosijs-schema >= 1.8.0 both `oneOf` and `exclusiveMinimum` ARE enforced, so
  // there is nothing to warn about and `score: 0` is correctly rejected. Under 1.7.0 this
  // same form rendered two notes and reported the value as conforming — the assertion that
  // matters is that the notes agree with the validator in use, whichever it is.
  // (Line comments: a block comment's `*` `/` closes the doc block early — see #70.)
  // `uniqueItems` is on an ARRAY and is still not enforced by 1.8.0, so its note is the one
  // that must appear — containers carried none until 1.11.0, which made the promise above
  // false for exactly the keywords a validator is most likely to skip.
  expect(notes).toEqual(['uniqueItems is not validated'])
  expect(oneOfForm.validate()).toBe(false)
  expect(oneOfForm.errors.some((e) => e.path === 'score')).toBe(true)
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
  // The rebuild is queued for a frame, and under load one rAF is not reliably that frame —
  // poll instead of racing it.
  const control = await waitFor('[data-plugin="confidence"]')
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

## Styling

Three custom properties, each with a fallback so the component works unstyled:

| variable | default | what it colours |
| --- | --- | --- |
| `--tosi-error` | `#c00` | the invalid-field outline and the error text |
| `--tosi-border` | `#0002` | the border around a `<details>` section |
| `--tosi-border-radius` | `4px` | that section's corners |

Spacing comes from the theme's `--tosi-spacing` / `--tosi-spacing-sm`, so a form matches
whatever scale the rest of your page is on.

## Localization

The form's own chrome — the *Add …* button and the reorder tooltips — goes through
[`localize`](/localize/), and the form **rebuilds when the locale changes**, so switching
language does not leave one form behind in the old one.

The add button's key is the whole sentence, `Add {item}`, with the item name interpolated
afterwards. Building it as `'Add ' + label` would leave a translator with a dangling fragment
and no way to move the placeholder to where their language puts it.

Labels that come from your **schema** are not localized — a `title` is your string, and a
humanised property name is a data name rather than a UI string. Localize them in the schema if
you need to.

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
