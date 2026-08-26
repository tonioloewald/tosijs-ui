# TODO

## From the 1.9.0 nine-lens review (deferred — the blockers and easy fixes are done)

Full report: [RELEASE-REVIEW-1.9.md](RELEASE-REVIEW-1.9.md). Fixed already: 3 blockers,
the lint/typecheck gates, `touch()`, the red-tsc site discard, port defaults,
per-project `remotePort`, the deploy asset path, the mutating smoke test, and the stale
security prose. What is left:

- [ ] **Hybrid lane: Playwright launches the browser, haltija drives it.** VERIFIED
      2026-08-12 — the haltija widget attaches and connects in **WebKit and Firefox**, not
      just Chromium. Loaded our dev server (with `haltijaDev`) in Playwright-launched
      webkit and firefox; both printed `🧝 Haltija connected` / `[haltija] Injected`. The
      loader is a plain dynamic `import()` of an ES module, so there is nothing
      engine-specific in it. haltija's README row "Cross-browser: ⚠️ Chromium only"
      describes the browser it SPAWNS, not the widget's reach — worth telling them, since
      it understates the product.

      This gets both properties: engine coverage from Playwright's binaries, and a driving
      layer that is **ours to fix** when it flakes — which is the whole argument, given the
      current `segmented.pw.ts` flake is Playwright's actionability check rather than our
      component. Caveat before migrating: attachment is proven, per-verb parity is not.
      Exercise click, type and `map` on WebKit first; anything that misbehaves is a haltija
      fix rather than a blocker.

- [ ] **(superseded by the above, kept for the evidence) Moving interaction tests to haltija wholesale.**
      The instinct is right: when a harness flakes, owning it beats trusting it, and
      haltija has turned reports around in a day. But haltija is **Chromium only**
      (Electron, or headless via Playwright _Chromium_), so the move would drop firefox and
      webkit entirely — and `doc-tests.pw.ts` explicitly calls two engines "a real gate",
      noting that _"the old haltija lane only ever drove one Chromium-based engine, so
      WebKit doc-tests never ran at all"_. Moving back would undo a deliberate improvement.

      The evidence splits the two engines, though:

      - **firefox** is load-bearing — it runs the whole doc-test tier green alongside
        chromium, and is the only non-Chromium signal we have.
      - **webkit** is already skipped for the doc-test tier (#19, its iframe runner never
        signals completion), has no source commit attributable to a webkit-specific bug,
        and is where the click flake concentrates.

      So the shape worth considering is narrower than "move it to haltija": keep Playwright
      for cross-engine coverage, drop or quarantine **webkit** for interaction specs where
      it is producing flakes rather than findings, and use haltija for what it is uniquely
      good at — agent-driven inspection of a real page. Decide it as a coverage question,
      not as a reaction to a flake.

- [ ] **The haltija doc-test lane reports 34 where Playwright reports 37.** Measured
      2026-08-12, same corpus, same engine family: `bun playwright test` prints
      chromium 37 / firefox 37 / webkit 34, while `bun run test-browser` (haltija,
      Chromium) prints 34. **Zero failures in either** — three pages are not being reached,
      not failing. Ruled out: the last-good fallback (v1.9.6 also gives 34) and asset
      compression (disabling it still gives 34). Most likely the background runner's
      per-page budget under haltija's slower rAF, since the runner iframes each
      page-with-tests in turn. Worth pinning the expected count so a silent drop cannot
      pass as green — a lane that reports "34 passed / 0 failed" looks identical whether
      three tests were skipped or never existed.

- [x] **FIXED 2026-08-13 — `segmented.pw.ts` click timeouts on webkit/firefox.**
      Symptom: intermittently 1–4 failures in a full `bun playwright test`, always
      `locator.click: Test timeout of 30000ms exceeded`, never in CI (chromium only).

      **Cause — and it was neither theory recorded here.** Playwright's retry log named the
      blocker outright: the element is "visible, enabled and stable", and the click is
      refused because `<span part="label">Running</span> from <tosi-doc-system> subtree
      intercepts pointer events`. Not the segmented highlight failing to settle
      (the animation-stability guess), and not the doc-runner changes in 1.9.7 (verified by
      reverting the census gate and reproducing anyway).

      Both tests appended their repro element plainly to `document.body`, so it landed at the
      **bottom of the page** — exactly where the doc-site's test-status badge is pinned
      (`position: fixed; bottom; left; z-index: 1000`). Playwright scrolled the fixture into
      view, put it under the badge, and retried until timeout. That is also why it correlated
      with load: the badge reads "Running" for as long as the background doc-test runner
      works, which is longer on a busy machine — the overlap was always there, the badge just
      lingered long enough to be hit.

      Fix: the fixtures are pinned `position: fixed; top: 0; left: 0; z-index: 2000`, above
      the chrome. The click stays a real pointer click with all actionability checks intact —
      the fixture simply is not under an unrelated overlay. Explicitly **not** `force: true`,
      which would have masked a genuine un-clickable state.

      Verified: 6/6 clean runs of the spec on firefox+webkit, and **3/3 clean full-suite runs
      at 59/59** (the configuration that used to lose 2–4). Also corrects the earlier claim
      that it "passes 3/3 in isolation" — it reproduced in isolation too.

      Left alone deliberately: the badge itself. A fixed corner badge legitimately owns its
      corner, and it is a real `<button>` opening the test menu, so making it transparent to
      pointer events (as this entry previously suggested) would break it to fix a test's
      fixture placement.

**From snowfox's build-system reports (deferred — the cheap halves are done):**

- [ ] **[#56](https://github.com/tonioloewald/tosijs-ui/issues/56) — label build-only
      advisories in the audit verdict.** NOT a change to what blocks: blocking on every
      high+ regardless of dep class is a deliberate decision (a compromised linter has your
      source, credentials and shell), and the time-boxed `audit.allow` gate is the intended
      release valve. The additive half is worth it — the gate already annotates _nature_
      (`LEAK/ALTER` / `DoS-only`), so adding _reach_ lets a reader judge whether a red build
      is proportionate. Deferred because it is a `bun.lock` + workspace-manifest walk, not a
      flag — snowfox says so themselves — and a classifier that mislabels a runtime dep as
      build-only is worse than none. Advisory labelling first; policy only if it earns it.
      They offered a write-up of their reachability walk; take it before implementing.
- [ ] **[#58](https://github.com/tonioloewald/tosijs-ui/issues/58) — CodeMirror's 12 hard
      deps.** Cost documented in CLAUDE.md rather than fixed. Revisit only if a CodeMirror
      advisory actually fails an adopter's build; the exit is extracting `<tosi-code>` into
      its own package, which is a breaking change and needs a reason.

**Post-1.9.0 — adopt more of haltija (1.6.1–1.11.0):**

- [ ] **Expose `globalThis.tosiAgent`** so `hj map` carries binding provenance instead of
      reconstructing from the DOM. haltija's map output names this seam explicitly, and it
      is the general answer to their (now-closed) #10: agents currently drive our
      live-example menu via `button.source-menu → .xin-menu-item`, which breaks every time
      we restyle it. Surface toggle-source / refresh / set-code as wiring rather than
      selectors.

- [ ] **Replace the hand-rolled wait loop with `hj doctor`.** We adopted the `ready` field
      but not the command built for this: it exits non-zero and checks reachable → tab
      connected → target unambiguous → tabs-not-all-hidden → version skew, _in the order
      they bite_, with `--json` for machine use. haltija's `CI-INTEGRATION.md` now shows it
      as the wait-loop condition, replacing exactly the DIY loop we still have. Also
      `--strict`/`HALTIJA_STRICT=1` turns their advisory warnings into non-zero exits, so
      a lane fails on the real cause instead of a downstream symptom.
- [ ] **`hj map` instead of `hj tree` for driving live examples** (relates to haltija#10).
      Structural and deterministic — no font/theme/viewport/animation variance — and a few
      hundred bytes vs ~1–1.5k vision tokens for a screenshot. It also degrades honestly
      against our rAF limitation: if nothing painted, the map is empty rather than
      plausible.
- [ ] **`hj screenshot --canvas`** for any WebGL/canvas doc example — real pixels, no
      screen-share grant, works with the tab backgrounded. Mostly a tosijs-3d win; worth
      telling them. It also warns on the `preserveDrawingBuffer` blank-image trap rather
      than returning an empty picture.

**Post-1.9.0:**

- [ ] **[#40](https://github.com/tonioloewald/tosijs-ui/issues/40) — generate the per-icon
      modules from canonical data.** `src/icons/data/*` (313 modules) is the fine-grained
      tree-shakeable surface, which is a real feature — but it's a frozen 2024 snapshot no
      generator maintains: 47 have drifted from `icon-data.ts` (24 froze pre-redirect, 23
      differ in SVG content) and `pin` has no module at all. Generate them at build time
      instead, **resolving redirects when emitting** (`arrowUp` is the redirect string
      `arrowRight270r` in canon, so a naive emit would ship a token where markup is
      expected). Emitting to `dist/` directly would also drop 314 files from `src/`.
      Not carrying the #30 `fill-rule` bug — verified.

**From the THIRD 1.9.0 review round (pass 2 follow-ups not yet done):**

- [ ] **Integration test that the tunnel listener is handed `viaTunnel = true`.** The
      fail-open shipped through beta.1/2 and rc.1/2 because the decision was inline in the
      server closure. Extraction made the _predicate_ testable; the call site still isn't,
      and flipping `true`→`false` at `dev-server.ts:1245` is unobservable by every lane
      (`testMode` and `DEV_NO_TUNNEL=1` both skip the bind). Export a
      `createRequestHandler` factory so both bindings are assertable without TLS.
- [ ] **`tosijs-tunnel`: ask the host for the remote port, and register the route AFTER
      the forward succeeds.** `derivePort` is FNV-1a into 900 slots with no occupancy
      check, while `site-config.ts` (shipped in `dist/*.d.ts`) and `doc-site-system.md`
      both promise two projects "can't collide". The fragment write + `systemctl reload`
      run _before_ `ssh -R`, so a collision leaves B's public hostname routing at A's live
      workspace, with no `--unregister`. **Soften the shipped claim to "collisions are
      detected and refused" — it is another guarantee the code does not provide.**
- [ ] `bin/make-icon-data.js` — one bare `catch {}` covers "prettier not installed", a
      prettier _parse_ error, and an API change, so a malformed generated module is
      written and reported as "Successfully generated" with exit 0. Split it: silent
      fallback only for module resolution. Also escape `\r`/`\t` in `quote()` (a raw
      control byte makes grep silently lie), and move `quote`/`emitObject` into `src/`
      where `bun test` can reach them.

**Before the 1.9.0 tag:**

- [ ] Write a consolidated `## 1.9.0` CHANGELOG section, leading with the **consumer
      repairs**, not remote editing — 1.8.0's `tosijs-ui/site` does not import at all in a
      clean install (`index.js` re-exports `devServer`, which top-level-imports `chokidar`,
      a devDependency), and 1.8.0 is still npm `latest`. Say plainly that anyone on 1.8.0
      should upgrade regardless. Name the issues closed.
- [ ] Close the 13 already-fixed issues naming their version: **v1.9.0** — #27 (partially),
      #28–#37; **v1.8.0** — #24; **v1.7.2** — #25 (open two cycles). Close #3 as stale. Leave
      #9/#12/#14/#16/#17/#18/#19/#21/#23 open with "considered, deferred for 1.9.0".
- [ ] Refresh `UPSTREAM.md`: tosijs#20 and #21 are CLOSED upstream (2026-07-27) but still
      listed open; three "still pinned 1.7.5" statements contradict `package.json` (1.7.8);
      the rAF entry should name haltija#3 (filed + closed) instead of "NOT YET FILED"; add
      the five open tosijs issues absent from the file (#22, #18, #17, #16, #9).
- [ ] #27 is only **half** closed — the bins ship, but the host-side bootstrap
      (`preview_site`/`tunnel_site` snippets, `preview.env`, `build-index.sh`) is still
      "copy it out of the tosijs-ui repo", so an adopter's `tosijs-deploy --go` writes a
      fragment referencing an undefined snippet and `caddy validate` fails forever. Ship a
      bootstrap bin or document the prerequisite and name it in the failure message.

**Correctness / coverage (not blocking):**

- [ ] `buildStatus` never reflects the INITIAL build (`dev-server.ts`) — it is initialised
      `{ok:true}` and only written by the watch debounce, while `bin/dev.ts` runs the first
      build itself. Start `bun start` on a red tree and the restored last-good site serves
      with no failure widget until the first save. Needs an `initialBuild` seam.
- [ ] Extract and unit-test `stashLastGood()` / `restoreLastGood()` — `rm -rf` + `mv` over a
      committed directory with no test at any tier, and it already regressed once inside
      this cycle. Two known gaps: the `mkdir -p ${PUBLIC}` sits _outside_ the `try`, and a
      stranded `docs.last-good` survives a later successful build when `docs/` was absent.
- [ ] The client auth-aware save/edit paths — including the 403→download **data-loss** fix —
      have no test at any tier. `src/coverage.test.ts` already builds a doc-browser under
      happy-dom; add stubbed-fetch cases (403 → alert, no download; 501 → download; 200 →
      new baseline) and the `loadSource` 401/403 case.
- [ ] Add `bun run test-consumer` to CI — it needs only network and a temp dir (no certs,
      no display, no haltija), and this repo's own docs say an ungated lane always rots.
- [ ] Fold the six copy-pasted `server.stop(); process.exit(…)` sites into one `shutdown()`.

**Shared practices (`tosijs-coding-practices`):**

- [ ] `practices/deployment.md` still prescribes Caddy `basicauth` and asserts the box has
      "no write endpoint" — the design 1.9.0 rejected, on a box that now fronts an
      authenticated tunnel exposing `POST /__docstore/source`. Update it, add the
      view-vs-edit hostname convention, and note `requireToken` defaults `true`.
      (`grep -rn tunnel practices/*.md` currently returns zero hits.)
- [ ] Add a **packaging-verification** practice: `releasing.md` → "audit the tarball before
      you publish" (`npm pack --dry-run`, compare file count/size to the previous release,
      assert every bin has a shebang, grep for cwd-relative package-asset resolution);
      `testing.md` → a pack-and-install smoke lane naming `bin/smoke-consumer.ts`. Four
      packaging regressions reached published prereleases; more unit tests would have caught
      none — the gap was context, not depth.
- [ ] Update the practices README scoreboard (still says tosijs-ui 1.7.1, three releases
      stale) and add "update the scoreboard" to this repo's Publishing checklist.

**Smaller / unverified leads** — see the report's "Unverified leads" list; notable ones:
the mid-build 404 window (fall back to `.last-good` in `resolveFile`), a
`tosijs-ui/site/config` subpath so the bins don't pull the whole build graph,
`tosijs-tunnel --close` killing `pgrep` matches with no identity confirmation, and
`deploy/` shipping with `dev.tosijs.net` / a personal email hardcoded and no adopter
substitution guide.

## Doc-System Roadmap

See [doc-system-roadmap.md](doc-system-roadmap.md) for the full plan. North star:
each library is a web-accessible doc-system endpoint (library-as-ESM + docs +
authoring), with **tjs-lang** as the live-example transpiler, the **tosijs-ui doc
system** as build/docs/front-end, and an **AJS-VM universal endpoint** as the
back end. Sequence: `./docs` subpath refactor → #6 tjs+CodeMirror → #5 haltija
widget → #4 edit source → #3 save/load examples → #1 ePub → #2 PDF. Phase-2:
importmap example resolution, versioned endpoints, AJS RestStore.

## Dependency majors — decide, don't drift

Minors and patches are current (`bun outdated` shows Update == Current for everything),
so there is no hygiene backlog. These are **major** jumps, which are decisions rather
than routine upgrades — but per `tosijs-coding-practices/practices/dependencies.md` §11,
letting them sit for years is how a five-minute security pin turns into a forced
migration under time pressure. Tracked so they are chosen, not discovered.

- **`marked` 16 → 18** — highest priority, because it is a **peer dependency**: the
  version consumers install is their problem, so a major we have not tested against is
  a support burden we cannot see. Verify rendering across the doc corpus.
- **`prettier` 2 → 3** — will reformat the entire repo in one commit. Cheap in effort,
  expensive in diff noise; do it alone, never alongside a feature, and ideally right
  after a release so blame stays readable.
- **`typescript` 5 → 7** — check for removed compiler options first. Note the root
  tsconfig already had `downlevelIteration` removed under a newer tsc, so this jump is
  not free.
- **`chokidar` 4 → 5** — the dev server's watcher; test the rebuild-storm detector and
  the ignore list specifically.
- **`@types/node` 22 → 26**, **`@types/jsdom` 21 → 28** — types only, but they can
  surface real errors in a strict build.

## High Priority

### `<tosi-table>` loses FOCUS on re-render (same class as #67)

- [ ] **Focus does not survive a re-render, and it should.** Verified 2026-08-14: focus a
      `.td`, change `filter`, and `document.activeElement` is `<body>`.

      ```
      before: SPAN "row 2"     ← focused cell
      after:  BODY             ← filter changed
      ```

      Same cause as the scroll bug — `render()` does `this.textContent = ''` and destroys the
      state — but a worse symptom: scroll position is where you were *looking*, focus is where
      you were *working*. A keyboard user mid-navigation is dropped out of the table entirely
      and has to tab back in. A desktop list view keeps the focused row focused through a
      re-sort, and this is exactly the bar tosijs-ui is aiming at, so "the mouse still works"
      is not an answer. Invisible to anyone testing with a mouse, which is why it survived
      this long.

      **Migrate, don't just restore.** If the focused row is still present, put focus back on
      the same row/column. If it is GONE — filtered out, or the sort dropped it — focus must
      move to the next logical place rather than vanishing: the nearest surviving row at the
      same column, preferring the row that took its position, falling back to the last row
      when it was the end of the list, and to the table itself when nothing survives. Dropping
      focus to `<body>` is the one outcome that is always wrong.

      The pieces exist: `_pendingFocus` / `focusCell` / `findCell` already do restore-after-
      scroll for keyboard nav, and #67's anchor capture is the same shape (capture before
      teardown, resolve after). Best done in the same pass as the structural fix below — one
      "what was the user doing" capture covering scroll, focus and flicker beats three
      separate anchors bolted onto a teardown.

### `<tosi-table>` scroll preservation — the two parts deliberately NOT done (#67)

Scroll stability across re-render shipped in `601d3ee1` (anchors on the topmost visible row,
`preserveScroll` opts out). Two things #67 raised were considered and left alone **on
purpose**; this is the reasoning, so neither gets re-proposed as an oversight or silently
dropped.

- [ ] **Reuse `.scroll-area` instead of rebuilding it** (#67's "related nicety" — `scrollend`
      is re-bound every render). **Deferred, and the case for it is weaker than it looks.**

      1. It is **not a leak.** Each render builds a new `.scroll-area` and discards the old
         one, which takes its listener with it. #67 is right that the listener count is only
         fine *because* the element is discarded — but it is discarded.
      2. It would **not remove the retry loop**, which is the actual complexity. That loop
         exists because the virtual spacer is sized a frame late, and reuse does not change
         that: at frame 0 the content is one viewport tall (measured below), so the browser
         clamps `scrollTop` to ~0 whether the element is new or reused. Reuse buys the
         *appearance* of a simpler fix without the substance.
      3. The cost lands in the **riskiest place** — `render()` would go from
         `this.textContent = ''` to "preserve one specific child, replace the rest", in the
         most complex component in the library.

      Net: one element allocation and one `addEventListener` per render, against structural
      surgery that fixes no observed defect. Revisit only as part of the flicker fix below,
      where holding scrollable height across the swap would give reuse an actual purpose.

- [ ] **Eliminate the one-frame flicker.** The table paints once at the top before the
      correction lands. **Measured** on a 400-row × 40px table (chromium), sampling each frame
      after a filter change:

      | frame | `scrollHeight` | `scrollTop` |
      | --- | --- | --- |
      | 0 | 400 (== `clientHeight`, no spacer yet) | 0 |
      | 1 | 16040 | 4000 |

      So it is exactly one frame (~16ms), self-correcting, and only in virtual mode —
      with `rowHeight: 0` every row is stamped during render, so the height is real at frame
      0 and there is nothing to correct.

      The cheap fix, if it is judged worth it: append a **temporary spacer** of
      `visibleData.length * rowHeight` to `.scroll-area` before the first paint so the
      container is immediately scrollable, write the target `scrollTop`, then drop the spacer
      on the next frame once the real one exists. ~10 lines, confined to virtual mode, and the
      existing retry already re-asserts the position when the spacer is removed.

      The structural fix, which retires this whole class: **stop rebuilding the DOM when only
      the data changed.** `filter` / `sort` / `visibleGroupedRowIds` change what
      `rowData.visible` holds, not the shape of the table — assigning the new array and
      letting `listBinding` reconcile would leave the scroll container untouched, so there is
      no clamp, no retry, and no flicker. Bigger job (the header's sort indicators still need
      a structural update), but it also makes #67's nicety fall out for free.

### Nested live-examples mis-route (self-hosting demo) — CSS half

- [ ] **Tighten the live-example's light-DOM CSS to child combinators** so a container example's
      state classes / part rules don't bleed onto **nested** examples' parts (the
      `one-source-every-artifact` self-hosting demo). E.g. `:host.-test-passed [part="exampleWidgets"]`
      → `:host.-test-passed > [part="example"] > [part="exampleWidgets"]`. The functional half (the
      `this.parts` proxy resolving to a nested instance's parts) is a **tosijs** bug — filed as
      [tonioloewald/tosijs#20](https://github.com/tonioloewald/tosijs/issues/20), see `UPSTREAM.md`;
      the user is fixing it in tosijs. Revisit this CSS half after bumping the tosijs dep with the fix.

### From the 1.7.0-beta.3 nine-lens review (`RELEASE-REVIEW-1.7-beta3.md`)

Full report in that file. Recommendation was **BLOCK** on one finding, now **fixed**:

- [x] **BLOCKER FIXED** — eager static `tjs-lang/editors` import + scope-capture on every reader
      example. Now a dynamic import gated to `dialect!=='js' && editorsBuilt`; optional-peer contract
      restored, scope code is a lazy 1.3KB chunk fetched only at edit-time.

Non-blocking follow-ups (do before the FINAL 1.7.0 tag):

- [x] **CHANGELOG** — added `1.7.0-beta.3` section, fixed the peer line to `^0.10.1`, annotated the
      beta.2 "Remaining… defers construction" note as delivered.
- [x] **CLAUDE.md/MEMORY.md `haltija@latest` → `^1.4.0`** (code pins `HALTIJA_PKG=haltija@^1.4.0`).
- [x] **DECISION MADE (2026-07-20): breaking `<tosi-code>` ships as 1.7.0 MINOR, documented loudly.**
      Rationale: the `2.0` name is reserved for the tjs-native tosijs port. Loud BREAKING notice added
      atop CHANGELOG (new consolidated `## 1.7.0` section) and README (⚠️ section before the intro):
      ACE→CM6, `theme`/`options` dropped with no shim, `value`/`mode`/`change`/`disabled`/undo-redo
      unchanged, pin `@1.6` to defer. **Final tag waits on haltija 1.5.0 (being nine-lensed).**
- [x] **`el.editor` getter warning** — downgraded to `console.info`, leads with "it IS the supported
      CM6 accessor" so correct use isn't scolded.
- [ ] **CI e2e is Chromium-only** (`.github/workflows/ci.yml`) — the headline browser features have no
      automated Firefox/WebKit gate (only the manual local lane, which "rots silently"). Add a Firefox
      project OR a release-checklist step that fails if all-project `bun playwright test` wasn't run.
      Also: the 4 new specs `test.skip` WebKit unconditionally — track that permanent gap.
- [x] **`killStrayServer` kill receipt** — now logs SIGTERM → pid/comm/port (and SIGKILL escalation).
- [ ] **ePub build is non-deterministic** — re-zips with varying bytes, so the build-then-`git diff`
      staleness gate can't be clean. Fixed mtimes/ordering, or exclude the path from the gate.
- [x] **DRY: `gzipSizeInChild`** extracted (orchestrator, was inline ×2).
- [ ] **DRY (remaining):** extract one `runBunChild(argv)` owning the drain-both-pipes invariant
      (orchestrator ×2 + bundle-guard — the leak class this release fights); extract
      `prepareExecutable()` shared by executeInline/Iframe (touches the core run path — do carefully).
- [x] **`demo/src` dead-entry tangle — RESOLVED via option (a).** `<tosi-css-var-editor>` was dead in
      the build (only registered by the un-built `demo/src/index.ts`). Moved it into the doc-system
      (`src/doc-system/css-var-editor.ts`), registered via a side-effect import in `doc-system.ts` (NOT
      a public export), fixed its rgb-color detection + unbounded retry, and deleted the whole dead demo
      entry. Live on the component pages now (verified on /carousel/).
- [x] **#13 `<tosi-map>`** — fixed (one map, not one per render during CDN load) + regression test.
- [x] **#8 hydration console errors** — verified fixed by the 1.6.9 parts adoption, closed, guarded
      (`hydration.pw.ts` console-clean test).
- [x] **#15 ePub cross-links** — fixed (`rewriteInBookLinks`), closed, 6 unit cases + real-ePub verified.
- [~] **GitHub issues + `UPSTREAM.md` (ecosystem), remaining:**
  - [x] #14 (throwing example) already filed + open (tosijs-ui#14) — tracked, not a new filing.
  - [x] **WebKit doc-test-runner skip filed as tosijs-ui#19** (2026-07-20) — the 4 specs that
        `test.skip` WebKit + root cause (iframe runner never posts per-page `tosi-tests-done`).
  - [x] bun#34053 note kept current (weekly poll 2026-07-20; PR still unmerged, still 1.3.14).
  - [ ] **#13 (`<tosi-map>`) — CLOSE ON TAG.** Fixed on-branch (`c7c1e63e`) but the issue is
        still OPEN; close it naming 1.7.0 when the tag lands.
  - [ ] #9 (document the cinematic-landing-page pattern — content-bound). **#12**
        (language-plugin hooks) is strategic platform work, not a cleanup — see the platform
        sequence below.
- [x] **Shared `tosijs-coding-practices` (practices lens) — DONE (2026-07-20).** On review, most were
      already landed by the earlier practices commit: `testing.md` Playwright claim already inverted
      (dedicated 8799, `reuseExistingServer:false`); `00-stack.md` already has the 12-`@codemirror/*`
      Known-divergence entry; `README.md` already "nine-lens"; lens-7/8 write-back covered by review.md's
      "Done when: filed upstream". The one genuinely-missing lesson — **"never scope the unit lane with a
      `*.test.ts` glob" (skips subdirs, ~126 tests) — added to `testing.md`** (commit `417ce9e`, unpushed).

- [x] **Bumped tjs-lang 0.9.1 → 0.10.1** (2026-07-17, memory-storm fix). All three refs in lockstep
      (package.json dev+peer, `TJS_VERSION`). Required the inline-WASM guard update (0.10.x renamed
      the compiled export `__tjs_wasm_0` → collision-free `__tjs_wasm_<hash>_<n>`, tjs-lang#11 — guard
      now matches by pattern). #12 hand-roll deleted (`TjsAutocompleteConfig` → real `AutocompleteConfig`
      from `tjs-lang/editors/codemirror`, `import type` so zero bundle cost). All lanes green
      (unit + doc-tests + full Playwright). - [ ] **Still watch RSS over a real multi-day watch session** — the storm being gone is the whole
      point of the version; builds/lanes alone don't exercise a long-lived process. - [x] **#10 scope scanner deleted** — replaced ~272 lines (`extractTopLevelBindingNames` +
      `buildScopeCapture` + helpers) with `scopeCaptureEpilogue` from `tjs-lang/editors`. The
      "acorn bloat" worry was WRONG: that entry is a self-contained ~5KB file (no acorn), so the
      static import is negligible (hydrate 121.9→121.8KB gzip). Verified via `scope-autocomplete.test.ts`. - [ ] **#16 `tjsEditorExternal` — leave as belt-and-suspenders.** 0.10.x declares the
      `@codemirror/*` optional peerDeps, so the hard-fail it guarded is gone, but keep the probe
      until an isolated-tree build is actually verified without it.

- [ ] **RFC: language-plugin registry for live-example (tosijs-ui#12, from the tjs-lang side).**
      Invert the hardcoded `js|ts|tjs` dialect switch in `code-transform.ts` into a plugin
      contract (`transform`+diagnostics, optional `run`, optional output `panels`) so tjs-lang can
      register its AJS playground without tosijs-ui depending on `tjs-lang/vm`. The abstraction is
      only real if js/ts/tjs re-express as built-in plugins. A design task — coordinate with the
      language-plugins direction in doc-system-roadmap.md. Consumes tjs-lang#20 (TFS import
      resolver) + #18 (worker-ready WASM).

- [ ] **Remote dev-server access — one-command tunnel spike (queued after M10; the "dynamic DNS"
      ask).** Where we landed: a reverse **tunnel (`cloudflared`)** beats port-forward + dynamic
      DNS — no router/firewall changes, works behind CGNAT, HTTPS + a stable hostname for free, and
      nothing inbound is exposed. Spike a one-command `cloudflared tunnel` in front of the dev
      server with auth (Cloudflare Access, or Basic-Auth at the edge). If it's clean, productize as
      a `devServer` `remote: { tunnel, auth }` option so any tosijs-ui doc-system project gets
      "share what I'm working on" for free. **Never expose the dev server directly** (it shells out
      to `bun build`, reads the process table, binds ports — see the machine-health guards).

### From the 1.7 nine-lens review (`RELEASE-REVIEW-1.7-pass3.md`)

- [x] **M8 — gate the inline doc tests (incl. the inline-WASM guard) in CI.** ✅ DONE via
      **`tests/doc-tests.pw.ts`**: it navigates to `/`, awaits `window.__docTestResults` (the
      doc-browser's background runner iframes every page-with-tests on localhost and resolves it
      with the totals), and asserts `failed === 0`. Runs in the existing e2e job
      (`playwright test --project=chromium`) with **zero haltija** — so the WASM guard is behind
      the release gate for the first time. Also hardened the interactive haltija lane
      (`bun run test-browser`): the start-timeout path now calls `stopHaltija()` (was the naive
      `haltija.kill()` that leaked the Electron grandchild and poisoned the next run), and it
      adopts a _reachable_ haltija regardless of window count (no more racing a second instance
      next to a zero-window one).
      **Residuals (minor):** (a) WebKit is skipped in `doc-tests.pw.ts` — its iframe runner never
      posts per-page `tosi-tests-done`, so pages wait out the 30s per-page timeout and the corpus
      blows past budget; investigate the WebKit postMessage/iframe path. (b) `bun run test-browser`
      still **reuses/navigates a running haltija** (hijacks whatever window is open, another
      project's session included) — the clean fix is a dedicated instance via
      `HALTIJA_REGISTRY_DIR`/`--name` so it never touches the user's session. `doc-tests.pw.ts`
      already sidesteps both by using an isolated Playwright browser.

- [~] **M10 — the IIFE tripled: 121KB → 388KB gzip, ~100% CodeMirror.** HALF 1 DONE.
  The doc-site build now emits an **ESM `--splitting` hydration bundle** (`hydrate.js` + hashed
  chunks) that the served pages load as `<script type="module">`; `dist/iife.js` (classic) is
  kept for the CDN `<script>` path. Result: the always-loaded entry is **122.7kb gzip** (was
  388kb), and CodeMirror rides a lazy chunk. The tjs CM extension stays bundled and splitting
  preserves the shared single `@codemirror/state` (it and `code-editor-cm` import the same
  shared chunk). Verified: 41 Playwright green, pages hydrate via the module, editors work when
  loaded. **A page with no code examples now ships zero CodeMirror** — the headline case.
  **HALF 2 REMAINING — self-contained examples (bake the transpiled JS into the page).**
  Chosen approach, fully designed in [`self-contained-examples-plan.md`](self-contained-examples-plan.md).
  Supersedes the earlier "defer editor construction" idea: baking removes BOTH CodeMirror AND the
  tjs transpiler from first paint (deferring only editors still loads tjs to run a `tjs` preview),
  and makes a saved example runnable with zero runtime deps. The bake artifact is exactly what
  `check-examples` already computes per block; embed it as a hidden non-executing
  `<script type="application/tosi-transpiled">` co-located with the `<pre>`, keyed by source text.
  Four committable slices (build-side inert → runtime consume → defer editors → save). **Slices 1
  and 2 DONE:** tjs examples bake into hidden scripts and RUN from them on the reader path, and
  `loadTransform('js')` is now identity — so a reader page runs all its js+tjs examples with the
  tjs transpiler never requested on first paint (verified by a reader-path Playwright test + the
  doc-tests lane). **Slice 3 DONE too:** the `<tosi-code>` panels build lazily on first
  showCode (via `ensureEditors()`, not `content()`), so a reader page loads NEITHER the transpiler
  NOR CodeMirror on first paint — the M10 goal. Verified by a chunk-not-loaded-until-showCode
  Playwright test + the full 17-spec lane. **Slices 2b + 4 DONE:** 2b groups bakes per doc and
  attaches them to each Doc in `docs.json` (SPA-nav runs baked tjs examples too; only the 1 doc
  with tjs examples carries bakes, the other 56 add zero bytes). Slice 4 makes `refresh()` run a
  bake only while it matches the current source (an edit drops the stale bake and transpiles),
  and persists the transpiled code with a saved local edit so a restore runs transpiler-free.
  **M10 half 2 is COMPLETE.** **Do NOT gate the editor
  on "does this corpus have code examples"** — the doc system is an _authoring_ system; prose/book
  sites need the editor most.

- **Doc-system: pre-render the chrome, hydrate in place — and drop the opacity gate.**
  Generated pages currently hide the whole body (`body{opacity:0}`, 4s safety-net timeout)
  until the bundle hydrates, because hydration injects the entire chrome (an undefined custom
  element is `display:inline`, so the un-upgraded page stacks as bare text) and collapses each
  example's `js`/`test`/`css` blocks into one live-example. That reflow is why the gate exists.

  **The markup is already all there** — nav tree, header, content, code blocks, `<tosi-doc-system>`
  host; a component page is 9.5KB of HTML. What's missing is CSS for the _un-upgraded_ state.
  Fix: a **size-gated layout** that tucks the unhydrated body into a scrolling rectangle
  positioned as though the header and (on wide viewports) the sidebar were already there —
  `tosi-doc-system:not(:defined)` + its light-DOM children, in the burned static stylesheet.
  Hide the non-`js` blocks and reserve the preview's space so live-example replacement is
  in-place. Then hydration is purely additive, nothing moves, and the gate can go.

  Why it matters (measured on the built site, gzipped, CPU-throttled — 6x ≈ mid Android,
  12x ≈ cheap phone / Pi4). "Visible" = the gate lifting, i.e. blank-screen duration:

  | device                     | 1.7 (387KB gz)                    | editor-free (121KB gz) |
  | -------------------------- | --------------------------------- | ---------------------- |
  | laptop, fast wifi          | 685ms                             | 505ms                  |
  | mid Android, 4G            | 1976ms                            | 1316ms                 |
  | cheap phone / Pi4, slow 4G | 4532ms                            | 3667ms                 |
  | cheap phone / Pi4, 3G      | 4837ms — _hits the 4s safety net_ | 4831ms — _ditto_       |

  Note the 3G row: hydration loses to the safety net, so the reader gets 4s of blank **and**
  the un-hydrated flash anyway. The gate only pays off while hydration is fast. With the chrome
  pre-rendered, content is readable at FCP (~300–500ms) on every device, and the bundle gates
  _editing_ rather than _reading_.

  Do NOT just delete the gate: that trades a clean blank→hydrated (2 states) for
  blank→dead-page→hydrated (3 states) for everyone, i.e. a flash of content that then shifts.

- **Split the editor out of the hydration bundle** (pairs with the above). The editor stack is
  **66% of the bundle**: `@codemirror/*` (1061KB src), `@lezer/*` (384KB), `acorn` (296KB — it
  arrives via the tjs _autocomplete_ extension, not the transpiler), + the tjs CM extension. The
  transpiler is already external (`tjs-lang/browser`, fetched at runtime), so **live examples
  would still run** — only the code _panels_ need CodeMirror. The lazy boundary
  (`import('./code-editor-cm')`) already works under ESM; only `--format=iife` can't split.
  Two halves: (1) emit the hydration bundle as ESM + `--splitting` + `<script type="module">`,
  keeping the IIFE for the CDN path (`bundle-guard`'s classic-script check must go module-aware);
  (2) defer editor _construction_ until a code panel is first shown — otherwise live-example
  eagerly builds 4–5 hidden editors per example and pulls the chunk anyway.

- **Diff view: allow reverting changes from it.** `<tosi-code>`'s `showDiff(on)` overlay
  (`src/code-editor.ts` → `tosi-diff`) is read-only — you can see what changed against the
  baseline but not act on it. Let the reader revert from the diff: per-hunk revert at minimum,
  and revert-all. This is the review step of the doc-system's edit-and-save-to-source flow, so
  "I see the change and I don't want it" currently means retyping it by hand.
- **JSON Schema-driven form editor** - Integrate schema-based form generation
- **Doc-system: expose customization of the app/settings menu** — The `<tosi-doc-system>` settings button (the moreVertical/gear menu, `settingsButton()` in `src/doc-system/doc-system.ts`, `title="settings"`) builds its `menuItems` array inline (Print as PDF, Download ePub, Language, Color Theme, …). There's currently no public API for a doc-site consumer to add, remove, reorder, or override these items. Add a way to customize it — e.g. a `SiteConfig` hook or a `menuItems` prop/callback that receives the default items and returns the desired set — and surface/document it in `doc-site-system.md`.

## Book / prose adoption (from `falling-forward`, 1.6.15)

The doc-system assumes a **code library with a `src/` tree**; a book has no code,
uses different Markdown, and needs a _curated book artifact_, not just a site.
Full write-up in the adopter's `TOSIJS-UI-FEEDBACK.md`.

**Done (quick wins):**

- ✅ #4 Auto-serve `/iife.js` when `bundleEntry` is omitted (copy tosijs-ui's own
  iife into the output, version-matched) — pure-docs sites hydrate out of the box.
- ✅ #7 Skip `_`-prefixed scaffolding files (`_template.md`, `_drafting-log.md`).
- ✅ #12 Empty metadata `title` falls back to the H1 (was blanking nav entries).
- ✅ #6 Warn when no ePub cover is generated (@resvg/resvg-js missing); title-only
  cover already works when it's present.

**Batch A done (rendering pipeline, syntax-activated → safe default-on):**

- ✅ #2 **YAML frontmatter** — `parseFrontmatter` in docs.ts parses & strips a
  leading `---…---` block, maps `title`/`order`/`author`/`date`/`draft`→hidden;
  frontmatter wins over JSON-comment metadata; empty title falls back to H1; a
  bare `---` rule is left alone.
- ✅ #5 **Wikilinks** `[[slug]]` / `[[slug|label]]` → `/slug/` (marked inline
  extension; not matched inside code spans). _First cut resolves by slugifying the
  target; a real corpus-basename match + unknown-target handling is a follow-up._
- ✅ #1 **Footnotes — ePub/web first cut**: `[^id]` refs (numbered by appearance)
  - `[^id]: def` collected into an endnotes `<section>` with backrefs (marked
    extensions). _Still TODO: page-anchored footnotes w/ cross-refs — a
    **print-to-PDF** feature (browser Print path, not a batch job): build the full
    DOM, compute pagination, then settle page numbers + footnote positioning by
    pushing content across page boundaries (roadmap "measured rectangles"). Also:
    multi-line/paragraph footnote definitions._

**Batch B done (curation, overlay-on-defaults):**

- ✅ #3 **First-class "book" corpus** — `book: BookManifest` in site config
  (`src/doc-system/book-manifest.ts`, pure + unit-tested). Curates/reorders the
  book artifact WITHOUT touching site nav (one source, two outputs). Zero-config
  = whole visible corpus (unchanged). `include`/`exclude` globs select docs;
  `order: [...]` names the lead sequence (front/back matter are just docs you
  name); `sort: 'filename'` gives a folder of chapters natural order with no
  metadata. Identity (title/author/cover) still comes from `epub`. It never adds
  a new ordering mechanism — it overlays each doc's `order` so the shared
  buildNavTree/flatten sequences the book (pins/parents still apply). Applied in
  `buildEpub`; **print path (buildBookHtml, client Print button) still uses the
  whole corpus** — wire the manifest there when print/PDF pagination lands.
  _Deferred: a content-author YAML manifest file (`_book.md`) as an alt to the
  typed config — per-doc frontmatter already covers per-doc metadata._

**Queued — P1:**

- #14a **Smart typography** (curly quotes / en-em dashes / ellipsis) — deferred
  from Batch A: unlike wikilinks/footnotes it rewrites ALL prose, so it must be
  **opt-in** via config (pairs with #9's `kind: 'book'` preset; needs config
  threaded to `renderDocMarkdown`).

**Queued — P2:**

- #8 Order by filename/path within a section (natural sort), `order` as override.
- #9 A `kind: 'book' | 'library'` preset with sane content-project defaults
  (no `src/`/`demo/` assumptions).
- #10 Folder structure implies nav sections (`chapters/book-1/*` → "Book 1").

**Queued — P3:**

- #11 Friendlier metadata entry (the planned metadata UI, or #2's YAML).
- #13 Optional built-in epubcheck (or a documented validation pass).
- #14 Smart typography (curly quotes, en/em dashes, ellipsis) opt-in; word-count
  / reading-time per doc + total.

## Example captures (live-example → static images)

Design landed; not built. See **"Example captures"** in
[doc-system-roadmap.md](doc-system-roadmap.md). Capture is _exhaust from normal
dev_: embedded **private haltija** (per-app socket, beta 10) holds a single
`getDisplayMedia` stream and `grabFrame()`s on demand (crop to the example rect),
so testing/posing an example self-captures; haltija puppeting fills gaps. Manual
captures are sticky; organic ones refresh only when the example's **code hash**
changes. One asset, three consumers: **ePub images**, **no-JS / pre-hydration
placeholder**, optional ePub cover hero. Builds on `ExampleKey` + the dev-write
endpoint (Foundations B/C). Depends on **#5 (haltija-in-dev widget)** landing the
private-mode socket first.

**Book ↔ live-site fidelity ladder** (phase-2, greenlit) — one example source, three
tiers: (1) static captured image + code (every reader); (2) each book example
**deep-links to its anchored spot on the live site** (ePub/PDF link + **QR for
print**), version-pinned `/v{version}/{slug}/#{id}`, stable `id=` fences not
ordinals; (3) **inline interactive** in Apple Books / Readium via scripted EPUB3
(`properties="scripted"`, pre-transpiled + inlined, image fallback — NOT the dead
iBooks Author format). Needs per-example **anchors + scroll-to/highlight on the
live site** (independently useful). See roadmap "From book to live."

## Live examples

- **Fully-isolated example option (future, not default).** Live examples run inline
  on the shared page by default — deliberate: it shows off tosi's isolation and lets
  you drive demos through the global singleton. The `iframe` attribute isolates
  DOM/CSS but NOT tosijs state (the `tosijs`/`tosijs-ui` modules injected into the
  iframe are the host page's instances, so `tosi()` singletons stay shared). A
  _totally_ isolated mode — separate module realm so `tosi()` state and imported
  deps are sandboxed too — would follow tjs-lang's playground approach: a **service
  worker intercepting dependency imports**. Worth offering eventually as an opt-in;
  the shared-page default stays the right behavior for real examples. Documented +
  warned about in the `<tosi-example>` doc ("How examples run") and surfaced in
  llms.txt.

## Medium Priority

- **Vector similarity search for doc-browser** - Replace current search with vector-based approach
- **Focus management and focus-visible styling** - Improve keyboard navigation and focus indicators

## Localization

- Adding automatic localization where appropriate:

  - `<tosi-password-strength>`
  - `<tosi-tag-list>`
  - `<tosi-filter>`

- **`<tosi-table>`'s column header menu: the CONCATENATION half is still open.** The
  ambiguity half is fixed — the keys now carry `#annotation` disambiguators
  (`Right#direction`, `Column#table`, `Sort#order`, …) and `demo/src/localized-strings.ts`
  has matching rows. That part shipped in a patch because annotating a key falls back to the
  bare row, so it cannot orphan an adopter's table.

  What remains is the word-order defect at `src/data-table.ts:2542, 2551, 2567, 2578`:
  `${localize('Sort#order')} ${localize('Ascending#sort-order')}`, and the same for
  hide/show + column. Two fragments, joined in English order, which no translation can
  rearrange. It should become one key — `localize('Sort ascending')` — which is mostly a
  DELETION, because `popMenu({localized})` already localizes every caption and propagates
  `localized` into submenus, so these are being localized twice today.

  **Not done, because that one moves the keys.** An adopter's table has `Sort` and
  `Ascending` rows; afterwards neither matches and the menu reverts to English. The
  annotation fallback does not help here — it falls back on the annotation, not on
  fragments. So it needs a release note naming the new keys, or a fragment fallback, and it
  belongs in a minor.

  Worth knowing for the translations themselves: a native-speaker pass is still owed. The
  corrections made were the ones where the SENSE was wrong; several entries are merely less
  idiomatic than the local UI term (ja `選別` for sort, es `Clasificar`, zh `展示` for show)
  and were deliberately left alone rather than asserting more than could be verified.

## DONE (1.12.1): the Playwright lane's worker contention

- [x] Both halves of the `hydration.pw.ts` / `docs.json` flake are now addressed. The client
      half shipped in 1.11.0 (`fetchCorpus` retries 429/5xx/network with full-jitter backoff).
      The server half is here: local workers are pinned to **6** instead of Playwright's
      default ~half-the-cores (9 on this box).

      Measured rather than guessed — 9 workers ran the suite in 82s, 6 in 81s, so the lane is
      not CPU-bound at 9 and a third of the concurrent load on the single dev server is free.
      4 workers costs 106s (+30%) and buys nothing further. 6/6 full runs clean afterwards
      against a prior rate near 1 in 5.

      Suggestive, not proof — 6 runs cannot demonstrate a 1-in-5 rate is gone. If it recurs,
      re-measure rather than dropping workers further on instinct.

## DONE (1.12.1): `<tosi-schema-form>` perf guards, both gaps closed

- [x] **The structural-edit path is guarded** (`syncValues`, run on add/remove-item rather than
      on keystrokes). A root-scoped per-field scan there passed the keystroke test; the new
      sibling takes it from 1 lookup per add to 41 -> 161 as fields grow.

- [x] **Wall-clock is back, and now it holds.** It had been removed for flaking at 9 workers
      (firefox: 2.67x isolated vs 9.25x loaded for the same 4x-fields measurement — load and
      regression indistinguishable). At 6 workers the distributions overlap — isolated 3.20-4.57
      across all three engines, under full load 2.64-4.14 — so the threshold of 8 sits 1.75x
      above the worst measurement and 2x below quadratic's 16.

      The three guards are complementary and the mutations prove it rather than assert it: an
      O(N) scan per field using no selector at all fails the timing guard at 9.63x while both
      count guards pass, and re-finding the error slot per field fails the count guard while
      timing stays linear at ~4x.

      Two traps worth not re-learning. Build with output VISIBLE when mutation testing — a
      first attempt "passed" because the rebuild was silenced with `>/dev/null 2>&1` and the
      lane tested a stale bundle. And never grep `dist/iife.js` to check a mutation landed:
      minification renames locals, so the string is absent whether or not the code is.

## `layout: full-screen` — needs a collapsed state on `<tosi-side-nav>`

- [ ] `layout: 'full-width'` shipped (#105); `'full-screen'` did not, and is **rejected with a
      message** rather than half-honoured.

      Why it does not work as CSS: after hydration the nav is a `div.doc-nav` inside
      `<tosi-side-nav>` carrying an INLINE `display: flex`, and side-nav sets `--nav-width` as
      an inline property too. A stylesheet cannot override either without `!important`.
      Hiding `<tosi-side-nav>` itself is not the answer — it wraps the content as well as the
      nav, so that hides the page.

      The fix belongs in the component: a collapsed/hidden state on `<tosi-side-nav>` that
      `full-screen` can set, which is what the original request anticipated ("would also entail
      changing side-nav's behavior slightly"). Doing it as `!important` from the doc-system
      would work and would be the wrong layer.

## Sub-frame flash of unmeasured prose between `:defined` and hydration

- [ ] Two things constrain `.doc-content`, and there is a gap between them.
      `tosi-doc-system:not(:defined) .doc-content { max-width: var(--doc-content-max-width) }`
      applies until the custom element is defined; the doc-browser's inline `max-width` applies
      once it runs. In between, neither does, and the content is full width.

      Surfaced as a one-off webkit test failure (`content: 1400` on a prose page) while adding
      the `layout` tests — the measurement landed in the gap. The test now waits for hydration,
      which is right for the test and does nothing for the page.

      Likely invisible in practice, but it is the same class as the nav-hydration flicker fixed
      in 1.7.3, and that one was also "probably too fast to see" until someone saw it. Cheapest
      fix is probably for the pre-hydration rule not to depend on `:not(:defined)` — the
      variable is what carries the measure, so a plain `.doc-content` rule would hold across
      the whole load.

## DONE (1.12.1): `<tosi-table>` torn render on a mid-flight `columns` change

- [x] **[#102](https://github.com/tonioloewald/tosijs-ui/issues/102)** — fixed. Not the
      mechanism first assumed: `render()` already passes one `cols` array to both the header
      and the row template, so a render cannot tear itself. The break was `setColumnWidths()`
      reading LIVE `visibleColumns` while a render was in flight, writing a grid template for
      the new columns over the old cells. Fewer tracks than cells means CSS Grid auto-places
      the surplus into implicit tracks, which size to content — so header and body resolved
      them differently and stepped apart.

      Found by fuzzing an invariant, not by reasoning: four plausible mechanisms were
      reproduced first and all four held. The invariant — grid track count equals cell count
      in the header and every body row — is now `tests/table-columns-inflight.pw.ts`.

## Flaky: firefox, `no WebAssembly compiler available`

- [ ] Roughly **1 full run in 6, firefox only**, under the same 171-spec parallel load as the
      flake above. The inline-WASM example fails to load at all
      (`✗ example loads without error: Error: no WebAssembly compiler available`), which fails
      `example-bake.pw.ts` slice 2b and the whole doc-test tier in `doc-tests.pw.ts`.

      **Filed upstream: [tjs-lang#36](https://github.com/tonioloewald/tjs-lang/issues/36).** A
      `wasm {} fallback {}` block should take the fallback branch when the engine declines to
      compile wasm — that branch exists for exactly this case. There is **no local fix**: our
      doc-test guard could learn to state its precondition, but the example itself throws
      before the guard runs, so patching the guard would fix nothing while adding a branch
      that can never be exercised.

      Verified before filing, so this is not written off as "the machine was busy": a probe of
      `typeof WebAssembly`, `WebAssembly.validate()` and `new WebAssembly.Module()` run 12×
      per engine **during a full-load run** came back available/valid/compiling **36/36**, and
      the specs pass 3/3 in isolation on firefox. So wasm is normally fine in this lane and
      this is an intermittent refusal under pressure, not a configuration.

## From the 1.11.0 nine-lens review (deferred)

Full report: [RELEASE-REVIEW-1.11.md](RELEASE-REVIEW-1.11.md). All three blockers and eight
majors were fixed before tagging. What is left is performance and process:

- [ ] **M8 — one keystroke rebuilds the whole table.** `crud.render()` unconditionally
      reassigns `table.array`, and `TosiTable.render()` is a full teardown (`textContent = ''`).
      Measured: 3 search keystrokes → 3 full rebuilds inside the debounce window. Any
      in-progress cell edit loses focus and caret. Fix: identity-guard the assignment
      (`if (this.parts.table.array !== this._rows)`), likewise `form.schema`.
- [ ] **M9 — schema-form is O(N²) per keystroke.** One root-scoped attribute `querySelector`
      per field (×2), and `render()` walks the tree three times. Measured under 4× CPU
      throttle: 1000 fields ≈ 145ms per keystroke inside crud, 2000 ≈ 540ms. Validation itself
      is ~0.1ms — the cost is the selector passes. Fix: a `Map<path, {wrapper, control,
errorSlot}>` populated in `buildField`, and memoize `expanded()` once per render.
- [ ] **M14 — no open issue has a disposition.** #97 and #95 are fully implemented and still
      open; #44's Part A shipped whole and Part B (generalized source write-back) needs
      splitting out; #85 and #3 are half-delivered; #87/#88/#89 were filed against the very
      feature this release ships and have no reply. Systemic: #50 and #77 are still open
      despite the 1.10.2 notes claiming both fixed.
- [ ] **M15/M16 — write-backs to `tosijs-coding-practices`.** The shared KB still states the
      `Bun.build()` arena leak as live (this release measured it fixed in bun 1.4.0), still
      says bun#34053's fixes "sit as open PRs", and `review.md` tells you to file review
      reports into `docs/` — which `buildSite` `rm -rf`s on every build, as `deployment.md`
      says 180 lines away. Also: a `./*` exports wildcard does not cover `./*.js`; and the
      localization lesson (a bare word is a question the translator answers wrong about half
      the time) belongs in `web-components.md`.
- [ ] **[#102](https://github.com/tonioloewald/tosijs-ui/issues/102) — `<tosi-table>` header
      and body widths can disagree** after a resize followed by a programmatic `columns`
      assignment. Not reproduced yet; the mechanism is narrowed in the issue. The invariant to
      assert is that header and body derive geometry from ONE source — anything computing a
      width per element is a second source and is where this class of bug lives.

## Components

### `<tosi-b3d>`

- Converting this to a blueprint

### `<tosi-filter>`

- Leverage `<tosi-select>` for picking fields etc.
- Leverage `<tosi-tag-list>` for displaying filters compactly
- Leverage `popFloat` for disclosing filter-editor

### `<tosi-editable>`

- Add support for disabling / enabling options
- Hide lock icons while resizing
- Maybe show lines under locks indicating the parent
- Support snapping to sibling boundaries and centers

## CSS variables in the 1.11.0 components

- [ ] `<tosi-schema-form>` and `<tosi-crud>` hand-roll raw `var()` strings (12 sites and 6
      sites) rather than `vars.*` / `varDefault.*`, which CLAUDE.md's CSS rules call for. One
      real bug came out of that and is fixed — `--tosi-spacing-50` is not a variable; the scale
      is `-xs/-sm/-lg/-xl`, and the fallback made the mistake invisible. The remaining three
      (`--tosi-error`, `--tosi-border`, `--tosi-border-radius`) are genuinely new customization
      points, now documented on the schema-form page, but they should go through `varDefault`
      like everything else so a typo cannot hide behind a fallback again.

## Dev bridge (tunnel + magic link)

From two weeks of using the bridge in anger. It is better than Bonjour or a LAN IP when it
works — no address to find, no same-network requirement — and it is the only thing that
affords remote testing at all. The remaining friction is the credential, not the transport.

- [x] **Reusable link window — shipped.** `linkPolicy` defaults to `'window'`: a link is
      redeemable **repeatedly** until it ages out, and only then hands over the durable
      session cookie (30 days). Try something in the Claude app, then open the same link in
      Safari for a deeper dive. TTL is **5 minutes** as of 1.11.0 (`LINK_TOKEN_TTL_MS`),
      configurable per project via `preview.tunnel.linkTtlMinutes` — tightened from 15
      alongside the 7-character token, where the short window is what pays for the short code.
      _(This bullet said "currently 15 minutes" for a while after the change landed one bullet
      below it — a ticked item written in the present tense goes stale silently.)_

- [x] **DONE — [#97](https://github.com/tonioloewald/tosijs-ui/issues/97): the link token is
      7 Crockford base32 characters.** Was 22 characters of mixed-case base64url, typed by
      hand into a headset's floating keyboard — painful enough that people abandoned the
      tunnel and typed LAN IP addresses instead, which is the feature failing rather than
      the user. Crockford excludes `I L O U`, so the `0`/`O` and `1`/`l` mistypes cannot
      happen; case is folded and the aliases accepted **on redemption**, and hyphens ignored,
      so someone who types what they think they saw still gets in. `--link` prints the code
      on its own line as well as in the URL. TTL 15 → 5 min, which is what pays for the
      shorter token. The SESSION token is untouched at 128 bits.

      One correction to the issue for the record: it describes the link as single-use.
      It had not been since 1.10.0 — `linkPolicy` already defaulted to `'window'`.

- [ ] **Let the preview index build the edit URL for you.** `dev.tosijs.net` already knows
      every deployed project and its route (`deploy/build-index.sh` scans
      `/srv/preview/*/version.json`). Add a picker plus a 7-character token box that
      composes `https://<project>.edit.dev.tosijs.net/?t=<TOKEN>` and navigates on Enter.

      Same motivation as #97 and the same measure of success: what a headset owner has to
      type. Choosing a project from a list and entering seven characters is a different
      activity from transcribing a full URL through a floating keyboard, and it is the
      difference between testing on interesting devices and not bothering.

## Build System

- **Built-in custom icon generation for `tosijs-ui/site`** — currently a consumer
  generates an icon module with the shipped `tosijs-make-icons` CLI and registers
  it via `defineIcons` in their bundle entry. Make it first-class: export
  `generateIconData({ input, output })` from `tosijs-ui/site` (refactor
  make-icon-data's core into an importable function, CLI as a thin wrapper) so it
  can run from a doc-site `prebuild` hook with no shelling out. Possibly a config
  field (`icons: { input, output }`) that the orchestrator runs automatically.
- ~~Better leveraging of tree-shaking~~ (unbundled ESM output, sucrase as peer dep)
- **Migrate CDN-loaded libraries to peer deps** — now that ESM output is unbundled, these can be normal imports (tree-shaken when unused):
  - `<tosi-code>` — replace ace editor with CodeMirror. **Now a green-lit 1.7 effort** (potentially breaking) — also brings first-class tjs in live examples (highlighting + runtime-value autocomplete via tjs-lang's `editors/codemirror` export) and inline-WASM examples (runtime already works — spiked). Plan + viability + effort in [codemirror-tjs-1.7-plan.md](codemirror-tjs-1.7-plan.md). Better touch support is a bonus (ACE is painful on touch devices).
  - `<tosi-b3d>` — `@babylonjs/core` as optional peer dep (currently loads via `scriptTag` from CDN)
  - `<tosi-lottie>` — `lottie-web` as optional peer dep (currently loads via `scriptTag` from CDN)
  - `<tosi-map>` — `mapbox-gl` as optional peer dep (currently loads via `scriptTag`/`styleSheet` from CDN)

## Completed

- ~~Add unit tests for components~~
- ~~Add accessibility (ARIA) attributes to components~~
- ~~xin → tosi rename (all exports, classes, tags, interfaces)~~
- ~~Drop menu support (`popDropMenu`, `hideDisabled`, dynamic `menuItems`)~~
- ~~Drag-and-drop MutationObserver for dynamic drop targets~~
- ~~Agent-based QA using Haltija~~ (`bun run test-browser`)
