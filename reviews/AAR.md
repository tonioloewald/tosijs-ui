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

## 1.15.0 (in progress)

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
  annotations. Recorded in the practices repo as a worked example this cycle.
