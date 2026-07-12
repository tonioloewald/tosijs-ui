# Upstream

Rough edges hit in in-house dependencies, mirrored here so the context stays where we
work. **This file is not a channel** — the GitHub issue on the target repo is. Every
entry below links to its filed issue; an entry without one is a complaint nobody will
ever read. See `tosijs-coding-practices/practices/cross-project.md`.

Mark `✅ RESOLVED (fixed in <pkg>@<version>)` when it lands, and close the issue.

---

## tjs-lang

Filed during the 1.7 adoption (CodeMirror + first-class tjs + inline WASM), against
**tjs-lang 0.9.1**.

### Open

- **[#9](https://github.com/tonioloewald/tjs-lang/issues/9) — Passing a non-`wasmBuffer`
  typed array silently copies it on every call.** The wrapper only takes the zero-copy
  path when `array.buffer === wasmMemory.buffer`; otherwise it copies every array in
  *and* back out per call. Our 100k-particle SIMD demo was **4.4× SLOWER than its own JS
  fallback** — we were benchmarking `memcpy`, not SIMD. Allocating via `wasmBuffer()`
  took the kernel 0.105 → 0.015 ms/step (7×), flipping the result to ~5.9× *faster*.
  *Ask:* warn in dev when a wasm param receives a non-wasm-memory array.
  **Our workaround:** allocate everything crossing the boundary with `wasmBuffer(...)`,
  guarded (`globalThis.wasmBuffer ? … : new Float32Array(n)`).

- **[#10](https://github.com/tonioloewald/tjs-lang/issues/10) — Export the AST scope
  extractor, or emit scope capture from the transpiler.** tjs already has an acorn-based
  `collectScopeSymbols()` (`editors/scope-symbols.ts`) that handles multi-line
  destructuring, multiple declarators and nested patterns — but it has no `exports`
  entry, so we hand-rolled a strictly worse scanner to feed `getLiveBindings`. Our first
  cut silently returned `[]` for wrapped destructures and dropped all but the first
  declarator, which cost our own WASM demo 12 of its 26 bindings.
  *Ask:* `tjs(code, { captureScope: '__fn' })`; minimum, export `collectScopeSymbols`.
  **Our workaround:** `extractTopLevelBindingNames` + `buildScopeCapture` in
  `src/live-example/code-transform.ts` (~130 lines). Delete when this lands.

- **[#11](https://github.com/tonioloewald/tjs-lang/issues/11) — WASM ready/enable are
  `__`-prefixed globals, not a public API.** 0.9.1 delivered the capability but kept the
  coupling: `__tjs_wasm_ready` (a *function* returning a promise), `__tjs_wasm_enabled`,
  `__tjs_wasm_pending`. Also `__tjs_wasm_N` is **index-keyed per transpile**, so two wasm
  examples on one page alias each other.
  *Ask:* export `tjsWasmReady()` / `setWasmEnabled()`; make the artifact name collision-free.
  **Our workaround:** we write against the globals (non-destructively).

- **[#12](https://github.com/tonioloewald/tjs-lang/issues/12) — `editors/codemirror` ships
  no `.d.ts` and no `types` export condition.** We re-declared `AutocompleteConfig` by
  hand (as `TjsAutocompleteConfig` in `src/code-editor-cm.ts`) and learned
  `IntrospectMember` by reading the `.ts` sources inside `node_modules`. Our copy will drift.

- **[#13](https://github.com/tonioloewald/tjs-lang/issues/13) —
  `tjsCompletionSource` is only reachable via `autocompletion({override})`.**
  `state.languageDataAt('autocomplete', pos)` silently returns the **base JS** source,
  which answers `null` for `app.` — so a working feature looks broken. Nearly filed a bug
  against a feature that was fine.
  **Our workaround / the right probe:** drive `tjsCompletionSource(config)(new
  CompletionContext(state, pos, true))` headlessly. Never trust `languageDataAt` here.

- **[#14](https://github.com/tonioloewald/tjs-lang/issues/14) — `getMembers` is
  mis-signposted.** `getLiveBindings` already resolves *nested* paths
  (`app.items.` → array methods), so `getMembers` is only for scopes you can't hand over
  synchronously. We built toward it unnecessarily.

- **[#15](https://github.com/tonioloewald/tjs-lang/issues/15) — A `wasm{}` block that
  can't compile falls back to JS silently.** Every WASM failure mode in tjs is quiet
  (won't compile → quiet; non-wasmBuffer array → quiet 4× slowdown; not awaited → quiet
  fallback). Together they let you ship a page claiming "⚡ WebAssembly SIMD" that runs
  JavaScript, with every test green. We did exactly that.
  **Our workaround:** an inline test asserting `globalThis.__tjs_wasm_0` exists after
  `__tjs_wasm_ready()` — i.e. reaching into internals to prove WASM actually happened.

- **[#16](https://github.com/tonioloewald/tjs-lang/issues/16) — `editors/codemirror`
  imports `@codemirror/*` as bare specifiers with no declared `peerDependencies`.** Only
  resolves because tosijs-ui hoists CodeMirror; hard-fails (`Could not resolve
  "@codemirror/state"`) under an isolated tree.
  **Our workaround:** `tjsEditorExternal()` probes resolution and externalizes the
  extension when it can't, degrading to TS highlighting instead of exploding the build.

### ✅ Resolved

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
  so under `hj eval` a *correct* component never calls `render()`, leaving parts empty and
  measuring 0×0 — indistinguishable from a broken one. This nearly caused a false
  diagnosis of a correct fix during 1.7.
  **Our rule:** `hj` is for **state**, never for **paint**. Use Playwright for anything
  about rendered output, and wait for the frame before measuring.
  *(Needs sign-off to file against a repo outside the current task's scope.)*

- Shipped dev server spawns an **unpinned** `bunx haltija@latest` (`dev-server.ts`) — a
  floating executable fetch from library code, with haltija in no lockfile. Wants a
  documented CLI/version contract for embedders; locally we should pin a floor and make it
  overridable.
