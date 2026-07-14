# Pre-release review — tosijs-ui 1.7.0 (branch `1.7-codemirror`, base `main`)

**Verdict: BLOCK.** One confirmed blocker must be fixed before tagging. A further 15 majors are triaged below; five of them are release-boundary-locking (public-API semantics, semver, release notes) and should be cleared in the same pass, because they become breaking or false-in-perpetuity the moment 1.7.0 hits `latest`.

Version is still `1.7.0-beta.1`, so the `beta` dist-tag is currently protecting `^1.6.x` consumers. That protection ends at the final tag — which is what makes the semver and public-API-contract findings actionable _now_ and cheap.

---

## Per-lens summary

| Lens             | Findings                           | Headline                                                                                                                                                                                                                       |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Blast radius** | 1 blocker, 1 major, 1 minor, 1 nit | `kill -9` of every process _connected to_ the dev port, including the developer's browser. Preflight `process.exit(1)` on other people's processes.                                                                            |
| **Correctness**  | 1 major, 3 minor                   | New `change` event fires on programmatic `value` assignment — a brand-new public contract that becomes breaking to fix after 1.7.                                                                                              |
| **Efficiency**   | 1 major, 1 minor, 1 nit            | The IIFE — the most-loaded artifact in the project — tripled (121KB → 388KB gzip), 100% CodeMirror, worst in the pure-docs/book case the project calls its killer feature.                                                     |
| **DRYness**      | 1 major, 4 minor, 1 nit            | The pre-hydration nav stylesheet is a hand-copied duplicate that has already drifted — every generated page paints a nav flash on hydration, the exact thing this workstream removed.                                          |
| **Docs**         | 2 major, 2 minor, 2 nit            | CHANGELOG's "Known cost" paragraph describes behavior this release no longer has; README still headlines "dependency-free" while adding 12 runtime deps.                                                                       |
| **Coverage**     | 3 major, 3 minor                   | The haltija doc-test lane cannot start from a common ambient state and is not in CI — and it is the _only_ automated guard on the headline inline-WASM feature. `mode="tjs"` has zero coverage at any tier.                    |
| **DX**           | 1 major, 1 minor, 1 nit            | A breaking `<tosi-code>` API change is shipped as a MINOR; the one break that can't be shimmed (`editor` changed type in place) is a silent runtime TypeError for `^1.6.x` consumers.                                          |
| **Ecosystem**    | 2 major, 3 minor/nit               | tosijs's `parts` proxy permanently self-poisons on pre-hydration access and we've _never_ filed against tosijs. Our own issue #6 is still broken on our own home page — and the test that caught it was loosened in this diff. |
| **Practices**    | 3 major, 4 minor                   | The shared KB is false about this repo in three load-bearing places, and _both_ prior review passes' practices findings were never written back.                                                                               |

---

## BLOCKER (1)

### B1 — `killStrayServer()` SIGKILLs every process _connected to_ the port, not just the listener

`src/doc-system/site/dev-server.ts:66`

```
await $`lsof -ti:${port} | xargs kill -9 2>/dev/null`.quiet()
```

`lsof -i:PORT` matches sockets whose **local OR remote** port is PORT — so it returns connected clients as well as the listener. Reproduced end-to-end: a listener plus a client that merely _connected_ were both `kill -9`'d by this exact command. On this machine `lsof -ti:443` returns GitHub Desktop, Proton Bridge and four `claude` processes (all pure clients; nothing listens on 443); `lsof -ti:443 -sTCP:LISTEN` returns nothing.

The call at `dev-server.ts:244` is **unconditional** — `bun start`, `bun run test-browser`, and Playwright's `webServer` (`bun start` with `PORT=8799`) all reach it. Certain victims in this repo's own workflow: the haltija Electron (already a documented flake source), Playwright's three browsers on 8799, `curl`, agent processes. `devServer` is a public export of `tosijs-ui/site`, so every adopter's dev server inherits a `kill -9` of arbitrary processes on the developer's machine.

This is the _exact_ trap the comment block 640 lines later (`dev-server.ts:708-719`) congratulates itself on having fixed for `pkill -f haltija`, on precisely the reasoning that _"a test lane that reaches outside the repo and kills the developer's tools presents as 'my tools got weird', never as a red test."_ The reasoning is un-applied here.

Pre-existing on `main`, but this release ships `devServer` to adopters, adds a second lane that invokes it, and is the release that hardened the sibling bug. **Fix is one flag.**

**Fix:** `lsof -ti:${port} -sTCP:LISTEN`, then positively identify each pid (`ps -p PID -o comm=` is `bun`/`node`) before signalling; SIGTERM with a grace period, SIGKILL only as fallback. If nothing is listening, do nothing. State the predicate in a comment: _"the process LISTENING on the port I am about to bind."_

**Compounding:** `PORT=''` yields `Number('') === 0` (`dev-server.ts:146` uses `??`, which does not treat `''` as nullish) → `killStrayServer(0)`, and `lsof -ti:0` matches sockets with an _unbound_ port. Dry-run on this machine: it would `kill -9` `identityservicesd` and `sharingd`. Fix `??` → `||` in the same pass (`playwright.config.ts:15` has the identical defect for `E2E_PORT`).

---

## MAJOR — fix before tagging (release-boundary-locking)

These lock in a public contract, a version number, or the release notes. They are cheap now and expensive-or-breaking after `1.7.0` is on `latest`.

### M1 — `<tosi-code>`'s new `change` event fires on programmatic `value` assignment _(correctness)_

`src/code-editor.ts:342` → `src/code-editor-cm.ts:295-322`

`CmHandle.setValue()` dispatches a CM transaction; the `updateListener` sees `u.docChanged` and dispatches `change`. So `el.value = x` fires the event the docs describe as _"fires when the text changes"_ — and a **`disabled` (read-only) editor emits it too** (verified: `EditorState.readOnly` gates user input, not `view.dispatch`). The library itself does this in five places, including `this.jsOutEditor.value = …` after every example run — into a read-only _output_ editor. A consumer following the documented contract (`code.addEventListener('change', e => save(e.detail.value))`) gets a spurious save/dirty-flag every time the app loads a document.

The event is **brand new in 1.7** (`main`'s ACE editor dispatched nothing), so there is no prior semantic to preserve — and tightening it after 1.7 ships is breaking.

**Fix:** annotate the `setValue()` transaction (a CM `Annotation`, or `Transaction.remote`) and have the updateListener skip `onChange` for it. Consider `Transaction.addToHistory.of(false)` so a programmatic reset isn't immediately undoable (the ACE wrapper called `getUndoManager().reset()` here).

### M2 — Breaking public-API change shipped as a MINOR _(dx)_

`package.json:3`

`^1.6.0` matches `1.7.0`. The moment 1.7.0 final goes to `latest`, any app pinned `^1.6.x` picks it up on the next `bun install` with no code change, and `el.editor.session.getUndoManager()` — documented public API in 1.6's published doc block — becomes a runtime `TypeError`. The warn-once shims (`theme`/`options`/`ace`) cannot catch it; the CHANGELOG says so itself. TS consumers get a compile error (1.6 typed `editor` as `any`, 1.7 types it `EditorView | undefined`); vanilla-JS/CDN consumers — the audience the component's own docs court — get the pure runtime TypeError with no warning at all. There is no `publishConfig` or prepublish guard: the `-beta.1` string is a manual step, not an enforced gate.

**Decision required before tagging.** The break is justified; only the version number is wrong. Recommend **publish as 2.0.0** and rename the tjs-native rewrite 3.0 — _"2.0 is reserved for the rewrite"_ is a naming preference, not a semver constraint, and it is being paid for with a silent runtime break in every downstream `^1.6` app. If 1.7 is kept: say so in the README (not just the CHANGELOG), and make `editor` warn on first access so the un-shimmable case prints one line before the TypeError.

### M3 — CHANGELOG describes behavior the release no longer has, and omits what landed after the beta tag _(docs)_

`CHANGELOG.md:16-21`

The "Known cost, deliberate for now" paragraph says generated doc pages _"hide the body until hydration — ~4.5s vs ~3.7s blank screen on a cheap phone"_ and that the pre-render fix is _"the next doc-system release, not this one."_ Commit `f4b7da14` shipped exactly that fix **on this branch** (verified: `grep -c 'opacity: 0' docs/index.html` → 0; the `:not(:defined)` chrome is present; the commit measured 4837ms → 1635ms). `git log a9c7eb34..HEAD -- CHANGELOG.md` is empty.

So the release notes actively misdescribe the release's _flagship improvement_, in the most damaging direction: an adopter evaluating 1.7 concludes reading is gated behind a 384KB bundle when it no longer is. Also missing entirely: the pre-rendered/no-JS-navigable chrome; the dev-server machine guards; **`idleTimeoutHours` (default 8)** — a silent behavior change where an adopter's dev server now self-exits after 8 idle hours; the preflight hard-exit; the haltija `^1.3.4` pin.

### M4 — Homepage/SEO title still claims "dependency-free web components" _(docs)_

`README.md:3`

`headTitle: "tosijs-ui — robust, dependency-free web components"` is burned into `docs/index.html`'s `<title>` and `og:title` and into `demo/docs.json`. This release adds 12 `@codemirror/*` entries under `dependencies` where `main` had **no `dependencies` key at all** — and the CHANGELOG says so twice. Per CLAUDE.md this divergence is permanent, so the title will not become true again. (The finding's "npm landing copy" claim is wrong — `headTitle` is inside an HTML comment and npm strips it — but the site/SEO surface is real.)

While there: README's CDN section (line 77) still says the iife bundles _"tosijs, tosijs-ui, and marked"_ — it now also carries CodeMirror, and the `<script>` path went ~120KB → ~385KB gzip.

### M5 — Doc-browser clobbers `document.title`, ignoring `headTitle` — our own open issue #6, still broken on our own home page _(ecosystem / correctness)_

`src/doc-browser.ts:812` — **closes GitHub issue #6**

`generate-site.ts:176-183` writes `<title>` as `doc.headTitle || (projectName && !doc.title.includes(projectName) ? …)`. `doc-browser.ts:812` (path routing — the default for `<tosi-doc-system>`) unconditionally does `document.title = projectName ? \`${doc.title} — ${projectName}\` : doc.title`— no`headTitle`, no de-dupe.

Verified in real Chromium against the built `docs/`: JS off → `tosijs-ui — robust, dependency-free web components`; after hydration → **`tosijs-ui — tosijs-ui`**. The title is the one thing that visibly _moves_ on hydration, directly against this release's own "hydration is purely additive, nothing moves" thesis.

Worse: `tests/localization.pw.ts` **in this diff** changed `toHaveTitle(/^tosijs-ui$/)` → `toHaveTitle(/tosijs-ui/)` — a regex that passes on the doubled value — with a rationalising comment. (In fairness: the bug is pre-existing on `main`, so the old assertion was already red, and the stated flakiness rationale is independently true. Net effect is still that the only guard on the home-page title now passes on the bug.)

**Fix (~4 lines):** add `headTitle` to the `Doc` type and mirror generate-site's precedence in doc-browser — better, factor the title rule into one shared function used by both. Restore an exact-title assertion pinned to a stable doc. Close #6 naming 1.7.0, and list it under **Fixed**.

---

## MAJOR — fix now or file (not release-boundary-locking)

### M6 — Preflight `process.exit(1)`s from library code, on a heuristic about processes it does not own _(correctness + dx + blast-radius, deduped)_

`src/doc-system/site/orchestrator.ts:171`, `src/doc-system/site/dev-server.ts:156,623`, `src/doc-system/site/preflight.ts:176,203`

Four distinct defects in one mechanism:

1. **`buildSite()` — a public export of `tosijs-ui/site` — calls `process.exit(1)`.** Uncatchable. An adopter's `await buildSite(cfg); await publishToS3()` dies mid-script.
2. **The `catastrophic` rule fires on ANY process at ≥50% of the dev budget**, dev or not; the exempt list names only local-LLM runtimes. Reproduced by driving `assessProcesses` directly: a 16GB Mac with Docker Desktop's VM at 8.2GB → `fail`; `java -Xmx8g` → fail; Xcode Simulator on 32GB → fail; a Parallels VM on 64GB → fail. The advice printed is `kill <pid>` — of the user's own database VM. `memoryBudgetMb` floors the budget at 25% of RAM, so a resident LLM on a 16GB box drops the catastrophic bar to **2GB**, which a single Chrome renderer trips.
3. **The build's own children are not excluded.** `assessProcesses` filters only `selfPid`. `buildSite` shells out to `bun build`, `bun check-examples-cli`, `bun tsc`, the ePub child and a `bun -e` gzip child — and `bun build` is **not** in `isDevProcess`'s exclusion list. The dev server's health tick runs `preflight()` **every 60s** (despite the comment at :587 claiming "every 5th tick") _concurrently with an in-flight rebuild_, so a bundler child over `hugeDevPct` kills the dev server because of its own child.
4. **No CI skip.** Only `win32` and `DEV_SKIP_PREFLIGHT=1` bypass. Playwright's `webServer` runs `bun start` → `devServer()` with `test:false`, and does **not** set `DEV_SKIP_PREFLIGHT` — so both the launch preflight and the 60s tick are armed _inside our own release gate_. A busy laptop turns a green suite into a mystery "webServer exited".

Also: `isDevProcess` (`/\b(bun|deno)\b/`) matches any command line merely containing "bun" — verified against the _live_ process table, `node …/.bun/install/global/…/cli.js` classifies as a dev server.

**Fix:** (a) library code must not `process.exit` — return/throw and let `bin/dev.ts` decide; (b) exclude `process.pid`'s descendants (`descendantsOf()` already exists in dev-server.ts); (c) default to **warn** when `process.env.CI` is set or stdout is not a TTY, and restrict the hard fail to _dev_ processes, keeping the VM-pressure check fail-closed (it's the honest signal); (d) add `preflight: false | 'warn' | 'fail'` to `SiteConfig`; (e) set `DEV_SKIP_PREFLIGHT=1` in `playwright.config.ts`'s `webServer.env`.

### M7 — The memory watchdog's limit is `Number(env ?? config ?? 4096)`, untested _(coverage)_

`src/doc-system/site/dev-server.ts:365`

Verified by execution: `DEV_MEMORY_LIMIT_MB=` (empty) → `0` → `mb >= 0` always true → the dev server exits on the first rebuild with _"over the 0MB limit"_. `DEV_MEMORY_LIMIT_MB=4gb` → `NaN` → both comparisons false → **the watchdog is silently OFF** — precisely the failure the sibling `resolveIdleMs` test file calls out as _"worse than having no guard at all."_ `memoryLimitMb: 0` in site config does both, _and_ is forwarded to `preflight({devLimitMb: 0})`, whose `?? 4096` does not fire on 0 → every `bun` process older than 1h is flagged stale → `buildSite()` exits 1 on a healthy machine.

The idle timeout got the full treatment (extracted as `resolveIdleMs`, hardened, 6 tests including _"a garbage env value falls back to the default — never silently OFF"_). The memory ceiling — the guard this release was built around — got none of it.

**Fix:** extract `resolveMemoryLimitMb(configMb, envValue)` next to `resolveIdleMs`, test the same input classes, and coalesce `config.memoryLimitMb` before passing it to `preflight()`.

### M8 — The haltija doc-test lane cannot start, leaks an Electron on every failed attempt, and is the only guard on the headline WASM feature _(coverage — RED LANE)_

`src/doc-system/site/dev-server.ts:687`

`bun run test-browser` **exits 1** right now: _"Haltija browser did not become available within 10s."_ Reproduced. Ambient state: haltija running with **zero windows** (normal after closing a tab). The reuse check is `hjAvailable = windows.length > 0`, so the lane declines to adopt it, races a competing `bunx haltija@^1.3.4 -f`, and that never brings up a window in the 10s budget. The timeout path then calls the naive `haltija.kill()` — the exact kill this same file documents (at the `stopHaltija` helper _this branch added_) as **not** killing the Electron grandchild. Confirmed: a failed run left an orphaned haltija reparented to PID 1, and the next attempt is likelier to fail. The branch wired `stopHaltija()` into the success and post-navigate paths and left the _most likely to fire_ path on the leaky kill.

**Consequence:** the inline ` ```test ` blocks are the ONLY automated coverage of the doc corpus — including `test('the wasm kernel actually compiled (no silent fallback to JS)')` (`src/live-example/component.ts:288`), the sole guard on the release's headline inline-WASM feature. `grep -i wasm` across `tests/*.pw.ts` and every `*.test.ts` returns nothing. That lane is not in CI and currently cannot start.

_(The tests themselves are green — 33 passed / 0 failed across 11 pages — but only when driven around haltija via Playwright.)_

**Fix, in order of value:** (1) call `stopHaltija()` on the timeout path so a failed launch stops poisoning the next run; (2) adopt an existing haltija even with zero windows (or force-restart it) rather than racing a second instance; (3) **add `tests/doc-tests.pw.ts`** that navigates to `/` and awaits `window.__docTestResults`, asserting `failed === 0` — it runs the whole doc tier in ~30s inside the existing CI e2e job, putting the WASM guard and every inline test behind the release gate for the first time.

### M9 — `mode="tjs"` — the headline 1.7 feature — has zero coverage at any tier, and its failure mode is a silent no-op _(coverage)_

`src/code-editor.ts:386` → `src/code-editor-cm.ts:127-146`

`loadTjsExtension()` swallows every error in a bare `catch` and returns `null` by design, and `applyTjsExtension`'s promise chain has no `.catch()`. The `typeof mod.tjsEditorExtension === 'function'` guard means an upstream **export rename returns null without even throwing**. `setLanguageExtension` has exactly one production call site and **zero** test call sites. `grep -i tjs src/code-editor.test.ts tests/code-editor.pw.ts` → nothing; the unit tests only ever use `mode: 'javascript'`.

Blast radius is larger than first stated: `live-example/component.ts:739-740` sets `parts.js.tjsAutocomplete` and `parts.js.mode = this.dialect`, so **every tjs live example on the doc site** drives this untested path, and nothing asserts the dialect→mode wiring either. A regression silently degrades every tjs editor to plain TS highlighting with no autocomplete while all three lanes stay green. `bundle-guard.ts` covers the _packaging_ invariant; nothing covers the _runtime wiring_.

### M10 — The IIFE tripled: 121KB → 388KB gzip, and it is 100% CodeMirror _(efficiency + dx, deduped)_

`src/doc-system/site/orchestrator.ts:453`, `src/index-iife.ts`

Byte-exact: `dist/iife.js` = 1,232,441 raw / **387,674 gzip** vs 418,524 / **121,240** on `main`. Attribution measured independently — `src/code-editor-cm.ts` built alone as a minified iife is 806,217 / 265,119 gzip, i.e. essentially the entire delta. `bun build --format iife` cannot code-split, so `import('./code-editor-cm')` is flattened in. (The ESM lazy chunk `dist/code-editor-cm.js` is real, at 3.4KB gzip — the loss is confined to the IIFE.)

Worst case is the use case the project calls its killer feature: `orchestrator.ts:453-460`, in its own words _"the normal case for a pure-docs / book site"_, copies tosijs-ui's published `iife.js` verbatim into an adopter's output when they set no `bundleEntry`. A prose-only book with zero code examples ships 1.2MB of CodeMirror + lezer + acorn on every page, for an editor most readers never open. The `bundleEntry` escape hatch is also closed: `doc-browser.ts:180` statically imports `codeEditor`, and the adopter's own bundle is _also_ built `--format=iife`. All 59 generated pages carry `<script src="/iife.js">`.

CLAUDE.md itself sets the gate — _"the gate on a new runtime dep here is the printed gzip delta"_ — and the delta is 3.2x. Documenting the cost (CLAUDE.md:245) is not mitigating it.

**Fix:** build the doc-site hydration bundle `--format esm --splitting` and emit `<script type="module">` — bun _does_ code-split ESM, so `code-editor-cm` becomes the same lazy chunk it already is for bundler consumers (the entry can still assign `window.xinjs`/`window.xinjsui`). Keep `dist/iife.js` unchanged for the CDN path. If that's too big for 1.7: emit a second IIFE (`iife-code-editor.js`) pulled in via the existing `scriptTag()` helper on first `<tosi-code>` connect — the on-demand pattern the ACE build had and this migration dropped. Either way the editor stays available on every page; it just isn't downloaded until something mounts it. **Do not** gate the editor on "does this corpus have examples" — that amputates the authoring feature from exactly the wrong sites.

### M11 — The pre-hydration nav stylesheet is a hand-copied, already-drifted duplicate — every generated page flashes on hydration _(dryness)_

`src/doc-system/doc-system-styles.ts:215-231`, `src/doc-system/site/generate-site.ts:96`

doc-browser deliberately gives its runtime nav `class="doc-nav"` _"so the shared nav CSS matches the static pre-rendered `<nav class="doc-nav">`"_ — but `navHtml` emits **bare `<a>`** while the hydrated nav emits `<a class="doc-link">`. So a second, independently-authored rule set had to be written under `tosi-doc-system:not(:defined)`, and it has already drifted.

Measured in Chromium at 1200px against the built `docs/` (JS off vs on):

```
pre-hydration:  class ""          padding 2.5px 0px   border-bottom 1px rgb(238,37,123)  height 31.59px  text x=10
hydrated:       class "doc-link"  padding 5px 15px    border-bottom 0px                  height 35.59px  text x=15
```

Every generated page ≥600px paints its nav with brand-coloured underlines under all 57 links, then on hydration the underlines vanish, each row grows ~4px (≈230px cumulative reflow in the fixed sidebar) and text shifts 5px. That is exactly the flash-and-reflow commit `f4b7da14` ("drop the opacity gate") exists to eliminate — and because the body is no longer opacity-gated, it is now _painted_, not masked. `this.replaceChildren(this.browser)` throws the static nav away, so nothing self-corrects.

**Fix:** emit `class="doc-link"` (plus `current`) from `navHtml` — one line — then delete the duplicated `:not(:defined) .doc-nav ul/a/summary` rules and let the single shared block style both states. Keep only the genuinely pre-hydration-specific rules (the fixed positioning).

_(Dead code noticed while verifying: `doc-system.ts:485-490` still sets `document.body.style.opacity = '1'` with a stale comment claiming the generated `<head>` hid the body, which it explicitly no longer does.)_

### M12 — tosijs's `parts` proxy permanently poisons itself on pre-hydration access, and we have NEVER filed against tosijs _(ecosystem → upstream issue)_

`src/code-editor.ts:160-178`

Reproduced: one _swallowed_ pre-hydration `parts.host` read permanently roots the proxy at the light-DOM element; after insertion the shadow DOM is correct but `el.parts.host` still throws `elementRef "host" does not exist!` — forever, silently. This is the normal usage shape, not exotic: `elementCreator()` hands back an _uninserted_ element, so `const el = tosiCode({…}); el.showingDiff` is idiomatic, and that single read bricked the editor pre-1.7. MEMORY records that this class of bug _"blanked the whole doc page once."_

Upstream `Component` has `private _hydrated` and `private _parts`, with `get parts(): T` the only door — a subclass cannot ask "am I safe yet?" without an `any` cast. There is genuinely no public seam.

There are already **two** independent hand-rolls in-tree (`code-editor.ts`'s `_partsHydrated` + `_pendingDiff` replay; `live-example/component.ts:543`'s separate `hydrated` getter + `pendingValues` replay) — and live-example still uses the exact `try { this.parts.js } catch` probe that `code-editor.ts:164` explicitly says CANNOT be used. It survives only by accident of DOM mode (light-DOM root doesn't flip). **20 files in `src/` declare `shadowStyleSpec`**; copying that idiom into any of them silently bricks it, and neither the types nor a lint rule prevents it.

`UPSTREAM.md` has sections for bun, tjs-lang and haltija — and **no tosijs section at all**. The foundational dependency is the one we've never filed against.

### M13 — The lens-8 findings from this release's own two prior review passes were never written back _(practices)_

`RELEASE-REVIEW-1.7-pass2.md:20`

Both prior passes recorded practices findings routed to `tosijs-coding-practices`. Thirteen KB commits landed since; **none** carries any of them — and two of those commits (`2bc6737` wobbly divergences, `54a6f62` ariosto divergences) edit the _exact_ "Known divergences" section where the tosijs-ui CodeMirror entry belongs. The author was in that file, in that section, twice, and never landed the item. Every KB defect from pass 1 is still live today (verified individually below).

Compounding cost is observable: pass 2 independently re-derived pass 1's zero-runtime-dep finding at full verification cost, and this pass re-derived it again.

Also: `RELEASE-REVIEW-1.7.md` and `RELEASE-REVIEW-1.7-pass2.md` are **untracked** (`git ls-files` → 0). The record dies with the working tree. `review.md` says _"never silently drop one"_; they were dropped twice.

### M14–M16 — The shared KB is false about this repo in three load-bearing places _(practices)_

All three verified against the files; all three route to `../tosijs-coding-practices` (see follow-ups).

- **`practices/releasing.md:40`** — _"Build — run `bun run build`. It runs tests… exits non-zero — do not ship. — seen in: tosijs, tosijs-ui"_. **False.** `"build": "bun bin/dev.ts --build-only"` runs no tests. An agent cutting a release by the book sees exit 0 and believes the suite is green when it never ran. This is not hypothetical: the Playwright lane sat red across **23 tags in ~4 weeks**.
- **`practices/review.md:10`** — _"no CI — no `.github/` workflows anywhere in the ecosystem"_. **False**, and self-contradicted by `00-stack.md:64`. tosijs-ui has `ci.yml`; haltija has three workflows. A reader who believes there is no CI never asks _"which lanes does CI actually cover?"_ — the exact question that would have caught the rotted lane. (Same falsehood propagates to `deployment.md:10` and `performance.md:48`.)
- **`practices/performance.md:64`** — _"Lazy-load heavy deps… dynamic-import bulky editors (e.g. CodeMirror) — seen in: tosijs-ui"_. The KB holds **this release** up as the exemplar for the rule **this release disproved**: `--format iife` cannot code-split, so the dynamic import is flattened and the most-loaded artifact regressed 3.2x. An agent following it measures the ESM entry, sees a flat number, and ships the regression.

---

## Follow-ups by destination

### → this repo's `TODO.md` (correctness / efficiency / dryness / docs / coverage / dx)

**Blocker & release-boundary (do before tagging):**

- [ ] **B1** `dev-server.ts:66` — `killStrayServer`: add `-sTCP:LISTEN`, identify the pid before signalling, SIGTERM-then-SIGKILL. Fix `PORT`/`E2E_PORT` `??` → `||` in the same pass (`dev-server.ts:146`, `playwright.config.ts:15`) so an empty env var can't `kill -9` unbound-port system daemons.
- [ ] **M1** `code-editor-cm.ts` — annotate `CmHandle.setValue()`'s transaction and skip `onChange` for it, so `change` fires only on user edits (and never on a `disabled` editor). Consider `Transaction.addToHistory.of(false)`.
- [ ] **M2** Decide the version: **2.0.0** (recommended) vs 1.7.0. If 1.7.0, document the break in the README and make `editor` warn on first access.
- [ ] **M3** Rewrite CHANGELOG's "Known cost" paragraph (the pre-render shipped: the bundle now gates **editing**, not reading); add entries for the pre-rendered/no-JS chrome, the preflight, the 60s health tick, and **`idleTimeoutHours` (default 8)** as a behavior change with its opt-outs (`DEV_SKIP_PREFLIGHT=1`, `DEV_IDLE_TIMEOUT_HOURS=0`, `memoryLimitMb`/`idleTimeoutHours`); note the haltija `^1.3.4` pin.
- [ ] **M4** README:3 — reword `headTitle`/`description` off "dependency-free"; fix the CDN section's bundle contents + size. Rebuild so `docs/index.html` picks it up.
- [ ] **M5** `doc-browser.ts:812` — honour `headTitle` + de-dupe `projectName` (factor the rule into one function shared with `generate-site.ts`); restore an exact-title assertion in `tests/localization.pw.ts`. **Closes #6** — name 1.7.0 and list under Fixed.

**Major, schedulable:**

- [ ] **M6** Preflight: stop `process.exit`ing from library code; exclude the build's own descendants; warn-not-fail under `CI`/non-TTY and for non-dev processes; add `preflight: false|'warn'|'fail'` to `SiteConfig`; set `DEV_SKIP_PREFLIGHT=1` in `playwright.config.ts`'s `webServer.env`. Fix the stale "every 5th tick" comment (`dev-server.ts:587`) — it runs every tick.
- [ ] **M7** Extract + test `resolveMemoryLimitMb(configMb, envValue)`: empty → default, garbage → default (never 0, never NaN), 0/negative → explicit decision. Coalesce `config.memoryLimitMb` before passing to `preflight()`.
- [ ] **M8** **RED LANE.** `bun run test-browser` currently exits 1. (1) call `stopHaltija()` on the launch-timeout path; (2) adopt a zero-window haltija instead of racing it; (3) add `tests/doc-tests.pw.ts` asserting `window.__docTestResults.failed === 0` — puts the inline-WASM guard and every doc test in CI for the first time.
- [ ] **M9** Add `mode: 'tjs'` coverage to `src/code-editor.test.ts`: mount, await the extension load, assert the tjs language facet is actually installed (not merely that the element exists); second test wiring `tjsAutocomplete.getLiveBindings` through to the completion source.
- [ ] **M10** Ship the doc-site hydration bundle as ESM + `--splitting` + `<script type="module">` (or a second on-demand `iife-code-editor.js`); keep `dist/iife.js` for the CDN path only.
- [ ] **M11** Emit `class="doc-link"` from `navHtml`; delete the duplicated `:not(:defined)` nav rules. Remove the dead `document.body.style.opacity = '1'` + stale comment (`doc-system.ts:485-490`).

**Minor:**

- [ ] `code-editor.ts:308` — replace the `source === ''` "uninitialized" sentinel with an explicit `_sourceInitialized` flag; today an emptied editor re-materializes its original light-DOM text on reconnect (silent data loss for an HTML-authored `<tosi-code>` — exactly the form the component's own doc example shows).
- [ ] `code-transform.ts:130` — `regexAllowedAfter` misses keyword prefixes, so `return /['"]/.test(s)` blanks the rest of the line and drops later `const`/`let` bindings from tjs autocomplete. One-line fix: allow `\b(?:return|typeof|case|in|of|new|void|yield|await|do|else)$`.
- [ ] `live-example/component.ts:986` — 4 CodeMirror `EditorView`s are eagerly mounted per example inside a `hidden` container (measured: 28 mounted on `/menu/`, 0 visible; ~9ms + ~1.4MB JS heap per doc page). Defer `createCmEditor` until first reveal.
- [ ] `execution.ts:108/172` — extract one `prepareRun(js, context, transform, onScope)`; both executors differ only in the AsyncFunction constructor. The public `executeCode` is a third copy with zero in-repo call sites — delete it (1.7 is breaking anyway) or route it through the helper. `test-harness.ts:357` is a fourth variant.
- [ ] `generate-site.ts:288` — export `PREFS_KEY` + a `themePreloadScript()` from a dependency-free module instead of hard-coding `'tosi-doc-system-prefs'` and re-deriving `applyThemePrefs()` in a template literal. 58 generated pages carry the literal; nothing type-checks it and no test covers the emitted script.
- [ ] `orchestrator.ts:133` — one `child.ts` with `siblingCli(name)` + `runChild(cli, args, {json?, timeoutMs?})` that always drains both pipes; route all five spawn sites through it. The `existsSync(x.ts) ? x.ts : x.js` **packaging seam** is copy-pasted 4× (up from 2 on main) and no lane covers it — miss it in a fifth CLI and the build works in-repo and breaks for every adopter. Convert the `bun -e` gzip one-liner into a real `gzip-size-cli.ts`.
- [ ] `preflight.ts` — collapse the unused knobs (`minBudgetPct`, `catastrophicPct`, `hugeDevPct`, `minAgeHours`, `reservedMb`, `compressorPct`, `freeFloorMb`, `swapFloorMb`) to constants; none is ever passed a non-default value by any caller _or_ any test.
- [ ] `preflight.test.ts` — add ~5 tests calling `preflight()` itself with the `procs`/`totalRamMb`/`vm` seams that exist "for tests" and have **zero call sites**: `DEV_SKIP_PREFLIGHT=1`, win32 bypass, `DEV_RESERVED_MB` parse, dying `vm` → false, and a throwing `procs` snapshot → `true` (the docstring's load-bearing "never blocks the build" promise).
- [ ] `bundle-guard.test.ts` — test `classicScriptSyntaxErrorInChild()` (the function the build actually calls), not just the in-process twin. Reproduced: a missing bundle path returns `ENOENT…`, which the orchestrator laundered into _"iife.js does not parse as a classic `<script>`. The page will not hydrate."_ — a confidently wrong diagnosis. Also covers the `.js` fallback that only matters for installed consumers.
- [ ] Sidebar geometry: make `SIDEBAR_WIDTH`/`SIDEBAR_BREAKPOINT` (`doc-system-styles.ts:27`) the single source that `createDocBrowser`'s `navSize`/`minSize` defaults import — there are currently **three** independent literal sets (side-nav's 200/**800**, doc-browser's 200/600, doc-system-styles' 200/600), coupled only by a comment. Add a unit assert that they agree, or a PW check that `article.doc-content`'s box is identical across the upgrade.
- [ ] Bundle-size figure disagrees across three docs; the **user-facing one is the stalest**: `code-editor.ts:47` says "~376KB" (shipped to https://ui.tosijs.net/code-editor/), CHANGELOG says ~384KB, CLAUDE.md says 386KB. Build prints **384.9kb**. Pick the build's number everywhere and note its source. _(Note: `orchestrator.ts:432` deliberately uses zlib-in-a-child rather than the `gzip` CLI precisely to keep this number stable across releases — then the docs weren't updated.)_
- [ ] `TODO.md:15` — the "pre-render the chrome / drop the opacity gate" item is still the top **High Priority** entry and asserts a `body{opacity:0}` gate that no longer exists. It shipped in `f4b7da14`. CLAUDE.md points at TODO.md as _"the index; start here"_, so the next agent starts from a false picture. Move it to a shipped section (keep the perf table if it's still reference data) and re-check the companion "split the editor out of the hydration bundle" item, whose framing depends on the gate (it's still genuinely open — see M10).
- [ ] `dev-server.ts:102` — the haltija dev channel (ports 8700/8701) is spawned and **never reaped**: it outlives Ctrl-C, the memory watchdog's `exit(1)`, and the idle exit whose whole rationale is _"a forgotten process keeps running the code it loaded."_ Track the pid and reap it when we spawned it (leave a reused one alone), or document in `doc-site-system.md` that it persists, which ports it holds, and how to stop it. Make the ports configurable.

**Nits:**

- [ ] `code-editor.ts:293` / `code-editor-cm.ts:158` — the monospace stack is hard-coded twice; the `shadowStyleSpec` copy is **dead** (CM's theme wins on specificity in the same shadow root) and neither reads `--code-font-family`, so a `<pre>` and the `<tosi-code>` editing it render in different typefaces on the doc site. Use `varDefault.codeFontFamily(…)`. _(Related: `live-example/styles.ts:223` uses `var(--mono-font)`, a fourth spelling nothing defines.)_
- [ ] `live-example/component.ts:1451/1464` — pass `onScope` only when `dialect !== 'js'` (its only consumer, `tjsAutocomplete`, is never wired for `js`), and clear `capturedScope` on disconnect. _(Cost measured at ~0.065ms/run — cheap, but pure waste on ~68 of 70 fences.)_
- [ ] `code-editor.ts:9` — the prose `mode` list omits `ajs`; the table 15 lines below includes it. Newly introduced by this diff.
- [ ] `epub.ts:669` — `docs/tosijs-ui.epub` is non-reproducible (`modified` defaults to `now`), so the tracked 150KB binary churns on **every** build and the "rebuild → `git diff --exit-code`" freshness gate — prescribed in three shared-practices docs — can never come back clean. Needs a deterministic `modified` **and** deterministic entry mtimes (`zip -X` preserves DOS mtimes; touch the staged tree to a fixed epoch).
- [ ] `orchestrator.ts:79` — write the ePub child's payload into the build's own scratch dir (or `mkdtempSync`, mode 0700) instead of `os.tmpdir()`, so a hard-killed parent doesn't strand it outside the blast radius. Cheapest complete fix: have `epub-cli.ts` unlink its own payload after reading.

### → `UPSTREAM.md` + a GitHub issue on the upstream repo (ecosystem)

**File (do not edit the other repos):**

- [ ] **`tonioloewald/tosijs`** — _file an issue_ (M12): (1) expose a public `hydrated` getter or `whenHydrated: Promise<void>`; (2) make `parts` **non-poisoning** — do not cache the query root when the element isn't hydrated, and throw a **named** error (`'parts accessed before hydration'`) instead of silently rooting at the light DOM. Add a new `## tosijs` section to `UPSTREAM.md` with the issue URL. _(`tonioloewald/tosijs` has one open issue, from 2025 — the foundational dep is the one we've never filed against.)_
- [ ] **`tonioloewald/haltija`** — _file two issues_, both currently recorded in `UPSTREAM.md:127` as **NOT YET FILED** in a file whose own preamble says _"an entry without one is a complaint nobody will ever read"_: (a) no rAF in backgrounded windows breaks rAF-driven render pipelines under `hj eval` (ask: pump rAF, or expose `hj frame` / `waitForFrame`) — this is on the tool CLAUDE.md designates as the _preferred_ way for an agent to see the page, and it _"nearly caused a false diagnosis of a correct fix during 1.7"_; (b) document a CLI + version contract for embedders (`hj windows`/`navigate`/`eval`, `-f`, and the version range a dev server should spawn) — our shipped `devServer` `bunx`es it for every adopter. The repo is public and same-owner; **this review is the sign-off.** Replace the NOT-YET-FILED bullets with the issue URLs.
- [ ] **`tonioloewald/tjs-lang`** — comment on the four **closed-but-unreleased** issues (#10, #12, #15, #16) asking for a **0.9.2 cut**. `UPSTREAM.md:44` still lists all four as **Open**. Restructure `UPSTREAM.md` with a `### Resolved upstream, awaiting release` state, and add a TODO.md item: _"delete the ~210-line hand-rolled scope scanner (`code-transform.ts:122-333`) and the hand-copied `TjsAutocompleteConfig` (`code-editor-cm.ts:112`) when 0.9.2 ships — bump `TJS_VERSION` in lockstep."_ (Preferred, since we're still at beta.1: bump to 0.9.2 before 1.7.0 final and delete them now.) Note `tjsEditorExternal()` is **not** deletable — it handles tjs-lang being absent entirely.

**Incoming open issues — explicit disposition required:**

- [ ] **#6** doubled `document.title` — **FIX in 1.7 and close** (M5). Still broken on our own home page; the guarding test was loosened in this diff.
- [ ] **#13** `<tosi-map>` constructs 180 `mapboxgl.Map` instances — reproduced (20 coords writes → 20 maps → 20 WebGL contexts; each zombie's `render` handler also calls `resize()` on the final map). `src/mapbox.ts` is untouched by this release and the issue has had **no reply** since 2026-07-14. Reporter supplied the ~6-line fix (single-flight `_mapPending` + re-read `this.coords` inside the `.then`). **Either apply it in 1.7.0 and close, or reply deferring to 1.7.1 with a date.** Silence on a measured, reproduced, fix-supplied consumer report is the outcome to avoid.
- [ ] **#12** RFC: language plugins — 1.7 _deepens_ the hardcoded `js|ts|tjs` switch, while tjs-lang has already shipped its half of the trade (`collectScopeSymbols`, citing this RFC as why it jumped the queue). We are now the sole blocker for tjs-lang's AJS playground. **Reply yes/no/later.**
- [ ] **#3** Improved Localization — `src/localize.ts` is unchanged in this diff (only `tests/localization.pw.ts` was repaired, which reads like progress and isn't). State "unchanged" in the release notes.
- [ ] **#8** (console errors during hydration: `toggleAttribute of undefined`) and **#9** (document the cinematic-landing-page pattern) — no finding covered these; confirm they are knowingly deferred, not overlooked, given this release rewrites the hydration path.

### → shared `tosijs-coding-practices` (practices)

- [ ] **`practices/releasing.md:40`** and **`practices/review.md:11`** — remove the false _"`bun run build` runs tests and exits non-zero"_ claim and its fabricated `seen in: tosijs-ui` citation. Replace with: _enumerate this project's test lanes and run every one before tagging_ (tosijs-ui: `bun test`, `bun run test-browser`, `bun playwright test`). This false claim is exactly how a red lane shipped across ~20 tags.
- [ ] **`practices/review.md:10`** (+ `deployment.md:10`, `performance.md:48`) — _"no CI — no `.github/` workflows anywhere in the ecosystem"_ is false and self-contradicted by `00-stack.md:64`. Rewrite: CI exists in some repos and is never the whole gate — **ask which lanes it runs.** Add the durable lesson (attribute tosijs-ui 1.7): **a test lane the release gate does not run WILL rot silently** — make each lane self-sufficient and put it in CI. Update `00-stack.md:64`'s tosijs-ui entry from "(minimal tsc+test)" to "(tsc + unit + chromium E2E)".
- [ ] **`practices/performance.md:64`** — a dynamic import is a real chunk **only where the output format can code-split**; `--format iife` inlines it. **Measure gzip per artifact (ESM entry AND the IIFE/CDN bundle).** If a lazy boundary must survive a `<script>`-loaded bundle, ship ESM + `--splitting` + `<script type="module">`. The bullet currently cites tosijs-ui as its exemplar for the claim tosijs-ui 1.7 disproved.
- [ ] **`practices/00-stack.md:50`** — add the Known-divergences entry: _"tosijs-ui — 12 `@codemirror/_`runtime dependencies. CodeMirror cannot be a naive optional peer: editor + language modes + the tjs CM extension must share a single`@codemirror/state`; a duplicate silently no-ops. Don't demote them to peers."* Soften `review.md:66` from a dep-**count** rule to a **printed gzip delta** gate.
- [ ] **`practices/testing.md:99`** — invert it. _"Playwright tests need the HTTPS dev server already running — the config won't launch it"_ is now backwards, and that practice **is** the design flaw this release fixed. Replace with: the E2E lane **owns its target** — its own port, `reuseExistingServer: false`, dev-only injection (haltija overlay) switched off by env so the lane asserts against the DOM CI sees; tests address it via `baseURL`, never a hard-coded port. Add 8799 to `development.md`'s port list (tosijs-ui: 8787 dev / 8799 E2E / 8701 haltija channel).
- [ ] **`practices/testing.md:10`** — add, next to the existing "green ≠ ran" rule: **never scope the suite with a glob in `package.json`.** `bun test src/*.test.ts` matches only top-level files, silently skips subdirectory tests, and **exits 0**. Verified today: `bun test` = 607 tests / 35 files; the glob = 423 / 17. Bare `bun test` recurses (`bun test src/` also recurses and is fine). Attribute tosijs-ui 1.7.
- [ ] **`practices/releasing.md:13`**, **`README.md:79`**, **`tools/README.md:5,10`** — s/eight-lens/**nine**-lens/ and add **blast radius** to the enumerated list (added 2026-07-14 in `2643f25`; three docs referenced the count and one edit updated one). `releasing.md:19-22` also has no routing destination for lens-9 findings. An agent following the _release_ doc runs eight lenses and skips the one whose whole purpose is state outside the repo — on the release whose defining incident was a dev server that ate 136GB of the developer's RAM. Add a CONTRIBUTING note: when a lens is added, grep the KB for the count.
- [ ] **`practices/review.md`** "Triage & gate" — the release is not done until each lens-7/8 finding is a **filed issue or a landed commit in the target repo**, with the URL/SHA in the release notes. A routing rule with no receipt is not a rule. _(M13: both prior passes' findings were dropped.)_

### → this repo's `CLAUDE.md` / agent memory

- [ ] **`CLAUDE.md:57`** — Testing Setup still says the lane _"spawns `bunx haltija@latest -f`"_. The shipped code now pins `haltija@^1.3.4` (`dev-server.ts:44`), and `practices/testing.md:111` says never use `@latest`. Worse: that CLAUDE.md line was **rewritten in this same branch** and carried the `@latest` text forward. An agent following it hand-launches a floating-version haltija, which `bun run test-browser` then **adopts** (the reuse check has no version guard) — silently bypassing the pin. Update to the pin + `HALTIJA_VERSION` override. Same stale instruction in `MEMORY.md:17`, `memory/haltija-details.md` (7 places), and `.claude/settings.local.json:20,72`.
- [ ] **`src/doc-system/doc-site-system.md:357`** (adopter-facing, published) — still says _"The channel tracks haltija's **@beta** dist-tag"_; the same commit falsified it. Also fix the "machine preflight runs **every 5th tick**" claim there and in `dev-server.ts:587` — it runs every tick.
- [ ] Commit `RELEASE-REVIEW-1.7.md` / `RELEASE-REVIEW-1.7-pass2.md` next to the CHANGELOG, or fold their surviving follow-ups into `TODO.md` and delete them. Untracked review output is not a record. _(Pass 2 flagged this about itself.)_
- [ ] Document `DEV_RESERVED_MB` (`preflight.ts:451`) and `HALTIJA_VERSION` (`dev-server.ts:44`) in `doc-site-system.md`'s env table — currently code-comment-only.

---

## Completeness gaps (things this review could not close)

- **The haltija doc-test lane is RED right now** (`bun run test-browser` exits 1). Its 33 inline tests were confirmed green **only by bypassing haltija** via a Playwright-driven chromium. That lane is not in CI. **It is not being waved away** — it is M8, with a concrete fix (a `doc-tests.pw.ts` that puts it in the existing CI e2e job). Do not tag 1.7.0 with this lane un-runnable, because it is the only guard on the release's headline inline-WASM feature.
- **Not verified on-device:** M10's "few hundred ms of blocked main thread on a mid-tier phone" is an estimate from ~814KB of extra parse/compile, not a device measurement. The _byte_ figures are exact.
- **Not reproduced on this machine:** M6's preflight false-positive does not fire on this 32GB box today (measured child RSS: `bun build` ~116MB, `tsc` ~389MB — one to two orders below the bar). It requires a smaller box, a heavier project, or the budget floor engaging via a resident LLM. The **mechanism** is certain; the **trigger** is conditional. That is why it is major, not blocker.
- **Not audited:** issues **#8** and **#9** had no finding raised against them by any lens. Given this release rewrites the hydration path, #8 ("console errors during doc-system hydration") deserves an explicit look before tagging.
- Three test lanes exist; **only one (`bun test`) is in CI**, and the finding set shows the other two were each broken or rotted during this cycle. Until every lane is self-sufficient and gated, "green" means less than it should.
