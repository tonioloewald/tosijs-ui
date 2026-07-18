# TODO

## Doc-System Roadmap

See [doc-system-roadmap.md](doc-system-roadmap.md) for the full plan. North star:
each library is a web-accessible doc-system endpoint (library-as-ESM + docs +
authoring), with **tjs-lang** as the live-example transpiler, the **tosijs-ui doc
system** as build/docs/front-end, and an **AJS-VM universal endpoint** as the
back end. Sequence: `./docs` subpath refactor → #6 tjs+CodeMirror → #5 haltija
widget → #4 edit source → #3 save/load examples → #1 ePub → #2 PDF. Phase-2:
importmap example resolution, versioned endpoints, AJS RestStore.

## High Priority

### From the 1.7.0-beta.3 nine-lens review (`RELEASE-REVIEW-1.7-beta3.md`)

Full report in that file. Recommendation was **BLOCK** on one finding, now **fixed**:
- [x] **BLOCKER FIXED** — eager static `tjs-lang/editors` import + scope-capture on every reader
      example. Now a dynamic import gated to `dialect!=='js' && editorsBuilt`; optional-peer contract
      restored, scope code is a lazy 1.3KB chunk fetched only at edit-time.

Non-blocking follow-ups (do before the FINAL 1.7.0 tag):
- [x] **CHANGELOG** — added `1.7.0-beta.3` section, fixed the peer line to `^0.10.1`, annotated the
      beta.2 "Remaining… defers construction" note as delivered.
- [x] **CLAUDE.md/MEMORY.md `haltija@latest` → `^1.4.0`** (code pins `HALTIJA_PKG=haltija@^1.4.0`).
- [ ] **DECISION: breaking `<tosi-code>` under a MINOR bump.** `^1.6` consumers auto-update into the
      ACE→CM break. Deliberate + documented (tosijs 2.0 sequencing) — ratify explicitly and make the
      semver deviation loud atop CHANGELOG + README, or go 2.0.0. Confirm before the final tag.
- [x] **`el.editor` getter warning** — downgraded to `console.info`, leads with "it IS the supported
      CM6 accessor" so correct use isn't scolded.
- [ ] **CI e2e is Chromium-only** (`.github/workflows/ci.yml`) — the headline browser features have no
      automated Firefox/WebKit gate (only the manual local lane, which "rots silently"). Add a Firefox
      project OR a release-checklist step that fails if all-project `bun playwright test` wasn't run.
      Also: the 4 new specs `test.skip` WebKit unconditionally — track that permanent gap.
- [x] **`killStrayServer` kill receipt** — now logs SIGTERM → pid/comm/port (and SIGKILL escalation).
- [ ] **ePub build is non-deterministic** — re-zips with varying bytes, so the build-then-`git diff`
      staleness gate can't be clean. Fixed mtimes/ordering, or exclude the path from the gate.
- [x] **DRY: `gzipSizeInChild`** extracted (orchestrator, was inline ×2).
- [ ] **DRY (remaining):** extract one `runBunChild(argv)` owning the drain-both-pipes invariant
      (orchestrator ×2 + bundle-guard — the leak class this release fights); extract
      `prepareExecutable()` shared by executeInline/Iframe (touches the core run path — do carefully).
- [x] **`demo/src` dead-entry tangle — RESOLVED via option (a).** `<tosi-css-var-editor>` was dead in
      the build (only registered by the un-built `demo/src/index.ts`). Moved it into the doc-system
      (`src/doc-system/css-var-editor.ts`), registered via a side-effect import in `doc-system.ts` (NOT
      a public export), fixed its rgb-color detection + unbounded retry, and deleted the whole dead demo
      entry. Live on the component pages now (verified on /carousel/).
- [x] **#13 `<tosi-map>`** — fixed (one map, not one per render during CDN load) + regression test.
- [x] **#8 hydration console errors** — verified fixed by the 1.6.9 parts adoption, closed, guarded
      (`hydration.pw.ts` console-clean test).
- [x] **#15 ePub cross-links** — fixed (`rewriteInBookLinks`), closed, 6 unit cases + real-ePub verified.
- [ ] **GitHub issues + `UPSTREAM.md` (ecosystem), remaining:** #14 (throwing example — PARTIAL:
      `check-examples` compiles but never *runs*, so a `ReferenceError` in a mislabeled `js` snippet
      still passes a consumer's build; only the doc-test lane catches it); #9 (document the
      cinematic-landing-page pattern — content-bound); file a GH issue for the WebKit doc-test-runner
      skip; keep bun#34053 note current (native-leak shell-out now spans 4 sites). **#12** (language-
      plugin hooks) is the strategic platform work, not a cleanup — see the platform sequence below.
- [ ] **Shared `tosijs-coding-practices` (practices lens):** `testing.md` Playwright "server already
      running" claim is now FALSE (this release inverted it — dedicated port 8799, `reuseExistingServer:false`);
      `00-stack.md` zero-runtime-dep rule contradicted by 12 `@codemirror/*` runtime deps (add a
      Known-divergences entry — an agent reading the KB would demote them to peers and break tjs
      highlighting); add the "never scope the suite with a glob" lesson; add a lens-7/8 write-back
      receipt requirement; `README.md` "eight-lens" → "nine-lens".



- [x] **Bumped tjs-lang 0.9.1 → 0.10.1** (2026-07-17, memory-storm fix). All three refs in lockstep
      (package.json dev+peer, `TJS_VERSION`). Required the inline-WASM guard update (0.10.x renamed
      the compiled export `__tjs_wasm_0` → collision-free `__tjs_wasm_<hash>_<n>`, tjs-lang#11 — guard
      now matches by pattern). #12 hand-roll deleted (`TjsAutocompleteConfig` → real `AutocompleteConfig`
      from `tjs-lang/editors/codemirror`, `import type` so zero bundle cost). All lanes green
      (unit + doc-tests + full Playwright).
      - [ ] **Still watch RSS over a real multi-day watch session** — the storm being gone is the whole
            point of the version; builds/lanes alone don't exercise a long-lived process.
      - [x] **#10 scope scanner deleted** — replaced ~272 lines (`extractTopLevelBindingNames` +
            `buildScopeCapture` + helpers) with `scopeCaptureEpilogue` from `tjs-lang/editors`. The
            "acorn bloat" worry was WRONG: that entry is a self-contained ~5KB file (no acorn), so the
            static import is negligible (hydrate 121.9→121.8KB gzip). Verified via `scope-autocomplete.test.ts`.
      - [ ] **#16 `tjsEditorExternal` — leave as belt-and-suspenders.** 0.10.x declares the
            `@codemirror/*` optional peerDeps, so the hard-fail it guarded is gone, but keep the probe
            until an isolated-tree build is actually verified without it.

- [ ] **RFC: language-plugin registry for live-example (tosijs-ui#12, from the tjs-lang side).**
      Invert the hardcoded `js|ts|tjs` dialect switch in `code-transform.ts` into a plugin
      contract (`transform`+diagnostics, optional `run`, optional output `panels`) so tjs-lang can
      register its AJS playground without tosijs-ui depending on `tjs-lang/vm`. The abstraction is
      only real if js/ts/tjs re-express as built-in plugins. A design task — coordinate with the
      language-plugins direction in doc-system-roadmap.md. Consumes tjs-lang#20 (TFS import
      resolver) + #18 (worker-ready WASM).

- [ ] **Remote dev-server access — one-command tunnel spike (queued after M10; the "dynamic DNS"
      ask).** Where we landed: a reverse **tunnel (`cloudflared`)** beats port-forward + dynamic
      DNS — no router/firewall changes, works behind CGNAT, HTTPS + a stable hostname for free, and
      nothing inbound is exposed. Spike a one-command `cloudflared tunnel` in front of the dev
      server with auth (Cloudflare Access, or Basic-Auth at the edge). If it's clean, productize as
      a `devServer` `remote: { tunnel, auth }` option so any tosijs-ui doc-system project gets
      "share what I'm working on" for free. **Never expose the dev server directly** (it shells out
      to `bun build`, reads the process table, binds ports — see the machine-health guards).

### From the 1.7 nine-lens review (`RELEASE-REVIEW-1.7-pass3.md`)

- [x] **M8 — gate the inline doc tests (incl. the inline-WASM guard) in CI.** ✅ DONE via
      **`tests/doc-tests.pw.ts`**: it navigates to `/`, awaits `window.__docTestResults` (the
      doc-browser's background runner iframes every page-with-tests on localhost and resolves it
      with the totals), and asserts `failed === 0`. Runs in the existing e2e job
      (`playwright test --project=chromium`) with **zero haltija** — so the WASM guard is behind
      the release gate for the first time. Also hardened the interactive haltija lane
      (`bun run test-browser`): the start-timeout path now calls `stopHaltija()` (was the naive
      `haltija.kill()` that leaked the Electron grandchild and poisoned the next run), and it
      adopts a *reachable* haltija regardless of window count (no more racing a second instance
      next to a zero-window one).
      **Residuals (minor):** (a) WebKit is skipped in `doc-tests.pw.ts` — its iframe runner never
      posts per-page `tosi-tests-done`, so pages wait out the 30s per-page timeout and the corpus
      blows past budget; investigate the WebKit postMessage/iframe path. (b) `bun run test-browser`
      still **reuses/navigates a running haltija** (hijacks whatever window is open, another
      project's session included) — the clean fix is a dedicated instance via
      `HALTIJA_REGISTRY_DIR`/`--name` so it never touches the user's session. `doc-tests.pw.ts`
      already sidesteps both by using an isolated Playwright browser.

- [~] **M10 — the IIFE tripled: 121KB → 388KB gzip, ~100% CodeMirror.** HALF 1 DONE.
      The doc-site build now emits an **ESM `--splitting` hydration bundle** (`hydrate.js` + hashed
      chunks) that the served pages load as `<script type="module">`; `dist/iife.js` (classic) is
      kept for the CDN `<script>` path. Result: the always-loaded entry is **122.7kb gzip** (was
      388kb), and CodeMirror rides a lazy chunk. The tjs CM extension stays bundled and splitting
      preserves the shared single `@codemirror/state` (it and `code-editor-cm` import the same
      shared chunk). Verified: 41 Playwright green, pages hydrate via the module, editors work when
      loaded. **A page with no code examples now ships zero CodeMirror** — the headline case.
      **HALF 2 REMAINING — self-contained examples (bake the transpiled JS into the page).**
      Chosen approach, fully designed in [`self-contained-examples-plan.md`](self-contained-examples-plan.md).
      Supersedes the earlier "defer editor construction" idea: baking removes BOTH CodeMirror AND the
      tjs transpiler from first paint (deferring only editors still loads tjs to run a `tjs` preview),
      and makes a saved example runnable with zero runtime deps. The bake artifact is exactly what
      `check-examples` already computes per block; embed it as a hidden non-executing
      `<script type="application/tosi-transpiled">` co-located with the `<pre>`, keyed by source text.
      Four committable slices (build-side inert → runtime consume → defer editors → save). **Slices 1
      and 2 DONE:** tjs examples bake into hidden scripts and RUN from them on the reader path, and
      `loadTransform('js')` is now identity — so a reader page runs all its js+tjs examples with the
      tjs transpiler never requested on first paint (verified by a reader-path Playwright test + the
      doc-tests lane). **Slice 3 DONE too:** the `<tosi-code>` panels build lazily on first
      showCode (via `ensureEditors()`, not `content()`), so a reader page loads NEITHER the transpiler
      NOR CodeMirror on first paint — the M10 goal. Verified by a chunk-not-loaded-until-showCode
      Playwright test + the full 17-spec lane. **Slices 2b + 4 DONE:** 2b groups bakes per doc and
      attaches them to each Doc in `docs.json` (SPA-nav runs baked tjs examples too; only the 1 doc
      with tjs examples carries bakes, the other 56 add zero bytes). Slice 4 makes `refresh()` run a
      bake only while it matches the current source (an edit drops the stale bake and transpiles),
      and persists the transpiled code with a saved local edit so a restore runs transpiler-free.
      **M10 half 2 is COMPLETE.** **Do NOT gate the editor
      on "does this corpus have code examples"** — the doc system is an _authoring_ system; prose/book
      sites need the editor most.

- **Doc-system: pre-render the chrome, hydrate in place — and drop the opacity gate.**
  Generated pages currently hide the whole body (`body{opacity:0}`, 4s safety-net timeout)
  until the bundle hydrates, because hydration injects the entire chrome (an undefined custom
  element is `display:inline`, so the un-upgraded page stacks as bare text) and collapses each
  example's `js`/`test`/`css` blocks into one live-example. That reflow is why the gate exists.

  **The markup is already all there** — nav tree, header, content, code blocks, `<tosi-doc-system>`
  host; a component page is 9.5KB of HTML. What's missing is CSS for the _un-upgraded_ state.
  Fix: a **size-gated layout** that tucks the unhydrated body into a scrolling rectangle
  positioned as though the header and (on wide viewports) the sidebar were already there —
  `tosi-doc-system:not(:defined)` + its light-DOM children, in the burned static stylesheet.
  Hide the non-`js` blocks and reserve the preview's space so live-example replacement is
  in-place. Then hydration is purely additive, nothing moves, and the gate can go.

  Why it matters (measured on the built site, gzipped, CPU-throttled — 6x ≈ mid Android,
  12x ≈ cheap phone / Pi4). "Visible" = the gate lifting, i.e. blank-screen duration:

  | device                     | 1.7 (387KB gz)                    | editor-free (121KB gz) |
  | -------------------------- | --------------------------------- | ---------------------- |
  | laptop, fast wifi          | 685ms                             | 505ms                  |
  | mid Android, 4G            | 1976ms                            | 1316ms                 |
  | cheap phone / Pi4, slow 4G | 4532ms                            | 3667ms                 |
  | cheap phone / Pi4, 3G      | 4837ms — _hits the 4s safety net_ | 4831ms — _ditto_       |

  Note the 3G row: hydration loses to the safety net, so the reader gets 4s of blank **and**
  the un-hydrated flash anyway. The gate only pays off while hydration is fast. With the chrome
  pre-rendered, content is readable at FCP (~300–500ms) on every device, and the bundle gates
  _editing_ rather than _reading_.

  Do NOT just delete the gate: that trades a clean blank→hydrated (2 states) for
  blank→dead-page→hydrated (3 states) for everyone, i.e. a flash of content that then shifts.

- **Split the editor out of the hydration bundle** (pairs with the above). The editor stack is
  **66% of the bundle**: `@codemirror/*` (1061KB src), `@lezer/*` (384KB), `acorn` (296KB — it
  arrives via the tjs _autocomplete_ extension, not the transpiler), + the tjs CM extension. The
  transpiler is already external (`tjs-lang/browser`, fetched at runtime), so **live examples
  would still run** — only the code _panels_ need CodeMirror. The lazy boundary
  (`import('./code-editor-cm')`) already works under ESM; only `--format=iife` can't split.
  Two halves: (1) emit the hydration bundle as ESM + `--splitting` + `<script type="module">`,
  keeping the IIFE for the CDN path (`bundle-guard`'s classic-script check must go module-aware);
  (2) defer editor _construction_ until a code panel is first shown — otherwise live-example
  eagerly builds 4–5 hidden editors per example and pulls the chunk anyway.

- **Diff view: allow reverting changes from it.** `<tosi-code>`'s `showDiff(on)` overlay
  (`src/code-editor.ts` → `tosi-diff`) is read-only — you can see what changed against the
  baseline but not act on it. Let the reader revert from the diff: per-hunk revert at minimum,
  and revert-all. This is the review step of the doc-system's edit-and-save-to-source flow, so
  "I see the change and I don't want it" currently means retyping it by hand.
- **JSON Schema-driven form editor** - Integrate schema-based form generation
- **Doc-system: expose customization of the app/settings menu** — The `<tosi-doc-system>` settings button (the moreVertical/gear menu, `settingsButton()` in `src/doc-system/doc-system.ts`, `title="settings"`) builds its `menuItems` array inline (Print as PDF, Download ePub, Language, Color Theme, …). There's currently no public API for a doc-site consumer to add, remove, reorder, or override these items. Add a way to customize it — e.g. a `SiteConfig` hook or a `menuItems` prop/callback that receives the default items and returns the desired set — and surface/document it in `doc-site-system.md`.

## Book / prose adoption (from `falling-forward`, 1.6.15)

The doc-system assumes a **code library with a `src/` tree**; a book has no code,
uses different Markdown, and needs a _curated book artifact_, not just a site.
Full write-up in the adopter's `TOSIJS-UI-FEEDBACK.md`.

**Done (quick wins):**

- ✅ #4 Auto-serve `/iife.js` when `bundleEntry` is omitted (copy tosijs-ui's own
  iife into the output, version-matched) — pure-docs sites hydrate out of the box.
- ✅ #7 Skip `_`-prefixed scaffolding files (`_template.md`, `_drafting-log.md`).
- ✅ #12 Empty metadata `title` falls back to the H1 (was blanking nav entries).
- ✅ #6 Warn when no ePub cover is generated (@resvg/resvg-js missing); title-only
  cover already works when it's present.

**Batch A done (rendering pipeline, syntax-activated → safe default-on):**

- ✅ #2 **YAML frontmatter** — `parseFrontmatter` in docs.ts parses & strips a
  leading `---…---` block, maps `title`/`order`/`author`/`date`/`draft`→hidden;
  frontmatter wins over JSON-comment metadata; empty title falls back to H1; a
  bare `---` rule is left alone.
- ✅ #5 **Wikilinks** `[[slug]]` / `[[slug|label]]` → `/slug/` (marked inline
  extension; not matched inside code spans). _First cut resolves by slugifying the
  target; a real corpus-basename match + unknown-target handling is a follow-up._
- ✅ #1 **Footnotes — ePub/web first cut**: `[^id]` refs (numbered by appearance)
  - `[^id]: def` collected into an endnotes `<section>` with backrefs (marked
    extensions). _Still TODO: page-anchored footnotes w/ cross-refs — a
    **print-to-PDF** feature (browser Print path, not a batch job): build the full
    DOM, compute pagination, then settle page numbers + footnote positioning by
    pushing content across page boundaries (roadmap "measured rectangles"). Also:
    multi-line/paragraph footnote definitions._

**Batch B done (curation, overlay-on-defaults):**

- ✅ #3 **First-class "book" corpus** — `book: BookManifest` in site config
  (`src/doc-system/book-manifest.ts`, pure + unit-tested). Curates/reorders the
  book artifact WITHOUT touching site nav (one source, two outputs). Zero-config
  = whole visible corpus (unchanged). `include`/`exclude` globs select docs;
  `order: [...]` names the lead sequence (front/back matter are just docs you
  name); `sort: 'filename'` gives a folder of chapters natural order with no
  metadata. Identity (title/author/cover) still comes from `epub`. It never adds
  a new ordering mechanism — it overlays each doc's `order` so the shared
  buildNavTree/flatten sequences the book (pins/parents still apply). Applied in
  `buildEpub`; **print path (buildBookHtml, client Print button) still uses the
  whole corpus** — wire the manifest there when print/PDF pagination lands.
  _Deferred: a content-author YAML manifest file (`_book.md`) as an alt to the
  typed config — per-doc frontmatter already covers per-doc metadata._

**Queued — P1:**

- #14a **Smart typography** (curly quotes / en-em dashes / ellipsis) — deferred
  from Batch A: unlike wikilinks/footnotes it rewrites ALL prose, so it must be
  **opt-in** via config (pairs with #9's `kind: 'book'` preset; needs config
  threaded to `renderDocMarkdown`).

**Queued — P2:**

- #8 Order by filename/path within a section (natural sort), `order` as override.
- #9 A `kind: 'book' | 'library'` preset with sane content-project defaults
  (no `src/`/`demo/` assumptions).
- #10 Folder structure implies nav sections (`chapters/book-1/*` → "Book 1").

**Queued — P3:**

- #11 Friendlier metadata entry (the planned metadata UI, or #2's YAML).
- #13 Optional built-in epubcheck (or a documented validation pass).
- #14 Smart typography (curly quotes, en/em dashes, ellipsis) opt-in; word-count
  / reading-time per doc + total.

## Example captures (live-example → static images)

Design landed; not built. See **"Example captures"** in
[doc-system-roadmap.md](doc-system-roadmap.md). Capture is _exhaust from normal
dev_: embedded **private haltija** (per-app socket, beta 10) holds a single
`getDisplayMedia` stream and `grabFrame()`s on demand (crop to the example rect),
so testing/posing an example self-captures; haltija puppeting fills gaps. Manual
captures are sticky; organic ones refresh only when the example's **code hash**
changes. One asset, three consumers: **ePub images**, **no-JS / pre-hydration
placeholder**, optional ePub cover hero. Builds on `ExampleKey` + the dev-write
endpoint (Foundations B/C). Depends on **#5 (haltija-in-dev widget)** landing the
private-mode socket first.

**Book ↔ live-site fidelity ladder** (phase-2, greenlit) — one example source, three
tiers: (1) static captured image + code (every reader); (2) each book example
**deep-links to its anchored spot on the live site** (ePub/PDF link + **QR for
print**), version-pinned `/v{version}/{slug}/#{id}`, stable `id=` fences not
ordinals; (3) **inline interactive** in Apple Books / Readium via scripted EPUB3
(`properties="scripted"`, pre-transpiled + inlined, image fallback — NOT the dead
iBooks Author format). Needs per-example **anchors + scroll-to/highlight on the
live site** (independently useful). See roadmap "From book to live."

## Live examples

- **Fully-isolated example option (future, not default).** Live examples run inline
  on the shared page by default — deliberate: it shows off tosi's isolation and lets
  you drive demos through the global singleton. The `iframe` attribute isolates
  DOM/CSS but NOT tosijs state (the `tosijs`/`tosijs-ui` modules injected into the
  iframe are the host page's instances, so `tosi()` singletons stay shared). A
  _totally_ isolated mode — separate module realm so `tosi()` state and imported
  deps are sandboxed too — would follow tjs-lang's playground approach: a **service
  worker intercepting dependency imports**. Worth offering eventually as an opt-in;
  the shared-page default stays the right behavior for real examples. Documented +
  warned about in the `<tosi-example>` doc ("How examples run") and surfaced in
  llms.txt.

## Medium Priority

- **Vector similarity search for doc-browser** - Replace current search with vector-based approach
- **Focus management and focus-visible styling** - Improve keyboard navigation and focus indicators

## Localization

- Adding automatic localization where appropriate:
  - `<tosi-password-strength>`
  - `<tosi-tag-list>`
  - `<tosi-filter>`

## Components

### `<tosi-b3d>`

- Converting this to a blueprint

### `<tosi-filter>`

- Leverage `<tosi-select>` for picking fields etc.
- Leverage `<tosi-tag-list>` for displaying filters compactly
- Leverage `popFloat` for disclosing filter-editor

### `<tosi-editable>`

- Add support for disabling / enabling options
- Hide lock icons while resizing
- Maybe show lines under locks indicating the parent
- Support snapping to sibling boundaries and centers

## Build System

- **Built-in custom icon generation for `tosijs-ui/site`** — currently a consumer
  generates an icon module with the shipped `tosijs-make-icons` CLI and registers
  it via `defineIcons` in their bundle entry. Make it first-class: export
  `generateIconData({ input, output })` from `tosijs-ui/site` (refactor
  make-icon-data's core into an importable function, CLI as a thin wrapper) so it
  can run from a doc-site `prebuild` hook with no shelling out. Possibly a config
  field (`icons: { input, output }`) that the orchestrator runs automatically.
- ~~Better leveraging of tree-shaking~~ (unbundled ESM output, sucrase as peer dep)
- **Migrate CDN-loaded libraries to peer deps** — now that ESM output is unbundled, these can be normal imports (tree-shaken when unused):
  - `<tosi-code>` — replace ace editor with CodeMirror. **Now a green-lit 1.7 effort** (potentially breaking) — also brings first-class tjs in live examples (highlighting + runtime-value autocomplete via tjs-lang's `editors/codemirror` export) and inline-WASM examples (runtime already works — spiked). Plan + viability + effort in [codemirror-tjs-1.7-plan.md](codemirror-tjs-1.7-plan.md). Better touch support is a bonus (ACE is painful on touch devices).
  - `<tosi-b3d>` — `@babylonjs/core` as optional peer dep (currently loads via `scriptTag` from CDN)
  - `<tosi-lottie>` — `lottie-web` as optional peer dep (currently loads via `scriptTag` from CDN)
  - `<tosi-map>` — `mapbox-gl` as optional peer dep (currently loads via `scriptTag`/`styleSheet` from CDN)

## Completed

- ~~Add unit tests for components~~
- ~~Add accessibility (ARIA) attributes to components~~
- ~~xin → tosi rename (all exports, classes, tags, interfaces)~~
- ~~Drop menu support (`popDropMenu`, `hideDisabled`, dynamic `menuItems`)~~
- ~~Drag-and-drop MutationObserver for dynamic drop targets~~
- ~~Agent-based QA using Haltija~~ (`bun run test-browser`)
