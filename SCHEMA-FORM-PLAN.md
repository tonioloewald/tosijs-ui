# Schema-driven editing — design note

Status: **design, nothing built.** Written after reading the snowfox `schema-form`
handover (`schema-form.md`, 3,365 lines including full source and a ten-item defect
report). Records the decisions worth making before code exists, and why.

## 1. The one architectural decision

The snowfox component makes the **DOM the source of truth**: data goes in as a
property, and comes out by scraping rendered inputs (`getData()`). Its own handover
lists the consequence under "working as intended":

> Every property write re-renders the whole form, discarding focus, scroll position,
> and user-toggled `<details>` state. Inherent to the DOM-is-the-model design.

**We will not carry that over.** Not on taste — on the observation that its two
data-integrity defects are _symptoms of that choice_, not independent bugs:

- **SF-1** (verified here by executing the expression): reindexing a nested array
  rewrites the outermost bracket, so `items[2].variants[1].sku` at index 0 becomes
  `items[0].variants[1].sku`. It corrupts even when nothing moved. This bug can only
  exist because array order lives in DOM path _strings_ that must be rewritten. With a
  model you splice an array; there are no paths to rewrite.
- **SF-2** (verified by reading `collectFormData`, whose `_schema` argument is unused):
  output is rebuilt from `{}` plus rendered inputs, so any field the schema does not
  describe is dropped. Editing one field can discard timestamps and provenance. With a
  model, unknown fields are simply still there.

Both vanish by construction. The focus/scroll/`<details>` loss is the same root cause,
and is exactly the class of bug we spent 1.10.0 fixing in `data-table` (#67, plus the
open focus-migration item) — adopting it would import that as a _design property_.

**Decision:** a tosi proxy owns the data. Inputs bind to paths into it. The component
follows the house contract — `value` property, `change` event — like every other
component here.

## 2. Validation, coercion, dirty state come from `tosijs-schema`

Zero dependencies, already in the tree transitively via `tjs-lang`, and ours to extend.
The snowfox component has **no schema validation pass at all** — it relies on native
constraint validation (`required`, `pattern`, `min`) — which is a strange gap for a
component whose pitch is validation.

| need                           | source                             |
| ------------------------------ | ---------------------------------- |
| per-path errors                | `validate(value, schema, onError)` |
| coercion / strip to conformant | `filter(data, schema)`             |
| dirty state, save-to-source    | `diff(a, b)`                       |

Open question: `setPredicateEvaluator` suggests predicates could express **progressive
disclosure** ("show this field when …") _in the schema_ rather than in bespoke config.
Worth confirming how snowfox uses it — if at all — before inventing a second mechanism.

## 3. Schema inference — and it belongs upstream

`inferSchema(rows)` does not exist in `tosijs-schema` (`Infer` is type-level: schema →
TS type, not data → schema). It should live **there**, not here: it is a schema
operation, dependency-free, and useful to anyone.

The payoff is bigger than convenience. `data-table` already infers columns — **from
row 0 only**:

```js
Object.keys(_array[0] || {})   // a key absent from the first row loses its column, silently
```

So one inference pass would serve **both** the table's columns and the form's fields,
and would fix that latent bug on the way. One answer to "what shape is this data".

Inference rules to settle (all lossy, so all need an override):

- sample the **whole array**, not row 0
- key absent from some rows → optional, not missing
- small repeated string set → _offer_ `enum`, do not impose one
- conservative `format` sniffing (date/email/uri) — wrong guesses are worse than none
- emit a real editable schema the caller can keep, not a hidden internal one

## 4. The CRUD wrapper

filter + table + form is a genuine product: query → list → detail/edit. Two rules so it
does not become a god-component:

1. **The parts stay independently usable.** The wrapper composes public components; it
   must never become the only way to reach them.
2. **No hardcoded transport.** It takes a store adapter — `list` / `save` / `delete`,
   promise-returning — so REST, DocStore, in-memory and a mock all fit. `loewald.com`'s
   DocStore/RestStore is the existing reference.

**#44 (editable data-table) is this machinery pointed at a different surface** — same
validation and dirty-state model, rendered as cells instead of fields. Build the model
first, then both surfaces, rather than two implementations that drift.

## 5. Hash filter

Key-value state in the page hash, driving the table's filters and identifying the row
under edit. Shareable, bookmarkable, and back/forward works for free.

`src/router.ts` already has `hashRouting`, `defineRoutes`, `navigate`,
`getRouterParams()` — route matching, not arbitrary k/v pairs. The hash filter should
**compose with** it rather than duplicate it.

One hard-won constraint: two things writing `location.hash` fight. `createDocBrowser`
grew a `'memory'` routing mode precisely because a nested doc-system hijacked its host
page's URL. So: **namespaced keys, and an off/memory mode**, decided before it ships —
not after someone embeds two of them.

## 6. State the supported subset

The snowfox component covers less than `tosijs-schema` does: no `$ref`, no `allOf`, and
`discriminator` / `additionalProperties` are typed but unimplemented (SF-9). Whatever we
build must **name what it handles and fail loudly on the rest**, rather than implying
"any schema" and degrading silently.

## 7. Defect disposition

| id                                          | fate                                                                |
| ------------------------------------------- | ------------------------------------------------------------------- |
| SF-1 nested-array reindex corruption        | **gone by construction** (no DOM paths to rewrite)                  |
| SF-2 `getData()` drops undescribed fields   | **gone by construction** (model retains them)                       |
| focus / scroll / `<details>` loss           | **gone by construction** (targeted updates)                         |
| SF-3 `schema-change` has no detail          | fix: one `change` event carrying value, per house contract          |
| SF-4 plugin `styles` need pre-registration  | fix: resolve styles per render, or fail loudly on late registration |
| SF-5 `readOnly` disables add/remove buttons | fix: hide, don't disable                                            |
| SF-6 `Item ${n}` untranslatable             | fix: localize the pattern, interpolate after                        |
| SF-9 `discriminator` unimplemented          | implement, or drop from the type                                    |
| SF-10 `detectVariant` needs every key       | fix: match required keys only; prefer `discriminator`               |
| SF-7 / SF-8 dead files                      | not ours — snowfox cleanup                                          |

**Verification status:** SF-1 and SF-2 confirmed here. SF-3…SF-10 are read from source
and not browser-verified — reproduce before fixing.

## 8. Worth keeping from snowfox, verbatim in spirit

The product knowledge, which is the expensive part and only comes from real use:
field dispatch order (plugin → union → const → enum → type), the **format-plugin seam**,
collapsing an all-`const` union to a plain `<select>`, the string-format → input-type
map, `maxLength > 200` → textarea, `<details>` nesting, array add/remove UX, and the
five example schemas as fixtures.
