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
