# Pre-release review triage — tosijs-ui 1.11.0 (base `v1.10.2`, 25 commits)

**Verdict: BLOCK.** Three confirmed blockers — one silent data-loss defect in the release's flagship new component, one packaging regression that breaks existing consumers' builds, and a release gate (`bun run release-check`) that is currently red.

I re-ran the gate read-only to confirm: `bun run release-check` exits 1 with _"37 annotation(s) since v1.10.2 are not mentioned in CHANGELOG.md"_, `package.json` still reads `1.10.2`, `peerDependencies` has no `tosijs-schema`, and all six new `dist/**/*.d.ts` import from it.

---

## Per-lens summary

| Lens         | Blockers | Majors | Minors/Nits | Headline                                                                                                                   |
| ------------ | -------- | ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| correctness  | 1        | 4      | 3           | crud reverts unsaved edits; editable cells write uncoerced values and swallow arrow keys                                   |
| efficiency   | 0        | 3      | 3           | one keystroke rebuilds the whole table; schema-form is O(N²) per keystroke; dev-auth queue is an unbounded FIFO            |
| dryness      | 0        | 1      | 5           | the schema→control layer is implemented twice and has already drifted (`const` editable in table, readonly in form)        |
| docs         | 1        | 1      | 4           | CHANGELOG has nothing for what this release actually contains                                                              |
| coverage     | 0        | 3      | 3           | crud's destructive `remove()`/`createNew()` execute in **no** lane; no lane presses a key on an editable cell              |
| dx           | 1        | 1      | 4           | undeclared peer breaks consumer bundler builds; optional-peer degrade is completely silent                                 |
| ecosystem    | 0        | 4      | 3           | tjs-lang floor pins a **deprecated** version; five consumer issues open with no disposition                                |
| practices    | 0        | 2      | 4           | shared KB asserts a bun leak this release measured _fixed_; `review.md` files reports into a directory `buildSite` deletes |
| blast-radius | 1        | 2      | 2           | machine-global secrets file outranks each project's own `preview.host` in three shipped bins                               |

Deduped across lenses: the **tosijs-schema declaration gap** was reported independently by 8 lenses (merged into B2); the **CHANGELOG/version gate** by 2 (B3); the **dev-auth redemption queue** by 3 (M7); the **editable-cell key hijack** by 2 (M2).

---

## BLOCKERS (3) — all adversarially verified

### B1 — `<tosi-crud>` silently reverts unsaved form edits and saves the stale record

`src/crud.ts:634` · correctness · **CONFIRMED with a repro**

`showSelected()` guards with `this.parts.form.value !== this._selected`. `setByPath` (`src/schema-form/fields.ts:501`) is immutable and returns a new object per edit, so after the first keystroke that identity check is permanently true and every subsequent crud render writes the stale record back over the edited model. `src/crud.ts:610` queues a crud render on the form's own `change` event, so **the revert fires roughly one frame after every keystroke with no other user action.** A `save()` after that point posts the unedited record. The verifier reproduced `crud.value` going `{name:'Ada Lovelace'}` → `{name:'Ada'}` one frame later, and again via a search keystroke and a bare `crud.render()`.

The inline doc test misses it only because it `await crud.save()` in the same synchronous stretch as the edit.

**Fix:** track `_selected` from the form's model in the existing `change` listener, and have `showSelected()` push into the form only when the _selection identity_ changed (compare by `idPath`, or keep an explicit `_loadedInto`). Add a doc/pw test that inserts a real frame between the edit and the save.

**Also uncovered while verifying:** `CSS.escape` is undefined under happy-dom and `test-setup.ts` does not polyfill it, so `syncErrors()` throws inside `onFieldInput` before the `change` dispatch — which hides schema-form's change event from the **entire unit lane**. Polyfilling it makes this blocker worse, not better (the loss happens with no search typing at all). Fix the polyfill as part of this.

### B2 — `tosijs-schema` is imported by shipped `dist/` but declared in no dependency field

`package.json:56` · dx / correctness / docs / coverage / ecosystem / practices / blast-radius · **CONFIRMED, and a verified green→red regression**

`dist/data-table.js:1014` and `dist/schema-form.js:708` ship a literal `await import('tosijs-schema')`; six `.d.ts` files carry `import type { JSONSchema } from 'tosijs-schema'`; `dist/index.d.ts` re-exports crud/data-table/schema-form. `package.json` lists it **only** as an exact-pinned devDependency — not in `dependencies`, not in `peerDependencies`, not in `peerDependenciesMeta`. Meanwhile six source sites and the published docs assert it is "an **optional peer**".

Four independently verified consequences:

1. **Consumer builds break.** Packed tarball → clean project with `tosijs` + `marked` → Vite 8 (app mode): `Rolldown failed to resolve import "tosijs-schema" from node_modules/tosijs-ui/dist/data-table.js`. The identical project builds green against a packed `v1.10.2`. **`<tosi-table>` is a component people already ship** — they get a broken build with no code change on their side.
2. **`tsc` fails** with 5× TS2307 for a consumer whose only import is `tosiTable`, when `skipLibCheck` is off.
3. **No version floor reaches anyone.** `bin/verify-schema-dep.ts` (157 lines, 12 requirements from tosijs-schema#6 + both directions of #7) settled on `^1.7.0`; that floor exists only in a bin and a plan doc. Verified consequence: `tjs-lang@0.12.0` — our own optional peer — depends on `tosijs-schema: ^1.4.0`, and **1.4.0–1.5.1 export no `inferSchema` at all**. With one of those hoisted, `loadSchemaLib()` _succeeds_, `inferFn` is `undefined`, and the documented "no schema? it infers one" path renders an **empty form with no error and no warning**.
4. **No lane can see it.** `bin/smoke-consumer.ts:329` iterates _declared_ peers, so the #57 drift guard is structurally blind; the lane runs no `tsc` and its `bundleEntry` never imports tosijs-ui.

**Fix (all three parts needed — the first alone does not fix #1 or #2):**

- Add `"tosijs-schema": "^1.7.0"` to `peerDependencies` + `peerDependenciesMeta.optional`, and loosen the devDep to `^1.7.0` so the drift guard has a range to assert.
- Make the runtime import bundler-safe: promote to a real `dependency`, **or** vendor a minimal structural `JSONSchema` type locally (the pattern `src/schema-form/unenforced.ts` already uses for values) and apply the `/* webpackIgnore: true */ /* @vite-ignore */` pair already used at `src/live-example/code-transform.ts:230`. Add `tosijs-schema` to the site orchestrator externals if the iife should stop inlining it (~23KB raw / 8KB gzip — 71% of this release's gzip growth).
- Extend `bin/smoke-consumer.ts`: make `bundleEntry` actually import `tosijs-ui`, and add a `tsc --noEmit` pass with the peer absent. Run the repro **outside** this repo — a bun-linked scratch dir silently resolves into `/Users/tonioloewald/tosijs-ui/node_modules` and gives a false pass.

> Same defect class already ships for `tjs-lang/editors/codemirror` (a _declared_ optional peer that still TS2307s). Worth fixing in the same edit; it is why declaring alone is insufficient.

### B3 — Release gate is red: 37 unwritten annotations including a `[break]`, and the version is not bumped

`CHANGELOG.md:3`, `package.json:3` · docs / dx · **CONFIRMED (re-ran the gate)**

`bun run release-check` exits 1. The only prose under `## 1.11.0 (unreleased)` is the preview-address housekeeping note. Everything an adopter installs 1.11.0 _for_ is undocumented: `<tosi-schema-form>`, `<tosi-crud>`, `hashState`, editable `<tosi-table>` cells, `localize()` `{name}` placeholders, the `./*.js` export fix, the hash-router `?`-in-hash fix.

Commit `d523210b` carries a **`[break]`**: the dev-bridge link token went from 22 base64url chars to 7 Crockford base32, and `linkTtlMinutes` defaulted 15 → 5 (verified in `src/doc-system/site/dev-auth.ts`). `linkTtlMinutes` is public `tosijs-ui/site` surface. No migration note anywhere.

Separately, `package.json` is still `1.10.2` while the CHANGELOG opens `1.11.0`; `src/version.ts` and `docs/version.json` are generated from it, so building in this order publishes a 1.11.0 tarball stamping 1.10.2.

**Fix:** bump `package.json` **before** `bun run build`; write the 1.11.0 section from `bun run release-notes` (mark genuinely internal bullets `[note]`); give the token/TTL break its own callout naming old and new format and the `tunnel: { linkTtlMinutes: 15 }` restore. `release-check` must exit 0.

---

## MAJORS (16) — follow-ups, grouped by destination below

Correctness/security first within each group.

**Correctness / security**

- **M1** `src/data-table.ts:1919` — an editable cell leaves the **raw, uncoerced** value in the model and fires no `change` whenever the coerced value equals the pre-edit value. Verified in Chromium: `qty:{type:'integer'}` at 12, typing `12.7` → model holds `12.7`, zero events, no `cell-invalid`, no validation. `bindValue` writes on every `input` before the cell handler runs, then `if (newValue === oldValue) return` leaves it. Fix: write `item[prop] = newValue` and run validation unconditionally on `change`; compare only to decide whether to _dispatch_.
- **M2** `src/data-table.ts:2692` — arrows/Home/End are swallowed by grid navigation inside editable cells; **the caret cannot be moved and focus jumps away mid-edit**, committing a partial edit through blur. Verified in Chromium. ArrowUp/Down on a `<select>` means an enum cell cannot be changed by keyboard at all. **No lane presses a key on an editable cell** — `tests/table-edit.pw.ts` only dispatches synthetic `change`. Fix: bail out of `handleKeyNav` when `event.target.closest('[data-edit-prop]')`, keeping Tab/Escape; add a real `page.keyboard` spec.
- **M3** `src/schema-form.ts:1257` — the "this keyword is not validated" note renders **only for unions**. `{score:{type:'number',exclusiveMinimum:0}}` with `{score:0}` renders zero `.schema-unvalidated` and `validate()` returns `true` — a green, error-free form over a value the schema forbids, which is precisely what `unenforced.ts` exists to prevent, and which the docs explicitly promise. Fix: render the span in `buildField()`/`buildPluginField()` as `buildUnion()` does.
- **M4** `src/schema-form.ts:871` — `validate` is called **without `strict`**, so the form validates in sampling mode. Verified: `maxProperties` is skipped entirely (size-independent, 100% silent), and a bad element at index 151 of 200 is missed by stride sampling. The form says valid; the consumer's save path (or server) rejects. Worse, `unenforced.ts` copies `maxProperties` into `ENFORCED` and asserts the copy in a test — the component asserts it honours a keyword it does not check. Fix: pass `{ onError, strict: true }` at `schema-form.ts:871` and `data-table.ts:1051`. Add a form-level slot for errors whose path matches no rendered field (today `validate() === false` can be **invisible**).
- **M5** `src/schema-form/fields.ts:219` — we read bare `discriminator`, the spelling tosijs-schema's own `agentContract` **refuses**; `x-discriminator` (accepted) appears nowhere. Verified at 1.7.0: with `x-discriminator` the declared property is silently _ignored_ and branches get mislabelled. Fix: read `x-discriminator` first, keep bare as deprecated alias, update the prose at `schema-form.ts:312`.
- **M6** `src/data-table.ts:1951` — the schema→control layer is implemented **twice** and has already drifted: a `{const:'invoice'}` column is a freely editable text box in the table and `readonly` in the form; `required` and `unsupported` also diverge. The lazy peer loader and the enum `<select>` builder are character-identical copies. Both docs promise parity; nothing tests it. Fix: move `coerceValue`/`enumOptions`/`loadSchemaLib` into `src/schema-form/fields.ts` (or a `validator.ts`) and have both surfaces import them.
- **M7** `src/doc-system/site/dev-auth.ts:285` + `dev-server.ts:713` — the redemption gate is an **unbounded, globally serialized FIFO** on a path reachable unauthenticated from the tunnel (`GET /?t=junk`, no path check, no length prefilter, no abort handling). Measured against real constants: 50 fire-and-forget garbage requests delayed a legitimate redemption by **42s**; a 2 req/s trickle grows the backlog at exactly 1/s and denial **persists after the attack stops**. The 5-minute TTL expires _while queued_ (`Date.now()` is evaluated inside the closure), so the valid link is rejected. This reproduces the exact DoS the module's own comment claims to have avoided, and `dev-auth.test.ts:580` asserts in prose that nothing can keep the developer out. Fix: cap queue depth (429/503 past ~8–32 waiters, after the same fixed slot so the timing oracle stays closed); consider moving the gate inside `redeemLink` so the control travels with the weakness — `redeemLink` is importable via the `./*` wildcard.
- **M10** `src/schema-form.ts:754` — the optional-peer degrade is **entirely silent**: `validate()` returns `true` with no validator, and a schema-less form with no peer renders an **empty box** with nothing logged. Contrast `epub.ts:689`, which warns for `@resvg/resvg-js`. Fix: warn once naming the package and floor; expose a readable `validationAvailable` flag so a Save handler can refuse to treat `validate() === true` as meaningful.

**Efficiency**

- **M8** `src/crud.ts:663` — `render()` unconditionally reassigns `table.array`, and `TosiTable.render()` is a full teardown (`this.textContent = ''`). Verified: 3 search keystrokes → 3 full table rebuilds inside the debounce window; one form keystroke → one more. Any in-progress cell edit loses focus and caret. Fix: identity-guard the assignment (`if (this.parts.table.array !== this._rows)`), likewise `form.schema`; consider guarding `set array` the way `set filter`/`set value` already are.
- **M9** `src/schema-form.ts:901` — per keystroke, one root-scoped attribute `querySelector` **per field** (×2), and `render()` walks the tree three times. Measured under 4× CPU throttle: 1000 fields = ~145ms per keystroke inside crud; 2000 = ~540ms. Quadratic. (Validation itself is cheap — ~0.1ms — the cost is the selector passes.) Fix: keep a `Map<path, {wrapper, control, errorSlot}>` populated in `buildField`; memoize `expanded()` once per render.

**Coverage**

- **M11** `src/crud.ts:544` — `remove()` and `createNew()` execute in **no lane**. Verifier ran them and found two real defects the gap hides: `createNew()` sets `_selected = {}`, so `await crud.remove()` calls `store.delete({})` (a `DELETE /records/undefined`) despite the component's own render logic declaring an id-less record undeletable; and the Delete button (`crud.ts:609`, `() => void this.remove()`) throws an **unhandled promise rejection** on a rejecting store. Fix both, add doc tests for the delete flow, its rejection path, and `createNew()`.

**Ecosystem** (see routing — file/mirror, do not block on these)

- **M13** `package.json:64` — `tjs-lang: ^0.12.0` pins a version npm has **deprecated**, and the deprecation text is _"tosijs-schema >=1.5.0 breaks the battery atoms' output validation in these versions. Upgrade to 0.13.1."_ — the exact library this release adds. An adopter on `tjs-lang@0.13.2` gets a hard `ERESOLVE`. `UPSTREAM.md:373` still claims 0.12.0 is latest. Upstream issue **tosijs-ui#98** is open and untouched.
- **M14** — no open issue has a disposition. **#97** (link token) and **#95** (`~/local-secrets`) are _fully implemented_ and still open; **#44** (editable table, filed by foresight-rpg) is substantially delivered with Part B outstanding; **#85** and **#3** are half-delivered; **#87/#88/#89** were filed against the very feature this release ships and have zero comments.

**Practices**

- **M15** `UPSTREAM.md:22` — commit `b2b742f6` re-measured the `Bun.build()` arena leak as **fixed in bun 1.4.0** (27.6 → 3.3 → 0.7 MB/build, asymptotic ~425MB — a warm cache, not an unreturned arena). The write-back never reached the shared KB: `practices/development.md:33-43` still states "never returns its native arena… no plateau… still climbing", and `00-stack.md:87-90` still says the fixes "sit as open PRs" (bun#34053 is closed _completed_; #34054 closed unmerged). **This repo is also stale**: `CLAUDE.md:87` and `TODO.md:401` repeat the old claim. The architectural conclusion is unchanged and should be restated as rationale, not as a live leak.
- **M16** — `practices/review.md:657-666` (and the **installed** skill at `~/.claude/skills/pre-release-review/SKILL.md:81`) tells you to file the review report to `docs/reviews/<version>-<slug>.md`. In this repo and every `tosijs-ui/site` project `docs/` is `outputDir` and `buildSite` does `rm -rf` on it every build **and every watch rebuild** — `practices/deployment.md:27` says so explicitly, ~180 lines away in the same KB. tosijs-ui has silently routed around it forever (reports live at repo root).

**Blast radius**

- **M12** `bin/resolve-site-config.ts:202` — `~/local-secrets/tosijs-preview.env` (machine-global, library-named, one value per machine) now outranks each project's committed `preview.host`, in three shipped bins. Reproduced on this machine. `tosijs-deploy` is dry-run by default and prints the target; **`tosijs-tunnel` is not** — it `ssh`s, `scp`s a Caddy fragment and reloads Caddy on the resolved host _before_ printing it. The new "No preview host" message actively instructs adopters to create the file, so the trap is self-installing. `site-config.ts:384-395`'s jsdoc still documents the old three-rung order.

---

## Follow-ups — file these

### → this repo's `TODO.md` (correctness / efficiency / dryness / docs / coverage / dx)

Majors:

- [ ] **M1** `data-table.ts:1919` — write the coerced value + run validation unconditionally on cell `change`; compare only to decide whether to dispatch. Add a `12.7`-into-integer case.
- [ ] **M2** `data-table.ts:2692` — guard `handleKeyNav` for editable targets; add a real `page.keyboard` spec to `tests/table-edit.pw.ts` (arrow, Home/End, `<select>` up/down).
- [ ] **M3** `schema-form.ts:1257` — render `.schema-unvalidated` in `buildField`/`buildPluginField`; doc test for a scalar `exclusiveMinimum`.
- [ ] **M4** `schema-form.ts:871` + `data-table.ts:1051` — pass `{ onError, strict: true }`; add a form-level slot for errors with no matching rendered field.
- [ ] **M6** `data-table.ts:1951` — de-duplicate `coerce`/`coerceCell`, the enum select builder, and the lazy peer loader into `schema-form/fields.ts` + a `schema-form/validator.ts`; make the table honour `kind === 'const'`. Add a parity test.
- [ ] **M7** `dev-auth.ts:285` — cap the redemption queue; consider moving the gate inside `redeemLink`.
- [ ] **M8** `crud.ts:663` — identity-guard `table.array` and `form.schema`; debounce the hash write with the query timer.
- [ ] **M9** `schema-form.ts:901` — element `Map` instead of per-field `querySelector`; memoize `expanded()`.
- [ ] **M10** `schema-form.ts:754` — warn once on absent/too-old peer; expose `validationAvailable`.
- [ ] **M11** `crud.ts:544` — guard `remove()` on a resolvable id; catch the button-path rejection; doc tests for `remove()`, its error path, and `createNew()`.
- [ ] **M12** `bin/resolve-site-config.ts:202` — put `~/local-secrets` **below** the site config (or key it per project); print the resolution source on stderr; make `tosijs-tunnel` announce the host **before** it mutates the box. Fix the stale jsdoc at `site-config.ts:384-395`.

Test-lane gaps (scheduled, not waved):

- [ ] **`bun run release-check` is currently RED** — the only failing gate in the repo (B3). It must exit 0 before tagging.
- [ ] `CSS.escape` is undefined under happy-dom and unpolyfilled in `test-setup.ts` — this hides schema-form's `change` event from the **entire unit lane** (surfaced by B1). Polyfill it and re-run.
- [ ] No lane presses a key on an editable cell (M2). No lane executes crud's destructive paths (M11). No lane bundles the library as an adopter does (B2).
- [ ] `bin/verify-schema-dep.ts` is run by **no** lane — no script, no `bin` map, not CI, not the Publishing checklist. Add `"verify-schema": "bun bin/verify-schema-dep.ts"` and call the no-arg form from `bin/smoke-consumer.ts`. _(Also: `--version=X` runs `bun add` in the working repo and never restores `package.json`/`bun.lock` — install to a scratch dir.)_
- [ ] The router's hash-query fix (`src/router.ts:249`) has no test and the repo has **no router tests at all**; `tests/hash-state.pw.ts:61` asserts only the URL string. _(unverified)_
- [ ] `resolvePreviewHost`'s `~/local-secrets` rung is untested by design, and `??` treats `PREVIEW_HOST=''` as present — the declared-but-empty CI/agent shape short-circuits past the fallback written for it. _(unverified)_

Minors / nits:

- [ ] Choosing the empty option in an optional enum writes `''` → `"Enum mismatch"` with no way back to "not set"; same in `coerceCell` (`data-table.ts:1958`). _(unverified)_
- [ ] `change.detail.oldValue` is `undefined` on any **second** commit in the same focus session (`_editStart.delete` at `data-table.ts:1918` is never re-seeded) — all browsers, an ordinary double-toggle. One-line fix: `.set(el, newValue)` instead of `.delete(el)`.
- [ ] Rename `on<Event>` members that tosijs shadows and warns about — `onCellFocus`/`onCellChange`, `onFieldInput`/`onVariantChange`, `onSearchInput`/`onSelectionChanged` → `handle*`, matching this file's own convention. (Once per class per page load, not per element; `<tosi-table>` is the only upgrade regression.)
- [ ] `leafFields()` (`fields.ts:393`) is exported, documented as what the component syncs, and called only by tests — the component uses `expanded()`. Delete it (never released) or reword the comment.
- [ ] `data-table.ts:997` statically imports `schema-form/fields.js` (~6.2KB min / 2.5KB gzip) so every read-only table pays for it, next to a carefully-lazy validator. Also `fieldFor` is documented as "cached per render pass" and has no cache. _(unverified)_
- [ ] `hashState.set` calls `history.replaceState` per keystroke — Safari throws `SecurityError` past 100/30s. Debounce or coalesce. _(unverified)_
- [ ] `afterStructuralEdit()` and the tail of `render()` are the same six calls; extract `syncAll()`. _(unverified)_
- [ ] "non-null base type of a schema" written out 3× verbatim + 2 variants; export `baseType()` from `fields.ts` and use it in `crud.columnsFromSchema`. _(unverified)_
- [ ] `.cell-invalid` / `.cell-editable` are set but styled nowhere — an invalid edit is signalled only by a `title` tooltip (never on touch). _(unverified)_
- [ ] Delete the orphaned `src/docs/utilities.md` stub (ships as a page, a top-level nav item, a sitemap URL, an llms.txt entry with an empty description, and an ePub chapter); consider warning in `ensureSections` when a section has no children. _(unverified)_
- [ ] `EPUB_DOWNLOADS_MARKER` rewrites the marker inside the ```text fence that documents it, so the shipped page never spells `<!-- epub-downloads -->`anywhere. Skip fenced code; lock it with a test in`epub-volumes.test.ts`.
- [ ] Root `schema-form.md` (3,365 lines) documents another project's component with the **opposite** data model and links to a nonexistent `schema-form-bugs.md`. Rename it to say whose it is, fix/drop the link, and index it.
- [ ] `<tosi-crud>.table`/`.form` throw `elementRef "table" does not exist!` before hydration, and the docs show exactly that call in a display-only fence. _(unverified)_
- [ ] `data-table.ts:2883` still concatenates localized fragments (`${localize('Sort')} ${localize('Ascending')}`) — the anti-pattern `src/localize.ts:59`, new in this diff, documents. Needs whole-sentence keys; per `TODO.md:659-682` that moves the keys, so it needs a note or a fragment fallback. _(unverified)_
- [ ] `package.json:13` `deploy:index` still reads `$PREVIEW_SSH` directly, bypassing `resolvePreviewHost` — expands to `ssh 'bash -s'` for anyone following the new documented practice. _(unverified)_
- [ ] `bin/tunnel.ts:157` still prints "Single-use edit link (valid 15 min)" and omits the typable code — both facts are now wrong and it's the terminal the headset user is looking at. Have `/__devlink` return `{url, token, policy, ttlMs}`. _(unverified)_
- [ ] `site-config.ts:475` contradicts itself in one jsdoc block: "**Default 15.**" immediately above "**Defaults to 5 minutes**". _(unverified)_
- [ ] Drop unused `isSuccess`/`now` from `RedemptionGateOptions` (untested surface on a security helper). _(unverified)_
- [ ] Export `splitHash` from `hash-state.ts` and have `router.ts:249` use it instead of an inline `.split('?')[0]`. _(unverified)_
- [ ] `TODO.md:717` says the link TTL is 15 minutes directly above the bullet recording it is now 5. _(unverified)_
- [ ] `schema-form.ts`/`crud.ts` use raw `var()` strings for `--tosi-error` and `--tosi-spacing-50`, which are defined nowhere (11 sites). _Note: the finding's claim about `--tosi-border`/`--tosi-border-radius` was refuted — those ARE themed — and `vars.spacing50` resolves against `--spacing`, not `--tosi-spacing`, so the right fix is `varDefault.tosiSpacing50('5px')` plus a real `_tosiError` in `createColorVariables`._ Separately, the verifier found that `createDarkTheme` = `invertLuminance`, which **drops every non-color entry** — so a dark theme emits no `--tosi-spacing`, `--tosi-border-radius`, `--tosi-font-size` or `--tosi-touch-size` at all. That is a pre-existing `src/theme.ts` bug worth its own item.

### → `UPSTREAM.md` + GitHub issues (ecosystem — file, never edit another repo)

Outgoing:

- [ ] **tjs-lang / tosijs-ui#98** — reply on the open issue with an outcome. Install `tjs-lang@0.13.2`, run all four lanes; if green, widen the peer to `^0.13.2`, bump the devDep, and bump `TJS_VERSION` in `src/live-example/code-transform.ts:204` **in lockstep**; if red, ship 1.11.0 on 0.12.0 _deliberately_ and record the deprecation text, what broke, and the intended move date in `UPSTREAM.md`. Do **not** widen blindly — 0.13.0 changed `MonadicError.actual` and call-site `Type` checking.
- [ ] Refresh `UPSTREAM.md:373` — it still says 0.12.0 is latest and is the version we ship. Latest is 0.13.2 and 0.12.0 is deprecated.
- [ ] **tosijs-schema#8** (`oneOf` unenforced) — already filed correctly with the measurement and mirrored in `UPSTREAM.md`; `unenforced.ts` carries the delete-when-it-lands note and a parity test. **This is the model behaviour for this lens** — no action beyond keeping it current.

Incoming — dispositions owed before tagging:

- [ ] **Close #97** (link token) and **#95** (`~/local-secrets`) naming v1.11.0 — both are fully implemented and still open.
- [ ] **#44** (editable data-table, foresight-rpg) — Part A shipped whole; split Part B (generalized source write-back) out. Lead the data-table release note with what it unblocks downstream, not with the API list.
- [ ] **#87** — post what 1.11.0 delivers (unenforced-keyword note, path-scoped errors) and what it does not (the exported rendered-keyword set, `preserveUnknown` × `additionalProperties:false`). Landing M4 (`strict: true`) first makes the reply much better.
- [ ] **#88** — fix `x-discriminator` (M5) and close.
- [ ] **#89** — post the disposition: we implement `oneOf` because we accept inbound third-party schemas the audited codebase does not; we do not validate it; each field says so; tosijs-schema#8 is the real fix. Consider a follow-up issue for the branch-overlap diagnostic (#89 called it the more valuable half; the data is already assembled in `unionOf()`).
- [ ] **#85** — update the checklist: host resolution is unified, `flag`/`has` still duplicated per bin, `tosijs-deploy` still ignores unknown flags.
- [ ] **#3** — record that `{name}` placeholders landed and key lookup / `#=` bypass / the table-menu concatenation did not, and why.
- [ ] **#79** — add this release's link-token change as the second data point for the "a security default was loosened and nothing enforced the rule" gate the issue asks for.
- [ ] Note for the tracker generally: #50 and #77 are still open despite the 1.10.2 notes claiming both fixed, and no commit in this range uses a closing keyword. The disposition gap is systemic.

### → shared `tosijs-coding-practices` (practices — direct edits, lens 8 is the standing exception) + this repo's `CLAUDE.md`

- [ ] **`practices/development.md:33-43`** — the `Bun.build()` arena claim is now false. Keep the rule; restate the rationale as `UPSTREAM.md` does (425MB steady-state is still worth handing back; the guards are not `Bun.build`-specific; the failure mode was catastrophic twice; a running server keeps the code it loaded). Mark the numbers "≤ bun 1.3.14; re-measured fixed in 1.4.0". Add the measuring note: _measure with a real bundle — growth scales with the module graph, so a small entrypoint plateaus immediately and reports the wrong answer._
- [ ] **`practices/00-stack.md:87-90`** — bun#34053 is closed _completed_ and #34054 closed unmerged; the "sit as open PRs / re-verify against 1.4.0" bullet is stale. _(The `#34054` citation itself is correct in context — it is the fix PR — so only the status needs updating.)_
- [ ] **`practices/review.md:657-666`** and **`~/.claude/skills/pre-release-review/SKILL.md:81`** — stop naming `docs/reviews/`. Use `reviews/<version>-<slug>.md` at repo root, with the reason ("in any `tosijs-ui/site` project `docs/` is `outputDir` and is `rm -rf`'d on every build — deployment.md says so"). Rephrase the packaging-exclusion advice as "confirm your chosen directory is not in `files` and not in `docPaths`".
- [ ] **`practices/releasing.md`** (near the exports-map line at :271) — a `./*` subpath wildcard does **not** cover `./*.js`; ship both mappings or enumerate subpaths, and assert both spellings from an _installed tarball_. Cross-reference `development.md:323`'s "use explicit `.js` extensions", which currently teaches the habit that trips it.
- [ ] **`practices/testing.md`** — extend the existing pack-and-install section with the pieces still missing: shebang assertion, file-count/size delta, cwd-relative-asset grep, a `tsc --noEmit` over an installed consumer, and a bundler build of an entry that actually imports the package (B2 is the motivating evidence).
- [ ] **`practices/deployment.md:196-198`** — the 1.9.0 write-back is still unapplied: it prescribes Caddy `basicauth` and asserts "there is no write endpoint", with no mention of the dev bridge, the tunnel, `/__docstore/source`, or link tokens. Also `deployment.md:129-134` documents a three-rung host resolution that is now five. _(Half of the 1.9.0 queue's packaging item did land in `testing.md:350-380` — the TODO's claim that none did is stale.)_
- [ ] **`practices/web-components.md`** — add a short Localization section: a key is a whole sentence with placeholders; a bare word is a question the translator answers wrong roughly half the time (`Right`→`Rätt`/`正确的`/`Bien`/`Giusto`; `Column`→`柱子`; `Show`→`Espectáculo`); annotate for sense with `#annotation` and rely on bare-key fallback so annotating is always safe. Cite tosijs-ui 1.11.0 / `src/localize.ts`.
- [ ] Future write-backs must **name a commit range** (`practices: <lessons> (tosijs-ui v1.10.2..<sha>)`, the form `6276f45` already uses). `TODO.md:407`'s `[x] DONE (2026-07-20)` has been stale for four releases and its form makes that uncheckable.
- [ ] **`CLAUDE.md`** — add `tosijs-schema` to Key Dependencies (role, `^1.7.0` floor, that the floor is a probe result from `bin/verify-schema-dep.ts`, the tosijs-schema#8 `oneOf` gap, and that `ENFORCED_KEYWORDS` in `unenforced.ts` is a guarded copy). Add `SCHEMA-FORM-PLAN.md`, `schema-form.md`, `RELEASE-REVIEW-1.9.md`, `REMOTE-ACCESS-PLAN.md`, `import-resolver-plan.md`, `self-contained-examples-plan.md` to "Where the design docs live". Correct the stale `Bun.build` paragraph at `CLAUDE.md:87` and `TODO.md:401`. Add two numbered Publishing steps: **apply the practices write-back naming the commit range**, and **run `bin/verify-schema-dep.ts`**. Consider a unit test asserting every root `*.md` outside `files`/`docPaths` appears in the index — this drift was already filed at 1.9.0 and recurred immediately.

---

## Completeness / caveats

- **Nothing was dropped.** Every finding above appears either as a blocker or as an explicit checkbox. Findings marked _(unverified)_ were reported by a lens but not adversarially verified — treat them as leads and sanity-check before acting.
- **Corrections carried forward from verification** (do not re-litigate): `--tosi-border`/`--tosi-border-radius` _are_ themed (that finding was downgraded to a nit); the on-`Event` warning fires once per class, not per element; `leafFields` is tree-shaken from the iife and is deletable at no compat cost; the tosijs-schema 1.6.1 `format` scenario does **not** reproduce (schema-form calls `inferFn` without `{formats:true}`) — the real hazard is 1.4.0–1.5.1 exporting no `inferSchema` at all; declaring an _optional_ peer alone does not fix TS2307 (proof: `tjs-lang` already does exactly that and still errors).
- **Working tree:** `docs/tosijs-ui.epub` and `docs/version.json` show modified — regenerated by a background dev server, not by this review. I ran no mutating command.
- **Lanes not run here:** this triage re-ran only `release-check` (red) plus read-only greps. Before tagging, run all four lanes per the Publishing checklist — `bun test`, `bun run test-browser`, `bun playwright test`, `bun run test-consumer` — after the blockers are fixed, since B1's fix touches crud/schema-form and B2's touches the manifest and possibly the iife externals.
