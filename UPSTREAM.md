# Upstream

Rough edges hit in in-house dependencies, mirrored here so the context stays where we
work. **This file is not a channel** — the GitHub issue on the target repo is. Every
entry below links to its filed issue; an entry without one is a complaint nobody will
ever read. See `tosijs-coding-practices/practices/cross-project.md`.

Mark `✅ RESOLVED (fixed in <pkg>@<version>)` when it lands, and close the issue.

---

## bun

- **[oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053)** — `Bun.build()` leaks
  native memory per call (RSS unbounded, `heapUsed` flat), which kills long-lived watch/dev
  processes. **This has taken the machine down twice.** ~30MB per call, monotonic, invisible
  to `Bun.gc()` and to any JS heap profiler.

  **Status checked 2026-07-14: issue OPEN, [PR #34054](https://github.com/oven-sh/bun/pull/34054)
  OPEN and UNMERGED (last touched 2026-07-12). Latest released Bun is 1.3.14 — the same version
  we run — so NO released Bun has the fix.** Bun reproduced it, and their diagnosis is sharper
  than ours: it is not a malloc leak (LSAN sees ~5KB unreachable) — the memory _is_ freed, but
  **mimalloc never purges it back to the OS** (all growth lands in `[anon:mimalloc]` mappings).

  Two things to hold onto when it does merge:

  - **The PR does not cover `new Bun.Transpiler()`**, which leaks ~40KB per _construction_
    (scales with constructions, not code volume). Construct once, reuse.
  - **Do not revert our workarounds.** The child process costs ~30ms and is immune to the whole
    class of native-arena bugs; the bar for going back in-process is "measurably worth it", not
    "the bug is fixed."

  Our side is defended in `src/doc-system/site/` — shelled-out `bun build`, child-process ePub,
  an RSS ceiling, an idle exit, and a machine-health preflight. See "Not taking the machine down
  with you" in `doc-site-system.md`.

---

## tosijs

> **The foundational dependency, and the one we have never filed against.** That is itself the
> finding: three sections here for bun, tjs-lang and haltija, and none for the library
> everything is built on. Friction against tosijs has been silently absorbed into hand-rolls
> instead of being reported.

- **[#13](https://github.com/tonioloewald/tosijs/issues/13)** — ✅ **RESOLVED (fixed in
  tosijs 1.6.9).** Both asks landed: `hydrate()` now ends with `_hydrated = true, _parts =
  undefined, _resolveHydrated?.()` — it **invalidates the cached proxy** (so a pre-hydration
  read can no longer poison it) AND exposes the seam (`get hydrated`, `get whenHydrated`). We
  bumped the floor to `^1.6.9` and **deleted both hand-rolls** — `code-editor.ts` and
  `live-example/component.ts` now use the inherited `this.hydrated`. Verified: a pre-hydration
  `parts` read no longer bricks the editor; 628 unit + 39 Playwright green. Original finding:

  **(a) the `parts` proxy permanently poisons itself on a pre-hydration access, and (b) there
  is no paved way for a component to know whether it is hydrated yet.** (b) is the deeper one;
  (a) is what makes it
  bite.

  **The lifecycle (verified, because it is easy to assume otherwise):** content is **not**
  injected at construction. `connectedCallback()` calls `hydrate()`, and `hydrate()` is what
  instantiates `content` and attaches the shadow root. On a constructed-but-uninserted element:
  `shadowRoot === null`, `childNodes.length === 0`, and `parts.<anything>` throws. There is no
  parts DOM at all before insertion.

  **The poisoning.** From the shipped source:

  ```js
  get parts() {
    let E = this.shadowRoot != null ? this.shadowRoot : this   // recomputed each call…
    if (this._parts == null) this._parts = new Proxy({}, { get(M, f) { /* …E.querySelector… */ } })
    // …but the Proxy CLOSES OVER the `E` from the FIRST call, and memoizes resolved nodes.
  }
  ```

  So one read before hydration binds the proxy to the light-DOM element **forever**. After
  insertion the shadow DOM is correct, yet `el.parts.host` still throws
  `elementRef "host" does not exist!` — silently, for the life of the element. (Control: an
  element never touched before insertion resolves `parts.host` fine. It is the early read, not
  the timing.)

  **Nobody was "futzing with parts".** `elementCreator()` returns an _uninserted_ element, so
  `const el = tosiCode({…}); el.showingDiff` is idiomatic — and `showingDiff` is an ordinary
  public getter that _internally_ reads `this.parts.diffHost`. That single read bricked
  `<tosi-code>`: CodeMirror never mounted, no error, ever. **The component's own public API
  forces the read**, so "consumers shouldn't touch parts" cannot be the answer — the component
  needs a supported way to know it isn't ready.

  And the obvious way to find out is the trap: a `try { this.parts.x } catch {}` **probe** —
  code trying to _detect_ whether it is safe is the very thing that makes it permanently unsafe.

  **No public seam.** `_hydrated` and `_parts` are both `private`, and `get parts(): T` is the
  only door, so a subclass cannot ask "am I hydrated?" without an `any` cast. We therefore carry
  **two independent hand-rolls in one repo** (`code-editor.ts`'s `_partsHydrated` + `_pendingDiff`
  replay; `live-example/component.ts`'s own `hydrated` getter + `pendingValues` replay). **20
  files in `src/` declare `shadowStyleSpec`**; the idiom silently bricks any of them, and neither
  the types nor a lint rule prevents it.

  **The precedent is already in tosijs.** `connectedCallback` calls `_drainPendingAttrOps()` —
  attributes set before insertion are queued and replayed on connect. That is exactly the shape
  both of our hand-rolls reinvented. The paved path is half-built; it just isn't exposed.

  **Asks:**

  1. **Make the bug impossible.** Invalidate `this._parts` in `hydrate()` (or don't cache the
     proxy until hydrated). Roughly one line, and no consumer has to know anything.
  2. **Pave the hydration check** — a public/protected `hydrated: boolean` (and ideally
     `whenHydrated: Promise<void>`, so parts-dependent work can be awaited rather than
     hand-queued). A component should understand its own lifecycle without an `any` cast.
  3. Failing (1): **throw a clear error** on pre-hydration `parts` access rather than silently
     poisoning the proxy — a loud failure at the point of misuse beats a silent one at a distance.

  (1) + (2) would let us delete both hand-rolls.

---

## tjs-lang

Filed during the 1.7 adoption (CodeMirror + first-class tjs + inline WASM), against
**tjs-lang 0.9.1**.

> **Reconciled 2026-07-16; bumped 2026-07-17.** We now ship **0.10.1** (0.9.1 → 0.10.1, skipping
> 0.10.0 — it triggered a **memory-storm** rooted in a **bun** bug tripped by something in tjs-lang,
> same native-memory family as bun#34053 below; 0.10.1 carries the fix). 0.10.0/0.10.1 closed four
> of our issues (#10, #12, #15, #16).
>
> **Done in the bump:** #12 hand-roll deleted (`TjsAutocompleteConfig` → real `AutocompleteConfig`
> from `tjs-lang/editors/codemirror`, `import type` → zero bundle cost); #15's inline-WASM guard
> rewritten (0.10.x renamed the compiled export `__tjs_wasm_0` → collision-free
> `__tjs_wasm_<hash>_<n>` per #11 — guard matches by pattern now, and the `__tjs.records` recorder is
> NOT reachable in the doc-system's inline-test scope, so pattern-match is the way).
>
> **Still to do (see TODO.md):** #10's ~130-line scope scanner CAN be replaced by
> `scopeCaptureEpilogue`/`collectScopeSymbols` from `tjs-lang/editors`, but those are acorn-based and
> `withScopeCapture` runs on every example execution — a static import bundles acorn onto the reader
> path, so it needs a lazy-load / edit-time gate first (don't regress slices 2/3). #16's
> `tjsEditorExternal` probe stays as belt-and-suspenders until an isolated-tree build is verified
> without it. And watch RSS over a real multi-day watch session (the storm being gone is the point).
>
> **Two open asks OF us (cross-repo), filed from the tjs-lang side:**
> - **tosijs-ui#12** — RFC: a **language-plugin registry** for live-example (invert the hardcoded
>   `js|ts|tjs` switch) so tjs-lang can drop its AJS playground into doc pages without tosijs-ui
>   depending on `tjs-lang/vm`. Touches `code-transform.ts`/`checkExamples` directly; the test of
>   the abstraction is re-expressing js/ts/tjs as built-in plugins. A real design task, not a fix.
> - tjs-lang **#20** (promote the TFS service-worker bare-import resolver to a real export) and
>   **#18** (worker-ready WASM) are the newer asks our live examples would consume — the
>   service-worker work the maintainer is on now.

### Open (waiting on tjs-lang)

- **[#9](https://github.com/tonioloewald/tjs-lang/issues/9) — Passing a non-`wasmBuffer`
  typed array silently copies it on every call.** The wrapper only takes the zero-copy
  path when `array.buffer === wasmMemory.buffer`; otherwise it copies every array in
  _and_ back out per call. Our 100k-particle SIMD demo was **4.4× SLOWER than its own JS
  fallback** — we were benchmarking `memcpy`, not SIMD. Allocating via `wasmBuffer()`
  took the kernel 0.105 → 0.015 ms/step (7×), flipping the result to ~5.9× _faster_.
  _Ask:_ warn in dev when a wasm param receives a non-wasm-memory array.
  **Our workaround:** allocate everything crossing the boundary with `wasmBuffer(...)`,
  guarded (`globalThis.wasmBuffer ? … : new Float32Array(n)`).

- **[#11](https://github.com/tonioloewald/tjs-lang/issues/11) — WASM ready/enable are
  `__`-prefixed globals, not a public API.** 0.9.1 delivered the capability but kept the
  coupling: `__tjs_wasm_ready` (a _function_ returning a promise), `__tjs_wasm_enabled`,
  `__tjs_wasm_pending`. Also `__tjs_wasm_N` is **index-keyed per transpile**, so two wasm
  examples on one page alias each other.
  _Ask:_ export `tjsWasmReady()` / `setWasmEnabled()`; make the artifact name collision-free.
  **Our workaround:** we write against the globals (non-destructively).

- **[#13](https://github.com/tonioloewald/tjs-lang/issues/13) —
  `tjsCompletionSource` is only reachable via `autocompletion({override})`.**
  `state.languageDataAt('autocomplete', pos)` silently returns the **base JS** source,
  which answers `null` for `app.` — so a working feature looks broken. Nearly filed a bug
  against a feature that was fine.
  **Our workaround / the right probe:** drive `tjsCompletionSource(config)(new
CompletionContext(state, pos, true))` headlessly. Never trust `languageDataAt` here.

- **[#14](https://github.com/tonioloewald/tjs-lang/issues/14) — `getMembers` is
  mis-signposted.** `getLiveBindings` already resolves _nested_ paths
  (`app.items.` → array methods), so `getMembers` is only for scopes you can't hand over
  synchronously. We built toward it unnecessarily.

### ✅ Resolved

_Fixed in tjs-lang **0.10.0** (we still ship 0.9.1 — the workarounds stay until we bump; see
the reconciled note above):_

- **[#10](https://github.com/tonioloewald/tjs-lang/issues/10) — Export the AST scope
  extractor.** ✅ 0.10.0 exports `collectScopeSymbols` (+ `introspectValue`,
  `scopeCaptureEpilogue`) from the framework-free `tjs-lang/editors` entry. **On bump, delete**
  `extractTopLevelBindingNames` + `buildScopeCapture` (~130 lines) in `code-transform.ts`.
- **[#12](https://github.com/tonioloewald/tjs-lang/issues/12) — `editors/codemirror` ships no
  `.d.ts` / `types` condition.** ✅ 0.10.0 emits `.d.ts` and declares `types`. **On bump, drop**
  the hand-declared `TjsAutocompleteConfig` in `code-editor-cm.ts` for the real import.
- **[#15](https://github.com/tonioloewald/tjs-lang/issues/15) — silent `wasm{}`→JS fallback.**
  ✅ 0.10.0 records it as a `source:'wasm'` warning (`__tjs.records({ source:'wasm' })`), once
  per site. **On bump,** consider replacing the internals-poking inline WASM guard with this.
- **[#16](https://github.com/tonioloewald/tjs-lang/issues/16) — `@codemirror/*` bare imports,
  no peerDeps.** ✅ 0.10.0 declares them optional `peerDependencies`. **On bump,** the
  `tjsEditorExternal()` probe can likely simplify (keep as a belt-and-suspenders until verified).

- **Stale `editors/codemirror` build** (missing `tjsEditorExtension` /
  `tjsCompletionSource`) — ✅ **fixed in tjs-lang@0.9.0**. Unblocked first-class tjs.
- **No awaitable WASM ready signal** — ✅ **fixed in tjs-lang@0.9.1**
  (`globalThis.__tjs_wasm_ready`). See #11 for the API-shape follow-up.
- **No WASM enable/disable toggle** — ✅ **fixed in tjs-lang@0.9.1**
  (`globalThis.__tjs_wasm_enabled`). See #11.
- **`f32x4` had no compare/select/min/max** (masked SIMD impossible) — ✅ **fixed in
  tjs-lang@0.9.1** (`f32x4_lt/le/gt/ge/eq/select/min/max`).

### Not filed (documentation gaps we absorbed)

- int→float coercion is per-binary-op inside `wasm{}`, so `x / w` with two `i32`s does
  **integer** division and only promotes at the next operator. Force f64 early
  (`let fx = x + 0.0`). Now covered by the docs' Numeric Types table.

---

## haltija

- **NOT YET FILED** — haltija's window fires **no animation frames** when backgrounded
  (verified: an `rAF` callback never runs). tosijs's entire render pipeline is rAF-driven,
  so under `hj eval` a _correct_ component never calls `render()`, leaving parts empty and
  measuring 0×0 — indistinguishable from a broken one. This nearly caused a false
  diagnosis of a correct fix during 1.7.
  **Our rule:** `hj` is for **state**, never for **paint**. Use Playwright for anything
  about rendered output, and wait for the frame before measuring.
  _(Needs sign-off to file against a repo outside the current task's scope.)_

- ~~Shipped dev server spawns an **unpinned** `bunx haltija@latest`~~ — **✅ RESOLVED both
  sides.** Our side (2026-07-14): `dev-server.ts` spawns `HALTIJA_PKG` = `haltija@^1.4.0`,
  overridable via `HALTIJA_VERSION`. Upstream: **haltija 1.4.0 delivers the version contract we
  asked for** — every REST response carries `X-Haltija-Version`, `hj --version` exists and warns
  when it differs from the server it drives, a server never overwrites a newer/ symlinked `hj`,
  and pre-1.4.0 servers are retired via `POST /shutdown` on startup (opt out with
  `HALTIJA_NO_INSTALL` / `HALTIJA_NO_RETIRE`). So an embedder's `bunx haltija@<pin>` can no
  longer silently downgrade an unrelated project's CLI — which was the whole hazard.
