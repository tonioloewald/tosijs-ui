# Import resolver — live examples that import code from anywhere

**Status:** spike. **1.7.0 does NOT depend on this** — it ships with or without it. Keep the
consumption isolated/optional (a config flag + a build step that no-ops when unset) so it can
be cut cleanly if it gets problematic.

**Enabler:** tjs-lang **0.11.0** ships `tjs-lang/import-resolver` — a same-origin service worker
that intercepts `/<prefix>/<spec>` requests and resolves them to real modules (jsdelivr/esm.sh),
cached. `/lib/` is earmarked as tosijs-ui's prefix. This is the front edge of the platform
vision (doc-system + tjs + SW imports + plugin hooks + SPA mode = an in-browser literate-dev
platform).

## The core insight: the "fake" system is essential, not legacy

Today live-example rewrites `import { x } from 'tosijs'` → `const { x } = tosijs` (context
injection). That is NOT a hack to retire — it is **load-bearing for the doc-system-as-authoring
-tool use case**: when you're developing a library, an example must exercise your **in-page
working copy** (the live, hot-reloading `context` instance you're editing), NOT the CDN-resolved
*published* version. Real imports would pull the shipped library; context injection gives you the
one under your cursor.

So real imports are **additive**, and there are two modes plus a side-by-side default.

## Two modes

### 1. Default — library-dev (context injection + real imports side by side)

The core doc-system case. Natural split, already sitting in front of us:

- **In `context` (the library under development)** → stays fake/const-injected (your working copy).
- **Not in `context`** → a **real bare import the SW resolves** via `/lib/<spec>`.

So `import { tosiWidget } from 'tosijs-ui'` uses your working copy while
`import confetti from 'canvas-confetti'` is fetched for real — in the SAME example. Keeps the
authoring value; adds npm-from-anywhere. Runs in the existing `AsyncFunction` engine: context
specifiers → const; the rest → `const x = await import('/lib/<spec>')` (the SW intercepts the
dynamic-import fetch).

### 2. IDE / unbundled — real everything, iframe-isolated

Real module imports for ALL specifiers (including the library, resolved from the SW = the
published version), running isolated in an iframe. The CodeSandbox/app-building case where you
WANT the real published deps, not the in-page instance. Maps onto the **`iframe` attribute we
already have** (`executeInIframe`) — extend that path to run as a real module with SW-resolved
imports, rather than a whole new engine. A deliberate SECOND phase, once the SW is proven.

- `<tosi-example>` (default) → your library + real npm side by side (test your working copy).
- `<tosi-example iframe>` / `mode="ide"` → fully real, isolated (build an app from arbitrary pkgs).

## We already have the seed

`demo/static/module-cache-sw.js`'s own header says *"DIRECTION (roadmap phase-2): grow this into
a `/lib/<spec>` resolver."* TFS **is** that — so consuming it **retires** our hand-rolled caching
SW (the import-resolver caches too, via `cacheName`).

## The API (0.11.0)

- `registerImportResolver({ prefix: '/lib/', workerUrl, scope, defaultCdn, esmShPackages, cacheName })`
  — registers the SW; config reaches the worker as a query string on its script URL (client
  rewrite + worker routing can't disagree; round-trip-tested upstream).
- `tjs-lang/import-resolver/worker` — the SW as a raw classic-script asset
  (`dist/import-resolver-worker.js`, ~2.9KB IIFE). **Must be copied to the origin's public root**
  (SWs are same-origin). Subdir hosting needs `Service-Worker-Allowed: /`.
- `rewriteImports(source, prefix)` — tjs-lang's client rewrite (`import x from 'pkg'` →
  `import x from '/lib/pkg'`, keeping import statements). NB it assumes ES-module execution; our
  default (AsyncFunction) needs the dynamic-import variant instead.

## Spike steps (default mode)

1. **✅ Bump tjs-lang 0.10.1 → 0.11.0** — done, verified compatible (all lanes).
2. **✅ Serve + register the worker.** `SiteConfig.importResolver` (off by default) →
   orchestrator copies `import-resolver-worker.js` to the web root + injects a
   `__TOSI_IMPORT_RESOLVER` config global; the doc-system client dynamic-imports
   `tjs-lang/import-resolver` (a 3.9KB lazy chunk, out of a plain component consumer's graph)
   and `registerImportResolver`s it (`reloadOnFirstInstall: false` — no reader reload).
   **PROVEN:** with the flag on, the SW controls the page (scope `/`) and
   `await import('/lib/canvas-confetti@1.9.3')` returns the real module;
   `fetch('/lib/nanoid')` → `200 text/javascript`. All lanes green with it enabled.
3. **✅ Extend `rewriteImports`.** Context specifiers → const-injection (unchanged); everything
   else → dynamic `await import('<prefix><spec>')` (named / default / `* as ns` / `X, { a }` /
   side-effect / `a as b` rename forms), gated on the prefix. Runtime auto-reads the
   `__TOSI_IMPORT_RESOLVER.prefix` global; the build threads it to `check-examples` via a
   `TOSI_IMPORT_PREFIX` env so npm-importing examples VALIDATE (rewrite to a dynamic import,
   syntax-check, don't run). (Gotcha fixed: the trailing `;?` must not eat the newline.)
4. **✅ PROVEN end-to-end.** A doc example `import { nanoid } from 'nanoid'` builds (check-examples
   validates it) and renders "ID: &lt;nanoid&gt;" — the rewrite → SW-resolve → execute chain works.
   638 unit + 21 Playwright green.

**Default mode is DONE. A live example can import any npm package.** Next: the IDE/iframe mode
(phase 2) + the open items below.

### Still open from steps 1–2
- **Retire `module-cache-sw.js`** — the import-resolver supersedes its stated roadmap (it caches
  too). Not yet removed; do it once the resolver is the default caching path.
- **First-visit control timing.** With `reloadOnFirstInstall: false`, the SW controls on the NEXT
  navigation — so a first-ever visitor's `/lib/` import (once step 3 lands) resolves only after
  the SW activates. Decide the UX (a targeted reload only when an example actually needs `/lib/`,
  or an "installing…" state) in step 3/4.
- **basePath / subdir hosting** needs `Service-Worker-Allowed: /` on the worker response (the dev
  server + host must send it); only the root case is wired so far.
- **CI network dependency** — the step-4 proof hits a real CDN; keep npm-import examples out of the
  gated inline-`test` tier, or pin/mock.

## Open questions / to resolve during the spike

- **Dev vs prod SW.** Registration timing, scope, and the dev server (does `bin/dev.ts` serve the
  worker + the `Service-Worker-Allowed` header?). tjs-lang's `bin/dev.ts` fallback resolves
  identically to the worker — mirror that seam if needed.
- **Caching / versioning.** `cacheName` + versioned specifiers (`pkg@1.2.3`). Persistent cache so
  offline/repeat loads are same-origin hits (the module-cache-sw win, kept).
- **The doc-test lane.** Examples that import npm must not make the CI lane network-dependent —
  pin/allowlist, or keep import-examples out of the gated inline-`test` tier.
- **IDE mode (phase 2).** How to opt in (`iframe` vs a new `mode`), and the isolation contract
  (real published library vs in-page context).
- **Named exports from CDN modules.** esm.sh/jsdelivr interop with `import { x } from` vs default.
