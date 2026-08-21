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

## What it renders today

Scalars and enums: `string` (with `format` picking the input type), `number`, `integer`,
`boolean`, `enum`, and `const`. **Nested objects, arrays and unions are not supported yet** —
a property using one is shown as a disabled placeholder saying so, rather than being silently
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
import { Component as WebComponent, elements } from 'tosijs';
import { fieldsFor, getByPath, setByPath, collectErrors, errorFor, } from './schema-form/fields.js';
const { div, label, input, select, option, span, form: formElement } = elements;
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
        // Validation is optional and lazily resolved; re-render once it is known either way.
        void loadValidator().then(() => this.queueRender());
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
            this._fields = fieldsFor(this._schema);
            this.textContent = '';
            this.append(formElement({ class: 'schema-form', onSubmit: (e) => e.preventDefault() }, ...this._fields.map((f) => this.buildField(f))));
            this._builtFor = this._schema;
        }
        for (const el of this.querySelectorAll('input, select')) {
            ;
            el.disabled = this.readOnly;
        }
        this.syncValues();
        this.refreshErrors();
        this.syncErrors();
    }
}
export const tosiSchemaForm = TosiSchemaForm.elementCreator();
