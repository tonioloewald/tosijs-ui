# Doc-System Roadmap

Status: **planning** — this is the agreed direction, not yet built. Written
before implementation so each PR has a north star to aim at. Sequence and scope
are deliberate; the open decisions at the end are the only unresolved forks.

## North star

**Each library is a web-accessible doc-system endpoint.** Not "a library plus
some docs" — one artifact with three faces:

1. **The library, as importable ESM** — what a consumer actually imports.
2. **The docs** — pre-rendered, no-JS-readable, SEO/agent-friendly, hydrating
   into the live browser.
3. **The authoring + playground surface** — editable live examples, edit the
   source, create new docs, all through one persistence contract.

Add a **version axis** (the endpoint serves `/v1.6.7/`, `/latest/`, …) and the
endpoint becomes the unit of distribution, documentation, and authoring at once.

### The full stack this converges on

| Layer | Technology | Role |
|---|---|---|
| Front end / build / docs | **tosijs-ui doc system** (`tosijs-ui/site`) | static-site generator, live examples, doc browser, ePub/PDF |
| Transpiler | **tjs-lang** | browser-native TS/TJS→JS for live examples (and, separately/eventually, the build) |
| Back end | **AJS VM universal endpoint** on cloud storage | the `DocStore` REST implementation — fine-grained security + auth, no container |

The back end is "the missing piece," but it isn't a *new* piece: tjs-lang's AJS
virtual machine already provides a gas-metered universal endpoint over cloud
storage. So the REST flavor of `DocStore` (below) *is* an AJS endpoint. The same
language that transpiles examples in the browser backs the persistence/auth
layer. Closed loop.

## Principles

- **Fix at the source, where the leverage is.** We control the whole stack —
  down to the JS engine and the browser. When a limitation really belongs to
  another layer, fix it *there*, not with a workaround here. The doc system stays
  thin; leverage compounds at the lowest layer that owns the problem.
  - Corollary: **import resolution for live examples is tjs-lang's problem, not
    the doc system's.** We keep only the minimal fake-import for our own libs (so
    examples exercise in-page, possibly-just-edited code) and otherwise delegate
    to whatever tjs's transform resolves. We don't build resolvers, importmaps,
    or widening allow-lists to compensate for the transform.
- **Unbundled web.** tjs-lang "targets an unbundled web" and transpiles in the
  browser with no build step. Examples should reach real ESM endpoints, not just
  injected globals (see the import-resolution fork in Open Decisions).
- **Closed-world first, open-world reachable.** The current inject-globals /
  IIFE model works offline and must not regress. Open-world (importmap-resolved
  cross-library examples) is layered on top, opt-in.
- **One persistence contract, two implementations.** Dev writes to disk
  (localhost only); REST writes to the AJS endpoint. The client is written once
  against `DocStore` and never knows which it's hitting.
- **tjs-lang is never a runtime `dependency`.** It is dev / optional-peer,
  lazy-loaded exactly like sucrase is today. A consumer who never renders a live
  example never downloads it.
- **Build-time static artifacts.** The site, ePub, and PDF are emitted by the
  build and served as static files. No server is needed to *read* an endpoint;
  the REST `DocStore` exists only to *write* one.
- **Tree-shakeable by construction.** The library-as-ESM must be importable
  without dragging in the editor, example runner, or doc browser.

## Where we are today (grounding)

- **Editor:** `src/code-editor.ts` is a thin wrapper that lazy-loads **Ace from
  CDN** via `scriptTag` (`./via-tag`). Zero bundle cost today, but Ace.
- **Transform seam:** `src/live-example/code-transform.ts` `loadTransform()`
  returns a `TransformFn` (sucrase → CDN → passthrough). `execution.ts` calls
  `transform(code, { transforms: ['typescript'] })`. This is the swap point.
- **Import rewriting:** `rewriteImports()` turns `import { x } from 'tosijs'`
  into `const { x } = tosijs` against **injected context globals** — a closed
  world (IIFE `xinjs` / `xinjsui`).
- **Remote editing exists:** `remote-sync.ts` / `RemoteSyncManager` already sync
  an in-place editor and a pop-out window over BroadcastChannel + localStorage.
- **Corpus is ordered & renderable:** `docs.json` + `nav-tree` + `marked` +
  `generate-css` already emit per-doc HTML with full `<head>` metadata and image
  handling (`generate-site.ts`).
- **Haltija is orchestrated — test mode only** (`dev-server.ts` ~L206+).
- **The gap:** examples are reconstructed from rendered HTML
  (`insert-examples.ts`) with **no back-link to source file or fenced-block
  location**. That source↔doc map is the missing primitive for editing/saving.
- **Barrel problem:** `src/index.ts` does `export *` from `./code-editor`,
  `./live-example`, `./doc-browser`, `./doc-system/doc-system` — all
  side-effectful (they define custom elements at load). A barrel `export *` of
  side-effectful modules defeats tree-shaking regardless of `sideEffects` flags.

## The `DocStore` contract

The single seam the authoring surface is written against. Dev = disk; REST = AJS
endpoint. Version is part of every key from day one (even if only `latest`
exists at first), so versioning is additive, not a retrofit.

```ts
interface DocStore {
  // live-example scratchpad / saved edits
  loadExample(key: ExampleKey): Promise<ExamplePayload | null>
  saveExample(key: ExampleKey, payload: ExamplePayload): Promise<void>

  // whole-source editing (dev: write to disk; REST: write to backend)
  readSource(ref: SourceRef): Promise<string>
  writeSource(ref: SourceRef, content: string): Promise<void>

  // create a new doc and fold it into the source↔doc map
  createDoc(meta: DocMeta, body: string): Promise<SourceRef>
}

type ExampleKey = { version: string; slug: string; ordinal: number; id?: string }
type SourceRef  = { version: string; file: string; block?: number }
```

Implementations:
- **DevStore** (first): talks to the localhost dev server, which writes to disk.
  Jailed to configured watch dirs, dev-mode + localhost-bound only, rejects
  `..` / symlink escapes. Writes trigger the existing chokidar rebuild.
- **IndexedDBStore**: per-browser scratchpad for `loadExample`/`saveExample`
  (no source writes). Always available; the offline default for tinkering.
- **RestStore** (later): same calls against the AJS universal endpoint.
- **DbStore** (the big one): `readSource`/`writeSource`/`createDoc` over a
  **database** instead of the filesystem — docs and their source live as records,
  not files. The `SourceRef.file` becomes a record id; there is no source tree.

### When the store is a database, this is no longer "a doc system"

A file-backed `DocStore` documents a codebase. A **database-backed** one inverts
it: the docs/source ARE the content, edited in the browser, persisted to records,
rendered + executed live. Compose that with what we already have —
- live, editable examples (tjs transpiles in the browser),
- whole-doc editing + create-new-doc (Foundation B),
- versioned records + auth (the AJS universal endpoint),
- pre-rendered, no-JS-readable, hydrating output,

— and the result is a **CMS / online word-processor / unbundled web-based IDE**:
write prose and runnable code in one surface, version it, publish it as a static
endpoint, edit it from anywhere. The file-backed DevStore is just the local-dev
face of the same contract; the DbStore is the product. (This is why the
source↔doc map and `DocStore` are worth getting right now, before #3/#4 — they
are the seam the whole thing pivots on.)

### Editing model — backend by context, one UX

> **Status (dev FS path landed):** **#4 edit-page-source** and **#3 persist
> live-example edits** both work in dev. `editableSources` dev endpoint
> (`/__docstore/source` read/write, repo-jailed); the "view source" button is now
> a `popMenu` (Edit page source / View on GitHub / Download); the content-area
> editor previews in-browser (pure `/*# */` extractor) and saves to the file →
> watcher rebuilds. Per-example "save changes to source" rewrites just that
> example's blocks via the source↔doc map (`save-to-source.ts`, 7 tests).
> **View changes (diff): DONE** — reusable `<tosi-diff>` (`src/diff.ts`, LCS line
> diff) + the editor's Edit / Preview / **View changes** views. **Local
> save/restore of examples: DONE** (`example-store.ts`, per-browser scratchpad
> keyed by the source↔doc map; moreVertical example menu).
> **Still TODO:** the **production path** — IndexedDB *versioned overlay* (apply
> on render; prod "save" persists there) — currently prod "save" just downloads.

The write target is a `DocStore` backend chosen by context/config, NOT a hard
"dev-only" rule:

- **Dev** → **FS** backend: a dev-server write endpoint saves into the repo file.
  **Security is a non-issue here** — it's all local (your machine, your files,
  your browser). The only constraint is correctness hygiene: resolve writes
  within the configured source roots so a bad path can't clobber something
  outside the repo. No auth, no token, no LAN-gating to design.
- **Production** → **IndexedDB personal overlay (versioned)** + **download-to-disk**.
  No server write at all. A visitor fixes a page, the edit persists to their own
  browser's versioned overlay, and they can download the edited file straight into
  their checkout "in a pinch." The static doc is the base; the IDB layer is the
  visitor's personal fork — the DB-backed-files idea in miniature (filesystem+git,
  or a DB of versioned files).

> **Security scope:** as long as the backend is local — IndexedDB or the dev FS —
> there is nothing to secure. The hosted **data-endpoint** (RestStore / AJS) is
> where auth/authz/versioning matter, and that is already worked out and partly
> implemented in the **loewald-dot-com** repo — we adopt it wholesale when we get
> there, rather than designing security here.

**The overlay applies on render:** before rendering a doc, the browser checks the
IDB overlay for an edited version of that source and uses it if present.

**Edit unit = the whole source file** (not the extracted `doc.text`): a `.md` →
that markdown file; a `.ts`/`.tjs` → that whole file. Source is read from the
**FS in dev** (read endpoint) and from **GitHub raw in prod** (derive the raw URL
from the existing repo link + `doc.path`) — so "Edit page source" is **conditional
on having a GitHub link** in prod. Preview: a `.md` renders directly; a `.ts`
re-derives its markdown via a browser-runnable `/*# … */` extractor (factor the
pure part out of `docs.ts`). In dev, saving instead triggers the existing chokidar
rebuild → refresh, so the build itself is the preview — no in-browser extraction
needed there.

**UX — the existing "view source on GitHub" button becomes a `popMenu`:**
- **Edit page source** → a `CodeEditor` (whole file) that fills the content area.
- **View on GitHub** (when a repo link applies).
- **Save** (→ FS in dev / IDB overlay in prod) · **Download** (the file).
- **View changes** (diff edited vs original) while editing.

Two granularities, both keyed by the source↔doc map (`data-source-file` +
`data-example-ordinal`): **whole-page source**, and **per-live-example** (jump
into the example, fix the block, save it back). Flow: see an error on a page →
menu → edit → flip back to rendered → looks good → save/download.

Building blocks already in hand: `popMenu`, `CodeEditor`, the source↔doc map,
tjs-in-browser transpile. Lowest-risk first slice: the **client-side path**
(edit → IDB overlay + download) — works in dev *and* prod, no server, no security
surface. The dev **FS write endpoint** is a convenience layered on top (save to
the real file instead of download).

## #6 seam — validated against tjs-lang (spike, Jun 2026)

> **Status: #6.1 SHIPPED.** sucrase removed; `js` blocks transpile through
> tjs-lang `dialect: 'js'` (behavior-neutral), tjs lazy-loaded (`tjs-lang/lang`
> → jsdelivr `+esm` → degraded raw-JS). tsc clean, 455 unit tests, browser suite
> 31/0. Known non-issue: the background-test iframe flashes *in haltija only*
> (Chromium compositor) — invisible in Safari/Chrome, deemed not important.
> Next: **#6.2** — `ts`/`tjs` executable block dialects (TS via `fromTS` behind
> `tjs-lang/lang/from-ts`) + generated-JS / types tabs.

Empirically confirmed against `../tjs-lang` (`tjs-lang` npm). The seam:

- **Entry point:** `tjs(source, opts) → TJSTranspileResult` (from `tjs-lang`, in
  `src/lang/emitters/js.ts`). `.code` is the JS string — a drop-in for sucrase's
  `.code`. Also returns `types`/`metadata` (the `__tjs` runtime type info → the
  "types/docs" tab, **for free**), `warnings` (→ editor markers), `testResults`,
  `wasmCompiled`.
- **Options that matter:** `mode: 'dev' | 'strict' | 'production'` (the
  strictness levels), `runTests: false` — **must set this for examples**;
  default `true` *runs inline tests at transpile time and throws on failure*,
  which would break an example render. `debug: true` for source locations.
- **Plain/imperative JS examples** transpile cleanly (verified) — examples are
  top-level scripts, not function declarations, and that's fine (JS superset).
- **Real TypeScript** (`const x: number`) is **not** accepted by `tjs()`
  directly — it expects TJS. The path is **TS → TJS → JS**:
  `fromTS(tsSrc, { emitTJS: true }).code` → `tjs(...).code`. Verified:
  `function add(a: number, b: number): number` → JS with `add.__tjs` metadata.
  Caveat: `fromTS` uses the real TypeScript compiler (`ts.createSourceFile`), so
  it's heavy — **lazy-load it only when an example is authored in TS**; pure
  JS/TJS examples skip it and call `tjs()` directly (no `typescript` pulled in).
- **Imports** are preserved verbatim by `tjs()` (runtime resolves them) — the
  fix-at-the-source model. But our examples run via `new AsyncFunction(...)`,
  whose body **can't contain `import`** — so we still pre-run `rewriteImports`
  for our own libs (→ `const { x } = tosijs`) and other imports still fail until
  examples execute as real ES modules (phase-2, open-world). Unchanged from today.

### Decision: drop sucrase entirely — tjs for everything

No dual-engine, no sucrase fallback. tjs is far more robust than sucrase for this
job: its `.compat-tests/` clone and run the **real test suites of `effect`,
`zod`, `ts-pattern`, `kysely`, `radash`, `superstruct`** through `fromTS`
(`scripts/compat-*.ts`) — i.e. it's validated against the most type-intensive TS
libraries in the wild. Sucrase only strips types without checking. And tjs gives
descriptive `TranspileError`s (file:line:col) where raw `AsyncFunction`/eval gives
a terse `SyntaxError` — better "what's broken" reporting, which was the point.

Every executable block routes through tjs, **keyed by the block's dialect**
(tjs-lang ≥ 0.8.2 added an explicit `dialect` option — `feat(lang): explicit
source dialect`; see `TJS-FOR-JS.md`'s js|ts|tjs recipe):
- `js` → `tjs(code, { dialect: 'js', runTests: false }).code` — **vanilla JS,
  untouched.** Verified: `if (1 == '1') x = typeof y` round-trips identically.
- `tjs` → `tjs(code, { dialect: 'tjs', … }).code` — full TJS (structural `==`,
  `TjsStandard`, …). Opt-in per block.
- `ts` / `typescript` (executable) → `tjs(fromTS(code, { emitTJS: true }).code).code`,
  with `fromTS` imported from `tjs-lang/lang/from-ts` so the TypeScript compiler
  loads **only** on the TS path (`tjs-lang/lang` stays TS-free).

So `dialect: 'js'` makes the engine swap behavior-neutral for today's `js`
examples — no structural-`==` surprise — while `tjs`/`ts` opt into safety. (This
supersedes the earlier note that `js` blocks would inherit tjs semantics; the
explicit dialect lever, added at the source in 0.8.2, is the fix.) The no-tjs
degraded mode is trivial: `dialect: 'js'` returns JS unchanged, so if tjs fails to
load we just run the raw JS (TS blocks then error). Rollout safety net unchanged:
switch engine, run the full inline-doc-test browser suite.

Implementation shape: `loadTransform()` is replaced by a lazy `import('tjs-lang')`
(+ lazy `fromTS` only for TS blocks); `execution.ts` threads the richer result
(`code` + `types` + `warnings`) back so the component renders the generated-JS and
types tabs and surfaces `warnings` / thrown `TranspileError`s. tjs is lazy-loaded
only when an example renders — a plain component consumer never pulls it in — so
it's never a runtime `dependency`, but it *is* required for the doc system.
Optional degraded mode (if tjs fails to load): run `js` blocks raw, TS blocks
error. **Sucrase is removed** from deps, CDN load, and the passthrough fallback.

## The four foundations

- **A — Headless render in dev + build.** Non-test `devServer` launches
  haltija's private server (beta 10 ships this + an embeddable widget) on a free
  port and injects the widget on localhost. The build invokes the same
  lifecycle headlessly to print the PDF. Serves **#5** and **#2**.
- **B — Source↔doc map + DocStore dev impl.** The build maintains a bidirectional
  map (source file + fenced-block ordinal ↔ doc / example). Localhost-only,
  path-jailed read/write/**create** endpoints. Serves **#4** and the dev-source
  path of **#3**.
- **C — Example identity + providers.** Stable `ExampleKey`
  (`version/slug/ordinal`, optional `id=` fence override); `DocStore` providers
  wired in priority order (IndexedDB default, REST when configured, Dev on
  localhost). Load-on-mount hydrates editors with a "reset to original"
  affordance. Serves **#3**.
- **D — tjs-lang transform for examples.** Swap the `TransformFn` seam to
  lazy-load tjs-lang; add "generated JS" and "types/docs" tabs; surface tjs
  warnings as editor markers. Live examples only. Serves **#6**.

## Step zero — the `./docs` subpath refactor *(deferred — see Resolved Decision #2)*

> Deferred along with the CodeMirror migration: while the editor stays
> Ace-from-CDN (zero bundle), there's no urgency to split the doc machinery out
> of the `.` entry. Keep this as the prerequisite for 6b, not for 6.


Before the CodeMirror migration: move `code-editor`, `live-example`,
`doc-browser`, and `doc-system` **out of the default `.` entry** into a `./docs`
subpath export (alongside the existing `./site`). The doc system imports them
explicitly; a plain consumer importing `tosijs-ui` never pulls in CodeMirror or
the example runner. This is what makes "the library as an ESM export" real, and
it unblocks the (bundled, no-CDN) CodeMirror editor without taxing everyone.

Low-risk, high-leverage, and a prerequisite for #6. Ship it first, on its own.

## The six features

| # | Feature | Foundation(s) | Key decision / risk |
|---|---|---|---|
| 6 | **replace sucrase with tjs-lang in live examples** (drop sucrase entirely) + generated-JS / types tabs + graceful tjs errors | D | tjs for every executable block (js/tjs direct, ts via fromTS). Lazy-loaded, doc-system-only. `js` blocks gain tjs semantics (structural `==`) — accepted. Keep fake-imports for our libs; others fail. |
| 6b | *(deferred)* migrate editor Ace → **CodeMirror** | D, step-zero | Wait for a componentized CM export from tjs-lang. CodeMirror can't be CDN-`import()`'d → must bundle → needs the `./docs` subpath first. |
| 6c | *(deferred)* migrate in-browser doc tests → tjs inline tests | D | Tests are JS now and stay JS; no forcing function. Revisit post-#6. |
| 5 | **haltija widget in dev** | A | Wire-up, not build (beta 10 ships server + widget). Free-port discovery, localhost-only injection. |
| 4 | **edit source files in dev (+ create new docs)** | B | A write endpoint is arbitrary-file-write unless localhost + dev-only + path-jailed. Security model first. |
| 3 | **save/load per live example** | C (+ B for dev-source) | `uuid` is per-load → can't key persistence. Key by `version/slug/ordinal` (+ optional `id=`). IndexedDB = scratchpad (acknowledged weakness); REST is the real story. |
| 1 | **ePub (build-time)** with TOC, images, index, footnotes | — (corpus) | Live examples render as **pretty-printed code listings, force-wrapped** (no JS in a book). XHTML well-formedness; mimetype-first STORED zip. |
| 2 | **PDF (build-time)** | A | Reuse #1's per-doc XHTML+CSS, print-to-PDF via headless haltija. Same pipeline, second emitter. |

### Index & footnotes (for #1, and useful on the live site too)

Build the index automatically from:
- exported **classes / functions / types** (we own the build + source↔doc map),
- **headings**,
- other obvious symbols,
- plus explicit `<!-- index: term -->` markers.

And support `<!-- footnote: … -->` markers, collected and rendered per-page (and
per-book in the ePub/PDF).

## Sequence

1. **#6** — swap transform seam to tjs-lang (optional/lazy) + generated-JS/types
   tabs + tjs error handling. Spike "what's free" first. **No** editor migration,
   subpath refactor, or test rewrite required.
2. **#5** — haltija-in-dev (Foundation A); lays the headless groundwork #2 reuses.
3. **Foundation B → #4** — source↔doc map + DevStore; security model first.
4. **Foundation C → #3** — example identity + providers (reuses B's write path).
5. **#1 ePub** — independent build-time track; can run in parallel with 1–4.
6. **#2 PDF** — after A + #1's render pipeline.

Deferred until there's a forcing function: **step zero** (`./docs` subpath) +
**6b** (CodeMirror editor), **6c** (tjs-inline-test migration).

**Re-prioritized (Jun 2026):** persisting experiments (**#3**) and editing
source files (**#4**) are now ahead of finishing #6.2 (ts/tjs dialects + tabs)
and perf fine-tuning. So after #6.1: build **Foundation B (source↔doc map +
DocStore dev impl) → #4**, then **Foundation C → #3** — those are the priority.
#6.2 polish and the SW→`/lib` resolver come after.

### Phase-2 tracks (named now so they're not retrofitted painfully)

- **Importmap example resolution** — examples `import from 'lib'` resolving to a
  real ESM endpoint, enabling cross-library live examples. Keep inject-globals as
  the offline fallback; add the resolver opt-in. **Seeded:** a minimal
  module-cache service worker now ships (`demo/static/module-cache-sw.js`,
  registered via `headExtra`) — it caches the CDN modules examples already load
  (the tjs transpiler etc.) same-origin, shared across the background-test
  iframes (fixes Firefox/Safari per-iframe re-fetch). Grow it into a
  `/lib/<spec>` resolver (bare-import rewrite + IndexedDB-backed versioned
  endpoint) — the same pattern tjs-lang (`/tfs/`) and b8rjs use.
- **Versioned endpoints** — `version` is already in `ExampleKey` / `SourceRef`;
  this lights up per-version site output + a version switcher + version-pinned
  example imports.
- **AJS-VM RestStore back end** — the `DocStore` REST implementation as an AJS
  universal endpoint over cloud storage (security + auth).

## Resolved decisions (Jun 2026)

1. **Import resolution is tjs-lang's problem, not ours** (fix-at-the-source).
   The fake-import rewrite for `tosijs` / `tosijs-ui` is the *only* thing the doc
   system owns — examples and tests must run against the code we may have just
   changed, so those resolve to in-page globals. Everything else is delegated to
   tjs's transform: whatever it resolves (its playground already does real ESM
   like `import * as React from 'react@^…'`) we get for free, and whatever it
   doesn't, it fails — we add **no** resolver, importmap, or allow-list widening
   here. The open-world cross-library story (phase 2) is a tjs-lang capability we
   consume, not code we write.
2. **Editor — stay on Ace for now; defer CodeMirror.** Ace is CDN-loaded (zero
   bundle), so there's no urgency. tjs provides CM highlighting + autocomplete in
   its playground but it may not be cleanly extractable yet. Revisit when tjs-lang
   ships a **fully componentized CM editor export** (or it becomes its own
   package) — then adopt that rather than hand-rolling. This also **downgrades
   step zero** (the `./docs` subpath refactor): still desirable for the
   north-star ESM separation, but no longer a blocking prerequisite, because we
   aren't bundling CodeMirror.
3. **Tests — defer migration.** Doc tests are JavaScript now and stay JavaScript;
   nothing forces a move. When we do adopt tjs we'll want to **handle tjs-lang's
   errors** on failure (it's designed to be more helpful than the current
   harness), but full migration to tjs inline tests waits.

### Net effect on the near-term

#6 shrinks to **swap the transform seam (sucrase → tjs-lang), lazy-loaded and
optional**, plus the generated-JS / types tabs and graceful tjs error handling —
**no editor migration, no subpath refactor, no test rewrite** required first.
First concrete task under #6: spike *what tjs-lang gives us for free* (import
resolution, diagnostics, doc/type metadata) against the live-example use case.

## Build approach

Most of these are well-scoped enough to drive with the Plan agent per PR. Some
(the source↔doc map sweep, the test migration, the ePub generator) are
fan-out-shaped and may be worth running as **loops / multi-agent workflows** —
explicitly opt in when we get there.
