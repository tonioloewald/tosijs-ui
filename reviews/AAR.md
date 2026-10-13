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
