# Upstream

Rough edges hit in in-house dependencies, mirrored here so the context stays where we
work. **This file is not a channel** — the GitHub issue on the target repo is. Every
entry below links to its filed issue; an entry without one is a complaint nobody will
ever read. See `tosijs-coding-practices/practices/cross-project.md`.

Mark `✅ RESOLVED (fixed in <pkg>@<version>)` when it lands, and close the issue.

**Review cadence — weekly.** Issues filed outside our control (the ones linked below)
get re-polled **once a week**: check each linked issue/PR for state changes, a merge, or
a released version that carries the fix, then refresh its `Status checked <date>` line
with what moved. A passive tracking doc rots; the heartbeat is what keeps it honest. Any
session that opens this file and sees a `Status checked` line older than ~a week should
re-poll before relying on it. (An in-session weekly cron can nudge this, but crons are
session-only + expire in 7 days — this line is the durable reminder.)

---

## bun

- **[oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053)** — `Bun.build()` leaks
  native memory per call (RSS unbounded, `heapUsed` flat), which kills long-lived watch/dev
  processes. **This has taken the machine down twice.** ~30MB per call, monotonic, invisible
  to `Bun.gc()` and to any JS heap profiler.

  **Status checked 2026-07-20: still NO movement (issue + PR both untouched since 2026-07-12;
  latest release still 1.3.14 / 2026-05-13, the version we run). PR remains OPEN/unmerged —
  GitHub currently reports `mergeable: UNKNOWN` (recomputing) after showing `CONFLICTING` on
  07-19; either way it has not landed.** Prior detail from 2026-07-19:
  **NO movement, PR now stale. Issue OPEN (last touched 2026-07-12);
  [PR #34054](https://github.com/oven-sh/bun/pull/34054) still OPEN/UNMERGED and has gone
  `CONFLICTING`/`DIRTY` — it now has merge conflicts with base and needs a rebase before it can
  land. Latest released Bun is still 1.3.14 (2026-05-13) — the version we run — so NO released
  Bun has the fix.** (Prior check 2026-07-14 was the same modulo the PR not yet conflicting.)
  Bun reproduced it, and their diagnosis is sharper
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

### Note — experimental `tosijs/debug` + `tosijs/safe` builds are METADATA-ONLY in 1.7.0

Checked 2026-07-20 against tosijs **1.7.0-beta.1**. tosijs ships two experimental tjs-built
bundles — `tosijs/debug` (`configure({throwTypeErrors:true, logTypeErrors:true})` + a console
banner) and `tosijs/safe` (same, flags `false`). **Verified empirically that they check
NOTHING yet**: with `tjs-lang/runtime` installed first (`installRuntime()` — importing the
module alone does NOT self-install `globalThis.__tjs`) and config maxed to `safety:'all',
throwTypeErrors:true`, assigning a string to a numeric observable neither threw, recorded, nor
errored (`records=0 errors=0`, value silently became the string). Confirmed structurally: the
debug bundle contains ZERO enforcement-call markers (`checkType`/`checkFnShape`/`emitRuntimeWrapper`)
— config can't switch on code that wasn't compiled in. The bundle's own banner says so:
"Ships runtime type metadata (`__tjs`) per function; **runtime type enforcement arrives as
modules move to native TJS (tosijs 2.0)**." The state-update type-checking + flight-recorder
integration lives on the **tosijs 2.0 branch**, not 1.7.0.

**Consequence:** do NOT build `tosijs-ui/debug` / `/safe` parallel distributions yet — they'd
cost ~1.4MB tarball (one mirrored ESM tree, since debug/safe differ only by a `configure()`
call + banner — same build) and find zero bugs. Revisit when 2.0 wires enforcement; the two
prerequisites are already scoped: (1) a single-tosijs-instance mirror so tosijs-ui can consume
the experimental build without dual-registry collisions, and (2) tosijs-ui feeding
`__tjs.record()` for things WE control (live-example failures, wasm fallbacks). The recorder
API itself works today (`record()` → `records({source,severity})` round-trips). Not filed —
it's a roadmap sequencing note, not a bug.

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
> **Done in the bump:** #10, #12, #15 hand-rolls all deleted.
> - **#10** — replaced our ~272-line scope scanner (`extractTopLevelBindingNames` +
>   `buildScopeCapture` + `maskLiterals`/`patternNames`/… helpers) with `scopeCaptureEpilogue` from
>   `tjs-lang/editors`. The earlier "acorn bloat" worry was WRONG: the `tjs-lang/editors` entry is a
>   self-contained ~5KB file with **no** imports (no acorn), so the static import is negligible —
>   measured, the hydrate entry went 121.9 → 121.8KB gzip (net smaller). Verified via the real
>   `tjsCompletionSource` in `scope-autocomplete.test.ts`.
> - **#12** — `TjsAutocompleteConfig` → real `AutocompleteConfig` from `tjs-lang/editors/codemirror`
>   (`import type` → zero bundle cost).
> - **#15** — inline-WASM guard rewritten. 0.10.x renamed the compiled export `__tjs_wasm_0` →
>   collision-free `__tjs_wasm_<hash>_<n>` (per #11), so the guard matches by pattern now. NB the
>   `__tjs.records` recorder is NOT reachable in the doc-system's inline-`test()` scope (only tjs's
>   native test runner sets `globalThis.__tjs`), so pattern-match is the way.
>
> **Still to do (see TODO.md):** #16's `tjsEditorExternal` probe stays as belt-and-suspenders until an
> isolated-tree build is verified without it. And watch RSS over a real multi-day watch session (the
> storm being gone is the point of the version).
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

_Fixed in tjs-lang **0.10.0**. **Status checked 2026-07-20: all four are CLOSED upstream
(closed 2026-07-16) and we now ship 0.11.0 — the bump happened, so the "on bump" actions below
are RECONCILED against the code:**_

- **#10 ✅ done** — `extractTopLevelBindingNames` / `buildScopeCapture` are gone from
  `code-transform.ts`; we use the upstream `tjs-lang/editors` entry.
- **#12 ✅ done** — `code-editor-cm.ts` now `import type { AutocompleteConfig } from
  'tjs-lang/editors/codemirror'`; `TjsAutocompleteConfig` is a deliberate stable *alias* over
  the real type (name stability for our public surface), not a hand-declaration.
- **#15 ✅ decided, NOT adopted** — we kept the pattern-match guard
  (`/^__tjs_wasm_[a-z0-9]+_\d+$/`) rather than `__tjs.records({source:'wasm'})`, because
  `__tjs.records` is not reachable in the doc-system inline-test scope. Deliberate, keep.
- **#16 ✅ CLOSED OUT 2026-07-20 — the probe STAYS; the "can likely simplify" guess was wrong.**
  Verified empirically: `tjs-lang` is an **optional** peer of tosijs-ui
  (`peerDependenciesMeta.tjs-lang.optional = true`), and bundling
  `tjs-lang/editors/codemirror` when it isn't installed is a hard build failure
  (`error: Could not resolve`). `tjsEditorExternal()` guards **"is tjs-lang itself
  present?"** — orthogonal to what #16 fixed (**"does tjs-lang declare its `@codemirror/*`
  peerDeps?"**, its own hygiene, which is what keeps the hoisted CodeMirror copy single).
  Deleting the probe would break every adopter who skips the optional peer — the same
  optional-peer regression class that blocked a prior review. **Do not retry this.**
  Only change made: the two call sites now share ONE probe result
  (`tjsEditorExternals` / `tjsEditorIsBundled`) so the externals list and the post-build
  guard cannot disagree. Rationale is recorded in `orchestrator.ts` at the probe.

_Original per-issue notes:_

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

- **[tosijs-ui#21](https://github.com/tonioloewald/tosijs-ui/issues/21)** (consumer-side tracker;
  haltija-side asks in the comment) — the doc-test lane's `--private` migration is **blocked in a
  plain `bunx haltija` runtime.** Checked 2026-07-20 against **haltija 1.5.0**. The `--private`
  server + port-file + `HALTIJA_PORT` routing all work; launching a browser under it does not:
  - **`--headless` needs Playwright bunx-haltija can't resolve** — logs "Playwright not installed",
    launches nothing. We have `playwright@1.58.2` + chromium, but bunx resolves from its own cache
    and **ignores `NODE_PATH`**.
  - **`--private --app` hits Electron's single-instance lock** ("Another instance is already
    running") whenever another haltija Electron is up — i.e. exactly the scenario the migration
    exists for. Works only when no other haltija Electron exists (the case that never needed it).
  - **Update 2026-07-21 (haltija 1.5.4): isolation now WORKS; teardown is the last blocker.**
    `--private --ci` (Electron, no Playwright) spawns isolated with the shared haltija up
    (`8700/8701 untouched`); the full migration ran GREEN (`33 passed`, exit 0) and left the
    shared browser untouched. BUT `--private --ci` **orphans its Electron** — our teardown can't
    reliably reap it (it reparents; even a manual early-tree reap left survivors). Each run leaves
    an Electron that (a) holds the single-instance lock → next run fails, (b) accumulates (the
    machine-exhaustion hazard). Won't hand-roll a flaky reaper into a safety-critical lane.
    **Filed upstream: [tonioloewald/haltija#7](https://github.com/tonioloewald/haltija/issues/7)** —
    reliable `--private` teardown (an `hj --port quit`/shutdown, or `--private` killing its whole
    process group incl. Electron on spawner-death / wrapper SIGTERM). With that, the migration is a
    few lines. (Blocker A — `--headless` needs Playwright — is moot: `--ci` uses Electron.)
  - **Status:** reverted the lane to shared-adopt; kept the `haltija@^1.5.0` pin. Not the CI gate
    (that's `doc-tests.pw.ts`), so no release impact. Revisit when the teardown ask lands.

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
