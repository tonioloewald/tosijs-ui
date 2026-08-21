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

## 3a. Dependency floor: `tosijs-schema` `^1.7.0` — verified, not assumed

`inferSchema` landed in 1.6.0 and the floor is **1.7.0**, because 1.6.x labels a date-only
string `format: 'date-time'` — self-consistent with its own validator, but a schema that
Ajv rejects against the data it came from (tosijs-schema#7, fixed in 1.7.0; breaking, hence
the minor).

Verified with `bin/verify-schema-dep.ts`, which is kept **because** that defect got past a
guarantee that was self-referential: "a sniffed format never rejects its own sample" is true
from inside the library and still emitted an unportable schema. Only a consumer checking at
the boundary sees that, so the consumer keeps the probe.

```bash
bun bin/verify-schema-dep.ts --version=1.7.0   # 17/17, exit 0
bun bin/verify-schema-dep.ts                   # against whatever is installed
```

It asserts #7 in both directions and re-checks all twelve #6 requirements as a regression
guard — a breaking release is exactly when the other guarantees are most likely to move. It
exits non-zero on any failure (checked both ways: 1.7.0 → 0, 1.6.1 → 1).

**Peer, not dependency, and scoped to the subpath.** `tosijs-schema` becomes an _optional_
peer of `tosijs-ui/schema-form`, not of the core: a consumer who only wants `<tosi-select>`
should not have to install a schema library. `data-table` may use it to replace its
row-0-only column inference when present, and must keep working when it is not.

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

| id                                          | fate                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| SF-1 nested-array reindex corruption        | **gone by construction** (no DOM paths to rewrite)                           |
| SF-2 `getData()` drops undescribed fields   | **gone by construction** (model retains them)                                |
| focus / scroll / `<details>` loss           | **gone by construction** (targeted updates)                                  |
| SF-3 `schema-change` has no detail          | **done** — one `change` event; read `.value`, per the house contract         |
| SF-4 plugin `styles` need pre-registration  | **gone by construction** — styles inject on registration, live forms rebuild |
| SF-5 `readOnly` disables add/remove buttons | **done** — hidden, not disabled                                              |
| SF-6 `Item ${n}` untranslatable             | **done** — `localize('Add {item}', {item})`; the KEY is the whole sentence   |
| SF-9 `discriminator` unimplemented          | **done** — derived from branch `const`s, or declared OpenAPI-style           |
| SF-10 `detectVariant` needs every key       | **done** — marks first, then scored on required keys present                 |
| SF-7 / SF-8 dead files                      | not ours — snowfox cleanup                                                   |

**Verification status:** SF-1 and SF-2 confirmed here. SF-3…SF-10 are read from source
and not browser-verified — reproduce before fixing.

## 8. Worth keeping from snowfox, verbatim in spirit

The product knowledge, which is the expensive part and only comes from real use:
field dispatch order (plugin → union → const → enum → type), the **format-plugin seam**,
collapsing an all-`const` union to a plain `<select>`, the string-format → input-type
map, `maxLength > 200` → textarea, `<details>` nesting, array add/remove UX, and the
five example schemas as fixtures.
