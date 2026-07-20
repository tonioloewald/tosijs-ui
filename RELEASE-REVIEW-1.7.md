# Pre-release review — `1.7-codemirror` (base `main`, minor bump)

**Verdict: BLOCK.** 3 confirmed blockers (1 correctness, 1 efficiency, 1 docs). Do not cut 1.7 until they are cleared; everything else can ship as scheduled follow-ups.

HEAD `b393317e` · `package.json` still says `1.6.21` (version not yet bumped) · 47 verified findings → 33 after dedupe.

---

## Per-lens summary

| Lens            | Verdict | Headline                                                                                                                                                                                                                                           |
| --------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Correctness** | 🔴      | `showDiff()` renders nothing — the CM rewrite dropped the shadow `<slot>` that projected the light-DOM diff overlay. Every `<tosi-code>` also leaks an `EditorView` + a `document.body` MutationObserver (no `disconnectedCallback`).              |
| **Efficiency**  | 🔴      | `dist/iife.js` 121KB → 386KB gzip (3.2x): bun's iife format cannot code-split, so the "lazy" `import('./code-editor-cm')` is inlined. 13 CodeMirror packages became hard runtime deps (~4.8MB installed).                                          |
| **DRYness**     | 🟠      | ~65 lines of hand-rolled regex JS parsing (`extractTopLevelBindingNames`) duplicate — worse — an AST extractor tjs-lang already owns; the B2 test re-implements the pipeline it claims to guard; the inline/iframe executors are copy-paste twins. |
| **Docs**        | 🔴      | CHANGELOG stops at 1.6.20; a _breaking_ release ships with no changelog, no migration note, no deprecation warning. Every build now prints a false-positive `import.meta` warning.                                                                 |
| **Coverage**    | 🟠      | `bun tests` (the documented publish gate) skips 126 tests — including **both** of this release's new test files. The headline ACE→CM migration has zero coverage in any lane CI runs.                                                              |
| **DX**          | 🟠      | Removed API no-ops silently; unknown `mode` silently highlights as JS; the new `change` event fires on programmatic `value =` (un-native) and is undoable.                                                                                         |
| **Ecosystem**   | 🟠      | The shipped WASM demo teaches readers to poke tjs-lang's private `__tjs_wasm_0` — the exact workaround the 0.9.1 bump was made to retire. 12 upstream findings sit in a local `TJS-FEEDBACK.md`; zero were filed as issues.                        |
| **Practices**   | 🟠      | The KB's "zero runtime dependencies in core libraries" rule is now false for tosijs-ui and would misdirect the next reviewer; the Playwright lane rotted red for ~a month because no practice names which lanes the release gate runs.             |

---

## 🔴 Blockers (must fix before tagging 1.7.0)

### B1 — `<tosi-code>`'s shadow content has no `<slot>`, so `showDiff()` renders nothing

`src/code-editor.ts:107` (overlay append) / `:143` (new `content`)

The rewrite added `content = () => [div({ part: 'host' })]`. Previously `CodeEditor` had no `content`, so tosijs's default `content = slot()` filled the shadow root and light-DOM children projected through it. `showDiff(true)` still does `this.append(this.diffOverlay)` into the light DOM — but the shadow root now holds only `<style>` + `div[part=host]`, no slot, so the `<tosi-diff>` is never rendered.

Verified in Chromium against the branch's built `dist/iife.js`: `shadowRoot.querySelectorAll('slot').length === 0`, `overlay.assignedSlot === null`, `checkVisibility() === false`, `getBoundingClientRect() === 0×0` — while `showingDiff === true`. Against `main`'s iife the same script gives a slot, an assigned overlay, and a visible 600×300 element. **This is a regression introduced by this branch.**

Blast radius: the shipped "View changes" action in every live example (`src/live-example/component.ts:1194` loops the js/html/css/test tabs calling `showDiff`) and in the pop-out editor window — the menu toggles, state says it's diffing, the user sees the plain editor. Any consumer with light-DOM children in a `<tosi-code>` is equally broken.

**Fix:** render the overlay inside the shadow root (add a `div({ part: 'diffHost' })` positioned `absolute; inset: 0` to `content` and append `tosiDiff` there, or append `this.diffOverlay` to `this.shadowRoot`). Add a Playwright assertion that the overlay is visible after `showDiff(true)` — `tests/code-editor.pw.ts` covers value/edit/undo/readOnly but not the diff surface, which is why this slipped through.

### B2 — The IIFE inlines all of CodeMirror: 121KB → 386KB gzip (3.2x), contradicting the shipped doc

`src/code-editor.ts:26` (the false promise) / `src/doc-system/site/orchestrator.ts:169` (the iife build)

`bun build --format iife` has no code splitting, so `import('./code-editor-cm')` is flattened in. Measured: `dist/iife.js` **418,524 → 1,227,396 raw**, **121,253 → 386,094 gzip** (+265KB gz). Proven from the source map: 22 CodeMirror/lezer packages + 3 acorn packages + `tjs-lang/editors/codemirror` + `src/code-editor-cm.ts` itself appear in `sources`. ESM splits correctly (`dist/code-editor-cm.js` is a real 9.5KB chunk) — this is IIFE-only.

The doc comment at `src/code-editor.ts:26` says _"CodeMirror is loaded lazily on first use — a page with no `<tosi-code>` bundles none of it."_ True for bundler consumers, **false for the IIFE**, which is the library's most-loaded artifact: all 57 generated doc pages load `/iife.js`, `README.md:82` documents the CDN `<script src=…/iife.js>` path with a `popMenu`-only example, and `orchestrator.ts:250` copies it for `tosijs-ui/site` adopters who omit `bundleEntry` — so a prose/book doc site with zero live examples now downloads 386KB gz. Under ACE the editor cost **0 bundled bytes** (CDN script tag on demand), so this is a genuine new payload, not a re-split.

**Fix (pick one, but decide explicitly):**

- (a) Keep CM out of the base iife: emit `code-editor-cm` (+ the tjs editor extension) as a second artifact loaded on first `<tosi-code>` connect — the same same-origin-then-CDN pattern already used for the tjs browser bundles (`__TJS_LOCAL_BASE` / `/tjs/`), with `buildSite` copying it next to `iife.js`; or ship an editor-free iife variant for doc-only sites.
- (b) Consciously accept the size — then the doc comment's "bundles none of it" sentence **must** be scoped to ESM/bundler consumers, and the measured cost stated in the 1.7 release notes and `doc-site-system.md`.

Either way the doc claim cannot ship as written.

### B3 — Breaking release with no CHANGELOG entry, no migration note, and no deprecation shim

`CHANGELOG.md:3`, `src/code-editor.ts:4`, `README.md`

The newest CHANGELOG heading is `## 1.6.20` — **1.6.21 is already tagged** and unrecorded, and there is no 1.7 section at all. CHANGELOG.md is in `package.json#files`, i.e. it ships to npm.

What this release removes from `<tosi-code>`, with no alias and no `console.warn` (grep for `deprecat|console.warn` in `code-editor.ts` + `code-editor-cm.ts` → zero hits):

- `theme` attribute (dropped from `initAttributes` → now an inert unknown attribute; `<tosi-code theme="ace/theme/monokai">` silently does nothing)
- `options` property (dropped → `codeEditor({ options: { fontSize: 14 } })` sets a dead expando)
- `ace` getter (dropped → `myCode.ace.require(...)` throws `TypeError`)
- `editor` changed type in place: ACE `Editor` → CodeMirror `EditorView`, so `editor.session.getUndoManager()` — the exact call our own live-example used — now throws
- 13 CodeMirror packages became hard runtime `dependencies` (see M2)

`^1.6.21` matches `<2.0.0`, so 1.7.0 auto-installs for every existing consumer — the precise failure the repo's own deprecation convention (`deprecated()` helper, warn-once, used 18× in `src/`) exists to prevent. The break is currently documented only in `CLAUDE.md` (agent-facing, unpublished) and an internal plan file.

**Fix:** add `## 1.7.0` (plus a short `## 1.6.21`) with an explicit **Breaking** section and an ACE→CM migration table; add a "Migrating to v1.7" section to README alongside the v1.3.0 one; add a "Migrating from the ACE-based editor (pre-1.7)" paragraph to the `<tosi-code>` `/*#` doc comment; and keep `theme`/`options`/`ace` as warn-once no-op accessors (~6 lines) so a silent no-op becomes an actionable message.

---

## 🟠 Majors (fix now or file — none block, but all are scheduled)

**M1 — `<tosi-code>` never destroys its editor: every instance leaks an `EditorView` pinned by a `document.body` MutationObserver.** `src/code-editor-cm.ts:244` observes `document.body` per editor; `CmHandle.destroy()` disconnects it but **has zero call sites** and `CodeEditor` has no `disconnectedCallback`. A registered observer is strongly held by the observed node, so document.body → observer → closure → `EditorView` survives detachment. Browser-verified: `/component/` mounts **20 EditorViews** (4 per example, eagerly, with every panel hidden); one simulated SPA nav (`docContent.innerHTML = …`) leaves 20 detached-but-alive views, and each dark-mode toggle then dispatches a `highlight.reconfigure` transaction into all of them (O(all editors ever created), growing with session length). New in this branch (ACE installed no body observer). Fix: `disconnectedCallback()` → `this._handle?.destroy()` + clear `_handle`/`_loadPromise`; better, replace the per-editor observer with one module-scoped darkmode observer + a registry of live handles (the pattern `localize.ts:430` and `drag-and-drop.ts:350` already use).

**M2 — 13 hard runtime `dependencies` added (library previously had ZERO), one of them unused.** `package.json:131` adds 12 `@codemirror/*` + the `codemirror` meta-package. `git show main:package.json` has no `dependencies` key at all. Installed cost: 3.1M `@codemirror` + 1.7M `@lezer` = ~4.8MB, paid by every consumer including `import 'tosijs-ui/rating'` — directly undercutting the 1.6.12 tree-shakeable-subpath work at the install layer, and contradicting the repo's optional-peer convention for every other heavy dep (tjs-lang, happy-dom, @resvg/resvg-js). **`codemirror` (^6.0.2) is imported nowhere** (`grep -rn "from 'codemirror'" src/ bin/ demo/` → empty) — dead weight, drop it regardless. Note: a naive demotion to optional peers is _wrong_ — `dist/code-editor-cm.js` statically imports the scoped packages and there is no CDN fallback, so it would silently break `<tosi-code>`. 1.7 is the last cheap window to decide; whatever you decide, **document it**.

**M3 — `bun tests` — the documented publish gate — silently skips 126 tests, including BOTH of this release's new test files.** `package.json:12`: `"tests": "bun test src/*.test.ts && bun playwright test"`. The shell glob matches only the 16 top-level files: **413 tests / 16 files**, vs bare `bun test` (what CI runs) = **539 tests / 31 files**. The 15 skipped files are exactly the subdirectory ones — including `src/live-example/scope-autocomplete.test.ts` (the _entire_ B2 regression net, new this release) and `src/live-example/code-transform.test.ts` (the new extractor tests), plus every `doc-system/site` test. `CLAUDE.md:557` says "Run `bun tests` to verify all tests pass"; the paragraph **added in this diff** (`CLAUDE.md:34`) calls the broken glob "the fast happy-dom unit lane (this is all CI runs)" — CI runs bare `bun test`, contradicting the correct statement at `CLAUDE.md:66`. Fix: `"tests": "bun test && bun playwright test"` and correct the CLAUDE.md paragraph. _(All 126 skipped tests currently pass — no red test is being waved away, but the gate provably never ran this release's own coverage.)_

**M4 — The headline breaking change (ACE → CodeMirror 6) has zero coverage in any lane CI runs.** CI = `tsc --noEmit` + `bun test` only. No unit tests for `code-editor.ts` / `code-editor-cm.ts` (`smoke.test.ts:99` only asserts `instanceof HTMLElement`, never awaits the lazy chunk); the code-editor doc page has 0 ` ```test ` blocks so the haltija tier never touches it; `tests/code-editor.pw.ts` runs only when a human has `bun start` up (the PW config's `webServer` is commented out). A regression in the value setter, the lazy chunk, or the shadow mount merges green. **Proven testable in the bun tier:** with the CI happy-dom preload, CM loads and mounts, `.editor` is defined, value round-trips, `canUndo()` works — a `src/code-editor.test.ts` closes this cheaply. Also add a Playwright job with a `webServer` entry so the PW lane actually gates.

**M5 — The tjs editor packaging invariant has no test, and its failure mode is a silent no-op.** `tjs-lang/editors/codemirror` MUST be bundled (not externalized) so it shares the editor's single `@codemirror/state`; a separate copy silently no-ops (`loadTjsExtension()` swallows the failure in a bare `catch {}` and returns null). That invariant now rests entirely on `tjsEditorExternal()` (`orchestrator.ts:40`, untested) and on `external:` no longer listing bare `'tjs-lang'` (bun treats it as a **prefix** match). Nothing catches a regression: the B2 unit test imports the extension directly under bun (one module realm), and `grep -rn tjs tests/` returns nothing. Someone re-adds `'tjs-lang'` to `external` → tjs highlighting/autocomplete dies for every adopter, all 539 unit + 30 PW + 32 browser tests stay green. Fix: unit-test `tjsEditorExternal()`, plus a cheap build-time grep of the built iife for `tjsEditorExtension`, plus one PW test that opens a `mode="tjs"` editor and asserts the tjs completion source is live.

**M6 — `scope-autocomplete.test.ts` re-implements the production pipeline instead of calling it — the "end-to-end guard" cannot catch drift.** `runAndCapture()` (`:22–40`) is a copy of `withScopeCapture()` + the AsyncFunction invocation from `execution.ts:89–103,139–156`, with a hard-coded duplicate of the private `SCOPE_CAPTURE_VAR` sentinel. It imports nothing from `execution.ts` or `component.ts`, so **no edit to either file can make it fail**: delete the `withScopeCapture` calls, drop `onScope: this.captureScope`, or break `liveBindings()` — the only guard for B2 stays green. Fix: export `withScopeCapture` (or a `prepareExampleCode(...)`) and drive the shipped chain.

**M7 — Hand-rolled regex binding parser silently no-ops the flagship autocomplete — including on this release's own WASM demo.** `src/live-example/code-transform.ts:60–127` re-implements JS parsing on code that already went through a real parser (and acorn is _bundled into our own iife_ via tjs-lang). Verified misses: `const {\n  app,\n  todos,\n} = tosi(…)` → `[]` (line-anchored regex; `.` doesn't cross newlines) → **zero completions, no error, no warning**; `const a = 1, b = 2` → `['a']` (multi-declarator dropped); nested destructuring → `[]`. The multi-declarator gap **hits the branch's own SIMD/WASM example**: 12 of its 26 top-level bindings (`H, cols, rows, N, py, vy, hy, ty, idle, frame, savedWasm, frames`) never reach `liveBindings()`. Unit tests cover only single-line happy paths. Fix locally (split depth-0 commas; make the declaration head multi-line-aware; add tests for both shapes) **and** file the upstream ask — tjs-lang already has an acorn-based `collectScopeSymbols()` in `editors/scope-symbols.ts` with no `exports` entry (see U1).

**M8 — Every build now emits a false-positive `iife.js contains import.meta` warning.** `orchestrator.ts:231` is a naive `bundleFile.includes('import.meta')`; bundling `tjs-lang/editors/codemirror` pulls in acorn, whose parser contains that substring inside three **quoted error-message strings**. `node --check docs/iife.js` passes — the bundle is fine. `doc-site-system.md:161` documents this warning as a genuine `SyntaxError` condition, and the emitted advice ("mark that dep external + importmap") would _undo the deliberate bundling decision this branch just made_. Every `tosijs-ui/site` adopter bundling a JS parser hits the same false alarm, which desensitizes everyone to a real hit. Fix: strip string literals / tokenize before the check.

**M9 — The shipped inline-WASM demo pokes tjs-lang's private `__tjs_wasm_0`, and TJS-FEEDBACK claims we don't.** `src/live-example/component.ts:191–200,235`: the demo busy-waits `while (!globalThis.__tjs_wasm_0 && …< 3000)` and toggles WASM by saving/nulling that global — while commit 57378ed8 bumped tjs-lang to 0.9.1 _precisely_ to get `__tjs_wasm_ready()` / `__tjs_wasm_enabled`, and `TJS-FEEDBACK.md` #12 says "They work, and we're using them." We are not (`grep -rn __tjs_wasm src/` → only `__tjs_wasm_0`). Two costs: (a) `__tjs_wasm_N` is **index-keyed per transpile**, so a second `wasm {}` example on the same page also registers `__tjs_wasm_0` — the toggle would clobber the other example's kernel; (b) this is **published teaching material** on the `/component/` page, one copy-paste from becoming the community convention for using tjs WASM. Fix: rewrite on the supported levers before release; delete the busy-wait, the saved-global swap, and the stale "noted in TJS-FEEDBACK.md" comment. (Coverage sibling: that demo asserts _nothing_ — a silent WASM→JS fallback keeps the browser tier 32/32 green while the page still claims "⚡ WebAssembly SIMD". Add a ` ```test ` block asserting the compiled artifact exists.)

**M10 (practices) — The KB's "zero runtime dependencies in core libraries" rule is now false for tosijs-ui and would actively misdirect the next reviewer.** `practices/00-stack.md:32`, `performance.md:46`, and the Efficiency-lens checklist `review.md:51` ("no new runtime dep in a core library") state an absolute this release breaks. An agent following it "fixes" the CM deps by demoting them to optional peers — which silently breaks `<tosi-code>` (see M2). The rule cannot distinguish a gratuitous dep from a heavy dep behind a lazy chunk whose module identity must be singular.

**M11 (practices) — The Playwright lane rotted red for ~a month across ~20 tagged releases, and no practice requires running every lane at the release gate.** Commit `f989aead` fixed 9 failing PW tests that were stale selectors, not regressions (settings button title changed in v1.6.0; nav grouping in v1.6.10; per-doc `document.title`). Nobody noticed because CI runs only the unit lane, `test-browser` covers only inline doc tests, and the PW lane needs a manually-started HTTPS server. `review.md:78` ("Run the suite") and `releasing.md` say "tests" as if there were one suite — there are four. **Bonus:** `releasing.md` claims the build "runs tests and exits non-zero on failure"; `bin/dev.ts` runs no tests at all — the documented safety net is fictional, which is exactly why the rot went unnoticed.

**M12 — Missing consumer-facing docs for the release's flagship editor surface.** The `<tosi-code>` `/*#` block (the _only_ published doc — it feeds the site, the ePub, and `llms.txt`) documents `value`/`mode`/`editor`/undo-redo but not the new `change` event, not `tjsAutocomplete` + `TjsAutocompleteConfig` (the entire B2 feature), not `disabled`→readOnly, not `original`/`showDiff()`, and omits `ajs` from the mode list. All of it lives only in `CLAUDE.md`, which npm consumers never see. (Folded into B3's doc work, but tracked separately so it isn't lost.)

---

## 🟡 Minors & nits (all scheduled — none dropped)

Correctness / DX:

- Programmatic `value =` dispatches `change` **and** is undoable. CM's `updateListener` fires on any `docChanged`, including `setValue()`'s own transaction; ACE's setter emitted nothing and called `getUndoManager().reset()`. Browser-verified fallout: after live-example's **Revert**, `canUndo()` is true and Ctrl-Z restores the edits the user just discarded (the undo button visibly re-enables via the 250ms poll). Fix: annotate `setValue`'s dispatch with `Transaction.addToHistory.of(false)` and gate `onChange` on user-originated transactions. _(The finding's "doesn't bubble" sub-claim is wrong — non-bubbling `change` is the house convention and tosi-form listens in capture phase.)_
- Unknown `mode` silently highlights as JavaScript. `languageForMode()`'s `default:` returns `javascript()`; ACE supported ~100 modes, CM6 here supports 6. `<tosi-code mode="python">` gets JS highlighting with no warning. Fix: plain-text fallback + one `console.warn`, and list the caveat in the 1.7 notes.
- `src/code-editor-cm.ts` fails the repo's own lint gate: `'isTjsMode' is assigned a value but never used` (`:41`, dead — the real predicate is duplicated at `code-editor.ts:191`) and `Expected a 'break' statement before 'case'` (`:55`, the intentional ts→tjs fallthrough). Neither is auto-fixable, so `bun format` exits nonzero. _(The lint gate is already red on main with 2 unrelated errors — this adds 2 more.)_ Fix: export the one `isTjsMode`, delete the private copy, drive `languageForMode`'s tjs branch off it, and reword the case comment to contain "falls through" — this also collapses the three places "which modes are tjs" is encoded.

Efficiency / DRYness:

- Scope-capture epilogue runs for **every** dialect (`component.ts:1401,1414` pass `onScope` unconditionally) though only `tjs` consumes `liveBindings()`; `capturedScope` then strongly retains every top-level local of the latest run and is never cleared. Fix: gate on `this.dialect === 'tjs'`, clear in `disconnectedCallback`.
- All 4–5 CodeMirror editors per live example are constructed at page load inside the `hidden` `.code-editors` panel (browser-verified: 8 examples → 32 EditorViews, all measuring 0-height). Not a regression (ACE was equally eager), but the migration is the moment to defer — `ensureProductTabs()` already lazily builds its editors on first `showCode()`.
- `executeInline` / `executeInIframe` are copy-paste twins (`execution.ts:139–164` vs `252–283`); the B2 edit had to be applied to both, and no test covers the iframe branch. Extract `prepareExample(js, context, transform, onScope)`.
- The monospace font stack is hard-coded twice with the same `.cm-scroller` selector (`code-editor-cm.ts:127`, `code-editor.ts:156`), one of which is dead (CM's themed selector always wins), and neither reads the theme's code-font var — so a themed doc site shows the editor in Menlo, the surrounding code in Spline Sans Mono, and the diff overlay in generic monospace. Converge on one var, delete the duplicate rule.
- `liveBindings()` re-queries `.preview` instead of using the element `runExample` already holds — and the query returns `null` for `iframe` examples (the preview lives inside the iframe's document), so `preview` is silently missing from completions there. Store the returned preview on the instance.

Docs:

- `src/via-tag.ts:8` still claims `<tosi-code>` is implemented with `scriptTag` — it no longer imports via-tag at all.
- `CLAUDE.md`'s live-example section still says only `{js,html,css,test}` are executable and that "```typescript (or any other language)" is display-only — `tjs`and`ts`execute, and`check-examples.ts`**fails the build** on a mistagged illustrative`ts`block. The file now contradicts itself (it gained a`mode="tjs"` section this release).
- `CLAUDE.md` "Key Dependencies" never mentions the 13 CodeMirror hard deps or the 3.2x iife; `doc-site-system.md`'s externals section never mentions that `tjs-lang/editors/codemirror` is now deliberately **not** external (+~50KB gz for every adopter with tjs-lang installed).
- `TODO.md:156` still lists "replace ace editor with CodeMirror. **Now a green-lit 1.7 effort**" as open, and frames it as "as peer deps" — which is not how it landed.
- `docs/tosijs-ui.epub` is nondeterministic (zip mtimes + a `new Date()` `dcterms:modified`), so it is dirty after every build and a `git diff --exit-code` staleness gate over generated files can never pass. _(No such gate exists today — this blocks adding one.)_

Coverage:

- The scope-capture epilogue has no negative-path test: a declaration inside a template literal/comment is harvested, and an identifier-shaped **reserved word** (e.g. `const delete = 1` inside a template string) emits `try{__tosiScope.delete=delete}` → hard `SyntaxError` → the example never runs at all. Latent today (0 triggers in the corpus). Fix: reserved-word/valid-identifier filter + tests.
- `tests/code-editor.pw.ts` doesn't assert the new `change` event, post-load `mode` swap (the tjs-extension re-apply path, exercised in production by `ensureProductTabs`), or post-load `disabled` toggle.
- The WASM/SIMD demo asserts nothing (see M9).

---

## Follow-ups, grouped by destination

### → `TODO.md` (this repo: correctness / efficiency / dryness / docs / coverage / dx)

**Blockers (do before the tag, not as TODOs):** B1 `showDiff` slot · B2 iife size decision + doc-claim fix · B3 CHANGELOG + migration + warn-once shims.

- [ ] **[major]** Add `CodeEditor.disconnectedCallback()` → `this._handle?.destroy()`, clear `_handle`/`_loadPromise`; replace the per-editor `document.body` MutationObserver with one module-scoped darkmode observer + a registry of live handles.
- [ ] **[major]** Drop the unused `codemirror` meta-package; decide and **document** the 13 hard `@codemirror/*` runtime deps (they cannot be naive optional peers — `code-editor-cm.ts` statically imports them with no CDN fallback).
- [ ] **[major]** Fix the publish gate: `"tests": "bun test && bun playwright test"`, and correct `CLAUDE.md:34` (bare `bun test` is the unit lane and is what CI runs).
- [ ] **[major]** Add `src/code-editor.test.ts` (happy-dom: await the lazy chunk, assert `.editor`, value round-trip, undo/redo, mode switch, `disabled`→readOnly) **and** add a Playwright job to CI with a `webServer` entry so `tests/code-editor.pw.ts` gates merges.
- [ ] **[major]** Guard the tjs packaging invariant: unit-test `tjsEditorExternal()`; grep the built iife for `tjsEditorExtension` at build time; add one PW test that opens a `mode="tjs"` editor and asserts the tjs completion source is live.
- [ ] **[major]** Export `withScopeCapture` (or `prepareExampleCode`) from `execution.ts` and have `scope-autocomplete.test.ts` drive the real chain instead of its `runAndCapture()` copy.
- [ ] **[major]** Fix `extractTopLevelBindingNames`: multi-line declaration heads + depth-0 comma splitting (or drive off a real parse); add tests for the wrapped-destructure and multi-declarator shapes; re-verify the WASM demo's 26 bindings.
- [ ] **[major]** Make the `import.meta` bundle guard string-aware (`orchestrator.ts:231`) — it false-positives on every build via bundled acorn and its advice contradicts this release's own bundling decision.
- [ ] **[major]** Rewrite the inline-WASM demo on tjs-lang 0.9.1's supported levers (`__tjs_wasm_ready()` / `__tjs_wasm_enabled`), delete the 3s busy-wait + saved-global swap, and add a ` ```test ` block asserting the WASM artifact compiled.
- [ ] **[major]** Document the new `<tosi-code>` surface in its `/*#` block (change event, `tjsAutocomplete`/`TjsAutocompleteConfig`, `disabled`, `original`/`showDiff`, `ajs` mode) so it reaches the doc site, the ePub, and `llms.txt`.
- [ ] **[minor]** Annotate `setValue`'s transaction with `addToHistory.of(false)` and gate `change` on user-originated transactions (Revert is currently undoable).
- [ ] **[minor]** Unknown `mode` → plain-text fallback + one-time `console.warn`.
- [ ] **[minor]** Fix the 2 new lint errors in `code-editor-cm.ts`; export the single `isTjsMode` and delete the duplicate predicate in `code-editor.ts` (3 encodings → 1).
- [ ] **[minor]** Gate `onScope` on `dialect === 'tjs'`; clear `capturedScope` in `disconnectedCallback`.
- [ ] **[minor]** Defer CodeMirror construction until a code panel is first shown (4–5 EditorViews per example are built eagerly while hidden).
- [ ] **[minor]** Extract the shared inline/iframe example-execution pipeline.
- [ ] **[minor]** Read the theme's code-font var in the CM theme; delete the duplicate `.cm-scroller` rule in `shadowStyleSpec`.
- [ ] **[minor]** Reserved-word/valid-identifier filter on captured binding names + negative-path tests (template-literal / comment declarations).
- [ ] **[minor]** Extend `tests/code-editor.pw.ts`: `change` on keystroke, post-load `mode` swap, post-load `disabled` toggle, **and a `showDiff(true)` visibility assertion** (would have caught B1).
- [ ] **[minor]** Docs: remove `<tosi-code>` from `via-tag.ts:8`; update CLAUDE.md's live-example language list to `{js,tjs,ts,html,css,test}` (and that `typescript` is the display-only fence); update CLAUDE.md "Key Dependencies" (CM hard deps, iife contents/size) and `doc-site-system.md` (tjs CM extension is deliberately bundled, +~50KB gz); move the ACE→CM bullet in `TODO.md:156` to Completed noting it landed as hard deps.
- [ ] **[nit]** Store the `preview` returned by `executeInline`/`executeInIframe` and read it in `liveBindings()` (fixes the iframe miss).
- [ ] **[nit]** Make the ePub build deterministic (fixed zip mtimes + content-derived `dcterms:modified`) so a regenerate-and-diff staleness gate becomes possible.

### → `UPSTREAM.md` (create it) + GitHub issues on the upstream repos — **file, don't fix**

_This repo has no `UPSTREAM.md`; `TJS-FEEDBACK.md` (218 lines, 12 items) is a local-only mirror and **none of its items has ever been filed** — `tonioloewald/tjs-lang`'s 6 open issues are all `From: tosijs` and cover unrelated topics. `practices/cross-project.md` is explicit that the issue is the channel._

- [ ] **[major → tjs-lang]** Export the AST scope extractor. `editors/scope-symbols.ts` already has an acorn-based `collectScopeSymbols()` that handles multi-line destructuring, multiple declarators, and nested patterns — but it has no `exports` entry, so we hand-rolled a strictly-worse regex duplicate (M7). Ask: a `captureScope` transpile option that emits the guarded epilogue from the AST; minimum, export `collectScopeSymbols`/`ScopeSymbol` from a public subpath. _(= TJS-FEEDBACK #8.)_
- [ ] **[major → tjs-lang]** Public WASM levers for consumers: export `tjsWasmReady(): Promise<void>` and `setWasmEnabled(on)` from the browser bundle, and make the per-block artifact name non-index-collidable, so demos stop writing against `__`-globals (M9). _(= TJS-FEEDBACK #12.)_
- [ ] **[minor → tjs-lang]** `editors/codemirror` (and `/monaco`, `/ace`) import `@codemirror/*` as bare specifiers with **no declared `peerDependencies`** — our builds only resolve them because tosijs-ui hoists CodeMirror. Under a strictly-isolated tree (pnpm `hoist=false`, npm nested), `tjsEditorExternal()`'s entry-file probe succeeds, we don't externalize, and `Bun.build` hard-fails with `Could not resolve "@codemirror/state"` — reproduced. Ask: declare them as optional peers; ship types for the subpath (= TJS-FEEDBACK #9). **Local hardening (→ TODO.md):** probe a representative import from tjs-lang's own path, or try/catch-retry with the extension externalized, so a resolver mismatch degrades instead of exploding an adopter's build.
- [ ] **[minor → tjs-lang]** File the remaining open TJS-FEEDBACK items as issues (#1 silent WASM fallback, #4 silent integer division, #5 undocumented `wasm{}` subset, #10/#11 misleading autocomplete surface), then fold `TJS-FEEDBACK.md` into `UPSTREAM.md` with the issue URLs and its existing `✅ RESOLVED (0.9.1)` markers.
- [ ] **[minor → haltija]** `src/doc-system/site/dev-server.ts:64,369` spawn `bunx haltija@latest` — an unpinned dist-tag fetch in shipped library code, with haltija in no lockfile. Ask haltija for a documented CLI/version contract for embedders; locally, pin a floor (`haltija@^1.3.3`) and make it overridable via `haltijaDev: { version }`.
- [ ] **[nit]** `tests/localization.pw.ts:23` targets the Language menu item by an SVG circle radius (`svg circle[r="10"]`) — brittle (26 icons in the library share `r="10"`). **Not an upstream gap:** `MenuAction.properties` already exists and is spread onto the item `<button>`, so stamp a stable `data-menu-item` on the doc-system's Language item and retarget. (→ TODO.md, not upstream.)

**Incoming upstream issues this release should note:** tjs-lang 0.9.1 resolved TJS-FEEDBACK #2/#3/#6 (WASM ready-signal + toggle) and 0.9.0 resolved #7 (stale CM build) — M9 must actually _adopt_ #2/#3 before `TJS-FEEDBACK.md`'s "we're using them" is true.

### → shared `tosijs-coding-practices` repo (+ this repo's CLAUDE.md)

- [ ] **[major]** `practices/00-stack.md:32`, `performance.md:46`, `review.md:51` — the "zero runtime dependencies in core libraries" rule is now false for tosijs-ui and would push a reviewer toward a harmful "fix". Add a **Known divergences** entry (tosijs-ui: 13 CodeMirror runtime deps since 1.7, lazy chunk, cannot be naive optional peers) and re-word the absolute prohibition into the actual policy: _a new runtime dep must be justified, lazily loaded if heavy, and recorded under Known divergences; the gate is the printed gzip delta, not the dependency count._ Record the measured cost (iife 121→386KB gz).
- [ ] **[major]** `practices/releasing.md` + `review.md:78` — replace "run the suite" with an **enumeration of every lane** (unit `bun test`; doc/browser `bun run test-browser`; E2E `bun start` + `bun playwright test`), because in this ecosystem CI covers at most the unit lane and any lane the release gate doesn't run **will** rot (it did, for ~a month/~20 releases). Also fix `releasing.md`'s false claim that the build "runs tests and exits non-zero on failure" — `bin/dev.ts` runs none.
- [ ] **[minor]** `practices/releasing.md` — add a **Breaking changes** section: the ecosystem's semver stance for 1.x (breaking → major, or "pre-2.0 minors may break" as stated policy — make tosijs-ui's 1.7 the worked example); require a CHANGELOG `### Removed` naming each member + its migration; require a warn-once shim where cheap; flag **type-change-in-place** (the `editor` getter: ACE `Editor` → CM `EditorView`) as its own trap, since no grep for removed names catches it.
- [ ] **[minor]** `practices/development.md:84` — **`Bun.build`'s `external` entries are prefix matches**: `'foo'` externalizes `foo/bar` too. That is precisely why the tjs CM extension was silently externalized and no-opped. List subpaths explicitly when you need one bundled and another external. _(The companion CodeMirror-singleton fact is already at `practices/tjs-lang.md:92` — consider generalizing it beyond tjs-lang to editor/plugin ecosystems.)_
- [ ] **[minor]** `practices/testing.md:111` — the haltija rule ("never `bunx haltija@latest`; run project-scoped with `--name`/`--port`") contradicts what tosijs-ui ships and just updated. Split by role: (a) self-launched test-harness haltija → pin + `--name`/`--port`; (b) the `haltijaDev` server-managed channel (`dev-server.ts`) → spawns `haltija@latest` on the default 8700/8701 **by design**, because the injected loader and the `hj` CLI are bound to those ports. Fix the duplicate copy in `review.md`'s "Verify end-to-end" section in the same change.
- [ ] **[minor]** `practices/review.md:10` — "These projects have **no CI** — no `.github/` workflows anywhere in the ecosystem" is false and self-contradicting (`00-stack.md:62` correctly lists tosijs-ui's `tsc+test` CI; haltija has 3 workflows). Point at `00-stack.md`'s exceptions list and note that where CI exists it is deliberately minimal — a green check still means the E2E and doc-test lanes never ran.
- [ ] **[minor]** `practices/cross-project.md` — add a "single-maintainer ecosystems" note: a local feedback file is fine as a working record, but it **must** still be mirrored to an issue, because the issue is what a future agent _in the other repo_ reads. Name `UPSTREAM.md` as the one filename and ban per-dependency names (`TJS-FEEDBACK.md`, `TOSIJS-UI-FEEDBACK.md` already exist in two repos).
- [ ] **[nit]** `practices/releasing.md` — add `tosijs-ui` to the "stop the dev server before you build/commit" attribution and extend it to **any git surgery** (rebase / `git apply` / cherry-pick): a watcher rebuilding mid-operation races greps and `git add`, producing phantom generated-file diffs (`pkill -f bin/dev.ts` first). This bit _this_ repo hardest during the 1.6.21 extraction.
- [ ] **[nit]** `CLAUDE.md` "Key Dependencies" — one paragraph on why the 13 CodeMirror packages are hard `dependencies` (lazy chunk; cannot be peers because the tjs CM extension must share this exact `@codemirror/state`), so the next agent doesn't reconstruct it from an `orchestrator.ts` comment.

---

## Completeness / gaps in this review

- **No red tests were waved away.** The 126 tests the `bun tests` glob skips all currently pass (`bun test src/live-example/ src/doc-system/` → 126/126 green); the defect is that the documented gate never ran them, and it is filed as M3. The 9 previously-red Playwright tests were repaired on this branch (`f989aead`, stale selectors, not regressions) — the _process_ hole that let them rot is filed as M11.
- **Untested surfaces after this review:** no lane exercises `showDiff()` (which is how B1 shipped), the tjs packaging invariant (M5), the iframe execution branch, or `tjsEditorExternal()`. All filed.
- **`package.json` is still `1.6.21`** — the version bump, CHANGELOG, and tag are the last steps and must follow the blocker fixes (bump → build → commit, so `version.ts` is included).
- **Deliberately not decided here:** whether the 386KB-gz iife is acceptable (B2) and whether CodeMirror should be a hard dep (M2) are maintainer calls. The review blocks only on the fact that the shipped documentation currently asserts the opposite of both.
