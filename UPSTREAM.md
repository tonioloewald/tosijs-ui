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

- **Status 2026-08-02: #36377 was AUTO-CLOSED as a duplicate and the ask is now split in two.**
  A dedupe bot flagged it on 07-29 ("add a comment to prevent auto-closure"), nobody did, and it
  closed on 08-02. The dedupe was half right — it bundled two asks and the bot matched one:

  - **Nested / path-scoped `overrides`** → **[oven-sh/bun#6608](https://github.com/oven-sh/bun/issues/6608)**
    (OPEN since 2023-10-19, 24 comments). Genuinely the same ask; our remediation use case is
    added there as a comment. **This is the half that bites us.**
  - **`bun audit` scoping by dependency class** → refiled tightly scoped as
    **[oven-sh/bun#36773](https://github.com/oven-sh/bun/issues/36773)**. NOT covered by #6608,
    which is about install-time resolutions.

  Both closed/refiled issues carry pointers to each other so the trail survives.
  **Lesson worth keeping: one ask per issue.** A two-ask issue is one a bot can close by matching
  half of it, and the other half goes with it silently.

- **(historical, now closed) [oven-sh/bun#36377](https://github.com/oven-sh/bun/issues/36377)** — `bun audit` can't be
  scoped by dependency class (no `--production` / `--omit=dev`, and the JSON carries no
  dev/prod flag or dependency path), and `overrides` can't express a **nested/path-scoped**
  constraint the way npm's `{"foo": {"bar": "1.2.3"}}` / `"baz > qux"` forms do.

  **Why we care.** Both are the same need: _act on a specific dependency path, not a package
  name globally._ Our audit gate (`src/doc-system/site/audit-guard.ts`) deliberately blocks on
  every high+ advisory regardless of dep class — the time-boxed gate makes over-blocking cheap
  and a dev-only dep still runs on the developer's machine — so **we are not blocked on the
  `--production` half**. It would only let a consumer of `tosijs-ui/site` express a different
  policy. The **nested-overrides** half is the one that bites: remediating one transitive path
  currently forces a global pin, which is exactly the broad churn our own gate's due-diligence
  output warns against (every extra package that moves is fresh supply-chain surface).

  **Where it shows up in this repo.** `package.json` `overrides` (`flatted`,
  `brace-expansion`) are global pins for precisely this reason. When nested overrides land,
  revisit them — and any `audit.allow` gate whose reason is "can't pin narrowly" can convert
  from a time-boxed suppression into a real fix.

  **Verified working today (don't regress):** `bun audit` reports on **resolved** versions, not
  declared manifest ranges — an override genuinely clears a finding instead of needing a bogus
  gate. And it is sub-second even on a large tree, which is what makes our synchronous
  blocking gate practical. Related, previously closed: bun#30439 (nested overrides/resolutions).
  Status: **filed 2026-07-29, open.**

- **[oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053)** — `Bun.build()` leaks
  native memory per call (RSS unbounded, `heapUsed` flat), which kills long-lived watch/dev
  processes. **This has taken the machine down twice.** ~30MB per call, monotonic, invisible
  to `Bun.gc()` and to any JS heap profiler.

  **Status checked 2026-07-27: FIXED UPSTREAM — but not yet in a released bun.** The issue is
  **CLOSED (completed 07-24)**; PR #34054 was closed unmerged and the fix landed via a different
  PR, **[#34502](https://github.com/oven-sh/bun/pull/34502)** — "Verified on main at `df84f8db1`:
  sequential `Bun.build()` calls now plateau instead of growing RSS unbounded — freed memory is
  returned to the OS between builds." **BUT the latest released bun is still 1.3.14 (2026-05-13),
  the version we run — so no version we can `bun install` carries the fix yet.**
  (Re-checked 2026-08-02: `npm view bun version` → still **1.3.14**. No release in ~3 months;
  the fix remains main-only. Everything stays as-is.)

  **2026-08-02 — what the next release actually is, and why that changes the plan.** bun is
  pushing hard on **1.4, which is the Rust port**: canary is being revved frequently, and the
  remaining work is edge-case bugs concentrated in **OS integrations**. Two consequences:

  1. **Do NOT spend time on 1.4 canary yet.** Decided explicitly — it is too early, and
     chasing a moving canary on a project that ships a dev server and a build system is how you
     spend a week debugging someone else's port. Revisit when 1.4 is released, not before.
  2. **"Measure when the fix ships" now means measure against a REWRITE.** The #34053 fix landed
     on `main` in the Zig codebase; 1.4 is a different implementation. Its allocator behaviour is
     not a delta on what we measured — it is wholesale new, so every threshold in
     `memoryLimitMb` / `preflight.ts` is calibrated against a runtime being replaced. Re-measure
     rather than assume the guards are either still needed or safely removable.

  **The guards stay regardless, and not because we distrust 1.4.** They are not a workaround for
  one bug — they are an *instrument* for a class: native memory invisible to the JS heap and to
  `Bun.gc()`, in a process that lives for days. A rewrite can fix every current instance of that
  class and still admit new ones, and the failure mode is a machine that swaps itself to death
  with nothing in a heap profile. An instrument that measures outlives the bug that motivated it;
  the cost is a 60s tick. (The Rust port is reportedly aimed squarely at the class of problem we
  keep hitting as bleeding-edge users — which is a reason to expect *better*, not a reason to
  stop measuring.) Action: watch for
  the next bun release; when it lands, MEASURE (see the two caveats below — Transpiler still not
  covered) before considering reverting any workaround. Until then, **everything stays as-is.**
  Prior detail from 2026-07-20:
  **still NO movement; PR OPEN/unmerged, CONFLICTING.** Prior detail from 2026-07-19:
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

> **The foundational dependency — long unreported against, now no longer.** For most of this
> project friction against tosijs was silently absorbed into hand-rolls instead of being filed;
> #20 (below) is the first real bug filed upstream. Keep the habit: file, don't hand-roll around.

### Open (waiting on tosijs)

- **[tonioloewald/tosijs#20](https://github.com/tonioloewald/tosijs/issues/20)** — a **light-DOM
  component's `this.parts` resolves to a NESTED instance's parts** (unscoped `querySelector`). A
  light-DOM (`lightStyleSpec`) component that contains nested instances of itself gets the first
  `[part=x]` in DOM order — a child's — instead of its own. **Confirmed 2026-07-27**: on the
  self-hosting `one-source-every-artifact` demo, the container `<tosi-example>`'s
  `parts.codeEditors.closest('tosi-example') !== itself`, so its `showCode()` un-hides a nested
  example's editor (actions pipe to the wrong component). Pre-existing — surfaced, not caused, by
  the pocket-bar toolbar move to top-right. Shadow-DOM components are naturally scoped, so this is
  light-DOM-only.

  **Update 2026-07-27 — tosijs 1.7.6's fix was OVER-AGGRESSIVE; DEPRECATED, pinned to 1.7.5.** The
  1.7.6 fix stopped part collection at _every_ nested custom element — which also excludes elements
  the parent legitimately **assigned** a part to but placed _inside_ a nested component. tosijs-ui
  does exactly that: the `<tosi-code>` editors carry `part="js|html|css|test"` but live inside a
  `<tosi-tabs>`, and `testsCheckbox` lives inside `<tosi-pocket-bar>`. On 1.7.6 `this.parts.js`
  went undefined and `showCode()` threw **`elementRef "js" does not exist!`** — every code
  editor / view-edit-code / edit-in-window broke (plain-HTML examples, which don't open an editor,
  were unaffected). The user is **deprecating 1.7.6 and re-fixing** the scoping (it must exclude a
  nested component's _own_ parts but keep parts the parent assigned to slotted/placed content).
  **We pinned tosijs `1.7.5` (dev + peer `^1.7.5`)** — the last solid version.

  **Update 2026-07-27 — 1.7.7 ALSO deprecated (a second, different regression).** 1.7.7 re-fixed the
  parts scoping correctly (self-healing parts: seed from content pre-hydration, absorb lazily-added
  parts on access — verified all three cases: editor-in-tabs, the original nested mis-routing, and
  inline default). BUT 1.7.7's **render-timing / computed-getter change broke `<tosi-segmented>`** on
  **Firefox + WebKit** (Chromium fine): after clicking a segment the value updates but the highlight
  stays on the previously-selected one. Mechanism — segmented's `render()` rebuilds its `<label>`s
  from the `values`/`isOtherValue` getters and relies on a one-shot `valueChanged` flag to _skip_
  that rebuild right after a click; on 1.7.7 the skip no longer holds on FF/WebKit and a rebuild
  re-derives `checked` from a stale getter. Passed on 1.7.0; broke on 1.7.7. **Handed to tosijs; the
  user is deprecating 1.7.7 too and fixing the render timing** (likely affects more than segmented —
  any interaction-vs-render assumption). **Still pinned `1.7.5`.** Re-bump to the next corrected
  tosijs, then re-run the FULL Playwright lane (Chromium-only CI would have shipped this).

  **Update 2026-07-27 (part 2) — 1.7.7 has TWO distinct problems; the anti-pattern half is now
  fixed our side, the other is still tosijs's.** tosijs argued (correctly) that the components were
  depending on `render()` being **skipped** (the one-shot `valueChanged` flag) — an anti-pattern
  1.7.7 merely exposed. We removed it from all three offenders (`segmented`, `color-input`, `form`):
  `render()` is now idempotent (reconcile-in-place / check-before-write, skipping only _provably
  redundant_ work — colours compared parsed so `#rrggbb ↔ rgba()` doesn't clobber the caret). That
  hardening is committed and green **9/9 on 1.7.5** (all browsers) and fixed pre-existing FF
  flakiness + focus-loss-on-click. **BUT** re-testing the hardened components against **1.7.7** shows
  a _second, deeper_ regression the hardening cannot touch: after a click, `input.checked` is
  correct (`['no']`) yet **`this.value` is STALE (`'yes'`)** — the **change handler** commits a stale
  value, not a render-skip issue. So **un-deprecating 1.7.7 as-is would STILL break segmented** even
  with hardened components. tosijs needs to fix the change-event/render interaction (value staleness
  in the handler) in addition to the parts fix, before 1.7.7 (or a successor) is safe. **Filed as
  [tonioloewald/tosijs#21](https://github.com/tonioloewald/tosijs/issues/21)** with concrete repro
  steps (`segmented.pw.ts:7` on webkit/firefox: `input.checked` correct, `this.value` stale). The
  user is adding test coverage tosijs-side.

  **CSS half — DONE.** The live-example's state-class rules now use
  `:host.-STATE > [part="example"] > [part="exampleWidgets"]` child chains (a container example's
  state can't tint a nested handle). Kept across the version churn; independent of the tosijs fix.
  On 1.7.5 the original nested mis-routing itself remains until the fixed tosijs lands (the demo
  self-isolates enough that it's not user-visible right now).

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
>
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
>
> - **tosijs-ui#12** — RFC: a **language-plugin registry** for live-example (invert the hardcoded
>   `js|ts|tjs` switch) so tjs-lang can drop its AJS playground into doc pages without tosijs-ui
>   depending on `tjs-lang/vm`. Touches `code-transform.ts`/`checkExamples` directly; the test of
>   the abstraction is re-expressing js/ts/tjs as built-in plugins. A real design task, not a fix.
> - tjs-lang **#20** (promote the TFS service-worker bare-import resolver to a real export) and
>   **#18** (worker-ready WASM) are the newer asks our live examples would consume — the
>   service-worker work the maintainer is on now.

### Open (waiting on tjs-lang)

_**Status checked 2026-07-27: no movement.** #9, #11, #13, #14 all still OPEN; latest published
tjs-lang is **0.12.0** (2026-07-20) — the version we ship — so no new release carries a fix. Our
workarounds (documented per-issue below) stay._

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
'tjs-lang/editors/codemirror'`; `TjsAutocompleteConfig` is a deliberate stable _alias_ over
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
  - **Status checked 2026-07-27: UNBLOCKED — haltija#7 is FIXED in v1.5.5** (latest v1.5.7). The
    private instance now tears _itself_ down: a private run never takes the single-instance lock
    (`gotTheLock = IS_PRIVATE ? true : requestSingleInstanceLock()`) and self-cleans on exit — so
    the orphan/lock cycle that blocked us is gone, and consumers no longer hand-reap a reparented
    tree. tosijs-ui#21 is now **actionable**: redo the `--private --ci` doc-test-lane migration
    (proven green pre-teardown-bug), and **bump the floor `haltija@^1.5.0` → `^1.5.5`** so the fix
    is guaranteed. Prior status (07-21): reverted to shared-adopt, blocked on haltija#7.

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
