# 1.7 Plan — CodeMirror editor + first-class tjs (autocomplete, inline WASM)

Status: **planning / viability assessment** (not started). Potentially breaking → **1.7**.

> **Spike done (2026-07-02):** an inline-WASM tjs example runs **unchanged** through
> the live-example path. `loadTransform('tjs')` → transform emitted a self-contained
> base64-embedded WASM module (`__tjs_wasm_0`, `atob`→`Uint8Array`→instantiate) inline
> in the JS; `new AsyncFunction(code)()` executed it and `add(3,4)` returned `7`
> computed in WASM. **Workstream C's runtime is essentially free** — no execution-path
> changes needed; C reduces to a demo + docs + editor highlighting (already covered by
> the tjs language) + a real-browser async-timing check.

> **Bundle model (confirmed intent):** the editor lives behind subpath exports
> (`tosijs-ui/code-editor`, `tosijs-ui/live-example`), so a plain component consumer
> pulls **no** CodeMirror. Use the editor → CodeMirror is bundled with it. No editor,
> no tax.

## Verdict

**Highly viable, medium effort — because tjs-lang has already done the hard parts.**
tjs-lang (0.8.7) ships a CodeMirror 6 language for tjs/ajs _with runtime-value
autocomplete_, and its browser transpiler bundle already compiles inline WASM.
tosijs-ui's work is integration, API adaptation, packaging, and demos — not
building a language server or a WASM compiler.

Rough sizing: **~1–2 weeks focused.** The risk is CodeMirror packaging/bundle-size
and wiring the autocomplete introspection to the live-example sandbox.

## What tjs-lang gives us (checked against installed 0.8.7)

| piece                                                                                                            | state                                                                  | export                                            |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- | ------- |
| tjs/ajs CM6 **language + editor extensions** (`ajsEditorExtension`, `tjsEditorExtension`)                        | ✅ built, published                                                    | `tjs-lang/editors/codemirror` (`ajs-language.js`) |
| **Autocomplete** `tjsCompletionSource(config)` + `AutocompleteConfig`                                            | ✅ built, published                                                    | same                                              |
| **`<code-mirror>` web component** (tosijs `Component`, modes ajs/tjs/js/css/html/md, value/editor, change event) | ⚠️ **source-only** (`component.ts`), NOT built/exported                | —                                                 |
| ACE mode for tjs (`ajs-mode`), Monaco monarch, VSCode ext                                                        | ✅                                                                     | `tjs-lang/editors/ace                             | monaco` |
| **Inline WASM** compiler (`wasm function` / `wasm{}` → bytecode)                                                 | ✅ in the **browser** bundle (`tjs-browser.js` references WebAssembly) | via the normal transpile path                     |

The **autocomplete is the compelling bit.** `AutocompleteConfig` can introspect
_actual runtime values_:

- `getLiveBindings()` → map import names to real values (`{ elements: Proxy, div: … }`)
- `getMembers(path)` → async, returns the value's **real runtime members from the
  executed sandbox scope — including proxy-generated ones nothing static can see.**

The live-example component already has the example's context and executes it, so it
can feed those — autocomplete against the _actual_ `tosijs`/`tosijs-ui` objects the
example uses, proxy members and all. Nobody else can do that.

**Packaging caveat:** the published `ajs-language.js` imports CodeMirror via a mix of
bare (`@codemirror/state`) and CDN (`https://esm.sh/codemirror`) specifiers — CM6 is
**not bundled**. And the `<code-mirror>` component is **source-only** (not exported
built). So "just use tjs-lang's editor" means either (a) get tjs-lang to publish its
component built, or (b) build our own thin CM6 component reusing tjs-lang's _language_
export (its `component.ts` is a ready reference to adapt).

## Current state (ACE) — from the audit

- `src/code-editor.ts` (193 lines) is the **only** file touching ACE. ACE 1.23.2 is
  **CDN-loaded, not bundled** (0 bytes in `dist/iife.js`).
- `<tosi-code>` API: `value`, `original` + `showDiff()` (already editor-agnostic —
  built on `tosi-diff`), `mode`, `disabled`, plus **ACE-leaking** `editor` / `ace` /
  `options` / `theme` getters.
- Consumers: `live-example/component.ts` (4 editor tabs + **reaches into raw
  `.editor` for undo/redo/undoManager** — the tightest coupling), `doc-browser.ts`
  (source editor + `editorModeFor()` → js/css/html/markdown/typescript). `diff.ts`
  and `save-to-source.ts` are editor-independent.
- Already a roadmap item: `TODO.md:141` "replace ace editor with CodeMirror (peer dep)".

## Workstreams

### A. ACE → CodeMirror (~2–4 days)

- Rewrite `code-editor.ts` on CM6, adapting tjs-lang's `component.ts` as the base and
  its `ajs-language` for languages. Keep `value`/`original`/`showDiff`/`mode`/
  `disabled` stable.
- **Add real methods** `undo()`/`redo()`/`canUndo()`/`canRedo()` (CM `history`) so
  `live-example/component.ts` stops reaching through `.editor` (5 call sites).
- Map modes: `editorModeFor()` + the live-example tabs → CM `LanguageSupport`.
- **Packaging decision:** CM6 as an optional **peer dep** (tree-shaken, per the
  `TODO.md` plan for babylon/lottie/mapbox) vs **CDN-loaded** like ACE today (keeps
  bundle at 0 but adds a module waterfall). tjs-lang's dual bare/esm.sh imports mean
  either works.
- **Breaking (→1.7):** `theme` default (`ace/theme/tomorrow`), `options` (ACE-shaped),
  `ace` getter (remove), `editor` getter (now a CM `EditorView`). No event contract
  breaks (editor emits none today).

### B. First-class tjs + autocomplete (~1–2 days)

- Add a **`tjs` editor mode** using tjs-lang's `tjsEditorExtension` + a `tjs` tab in
  live-example (execution dialect already exists).
- Wire `tjsCompletionSource` with an `AutocompleteConfig` fed from the live-example:
  `getLiveBindings()` from the example context, and `getMembers()` from the executed
  sandbox scope (there's already an introspection story in tjs-lang to lean on).
- Gate all of this behind tjs-lang being present (it's already the optional peer the
  live-example lazy-loads for transpilation) — plain CM (js/css/html) works without it.

### C. Inline WASM in live examples (~1–2 days, mostly verification)

- The browser transpiler **already compiles inline WASM**, so a `tjs` example with
  `export wasm function dot(a: Float32Array, …): f64 { … }` or a `wasm{}` block should
  transpile through the existing path. **Key unknown to verify:** the execution wiring
  handles the WASM bootstrap (`js-wasm` emitter → async `WebAssembly.compile`) — the
  transform is already async for `ts`, so this is likely a small change or already works.
- Editor highlighting of `wasm`/types is free (tjs language covers it).
- Deliver a **demo** that sells it: a hot-path kernel (audio/physics/image or a
  vector-search using `tjs-lang/linalg`) showing WASM speedup, live and editable.
- Reference: tjs-lang `docs/WASM-QUICKSTART.md`, `DOCS-WASM.md`.

## The key decision (your "use tjs-lang's editor, maybe configurable")

Your instinct is right — reuse, don't rebuild. Two shapes:

1. **Adopt tjs-lang's `<code-mirror>` component** — least code, but needs tjs-lang to
   publish it built + couples the editor tightly to tjs-lang (and pulls CM6 through it).
2. **tosijs-ui owns a thin CM6 `<tosi-code>`, reusing tjs-lang's _language_ export**
   (recommended) — self-contained, stable `<tosi-code>` API, tjs autocomplete layered
   in _when tjs-lang is present_, plain js/css/html/md when it isn't. tjs-lang's
   `component.ts` is the reference to adapt (~a few hundred lines).

**"Configurable" fits (2) cleanly as progressive enhancement:** tjs-lang present → CM6
with tjs highlighting + runtime autocomplete; absent → CM6 with plain js/css/html. The
editor adapts to what's installed, exactly like the transpiler already does.

## Open questions / risks

- **Bundle size**: ACE is CDN (0 bytes today). CM6 core + a few languages is ~150–300KB.
  Peer-dep-and-bundle grows the doc-site iife; CDN-load keeps it 0 but adds a waterfall.
  Measure both; decide.
- **CM6 packaging** through tjs-lang's language export (bare vs esm.sh) — pick one path
  and make it deterministic.
- **Autocomplete introspection** wiring from the executed sandbox is the fiddliest bit.
- **WASM execution** path in live-example — verify early (spike it first).
- Cross-repo: some of this may want small tjs-lang changes (export the built component,
  or a stable editor entry). You own both, so coordinated, but it's a release dance.

## Suggested sequencing

1. **Spike (½ day):** run a tjs live example with an inline `wasm function` today — does
   it execute? That de-risks C and tells us how much of the transform path is ready.
2. **A** (CM6 `<tosi-code>` + undo/redo methods + mode mapping, CM packaging decision).
3. **B** (tjs mode + autocomplete wired to the live-example context).
4. **C** (WASM demo + any async-bootstrap fix + docs).
5. Bundle-size pass, breaking-change notes, CHANGELOG, migration guide → **1.7.0**.
