# TJS adoption feedback (from tosijs-ui)

Friction encountered while adopting tjs-lang in tosijs-ui — kept so it can feed
back into improving TJS for everyone. Each item: what happened, why it's friction,
and a suggested improvement. Some may be usage errors on our side; where so, that
usually means the docs or a diagnostic could prevent the next person's stumble.

Context: tosijs-ui uses tjs-lang as the live-example transpiler (`js`/`tjs`/`ts`
dialects, browser bundles), and (v1.7 WIP) is building a first inline-WASM live
example. Tested against **tjs-lang 0.8.7**.

## Inline WASM

### 1. A `wasm { }` block that can't compile falls back **silently**
A whole-frame Mandelbrot kernel (triple-nested loop `for y { for x { for i {…} } }`
writing to a `Float32Array`) produced *correct output, fast* — but it was running
the `fallback { }`, not WASM. There was no error, warning, or signal; the only way
to tell was checking `globalThis.__tjs_wasm_0` (undefined ⇒ it fell back). A
single-loop kernel and a scalar-returning `wasm{}` block both compiled fine, so
there's an (undocumented) complexity/nesting ceiling that degrades invisibly.
- **Suggestion:** emit a dev-mode `console.warn` (or a field on the transpile
  result) when a `wasm{}` block fails to compile and falls back, naming the block
  and the unsupported construct. Silent fallback makes WASM look like it "works"
  when it isn't — the worst failure mode for a perf feature.

### 2. WASM instantiation is async with no awaitable ready signal
The emitted bootstrap is `;(async()=>{ … globalThis.__tjs_wasm_0 = fn })()` —
fire-and-forget. Any synchronous code that calls the function right after
transpile+eval runs the **JS fallback**, because `__tjs_wasm_0` isn't set yet
(`await WebAssembly.compile/instantiate` is still pending). There's no exposed
promise or flag to await; you have to poll the internal `globalThis.__tjs_wasm_N`.
This bit us hard: our first "it renders correctly!" checks were all the fallback.
- **Suggestion:** expose an awaitable ready signal — e.g. a `globalThis.__tjs_wasm_ready`
  promise, or make each wrapper `await` instantiation on first call, or a
  `tjsWasmReady()` helper. Right now correct WASM use requires knowing an internal
  detail.

### 3. No public WASM enable/disable toggle for benchmarking
tjs's own playground shows a WASM-vs-JS-fallback perf comparison, but there's no
public API to force the fallback. The only lever is nulling `globalThis.__tjs_wasm_N`
— an implementation detail whose name depends on module/function index, so it's
fragile in consumer code.
- **Suggestion:** a public toggle (`setWasmEnabled(false)` / a `{ wasm: false }`
  runtime flag) plus the ready signal from #2, so consumers can build the same
  "WASM vs JS, N× faster" comparison the playground does, robustly.

### 4. int→float coercion is per-binary-op → silent integer division
Inside `wasm{}`, `x / w` where both are `i32` (loop vars / `0`-annotated params)
does **integer division** and only promotes to `f64` at the *next* operator. So
`(x / w - 0.5)` computes `0 - 0.5` for all `x < w`. The fix is to force f64 early
(`let fx = x + 0.0`), but nothing flags the mistake — you just get a wrong (or
constant) result.
- **Suggestion:** document this prominently in the WASM guide, and/or lint mixed
  `i32/i32` division in a `wasm{}` block that feeds a float context.

### 5. Supported control-flow inside `wasm{}` isn't documented
Related to #1: we couldn't find a list of what's allowed inside a `wasm{}` block
(loop nesting depth, array writes in nested loops, `break`, etc.). We reverse-
engineered it by trial: scalar single-loop ✓, returning block ✓, triple-nested
fill ✗ (silent fallback).
- **Suggestion:** a "supported subset" section (grammar-level) in DOCS-WASM.md, and
  errors (not silent fallback) for anything outside it.

### 6. `f32x4` has no compare / select / min / max — masked SIMD is impossible
The SIMD intrinsics are `add/sub/mul/div/neg/sqrt/splat/load/store/extract_lane/
replace_lane` — arithmetic only. There is **no lane comparison** (`lt/le/gt/ge/eq`
→ mask), **no `select`/blend**, and no `min`/`max`/bitwise ops. That rules out the
entire class of *data-dependent* SIMD kernels:
- a **SIMD Mandelbrot** (per-lane escape masking — the canonical SIMD showcase),
- clamping / saturating, conditional blends, branch-free `if` on lanes.
So SIMD is usable only for fully branchless arithmetic (which is what our particle
demo ended up being). This is the single biggest limiter — most interesting SIMD
kernels need a compare+select.
- **Suggestion:** add `f32x4_lt/le/gt/ge/eq` (returning a lane mask), `f32x4_select(mask,
  a, b)` (or a v128 bitselect), and `f32x4_min/max`. That unlocks SIMD Mandelbrot,
  saturating math, and most real SIMD algorithms.

## Editor integration (CodeMirror)

### 7. Published `editors/codemirror` build is STALE — missing `tjsEditorExtension` + `tjsCompletionSource` (blocks tjs autocomplete)
The source `editors/codemirror/ajs-language.ts` exports `tjsEditorExtension`,
`tjsCompletionSource`, and the `AutocompleteConfig` interface (the runtime-value
autocomplete — `getLiveBindings()` / `getMembers()`, the compelling feature). But
the **published, built** `editors/codemirror/ajs-language.js` — which
`tjs-lang/editors/codemirror` resolves to per package.json — **does not contain
them at all** (grep count 0). It only exports the older `ajsEditorExtension`,
`createAjsExtension({view,state,langJs})`, `ajsStyles`, `FORBIDDEN_KEYWORDS`. So
`import { tjsEditorExtension, tjsCompletionSource } from 'tjs-lang/editors/codemirror'`
is `undefined`, and the built entry uses a different (dependency-injection) API than
the source.
- **Impact:** blocks adopting the tjs runtime-value autocomplete in tosijs-ui
  (workstream B of the CodeMirror migration). The feature exists in source but ships
  nowhere consumable.
- **Suggestion:** rebuild + republish `editors/codemirror` so the artifact matches
  the source (export `tjsEditorExtension` / `tjsCompletionSource` / `AutocompleteConfig`).
  Ideally also surface it with `types` so consumers get the `AutocompleteConfig` shape.
  (Verified against tjs-lang 0.8.7.)

## Positive findings (data points)
- **A compute-bound branchless `f32x4` kernel is genuinely faster** — a single-loop
  kernel with ~15 arithmetic ops/element measured **~2.0× vs the JS fallback**
  (bun/native; likely more in a browser). Confirms the intuition that **scalar WASM
  is a wash vs the JIT, but SIMD pays off** — so exposing more SIMD (see #6) is where
  the leverage is.
- Multi-array marshaling (4 `Float32Array` params into one `wasm{}` call) works
  correctly, no copy surprises.
