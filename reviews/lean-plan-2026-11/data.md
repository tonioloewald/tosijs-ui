# Lean-plan review: area "data"

Scope, all read line by line at `af13cd1ee` (src/ and bin/ are clean against HEAD; only generated files are dirty):
data-table.ts, row-grouping.ts, crud.ts, schema-form.ts, schema-form/{fields,curate,validator,plugins,unenforced,json-schema}.ts, filter-builder.ts, make-sorter.ts, natural-compare.ts, value-renderer.ts, month.ts, hash-state.ts, router.ts.
Tests: I read data-table.test.ts (selection, cap, and harness parts), crud.test.ts, and fields.test.ts:755-806. For the other 13 test files I read only the test names.

**How ✔ was run.** Every script is in `…/scratchpad/lean/data/`, and each ran as
`cd ~/tosijs-ui && bun --preload ./src/test-setup.ts …/lean/data/<script>.ts`
(`TZ=…` prefixed where noted). The quoted lines are the scripts' own output. Anything not marked ✔ is "read".
Baseline ✔ `bun test src/data-table.test.ts src/crud.test.ts src/filter-builder.test.ts src/hash-state.test.ts src/make-sorter.test.ts src/natural-compare.test.ts src/router-history.test.ts src/row-grouping.test.ts src/value-renderer.test.ts src/schema-form/` printed `210 pass, 0 fail … across 16 files`.

---

## A. Defects

### A-1. Cause: a key lookup reads members inherited from `Object.prototype` (no own-property check). Existing card #4324 covers only the first item. One patch covers the first two.
1. `schema-form/fields.ts:560` `getByPath` is a bare `reduce`. ✔ `paths.ts`: `getByPath({a:{}}, 'a.__proto__')` returns `Object.prototype`, `getByPath({}, 'constructor')` returns `function Object`, and `String(getByPath(row,'constructor'))` returns `"function Object() { [native code] }"`.
   - Visible effect ✔ `form-proto.ts`: given a schema property `constructor` (an F1 team, say) and no value for it yet, the input shows `"function Object() { [native code] }"`. The path is `schema-form.ts:2608` → `syncValues`.
   - Every caller shares the hole: crud.ts:615/697/721/941/944, schema-form.ts (12 calls), fields.ts:438/456/616/623/636.
2. **The proposals map is indexed the same way** (`this._proposals?.[path]`, at schema-form.ts:1795, 1846, 2679). ✔ `form-proto.ts`:
   - With `form.proposals = {}`, the `constructor` field still gets a proposal box (`proposal boxes … 1`).
   - `acceptProposal('toString')` returns `true` and writes `toString` into the value. The docs say proposals "arrive as data, often from another system" (schema-form.ts:2776).
   - Fix: `Object.hasOwn`, or a `Map`.
3. **The table has the same hole, but it goes through tosijs.** ✔ `ctor-col.ts`: a column `prop: 'constructor'` on a row without that key renders `"function Object() { [native code] }"`. The cell is `bindText: item[col.prop]` (data-table.ts:3161), which resolves through tosijs's binding path, so fixing `fields.ts` does not reach it. tosijs has a guarded `getByPath` (`node_modules/tosijs/dist/by-path.d.ts`: `assertSafeKey` for descent, `assertSafeLeafKey`), but it is not in tosijs's `exports`, and the leaf read here still returned the inherited member. This one needs an upstream ask.
4. Write side: `setByPath({}, '__proto__.polluted', 1)` creates an own `__proto__` key and pollutes nothing. ✔ `paths.ts`, and this is already tested at fields.test.ts:759. Harmless, so it is listed for the merge in B rather than as a defect.

### A-2. Cause: `<tosi-table>`'s header and column menu. Each item is a 1–3 line fix and worth a patch.
1. **`aria-sort` is inverted** (data-table.ts:3266-3275: `case 'ascending': … ariaSort = 'descending'`). ✔ `table.ts`: `column.sort = ascending; header aria-sort = descending`, while the rows really are ascending (`1,2,3`). Screen readers announce the opposite order.
2. **"Sort Ascending" toggles.** Its action is `sortByColumn(options)` with the default `'auto'` (data-table.ts:4197; `auto` flips at 4154-4155). ✔ `table.ts`: the first click gives `ascending 1,2,3`, the second click on "Sort Ascending" gives `descending 3,2,1`. It should pass `'ascending'`.
3. **"Hide Column" is disabled on every inferred column.** Inference sets `visible: width !== false`, so `true` (data-table.ts:2662), and the menu enables Hide only when `visible !== true` (4224). ✔ `table-hide.ts`: `inferred columns  Hide Column disabled = true`, `explicit columns … disabled = false`.
   - This contradicts the docs: "By default, the user can show / hide columns" (939-940).
   - The owner has to choose: either `visible: true` means "cannot be hidden" (undocumented; then inference must stop setting it), or the predicate becomes `visible !== false`.
4. **A dotted `prop` crashes `render()`.** ✔ `dotted2.ts`: `"stats.score" render THROWS undefined is not an object (evaluating 't[Ae]')`, raised from tosijs inside `buildRow` → `buildCell` (data-table.ts:3227, 3161). `"missing"`, `"a b"` and `"x-y"` all render.
   - `ColumnOptions.prop` is typed as a bare `string` (1398), and crud's `idPath` does accept dotted paths (crud.ts:615).
   - Patch: refuse with a message. Supporting it would need display, sort (`row[prop]`, 2629), the edit path and `fieldForProperty` to agree.

### A-3. Cause: "every row" is enumerated three ways. Worth a patch.
- With explicit `pinnedTopRows`/`pinnedBottomRows`, single-select's "replace" and `deSelect()` walk only `this.array` (data-table.ts:3562, 3574, 3659). `selectedRows` (4345-4357) does include the pinned arrays.
- ✔ `table.ts`: after `selectRow(pinned)` then `selectRow(row1)` on a single-select table, `selectedRows = P,1`; after `deSelect()`, `selectedRows = P`.

### A-4. Cause: `<tosi-month>` mixes UTC and local date maths. **Worth a patch now.**
1. `dateFromYMD` (month.ts:167-168) builds `new Date('YYYY-MM-DD')`, which is **UTC** midnight. The code then reads `getDay`/`getDate`/`getMonth`/`toString`, which are **local**, while titles and values come from `toISOString()`, which is UTC (283, 545, 555, 559, 593, 614).
   - ✔ `TZ=America/New_York … month.ts`:
     - month dropdown: `Dec Jan Feb … Nov` (January is labelled Dec);
     - `first in-month cell: text 1  title 2026-03-02`;
     - `cells whose day number != their title date: 42 of 42`.
   - Under `TZ=UTC` the same script prints `Jan … Dec` and `0 of 35`.
   - So anywhere west of UTC, clicking "1" selects the 2nd.
   - `today` (548) is the UTC date, and "This Month" (443, 496-498) can jump to the previous month.
   - CI and the doc lane run in UTC, so nothing catches this.
2. `keyDate` logs: its default branch is `console.log(event)` (month.ts:354-355). ✔ `month.ts`: ArrowRight + Enter produce `console.log calls … 2`, and Enter does not select (`value after Enter: ""`). Trivial patch.
3. (read) `disabled`/`readonly` do not stop keyboard selection. `:host[disabled]` is only `pointer-events: none` (207-210); dates keep `tabindex: '0'` (612); `clickDate`/`keyDate`/`selectDate` (334-400) never check either flag.

### A-5. Cause: `<tosi-crud>` lifecycle and record identity.
1. **`TosiCrud.remove()` overrides `Element.prototype.remove()`** (crud.ts:725). Any generic DOM cleanup that calls `el.remove()` deletes the selected record from the store and leaves the element in place.
   - ✔ `crud.ts`: `el.remove(): store.delete calls = 1  still in document = true`.
   - The repo's own test has to work around it: `Element.prototype.remove.call(crud) // not crud.remove(): that deletes the record` (crud.test.ts:119).
   - The fix is a rename, so it belongs in 1.20.0, not a patch (see C).
2. **A failing `list` becomes an unhandled rejection.** `run()` rethrows (crud.ts:586), but four callers drop the promise: `void this.refresh()` at 496, 546, 755 and 845.
   - The comment at 828-835 states the policy of not doing this, but only the Save/Delete buttons follow it.
   - ✔ `crud.ts`: `list() rejected: status = "offline"  unhandled rejections = 1`, then `2` after setting `search`.
   - Worth a patch.
3. **A schema set after the first list never reaches the table.** The guard `!this.parts.table.columns?.length` (crud.ts:964) is fooled because the table's `columns` getter infers columns from the rows (data-table.ts:2640-2667).
   - ✔ `crud-schema.ts`: before the schema `["id","first name"]`; after the schema still `["id","first name"]`, where the schema would give `["ID","First name","email"]`.
   - Fix: remember which columns crud set, the same shape as `_loaded`. Worth a patch.
4. **"Has an id" is written three times and the copies disagree.** `select` (619) and `save` (698) treat `null` as no id; `deletable` (721) checks only `!== undefined`. ✔ `crud.ts`: `record with id: null → store.delete called = true`. Low.
5. (read + test) `blankRecord` fills numbers with `0` (crud.ts:653-654). That contradicts the model's stated rule, "an emptied numeric field becomes `undefined`, not `0`" (fields.ts:523-525; `blankFor` → `undefined` at 651). crud.test.ts:113 pins the `0`. Low, and a behaviour change.

### A-6. Cause: `<tosi-filter>`'s stock filters and the "any field" combinator.
1. `hasTags`/`doesNotHaveTags` lower-case the needle and not the data (filter-builder.ts:188-206). ✔ `filter.ts`: `hasTags('Urgent') on ['Urgent']: false`.
2. A negated condition on "any field" means "some field fails", not "no field matches" (400-402). ✔ `filter.ts`: `"any field does not contain apple" keeps: apple,cherry`.
3. `find(...) !== undefined` (402, 404) loses a match whose value is `undefined`. ✔ `filter.ts`: `~truthy` on `{a: undefined}` gives `false`. Use `.some`.
4. `=` and `>` treat an empty needle as `0` (213-218, 233-236), so picking "=" before typing filters the table to zeros, `''`, `null` and `false`. ✔ `filter.ts`: `equals('') matches 0 / '' / null / false: true true true true`.
5. **Moving a `<tosi-filter>` wipes it**: `connectedCallback` calls `reset()` (filter-builder.ts:619). ✔ `cols.ts`: `filter parts before move: 3`, `after move: 1`.
6. (read) `':host .tosi-icon:'` (334) is an invalid selector, so the rule never applies.

Items 1-5 are each a small patch.

### A-7. Cause: the router and hashState each listen to `popstate` *and* `hashchange`, and hash navigation re-renders.
1. Hash-mode `navigate()` assigns `location.hash` (router.ts:359), which fires `hashchange` → `renderRoute`. It then calls `renderRoute()` again itself (370), so component factories run twice. ✔ `router.ts`: `hash navigate(about): component built 2 times`.
2. Going Back over a hash-only entry fires both events (HTML spec, read). Both modules subscribe to both (router.ts:331-332, hash-state.ts:217-218). ✔ `router.ts`, dispatching one of each: `router built 2 times; hashState notified 2 times`.
3. `navigate()` drops hashState's query (`'#/' + path`, router.ts:359), which contradicts hash-state.ts:67-76 ("Neither disturbs the other"). ✔ `router3.ts`: `#/invoices/41?demo.q=widget` → `#/invoices/42  q = undefined`.
4. A malformed `%` escape throws out of `navigate()` and out of the event listener (`decodeURIComponent`, router.ts:257). ✔ `router2.ts`: `threw URIError URI error`.

Card #2873 is related but different (the same-URL compare). Items 1-3 are worth one patch; 4 is a one-liner.

### A-8. Cause: the "is this a number?" rule, the humaniser and the locale are each copied, with different answers. All cosmetic; patch them with the merges in B.
1. ✔ `numeric.ts`: five copies give five answers for the same inputs:

   | input | naturalCompare | valueRenderer | table width | table align | filter |
   | --- | --- | --- | --- | --- | --- |
   | `" "` | text | `"0"` | text | right | numeric |
   | `true` | — | `"1"` | boolean | right | numeric |
   | `null` | — | `""` | — | right | numeric |
   | `"1e3"` | text | `"1,000"` | text | right | numeric |

   The visible defects: a blank cell in a `number` column shows `0`, and a boolean in one shows `1` (value-renderer.ts:136-140).
2. Sorting ignores `setLocale()` while formatting follows it. The collator is built with `undefined`, meaning the runtime default (natural-compare.ts:42); `valueRenderer` reads `i18n.locale` (value-renderer.ts:109-115). ✔ `locale.ts`: app locale `sv-SE`, number formatted `1 234,5`, yet `['z','ä'].sort(naturalCompare) → ä,z`, where Swedish order is `z,ä`. The docs promise reader-locale ordering (natural-compare.ts:29-30).
3. The two humanisers disagree. Table inference (data-table.ts:2655) leaves `first_name` and `last-name` as they are; the form's `humanise` (fields.ts:114) gives `first name` and `last name`. ✔ `table.ts`. The comment at crud.ts:376 says the no-schema path humanises; it only half does.
4. Number alignment: table inference right-aligns numbers (and nulls), while `columnsFromSchema` leaves integers left-aligned. ✔ `cols.ts`: `{"prop":"qty","name":"qty","width":100}` versus `{…"align":"right"…}`.

**Card hygiene:** #1578 ("one keystroke rebuilds the whole table") looks fixed by the identity guards at crud.ts:959 and 975. Verify it in a browser and close it.

---

## B. Phase 1 (no functionality removed)

### Dead code (internal only)
- filter-builder.ts:484: `FilterBuilderParts.resent`, a typo for a part that never exists (the real part `reset` is undeclared).
- filter-builder.ts:622-624: `render()` override that only calls `super`.
- filter-builder.ts:334: the invalid-selector rule.
- month.ts:556-567: the `days[].selected` field (always `false`) and `days[].inRange` (never read; rendering uses `checkDay`).
- month.ts:424: an unreachable `return false`.
- data-table.ts:2956: unused `_value` parameter of `validateCell`.
- data-table.ts:2759-2763: `rowClasses`, a one-use indirection.
- **Stale comments.** Each describes code that is gone or says the opposite of the code below it:
  - data-table.ts:2941-2947 and schema-form.ts:1968-1974: two orphaned "Coerce a control's string back…" comments; the function moved to `coerceToSchema`, fields.ts:527.
  - data-table.ts:2976-2983 says "`bindValue` is the established idiom"; the code is a one-way binding (2993-3013).
  - data-table.ts:3092-3094 says "It must be `visibility`"; 1749-1767 forbids `visibility`.
  - data-table.ts:2495: an orphaned JSDoc line that attaches to `_groupIdMemo`.
  - crud.ts:857-863: an orphaned "Reconnect the selection from the hash."
  - schema-form.ts:1602-1613: the `_index` comment sits above `_labelCount`.
  - fields.ts:321-324: "Slice 1 … nested objects, arrays, unions come back unsupported" is no longer true.
  - unenforced.ts:13-15: "Delete this file when that lands". It landed in tosijs-schema 1.8.0, and the file is now the fallback (validator.ts:76-79).
  - validator.ts:2 and 21-24: "two functions"; there are three.

### One implementation each
1. **Path get/set.**
   - The copies:
     - `fields.getByPath`/`setByPath` (fields.ts:560, 573), with no guard on either;
     - the proposals map lookups (schema-form.ts:1795/1846/2679);
     - the table's `row[prop]` sort key (data-table.ts:2629);
     - the table display through tosijs bindings (A-1.3).
   - No other dotted-path helper exists in src/ or bin/. I grepped `split('.')`, `*ByPath` and `reduce` walkers.
   - The merge keeps:
     - `Object.hasOwn` per segment on read;
     - refusing `__proto__`, `constructor` and `prototype` on descent and `__proto__` at a leaf (tosijs's `assertSafeKey`/`assertSafeLeafKey` semantics);
     - a numeric segment becoming an array (fields.ts:582);
     - immutability, which tosijs's mutating `setByPath` lacks, so the setter stays here.
   - Ask tosijs to export the guard. Tests: inherited names on read, next to fields.test.ts:759 (which covers only the write side), and a proposals own-key test.
2. **Validation plumbing.** `schema-form.ts:1943-1966` (`refreshErrors`) and `data-table.ts:2953-2974` (`validateCell`) are the same code: get the validator, `warnNoValidator(who)`, `validate(…, {onError, strict: true})`, `collectErrors(…, known)`. The table then re-implements `errorFor` (2973).
   - Merge into `validateErrors(value, schema, known, who): FieldError[] | null` in validator.ts.
   - crud has no third copy: it never validates, which its docs say is deliberate.
3. **Choosing the control for a field.** `data-table.ts:3044-3066` (`buildEditableCell`) and `schema-form.ts:2548-2570` (`buildField`). They disagree:
   - the form sets `required` (2568) and `readonly` for a `const` (2569); the table sets neither;
   - the table also derives a checkbox from `col.type` (3054);
   - option labels are `o.label` in one and `String(o.label)` in the other.
   - Merge into a DOM-free `controlSpec(field) → {tag, type, step, required, readonly, options}` in fields.ts. Each component keeps its own listeners and bindings. It isn't a router: it returns data.
4. **Model → control text.** Three copies: data-table.ts:3017-3026, schema-form.ts:2603-2616 and curate.ts:253-261 (`v == null ? '' : String(v)`, checkbox `=== true`). Merge into one `controlText(value)`, and keep the form's skip of the focused element.
5. **The numeric predicate (A-8.1).** Export `numericValue` (natural-compare.ts:50) and use it in:
   - `valueRenderer`'s `toNumber`, keeping the number passthrough;
   - table inference (data-table.ts:1374, 2658);
   - filter `=` and `>`, with `''` not numeric, which fixes A-6.4.
   - Decide once whether `1e3`/`0x10` count; today they do in one copy and not in the other.
6. **Humanise**: data-table.ts:2655 should call `humanise` (fields.ts:114).
7. **All rows**: add one private `allRows()` holding the union that `selectedRows` already computes (4346-4356), and use it at 3562, 3574 and 3659 (A-3).
8. **`idOf(record)`** in crud, for the three copies at 619, 698 and 721 (A-5.4).
9. **Blank values**: `blankRecord` (crud.ts:646-663) should use `blankFor`'s rule per type (fields.ts:646-653) (A-5.5).
10. **Index after a move.** The proposal re-key lambdas (schema-form.ts:2368-2391) re-derive `moveItem`'s arithmetic (fields.ts:630-643). Add a pure `indexAfterMove(i, from, to)` with a unit test; #3240 notes proposals are tested only in Playwright.

### Declarations written twice
- curate.ts:66-75 `CURATED_KEYS`/`SECTION_KEYS` versus the interfaces at 21-56. The brief's own example: they agree today, but nothing ties them. Use `satisfies readonly (keyof CuratedField)[]` plus a type-level exhaustiveness check.
- value-renderer.ts:66-79: the `ValueRendererType` union, the `switch (base)` (216-301) and the doc table (20-29) list the types three times. Derive all three from one `RENDERERS` record (`keyof typeof RENDERERS`).
- data-table.ts:190-203: the doc's `ColumnOptions` block copies the interface (1396-1451) and has drifted; it lacks `elastic`, `sortValue`, `editable` and `expander`.
- filter-builder.ts:121-144: the doc's filter list and `FilterMaker` copy the code (169-257) and have drifted (see Docs below).
- data-table.ts:1292-1305: the localized-strings list copies the captions in code (4186-4290, annotated keys). Low.

### Teardown and caches
- data-table has no `disconnectedCallback`. Neither MutationObserver (2203-2204, 4570-4612) nor the in-flight `_scrollRestore` (3789-3841, bounded to 8 frames) is stopped. Both are bounded, so low; add one for symmetry.
- crud.ts:842 adds a form `change` listener on every connect and never removes it. That is harmless, because `queueRender` coalesces, but it is asymmetric.
- filter-builder.ts:432-436 adds an anonymous remove listener on every connect, and 619 resets on every connect (A-6.5).
- data-table `_fieldCache` (2927) is keyed only on the schema object. `Field.unvalidated` depends on the validator in force, but the table never shows that note, so this is harmless.
- Fine as they are: schema-form (`live` Set, locale observer 2841-2861), `_groupIdMemo` (new per render, 4440), the `columnRenderers` WeakMap, and the page-wide `probeMaxElementHeight` cache.

### Structure (one file per change, no behaviour change)
- Move the pure layout helpers out of data-table.ts into `src/table-layout.ts`, re-exported so the root surface stays the same: `defaultWidth` 1362-1392, `columnLayout` 1464-1496, `probeMaxElementHeight` 1553-1595, `derivedMaxVisibleRows` 1605-1612, and `computeStickyInfo` 2719-2749 as a function.
- Move `popColumnMenu` (data-table.ts:4166-4297) into `table-column-menu.ts`, returning `MenuItem[]`. That makes A-2.2 and A-2.3 unit-testable without `popMenu`.
- Move the proposals code (schema-form.ts:1775-1906 and 2663-2804, about 280 lines) into `schema-form/proposals.ts`.

### Tests and build
- `CSS.escape` is missing under happy-dom (✔ `typeof CSS` is `undefined`; #3229). A mounted form with a union, an array or a plugin throws, so merges 2-4 cannot be unit-tested. Polyfill it in `src/test-setup.ts`, which is published for adopters.
- There are about 10 hand-rolled poll loops in these doc tests. Five have no timeout: data-table.ts:88-94, 105-111, 151-158, 390-401 and 823-829. Add a `waitUntil(pred, timeout)` beside `waitFor`; that is the live-example area's decision.
- Tests the merges and fixes need:
  - table: `aria-sort`; Sort Ascending is idempotent; Hide works on inferred columns; pinned rows deselect; a dotted `prop` does not throw.
  - month under `process.env.TZ = 'America/New_York'`. ✔ Bun honours a runtime `TZ` change: `new Date('2026-03-01').getDate()` gives `1`, then `28`.
  - crud: no unhandled rejection; a late schema reaches the table.
  - filter: tag case, negated "any field", empty needle.
  - router: one render per hash navigation; the URIError.

### Docs (no API change)
- **Examples (read; no browser lane was run):**
  - make-sorter.ts:38 `sortPicker = select(…)` assigns an undeclared global. Examples run sloppy (live-example/execution.ts builds an `AsyncFunction` with no `'use strict'`), so it leaks `window.sortPicker` (the #1440 family).
  - data-table.ts:11 and 797 fetch emoji JSON from raw.githubusercontent.com at run time, so offline they throw.
- **Wrong today:**
  - data-table.ts:520 says "no `.tr` row elements", and 1270-1284 ("flat CSS grid … every cell a direct child", "Breaking change in v1.5.0 … no `.thead`, `.tbody`, or `.tr`") is contradicted by the CSS (1684-1704) and by the page's own tests (129, 392, 975).
  - data-table.ts:487-489: the "## Row Access" heading is cut off from its content (now at 520-553) by the maxVisibleRows section.
  - data-table.ts:939-940: hiding columns (A-2.3).
  - month.ts:9 says `[part="today"]`; the code uses the class `.today` (591).
  - filter-builder.ts:119 says the example reduces the filters; it passes none. 128-129 name the filters `true`/`false`; the keys are `isTrue`/`isFalse`. 142 says `filterMaker(needle)`; the method is `makeTest(value)`.
  - schema-form.ts:89-90 says "It asks for two functions", then 99 says "Pass all three".
  - schema-form.ts:1289-1293 and 1299-1301 say the same thing twice.
  - schema-form.ts:1311-1319: the API list omits `proposals`, `proposalView`, `acceptProposal`/`rejectProposal`, `validationAvailable`, `rebuild`, `proposalaccept` and `proposalreject`.
  - crud.ts:135-137: "so a guard reads as a guard:" introduces an example that is not there.
  - hash-state.ts:67-76 (A-7.3).
  - hash-state.ts:52-54: with no namespace the prefix is `''` (157, 171), so an instance reads every other instance's keys. Say so.
  - natural-compare.ts:29-30 (A-8.2).
- **Second-best spelling taught first:**
  - schema-form.ts:384-386 teaches bare OpenAPI `discriminator`, while the code reads `x-discriminator` first and calls the bare one "a deprecated alias" (fields.ts:231-242).
  - month.ts:132 uses the `tosijsui` global instead of an import.

---

## C. Phase 2 (one way to do each thing)

### Redundant public spellings

| task | redundant spelling | same as | consumer uses | notes |
| --- | --- | --- | --- | --- |
| create a table | `dataTable`, `xinTable` (data-table.ts:4623, 4626) | `tosiTable`. ✔ `dataTable===tosiTable true`, `xinTable===tosiTable true` | 0 / 0 | `xinTable` goes with the library-wide xin* decision (D) |
| table class / type | `DataTable` (4616-4618) | `TosiTable`. ✔ `DataTable===TosiTable true` | 0 | |
| pin columns from code | `pinnedLeft` / `pinnedRight` get/set (2683-2715) | `column.pinned`. ✔ setters pin the first/last N visible columns: `left,left,right`; getters `2 1` | 0 | removable in 1.20.0 |
| table grid CSS vars | `--grid-columns`, `--grid-row-width` (4129-4131, "Legacy aliases") | `--tosi-table-grid-columns`, `--tosi-table-grid-row-width` | 0 in src/, demo/, tests/ and all 25 consumers (rg) | not marked deprecated, undocumented; written on every resize |
| delete a crud record | `TosiCrud.remove()` (crud.ts:725) | should be e.g. `deleteRecord()`, leaving `remove()` to the DOM | 0 (crud has no consumers) | A-5.1; breaking, so 1.20.0 is the window |
| union discriminator | bare `discriminator` (fields.ts:242) | `x-discriminator` | 0 | **not redundant**: it reads OpenAPI schemas unmodified. Keep it; fix the teaching order |

**Callback properties versus events** (an inconsistency, not a redundancy). `selectionChanged` (data-table.ts:1896) and `monthChanged` (month.ts:297) are callback properties. The rest of the area dispatches events: `change`, `rowexpand`/`rowcollapse`, `error`, `proposalaccept`/`proposalreject`. Neither callback has an event equivalent, so there is nothing to remove yet; one way would mean adding `selectionchange` and `monthchange` events first. `rowRendered` is a per-row hook and fits as a callback.

### The existing `@deprecated` inventory in scope: 8 entries, all in data-table.ts
- `pinnedLeft` get/set (2683, 2688) and `pinnedRight` get/set (2700, 2705):
  - Still needed? No; 0 consumer uses.
  - Runtime warning? None. ✔ `runtime warnings from the deprecated setter: 0`.
  - Docs teach only the survivor? Yes; neither is mentioned in README, Using-Components, src/docs or llms.txt.
  - Verdict: remove in 1.20.0.
- `DataTable` type (4616) and const (4618), and `dataTable` (4623):
  - 0 uses, no warning (a `const` alias cannot warn), docs silent.
  - Verdict: remove in 1.20.0.
- `xinTable` (4626):
  - 0 uses, no warning.
  - But src/docs/migrating.md:217-220 promises the xin* aliases "will continue to work … removed in a future major version" and says "most log a runtime deprecation warning". This one does not, and there is no separate major (the brief's policy).
  - Verdict: decide library-wide, then fix migrating.md either way.
- **What the inventory misses:**
  - the `--grid-*` aliases;
  - bare `discriminator`, deprecated only in a comment while the docs teach it;
  - the `TosiCrud.remove` collision;
  - the "Breaking change in v1.5.0" doc remnant (data-table.ts:1274-1284), which describes a layout that no longer exists;
  - the stale `ColumnOptions` doc block.

---

## D. Not proposing
- **Removing `xin*` on its own.** CLAUDE.md, "Naming convention": "Legacy `xin*` exports are simple aliases kept for backward compatibility". This is a library-wide decision, and migrating.md makes a public promise about it.
- **The vendored `JSONSchema` type** (json-schema.ts). Settled in CLAUDE.md's tosijs-schema paragraph ("vendors the `JSONSchema` TYPE … `bun run typecheck-guards`").
- **The injected validator instead of an import.** Settled in CLAUDE.md's tosijs-schema paragraph and validator.ts:7-19.
- **The `null` default for `pinnedTopRows`/`pinnedBottomRows`** (data-table.ts:2391-2395). Settled: "object- and function-valued props default to `null`".
- **`nopreservescroll` attribute alongside the `preserveScroll` property.** A different job: a presence-only boolean attribute cannot express "off" (data-table.ts:2572-2577).
- **`makeSorter` (lexical) beside `naturalSorter`.** A different job: case ordering differs, and the decision is recorded as deferred at make-sorter.ts:119-133. Its one consumer (loewald-dot-com) sorts timestamps with it.
- **`pinnedTop`/`pinnedBottom` counts alongside the `pinnedTopRows`/`pinnedBottomRows` arrays.** The arrays can pin rows that are not in `array`.
- **`deSelect(rows)`, which is `selectRows(rows, false)`** (data-table.ts:3577-3579). Documented and cheap; not worth a break by itself.
- **`table.value = {array, columns, filter}` beside the individual properties.** It is the library's value/change contract.
- **crud's hand-rolled search debounce** (crud.ts:749-757) rather than tosijs's `debounce`. It must be cancelled on disconnect (851), and tosijs's version returns no cancel.
- **The local keyword list in unenforced.ts.** It is the fallback for a validator that supplies no `unenforcedKeywords`; fix its header, not the file.

## E. Unused, but not redundant
Of the 37 root exports in scope, consumers use 3:
- `tosiTable`: foresight/bundle.ts:183;
- `makeSorter`: loewald-dot-com src/blog.ts and src/firebase.ts;
- `hashState`: tosijs-virta/src/virta.ts:326, through the subpath.

The ones that need a decision:
- `columnLayout`, `derivedMaxVisibleRows` and `probeMaxElementHeight` (data-table.ts:1464, 1605, 1554). They reach the root barrel only through `export *`, and exist there for unit and Playwright tests. Public contract, or internal?
- `tosijs-ui/schema-form/fields` and `/curate` are reachable through the `./*` wildcard, and bin/smoke-consumer.ts:442-443 asserts that `fields` resolves. So `leafFields` (fields.ts:420, used only by its own test) is de-facto API. #3229 asks the same question about `curate`.
- `FilterBuilder`/`filterBuilder` and `FilterPart`/`filterPart` are the only components in scope off the `Tosi*`/`tosi*` naming convention (CLAUDE.md), with 0 consumers. If 1.20 renames anything, rename these then.
- `TosiTable` members that are public only because nothing says `private`, all advertised in the typings: `labelAttrs` (4327; tested), `captionSpan`, `setColumnWidths`, `getColumn`, `effectivePinnedTopData`/`BottomData`, `sortByColumn` and `popColumnMenu`.

## F. Numbers
- **Size:** 17 files, 12,751 lines: 3,728 doc (`/*#`), 2,337 comment, 6,065 code, 621 blank (counted by `count.ts`).
- **Largest files:**

  | file | lines | doc | comment | code |
  | --- | --- | --- | --- | --- |
  | data-table.ts | 4,627 | 1,311 | 955 | 2,158 |
  | schema-form.ts | 3,002 | 1,380 | 379 | 1,166 |
  | crud.ts | 1,010 | | | |
  | schema-form/fields.ts | 747 | | | |
  | filter-builder.ts | 629 | | | |
  | month.ts | 627 | | | |

- **Tests:** 210 unit tests in 16 files, all passing (✔ above); 14 Playwright specs in tests/ for this area.
- **Consumers:** 3 of 37 in-scope root exports are used outside this repo. 0 uses of any `@deprecated` item.
- **The commonest task, putting an array in a table:** 2 spellings (`value = {…}` or the properties), and columns can also be inferred.
- **Ways to do the other common jobs:**
  - pin a column: 2 from code (`column.pinned`, deprecated `pinnedLeft`/`pinnedRight`) plus 2 in the UI (menu, drag);
  - pin rows: 2;
  - sort from code: 4 (`column.sort`, `sortValue`, `table.sort`, `sortByColumn`);
  - select from code: 3 (`selectRow`, `selectRows`, `deSelect`);
  - hear about a change: 3 callback properties (`selectionChanged`, `rowRendered`, `monthChanged`) against 6 event types (`change`, `rowexpand`, `rowcollapse`, `error`, `proposalaccept`, `proposalreject`).
- **Duplicated rules:**

  | rule | copies | agree? |
  | --- | --- | --- |
  | "is this a number?" | 5 | no |
  | humanise a key | 2 | no |
  | validate and collect errors | 2 | |
  | choose a field's control | 2 | no |
  | model → control text | 3 | |
  | "has an id" | 3 | no |

- **Not run:** no browser lane (Playwright and dev servers were off-limits). So "examples that throw" is by reading only, and the double-event Back (A-7.2) was checked by dispatching both events, not by a real traversal.
