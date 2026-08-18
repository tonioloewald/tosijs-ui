# `<schema-form>` — JSON Schema-driven form component

> **Note on naming.** There is no `schema-editor` component in
> `dev/shared-ui-server/src/shared-ui/custom-elements`. The component that
> generates an editing UI from a schema is **`schema-form`**, and that is what this
> document describes.

Everything below was read out of the source on 2026-08-18 (branch
`7817-improvements-to-dev-tooling`). Nothing in `dev/shared-ui-server/` was modified.

**Known defects: [`schema-form-bugs.md`](./schema-form-bugs.md)** — ten findings
(`SF-1` … `SF-10`), summarised in [§12](#12-caveats-and-sharp-edges). Two are
data-integrity issues worth reading before you build anything new on this component:
`SF-1` (nested-array reindexing corrupts the parent index) and `SF-2` (`getData()`
drops fields the schema doesn't describe).

---

## 1. What it is

`schema-form` takes a JSON Schema and a data object and renders a native HTML form
for it — nested objects as collapsible `<details>` sections, arrays with add/remove
controls, enums as `<select>`, `anyOf`/`oneOf` as a variant picker, plus a plugin
hook for custom widgets keyed on the schema's `format` field.

Two things make it unusual compared to most schema-form libraries:

- **The DOM is the source of truth for output.** Data goes _in_ as a property, but
  it comes _out_ by scraping the rendered inputs (`getData()`), not by maintaining a
  parallel model. There is no tosi proxy binding and no two-way data flow.
- **It renders into the light DOM.** `render()` clears `this` and appends a plain
  `<form>`; styling comes from a document-level stylesheet, not a shadow root.

## 2. File map

| File                                              | Lines | Role                                                                                                                                                                                                 |
| ------------------------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `custom-elements/schema-form.ts`                  |   134 | Public entry point. Doc block (the `/*# … */` comment that drives the doc site), re-exports, registers the built-in threshold plugin, and calls `makeComponent('schema-form', schemaFormBlueprint)`. |
| `custom-elements/schema-form-blueprint.ts`        |  1335 | The whole implementation: JSON Schema types, the plugin registry, the field renderers, the `SchemaForm` class, and `styleSpec`.                                                                      |
| `custom-elements/schema-form-plugin-threshold.ts` |   147 | The one built-in format plugin (`format: 'threshold'`): a 0–1 slider with a "Disabled" toggle. Self-registers on import.                                                                             |
| `custom-elements/schema-form-examples.ts`         |   913 | Sample schemas + sample data (contact, blog post, order, content builder, threshold). **Currently imported by nothing** — see §12.                                                                   |

Supporting, not part of the component:

- `public/doc-data/schema-form-examples.json` — what the doc-site live examples
  actually `fetch()`. Same five example keys as the `.ts` file above.
- `src/shared-ui/generated/customer.schema.json` — the generated customer schema fed
  to `schema-form` by the admin customer-config page.
- `custom-elements/customer-schema.json` — a 32 KB stray with **no importers**.

Mirrors: `schema-form*.ts` are rsynced verbatim into `app/src/shared-ui/custom-elements/`
and `admin/src/shared-ui/custom-elements/`. Per `CLAUDE.md`, only edit the
`dev/shared-ui-server/` copy.

## 3. Public API

```ts
import { schemaForm, type JSONSchema } from "shared-ui"; // or './schema-form'

const { creator } = await schemaForm; // makeComponent returns a Promise
const form = creator();
form.schema = mySchema;
form.data = myData;
container.append(form);
```

### Properties

All three are plain getter/setter pairs backed by private fields — **not**
`initAttributes`. So they are settable as _properties_ only (no attribute support,
no attribute-driven re-render), and each setter calls `queueRender()`.

| Property   | Type         | Notes                                                                                                                                             |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`   | `JSONSchema` | The schema to render. Setting it re-renders from scratch.                                                                                         |
| `data`     | `any`        | Initial/current values. Setting it re-renders from scratch.                                                                                       |
| `readOnly` | `boolean`    | After building the form, disables every `input`, `select`, `textarea` **and `button`** inside it — which also kills the array add/remove buttons. |

### Method

- **`getData(): any`** — scrapes the rendered `<form>` and returns a freshly built
  object. Falls back to the `data` property if no form has rendered yet. This is the
  only way to read edits back out.

### Events

| Event           | Fired when                        | `detail`                   | Bubbles |
| --------------- | --------------------------------- | -------------------------- | ------- |
| `schema-input`  | any `input` event inside the form | `{ data: this.getData() }` | yes     |
| `schema-submit` | form submit (default prevented)   | `{ data: this.getData() }` | yes     |
| `schema-change` | an array item is added or removed | _(none)_                   | yes     |

**Sharp edge:** array add/remove fires only `schema-change`, and it carries no
`detail`. A consumer listening only for `schema-input` will not see structural array
edits. Listen for both.

## 4. Render pipeline

`render()` (in `SchemaForm`, blueprint line ~1066):

1. `this.textContent = ''` — full teardown. Every render rebuilds the entire tree;
   there is no targeted-update path.
2. If the schema has neither `type` nor `properties`, render "No schema provided" and
   stop.
3. If the schema has `properties`, map each entry through `renderField(key, propSchema, data[key], key, isRequired)`.
   Otherwise render a **single** field at path `data` — meaning `getData()` will
   return `{ data: … }` for a non-object root schema.
4. Wrap the fields in a `<form class="schema-form">` with `onInput` / `onSubmit`
   handlers, apply `readOnly` if set, append to `this`.

`renderField` dispatches in this fixed order — the first match wins:

1. **Format plugin** — `schema.format` is a registered plugin key.
2. **Union** — `anyOf` or `oneOf` present (see §6).
3. **`const`** — hidden input carrying the value + a read-only display span.
4. **`enum`** — `<select>` with a leading `-- Select --` option.
5. **By `type`** (first entry if `type` is an array):
   - `string` → `renderStringField` (format→input-type map: `email`, `uri`/`url`,
     `date-time`, `date`, `time`, `password`; anything else `text`). Becomes a
     4-row `<textarea>` when `maxLength > 200`. Applies `minLength` / `maxLength` /
     `pattern` and email/url placeholders.
   - `number` / `integer` → paired range slider + number box when
     `format: 'range'` **or** both `minimum` and `maximum` are set (the two inputs
     mirror each other, and the number box clamps to the bounds); otherwise a plain
     `<input type="number">`.
   - `boolean` → checkbox inside its label.
   - `object` → `renderObjectField`.
   - `array` → `renderArrayField`.
6. **Fallback** — plain text input.

Labels come from `getLabel()`: `schema.title` if present, otherwise the property key
de-camel-cased and de-underscored — either way passed through `localize()`.
Descriptions render as a `.description` div, also localized.

**Sections open only when invalid.** `renderObjectField`, `renderArrayField` and the
union renderer all emit `<details open: !isSectionValid(schema, value)>`, so a
section whose required fields are already satisfied starts collapsed and one that
needs attention starts expanded. `isSectionValid` is used _only_ for this — it is not
a validation gate.

## 5. Data flow and the DOM contract

Output is reconstructed by `collectFormData()`, which selects:

```
input[data-path]:not([data-union]),
select[data-path]:not([data-union]),
textarea[data-path]:not([data-union])
```

So the contract every renderer (including plugins) must honour is:

- **`data-path`** — the dotted/bracketed path into the result object, e.g.
  `customer.address.city`, `items[2].sku`. `setValueByPath` normalises `[n]` to
  `.n` and creates intermediate arrays vs objects based on whether the next segment
  is numeric.
- **`data-type`** — drives coercion: `number` → `Number()`, `integer` →
  `parseInt`, `boolean` → `value === 'true'`, absent → raw string. Checkboxes are
  special-cased to `.checked` regardless of `data-type`. An empty numeric field
  yields `undefined` (the key is still set).
- **`data-union="true"`** — marks a control as **UI-only**, excluded from collection.
  Only the union variant `<select>` carries it.

`inferDataType()` fills in `data-type` for enum/const selects whose values are not
strings, by inspecting the value list (all booleans → `boolean`, all integers →
`integer`, all numbers → `number`, otherwise omitted).

Field `id`s come from a module-global monotonic counter: `` `${path}-${++idCounter}` ``.

Consequences worth internalising:

- Properties present in `data` but absent from `schema.properties` are **dropped** by
  `getData()`. `additionalProperties` is in the type definition but not implemented.
- Switching a union variant does not mutate `data`; it swaps the DOM, and the next
  `getData()` reflects the new shape.
- Validation is whatever the browser does with `required` / `pattern` /
  `minLength` / `min` / `max`. There is no schema validation pass. Consumers that
  care call `form.querySelector('form').reportValidity()` themselves — which is
  exactly what `filtered-table.saveDetail()` does.

## 6. Union types (`anyOf` / `oneOf`)

Two shapes, decided by `variants.every(v => v.const !== undefined)`:

- **All-const union** → collapses to a single `<select>`, identical in spirit to an
  `enum`. `data-type` inferred from the const values.
- **Mixed union** → a `<details class="schema-union">` containing a variant
  `<select class="schema-union-selector" data-union="true">` and a
  `.schema-union-content` div. Changing the selector wipes the content div and
  re-renders it from the new variant, seeded with `getDefaultValue(newVariant)`.
  If the chosen variant is an object with `properties`, its properties are rendered
  inline at `path.propKey`; otherwise the variant is rendered as one field at `path`.

`detectVariant(value, variants)` picks the initial variant in two passes: exact
`const` match first, then type match — with objects additionally matched by a
discriminating `const` property or by having all of the variant's keys present.
Defaults to index 0.

`getVariantLabel()` tries, in order: `title`, `const`, `type`, a `type`/`kind`/`_type`
property with a `const`, then `Option N`.

Note: `JSONSchema.discriminator` is declared in the type but **never read** by the
implementation.

## 7. Arrays

`renderArrayField` builds a `.schema-array-items` container, one
`.schema-array-item` per element (each with an absolutely-positioned remove button
using `icons.x()`), and an add control:

- **Uniform items** → a single "Add Item" button.
- **Union items** (`items.anyOf` / `items.oneOf`) → a variant `<select>` plus an
  "Add" button, so you choose the block type before adding. Existing items get their
  variant detected via `detectVariant`.

Add respects `maxItems` (silently no-ops at the cap). `minItems` / `maxItems` are
displayed as a `.array-constraints` hint but not enforced beyond that. Both add and
remove call `reindexArrayItems()` and then dispatch `schema-change`.

`reindexArrayItems(container)` walks `:scope > .schema-array-item`, rewrites
`data-index`, and rewrites every descendant's `data-path` (and `name`, if present).

## 8. The format plugin system

```ts
export interface FormatPlugin {
  render: (ctx: FormatPluginContext) => HTMLElement;
  styles?: Record<string, Record<string, string>>;
}
registerFormatPlugin("threshold", thresholdPlugin);
```

`FormatPluginContext` hands the plugin `{ key, schema, value, path, required,
fieldId, fieldLabel, elements }`, where `elements` is a narrowed set
(`div, label, input, select, option, span, button`). The plugin returns one element
and owns everything inside it — including emitting a `data-path`/`data-type` carrier
so `collectFormData` can see the value.

**Registration timing matters, and it splits in two:**

- `render` is looked up **at render time** (`formatPlugins.has(schema.format)`), so a
  plugin registered late still renders.
- `styles` are merged into `styleSpec` **when the blueprint function runs**, i.e. at
  the `makeComponent` call in `schema-form.ts`. A plugin registered after that point
  gets its `render` used but its `styles` silently ignored.

This is why `schema-form.ts` does a bare `import './schema-form-plugin-threshold'`
above the `makeComponent` call — ES import evaluation guarantees the plugin is in the
registry before the blueprint's style merge runs.

### The threshold plugin, as a worked example

Models a confidence threshold where `1.1` is the sentinel for "disabled":

- A **hidden input** carries the real value (`data-path`, `data-type="number"`) —
  this is the only element `collectFormData` sees.
- A **range input** (0–1, step 0.01) plus a `.schema-threshold-value` span for the
  numeric readout.
- A **checkbox** that writes the `1.1` sentinel, disables the slider, and hides the
  readout.
- A closure-held `lastSliderVal` restores the previous value when re-enabled, so
  toggling Disabled off doesn't lose where the user was.

Default when the schema has no usable `default`: `0.85`.

## 9. Styling

The blueprint returns `styleSpec`, which in current tosijs is the **deprecated alias
for `lightStyleSpec`** (`TosiComponentSpec` in `make-component.d.ts`) — a
document-level stylesheet with `:host` resolved to the tag name. That is what makes
light-DOM rendering work: the `.schema-field`, `.schema-object`, `.schema-array`
rules reach the appended form because they are not trapped in a shadow root.

Theming is via `varDefault` on `:host`, so a host page can override any of:

| Variable            | Default                                              |
| ------------------- | ---------------------------------------------------- |
| `--sf-spacing`      | `8px` (plus the derived `sfSpacing25/50/75/200/250`) |
| `--sf-color`        | `#222`                                               |
| `--sf-background`   | `#fcfcfc`                                            |
| `--sf-font-size`    | `16px` (plus `sfFontSize85`)                         |
| `--sf-font-family`  | `system-ui, sans-serif`                              |
| `--sf-brand-color`  | `#0066cc`                                            |
| `--sf-error-color`  | `#cc0000`                                            |
| `--sf-border-color` | `#ccc`                                               |

Required-field markers are a `.required` span (`*`) tinted with `--sf-error-color`;
union sections are outlined in the brand colour to distinguish them from plain object
sections.

## 10. Consumers in this repo

- **`custom-elements/admin/customer-config-page.ts`** — renders the generated
  `customer.schema.json` against live customer data with `readOnly = true`, as a
  config _viewer_. Note its `if (!container.isConnected) return` guard after the
  `await schemaForm` — the tab can be switched away while the component promise
  resolves.
- **`custom-elements/filtered-table.ts`** — lazily imports `schema-form` (module-level
  `schemaFormCreator` cache) and uses it as the add/edit/view detail drawer. On save
  it calls `reportValidity()` on the inner native form, then `getData()`, then
  re-attaches the id key if the schema omitted it. This is the CRUD path.
- **`custom-elements/filtered-table-examples.ts`** — imports the `JSONSchema` type
  only.
- **`src/docs/tables-forms.md`** — the doc-site section page (`parent` metadata in
  `schema-form.ts` files it under "Tables & forms").

## 11. Doc-site integration

The `/*# … */` block at the top of `schema-form.ts` _is_ the documentation page; the
fenced ` ```js ` blocks in it become live examples on `https://localhost:8787`. They
`fetch('/doc-data/schema-form-examples.json')` rather than importing
`schema-form-examples.ts`, because live examples resolve imports against
`src/site-entry.ts`'s registered specifiers and the examples module is not one of
them. `tosijs-site.config.ts` serves `public/` at the web root specifically so those
JSON files are reachable.

## 12. Caveats and sharp edges

> **These are written up as a filing-ready defect report in
> [`schema-form-bugs.md`](./schema-form-bugs.md)** (ten findings, `SF-1` … `SF-10`,
> with evidence, impact and suggested fixes). The `SF-n` ids below cross-reference it.
>
> **Verification status:** `SF-1` was confirmed by executing the offending expression
> in isolation. Everything else is read from source and **not browser-verified** —
> reproduce before fixing.

### Data integrity

1. **`reindexArrayItems` rewrites the wrong bracket for nested arrays** — `SF-1`,
   **the worst one**. `currentPath.replace(/\[\d+\]/, '[' + index + ']')`
   (`schema-form-blueprint.ts:1018`) is unanchored and non-global, so it rewrites the
   _outermost_ index rather than the one that moved. Correct for a top-level array;
   for an array nested inside an array item it fails twice over:

   | Input path                                  | `index` | Result                        |
   | ------------------------------------------- | ------: | ----------------------------- |
   | `items[2].sku` (outer, 2→1)                 |       1 | `items[1].sku` ✅             |
   | `items[2].variants[1].sku` (inner, 1→0)     |       0 | `items[0].variants[1].sku` ❌ |
   | `items[2].variants[0].sku` (inner, no move) |       0 | `items[0].variants[0].sku` ❌ |

   The parent index is clobbered with the child's position, **and** the child index is
   never updated (leaving a hole in the inner array). Note row three: this corrupts on
   _every_ reindex pass of a nested container, even when nothing moved. `getData()`
   then attaches the data to the wrong parent, and via `filtered-table`'s edit drawer
   that gets persisted. The `order` example schema (`items` → `variants`) is exactly
   this shape.

2. **`getData()` silently drops every field the schema doesn't describe** — `SF-2`.
   `collectFormData` rebuilds the object purely from rendered inputs, and nothing
   merges it back over the original. `additionalProperties` is typed but unread. In
   `filtered-table.saveDetail()` the scraped object goes straight to the change
   handler with only the id key rescued — so editing one field can drop timestamps,
   provenance and anything else added since the schema was written. Blast radius is
   per-consumer and needs auditing. It also means a schema that drifts _behind_ the
   data model becomes actively destructive, not merely incomplete.

### Correctness / API

3. **`schema-change` carries no `detail` and does not fire `schema-input`** — `SF-3`.
   Array add/remove emits only the bare `schema-change`; the form's `onInput` handler
   responds to native `input` events only. A consumer wired to `schema-input` sees
   every keystroke but misses all structural array edits.

4. **Format-plugin `styles` are dropped unless the plugin is registered before
   `makeComponent`** — `SF-4`. `render` is looked up per-render, but `styles` are
   merged into `styleSpec` once, when the blueprint runs
   (`schema-form-blueprint.ts:1324-1329`). Register late and the widget renders
   correctly but completely unstyled, with no warning. This works today only because
   `schema-form.ts`'s bare `import './schema-form-plugin-threshold'` is hoisted above
   the `makeComponent` call — load-bearing ordering with nothing marking it as such.

5. **`detectVariant` requires _every_ variant key to be present** — `SF-10`, incl.
   optional ones (`schema-form-blueprint.ts:173-174`). A value that legitimately
   matches a variant but omits an optional property falls through to `return 0` and is
   silently rendered against the first variant's shape. Mostly masked by the
   const-property check above it.

6. **`additionalProperties` and `discriminator` are typed but unimplemented** —
   `SF-9`. Both are in the exported `JSONSchema` interface, so authors get
   autocomplete for keywords that do nothing. `discriminator` in particular looks like
   it should drive union selection; `detectVariant` guesses structurally instead.

### UX / i18n

7. **`readOnly` disables buttons too** — `SF-5`, so a read-only array shows dead "Add
   Item" buttons and greyed remove `✕` controls rather than hiding them. Visible today
   in the admin customer-config viewer.

8. **`Item ${index + 1}` is effectively untranslatable** — `SF-6`. The number is
   interpolated before the string reaches `localize()`, so lookups are for
   `"item 1"`, `"item 2"`, … which can never match a `localized-strings.ts` entry.
   Only hit when the item schema has no `title` and the array is not a union.

### Cleanup

9. **`schema-form-examples.ts` has no importers** — `SF-7`. The live docs read the
   hand-synced JSON copy in `public/doc-data/`. 913 lines of dead code, mirrored into
   `app/` and `admin/` on every sync, duplicating fixtures that can drift.

10. **`custom-elements/customer-schema.json` (32 KB) has no importers either** —
    `SF-8`. The admin page uses `src/shared-ui/generated/customer.schema.json`.

### Working as intended (noted so they aren't re-litigated)

- **Every property write re-renders the whole form**, discarding focus, scroll
  position, and user-toggled `<details>` state. Inherent to the DOM-is-the-model
  design.
- **`queueRender()` is rAF-based**, so a form built off-screen may not paint — the
  repo-wide caveat in `CLAUDE.md` applies here too.
- **`styleSpec` is the deprecated spelling** of `lightStyleSpec` in current tosijs.
  Harmless; rename when the file is next touched.
- **Light-DOM rendering is deliberate and load-bearing** — `getData()` does
  `this.querySelector('form')`, and the `styleSpec` rules reach the form precisely
  because there is no shadow root.

---

---

# Appendix — full source

The four files below are reproduced verbatim from
`dev/shared-ui-server/src/shared-ui/custom-elements/`. Fenced with four backticks
because `schema-form.ts` contains triple-backtick blocks in its doc comment.

## `schema-form.ts`

The public entry point: doc block, re-exports, plugin registration, makeComponent call.

_134 lines · `dev/shared-ui-server/src/shared-ui/custom-elements/schema-form.ts`_

<!-- prettier-ignore -->
````ts
/*#
# schema-form

A JSON Schema-driven form component that generates UI from a schema definition.
Supports nested objects, arrays, enums, booleans, and custom format plugins.

## Basic Usage

```js
import { schemaForm } from 'shared-ui'

const { creator } = await schemaForm
const form = creator()
form.schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full Name' },
    email: { type: 'string', title: 'Email', format: 'email' },
    age: { type: 'number', title: 'Age' },
    active: { type: 'boolean', title: 'Active' }
  },
  required: ['name', 'email']
}
form.data = { name: 'Jane Doe', email: 'jane@example.com', age: 30, active: true }
preview.append(form)
```

## Contact Form

A real-world contact form with enums, validation, and sample data fetched from a static file.

```js
import { schemaForm } from 'shared-ui'

const examples = await fetch('/doc-data/schema-form-examples.json').then(r => r.json())
const { schema, data } = examples.contact

const { creator } = await schemaForm
const form = creator()
form.schema = schema
form.data = data
preview.append(form)
```

## Blog Post (Nested Objects + Arrays)

Demonstrates nested objects (author), arrays (tags), enums, and booleans.

```js
import { schemaForm } from 'shared-ui'

const examples = await fetch('/doc-data/schema-form-examples.json').then(r => r.json())
const { schema, data } = examples.blogPost

const { creator } = await schemaForm
const form = creator()
form.schema = schema
form.data = data
preview.append(form)
```

## E-Commerce Order (Deep Nesting)

A complex schema with deeply nested objects, arrays of objects, enums, patterns,
and multiple levels of nesting (customer → address, items → variants).

```js
import { schemaForm } from 'shared-ui'

const examples = await fetch('/doc-data/schema-form-examples.json').then(r => r.json())
const { schema, data } = examples.order

const { creator } = await schemaForm
const form = creator()
form.schema = schema
form.data = data
preview.append(form)
```

## Content Builder (anyOf Union Types)

Shows `anyOf` for polymorphic array items — each content block can be
a Text, Image, Code, or Quote block with different fields.

```js
import { schemaForm } from 'shared-ui'

const examples = await fetch('/doc-data/schema-form-examples.json').then(r => r.json())
const { schema, data } = examples.contentBuilder

const { creator } = await schemaForm
const form = creator()
form.schema = schema
form.data = data
preview.append(form)
```

## Threshold Plugin (Custom Format)

The `format: 'threshold'` plugin renders a slider with a "Disabled" toggle.
Values range from 0–1 (confidence), with 1.1 representing disabled.

```js
import { schemaForm } from 'shared-ui'

const examples = await fetch('/doc-data/schema-form-examples.json').then(r => r.json())
const { schema, data } = examples.threshold

const { creator } = await schemaForm
const form = creator()
form.schema = schema
form.data = data
preview.append(form)
```
*/
/*{"parent":"Tables & forms"}*/

import { makeComponent } from 'tosijs';
import {
  schemaFormBlueprint,
  registerFormatPlugin,
  type JSONSchema,
  type SchemaFormParts,
  type FormatPlugin,
  type FormatPluginContext
} from './schema-form-blueprint';

// Register built-in plugins (self-registering on import)
import './schema-form-plugin-threshold';

export type { JSONSchema, SchemaFormParts, FormatPlugin, FormatPluginContext };
export { schemaFormBlueprint, registerFormatPlugin };

export const schemaForm = makeComponent('schema-form', schemaFormBlueprint);
````

## `schema-form-blueprint.ts`

The implementation: types, plugin registry, field renderers, component class, styleSpec.

_1335 lines · `dev/shared-ui-server/src/shared-ui/custom-elements/schema-form-blueprint.ts`_

<!-- prettier-ignore -->
````ts
// Schema Form Blueprint

import type { XinBlueprint, XinFactory } from 'tosijs';
import { localize, icons } from 'tosijs-ui';

// JSON Schema types (subset we support)
export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: any[];
  const?: any;
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];

  // Discriminator for union types
  discriminator?: {
    propertyName: string;
    mapping?: Record<string, string>;
  };

  // Constraints
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;

  // Metadata
  title?: string;
  description?: string;
  default?: any;
  format?: string;

  // Additional
  additionalProperties?: boolean | JSONSchema;
  [key: string]: any;
}

export interface SchemaFormParts {
  form: HTMLFormElement;
}

// --- Format Plugin System ---
// Plugins render custom UI for fields with a specific `format` value.
// Register before creating the component instance.

export interface FormatPluginContext {
  key: string;
  schema: JSONSchema;
  value: any;
  path: string;
  required: boolean;
  fieldId: string;
  fieldLabel: string;
  elements: Record<string, (...args: any[]) => HTMLElement>;
}

export interface FormatPlugin {
  render: (ctx: FormatPluginContext) => HTMLElement;
  styles?: Record<string, Record<string, string>>;
}

export const formatPlugins = new Map<string, FormatPlugin>();

export const registerFormatPlugin = (format: string, plugin: FormatPlugin) => {
  formatPlugins.set(format, plugin);
};

// Infer a data-type from an array of values (for selects with non-string values)
const inferDataType = (
  values: any[],
  schemaType?: string
): string | undefined => {
  if (schemaType && schemaType !== 'null') return schemaType;
  const nonNull = values.filter((v) => v !== null && v !== undefined);
  if (nonNull.length === 0) return undefined;
  if (nonNull.every((v) => typeof v === 'boolean')) return 'boolean';
  if (nonNull.every((v) => typeof v === 'number' && Number.isInteger(v)))
    return 'integer';
  if (nonNull.every((v) => typeof v === 'number')) return 'number';
  return undefined; // string is the default, no data-type needed
};

// Helper to generate unique IDs
let idCounter = 0;
const uniqueId = (prefix: string) => `${prefix}-${++idCounter}`;

// Get a human-readable label from a property name or schema
const getLabel = (key: string, schema: JSONSchema): string => {
  if (schema.title) return localize(schema.title);
  return localize(
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim()
  );
};

// Get union variants from anyOf or oneOf
const getUnionVariants = (schema: JSONSchema): JSONSchema[] | null => {
  return schema.anyOf || schema.oneOf || null;
};

// Get a label for a union variant
const getVariantLabel = (variant: JSONSchema, index: number): string => {
  if (variant.title) return localize(variant.title);
  if (variant.const !== undefined) return localize(String(variant.const));
  if (variant.type) {
    const t = Array.isArray(variant.type) ? variant.type[0] : variant.type;
    return localize(t);
  }
  if (variant.properties) {
    const keys = Object.keys(variant.properties);
    const typeKey = keys.find(
      (k) => k === 'type' || k === 'kind' || k === '_type'
    );
    if (typeKey && variant.properties[typeKey]?.const) {
      return localize(String(variant.properties[typeKey].const));
    }
  }
  return `${localize('Option')} ${index + 1}`;
};

// Detect which variant matches a value
const detectVariant = (value: any, variants: JSONSchema[]): number => {
  if (value === null || value === undefined) return 0;

  // First pass: check for exact const matches (highest priority)
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    if (variant.const !== undefined && value === variant.const) return i;
  }

  // Second pass: check type matches
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];

    // Skip const-only variants (already checked above)
    if (variant.const !== undefined && !variant.type) continue;

    const variantType = Array.isArray(variant.type)
      ? variant.type[0]
      : variant.type;
    if (variantType) {
      const valueType = typeof value;
      if (variantType === 'string' && valueType === 'string') return i;
      if (variantType === 'number' && valueType === 'number') return i;
      if (
        variantType === 'integer' &&
        valueType === 'number' &&
        Number.isInteger(value)
      )
        return i;
      if (variantType === 'boolean' && valueType === 'boolean') return i;
      if (variantType === 'array' && Array.isArray(value)) return i;
      if (
        variantType === 'object' &&
        valueType === 'object' &&
        !Array.isArray(value)
      ) {
        if (variant.properties) {
          const variantKeys = Object.keys(variant.properties);
          for (const key of variantKeys) {
            if (variant.properties[key]?.const !== undefined) {
              if (value[key] === variant.properties[key].const) return i;
            }
          }
          const matchCount = variantKeys.filter((k) => k in value).length;
          if (matchCount === variantKeys.length) return i;
        } else {
          return i;
        }
      }
    }
  }

  return 0;
};

// Get default value for a schema
const getDefaultValue = (schema: JSONSchema): any => {
  if (schema.default !== undefined) return schema.default;

  const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  switch (schemaType) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return schema.minimum ?? 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      if (schema.properties) {
        const obj: Record<string, any> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = getDefaultValue(propSchema);
        }
        return obj;
      }
      return {};
    default:
      return null;
  }
};

// Set value by path
const setValueByPath = (obj: any, path: string, value: any): void => {
  const parts = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const nextPart = parts[i + 1];
    const isNextArray = nextPart ? /^\d+$/.test(nextPart) : false;
    if (current[part] == null) {
      current[part] = isNextArray ? [] : {};
    }
    current = current[part];
  }
  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    current[lastPart] = value;
  }
};

// Collect form data from the DOM
const collectFormData = (form: HTMLFormElement, _schema: JSONSchema): any => {
  const data: any = {};

  const inputs = form.querySelectorAll(
    'input[data-path]:not([data-union]), select[data-path]:not([data-union]), textarea[data-path]:not([data-union])'
  );
  inputs.forEach((input: Element) => {
    const el = input as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    const path = el.dataset.path || '';
    const dataType = el.dataset.type;

    if (!path) return;

    let value: any;

    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      value = el.checked;
    } else if (dataType === 'number') {
      value = el.value === '' ? undefined : Number(el.value);
    } else if (dataType === 'integer') {
      value = el.value === '' ? undefined : parseInt(el.value, 10);
    } else if (dataType === 'boolean') {
      value = el.value === 'true';
    } else {
      value = el.value;
    }

    setValueByPath(data, path, value);
  });

  return data;
};

/**
 * Schema Form Blueprint
 *
 * A pure function that receives the tosijs toolkit and returns a component spec.
 * Use with makeComponent() or load dynamically via <xin-blueprint>.
 *
 * @example
 * // Direct usage
 * import { schemaFormBlueprint } from 'schema-form/blueprint'
 * import { makeComponent } from 'tosijs'
 * const schemaForm = makeComponent('schema-form', schemaFormBlueprint)
 *
 * @example
 * // Dynamic loading via HTML
 * <xin-blueprint src="schema-form/blueprint.js" tag="schema-form"></xin-blueprint>
 */
export const schemaFormBlueprint = ((
  _tag: string,
  { Component, elements, vars, varDefault }: XinFactory
) => {
  const {
    form,
    div,
    label,
    input,
    select,
    option,
    textarea,
    button,
    span,
    details,
    summary
  } = elements;

  // Check if a value satisfies a schema (all required fields present and non-empty)
  const isSectionValid = (schema: JSONSchema, value: any): boolean => {
    if (value === undefined || value === null) return false;

    const schemaType = Array.isArray(schema.type)
      ? schema.type[0]
      : schema.type;

    if (schemaType === 'object' && schema.properties) {
      const required = schema.required || [];
      return required.every((key) => {
        const propSchema = schema.properties![key];
        const propValue = value[key];
        if (propSchema) return isSectionValid(propSchema, propValue);
        return (
          propValue !== undefined && propValue !== null && propValue !== ''
        );
      });
    }

    if (schemaType === 'array') {
      const minItems = schema.minItems ?? 0;
      return Array.isArray(value) && value.length >= minItems;
    }

    if (schemaType === 'string') return value !== '';
    if (schemaType === 'number' || schemaType === 'integer')
      return typeof value === 'number';
    if (schemaType === 'boolean') return typeof value === 'boolean';

    // Union types — any non-null value is considered valid
    if (schema.oneOf || schema.anyOf)
      return value !== undefined && value !== null && value !== '';

    return value !== undefined && value !== null && value !== '';
  };

  // Render a field based on its schema
  const renderField = (
    key: string,
    schema: JSONSchema,
    value: any,
    path: string,
    required: boolean
  ): HTMLElement => {
    const fieldId = uniqueId(path);
    const fieldLabel = getLabel(key, schema);

    // Check format plugins
    if (schema.format && formatPlugins.has(schema.format)) {
      const plugin = formatPlugins.get(schema.format)!;
      return plugin.render({
        key,
        schema,
        value,
        path,
        required,
        fieldId,
        fieldLabel,
        elements: { div, label, input, select, option, span, button }
      });
    }

    // Handle anyOf/oneOf (union types)
    const variants = getUnionVariants(schema);
    if (variants) {
      const allConst = variants.every((s) => s.const !== undefined);

      if (allConst) {
        const constDataType = inferDataType(variants.map((s) => s.const));
        const selectAttrs: Record<string, any> = {
          id: fieldId,
          name: path,
          required,
          'data-path': path
        };
        if (constDataType) selectAttrs['data-type'] = constDataType;
        const selectEl = select(
          selectAttrs,
          option({ value: '' }, localize('-- Select --')),
          ...variants.map((s) =>
            option(
              { value: String(s.const) },
              localize(s.title || String(s.const))
            )
          )
        );
        if (value !== undefined && value !== null) {
          selectEl.value = String(value);
        }
        return div(
          { class: 'schema-field' },
          label(
            { for: fieldId },
            fieldLabel,
            required ? span({ class: 'required' }, ' *') : ''
          ),
          schema.description
            ? div({ class: 'description' }, localize(schema.description))
            : '',
          selectEl
        );
      }

      const currentVariantIndex = detectVariant(value, variants);
      const currentVariant = variants[currentVariantIndex];

      const variantSelector = select(
        {
          id: fieldId,
          class: 'schema-union-selector',
          'data-path': path,
          'data-union': 'true'
        },
        ...variants.map((v, i) =>
          option(
            i === currentVariantIndex
              ? { value: String(i), selected: true }
              : { value: String(i) },
            getVariantLabel(v, i)
          )
        )
      );

      const variantContent = div({
        class: 'schema-union-content',
        'data-variant': currentVariantIndex
      });

      if (currentVariant.type === 'object' && currentVariant.properties) {
        const requiredFields = currentVariant.required || [];
        Object.entries(currentVariant.properties).forEach(
          ([propKey, propSchema]) => {
            variantContent.append(
              renderField(
                propKey,
                propSchema,
                value?.[propKey],
                `${path}.${propKey}`,
                requiredFields.includes(propKey)
              )
            );
          }
        );
      } else {
        variantContent.append(
          renderField(key, currentVariant, value, path, required)
        );
      }

      variantSelector.addEventListener('change', () => {
        const newIndex = parseInt(variantSelector.value, 10);
        const newVariant = variants[newIndex];
        variantContent.textContent = '';
        variantContent.dataset.variant = String(newIndex);

        const defaultValue = getDefaultValue(newVariant);

        if (newVariant.type === 'object' && newVariant.properties) {
          const requiredFields = newVariant.required || [];
          Object.entries(newVariant.properties).forEach(
            ([propKey, propSchema]) => {
              variantContent.append(
                renderField(
                  propKey,
                  propSchema,
                  defaultValue?.[propKey],
                  `${path}.${propKey}`,
                  requiredFields.includes(propKey)
                )
              );
            }
          );
        } else {
          variantContent.append(
            renderField(key, newVariant, defaultValue, path, required)
          );
        }
      });

      const valid = isSectionValid(schema, value);
      return details(
        { class: 'schema-union', 'data-path': path, open: !valid },
        summary(fieldLabel, required ? span({ class: 'required' }, ' *') : ''),
        schema.description
          ? div({ class: 'description' }, localize(schema.description))
          : '',
        div({ class: 'schema-union-selector-container' }, variantSelector),
        variantContent
      );
    }

    // Handle const (fixed value)
    if (schema.const !== undefined) {
      const constType =
        typeof schema.const === 'number'
          ? Number.isInteger(schema.const)
            ? 'integer'
            : 'number'
          : typeof schema.const;
      return div(
        { class: 'schema-field schema-field-const' },
        label(
          { for: fieldId },
          fieldLabel,
          required ? span({ class: 'required' }, ' *') : ''
        ),
        schema.description
          ? div({ class: 'description' }, localize(schema.description))
          : '',
        input({
          type: 'hidden',
          id: fieldId,
          name: path,
          value: String(schema.const),
          'data-path': path,
          'data-type': constType,
          'data-const': 'true'
        }),
        span({ class: 'schema-const-value' }, String(schema.const))
      );
    }

    // Handle enum
    if (schema.enum) {
      const enumType = Array.isArray(schema.type)
        ? schema.type[0]
        : schema.type;
      const enumDataType = inferDataType(schema.enum, enumType);
      const enumAttrs: Record<string, any> = {
        id: fieldId,
        name: path,
        required,
        'data-path': path
      };
      if (enumDataType) enumAttrs['data-type'] = enumDataType;
      const selectEl = select(
        enumAttrs,
        option({ value: '' }, localize('-- Select --')),
        ...schema.enum.map((v) =>
          option({ value: String(v) }, localize(String(v)))
        )
      );
      if (value !== undefined && value !== null) {
        selectEl.value = String(value);
      }
      return div(
        { class: 'schema-field' },
        label(
          { for: fieldId },
          fieldLabel,
          required ? span({ class: 'required' }, ' *') : ''
        ),
        schema.description
          ? div({ class: 'description' }, localize(schema.description))
          : '',
        selectEl
      );
    }

    const schemaType = Array.isArray(schema.type)
      ? schema.type[0]
      : schema.type;

    switch (schemaType) {
      case 'string':
        return renderStringField(
          fieldId,
          fieldLabel,
          schema,
          value,
          path,
          required
        );

      case 'number':
      case 'integer':
        const hasRange =
          schema.format === 'range' ||
          (schema.minimum !== undefined && schema.maximum !== undefined);

        if (hasRange) {
          const stepVal =
            schemaType === 'integer'
              ? 1
              : (schema.maximum! - schema.minimum!) / 100;
          const currentVal = value ?? schema.default ?? schema.minimum ?? 0;

          const rangeInput = input({
            type: 'range',
            id: fieldId,
            name: path,
            min: schema.minimum,
            max: schema.maximum,
            step: schemaType === 'integer' ? 1 : stepVal,
            required,
            'data-path': path,
            'data-type': schemaType
          });
          rangeInput.value = String(currentVal);

          const numberInput = input({
            type: 'number',
            id: `${fieldId}-number`,
            min: schema.minimum,
            max: schema.maximum,
            step: schemaType === 'integer' ? 1 : 'any',
            class: 'schema-range-number',
            'aria-label': `${fieldLabel} value`
          });
          numberInput.value = String(currentVal);

          rangeInput.addEventListener('input', () => {
            numberInput.value = rangeInput.value;
          });

          numberInput.addEventListener('input', () => {
            let val = parseFloat(numberInput.value);
            if (!isNaN(val)) {
              if (schema.minimum !== undefined)
                val = Math.max(val, schema.minimum);
              if (schema.maximum !== undefined)
                val = Math.min(val, schema.maximum);
              rangeInput.value = String(val);
            }
          });

          return div(
            { class: 'schema-field schema-field-range' },
            label(
              { for: fieldId },
              fieldLabel,
              required ? span({ class: 'required' }, ' *') : ''
            ),
            schema.description
              ? div({ class: 'description' }, localize(schema.description))
              : '',
            div({ class: 'schema-range-container' }, rangeInput, numberInput)
          );
        }

        return div(
          { class: 'schema-field' },
          label(
            { for: fieldId },
            fieldLabel,
            required ? span({ class: 'required' }, ' *') : ''
          ),
          schema.description
            ? div({ class: 'description' }, localize(schema.description))
            : '',
          input({
            type: 'number',
            id: fieldId,
            name: path,
            value: value ?? schema.default ?? '',
            min: schema.minimum,
            max: schema.maximum,
            step: schemaType === 'integer' ? 1 : 'any',
            required,
            'data-path': path,
            'data-type': schemaType
          })
        );

      case 'boolean':
        return div(
          { class: 'schema-field schema-field-boolean' },
          label(
            input({
              type: 'checkbox',
              id: fieldId,
              name: path,
              checked: value ?? schema.default ?? false,
              'data-path': path,
              'data-type': 'boolean'
            }),
            ' ',
            fieldLabel,
            required ? span({ class: 'required' }, ' *') : ''
          ),
          schema.description
            ? div({ class: 'description' }, localize(schema.description))
            : ''
        );

      case 'object':
        return renderObjectField(key, schema, value || {}, path, required);

      case 'array':
        return renderArrayField(key, schema, value || [], path, required);

      default:
        return div(
          { class: 'schema-field' },
          label(
            { for: fieldId },
            fieldLabel,
            required ? span({ class: 'required' }, ' *') : ''
          ),
          schema.description
            ? div({ class: 'description' }, localize(schema.description))
            : '',
          input({
            type: 'text',
            id: fieldId,
            name: path,
            value: value ?? schema.default ?? '',
            required,
            'data-path': path
          })
        );
    }
  };

  // Render string field with format support
  const renderStringField = (
    fieldId: string,
    fieldLabel: string,
    schema: JSONSchema,
    value: any,
    path: string,
    required: boolean
  ): HTMLElement => {
    const formatToType: Record<string, string> = {
      email: 'email',
      uri: 'url',
      url: 'url',
      'date-time': 'datetime-local',
      date: 'date',
      time: 'time',
      password: 'password'
    };

    const inputType = schema.format
      ? formatToType[schema.format] || 'text'
      : 'text';
    const isTextarea = schema.maxLength && schema.maxLength > 200;

    const inputAttrs: Record<string, any> = {
      id: fieldId,
      name: path,
      value: value ?? schema.default ?? '',
      required,
      'data-path': path,
      'data-type': 'string'
    };

    if (schema.minLength) inputAttrs.minLength = schema.minLength;
    if (schema.maxLength) inputAttrs.maxLength = schema.maxLength;
    if (schema.pattern) inputAttrs.pattern = schema.pattern;
    if (schema.format === 'email')
      inputAttrs.placeholder = localize('email@example.com');
    if (schema.format === 'url' || schema.format === 'uri')
      inputAttrs.placeholder = localize('https://');

    return div(
      { class: 'schema-field' },
      label(
        { for: fieldId },
        fieldLabel,
        required ? span({ class: 'required' }, ' *') : ''
      ),
      schema.description
        ? div({ class: 'description' }, localize(schema.description))
        : '',
      isTextarea
        ? textarea({ ...inputAttrs, rows: 4 }, value ?? schema.default ?? '')
        : input({ type: inputType, ...inputAttrs })
    );
  };

  // Render nested object
  const renderObjectField = (
    key: string,
    schema: JSONSchema,
    value: Record<string, any>,
    path: string,
    required: boolean
  ): HTMLElement => {
    const fieldLabel = getLabel(key, schema);
    const requiredFields = schema.required || [];

    if (!schema.properties) {
      return div(
        { class: 'schema-field' },
        `${localize('Object without properties')}: ${key}`
      );
    }

    const valid = isSectionValid(schema, value);
    return details(
      { class: 'schema-object', 'data-path': path, open: !valid },
      summary(fieldLabel, required ? span({ class: 'required' }, ' *') : ''),
      schema.description
        ? div({ class: 'description' }, localize(schema.description))
        : '',
      ...Object.entries(schema.properties).map(([propKey, propSchema]) =>
        renderField(
          propKey,
          propSchema,
          value[propKey],
          `${path}.${propKey}`,
          requiredFields.includes(propKey)
        )
      )
    );
  };

  // Render array field
  const renderArrayField = (
    key: string,
    schema: JSONSchema,
    value: any[],
    path: string,
    required: boolean
  ): HTMLElement => {
    const fieldLabel = getLabel(key, schema);
    const itemSchema = schema.items || { type: 'string' };
    const itemVariants = getUnionVariants(itemSchema);

    const arrayContainer = div({
      class: 'schema-array-items',
      'data-path': path
    });

    value.forEach((item, index) => {
      if (itemVariants) {
        const variantIndex = detectVariant(item, itemVariants);
        arrayContainer.append(
          renderArrayItem(
            itemVariants[variantIndex],
            item,
            `${path}[${index}]`,
            index,
            variantIndex
          )
        );
      } else {
        arrayContainer.append(
          renderArrayItem(itemSchema, item, `${path}[${index}]`, index)
        );
      }
    });

    let addControls: HTMLElement;

    if (itemVariants) {
      const variantSelect = select(
        { class: 'schema-array-variant-select' },
        ...itemVariants.map((v, i) =>
          option({ value: String(i) }, getVariantLabel(v, i))
        )
      );

      const addBtn = button(
        {
          type: 'button',
          class: 'schema-array-add',
          onClick: () => {
            const currentCount = arrayContainer.querySelectorAll(
              ':scope > .schema-array-item'
            ).length;
            if (
              schema.maxItems !== undefined &&
              currentCount >= schema.maxItems
            )
              return;

            const selectedVariantIndex = parseInt(variantSelect.value, 10);
            const selectedVariant = itemVariants[selectedVariantIndex];

            const newItem = renderArrayItem(
              selectedVariant,
              getDefaultValue(selectedVariant),
              `${path}[${currentCount}]`,
              currentCount,
              selectedVariantIndex
            );
            arrayContainer.append(newItem);
            reindexArrayItems(arrayContainer);
            arrayContainer.dispatchEvent(
              new CustomEvent('schema-change', { bubbles: true })
            );
          }
        },
        icons.plus(),
        localize('Add')
      );

      addControls = div(
        { class: 'schema-array-add-controls' },
        variantSelect,
        addBtn
      );
    } else {
      addControls = button(
        {
          type: 'button',
          class: 'schema-array-add',
          'data-path': path,
          onClick: () => {
            const currentCount = arrayContainer.querySelectorAll(
              ':scope > .schema-array-item'
            ).length;
            if (
              schema.maxItems !== undefined &&
              currentCount >= schema.maxItems
            )
              return;

            const newItem = renderArrayItem(
              itemSchema,
              getDefaultValue(itemSchema),
              `${path}[${currentCount}]`,
              currentCount
            );
            arrayContainer.append(newItem);
            reindexArrayItems(arrayContainer);
            arrayContainer.dispatchEvent(
              new CustomEvent('schema-change', { bubbles: true })
            );
          }
        },
        icons.plus(),
        localize('Add Item')
      );
    }

    const valid = isSectionValid(schema, value);
    return details(
      { class: 'schema-array', 'data-path': path, open: !valid },
      summary(fieldLabel, required ? span({ class: 'required' }, ' *') : ''),
      schema.description
        ? div({ class: 'description' }, localize(schema.description))
        : '',
      arrayContainer,
      addControls,
      schema.minItems !== undefined || schema.maxItems !== undefined
        ? div(
            { class: 'array-constraints' },
            schema.minItems !== undefined
              ? `${localize('Min')}: ${schema.minItems}`
              : '',
            schema.minItems !== undefined && schema.maxItems !== undefined
              ? ' | '
              : '',
            schema.maxItems !== undefined
              ? `${localize('Max')}: ${schema.maxItems}`
              : ''
          )
        : ''
    );
  };

  // Render a single array item with remove button
  const renderArrayItem = (
    schema: JSONSchema,
    value: any,
    path: string,
    index: number,
    variantIndex?: number
  ): HTMLElement => {
    const itemLabel =
      variantIndex !== undefined
        ? getVariantLabel(schema, variantIndex)
        : `Item ${index + 1}`;

    const itemContent = renderField(itemLabel, schema, value, path, false);

    const removeButton = button(
      {
        type: 'button',
        class: 'schema-array-remove',
        'aria-label': localize('Remove item'),
        onClick: (event: Event) => {
          const btn = event.target as HTMLElement;
          const item = btn.closest('.schema-array-item') as HTMLElement;
          const container = item.parentElement as HTMLElement;
          item.remove();
          reindexArrayItems(container);
          container.dispatchEvent(
            new CustomEvent('schema-change', { bubbles: true })
          );
        }
      },
      icons.x()
    );

    const attrs: Record<string, any> = {
      class: 'schema-array-item',
      'data-index': index
    };
    if (variantIndex !== undefined) {
      attrs['data-variant'] = variantIndex;
    }

    return div(attrs, removeButton, itemContent);
  };

  // Reindex array items after add/remove
  const reindexArrayItems = (container: HTMLElement) => {
    const items = container.querySelectorAll(':scope > .schema-array-item');

    items.forEach((item, index: number) => {
      item.setAttribute('data-index', String(index));

      const pathElements = item.querySelectorAll('[data-path]');
      pathElements.forEach((el: Element) => {
        const currentPath = el.getAttribute('data-path') || '';
        const newPath = currentPath.replace(/\[\d+\]/, `[${index}]`);
        el.setAttribute('data-path', newPath);
        if (el.hasAttribute('name')) {
          el.setAttribute('name', newPath);
        }
      });
    });
  };

  // The component class
  class SchemaForm extends Component<SchemaFormParts> {
    private _schema: JSONSchema = {};
    private _data: any = {};
    private _readOnly = false;

    get schema(): JSONSchema {
      return this._schema;
    }

    set schema(s: JSONSchema) {
      this._schema = s;
      this.queueRender();
    }

    get data(): any {
      return this._data;
    }

    set data(d: any) {
      this._data = d;
      this.queueRender();
    }

    get readOnly(): boolean {
      return this._readOnly;
    }

    set readOnly(v: boolean) {
      this._readOnly = v;
      this.queueRender();
    }

    getData(): any {
      const formEl = this.querySelector('form') as HTMLFormElement;
      if (!formEl) return this.data;
      return collectFormData(formEl, this._schema);
    }

    override render(): void {
      this.textContent = '';

      if (!this._schema.type && !this._schema.properties) {
        this.append(
          div({ class: 'schema-form-empty' }, localize('No schema provided'))
        );
        return;
      }

      const rootRequired = this._schema.required || [];

      const fields = this._schema.properties
        ? Object.entries(this._schema.properties).map(([key, propSchema]) =>
            renderField(
              key,
              propSchema,
              this.data?.[key],
              key,
              rootRequired.includes(key)
            )
          )
        : [renderField('data', this._schema, this.data, 'data', false)];

      const formEl = form(
        {
          class: 'schema-form',
          onInput: () => {
            this.dispatchEvent(
              new CustomEvent('schema-input', {
                bubbles: true,
                detail: { data: this.getData() }
              })
            );
          },
          onSubmit: (event: Event) => {
            event.preventDefault();
            this.dispatchEvent(
              new CustomEvent('schema-submit', {
                bubbles: true,
                detail: { data: this.getData() }
              })
            );
          }
        },
        ...fields
      );

      if (this._readOnly) {
        formEl
          .querySelectorAll('input, select, textarea, button')
          .forEach((el: Element) => {
            (el as HTMLInputElement).disabled = true;
          });
      }

      this.append(formEl);
    }
  }

  return {
    type: SchemaForm,
    styleSpec: {
      ':host': {
        _sfSpacing: varDefault.spacing('8px'),
        _sfColor: varDefault.color('#222'),
        _sfBackground: varDefault.background('#fcfcfc'),
        _sfFontSize: varDefault.fontSize('16px'),
        _sfFontFamily: varDefault.fontFamily('system-ui, sans-serif'),
        _sfBrandColor: varDefault.brandColor('#0066cc'),
        _sfErrorColor: varDefault.errorColor('#cc0000'),
        _sfBorderColor: varDefault.borderColor('#ccc'),

        display: 'block',
        fontFamily: vars.sfFontFamily,
        fontSize: vars.sfFontSize,
        color: vars.sfColor
      },
      '.schema-field': {
        marginBottom: vars.sfSpacing
      },
      '.schema-field label': {
        display: 'block',
        marginBottom: vars.sfSpacing50,
        fontWeight: '500'
      },
      '.schema-field input, .schema-field select, .schema-field textarea': {
        width: '100%',
        borderRadius: vars.sfSpacing50,
        fontSize: 'inherit',
        fontFamily: 'inherit',
        color: 'inherit',
        background: vars.sfBackground,
        boxSizing: 'border-box'
      },
      '.schema-field input:focus, .schema-field select:focus, .schema-field textarea:focus':
        {
          outline: 'none',
          borderColor: vars.sfBrandColor,
          boxShadow: `0 0 0 2px ${vars.sfBrandColor}40`
        },
      '.schema-field-boolean label': {
        display: 'flex',
        alignItems: 'center',
        gap: vars.sfSpacing50
      },
      '.schema-field-boolean input[type="checkbox"]': {
        width: 'auto'
      },
      '.schema-range-container': {
        display: 'flex',
        alignItems: 'center',
        gap: vars.sfSpacing
      },
      '.schema-range-container input[type="range"]': {
        flex: '1',
        minWidth: '0',
        height: vars.sfSpacing,
        cursor: 'pointer'
      },
      '.schema-range-number': {
        width: '5em',
        minWidth: '5em',
        maxWidth: '5em',
        flex: '0 0 5em',
        textAlign: 'center'
      },
      '.description': {
        fontSize: vars.sfFontSize85,
        opacity: '0.7',
        marginBottom: vars.sfSpacing50
      },
      '.required': {
        color: vars.sfErrorColor
      },
      '.schema-object, .schema-array': {
        border: `1px solid ${vars.sfBorderColor}`,
        borderRadius: vars.sfSpacing50,
        padding: vars.sfSpacing,
        marginBottom: vars.sfSpacing
      },
      '.schema-object > summary, .schema-array > summary': {
        fontWeight: '600',
        cursor: 'pointer',
        padding: `${vars.sfSpacing50} 0`,
        userSelect: 'none',
        listStyle: 'revert'
      },
      '.schema-object > summary:hover, .schema-array > summary:hover': {
        color: vars.sfBrandColor
      },
      '.schema-array-items': {
        display: 'flex',
        flexDirection: 'column',
        gap: vars.sfSpacing50
      },
      '.schema-array-item': {
        position: 'relative',
        paddingRight: vars.sfSpacing250,
        paddingLeft: vars.sfSpacing50,
        borderLeft: `2px solid ${vars.sfBrandColor}`
      },
      '.schema-array-remove': {
        position: 'absolute',
        top: '0',
        right: '0',
        width: vars.sfSpacing200,
        height: vars.sfSpacing200,
        padding: '0',
        border: 'none',
        background: vars.sfErrorColor,
        color: vars.sfBackground,
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: vars.sfFontSize,
        lineHeight: '1'
      },
      '.schema-array-remove:hover': {
        opacity: '0.8'
      },
      '.schema-array-add': {
        marginTop: vars.sfSpacing50,
        padding: `${vars.sfSpacing50} ${vars.sfSpacing}`,
        border: `1px dashed ${vars.sfBrandColor}`,
        background: 'transparent',
        color: vars.sfBrandColor,
        borderRadius: vars.sfSpacing50,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'inherit'
      },
      '.schema-array-add:hover': {
        background: `${vars.sfBrandColor}10`
      },
      '.schema-array-add-controls': {
        display: 'flex',
        gap: vars.sfSpacing50,
        marginTop: vars.sfSpacing50
      },
      '.schema-array-variant-select': {
        flex: '1',
        padding: `${vars.sfSpacing50} ${vars.sfSpacing}`,
        border: `1px solid ${vars.sfBorderColor}`,
        borderRadius: vars.sfSpacing50,
        fontSize: 'inherit',
        fontFamily: 'inherit',
        background: vars.sfBackground
      },
      '.schema-union': {
        border: `1px solid ${vars.sfBrandColor}`,
        borderRadius: vars.sfSpacing50,
        padding: vars.sfSpacing,
        marginBottom: vars.sfSpacing
      },
      '.schema-union > summary': {
        fontWeight: '600',
        cursor: 'pointer',
        padding: `${vars.sfSpacing50} 0`,
        color: vars.sfBrandColor,
        userSelect: 'none',
        listStyle: 'revert'
      },
      '.schema-union > summary:hover': {
        opacity: '0.8'
      },
      '.schema-union-selector-container': {
        marginBottom: vars.sfSpacing
      },
      '.schema-union-selector': {
        width: '100%',
        padding: `${vars.sfSpacing50} ${vars.sfSpacing}`,
        border: `1px solid ${vars.sfBrandColor}`,
        borderRadius: vars.sfSpacing50,
        fontSize: 'inherit',
        fontFamily: 'inherit',
        background: vars.sfBackground,
        color: vars.sfBrandColor,
        fontWeight: '500'
      },
      '.schema-union-content': {
        paddingTop: vars.sfSpacing50
      },
      '.schema-field-const': {
        display: 'flex',
        flexDirection: 'column'
      },
      '.schema-const-value': {
        padding: `${vars.sfSpacing75} ${vars.sfSpacing}`,
        background: `${vars.sfBrandColor}10`,
        borderRadius: vars.sfSpacing50,
        color: vars.sfBrandColor,
        fontWeight: '500'
      },
      '.array-constraints': {
        fontSize: vars.sfFontSize85,
        opacity: '0.7',
        marginTop: vars.sfSpacing25
      },
      // Merge plugin styles
      ...Object.fromEntries(
        Array.from(formatPlugins.values())
          .filter((p) => p.styles)
          .flatMap((p) => Object.entries(p.styles!))
      )
    }
  };
}) as unknown as XinBlueprint<SchemaFormParts>;

// Default export for <xin-blueprint property="default">
export default schemaFormBlueprint;
````

## `schema-form-plugin-threshold.ts`

The built-in `format: 'threshold'` plugin.

_147 lines · `dev/shared-ui-server/src/shared-ui/custom-elements/schema-form-plugin-threshold.ts`_

<!-- prettier-ignore -->
````ts
// Schema Form Plugin: Threshold
// Renders a slider 0–1 with a "Disabled" checkbox (value = 1.1)
//
// Schema usage:
//   { format: 'threshold', oneOf: [{ type: 'number', minimum: 0, maximum: 1 }, { const: 1.1 }] }

import { localize } from 'tosijs-ui';
import {
  registerFormatPlugin,
  type FormatPlugin
} from './schema-form-blueprint';

const DISABLED_SENTINEL = 1.1;
const DEFAULT_THRESHOLD = 0.85;

const thresholdPlugin: FormatPlugin = {
  render({ schema, value, path, required, fieldId, fieldLabel, elements }) {
    const { div, label, input, span } = elements;

    const isDisabled = value === DISABLED_SENTINEL;
    const defaultVal =
      schema.default != null && schema.default !== DISABLED_SENTINEL
        ? schema.default
        : DEFAULT_THRESHOLD;
    const sliderVal = isDisabled ? 1 : (value ?? defaultVal);

    const hiddenInput = input({
      type: 'hidden',
      name: path,
      'data-path': path,
      'data-type': 'number',
      value: isDisabled ? String(DISABLED_SENTINEL) : String(sliderVal)
    }) as HTMLInputElement;

    const rangeInput = input({
      type: 'range',
      id: fieldId,
      min: 0,
      max: 1,
      step: 0.01,
      disabled: isDisabled
    }) as HTMLInputElement;
    rangeInput.value = String(sliderVal);

    const numberDisplay = span(
      { class: 'schema-threshold-value' },
      isDisabled ? '' : String(sliderVal)
    );
    if (isDisabled) numberDisplay.hidden = true;

    const checkbox = input({
      type: 'checkbox',
      id: `${fieldId}-disabled`,
      checked: isDisabled,
      'aria-label': `${localize('Disabled')} ${fieldLabel}`
    }) as HTMLInputElement;

    // Remember the last "real" slider value so we can restore it when re-enabling
    let lastSliderVal = isDisabled ? String(defaultVal) : String(sliderVal);

    const updateValue = () => {
      if (checkbox.checked) {
        // Save current value before disabling
        if (rangeInput.value !== '1' || !rangeInput.disabled) {
          lastSliderVal = rangeInput.value;
        }
        hiddenInput.value = String(DISABLED_SENTINEL);
        rangeInput.disabled = true;
        rangeInput.value = '1';
        numberDisplay.hidden = true;
      } else {
        rangeInput.disabled = false;
        rangeInput.value = lastSliderVal;
        hiddenInput.value = lastSliderVal;
        numberDisplay.textContent = lastSliderVal;
        numberDisplay.hidden = false;
      }
    };

    checkbox.addEventListener('change', updateValue);
    rangeInput.addEventListener('input', () => {
      lastSliderVal = rangeInput.value;
      hiddenInput.value = rangeInput.value;
      numberDisplay.textContent = rangeInput.value;
    });

    return div(
      { class: 'schema-field schema-field-threshold' },
      label(
        { for: fieldId },
        fieldLabel,
        required ? span({ class: 'required' }, ' *') : ''
      ),
      schema.description
        ? div({ class: 'description' }, localize(schema.description))
        : '',
      div(
        { class: 'schema-threshold-container' },
        rangeInput,
        numberDisplay,
        label(
          { class: 'schema-threshold-disable', for: `${fieldId}-disabled` },
          checkbox,
          ` ${localize('Disabled')}`
        )
      ),
      hiddenInput
    );
  },

  styles: {
    '.schema-threshold-container': {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sf-spacing, 8px)'
    },
    '.schema-threshold-container input[type="range"]': {
      flex: '1',
      minWidth: '0',
      height: 'var(--sf-spacing, 8px)',
      cursor: 'pointer'
    },
    '.schema-threshold-container input[type="range"]:disabled': {
      cursor: 'default',
      opacity: '0.4'
    },
    '.schema-threshold-value': {
      minWidth: '3.5em',
      textAlign: 'center',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: '500'
    },
    '.schema-threshold-disable': {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sf-spacing-25, 2px)',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      fontSize: 'var(--sf-font-size-85, 14px)'
    },
    '.schema-threshold-disable input[type="checkbox"]': {
      width: 'auto'
    }
  }
};

registerFormatPlugin('threshold', thresholdPlugin);
````

## `schema-form-examples.ts`

Example schemas and sample data. Currently imported by nothing — see caveat 7.

_913 lines · `dev/shared-ui-server/src/shared-ui/custom-elements/schema-form-examples.ts`_

<!-- prettier-ignore -->
````ts
import type { JSONSchema } from './schema-form-blueprint';

// Simple: Contact form
export const contactSchema: JSONSchema = {
  type: 'object',
  title: 'Contact Form',
  required: ['name', 'email', 'message'],
  properties: {
    name: {
      type: 'string',
      title: 'Your Name',
      minLength: 1,
      maxLength: 100
    },
    email: {
      type: 'string',
      title: 'Email Address',
      format: 'email'
    },
    phone: {
      type: 'string',
      title: 'Phone Number',
      description: 'Optional contact number'
    },
    subject: {
      type: 'string',
      title: 'Subject',
      enum: ['General Inquiry', 'Support', 'Sales', 'Feedback']
    },
    message: {
      type: 'string',
      title: 'Message',
      description: 'Tell us what you need',
      minLength: 10,
      maxLength: 2000
    },
    subscribe: {
      type: 'boolean',
      title: 'Subscribe to newsletter',
      default: false
    }
  }
};

// Moderate: Blog post with author and tags
export const blogPostSchema: JSONSchema = {
  type: 'object',
  title: 'Blog Post',
  required: ['title', 'content', 'author', 'status'],
  properties: {
    title: {
      type: 'string',
      title: 'Post Title',
      minLength: 5,
      maxLength: 200
    },
    slug: {
      type: 'string',
      title: 'URL Slug',
      pattern: '^[a-z0-9-]+$',
      description: 'URL-friendly identifier (lowercase, hyphens only)'
    },
    content: {
      type: 'string',
      title: 'Content',
      description: 'Main post content (markdown supported)',
      maxLength: 50000
    },
    excerpt: {
      type: 'string',
      title: 'Excerpt',
      description: 'Short summary for previews',
      maxLength: 300
    },
    status: {
      type: 'string',
      title: 'Status',
      enum: ['draft', 'review', 'published', 'archived']
    },
    publishDate: {
      type: 'string',
      title: 'Publish Date',
      format: 'date'
    },
    author: {
      type: 'object',
      title: 'Author',
      required: ['name', 'email'],
      properties: {
        name: {
          type: 'string',
          title: 'Name'
        },
        email: {
          type: 'string',
          title: 'Email',
          format: 'email'
        },
        bio: {
          type: 'string',
          title: 'Short Bio',
          maxLength: 500
        },
        website: {
          type: 'string',
          title: 'Website',
          format: 'url'
        }
      }
    },
    tags: {
      type: 'array',
      title: 'Tags',
      description: 'Categorization tags',
      minItems: 1,
      maxItems: 10,
      items: {
        type: 'string',
        title: 'Tag'
      }
    },
    featured: {
      type: 'boolean',
      title: 'Featured Post',
      default: false
    },
    allowComments: {
      type: 'boolean',
      title: 'Allow Comments',
      default: true
    }
  }
};

// Nasty: E-commerce order with nested products, variants, shipping, and payment
export const orderSchema: JSONSchema = {
  type: 'object',
  title: 'Order',
  description: 'E-commerce order with full complexity',
  required: ['customer', 'items', 'shipping', 'payment'],
  properties: {
    orderNumber: {
      type: 'string',
      title: 'Order Number',
      pattern: '^ORD-[0-9]{8}$',
      description: 'Format: ORD-12345678'
    },
    status: {
      type: 'string',
      title: 'Order Status',
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
      ]
    },
    priority: {
      type: 'string',
      title: 'Priority',
      anyOf: [
        { const: 'low', title: 'Low Priority' },
        { const: 'normal', title: 'Normal Priority' },
        { const: 'high', title: 'High Priority' },
        { const: 'urgent', title: 'Urgent' }
      ]
    },
    customer: {
      type: 'object',
      title: 'Customer Information',
      required: ['firstName', 'lastName', 'email'],
      properties: {
        firstName: {
          type: 'string',
          title: 'First Name',
          minLength: 1
        },
        lastName: {
          type: 'string',
          title: 'Last Name',
          minLength: 1
        },
        email: {
          type: 'string',
          title: 'Email',
          format: 'email'
        },
        phone: {
          type: 'string',
          title: 'Phone'
        },
        company: {
          type: 'string',
          title: 'Company',
          description: 'Optional company name for B2B orders'
        },
        taxId: {
          type: 'string',
          title: 'Tax ID / VAT Number'
        },
        notes: {
          type: 'string',
          title: 'Customer Notes',
          maxLength: 1000
        }
      }
    },
    items: {
      type: 'array',
      title: 'Order Items',
      minItems: 1,
      maxItems: 50,
      items: {
        type: 'object',
        title: 'Line Item',
        required: ['productName', 'sku', 'quantity', 'unitPrice'],
        properties: {
          productName: {
            type: 'string',
            title: 'Product Name'
          },
          sku: {
            type: 'string',
            title: 'SKU',
            pattern: '^[A-Z0-9-]+$'
          },
          quantity: {
            type: 'integer',
            title: 'Quantity',
            minimum: 1,
            maximum: 999
          },
          unitPrice: {
            type: 'number',
            title: 'Unit Price',
            minimum: 0
          },
          discount: {
            type: 'number',
            title: 'Discount %',
            minimum: 0,
            maximum: 100
          },
          variants: {
            type: 'array',
            title: 'Variant Options',
            items: {
              type: 'object',
              title: 'Variant',
              required: ['name', 'value'],
              properties: {
                name: {
                  type: 'string',
                  title: 'Option Name',
                  enum: ['Size', 'Color', 'Material', 'Style']
                },
                value: {
                  type: 'string',
                  title: 'Option Value'
                },
                priceModifier: {
                  type: 'number',
                  title: 'Price Adjustment',
                  description: 'Additional cost for this option'
                }
              }
            }
          },
          customizations: {
            type: 'object',
            title: 'Customizations',
            properties: {
              engraving: {
                type: 'string',
                title: 'Engraving Text',
                maxLength: 50
              },
              giftWrap: {
                type: 'boolean',
                title: 'Gift Wrap'
              },
              giftMessage: {
                type: 'string',
                title: 'Gift Message',
                maxLength: 200
              }
            }
          }
        }
      }
    },
    shipping: {
      type: 'object',
      title: 'Shipping Information',
      required: ['address', 'method'],
      properties: {
        address: {
          type: 'object',
          title: 'Shipping Address',
          required: ['line1', 'city', 'country', 'postalCode'],
          properties: {
            line1: {
              type: 'string',
              title: 'Address Line 1'
            },
            line2: {
              type: 'string',
              title: 'Address Line 2'
            },
            city: {
              type: 'string',
              title: 'City'
            },
            state: {
              type: 'string',
              title: 'State / Province'
            },
            country: {
              type: 'string',
              title: 'Country',
              enum: [
                'USA',
                'Canada',
                'UK',
                'Germany',
                'France',
                'Australia',
                'Japan',
                'Other'
              ]
            },
            postalCode: {
              type: 'string',
              title: 'Postal Code'
            }
          }
        },
        method: {
          type: 'string',
          title: 'Shipping Method',
          enum: ['standard', 'express', 'overnight', 'pickup']
        },
        instructions: {
          type: 'string',
          title: 'Delivery Instructions',
          description: 'Special instructions for delivery',
          maxLength: 500
        },
        signature: {
          type: 'boolean',
          title: 'Require Signature',
          default: false
        },
        insurance: {
          type: 'boolean',
          title: 'Add Shipping Insurance',
          default: false
        }
      }
    },
    billing: {
      type: 'object',
      title: 'Billing Address',
      description: 'Leave empty if same as shipping',
      properties: {
        sameAsShipping: {
          type: 'boolean',
          title: 'Same as Shipping Address',
          default: true
        },
        address: {
          type: 'object',
          title: 'Billing Address',
          properties: {
            line1: {
              type: 'string',
              title: 'Address Line 1'
            },
            line2: {
              type: 'string',
              title: 'Address Line 2'
            },
            city: {
              type: 'string',
              title: 'City'
            },
            state: {
              type: 'string',
              title: 'State / Province'
            },
            country: {
              type: 'string',
              title: 'Country'
            },
            postalCode: {
              type: 'string',
              title: 'Postal Code'
            }
          }
        }
      }
    },
    payment: {
      type: 'object',
      title: 'Payment Information',
      required: ['method'],
      properties: {
        method: {
          type: 'string',
          title: 'Payment Method',
          enum: [
            'credit_card',
            'debit_card',
            'paypal',
            'bank_transfer',
            'crypto',
            'invoice'
          ]
        },
        cardLast4: {
          type: 'string',
          title: 'Card Last 4 Digits',
          pattern: '^[0-9]{4}$'
        },
        subtotal: {
          type: 'number',
          title: 'Subtotal',
          minimum: 0
        },
        tax: {
          type: 'number',
          title: 'Tax',
          minimum: 0
        },
        shippingCost: {
          type: 'number',
          title: 'Shipping Cost',
          minimum: 0
        },
        discount: {
          type: 'number',
          title: 'Total Discount',
          minimum: 0
        },
        total: {
          type: 'number',
          title: 'Order Total',
          minimum: 0
        }
      }
    },
    coupons: {
      type: 'array',
      title: 'Applied Coupons',
      items: {
        type: 'object',
        title: 'Coupon',
        required: ['code'],
        properties: {
          code: {
            type: 'string',
            title: 'Coupon Code',
            pattern: '^[A-Z0-9]+$'
          },
          discountType: {
            type: 'string',
            title: 'Discount Type',
            enum: ['percentage', 'fixed', 'free_shipping']
          },
          value: {
            type: 'number',
            title: 'Discount Value'
          }
        }
      }
    },
    metadata: {
      type: 'object',
      title: 'Order Metadata',
      properties: {
        source: {
          type: 'string',
          title: 'Order Source',
          enum: ['web', 'mobile_app', 'phone', 'in_store', 'marketplace']
        },
        affiliateCode: {
          type: 'string',
          title: 'Affiliate Code'
        },
        marketingConsent: {
          type: 'boolean',
          title: 'Marketing Consent',
          description: 'Customer agreed to receive marketing emails'
        },
        internalNotes: {
          type: 'string',
          title: 'Internal Notes',
          description: 'Staff-only notes',
          maxLength: 2000
        }
      }
    }
  }
};

// Content Builder - showcases union types with array variant picker
export const contentBuilderSchema: JSONSchema = {
  type: 'object',
  title: 'Content Builder',
  description: 'Build a page with mixed content blocks',
  properties: {
    title: {
      type: 'string',
      title: 'Page Title',
      minLength: 1,
      maxLength: 100
    },
    slug: {
      type: 'string',
      title: 'URL Slug',
      pattern: '^[a-z0-9-]+$'
    },
    published: {
      type: 'boolean',
      title: 'Published',
      default: false
    },
    seoScore: {
      type: 'integer',
      title: 'SEO Score',
      description: 'Calculated SEO score (0-100)',
      minimum: 0,
      maximum: 100
    },
    readingTime: {
      type: 'number',
      title: 'Estimated Reading Time (minutes)',
      minimum: 0.5,
      maximum: 60
    },
    blocks: {
      type: 'array',
      title: 'Content Blocks',
      description: 'Add different types of content blocks',
      items: {
        anyOf: [
          {
            type: 'object',
            title: 'Text Block',
            properties: {
              blockType: { type: 'string', const: 'text' },
              heading: { type: 'string', title: 'Heading' },
              content: { type: 'string', title: 'Content', maxLength: 5000 },
              alignment: {
                type: 'string',
                title: 'Alignment',
                enum: ['left', 'center', 'right', 'justify']
              }
            }
          },
          {
            type: 'object',
            title: 'Image Block',
            properties: {
              blockType: { type: 'string', const: 'image' },
              url: { type: 'string', title: 'Image URL', format: 'uri' },
              alt: { type: 'string', title: 'Alt Text' },
              caption: { type: 'string', title: 'Caption' },
              width: {
                type: 'integer',
                title: 'Width %',
                minimum: 10,
                maximum: 100
              }
            }
          },
          {
            type: 'object',
            title: 'Video Block',
            properties: {
              blockType: { type: 'string', const: 'video' },
              platform: {
                type: 'string',
                title: 'Platform',
                enum: ['youtube', 'vimeo', 'custom']
              },
              videoId: { type: 'string', title: 'Video ID' },
              autoplay: { type: 'boolean', title: 'Autoplay', default: false }
            }
          },
          {
            type: 'object',
            title: 'Code Block',
            properties: {
              blockType: { type: 'string', const: 'code' },
              language: {
                type: 'string',
                title: 'Language',
                enum: [
                  'javascript',
                  'typescript',
                  'python',
                  'rust',
                  'go',
                  'html',
                  'css',
                  'json',
                  'other'
                ]
              },
              code: { type: 'string', title: 'Code' },
              showLineNumbers: {
                type: 'boolean',
                title: 'Show Line Numbers',
                default: true
              }
            }
          },
          {
            type: 'object',
            title: 'Quote Block',
            properties: {
              blockType: { type: 'string', const: 'quote' },
              text: { type: 'string', title: 'Quote Text' },
              author: { type: 'string', title: 'Author' },
              source: { type: 'string', title: 'Source' }
            }
          }
        ]
      }
    },
    settings: {
      type: 'object',
      title: 'Page Settings',
      properties: {
        template: {
          anyOf: [
            { const: 'default', title: 'Default Template' },
            { const: 'full-width', title: 'Full Width' },
            { const: 'sidebar-left', title: 'Sidebar Left' },
            { const: 'sidebar-right', title: 'Sidebar Right' },
            { const: 'landing', title: 'Landing Page' }
          ]
        },
        headerStyle: {
          oneOf: [
            {
              type: 'object',
              title: 'Simple Header',
              properties: {
                style: { type: 'string', const: 'simple' },
                showTitle: {
                  type: 'boolean',
                  title: 'Show Title',
                  default: true
                }
              }
            },
            {
              type: 'object',
              title: 'Hero Header',
              properties: {
                style: { type: 'string', const: 'hero' },
                backgroundImage: {
                  type: 'string',
                  title: 'Background Image URL',
                  format: 'uri'
                },
                overlayOpacity: {
                  type: 'integer',
                  title: 'Overlay Opacity %',
                  minimum: 0,
                  maximum: 100
                },
                height: {
                  type: 'integer',
                  title: 'Height (px)',
                  minimum: 200,
                  maximum: 800
                }
              }
            }
          ]
        }
      }
    }
  }
};

export const contentBuilderSampleData = {
  title: 'Getting Started Guide',
  slug: 'getting-started',
  published: true,
  seoScore: 78,
  readingTime: 5.5,
  blocks: [
    {
      blockType: 'text',
      heading: 'Welcome',
      content: 'This is an introduction to our platform...',
      alignment: 'left'
    },
    {
      blockType: 'image',
      url: 'https://example.com/hero.jpg',
      alt: 'Platform dashboard screenshot',
      caption: 'The main dashboard view',
      width: 100
    },
    {
      blockType: 'code',
      language: 'javascript',
      code: 'const hello = "world";\nconsole.log(hello);',
      showLineNumbers: true
    }
  ],
  settings: {
    template: 'default',
    headerStyle: {
      style: 'hero',
      backgroundImage: 'https://example.com/header-bg.jpg',
      overlayOpacity: 40,
      height: 400
    }
  }
};

// Sample data for each schema
export const contactSampleData = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555-1234',
  subject: 'Support',
  message:
    "I need help with my recent order. The tracking number shows delivered but I haven't received it.",
  subscribe: true
};

export const blogPostSampleData = {
  title: 'Getting Started with Web Components',
  slug: 'getting-started-web-components',
  content: '# Introduction\n\nWeb Components are a set of standardized APIs...',
  excerpt:
    'Learn how to build reusable UI components using native web standards.',
  status: 'draft',
  publishDate: '2025-01-20',
  author: {
    name: 'Alex Chen',
    email: 'alex@techblog.example.com',
    bio: 'Senior frontend developer passionate about web standards.',
    website: 'https://alexchen.dev'
  },
  tags: ['javascript', 'web-components', 'tutorial'],
  featured: false,
  allowComments: true
};

export const orderSampleData = {
  orderNumber: 'ORD-20250116',
  status: 'confirmed',
  priority: 'normal',
  customer: {
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@example.com',
    phone: '+1 555-9876',
    company: 'Brown Industries',
    taxId: 'US123456789',
    notes: 'Preferred customer - handle with care'
  },
  items: [
    {
      productName: 'Wireless Keyboard',
      sku: 'KB-2000-BLK',
      quantity: 2,
      unitPrice: 79.99,
      discount: 10,
      variants: [
        { name: 'Color', value: 'Black', priceModifier: 0 },
        { name: 'Style', value: 'Ergonomic', priceModifier: 15 }
      ],
      customizations: {
        engraving: '',
        giftWrap: false,
        giftMessage: ''
      }
    },
    {
      productName: 'USB-C Hub',
      sku: 'HUB-7PORT',
      quantity: 1,
      unitPrice: 49.99,
      discount: 0,
      variants: [{ name: 'Color', value: 'Silver', priceModifier: 5 }],
      customizations: {
        engraving: 'For Dad',
        giftWrap: true,
        giftMessage: 'Happy Birthday!'
      }
    }
  ],
  shipping: {
    address: {
      line1: '456 Oak Avenue',
      line2: 'Suite 200',
      city: 'Austin',
      state: 'Texas',
      country: 'USA',
      postalCode: '78701'
    },
    method: 'express',
    instructions: 'Leave at front desk if no answer',
    signature: true,
    insurance: false
  },
  billing: {
    sameAsShipping: true,
    address: {}
  },
  payment: {
    method: 'credit_card',
    cardLast4: '4242',
    subtotal: 259.97,
    tax: 21.45,
    shippingCost: 12.99,
    discount: 16.0,
    total: 278.41
  },
  coupons: [
    {
      code: 'SAVE10',
      discountType: 'percentage',
      value: 10
    }
  ],
  metadata: {
    source: 'web',
    affiliateCode: 'PARTNER123',
    marketingConsent: true,
    internalNotes: 'VIP customer - prioritize fulfillment'
  }
};

// Threshold demo: confidence thresholds with disabled state
export const thresholdSchema: JSONSchema = {
  type: 'object',
  title: 'Prediction Thresholds',
  description:
    'Configure confidence thresholds per dimension. Set to Disabled to skip prediction.',
  properties: {
    touchless_threshold: {
      title: 'Touchless Threshold',
      description: 'Minimum confidence for auto-approval',
      format: 'threshold',
      oneOf: [
        { type: 'number', minimum: 0, maximum: 1 },
        { const: 1.1, title: 'Disabled' }
      ],
      default: 0.95
    },
    cost_center: {
      title: 'Cost Center',
      description: 'Confidence threshold for cost center prediction',
      format: 'threshold',
      oneOf: [
        { type: 'number', minimum: 0, maximum: 1 },
        { const: 1.1, title: 'Disabled' }
      ],
      default: 0.85
    },
    category: {
      title: 'Category',
      description: 'Confidence threshold for category prediction',
      format: 'threshold',
      oneOf: [
        { type: 'number', minimum: 0, maximum: 1 },
        { const: 1.1, title: 'Disabled' }
      ],
      default: 0.85
    },
    approver: {
      title: 'Approver',
      description: 'Confidence threshold for approver prediction',
      format: 'threshold',
      oneOf: [
        { type: 'number', minimum: 0, maximum: 1 },
        { const: 1.1, title: 'Disabled' }
      ],
      default: 0.9
    },
    routing: {
      title: 'Routing',
      description: 'Confidence threshold for routing prediction',
      format: 'threshold',
      oneOf: [
        { type: 'number', minimum: 0, maximum: 1 },
        { const: 1.1, title: 'Disabled' }
      ],
      default: 0.85
    }
  }
};

export const thresholdSampleData = {
  touchless_threshold: 0.95,
  cost_center: 0.85,
  category: 1.1,
  approver: 0.9,
  routing: 0.7
};
````

# `<schema-form>` — defect report

**Component:** `dev/shared-ui-server/src/shared-ui/custom-elements/schema-form*.ts`
(auto-mirrored to `app/src/shared-ui/` and `admin/src/shared-ui/`)
**Known consumers:** `custom-elements/filtered-table.ts` (add/edit/view detail drawer,
the CRUD path), `custom-elements/admin/customer-config-page.ts` (read-only viewer)
**Found by:** source read, 2026-08-18, branch `7817-improvements-to-dev-tooling`
**Verification status:** SF-1 confirmed by executing the offending expression in
isolation. Everything else is read from source and **not browser-verified** — reproduce
before committing to a fix.

Ten findings, most severe first. SF-1 and SF-2 are data-integrity issues; the rest
are correctness/DX/cleanup.

---

## SF-1 — Nested arrays: reindexing rewrites the wrong bracket, corrupting the parent index

**Severity:** High (silent data corruption)
**File:** `schema-form-blueprint.ts:1009-1025`, specifically **line 1018**

### What's wrong

```ts
const newPath = currentPath.replace(/\[\d+\]/, `[${index}]`);
```

The regex is **unanchored and non-global**, so it rewrites the _first_ `[n]` in the
path, which is the **outermost** array index — not the index of the item that
actually moved. `reindexArrayItems` is called on the container whose items changed,
but it has no idea how deep that container sits.

For a top-level array this is coincidentally correct (the first bracket _is_ the one
that moved). For an array nested inside an array item, it is wrong in two ways at
once.

### Evidence

Executing line 1018's expression directly:

| Input path                                             | `index` | Result                     | Correct?                |
| ------------------------------------------------------ | ------: | -------------------------- | ----------------------- |
| `items[2].sku` (outer list, item 2→1)                  |       1 | `items[1].sku`             | ✅                      |
| `items[2].variants[1].sku` (inner list, item 1→0)      |       0 | `items[0].variants[1].sku` | ❌ **both wrong**       |
| `items[2].variants[0].sku` (inner list, nothing moved) |       0 | `items[0].variants[0].sku` | ❌ **corrupted anyway** |

Two distinct failures:

1. **The parent index is clobbered.** `items[2]` becomes `items[0]` — the inner
   item's position is written over the outer item's position. Note the third row:
   this happens on _every_ reindex pass of a nested container, even when no item
   moved, because the add/remove handler always reindexes the whole container.
2. **The inner index is never fixed.** `variants[1]` stays `variants[1]` after the
   item moves to position 0, so `setValueByPath` writes to index 1 and leaves a hole
   at index 0.

### Impact

`getData()` returns data attached to the wrong parent object, with holes in the inner
array. In `filtered-table`'s edit drawer this is written straight through
`changeHandler({action: 'update', item: data})` — so it persists. The corrupted
`data-path` sticks until the _outer_ array is itself mutated.

### Repro (suggested)

Use the `order` example schema in `schema-form-examples.ts` / `public/doc-data/schema-form-examples.json`
— it has exactly this shape (`items[]` → `variants[]`). Add a third order item,
expand it, add or remove a variant inside it, then call `getData()` and inspect the
paths on the inner inputs (`document.querySelectorAll('[data-path*="variants"]')`).

### Suggested fix

Reindex only the bracket belonging to _this_ container. The container already knows
its own path (`arrayContainer` is created with `'data-path': path` at
`schema-blueprint.ts:829-832`), so the prefix is known:

```ts
const reindexArrayItems = (container: HTMLElement) => {
  const basePath = container.getAttribute("data-path") || "";
  const items = container.querySelectorAll(":scope > .schema-array-item");
  items.forEach((item, index) => {
    item.setAttribute("data-index", String(index));
    item.querySelectorAll("[data-path]").forEach((el) => {
      const currentPath = el.getAttribute("data-path") || "";
      if (!currentPath.startsWith(`${basePath}[`)) return;
      // rewrite only the index immediately following basePath
      const newPath = currentPath.replace(
        new RegExp(`^${escapeRegExp(basePath)}\\[\\d+\\]`),
        `${basePath}[${index}]`,
      );
      el.setAttribute("data-path", newPath);
      if (el.hasAttribute("name")) el.setAttribute("name", newPath);
    });
  });
};
```

`basePath` needs regex-escaping (it can contain `[`, `]`, `.`). Worth a unit test over
`reindexArrayItems` with a two-level fixture — this is exactly the kind of thing that
regresses silently.

---

## SF-2 — `getData()` silently drops any field not described by the schema

**Severity:** High in the CRUD path (silent data loss), by-design elsewhere
**File:** `schema-form-blueprint.ts:238-272` (`collectFormData`), consumer at
`filtered-table.ts:353-364` (`saveDetail`)

### What's wrong

`collectFormData` rebuilds the result object **only** from rendered inputs. Nothing
merges it back over the original object. So any property that exists on the record
but is absent from `schema.properties` is not rendered, not collected, and therefore
absent from the returned object. `additionalProperties` is declared in the
`JSONSchema` interface (line 39) but never read.

In `filtered-table.saveDetail()` the result goes straight to the change handler; the
only field explicitly rescued is the id key:

```ts
const data = formEl.getData();
const action = this._editingItem ? "update" : "create";
if (action === "update" && this.idKey && data[this.idKey] == null) {
  data[this.idKey] = this._editingItem[this.idKey];
}
this.changeHandler?.({ action, item: data });
```

### Impact

Open a record in the edit drawer, change one field, save — and every attribute the
schema doesn't mention (timestamps, provenance, internal flags, anything added since
the schema was written) is dropped from the saved object. Whether that reaches
storage depends on each `changeHandler`, so **the blast radius is per-consumer and
needs auditing**, not assuming.

Note this also means a schema that drifts _behind_ the data model becomes actively
destructive rather than merely incomplete.

### Suggested fix

Decide the contract explicitly and document it either way. Options, cheapest first:

1. Have `filtered-table.saveDetail()` merge: `{ ...this._editingItem, ...data }`.
   One-line, fixes the known destructive path, leaves `getData()` semantics alone.
2. Add an opt-in `preserveUnknown` property on `schema-form` that keeps a reference to
   the input `data` and merges unrendered keys back in `getData()`.
3. Implement `additionalProperties` properly (largest change; probably not worth it).

Recommend (1) now and (2) if a second consumer needs it.

---

## SF-3 — Array add/remove fires only `schema-change`, which has no `detail` and does not fire `schema-input`

**Severity:** Medium
**File:** `schema-form-blueprint.ts:889-891, 927-929, 989-991` (dispatch);
`1093-1100` (the `onInput` handler that does _not_ fire)

### What's wrong

The component emits three events, inconsistently:

| Event           | Fired by              | `detail`              |
| --------------- | --------------------- | --------------------- |
| `schema-input`  | native `input` events | `{ data: getData() }` |
| `schema-submit` | form submit           | `{ data: getData() }` |
| `schema-change` | array add/remove      | **none**              |

`schema-change` is a `CustomEvent` with no detail, dispatched from the array
container. The form's `onInput` handler only responds to native `input` events, so
adding or removing an array item produces **no** `schema-input`.

### Impact

A consumer wired to `schema-input` (the documented "something changed" event) sees
every keystroke but misses all structural array edits — no dirty flag, no live
preview update, no autosave. The two event names are also undocumented in the
component's doc block.

### Suggested fix

Give `schema-change` the same detail shape as the other two, and document all three:

```ts
container.dispatchEvent(
  new CustomEvent('schema-change', { bubbles: true, detail: { data: /* … */ } })
);
```

Getting `getData()` into scope from the array renderers means either dispatching from
the component instead of the container, or having the component listen for
`schema-change` and re-emit `schema-input`. The latter is a two-line change in
`render()` and keeps the renderers dumb.

---

## SF-4 — Format-plugin `styles` are silently ignored unless registered before `makeComponent`

**Severity:** Medium (silent, and the failure looks like a CSS bug)
**File:** `schema-form-blueprint.ts:1324-1329` (the merge), `schema-form.ts:129-134`
(the ordering that currently saves us)

### What's wrong

Plugin registration splits across two very different lifetimes:

- **`render`** is looked up per-render (`formatPlugins.has(schema.format)`, line 357),
  so a plugin registered at any point works.
- **`styles`** are merged into `styleSpec` **once**, while the blueprint function
  runs — i.e. at the `makeComponent('schema-form', schemaFormBlueprint)` call:

```ts
...Object.fromEntries(
  Array.from(formatPlugins.values())
    .filter((p) => p.styles)
    .flatMap((p) => Object.entries(p.styles!))
)
```

Register a plugin after that point and the widget renders correctly but **completely
unstyled**, with no warning.

Today this works only because `schema-form.ts` does a bare
`import './schema-form-plugin-threshold'` above the `makeComponent` call, and ES
import evaluation happens before the module body. That's load-bearing ordering with
nothing marking it as such.

### Suggested fix

Either make it explicit or make it late-bound:

- Cheapest: comment the import in `schema-form.ts` as ordering-critical, and say so in
  the `registerFormatPlugin` doc comment ("register before the component is created,
  or your `styles` will be dropped").
- Better: have `registerFormatPlugin` inject the plugin's styles into the
  document-level stylesheet directly when called, so timing stops mattering.

---

## SF-5 — `readOnly` disables the array add/remove buttons instead of hiding them

**Severity:** Low (UX)
**File:** `schema-form-blueprint.ts:1114-1120`

```ts
formEl.querySelectorAll("input, select, textarea, button").forEach((el) => {
  (el as HTMLInputElement).disabled = true;
});
```

The `button` in that selector catches `.schema-array-add` and `.schema-array-remove`.
A read-only form therefore shows dead "Add Item" buttons and a greyed remove `✕` on
every array row — affordances advertising actions that can't happen. This is visible
today in the admin customer-config viewer, which sets `readOnly = true`.

**Fix:** hide the array controls under `readOnly` (`hidden = true`) rather than
disabling them, or scope the disable to `input, select, textarea` and handle buttons
separately.

---

## SF-6 — Array item labels (`Item 1`, `Item 2`, …) can never be translated

**Severity:** Low (i18n)
**File:** `schema-form-blueprint.ts:971-976`

```ts
const itemLabel =
  variantIndex !== undefined
    ? getVariantLabel(schema, variantIndex)
    : `Item ${index + 1}`;
```

The number is interpolated _before_ the string reaches `localize()` (via
`renderField` → `getLabel`), so lookups are for `"item 1"`, `"item 2"`, … — which can
never match a `localized-strings.ts` entry. The label renders in English forever.

Only hit when the item schema has no `title` and the array is not a union (union items
use `getVariantLabel`).

**Fix:** `` `${localize('Item')} ${index + 1}` ``, and add `Item` to
`localized-strings.ts`.

---

## SF-7 — `schema-form-examples.ts` is dead code that duplicates the live doc fixtures

**Severity:** Low (cleanup / drift hazard)
**Files:** `schema-form-examples.ts` (913 lines), `public/doc-data/schema-form-examples.json`

`schema-form-examples.ts` has **no importers anywhere in the repo**. The doc-site live
examples `fetch('/doc-data/schema-form-examples.json')` instead, because live examples
resolve imports against `src/site-entry.ts`'s registered specifiers and the examples
module isn't one of them.

So there are two copies of the same five fixtures (contact, blogPost, order,
contentBuilder, threshold), hand-synced by construction, and the 913-line dead one is
mirrored into `app/` and `admin/` on every sync.

**Fix:** either delete the `.ts` (and let the JSON be the source of truth), or generate
the JSON from the `.ts` in the build so they can't drift. Deleting is probably right —
but check the `app`/`admin` mirrors go with it so the parity gate stays green.

---

## SF-8 — `custom-elements/customer-schema.json` (32 KB) is unreferenced

**Severity:** Low (cleanup)

No importers. The admin customer-config page uses
`src/shared-ui/generated/customer.schema.json` (12.5 KB, generated). The stale 32 KB
copy sitting in `custom-elements/` is a trap for anyone who greps for a customer
schema and finds the wrong one.

**Fix:** delete, after confirming nothing outside `src/` reads it by path.

---

## SF-9 — `discriminator` and `additionalProperties` are typed but unimplemented

**Severity:** Low (API honesty)
**File:** `schema-form-blueprint.ts:18-21` (`discriminator`), `:39` (`additionalProperties`)

Both appear in the exported `JSONSchema` interface, so a schema author gets
autocomplete and type-checking for them, and neither is read anywhere in the
implementation. `discriminator` in particular looks like it should drive union variant
selection, but `detectVariant` (line 130) does its own structural guessing instead.

**Fix:** either implement `discriminator` in `detectVariant` (it would be strictly
better than the current heuristic when present) or drop both from the interface and
note the unsupported keywords in the doc block.

---

## SF-10 — `detectVariant` object matching requires _every_ variant key to be present

**Severity:** Low (edge case)
**File:** `schema-form-blueprint.ts:166-177`

```ts
const matchCount = variantKeys.filter((k) => k in value).length;
if (matchCount === variantKeys.length) return i;
```

`variantKeys` is all of `variant.properties`, including optional ones. A value that
legitimately matches a variant but omits an optional property fails the check and
falls through — ultimately to `return 0`, silently rendering the value against the
_first_ variant's shape.

Mitigated in practice because the const-property check just above it catches
discriminated unions (the common case). Worth fixing alongside SF-9: prefer
`discriminator`, then const-property, then require only `variant.required` keys rather
than all keys.

---

## Not bugs — noted so they don't get re-litigated

- **Full re-render on every property set** (`render()` clears `this` and rebuilds).
  Costs focus, scroll position, and user-toggled `<details>` state. Deliberate given
  the DOM-is-the-model design; only worth revisiting if a consumer needs live
  reconciliation.
- **`styleSpec` is the deprecated alias for `lightStyleSpec`** in current tosijs
  (`make-component.d.ts`). Works fine; rename whenever the file is next touched.
- **Light-DOM rendering** is intentional and load-bearing — `getData()` does
  `this.querySelector('form')`, and the `styleSpec` rules reach the form precisely
  because there's no shadow root.
- **rAF-based `queueRender()`** may not fire off-screen. Repo-wide tosijs caveat, not
  specific to this component.
