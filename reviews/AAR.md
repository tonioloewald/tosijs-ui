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
