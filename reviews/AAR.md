# After-action reports

Short, factual notes per release — `practices/releasing.md` step 10. Three to six bullets:
what surprised us, what the gate caught, what it missed.

**Why this file has to exist**, since it did not for two releases: a per-release review records
facts, but the patterns that matter are only visible *across* releases. The 1.15.0 quarterly
lens had to reconstruct them by hand from seven 20–30KB reports, and the three it found —
`release-check` red three times, pre-bump artifacts twice, wrong diff basis twice — are each
invisible inside any single release. `../tosijs-floorplan/reviews/AAR.md` has been doing this
since its 0.4.0 and its 0.5.0 entry caught a two-release recurrence for exactly this reason.

Entries are backfilled where noted; a backfilled entry is reconstructed from the review record
and the git history, so it is thinner than one written at the time. That is the cost of the
gap, recorded rather than hidden.

---

## 1.14.0 (2026-09-06) — *backfilled 2026-09-20*

- **The gate caught:** a blocker plus five majors in the nine-lens review, including the
  machine-health guard (F5) that became the orphaned-build-process detector.
- **The gate missed:** that `import 'tosijs-ui/doc-browser'` — the line every adoption doc
  prescribes — registered nothing. Two adopters found it independently (#158, #159) *after*
  release. No lens looked at whether a documented import does what it says.
- **Recurrence:** `release-check` red at tag time, first instance of what became a
  three-release pattern.

## 1.14.1 (2026-09-08) — *backfilled 2026-09-20*

- **Shipped:** doc-test-gate integrity — the lane could no longer silently drop a page and
  report green.
- **The gate missed:** the same doc-browser registration defect, still live.
- **Note:** the AAR mandate (`practices/releasing.md` step 10, landed 2026-09-05) was already
  in force for this release and the previous one. Neither wrote an entry, and nothing noticed
  for two weeks — a mandated step with no gate behind it is a suggestion.

## 1.14.2 (2026-09-19) — single-fix patch

- **Shipped:** the doc-browser registration fix, cut from `v1.14.1` rather than `main` so it
  carried none of the in-progress 1.15.0 work.
- **What worked:** the post-publish tarball diff against the tag. All 871 built files were
  byte-identical, which is what it was for — and it incidentally surfaced a gitignored
  `dist/.metadata_never_index` in the tarball. `files` selects `/dist` wholesale and npm
  consults neither `.gitignore` nor `.npmignore` for selected paths, so a repo-reading check
  could not have seen it. The guard is now an assertion on the packed listing.
- **What bit:** the first `npm publish` ran from `main`, where `package.json` still read
  `1.14.1`. The registry refused it. Publishing must happen from the release branch, and that
  is now stated wherever the flow is written down.

## 1.14.3 (2026-09-19) — single-fix patch

- **Shipped:** tjs-lang 0.13.13, so a quoted `test` block stops executing in the host page.
  Two lines plus a lockfile.
- **What we got wrong, and an adopter told us:** we closed #153/#154/#156 at *merge* saying
  "shipping in 1.15.0", then published two patches on top. tjs-lang reasonably read that as
  "fixes are flowing" and checked; they were absent. They had already said so on #154 — *"this
  is closed, but the fix is not in any published version"* — and we kept closing at merge
  anyway. **Change: close an incoming issue when the version carrying it is published, naming
  that version.**
- **Reclassification:** #135 was triaged "not patch material, transpiler bump" and that was
  wrong — it is a correctness fix, and the four lanes exercise the whole corpus through the
  transpiler. Prompted by the reporter saying they were blocked.

## 1.15.0 (2026-09-20)

- **Cost:** four review passes (pre-release, re-review, dx lens, quarterly lens). The two lens
  tiers had never run for this release and produced **five blockers between them**, including
  the silent source-corruption defect below. The argument for skipping them would have been
  that two passes had already run.
- **The finding that justifies the whole exercise:** `save-to-source` still grouped fences with
  the pre-1.15 rule, so with a `:static` fence present the ordinals diverged from
  `insert-examples` and an edit saved over a *different* block. Silently. In-repo exposure was
  nil — our corpus has no `:static` fences — so every test passed and every page rendered
  correctly. It would have corrupted the source files of the first adopter to use the feature
  the release was announcing.
- **One rule, three copies.** `example-policy.ts` was created *this cycle* to be the single
  source of truth for "is this fence a live example". Two copies survived it — `save-to-source`
  and `epub.ts` — and the second was found one commit after fixing the first. The grep that
  finds them is for the **literal six-language set**, not for `isLiveFence`: searching for the
  shared symbol only finds the places already converted.
- **The same defect twice in one release.** Inserting a field between a JSDoc block and its
  declaration strips the comment from the emitted `.d.ts` (F13). It was then *reintroduced
  while being fixed*, by adding a helper between a comment and its function. The guard is now a
  list to extend rather than a bespoke test.
- **Tests that could not fail, three times.** The first M3 test asserted on a global nothing
  had touched, because module-scoped `prism` made `ensureGrammar` short-circuit — both mutants
  survived. A `perl` mutation matched nothing and reported a clean run. `bun test` printed
  "1 error" beside "0 fail" for a missing `afterEach` import. **Mutation-testing every fix is
  what caught all three**; without it each would have shipped as coverage.
- **Recurrence — `release-check` red at tag time, third consecutive release.** The shape is
  documented in CLAUDE.md and it keeps happening because the write-up commit introduces its own
  annotations. Recorded in the practices repo as a worked example this cycle, with the argument
  that it needs a **mechanical** partner rather than more emphasis — three releases of the rule
  being written down is the evidence.
- **The multi-engine Playwright run paid for itself, once.** CI is chromium-only, and running
  all three engines surfaced a defect that capped every Firefox `<tosi-table>` at 10,000 rows:
  `probeMaxElementHeight` asks for a 1e9-pixel element assuming engines clamp, and Firefox
  returns **0** instead — indistinguishable from "no layout to probe", so it fell back to the
  flat cap #82 exists to replace. Present since the feature shipped; verified pre-existing in a
  worktree at v1.14.3 before touching it. Firefox now gets 520,833 rows. **Nothing was broken,
  it was just quietly 52× smaller** — which is exactly why a lane the gate does not run rots
  without anyone noticing.
- **Shape of the whole cycle: one rule, N copies — four times.** The live-fence rule (three
  copies), the fence-info parser, the `language-*` class pattern, and the height probe. The
  duplicate was consistently in a TEST or an adjacent subsystem, where it reads as independent
  verification while being the same assumption written twice. The grep that finds them is for
  the **literal value**, not for the shared symbol.
- **Two patches shipped mid-cycle** (1.14.2, 1.14.3), both cut from tags rather than `main`, so
  adopters were not blocked behind a large release. That worked — and the adopter-facing cost
  was closing issues at *merge* rather than at *publish*, which is now changed.

## 1.15.1 (2026-09-21, published 2026-09-24)

- **The finding came from the aside the reporter said they did not chase.** Point 5 of #142
  ("two failures both say line 114 — may be an artifact of how I built the fence") was a live
  defect in every published version: the user's stack frame was found by *excluding* known
  bundle names, and that list missed `/iife.js?v=<hash>` (the cache-busting stamp defeats the
  `$` anchor) and `hydrate.js` (the bundle adopters actually load). Fixed by identifying the
  frame positively by its `sourceURL` tag. A 1.12.7 fix for a different line-number bug had
  made this one look handled.
- **Mutation testing caught two tests that could not fail.** Fixing both mechanisms meant the
  old fallback also handled the stamped URL, so the positive-identification path had no test
  that distinguished it; `toBeCloseTo`'s half-unit tolerance had no case straddling the
  boundary. Both mutants survived until the cases were added.
- **`release-check` was green at tag time** — the `[note]`-only release commit ended the
  annotation loop, breaking the three-release red streak recorded under 1.15.0.
- **Attribution checked against the source:** the working assumption was that tjs-lang
  reported #142; the RFC's first line names tosijs-3d-ensemble. Corrected before any reply,
  which matters under the 1.14.3 rule (close on publish, naming the version, to the right
  party).
- **Friction:** tag-to-publish took three days and spanned two sessions. The post-publish
  obligations (tarball verify, #142 reply, scoreboard, this entry) were recorded only in the
  ending session's last message and had to be recovered from its transcript.

## 1.15.2 (2026-09-25)

- **Cut to unblock an upstream release.** tjs-lang's own pre-release review found our
  `^0.13.1` peer would ERESOLVE npm consumers the moment 0.14.0 published (#182; the same defect
  as #98, one minor later). We verified against `0.14.0-rc.0` with every lane before widening,
  and shipped the widened range with the pins still on 0.13.13, so the release does not depend
  on the rc. **Recurrence:** a caret on `0.x` has now bitten twice; the fix each time came from
  the upstream side, never from a lane here, because bun resolves what npm rejects.
- **A gate that had been silently skipping caught a four-month-old break.** `release-doctor`'s
  shipped-relative-specifier check had reported SKIP until the practices repo fixed its
  npm-pack parsing the same day. First real run: `bin/docs.ts`, a shipped back-compat shim,
  re-exported from unshipped `src/` and had thrown `Cannot find module` for every installed
  consumer since 2026-06-14. Reproduced against the packed 1.15.1 tarball before fixing.
- **Checking the fix at the boundary found that it was incomplete.** In a packed install the
  shim now loads by path, but its documented bare specifier `'tosijs-ui/bin/docs'` has never
  resolved, because the exports map sends it to `dist/`. The CHANGELOG was rewritten to say so
  instead of claiming the shim "works"; the disposition is in TODO.md.
- **A justification that turned out false was corrected before shipping.** The `.ts`-extension
  change was first commented as being "for Node"; measured, Node 22 refuses to strip types under
  `node_modules` at all. The comment now says what was measured.
- **`release-check` was red once, correctly:** a `[change]` bullet was unwritten and the
  security-surface bins had no heading of their own. Fixed with a `[note]`-only commit; exit 0
  at tag time.

## 1.15.3 (2026-09-26) — first release through the staged-publish workflow

- **The workflow's first run found four defects before anything reached npm**, each a clean
  red before staging: Bun 1.4.0 vs 1.4.2 bundle differently (now pinned in `.bun-version`, and
  local builds refuse a mismatch); `release-doctor`'s "tags ahead of npm" check could never pass
  while publishing (exemption added upstream); doc-site sourcemaps leaked the builder's home
  directory, for adopters too (fixed, tested, in the CHANGELOG); and `repository.url` still
  named the pre-rename `xinjs-ui`, which provenance rejects. **None of the four lanes could have
  found any of them**: each needed a different machine, a different Bun, or the registry.
- **Reproducibility was assumed, not true.** `bun.lock` had been gitignored since 2025-11 with no
  recorded reason; a fresh clone bundled newer CodeMirror and marked 18. It is now committed.
- **The approval came from a phone, four hours after staging.** The 60-minute wait failed and its
  advice ("re-run failed jobs") was wrong, since a re-run starts over. `verify_only` fixes that,
  and its first run found a latent `Argument list too long` in the verification step that a
  full run would have hit after approval. Verified: published shasum identical to the staged
  tarball, provenance attached, smoke test green on the registry's copy.
- **Caught at the release gate, not by any lane:** `sanitize="on"` rendered the markdown
  component's own form example empty (kilpi removes `<form>` and its subtree). That example had
  no assertions; it has one now.
- **Friction:** the unpublished tag moved five times. Fine while nothing is published, but the
  pre-staging checks should run BEFORE tagging next time, as a dry run of the workflow.

## 1.15.4 (2026-09-26) — the staged-publish flow, end to end in one pass

- **The pre-tag dry run earned its place on its first use.** It failed on `main` before any tag
  existed: a false positive in the shared `release-doctor` (a doc comment quoting
  `export * from './model'` read as a re-export). Fixed upstream in the practices repo, the
  second dry run was clean, and the tag was made once and never moved (1.15.3 moved its five
  times).
- **Staged → approved → verified in one run**, approval inside the one-hour window: published
  bytes identical to the staged tarball, `latest` correct, 51 consumer checks on the registry copy.
- **The same false-positive class twice in one day.** My own extensionless-import scan matched
  specifiers in comments (four hits in our dist, one in its own doc comment); release-doctor's
  re-export scan did the same. Mine now uses Bun's parser; release-doctor strips comments (the
  parser drops type-only imports, which a .d.ts scan needs).
- **A doc example found a real bug:** `<tosi-tag-list>`'s documented array `value` threw on render.
  Examples with test blocks keep finding things unit tests don't.
- **Tested the obvious fix before trusting it:** moving tsc's incremental cache out of `dist/`
  would have emptied `dist/` on every second build (883 files). Dropping `--incremental` was the
  fix.

## 1.15.5 (2026-09-26)

- **Routine, which is the point:** dry run on `main` clean, tag made once, staged, approved about
  53 minutes later (inside the one-hour window), verified in the same run. No tag moved, no
  re-run needed.
- **A real-browser-only bug:** `<tosi-menu>` removed its capture-phase shortcut listener without
  the capture flag, so it was never removed. happy-dom removes it regardless (both mutants
  survived the unit tests); a Playwright spec catches it in all three engines.
- **A test that raced, caught by repetition:** the select-shortcut spec failed about one run in
  three because `change` arrives a frame after `value`. `--repeat-each=10` exposed it before it
  shipped as a flake.
- **Also this cycle, outside the release:** TODO.md pruned (199 items → 39), nine stale issues
  closed with versions, and tosijs-ui onboarded onto the virta board (88 open tasks).

## 1.16.0 (2026-09-28) — a breaking minor, four review passes

- **The review earned its cost.** Pass 1 (pre-minor) found a security bypass of the release's
  headline change: sanitized `<tosi-md>` kept custom elements, so a nested
  `<tosi-md sanitize="off">` rendered raw HTML. Fixed as a class (custom elements unwrapped unless
  allowed), not an instance. It also found that `release-check` had been matching against the
  whole CHANGELOG, a false green that hid a missing #191 entry.
- **Fixes introduced their own findings, twice.** Pass 2 found the new `allowedElements` was a
  plain field (not reactive, so the documented migration did nothing) and that the corrected gate
  now caught my own unwritten entry. Pass 4 found the `tosijs-format` rationale was wrong: a
  Prettier 2 config CAN exclude markdown (`requirePragma`), which I had repeated from the issue
  without testing. Verified, corrected in the bin, CHANGELOG and practices.
- **CI never ran ESLint.** The tosijs 1.10 migration left 32 unused imports that only surfaced when
  `tosijs-format --check` put ESLint in CI. The migration had passed every lane.
- **Mutation testing and "measure before shipping" caught two of my own premises:** a
  "vendored package inlined" build check that Bun already made impossible (deleted, not shipped),
  and a claim that tosijs 1.10 types element-creator arguments (it types instances).
- **Friction:** the one-hour approval wait failed red and emailed a CI failure while the release
  was fine (approval came later; 2FA had been skipped the first time). The template now ends that
  case green with a "run verify_only" summary. A near miss: uncommitted work stashed across a
  build of generated files; recovered, and committed before comparisons since.

## 1.16.1 (2026-09-29) — two features as a patch, one BLOCK and a scoped re-review

- **The gate caught two regressions in code written that day.** The pre-tag review (pre-minor
  tier, run on a patch because the skill says patches aren't exempt) found an uppercase fence
  becoming live, losing its content and shifting save-to-source ordinals, and a registered `tjs`
  override bypassed by the build-time bake on deployed sites. Both came from a SECOND copy of a
  rule (the `language-*` class grammar, case handling), four days after 1.15's lesson on exactly
  that; the class fix single-sourced it as `languageOfClass`. The scoped re-review (remediation
  diff only) returned GO_WITH_FOLLOWUPS with two CHANGELOG overclaims.
- **The doc tests caught what unit tests couldn't, twice.** The new emoji-table example exposed
  `textTest` being stored as an attribute (tosijs sets creator props as properties only over a
  non-`undefined` default); the unit tests assigned the property directly and passed. And the
  maintainer, using the example over the tunnel, found the hints closing instantly after a clear:
  every document scroll removes a float. Filed on tosijs's board; recorded in CLAUDE.md.
- **Missed until review:** `tsconfig.tests.json` isn't in my usual typecheck (release-doctor
  caught a type error in a new test file), and the iife delta (+2.9 kB gzip) went unrecorded for
  the second release running (board #2445).
- **My own slip:** a comment warning against `${{ inputs.tag }}` in a `run:` block contained the
  expression itself, which Actions substitutes inside comments too. Caught on re-read before
  anything ran; fixed in the practices template.
- **Process:** version by narrative, not letter — the maintainer chose a patch for additive work,
  which CLAUDE.md's rule permits for the dialect registry and strains for a new component. Lane
  times at load ~20: unit 12s, Playwright 1.6m, consumer and haltija a few minutes each.

## 1.16.2 (2026-10-01) — console, spinner, carousel; two GO_WITH_FOLLOWUPS passes

- **The review found a regression of my own making that every lane missed:** injecting the
  example console as a parameter made any example declaring its own `console` a SyntaxError.
  Nothing in this repo does that, so no test could have failed. The first fix was a regex; the
  scoped re-review showed it mis-read nested declarations, comments and destructuring. The
  general fix let the engine decide (build, and on a SyntaxError build again without the
  injected console). Lesson, again: when a rule can be asked of the runtime, don't restate it.
- **A Playwright test caught a design error in a fix:** 44px-wide hit areas on dots 16px apart
  made each dot's area cover its neighbour's centre, so a tap dead on dot 1 selected dot 2.
  The test checked every dot, not one; checking one would have passed.
- **The formatter's first two cuts were wrong in ways only adversarial review found:** a
  WeakSet marked any repeated value `[Circular]`; a replacer tracking ancestry by holder lost it
  at the first Map wrapper. Converting to plain data with an explicit ancestor list fixed both.
- **External change mid-release:** new `brace-expansion` advisories (dev-only, high) would have
  failed every build; the existing override's floor was raised. The audit gate did its job.
- **Process:** the maintainer ruled that switch-off-able UI appearing only where there was none
  is a patch; recorded in CLAUDE.md. Test lanes this release: unit ~13s (the spinner tests add
  ~2s of real timers, board #2504), Playwright 1.6m, consumer and haltija a few minutes each.

## 1.16.3 (2026-10-01) — first full run of the split publish workflow; a security BLOCK caught in it

- **The review caught a security regression in a template I had copied verbatim:** the reworked
  publish.yml uploaded the tarball after three post-Pack steps running unpinned code, and its
  stage job never compared the bytes it staged with Pack's hash, so a swap would have been
  staged and then "verified" as identical. Fixed at the source (practices template 890c0fc) and
  filed as a re-copy task for every repo. Copying "unchanged" from a template is not a review.
- **And a UX regression in my own #2460 fix:** the new anchor-scoped scroll rule left submenus
  on screen (their anchor lives in the parent float, mounted on <body>). The class fix follows
  chains of floats; a test fails without it.
- **The new workflow's first full run went green**: build (no credential), stage (integrity
  check, npm pinned), verify (published bytes = staged bytes, registry smoke test). Approval
  took ~10 minutes to show in the registry; the 60-minute wait absorbed it.
- **Process miss, found because the maintainer asked:** for 1.16.0–1.16.2 I hand-wrote the
  scoreboard's Version and Activity cells. Since 2026-09-26 a board project's row is
  tool-generated (Version) and points at the board (Activity). CLAUDE.md's step now says so.
- **Not verified:** #2460 on a real iPhone (emulation has no URL bar). Still open on the board.

## 1.16.4 (2026-10-03) — console as a tab with a REPL; three fixes found by using the site

- **The maintainer found all three shipped defects by using the live site over the tunnel**, not
  by any lane: a test-only example blank on deployed sites (tests off by default off localhost,
  and every lane runs on localhost), the doc nav search with no clear button in Firefox, and a
  demo whose Docs tab was on a nested example nobody would open. A lane with tests OFF now covers
  the first. "Run it as a reader would" belongs beside the four lanes.
- **The REPL's first design failed its first real use**: scope capture only saw runs made with
  the panel open, so `words` was undefined. A direct-eval closure prepended to the example
  reached the real scope; the review then showed that closure cancelled `'use strict'` and
  slowed hot examples 1.5–2.6x for every reader, so it is now installed only on first REPL use.
- **A rework deleted styles it didn't own**: removing the console panel's CSS block took the
  spinner's rules (nested inside it) with it. The real-browser spinner test from #2504 caught it.
- **Verification was owed once again:** approval came after the workflow's 60-minute wait, the
  run ended green with "verification owed", and `verify_only` completed it.
- Lanes: unit 1663 tests in ~13s; Playwright 386 in ~1.7m; consumer and haltija a few minutes.

## 1.16.5 (2026-10-04) — iPhone fixes; a "verified" fix that wasn't, caught by review

- **A check only proves what it exercises.** The maintainer verified the menu re-fit on an
  iPhone, and the unit test was green — while a shadowed `position` (a 2023 destructure inside
  positionFloat) made every re-fit BLANK open floats. The test asserted only the computed room,
  which is right whatever the coordinates; the device check didn't trigger the path. The
  pre-tag review found it by reading the code. Fix + tests that fail without it, the type
  narrowed so the compiler rejects the shape, and a re-check on the device after the fix.
- **The class is a lint rule, deferred honestly:** `@typescript-eslint/no-shadow` reports 69
  shadows repo-wide; filed with the plan rather than patched past in a release.
- **The first Playwright run went red under load** (load average ~15 while the review agents
  ran): 9 Firefox/WebKit timing failures, all green in isolation and in a full re-run at load
  ~4. Run the lanes and the review agents apart, or expect noise.
- **tosijs 1.10.7's long-list advice found a real bug on the way:** `tosiTable({ pinnedTopRows })`
  was ignored from the creator (the same "undefined getter → attribute" trap as `textTest`).
  Two more instances of the class are on the board; the fix belongs in tosijs (#2464).
- Lanes: unit 1674 tests ~13s; Playwright 399 ~1.8m at normal load; consumer and haltija a few
  minutes each.

## 1.16.6 (2026-10-04) — one history fix; the review widened it to the router

- **The reported bug did not reproduce; a neighbour did.** #174's per-link double push (ensemble
  on 1.14.1) measured one entry per click on 1.16.4 with the same deep import. Measuring
  ui.tosijs.net as the control turned up the real defect: a link to the page already showing
  pushed a duplicate entry, the same "Back looks dead" symptom.
- **The pre-tag review earned its cost on a 10-line fix:** it found the same defect in
  `router.ts` `navigate()` and a hash case the first fix got wrong. Both fixed before tagging,
  each with a test that fails with the fix reverted. The re-review's two minors (identity
  coverage, one home for the policy) went to the board rather than another patch round.
- **A lane passed while recording 7 of 19 pages:** `test-browser` reported 41 tests (vs 76) and
  exited 0. An immediate re-run gave 76. Filed as a fail-open lane on the board; until fixed,
  read the count, not just the tick.
- **Approval landed after the 60-minute wait again:** `verify` skipped; `verify_only=true`
  ran green.

## 1.16.7 (2026-10-06) — markdown copies of pages, `strict` builds; a BLOCK on the feature's own gate

- **Trigger was an LLM, not a person:** Gemini's fetcher reported "no `<body>`" for a page whose
  whole article is static HTML (verified raw, hydrated, and through Readability and Jina). Not
  reproducible or fixable from here, so the answer was to hand such readers markdown:
  `/slug/index.md` beside every page. Found on the way: `<meta charset>` at byte ~1550.
- **The pre-tag review BLOCKed on the release's own new gate.** `strict` decided "has live
  examples" with a four-language regex I had seen and left, so it could pass with inert
  examples or fail a prose site. Fixed as a class (one helper for every build-side asker).
- **The fix for the blocker introduced two regressions**, caught by the scoped re-review: a
  hand-written fence scanner that found nothing in CRLF files, and a REPL path that threw
  where nothing printed it. Second fix used marked's own lexer instead of a better scanner.
  No third review: Tier 0 plus the full lanes.
- **`release-check` did its job at the last step:** four `[fix]` bullets from the remediation
  commits were not in the CHANGELOG. Fixes to never-shipped code should be `[note]`.
- **Lanes:** unit 1701 tests 12.4s; build 3.4s; Playwright 405 in 1.8m (one WebKit title flake
  under full load, 12/12 in isolation); consumer 54 checks; test-browser 76 over 18 of 19
  pages, the fail-open lane fixed straight after as #2874.
- **Approval lapsed the 60-minute wait a third time;** `verify_only=true` green.

## 1.16.8 (2026-10-07) — a doc-test lane that cannot pass on missing results; the fix was itself BLOCKed

- **Scope:** #2874 (a page that reports nothing, or times out, is a recorded failure;
  `testReportVerdict` is the one pass/fail rule) and #210 items 1 to 3 (tjs inline tests run,
  `ts` examples transpile without a dialect, logged output shows when the preview is empty).
  Item 5 waits on tjs-lang exporting `stripExports` (board #3109).
- **The pre-tag review BLOCKed the fail-open fix for failing open two more ways:** a page that
  timed out after partial results still passed, and the page a run starts on kept only its last
  example's results. Three code paths added up a page three ways; fixed as a class with one
  tally and one way to close a page.
- **The scoped re-review found a regression in the remediation** (the off-localhost test toggle
  read a stale current page). Fixed; that path is covered by no lane and still wants a check
  over the tunnel.
- **A new test raced hydration** (`__docTestResults` read before it existed); fixed with a wait
  rather than a retry.
- **Lanes:** unit 1718 tests 12.0s; Playwright 419 in 2.9m; consumer 54 checks; test-browser 76
  over 18 of 18 pages, the first run where the page count is asserted rather than printed.
- **Approval lapsed the 60-minute wait a fourth time;** `verify_only=true` green. Four in a row
  says the wait is the wrong length for how approval actually happens.

## 1.16.9 (2026-10-08) — one source, several outputs; an inset that could read `.env`

- **Scope:** two asks from tjs-lang for its book. GitHub #217: per-volume `placement`, text
  insets, conditional text (`only`: `site` or `book`). GitHub #216: an example that opens with
  its code or console showing inline, and a console that evaluates in the example's dialect.
  Also the README now leads the nav and the ePub (the maintainer found "Adopting the doc
  system" on the ePub's first page).
- **The pre-tag review BLOCKed on the inset's file form:** it read any file in the project
  (`.env` included) and published hidden and draft docs. Fixed by making a file inset a
  fragment only (`_name.md`, in a directory doc extraction walked).
- **The scoped re-review found the fix still too loose,** because the gate kept a second copy
  of the ignore rule: a file doc path made the project a root, a path-form ignore was not
  honoured, and a symlink was judged by the link's name. Second fix asks extraction which
  directories it walked and checks the real path. No third review: Tier 0 plus the full lanes.
- **CI failed once on lint** in a new test file. `bun format` had been run with its output
  discarded, which hid the ESLint errors; `bun run format-check` and its exit code are the gate.
- **`release-check` caught a `[fix]` bullet on a markdown-only commit;** retagged `[note]`.
- **Lanes:** unit 1759 tests; Playwright 428 passed and one WebKit failure (a sub-pixel
  rounding in a new test, fixed, 9/9 in the three browsers); consumer 54 checks; test-browser
  77 over 18 pages.
- **Not shipped, by design:** the generated JS per console line (#216 item 3), an ePub
  rendering of the inline views, per-volume `only` targets. Review follow-ups are board #3133;
  tjs-lang #3134 asks for a separable runtime prelude so a console line keeps tjs values.
- **Approval lapsed the 60-minute wait a fifth time;** `verify_only=true` green.

## 1.16.10 (2026-10-10) — Print opens with the book cover; the name was derived twice again

- **Scope:** the maintainer noticed Print as PDF had no cover. The ePub build now writes its
  cover beside the book, `/epub-volumes.json` lists it, and Print opens with it;
  `epub: { printCover: false }` opts out. Illustrating the ePub and Print from live examples
  was scoped and filed as board #3146, not built.
- **The pre-tag review (GO with follow-ups) found the cover filename derived in two places
  that disagreed** for a WebP cover, a missing cover file and a build with no rasterizer. The
  same class as 1.16.9's second copy of the ignore rule. Fixed by reading the name back from
  the output dir after the ePubs are built; nothing predicts it.
- **The scoped re-review found the fix made Print wait on an untimed fetch,** so a stalled
  connection left a blank popup. Bounded at 3s. It also caught that a volume named "cover"
  writes `<stem>-cover.epub`, which the read-back accepted as a cover image.
- **Dropping the inline `onerror`** came from the review's completeness gaps: a CSP would
  block it in the popup. Print loads the image before using it.
- **Lanes:** unit 1769 tests; Playwright 432 in 3.1m; consumer 54 checks; test-browser 77
  over 18 pages. CI and the dry run green on the tagged commit at the first attempt.
- **Approval landed inside the wait this time;** the run's own verify job was green.
- **Open on board #3151:** Print pagination with the cover is checked only in Chromium; a
  corpus with no default volume prints without a cover; "Download ePub" still derives its URL.

## 1.16.11 (2026-10-11) — heading ids, a test result on show; my own fix hung the build

- **Scope:** every rendered heading gets a GitHub-style `id` and the build warns on a dead
  in-page link (board #3178); inline example views show one test status line, always run
  their tests, and hide empty tabs; a wrapped sidebar title keeps its arrow (GitHub #219);
  "Download ePub" follows what the build wrote (GitHub #218).
- **The pre-tag review (GO with follow-ups) found a status line that led nowhere:** on a
  deployed site a failing inline `tjs` test showed, but its tab was created only at setup,
  before the first run finished. The tab is now created when results arrive.
- **The scoped re-review BLOCKed on a fix made for the first review.** Reserving `example-N`
  ids inside `HeadingIds.next` looped forever on a second heading titled "Example", hanging
  the build and the reader's tab. The reservation was removed, not patched; the overlap it
  was meant to prevent is a build-warning task on board #3226. A second scoped re-review
  cleared it.
- **The full Playwright lane caught what the review did not:** the docs example's own test
  called `showInline`, and inline-view tests now run for every reader, so CodeMirror loaded
  at page load (`tests/editor-defer.pw.ts`). A test inside an inline-view example is now
  reader-path code.
- **`release-check` exited 1 once** on a `[change]` bullet the CHANGELOG had worded
  differently; reworded.
- **Shipped as a patch with three `[change]` bullets** (inset anchors match page ids, inline
  views always run tests, empty tabs hidden). All three touch only surfaces new in 1.16.9;
  the maintainer approved it as a patch on 2026-10-11.
- **Lanes:** unit 1785 tests; Playwright 462 passed, 15 skipped; consumer 54 checks;
  test-browser 77 over 18 pages. CI and the dry run green on the tagged commit.
- **Approval lapsed the 60-minute wait** (staged 2026-10-10, approved the next day);
  `verify_only=true` run for the verification.
- **Open on board #3226:** a heading can share an id with a live example; heading ids repeat
  across chapters in Print; the hang regression test would hang, not fail.

## 1.16.12 (2026-10-12)

- **Shipped:** table row detail (`rowDetail`, `expander` column, GitHub #220) and curated
  schema forms (`fields` map, GitHub #221). Published and verified by a `verify_only` run.
- **Review:** two rounds, both GO_WITH_FOLLOWUPS. Round one found four majors (a function
  editor dropping an edit after an outside change, a press in a detail resizing a column, the
  outer table rewriting a nested table's selection marks and sticky offsets, missing-required
  errors on editor fields going to the hidden list). Round two found one major introduced by
  a round-one fix: the unknown-path guard refused editors on real `unsupported` properties.
- **The published 1.16.12 is the FIRST cut (ff4a976f4), not the re-cut.** The maintainer
  asked for a re-cut with better doc examples; the tag was moved to 9fd7ed192 and the stage
  step failed with `409 Cannot stage previously published version`, because the first cut
  was still staged and held the version. The staged first cut was then approved. The tag
  was moved back to ff4a976f4 so it matches the registry; the tarball's `dist/` is
  byte-identical to that commit.
- **A staged version holds its number.** Re-cutting after staging needs the staged copy
  rejected on npmjs.com first, or a new version number. Moving the tag is not enough.
- **The improved examples are on main and the doc site, not in the 1.16.12 package.** The
  difference is two doc comments (`src/data-table.ts`, `src/schema-form.ts`); no library
  code differs.
- **Firefox delays frames in the background doc-test iframe:** an inline test that waited a
  fixed 100ms for a re-render failed there and passed in Chromium. It now polls.
- **Lanes (first cut):** unit 1795; Playwright 498 passed, 15 skipped; consumer 54 checks;
  test-browser 82 over 18 pages. An intermittent doc-test failure seen three times during
  development was never identified; `off-localhost-tests.pw.ts` now names failing tests.
- **Open:** board #3229 (follow-ups, including `<tosi-form schema>` not built), tosijs
  #3230 (variable-height list gaps), #2454 (`fields` versus `x-tosi` annotations).

## 1.16.13 (2026-10-13)

- **Shipped:** a documentation-only patch carrying the improved row detail and curated form
  examples into the package's doc comments and `llms.txt`. No library code changed since
  1.16.12. Published and verified by a `verify_only` run.
- **No multi-lens review:** the diff since v1.16.12 was two doc comments and their inline
  tests.
- **Lanes:** unit 1795; Playwright 498 passed, 15 skipped; consumer 54 checks; test-browser
  83 over 18 pages. CI and the dry run green on the tagged commit.
- **Approval lapsed the 60-minute wait** (staged 2026-10-12, approved the next day), so the
  run's verify job was skipped and `verify_only=true` did the verification.

## 1.16.14 (2026-10-13)

- **Shipped:** snowfox's second round on GitHub #221: curation inside arrays and unions
  (nested `fields`), sections, and `proposals` for review screens. Published; the run's own
  verify job passed.
- **Review:** two rounds, both GO_WITH_FOLLOWUPS, no blocker. Round one found three majors,
  all in proposals: a non-string `reason`/`source` was handed to the element creator as
  properties (`innerHTML`), accepting a whole-array proposal left the old rows, and a
  proposal on a visible panel was listed as not shown. Round two found that the title
  hardening covered property titles and missed `anyOf`/`oneOf` branch titles.
- **The same hazard was fixed call site by call site and one site was missed.** tosijs reads
  an object child as element properties (tosijs#43). `titleOf` in `fields.ts` is now the one
  place a schema title becomes a label; `span(item.caption)` in `src/menu.ts` has the same
  shape and is on board #3240.
- **An edit script deleted five class members** (`schema`, `value`, `validate`,
  `refreshErrors`, `handleFieldInput`) by slicing between two anchors that were not adjacent.
  `tsc` caught it at once and the block was restored from HEAD.
- **A pre-existing defect surfaced:** `form.value = …` with a different number of array items
  left the old rows. Fixed with `syncArrays`.
- **The consumer lane's tarball ceiling tripped on ordinary growth** (2.99MB at 1.16.12,
  3.01MB now) and was raised from 3MB to 3.5MB with the reason recorded beside it.
- **Chromium reports a box for a button inside a closed `<details>`** and silently refuses
  to focus it, so the focus fallback now tries candidates until one takes focus.
- **Lanes:** unit 1805; Playwright 558 passed, 15 skipped; consumer 54 checks; test-browser
  85 over 18 pages. CI and the dry run green on the tagged commit.
- **Open:** board #3240 (deferrals, and the maintainer's ruling on shipping the
  `FieldCuration` type widening in a patch); #221 left open for snowfox to confirm.

## 1.16.15 (2026-10-13)

- **Shipped:** board #3248, from tosijs's upgrade to 1.16.13: `restampSite` (re-stamp and
  check a hydration bundle replaced after `buildSite`), a duplicate-CodeMirror check, an
  `llms.txt` example drawn from the site being built, and a reworded tsc-import warning.
  Published; the run's own verify job passed.
- **Review:** two rounds, both GO_WITH_FOLLOWUPS, no blocker or major. Round one: ten
  minors, among them `restampSite` taking its stamp from prose and writing pages before a
  strict check could refuse. Round two: six minors, all fixed.
- **Two new tests held nothing.** Their `expect().rejects` were not awaited, and a third
  such line had been in `build-stamp.test.ts` for some time. No lint rule catches it; on
  board #3253.
- **An edit that looked like the fix was not.** Limiting the tsc-import warning to files
  reachable from `package.json` entries would not have helped tosijs (tsc emits its
  `dist/index.js` too), and was backed out for a reworded warning after reading tosijs's
  `tsconfig.build.json`. Reading the reporter's config first would have saved the detour.
- **A scripted edit left a stray brace** by matching `    }\n` inside `      }\n`; `tsc`
  caught it. Second anchor mistake in two releases.
- **Verified at the boundary on a copy:** the new code was run against a scratch copy of
  tosijs's built `docs/` and its real install. tosijs has still to confirm at its own end.
- **Flakes:** `[webkit]` proposal keyboard test read the value before the key's click
  landed (hardened, 100 repeats green); `[firefox] entry-once.pw.ts` failed once in a full
  run with the error not captured, cause unknown.
- **Lanes:** unit 1823; Playwright 558 passed, 15 skipped; consumer 55 checks; test-browser
  85 over 18 pages. CI and the dry run green on the tagged commit.
- **Open:** board #3253 (deferrals); #3248 awaiting tosijs's confirmation.

## 1.16.16 (2026-10-13)

- **Shipped:** GitHub #216 item 3 (a console line's own value and its JavaScript, from a
  transform's `prelude` / `body`), #210 item 5 (`export` removed from `tjs` and `ts`
  examples via tjs-lang's `stripExports`), the tjs-lang peer range widened to admit the
  0.14 release candidates, and the dev-server paragraph removed from `llms.txt` (the
  maintainer's ruling). Published and verified; tag `06b322011`.
- **The first review BLOCKed** on two things: the build check stripped `export` for `tjs`
  but not `ts` (a second transpile route that the fix had not reached), and `release-check`
  was red on wording. It also found the notes pointing adopters at a tjs-lang the peer
  range refused under npm.
- **A lane failure found a defect older than the release.** `off-localhost-tests.pw.ts`
  failed on the release commit and then 2 runs in 5 alone. Cause: a run replaced by a newer
  one went on to run its tests against a detached preview and never returned. The scoped
  review of that fix found the neighbouring case (replaced DURING its tests, writing stale
  results), also fixed. Two releases earlier a failure of this kind was recorded as a flake
  of unknown cause.
- **The doc-test count fell 85 → 83** after the fix. Compared by test name against the
  previous commit: two tests had been recorded twice. A falling count was checked, not
  assumed benign.
- **Mistakes in the work:** `git checkout <file>` to undo a mutation reverted an
  uncommitted fix along with it (redone; mutations are now undone from a saved copy); a
  test's stand-in setup ended in a declaration where the real one ends in an assignment,
  so its mutation check passed while holding nothing; `shapeTjsOutput(…, undefined)` meant
  "use the default", not "none", and only failed once the real tjs-lang was installed.
- **Verified against the real dependency by swapping it in:** rc.5 installed temporarily,
  the new tests on three browsers and the whole Chromium lane, then the pin restored.
- **Lanes (final tree):** unit 1835; Playwright 561 passed, 24 skipped; consumer 55 checks;
  test-browser 83 over 18 pages. CI and the dry run green on the tagged commit.
- **Open:** board #3268 (deferrals), #3272 (#210 item 7); #216 and #210 await tjs-lang.

## 1.16.17 (2026-10-13)

- **Shipped:** tjs-lang pinned to 0.14.0-rc.5 (devDependency and `TJS_VERSION`), the
  maintainer's call. Published and verified; tag `1604bece8`.
- **The review BLOCKed** on three things: `release-check` red on wording (the second
  release running it was red at review time; run it BEFORE requesting the review), a Docs
  tab reading "No documentation available" on every `tjs` example that declares no
  function, and notes that did not say what tjs-lang 0.14 refuses or how to stay on 0.13.13.
- **The patch-versus-minor ruling was recorded too grudgingly, then corrected.** The first
  wording treated the refusals as a cost against the 1.16.2 test. The maintainer's point:
  every refusal is towards correctness and arrives with 0.14 final regardless. `CLAUDE.md`
  now records that reasoning as the test.
- **Approval landed after the 60-minute wait**, so the run ended with verify skipped;
  `verify_only` run 38460390965 is the green verification.
- **Lanes (final tree):** unit 1835; Playwright 573 passed, 15 skipped; consumer 55 checks;
  test-browser 83 over 18 pages. CI and the dry run green on the tagged commit.
- **Open:** board #3268 (deferrals, including the revisit at rc.6 / 0.14 final); #216 and
  #210 await tjs-lang.

## 1.16.18 (2026-10-14)

- **Shipped:** GitHub #224 (filed by tosijs-virta): a `defineIcons` name for a stacked
  composition drew the placeholder square, including the icons page's own documented
  `cloudSync` example, in every version since composites shipped. A redirect's target now
  goes through the whole pipeline; a named composite keeps its name in `data-icon`; cycles
  are detected by a revisited name rather than a ten-hop limit. Published and verified
  (verify-only run 38608599799; approval landed after the 60-minute wait).
- **The review BLOCKed on my own test.** The new live example asserted 3 composites and
  found 4, because a spin layer nests a composite of its own. Unit tests counted SVGs under
  one icon; only the doc-test lane saw the container. Playwright had already failed on it.
- **A hollow test surfaced on the way:** the known-icons test listed `message`, which is not
  an icon, and passed because the placeholder is an SVGElement too.
- **Found by the reviewers, not by me:** a ten-hop chain that ends in a drawing reported as a
  cycle, and the iconSvg gap (filed #3294, then built as 1.16.19 at the maintainer's ask).
- **Lanes (final tree):** unit 1840; Playwright 573 passed, 15 skipped; consumer 55;
  test-browser 84 over 18 pages.

## 1.16.19 (2026-10-14)

- **Shipped:** `iconSvg()` resolves the 27 built-in rotated/flipped icons it silently
  dropped, and throws (saying why) for a name the renderer would draw but that is not one
  SVG; an unknown name still returns `undefined`. The maintainer asked for "an error message
  at minimum" and ruled the throw a patch. Published and verified in run 38609116868.
- **Three review rounds, and the pattern was the same each time: a second copy of a grammar
  the renderer owns.** Round one: my own suffix parser read `edit2_90r` as -90°. Round two:
  the fix guessed rules from capital letters, so `redLock` threw. Round three: resolution
  order differed for `checkCircle90r`. The end state shares both grammars with the renderer
  (`icon-suffixes.ts`, `icon-rules.ts`), and CLAUDE.md names the single owner.
- **CI caught a test-order leak the lanes could not:** `icons.test.ts` left stand-in icons in
  the shared map, and only CI's file order put `icon-svg.test.ts` after it. Reproduced with
  a probe file sorted after it; the file now restores the map.
- **Process slip:** `release-check` was run after pushing the release commit, and was red on
  wording for the third release running. Run it before any push.
- **Pixel parity is now a test**, not a claim: Playwright compares iconSvg markup with the
  renderer in three browsers, with asymmetric controls for rotation, sign and flip axis.
- **Lanes (final tree):** unit 1848; Playwright 576 passed, 15 skipped; consumer 55;
  test-browser 84 over 18 pages. **Open:** #3294 (alias in the missing-target warning),
  #3295 (rule vs suffix order, maintainer's call).

## 1.16.20 (2026-10-15)

- **The gate missed six blank examples for months, all green in every lane.** The maintainer
  saw the table's Column Width demo as an empty rectangle. An example that runs without error
  and has no test cannot fail, so `tests/examples-show-something.pw.ts` now fails on any live
  example that draws nothing. Its first cut passed the blank table (an empty component with a
  grey background counted as drawn); the control run against the old tree is what showed it.
- **What the new spec cannot see:** a control beside an empty view. Discounting controls
  flagged sixteen legitimate button-only demos, so that case needs its own inline test, as
  the router page now has.
- **The review caught:** `defineIcons` warning on overrides of existing names (M1), and the
  router page's later examples taking the shared router from the first (M2). Both were fixed
  with checks that fail on the old code; follow-ups are on board #3332.
- **Process slip:** test-consumer was run alongside Playwright and failed because the dev server
  rebuilt `dist/` under it. Run the lanes one after another.
- **Lanes:** unit 1851; Playwright 783 in three browsers; consumer 55; haltija 86. Approval
  came after the 60-minute window, so verification ran as a separate `verify_only` run (green).
  **Open:** #3326 (drop tosi-table's scrollTop loop), blocked on tosijs #3333 (Firefox snaps
  back after a large jump with focus in a row, on 1.10.9).

## 1.16.21 (2026-10-16)

- **An upstream "bug" was our spec.** tosijs #3333 (Firefox snapping back after a large jump)
  was Firefox's pending caret scroll after `fill()`, overriding a `scrollTop` written in the
  same task. tosijs diagnosed it; the control here was 11/24 failures without a frame between
  typing and jumping, 24/24 passes with one. Filing with the spec attached is what let them
  find it in one pass.
- **Deleting a workaround needed a proof the test still guards it.** With the loop gone, "the
  toggled row keeps its place" fails on tosijs 1.10.7 in all three browsers, which is why the
  peer floor moved to `^1.10.9` (patch ruling recorded in CLAUDE.md).
- **Lane sequencing, again:** `test-browser` started before Playwright's 8799 server had exited
  and refused on the build lock. Serial lanes are not enough; the previous lane's server must
  be gone. Reran clean: 86 over 19 pages.
- **Flake:** `entry-once.pw.ts` failed once in Firefox (known, #3253), then 20/20.
- **Lanes:** unit 1851; Playwright 782 + the flake; consumer 55; haltija 86. Approval came
  after the window again; `verify_only` run 38855963840 green.

## 1.16.22 (2026-10-16)

- **A content audit found what every lane had passed.** One agent reading every page against
  the code found 37 problems: the naturalCompare example printed the sort it warns against
  (not exported from the root), and two pages taught a CLI that does not exist. Lanes check
  that examples run, not that prose is true. A docs pass per few releases is worth its cost.
- **A fix shipped its own defect, and the review caught it.** The bare-page-name link warning
  would have failed `strict` builds on the root page, where such links work. Cleared by a test
  that fails with the fix reverted.
- **Two red e2e tests, neither a regression of the code under test.** The nav regrouping hid
  a link a spec clicked; and a schema-form focus test failed ~half the runs in WebKit on
  1.16.21 too, because the page's own inline test moved focus mid-assertion. Specs that drive
  a doc page should turn page tests off; two of three schema-form specs did not.
- **Probe before you patch.** My first fix for that flake (skip read-only controls) changed
  nothing: the focused input was not in the form under test at all. One probe of
  `document.activeElement` found it.
- **trustLan verified at the boundary**, against a real dev server from this machine's LAN
  address (off 403, on 200, proxied and cross-site refused); handler-level tests are #3346.
- **Lanes:** unit 1867; Playwright 800 + fixes; consumer 55; haltija 87 over 20 pages.
  Approved inside the window; publish run 38894262486 verified green.

## 1.16.23 (2026-10-16)

- **The new syntax collided with its own neighbours.** `:` was chosen because no icon name
  used it, and I fixed the composition demo's `caption:icon` split. I did not look for the
  same grammar in shipped components. The review found it in `<tosi-select>` options and
  `<tosi-segmented>` choices/other, where `done=Done:check:square` drew the plain check. When
  adding a character to a grammar, grep for every place that already splits on it.
- **Fixed with one owner, not three edits.** `src/caption-icon.ts` splits at the first colon
  for both components; the new tests fail with the fix reverted.
- **An unverified nit was real.** `defineIcons({'check:x': …})` silently beat the rule the
  docs said always applies. It now warns, and the docs say the definition wins.
- **Approval landed after the 60-minute window** ("verification owed"); the verify-only run
  38934436297 was green.
- **Lanes:** unit 1874; Playwright 801 passed, 15 skipped; consumer 55; haltija 87 over 20 pages. Review
  always-on/fast: GO_WITH_FOLLOWUPS, both findings fixed before the tag.

## 1.16.24 (2026-10-16)

- **A flake I explained wrongly.** WebKit's `page-layout.pw.ts` timed out on `goto('/')` in
  the release run. It passed 115 of 115 when repeated alone, so I called it load contention.
  The real cause: the home page carries the README's badges (badge.fury.io,
  data.jsdelivr.com) and Google Fonts, and `goto` waits for `load`, which waits for them.
  Hanging the badge host reproduced it on all three engines. Repeating the test only proved
  the badge host was up at the time. Before blaming load, check for third-party servers.
- **Fixed after the release** (test-only, no version): `tests/fixtures.ts` refuses
  third-party images, fonts and stylesheets for every spec, and ESLint refuses
  `@playwright/test` imports in `tests/*.pw.ts`. Specs that make their own contexts call
  `blockThirdPartyPaint` themselves.
- **The fix found a Playwright trap.** In Chromium (Playwright 1.63), any route on an opener
  stalls every request from an `about:blank` popup it opens. The Print popup never asked for
  its cover. `print-cover.pw.ts` drops the routes before opening it.
- **The review's findings were all fixed before the tag**: bounded rule chains, the Save to
  source probe on connect, a quoted `trustLan` record.
- **Approval landed after the 60-minute window** again; the verify-only run 39009945707 was
  green.
- **Lanes:** unit 1889; Playwright 810 passed and 17 skipped, with the one WebKit flake above
  (811 passed with the fixture); consumer 55; haltija 87 over 20 pages.

## 1.16.25 (2026-10-17)

- **Refusing was the wrong default for the fixture.** 1.16.24's `tests/fixtures.ts` refused
  third-party stylesheets, so `via-tag`'s Quill example, which waits for a stylesheet's
  `onload`, drew nothing in Chromium. The fixture now answers instead (a 1x1 image, empty
  CSS) and caches version-pinned CDN scripts. When stubbing a resource, answer it; a refusal
  changes what the page does, not just how fast.
- **Faster tests exposed a race.** The two #119 page-layout tests read layout once, right
  after `customElements.get`. Once Google Fonts stopped holding up `load`, they ran before
  hydration and failed every time (bisected with worktrees: green at v1.16.24). They poll now.
- **The `home` e2e found an older defect.** The dev server's SPA fallback served the root
  page at a deeper URL, so its relative script links 404'd. With `home` set, readers saw the
  home doc. My first fix, a `<base>` tag, sent in-page `#` links to the home page, and the
  review caught it. The fix now rewrites relative URLs and checks the pre-render's `data-doc`.
- **The review (pre-minor, full) was GO_WITH_FOLLOWUPS.** Its three confirmed minors were
  fixed before the tag, each with a test that fails without it: the `<base>` regression; two
  saves of one file at once recording the wrong content against a commit; and a commit into a
  repo mid-rebase. The deferrals are on board #3373.
- **The Playwright popup stall is now filed** as microsoft/playwright#43496. A 40-line
  script reproduces it: Chromium only, any route on the opener.
- **Approval landed after the 60-minute window** a third time running; the verify-only run
  was 39021382154.
- **Lanes:** unit 1916; Playwright 821 passed and 31 skipped; consumer 58; haltija 87 over
  20 pages.

## 1.16.26 (2026-10-18)

- **A feature found two older holes.** Designing a domain-wide key cookie showed that tunnel writes leaned on `SameSite=Lax`, and "site" is the registrable domain: any `*.tosijs.net` page could POST into a workspace with its session (since 1.9.0). The same pass found a read-only share session could attach the haltija bridge (since 1.15.0). Both fixed, with affected versions named. When a credential's scope widens, re-read every gate it reaches.
- **The maintainer's mid-turn steer shaped the design.** They wanted the root list to hand out links that just work. That became a key cookie each workspace trades for a session on page load, which also covers bookmarks and reloads after a restart. Caddy can compare a fixed value but cannot sign one, so the cookie holds the raw key: long keys only, rotation documented.
- **The review's catches:** the edit key opened less than the view key on `globalKeys: 'view'`; a docstring claimed sessions were re-checked against the key (false, so the rotation advice overstated itself); a `//` path made the post-redemption redirect protocol-relative (link redemption had it too). All fixed with tests that fail without them.
- **Box-side work tested off the box:** the Caddy template ran under a scratchpad Caddy 2.11.7 with curl, and `build-index.sh` ran against a fake `/srv/preview` plus a Playwright check of its script. The real box (Debian Caddy 2.6) and the full round trip are untested until the maintainer's next `tosijs-caddy-install --go` (board #3377).
- **A test that would start a shared haltija was refused.** The bridge gate became a pure function (`haltijaBridgeAdmission`) and is unit-tested instead.
- **Lanes:** unit 1934; Playwright 826 passed, 41 skipped; consumer 58; haltija 87 over 20 pages. Approval came inside the window, so the publish run's own verify passed.

## 1.16.27 (2026-10-18)

- **The first real install found what off-box testing could not.** 1.16.26's box steps installed a Caddyfile Caddy could not read (`umask 077`, root-only, since 1.10.0): the reload failed, the file stayed on disk, and the bin said "Nothing was installed". A restart would have taken every site down. The scratchpad Caddy ran as the same user that wrote the file, so it could never see this. Test a deploy tool against a box where the service runs as its own user.
- **The first fix had a hole the review caught.** Rolling back on a failed reload restored the broken root-only file whenever Caddy was stopped, which is exactly the state the bug leaves a box in. A 644 fallback would have exposed both keys. Both came from guessing who Caddy runs as; the fix asks systemd (`Group=`, else `User=`'s group), and every branch is a test with a mutant that fails it.
- **The prefix-matched cookie gate dated from 1.9.0.** It still needed the whole key. Found by curling a wrong cookie at the live box; `git log -S` set the affected range (the CHANGELOG first guessed 1.10.0).
- **A running `bun start` faked a red unit lane twice:** it rebuilt `dist/` while the installer tests imported from it (every test failed in ~10ms). Stop the dev server before running lanes, as CLAUDE.md already says for git surgery.
- **Exporting the keys in `~/.zshenv` leaked into the fake-ssh tests,** which filled in values preview.env left out. They now scrub `PREVIEW_*`.
- **Lanes:** unit 1942; Playwright 826 passed, 41 skipped; consumer 58; haltija 87 over 20 pages. Publish run 39147334158 green including verify; the published dist and installer are identical to the tag.

## 1.16.28 (2026-10-20)

- **The design came from the maintainer, not the first cut.** I proposed printing the permanent edit key in the tunnel banner. The maintainer asked for short-lived single-use links that leave a durable cookie instead. The key now never appears in a URL, a terminal or a log.
- **The re-review caught two regressions the first cut introduced.** Plain `--link` had silently become a single-use global grant, changing its documented meaning; global links are now opt-in with `--global`. `/__devlink` lacked the cross-site check `/__build` has, so any page in the browser could mint grants; it now refuses cross-site requests and caps outstanding grants at 32.
- **Found while testing on the box:** Caddy's access log had recorded `?t=` keys and tokens since 1.9.0. The template now redacts them; the box's logs were scrubbed by hand.
- **Approval came after the 60-minute wait,** so the run ended with verify skipped. `verify_only` run 39453492098 was green, and the published dist is identical to the tag.
- **Lanes:** unit 1963; Playwright 831 passed, 51 skipped; consumer 58; haltija 87 over 20 pages.

## 1.16.29 (2026-10-20)

- **Two adopter reports from tosijs-3d-ensemble, fixed same day.** The test widget (fixed over page content) took a full-page component's clicks 3 runs in 4; nine dangling wikilinks had been live 404s since their 0.3 with no build warning. Both were invisible to our lanes because this corpus uses no wikilinks and no full-page component sits under the widget.
- **The review (v2 skill, always-on/fast for an additive patch) caught one real catch:** under `strict`, a wikilink to a static page now fails the build though the link works. Documented rather than exempted; the exemption is board #3435.
- **One owner per rule, again:** the new `wikilinkKey` was a fifth copy of `slugify`. Folded into `routing.ts` with render.ts's copy; book-html and epub-volumes still carry copies (#3435).
- **The publish watch exited early** (`gh run watch` returned while the stage job sat at approval); an until-loop on `status` is the reliable wait.
- **Lanes:** unit 1968; Playwright 834 passed, 51 skipped; consumer 58; haltija 87 over 20 pages. Publish run 39457705677 green including verify; published dist identical to the tag.

## 1.16.30 (2026-10-20)

- **The maintainer's complaint, not a bug report:** "everything reset on a given dev server restart, which might be triggered by a simple change to an example." `bun --watch` restarts on any of 73 imported files, and save-to-source writes one, so a save restarted the server it had just saved through. A reload already recovered; a page left open did not. The fix is renewing the session in place from the key cookie, for same-origin requests only.
- **The review (pre-minor/full, auth surface) caught one real finding:** the haltija bridge's websocket upgrade bypassed renewal, so the agent bridge stayed dead after a restart. Fixed before tagging (`upgraderSettingCookie`); unit-tested only, because an e2e would start a channel on the shared port 8701.
- **What the review surfaced for the owner:** renewal means a key holder's access is bounded by the 30-day key cookie, not the 24h session. The owner's ruling on approval: the 30-day key is fine as long as the token that delivers it expires quickly (the edit `--global` link: single-use, 5 minutes). Plain `--link` sessions still die on restart (board #3416).
- **One unexplained Playwright run:** 833 passed, 2 failed, exit 1, and a re-run overwrote the report before the failing tests were read. Four later runs were clean (835 passed). An ensemble Playwright run was on the machine at the time; that is a candidate, not a cause. Read `playwright-report` BEFORE re-running.
- **A review agent saw 25 unit failures** from a concurrent `dist/` rebuild; alone, 1970 pass. Agents running lanes in parallel with a build is the same race as a live `bun start`.
- **Lanes:** unit 1970; Playwright 835 passed, 53 skipped; haltija 87 over 20 pages; consumer 58. Approval landed after the 60-minute wait, so verify ran as `verify_only` (run 39483970420), green; published dist identical to the tag.

## 1.16.31 (2026-10-21)

- **Two maintainer-driven threads in one release:** notification stacking (iterated live over the tunnel, five rounds against the maintainer's eyes and one diagram) and per-device edit passes (#3416). The maintainer caught every layout misreading in minutes; no lane would have, because each version was internally consistent. Showing a screenshot after every change was what made the loop fast.
- **The review (pre-minor/full, auth) caught a real BLOCKER:** a revoked device still holds the shared view key, its view session was tagged with the revoked device, and the next request ended it: an endless 302 loop. The e2e test sent a revoked pass alone, never with the view cookie every real device carries. Test the credential set a real browser holds, not the one the feature is about.
- **The review also caught the upgrade gap (M1):** the edit key's raw value sat in cookies and URLs through 1.16.30 and now signs passes, so rotation is a required upgrade step. Its suggested fix (derive the signing key) was declined: a holder of the old key can run the same derivation.
- **Auth work in a separate worktree** kept half-wired code from restarting the maintainer's dev server mid-session; the first attempt in the main checkout locked them out for a few minutes. Do security changes to a running dev server's import graph in a worktree.
- **Lanes:** unit 1986; Playwright 856 passed, 59 skipped; haltija 87 over 20 pages; consumer 58, all re-run after the review fixes. Publish run 39595000398 green including verify; published dist identical to the tag.

## 1.16.32 (2026-10-25)

- **The gate caught:** the dependency-audit gate failed the build on happy-dom
  GHSA-834v-8h66-3h79, which has no fixed 20.x. The maintainer ruled that a test- and
  build-only optional peer may cross a major in a patch ("it's dev only and tests only"); the
  peer is now `^21.0.4`. The ePub, the one shipped path through happy-dom, was rebuilt and
  diffed against the previous build: only the pages that changed differed.
- **The review caught:** a `<tosi-palette>` shortcut with an unknown modifier (`hyper+k`)
  bound the bare key, so plain typing opened the palette; a keydown with no `key` threw.
  Both are fixed with tests that fail with the fix reverted.
- **Recurrence:** `release-check` missed seven CHANGELOG bullets on its first run, six from
  the feature commits and one (`searchShortcut`) from a review fix. It was green before the
  push both times, so the pattern is now caught at the gate rather than at tag time.
- **Process slip:** a `git add -A` swept the review report into the happy-dom commit, so the
  last commit before the tag carried a `[change]` bullet rather than `[note]` only. The gate
  was green; the rule exists to stop the loop, and it did not loop here, but it was not followed.
- **Publish:** approval landed after the workflow's 60-minute wait, so the first run ended
  "verification owed"; `verify_only` then went green. The published `dist/` is identical to
  the tagged tree.
- **Flakes under load (avg ~128):** two Playwright failures that passed 120/120 on re-run,
  recorded on #3484 rather than dismissed.

## 1.16.33 (2026-10-25)

- **Where it came from:** the maintainer needed a new dev link on a Quest 3, where letters,
  digits and `=` are on different keyboards. Short links (#3504) and the box on the box's page
  came out of that, and so did #3505: testing on the headset showed a mistyped code was
  reported as "has been used", which sent the reader off to ask for a fresh link.
- **The review caught:** the box's own page (F1) still answered a typo with "ask for a fresh
  one" after #3505 had fixed the workspace's page. Two pages for one job, and the fix landed on
  only one of them. Fixed before the tag, with a test that fails if it is reverted.
- **Process slip:** the #3505 auth edits were first made in main while the maintainer's dev
  server was running. They were moved to a worktree before that server rebuilt, and main was
  reverted. In that worktree, `rm -rf tls` removed tracked files, which were restored from git.
- **Not yet live:** the box still serves the gate page from before the review, because a
  Caddyfile change needs `tosijs-caddy-install --go`, which is a separate step after publishing.
  The F1 wording reaches the box only when that runs.
- **Publish:** approval came inside the 60-minute window, so the first run went green. The
  published `dist/` is identical to the tagged tree.

## 1.16.34 (2026-10-26)

- **Where it came from:** virta's board splash froze on the maintainer's iPhone (#3507 → #3508).
  `spinN` icons were rotated with `el.animate()` on the `<svg>`; WebKit runs an SVG transform
  animation on the main thread, so a loader stood still exactly while the page worked.
- **Measured before building:** a document-level `@keyframes` does not reach a shadow root in
  Chromium or Firefox (WebKit allows it), which decided where the styles live.
- **The review caught:** a major the first cut introduced. The new wrapper stretched in a tall
  flex container and the icon orbited. It also caught the per-icon `<style>` leaking CSS into
  `textContent`. Both were fixed before the tag; the wobble test was checked to fail with the
  fix reverted. The first version of that test used a `<button>`, which centres its content
  and so never stretched: it passed against the bug.
- **A flaky check, caught by repeating it:** sampling the rotation angle off the wall clock
  failed 3 of 4 runs in WebKit while the animation itself was correct (progress 0.242 at
  242 ms). The test now reads a paused quarter turn.
- **Publish:** approval inside the window; first run green. Published `dist/` identical to the
  tagged tree. The box's Caddyfile reinstall for 1.16.33's gate page was run by the maintainer
  (the classifier refused it twice); verified live afterwards.

## 1.16.35 (2026-10-26)

- **What it was:** the open board items from 1.16.32 and 1.16.33 (#3502, #3506, #3484) and the
  remainder of #3416, where a plain tunnel link now survives a restart for 24 hours through a
  signed pass. Three of the work streams were done in parallel by agents in worktrees and merged.
- **The review caught:** a broken signing secret (permissions loosened, unreadable) made every
  tunnel request fail and spent a redeemed link on an error page; and on a filesystem without
  permissions (WSL on a Windows drive, FAT) the server would have refused every start after the
  first link. Both now turn passes off with one warning. The new e2e was checked to fail with
  the fix reverted.
- **Process cost:** the agents' worktrees under `.claude/worktrees` made `format-check` scan
  their trees; they are removed after merging now.
- **One flake on the final run:** WebKit `/via-tag/` in `examples-show-something`; 4 of 4 on
  repeat, recorded in the review.
- **Publish:** approval came after the 60-minute window, so the stage run skipped verify and a
  `verify_only` run was needed. Published `dist/` identical to the tagged tree.
