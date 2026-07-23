# Changelog

## Unreleased (1.7.1)

- **Deprecation cleanup: `on<Event>` component callbacks → `handle<Event>`.** tosijs reserves the
  `on<Event>` prefix for elements-factory event-handler sugar and now warns when a component
  *defines* such a property. Renamed the internal ones: `onResize` → `handleResize` (`size-break`,
  `side-nav`, `code-editor`, `babylon-3d`, `tab-selector`) and `onScrollEnd` → `handleScrollEnd`
  (`data-table`). Verified: those pages now load with zero `on<Event>` deprecation warnings.
  (`<tosi-tabs>`'s public `onCloseTab` still uses the old name — a breaking rename deferred to a
  deprecation-alias pass; and the `tosiValue()`/`tosiPath()` accessor deprecation is a separate,
  larger cleanup — both tracked.)

- **CSS canary** — an inline doc-test on the `live-theme` page that smoke-tests the whole
  styling chain in a real browser (`StyleSheet()` → the `vars` proxy → scaled-var `calc()` →
  `createTheme`/`applyTheme` → cascade → `getComputedStyle`), plus a theme color-change
  propagating to computed style, dark-mode luminance inversion, and `Color.inverseLuminance`.
  Each link is silent when it breaks (happy-dom can't resolve `var()`/the cascade), so a red
  now means a system-level CSS break, not a component quirk. Runs in the `doc-tests.pw.ts` CI
  gate.

## 1.7.0

> ### ⚠️ BREAKING CHANGE — `<tosi-code>` moved from ACE to CodeMirror 6
>
> This is a **breaking change shipping under a minor version**, deliberately. `<tosi-code>`
> (and the `<tosi-code>`-backed code panels in live examples / the doc browser) is now a
> CodeMirror 6 wrapper instead of ACE. The public contract that **survives** is unchanged:
> `value`, `mode`, the `change` event, `disabled`, and `undo`/`redo`. What is **removed**:
> the ACE-era **`theme`** and **`options`** props — there is no compatibility shim for them
> (CodeMirror's theming model is different in kind, so a shim would silently no-op). If you set
> either, migrate: dark mode is now automatic (driven by `body.darkmode`), and editor styling
> comes from the `--code-bg` / `--text-color` CSS variables. The `editor` property now exposes
> a CodeMirror `EditorView` rather than an ACE editor.
>
> **Why a minor, not 2.0.0:** the `2.0` name is reserved for the tjs-native tosijs port that
> follows tosijs 2.0; spending it on an editor swap now would missignal that larger change.
> The deviation from strict semver is intentional and called out here + in the README. **To
> defer the change, pin `tosijs-ui@1.6`.** Everything else in 1.7.0 is additive.

The headline: the editor became first-class for **tjs** and **WebAssembly**, and doc pages got
dramatically lighter — a reader loads a page with **neither the tjs transpiler nor CodeMirror on
first paint**, both arriving only when a code panel is opened to edit.

### CodeMirror 6 editor (replaces ACE)

`<tosi-code>` is a CodeMirror 6 wrapper. The heavy CM code (`code-editor-cm.ts`) is a **lazy
chunk** loaded on first edit — for ESM/bundler consumers a page with no editor bundles none of
it. (The IIFE build cannot code-split, so the CDN `<script>` path still inlines it.) Modes:
`javascript`, `typescript`, `tjs`, `ajs`, `css`, `html`, `markdown`. New: `undo()`/`redo()`/
`canUndo()`/`canRedo()`, `showDiff(on)` (diffs against a captured baseline via `tosi-diff`), and
automatic dark mode via a `highlight` compartment + a `body.darkmode` observer.

### First-class tjs + inline WebAssembly in live examples

`tjs`/`ajs` example blocks get tjs-lang's CodeMirror language + **runtime-value autocomplete**
(completion resolves the live values of an example's locals). Inline `wasm{}` examples run — the
WASM kernel actually compiles, guarded in CI so a silent fall-back to JS is caught. tjs-lang
bumped **0.9.0 → 0.12.0** across the release (memory-storm fix in 0.10.1; import-resolver in
0.11.0; VM security-review fixes in 0.12.0).

### Self-contained, transpiler-free example pages

Each `tjs` example is transpiled **at build time** and its JS baked into the page as a hidden,
non-executing `<script type="application/tosi-transpiled">`; the example runs from that bake, so
no transpiler loads for a reader. The bakes ship per-doc in `docs.json` too, so client-side
navigation gets them at zero extra first-paint cost. Editing an example drops the bake and loads
the real transpiler + editor on demand; saving keeps the transpiled JS.

### Live examples can import real npm packages (experimental)

With `importResolver` enabled, a live example can `import` any npm package — resolved through a
same-origin service worker (tjs-lang's import-resolver). Three execution modes are flaggable on
the fence: `inline` (default), `iframe` (DOM/CSS isolation), `ide` (recognized; iframe path for
now). Fence grammar is order-free: `` ```ts:ide#demo `` and `` ```ts#demo:ide `` both parse.

### Doc-system & build

Pre-rendered, hydrating doc pages (the chrome renders server-side and hydrates in place — no
opacity gate on first paint). The hydration bundle ESM-splits CodeMirror off the critical path.
Machine-safety guards for the long-lived dev server: an RSS ceiling, an 8-hour idle exit, and a
preflight that refuses to build on an already-dying machine (Bun's `Bun.build()` native leak,
oven-sh/bun#34053, is worked around by shelling out to the `bun build` CLI). A live
`<tosi-css-var-editor>` on component pages. Nested `<tosi-doc-system>` instances no longer share
state (each gets its own observable registry key).

### Peers

`tosijs` peer floor `^1.7.0` — the 1.7 line is a co-released, lockstep stack, and this is the
version tosijs-ui is built, tested, and (in the iife) bundled against; we don't verify against
older tosijs, so the declared floor matches what's actually tested. `tjs-lang` `^0.12.0` — a lazy, optional
peer (a plain component consumer never pulls it in). `@codemirror/*` are the only hard runtime
dependencies (a deliberate divergence from the zero-runtime-dep rule; they must share one
`@codemirror/state` instance).

---

_The beta changelogs below are retained for detail; 1.7.0 consolidates betas 1–5 + rc.1. Built on tosijs 1.7.0._

## 1.7.0-beta.3

**Self-contained examples, and CodeMirror + the tjs transpiler are now edit-time only.** A
reader loading a doc page — directly or via client-side navigation — runs every example with
**neither the tjs transpiler nor CodeMirror on first paint**. Both load only when you open a
code panel to edit.

Still a beta under the `beta` tag (`latest` stays 1.6.x): `npm i tosijs-ui@beta`.

### Examples run without the transpiler

Each `tjs` example is transpiled at build time and its JavaScript is baked into the page as a
hidden, non-executing `<script type="application/tosi-transpiled">`; the example runs from that
bake. Plain `js` examples need no transpiler at all (`loadTransform('js')` is now identity). The
bakes also ship per-doc in `docs.json`, so client-side navigation gets them too — at **zero
added bytes for prose/book sites** (only docs with code examples carry bakes). Editing an
example drops the stale bake and transpiles on demand; a saved local edit keeps its own
transpiled code so it reloads without the transpiler.

### CodeMirror panels build lazily

`<tosi-example>` no longer constructs its `<tosi-code>` panels up front (this delivers the
beta.2 "Remaining" note above): the panel — and the CodeMirror chunk — is built on first
`showCode`. A page with examples now ships zero CodeMirror until a reader opens a panel.

### tjs-lang 0.9.1 → 0.10.1

Bumped the transpiler, **skipping 0.10.0** (it triggered a memory storm rooted in a bun bug;
0.10.1 carries the fix). 0.10.x closed four upstream issues, letting this release **delete ~272
lines** of hand-rolled scope-scanning and a hand-declared autocomplete-config type in favor of
tjs-lang's own exports. The inline-WASM guard was updated for 0.10.x's renamed compiled export.

- `tjs-lang` peer: `^0.9.1` → `^0.10.1` (and the `TJS_VERSION` CDN-fallback pin, in lockstep).

## 1.7.0-beta.2

The code editor moved from **ACE to [CodeMirror 6](https://codemirror.net/)**, `tjs`
became a first-class editing mode with runtime-value autocomplete, the doc-site builder
gained the hooks that unblock the tosijs 2.0 TJS port — and generated doc pages are now
**readable before any JavaScript runs**.

**A beta, published under npm's `beta` tag** — `latest` stays on 1.6.x. A prerelease is not
matched by `^1.6.x` (or by `^1.7.0`), so nobody is auto-upgraded into the editor swap; you get
this only by asking for it:

```
npm i tosijs-ui@beta        # or tosijs-ui@1.7.0-beta.2
```

### Doc pages no longer wait for the bundle

Generated pages used to hide the body (`opacity: 0`, with a 4s safety-net timeout) until
hydration, because hydration injected the whole page chrome and the reflow would have been
ugly. **That gate is gone.** The chrome is pre-rendered, so the page is styled, readable and
navigable — real `<a>` links, real headings — before a byte of JS executes, and hydration is
purely additive: nothing moves.

Measured on the built site, gzipped, CPU-throttled — blank-screen duration:

| device                     | before                           | after      |
| -------------------------- | -------------------------------- | ---------- |
| cheap phone / Pi4, slow 4G | 4532ms                           | **1635ms** |
| cheap phone / Pi4, 3G      | 4837ms — _hit the 4s safety net_ | **1635ms** |

The bundle now gates **editing**, not **reading** — which was the point.

Two regressions against that promise were caught in review and fixed here: the nav was styled
by two hand-copied rule sets that had drifted (so it reflowed ~4px per row on hydration), and
the page `<title>` was derived twice (so the home page flipped from its real title to
`tosijs-ui — tosijs-ui`, [#6](https://github.com/tonioloewald/tosijs-ui/issues/6)). Both are
now single, shared rules, and `tests/hydration.pw.ts` asserts that a no-JS page and a hydrated
page agree — geometry, styling and title.

### Doc pages no longer ship CodeMirror to readers who don't open an editor

`dist/iife.js` can't code-split (bun's IIFE format), so `<tosi-code>`'s lazy `import()` is
flattened in — CodeMirror + lezer + acorn on every page whether or not it has an editor
(121KB → 388KB gzip). The generated **doc pages now load an ESM `--splitting` hydration bundle**
(`<script type="module">`) instead: the always-loaded entry is **~123KB gzip** and CodeMirror
rides a lazy chunk pulled only when an editor mounts. The tjs CM extension stays bundled, and
splitting preserves the shared single `@codemirror/state`. **`dist/iife.js` is unchanged and
still shipped for the CDN `<script>` path.** So a **pure-docs / book site with no code
examples now ships zero CodeMirror** — the case that was hurt worst.

Remaining (tracked in `TODO.md`): a page that DOES have live examples still eager-loads the
editor chunk, because `<tosi-example>` builds its code panels up front even while hidden. The
next step defers that construction until the reader opens a panel; the example still runs (the
preview and inline tests don't need the editors) — only the code view waits. **(Delivered in
1.7.0-beta.3 — see below.)**

### Dev-server safety (also in 1.6.23)

A leaking dev server took a machine down twice. The guards, all in `tosijs-ui/site`:

- **Machine-health preflight** before every build and dev-server launch: refuses to add load to
  a machine that is already dying, and names the offending PIDs, sizes, ages and project dirs.
  `preflight: 'fail' | 'warn' | false` in the site config; `DEV_SKIP_PREFLIGHT=1` to skip. Warns
  rather than refuses in CI.
- **`idleTimeoutHours` (default 8)** — ⚠️ **a behavior change**: your dev server now exits after
  8 idle hours (no request, no rebuild). A forgotten dev server is not inert — it is a days-old
  process still running the code it loaded at launch. Set `idleTimeoutHours: 0` to disable.
- **RSS ceiling** (`memoryLimitMb`, default 4096) sampled every 60s, not just after a rebuild.
- **Rebuild-loop detector** — a build that writes a file it also watches now stops, and names
  the file, instead of spawning a bundler forever.
- The example check, the ePub build, and the bundle gzip all moved into **child processes**;
  `Bun.build()` strands ~30MB of native arena per call ([oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053), still open).
- **`killStrayServer` no longer `kill -9`s every process _connected to_ the dev port** — it used
  `lsof -ti:PORT`, which matches clients as well as the listener, so it could kill your browser.
- haltija is spawned as a **pinned range** (`haltija@^1.4.0`, override with `HALTIJA_VERSION`),
  not a floating `@latest`, and its teardown kills only its own process tree. The 1.4.0 floor
  is deliberate: it is the first haltija that routes `hj` by working directory, never overwrites
  a newer machine-wide `hj`, and exits non-zero on a failed command — so a project's dev server
  drives its own browser and can't silently downgrade another project's CLI.

### Breaking

`<tosi-code>` (ACE → CodeMirror 6). Each removed member now **warns once and no-ops**
rather than failing silently, but they are gone:

| removed                           | replacement                                        |
| --------------------------------- | -------------------------------------------------- |
| `theme` attribute                 | style the editor with `--code-bg` / `--text-color` |
| `options` property (ACE-shaped)   | configure via `editor` (a CodeMirror `EditorView`) |
| `ace` getter                      | there is no ACE global; use `editor`               |
| `editor.session.getUndoManager()` | `undo()` / `redo()` / `canUndo()` / `canRedo()`    |

**`editor` changed type in place** — it was an ACE `Editor`, it is now a CodeMirror
[`EditorView`](https://codemirror.net/docs/ref/#view.EditorView). A grep for the removed
names will not catch this, and the warn-once shims above **cannot** catch it either: the
property still exists and still returns an object; it is simply a different object. So
**`editor` now warns once on first access**, naming what moved — one line in the console
beats a `TypeError` from inside a library you have never opened. TypeScript users get a
compile error instead (1.6 typed it `any`; 1.7 types it `EditorView | undefined`).

**`change` now means the _user_ changed it.** The event is new in 1.7, and it fires only
on user edits — a programmatic `el.value = doc` (loading a document) does not fire it, and
neither does writing into a `disabled` editor. Without that, every app that populates an
editor would record a spurious save/dirty-flag on open. Programmatic sets are also not
undoable: loading a document is not an edit to Ctrl+Z back out of.

Unchanged: `value`, `original` / `showDiff()`, `mode`, `disabled`.

**tosijs floor is now `^1.6.9`.** 1.6.9 fixes the `parts` proxy so a pre-hydration access no
longer poisons it, and adds public `hydrated` / `whenHydrated` seams
([tosijs#13](https://github.com/tonioloewald/tosijs/issues/13)). Two internal hand-rolled
hydration guards (`<tosi-code>`, `<tosi-example>`) were deleted in favor of the official
`this.hydrated` — so any component that reaches into `parts` from a getter is safe against the
old "read it once and it's bricked forever" trap.

**Semver stance (deliberate, not an oversight).** This library breaks in minors before 2.0 —
**`2.0` is reserved for the tjs-native rewrite**, not for this. So `^1.6.x` resolves `1.7.0` and
existing consumers pick this up on their next install.

**If you use `<tosi-code>`, pin `~1.6` and upgrade deliberately.** Everything else in the library
is untouched, so a consumer of (say) `<tosi-rating>` can take 1.7 without changes — but note it
now installs 12 `@codemirror/*` runtime dependencies where the library previously had none.

## 1.6.23

**Dev-server safety.** Everything under "Dev-server safety" above, backported — this is the
release every `tosijs-ui/site` consumer wants, and it needs no code changes.

The one to know about: **`killStrayServer` was `kill -9`ing every process _connected to_ the
dev port, not just the listener.** `lsof -i:PORT` matches sockets whose local _or remote_ port
is `PORT`, so `bun start` could SIGKILL the browser reading your page, Playwright's browsers,
or an editor's language server. Now it signals only the listening process, only if it is a JS
runtime, SIGTERM first.

⚠️ **Behavior change:** the dev server now exits after **8 idle hours** (`idleTimeoutHours: 0`
to disable), and refuses to start on a machine that is already out of memory
(`DEV_SKIP_PREFLIGHT=1`, or `preflight: 'warn' | false`).

The trap to know about: **`editor` changed type in place** and no shim can catch it. The removed
`theme` / `options` / `ace` members warn once and no-op, but `el.editor` still exists — it is
simply a CodeMirror `EditorView` now, so `el.editor.session.*` is a runtime `TypeError`. A grep
for the removed names will not find it.

### Added

- `<tosi-code>` gained a `change` event (`event.detail.value`), `undo()` / `redo()` /
  `canUndo()` / `canRedo()`, and `tjs` / `ajs` modes.
- **Runtime-value autocomplete** in `tjs` mode: set `tjsAutocomplete` and completion
  suggests the _real members of live values_ — including tosijs proxy members that no
  static analysis can see. Live examples wire their own executed scope into it, so
  `const { app } = tosi(…)` gives real `app.` / `app.items.` completions.
- Inline **WebAssembly** live examples (tjs `wasm {}` blocks).
- `buildSite`: `libraryBuild` and `generateCssPreload` hooks, for projects whose
  library sources are native `.tjs` (this is what the tosijs 2.0 TJS port needs).
  **These actually shipped in 1.6.21** — they are listed here only because they landed on this
  branch first. Nothing needs 1.7 to use them.

### Changed

- **`dist/iife.js` is ~384KB gzipped, up from ~120KB.** Bun's IIFE format cannot
  code-split, so CodeMirror is inlined there. (Under a bundler/ESM it stays a lazy
  chunk — a page with no `<tosi-code>` doesn't load it.) This is deliberate: the
  in-page editor and its save-to-source flow are the point of the doc-system, so the
  IIFE carries the editor.
- The library now has runtime `dependencies` (12 `@codemirror/*` packages) where it
  previously had none. They can't be optional peers: the tjs CodeMirror extension must
  share this exact `@codemirror/state` instance or it silently no-ops.
- `tjs-lang` peer: `^0.8.7` → `^0.9.1`.

### Fixed

- `showDiff()` rendered nothing. Giving `<tosi-code>` its own `content` displaced the
  default `<slot>` that used to project the light-DOM diff overlay, so the overlay was
  invisible (0×0) while `showingDiff` still reported `true`. It now renders inside the
  shadow root. This is the review step of the doc-system's edit-and-save-to-source
  flow, so a blank diff meant saving changes you never saw.

## 1.6.22

### Fixed

- **The dev server no longer leaks memory on every rebuild — update as a priority if
  you use `tosijs-ui/site`.** `buildSite()` called `Bun.build()` in-process, and Bun's
  bundler never returns its native arena: RSS grows monotonically per call with no
  plateau (40 sequential builds of one entry = **+367MB**, still climbing ~5MB/build at
  the end), while the JS heap stays flat — so it is invisible to `Bun.gc()` and to any
  heap profiler. `devServer()` calls it once per rebuild in a process that runs for
  days, so it compounds: a ~2-day watch session reached **136GB RSS** and took the
  machine down with it. Filed upstream as
  [oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053).

  The bundle now builds in a **child process** (`bun build`), whose memory the OS
  reclaims on exit — the same 15 bundles leave the parent **+0.5MB** instead of +192MB.
  `buildEpub()` moved to a child too (happy-dom + `@resvg/resvg-js` are both native and
  retaining, and it runs on every rebuild), with a 120s timeout kill so a hung or failed
  ePub warns instead of wedging the rebuild. Measured on this repo's own dev server:
  **baseline RSS 503MB → 150MB, and per-rebuild growth 26–59MB → ~2.7MB.**

  Bundle output is byte-for-byte identical; this is purely where the work runs.

### Added

- **Dev-server memory watchdog.** `devServer()` now samples RSS after each rebuild and,
  past a ceiling (`memoryLimitMb` in the site config, or `DEV_MEMORY_LIMIT_MB`; default
  4096), prints the growth-per-rebuild and exits rather than let a leak thrash the
  machine. It distinguishes real growth (a leak — report it) from a build whose baseline
  simply exceeds the ceiling (raise the ceiling).

## 1.6.21

### Fixed

- Doc-system nav-toggle in `routing: 'memory'` mode drove the _outer_ doc-browser
  instance instead of its own (now scoped per-instance).

### Added

- `buildSite` `libraryBuild` + `generateCssPreload` hooks (also in 1.7.0 above), so a
  project whose library source is native `.tjs` can build through the doc-site pipeline.

### Changed

- `tjs-lang` peer: `^0.8.7` → `^0.9.0`.

## 1.6.20

### Fixed

- **`import 'tosijs-ui'` no longer resolves to the IIFE under browser bundlers.**
  The `"."` export had a `"browser"` condition pointing at `dist/iife.js` — the
  self-contained CDN/doc-site bundle that inlines tosijs + marked. Browser-targeted
  bundlers (Vite, webpack, esbuild) picked it, so consumers **double-bundled tosijs**
  instead of externalizing the peer, and named imports broke (the IIFE isn't an ESM
  module). Removed the condition: every `import` now resolves to `dist/index.js`
  (ESM, peers externalized). The IIFE stays for CDN `<script>` use and the naive
  doc site — referenced by file path, never via `import 'tosijs-ui'`.

### Changed

- **tosijs peer + dev dependency bumped to `^1.6.6`** — picks up a subtle
  component-lifecycle fix.

## 1.6.19

Doc-system tooling; no component API changes.

### Added

- **Build-time example transpile check.** Every executable live-example block
  (`js` / `tjs` / `ts` / `test`) across the whole corpus is run through the front
  half of the runtime pipeline — `rewriteImports` → transform → `new
AsyncFunction` — at build time, **without executing it**, so a block that can't
  build (a syntax/import error, or illustrative code mistakenly tagged with an
  executable language instead of the display-only `typescript`) **fails the build**
  with the offending doc/block named, on every page — including fences hidden in
  blockquotes and lists. TypeScript is transpiled with bun's own transpiler
  (network-free). Opt out with `checkExamples: false`.
- **"One Source, Every Artifact"** doc page — how one corpus of doc-comments +
  markdown projects into a static SEO site, a self-testing live playground with
  in-browser TypeScript, an ePub/PDF, and an agent-debuggable page. Embeds a live
  `<tosi-doc-system>` (the whole system running inside its own page).

### Fixed

- **A live example's build/exec failure is now a test failure whether or not it
  defines `test` blocks.** So on any page the browser test runner loads, _all_ of
  its examples are checked for explosions — a no-test example that throws is
  reported as a failed test — not just blocks with explicit assertions.

## 1.6.18

Doc-site tooling; no component API changes.

### Added

- **`haltijaDev` — give a coding agent eyes + hands on your running dev page.**
  Set `haltijaDev: true` (or `HALTIJA_DEV=1`) and `bun start` injects a tiny
  localhost-gated loader into served HTML — a runtime `import()` of a local
  [haltija](https://github.com/tonioloewald/haltija) channel's `dev.js` — and
  spins up (or reuses) a server-only channel (no Electron app) in `--both` mode:
  HTTP 8700 for the `hj` CLI, HTTPS 8701 for the injected widget (so an HTTPS page
  has no mixed-content). An agent can then read the live DOM, click/type, run JS,
  and **screen-capture** the rendered page (`hj screenshot`, via `getDisplayMedia`
  — click the 🖥 widget button once to grant the share). Because the loader is
  pulled from the local server at runtime it is **never bundled** (zero build
  bytes) and self-disables off-localhost, and because it's injected at serve time
  it never touches the built output. Certs are mkcert-signed (already required for
  the dev server's HTTPS), so no browser warning. Local dev only; off by default.
  The channel tracks haltija's `@beta` dist-tag (where the WebRTC capture lives).

## 1.6.17

### Fixed

- **`@resvg/resvg-js` is now an optional peer dependency** (it was only a dev
  dependency). It rasterizes the generated ePub cover and belongs to the same
  doc-site pipeline as `happy-dom`, which was already an optional peer — so an
  adopter building ePubs via `tosijs-ui/site` got `happy-dom` surfaced by their
  package manager but not `resvg`, and their book's cover silently failed to
  generate. Both are still lazy-loaded with a graceful warning when absent.

## 1.6.16

Doc-system: prose/book adoption. Component APIs are unchanged; everything here is
doc-site tooling (the `tosijs-ui/site` build system + live examples).

### Added

- **Book manifest — curate/reorder the book without touching site nav.** A new
  `book` field on the site config (`BookManifest`) selects and sequences the ePub
  (and, later, print) as a subset of the corpus while the live site still shows
  everything — one source, two outputs. `include`/`exclude` globs pick docs,
  `order: [...]` names the lead sequence (front/back matter are just docs you
  name), and `sort: 'filename'` gives a folder of chapters natural order with no
  metadata. It adds no new ordering mechanism — it overlays each doc's `order` so
  the existing nav sort sequences the book (pins/parents still apply). Zero-config
  is unchanged: the book is the whole visible corpus. Identity (title/author/
  cover) still comes from `epub`.
- **Prose Markdown (Batch A), activated only by its own syntax** so code docs are
  byte-identical: **YAML frontmatter** (`title`/`order`/`author`/`date`/`draft`,
  frontmatter wins over JSON-comment metadata), **wikilinks** `[[slug]]` /
  `[[slug|label]]` → `/slug/`, and **footnotes** `[^id]` → numbered refs + an
  endnotes section (ePub/web).
- **Book/prose quick wins:** auto-serve `/iife.js` when `bundleEntry` is omitted;
  skip `_`-prefixed scaffolding files; empty metadata `title` falls back to the
  H1; warn when no ePub cover is generated.
- **`epub.coverIcon`** — embed a custom flat SVG glyph into the generated ePub
  cover (in place of the favicon); the source viewBox is preserved so any
  square-ish icon scales correctly. tosijs-ui ships a `tosi-book` cover glyph.
- **`<tosi-3d>` declarative attributes** — assemble a scene purely in HTML (no
  `sceneCreated` callback): `src` (a `.glb` URL, auto-loads like `<img>`),
  `hero-light` (a directional key light over a soft hemispheric fill), `fov` (a
  field-of-view multiplier — `1` unchanged, `<1` a longer lens), and `clear-color`
  (a hex color, or `transparent` to composite the 3D over the page). Aimed at
  declarative narrative pages.

### Fixed

- **Multiple `<tosi-3d>` on one page.** Their scenes are created asynchronously and
  interleave, so objects created without an explicit scene landed on Babylon's
  `Engine.LastCreatedScene` (another instance's scene) — the built-in default
  camera did this, leaving a scene with no camera and a blank canvas. The default
  camera (and the doc examples' lights) now pass their scene explicitly.

### Changed

- **PDF is now the in-browser Print button, not a batch job.** The doc-browser's
  Print action renders the shared book HTML (`book-html.ts`) and the browser
  prints it to PDF. This is the single, supported PDF path going forward; a future
  paginated/footnote-anchored PDF will build on it. (ePub is still generated at
  build time and unaffected.)
- **Live examples pinned to tjs-lang 0.8.7** (upstream subtle-bug fix).

### Removed

- **The headless PDF batch builder** (`buildPdf` / `BuildPdfOptions`, exported
  from `tosijs-ui/site`, and the `book:pdf` / `--pdf` script) — a secondary code
  path superseded by the Print button above. If you generated PDFs in a build,
  print the book page to PDF (via the doc-browser) instead.

## 1.6.15

Live-example fixes from tosijs-3d adoption. All fixes to the doc-system's
editing surface; no API changes.

### Fixed

- **Save to source works when the doc comment is indented.** A `/*# … */` doc
  comment is often indented in the source; the extractor dedents its fenced blocks
  (so examples render with correct ordinals), but the raw scan required the closing
  ` ``` ` right after a newline, so an indented file matched **zero** blocks and
  every save failed with "no matching block". The scan is now indentation-aware,
  and edits compare dedented / write re-indented so a block keeps its place. The
  failure alert is also split into a precise message (page↔source ordinal mismatch
  vs. a genuine no-op).
- **The pop-out editor window ("view/edit code in a new window") now has the full
  menu.** It previously opened as a bare instance, so View changes, Save changes
  (local), and Save to source were hidden; the source↔doc key and the pristine
  snapshot are now passed through, so the pop-out offers — and can execute — the
  same actions as the main window.
- **Opening the editor in a new window closes the inline code view** in the main
  window if it was open (the pop-out owns editing).
- **The doc extractor now only treats a `/*#` block as a doc when it starts a
  line** (whitespace-only before the slash), so a `/*#` inside a `//` comment, a
  string, or mid-line can't be scraped as a spurious doc page.

## 1.6.14

Lighter live-example transpilation. Additive; affects only how the live-example
runner loads its (optional, lazy) transpiler.

### Changed

- **Live examples now use tjs-lang 0.8.5's self-contained browser bundles**
  (`tjs-lang/browser` + `tjs-lang/browser/from-ts`). The transpiler is a single
  self-contained chunk, and the TypeScript compiler is **lazy-loaded from a CDN at
  runtime** only when a `ts` example actually transpiles — so `typescript` (~MB)
  and the transpiler's own deps are never in a consumer's dependency graph. This
  also fixes the `ts` example path, which previously tried to load the TypeScript
  compiler through a CDN transform that timed out on its size.
- **Robust transpiler loading.** The doc-site build now ships the tjs-lang browser
  bundles **same-origin** (copied next to the iife under `/tjs/`, with a global
  pointing the loader at them), so live examples never depend on a third-party
  CDN's propagation timing or uptime. The loader prefers the same-origin copy,
  then falls back through a multi-CDN chain (jsdelivr → unpkg → esm.sh). Installed
  ESM consumers resolve the peer locally as before.
- `tjs-lang` optional peer bumped to `^0.8.6`.

### Fixed

- A garbled character in the first `example` doc snippet that made it throw.
- Live examples could all break for the propagation window after a tjs-lang
  release, when the single pinned CDN 404'd the just-published version (now
  served same-origin + multi-CDN).

## 1.6.13

The documentation system becomes a real publishing pipeline: every doc site can
now emit an **ePub** of the whole corpus, **print to PDF** from the browser, and
**deep-link every example from the book back to the live site**. All changes are
**additive — no breaking changes** — and concern the doc-site tooling
(`tosijs-ui/site`) and doc browser, not the components.

### Added

- **ePub of the whole doc site** (`tosijs-ui/site`). Set `epub: true` (or an
  options object) in the site config and the build emits a valid EPUB 3 of the
  corpus alongside the static pages, regenerated on every build:
  - one chapter per doc in nav-tree order, a readable **Contents page** in the
    reading flow plus the reader's Contents drawer (EPUB3 `nav.xhtml` + EPUB2
    `toc.ncx`), and a customizable stylesheet (`epub.css` / default force-wraps
    code listings)
  - an **auto-generated cover** from the title + favicon (`epub.cover` /
    `epub.coverColor` to override); needs the optional `@resvg/resvg-js`, and is
    omitted gracefully if it's absent
- **Print to PDF** from the doc browser — a "Print as PDF" item in the settings
  menu assembles the whole corpus into a print-styled window and opens the print
  dialog. No server, no headless browser. (A headless `buildPdf` is also available
  for CI via `bun run book:pdf`, not deployed.)
- **"Download ePub"** item in the settings menu (alongside Print), linking the
  built book.
- **Example anchors + book deep links.** Every live example gets a stable anchor
  (`/{slug}/#example-1`, or a custom `id` via a ` ```js#my-id ` fence on any block
  of the group). Arriving at such a URL scrolls the example into view with a brief
  highlight. Each example in the ePub/PDF links back to its anchor on the live
  site — a reader is one tap from the real, interactive, editable version.

### Removed

- The broken **bundlejs** size badge (bundlejs errors computing the bundle).

### Notes

- The ePub needs `happy-dom` (dev dep) + the `zip` CLI; the generated cover needs
  the optional `@resvg/resvg-js`.

## 1.6.12

Packaging improvements for independent, tree-shakeable consumption. All changes
are **additive — no breaking changes**; one minor behavioral edge case is noted
below.

### Added

- **Subpath exports**, so an app can import only what it needs without the barrel
  dragging in dev tools:

  - curated: `tosijs-ui/icons`, `tosijs-ui/code-editor`, `tosijs-ui/live-example`,
    `tosijs-ui/doc-browser`, `tosijs-ui/diff`, `tosijs-ui/theme`
  - per-component wildcard: `import { tosiRating } from 'tosijs-ui/rating'`
    (resolves `dist/rating.js`, registering just that element)

  The full barrel `import 'tosijs-ui'` is unchanged and still registers every
  `<tosi-*>` element.

### Changed

- **`menu`, `tooltip`, and `float` now inject their stylesheet and register their
  global listeners on first use, not at import.** Importing these modules (or the
  barrel) no longer has import-time side effects. This also fixes a latent bug
  where the menu `keydown` handler attached to `document.body` at import time,
  which may not exist yet.

### Possible edge case

If you imported `menu` / `tooltip` / `float` **purely for the side effect** — i.e.
you hand-author markup with the internal classes (`.tosi-menu`, `.tosi-tooltip`,
…) and relied on a bare `import` injecting the stylesheet, **without** ever
calling the API (`popMenu`, `popDropMenu`, `initTooltips`, `showTooltip`) or using
the `<tosi-*>` element — those styles now apply only once the API/element is first
used. Normal usage (the element creators, the `<tosi-*>` elements, and the
`popMenu`/`initTooltips` entry points) is unaffected.
