# Lean-plan review: site-build (`src/doc-system/site/`, the build half)

Basis: `af13cd1ee` (1.19.2 + the unreleased `on<Event>` change). Line numbers are at that commit.

Scope: all 40 non-test `.ts` files in `src/doc-system/site/` other than the 16 another reviewer
has. Every file was read in full, line by line: orchestrator, epub, generate-site, site-config,
audit-guard, docs, make-llms-txt, check-examples (and -cli), epub-volumes, epub-a11y, epub-cli,
restamp, host-preset, a11y-audit (and -cli), a11y-report, alt-text, sections, page-metadata,
page-dates, page-globals, build-warnings, build-stamp, build-peers, build-dom-shim,
bundle-guard, codemirror-copies, library-bundle, asset-stamp, generate-css, config-fingerprint,
image-size, truncated-doc, sourcemap-check, sourcemap-relocate, output-guard, test-report,
audit-reach, index. Tests were read enough to know what they cover (see B, "Tests and build").
Out-of-scope helpers were read only where a copy had to be compared (`routing.ts`,
`code-fences.ts`, `heading-id.ts`, `doc-title.ts`, `book-html.ts`, `render.ts`
`derivedDescription`, `insert-examples.ts` grouping, `bounded-child.ts`, `test-setup.ts`).

Throwaway scripts: `<scratchpad, not kept>/lean/site-build/`.
Each ✔ ran as `cd ~/tosijs-ui && bun <that dir>/<script> <that dir>`, unless the
command is given. No dev server or Playwright was started.

---

## A. Defects

Grouped by cause. "Patch?" says whether it is worth a patch on its own.

### A1. Each pass composes site URLs from `baseUrl`/`basePath` itself, and the copies disagree

`routing.ts:251 withBase` calls itself "THE ONE COPY" (#144). It is the one helper, but
`baseUrl + withBase(...)` is written out at every call site. Some call sites trim a trailing
slash from `baseUrl` and some don't, and two leave `basePath` out entirely.

| # | Defect | Where | Evidence |
|---|---|---|---|
| 1 | `robots.txt`'s `Sitemap:` line ignores `basePath`. On a GitHub project page it names `https://user.github.io/sitemap.xml`, which does not exist. | `generate-site.ts:1060` | ✔ `base-urls.ts`: `robots : https://u.github.io/sitemap.xml` while `sitemap: https://u.github.io/repo/guide/` |
| 2 | `llms.txt`'s `- Docs:` link ignores `basePath`. The page links in the same file include it. | `make-llms-txt.ts:230` | ✔ same run: `llms Docs : https://u.github.io`, `llms page : https://u.github.io/repo/guide/index.md` |
| 3 | A `baseUrl` with a trailing slash doubles the slash in every canonical link, `og:url`, sitemap `<loc>`, JSON-LD `url` and the robots line. `make-llms-txt.ts:116,283` and `epub.ts:1227` trim it; `generate-site.ts:450,501,512,521,1034` do not. | generate-site.ts (5 sites) | ✔ `[trailing-slash] canonical : https://example.com//guide/`, `sitemap : https://example.com//guide/`, but `llms page : https://example.com/guide/index.md` |
| 4 | The "baseUrl and basePath both carry a path" warning was written for a GitHub Pages reporter (#144), but it runs only for `host: 'firebase'` with an existing `firebase.json`. | `orchestrator.ts:2086` (the only call of `host-preset.ts:80 basePathDoubling`) | read (grep shows that single call site) |

- Cause: there is no `siteUrl(config, path)`; each pass composes the URL itself.
- Fix: a single helper covers #1–#3 (B "One implementation", item 1), and moving the
  `basePathDoubling` call out of the firebase branch covers #4.
- Patch? Yes. #1 and #3 are what search engines and agents read, and the fix is small.

### A2. buildSite forwards a hand-picked subset of the config across process boundaries, and the subsets have holes

| # | Defect | Where | Evidence |
|---|---|---|---|
| 5 | **The ePub child never receives `liveExamples`.** On an `'opt-in'` site (the setting the docs recommend for books) or a `'no-code'` site, `buildSite`'s ePub puts a "▶ Run this example live" link beside every `js`/`html`/`css` fence, pointing at `#example-N` anchors the page does not have. `epub.ts:257-270` records this exact bug as fixed, and it is fixed only for direct `buildEpub` callers (`bun book`). No test covers it (`epub.test.ts` never sets `liveExamples`). | payload at `orchestrator.ts:152-168`; read at `epub.ts:1086` | ✔ `epub-live-policy.ts`: `opt-in, full config : 0`, `payload buildSite forwards: 2`, `forwards liveExamples? false` |
| 6 | **The check-examples fallback drops three options.** When the child cannot run, the in-process fallback passes only `importPrefix`/`contextKeys`. It leaves out `liveExamples`, `overriddenDialects` and `modules`. On that path an opt-in site fails its build over illustrative code (the "major M2" bug), a site that replaces `tjs` gets checked against the wrong transform, and `exampleModules` writes no modules. | `orchestrator.ts:321-324` vs `check-examples-cli.ts:55-61` | ✔ `check-fallback.ts`: `child problems: 0 | fallback problems: 1` |

- Cause: each boundary (env vars, a JSON payload, a fallback object literal) has its own
  hand-written list of fields.
- Fix: build the options object once and serialize it. For the ePub, forward every
  JSON-safe field of the config rather than a list.
- Patch? Yes for #5 (it breaks published books). #6 bites only when spawning the child fails,
  so it is not worth a patch alone; fix it with #5.

### A3. Metadata blocks are found by a hand-rolled scanner, not by the parser

| # | Defect | Where | Evidence |
|---|---|---|---|
| 7 | **A page whose four-backtick fence illustrates a metadata block can be silently unpublished.** `metadata()` strips fenced code with a regex that closes on the first inner ` ``` `. It then reads the illustrated `<!--{"hidden": true}-->` as the page's own directive, and the page vanishes from the site, the sitemap, llms.txt and the ePub. This is the #156 bug class, re-opened by a nested fence. marked sees one `md` fence. | `docs.ts:315-318` | ✔ `meta.ts`: `howto.md` is missing from `published:`; `marked sees in howto.md: ["md"]` |
| 8 | **A wrapped (multi-line) metadata block is silently ignored.** No `order` and no `description`, and nothing says so. `titleFromMarkdown` skips it as a comment (its doc says "a metadata block can wrap"), so the page looks right while its metadata is dropped. Two other copies of the grammar do accept multi-line: `book-html.ts stripDocMeta` and `[\s\S]` in `single-source`. | `docs.ts:329` (`.*`, single-line) | ✔ same run: `wrapped.md order=- desc=-`, `wrapped-first.md order=- desc=-` |

- Cause: CLAUDE.md names `collectCodeTokens` (marked's lexer) as the owner of fence
  enumeration, and this regex is a second fence scanner.
- Fix: find directives as top-level `html` tokens from `marked.lexer`, which
  `single-source.ts:153` already does. That fixes both. A multi-line block then either
  parses or is reported.
- Patch? Yes for #7: a page silently disappearing is the worst outcome this system has.

### A4. A broad `catch`, or cleanup that only runs on success

| # | Defect | Where | Evidence |
|---|---|---|---|
| 9 | **A failed ePub leaves `.epub-build/`, the staging folder of every chapter, inside the served output.** buildSite treats an ePub failure as a warning ("the site is fine"), so the folder deploys: a missing `zip` CLI, a happy-dom crash, or the 120s timeout kill (`orchestrator.ts:178-185`) all leave it. Only the strict-image path cleans up (`epub.ts:1324`). | `epub.ts:1203-1206`, `1418` | ✔ `epub-leftover.ts`: `buildEpub threw: Failed with exit code 15`, `staging folder left in the output dir: true` |
| 10 | When no `bundleEntry` is set, a failed `cp` of tosijs-ui's `iife.js` (for example `scriptUrl: '/js/iife.js'` with no `js/` folder) is caught by the same `catch` as the resolve, and reported as "tosijs-ui's iife.js couldn't be resolved … Install tosijs-ui". The build stays green and the pages never hydrate. The tjs block 60 lines later records fixing exactly this ("Only RESOLUTION is allowed to fail quietly here"). | `orchestrator.ts:1622-1635` | read |
| 11 | `node_modules/.cache/tosijs-hydrate-<pid>` is removed only on the success path (`:1609`). An ESM build failure (`:1541`), a missing entry (`:1552`) or a strict refusal (`:1600`) leaves one folder per process. | `orchestrator.ts:1484-1490` | read |

- Cause: cleanup is not in `finally`, and a `try` wraps more than the step that may fail.
  `buildSite` already has a `scratchDirs` list cleaned in `finally` (`orchestrator.ts:703,
  2313`), but nothing else uses it.
- Patch? #9 yes (it ships a stray folder to hosts and, in this repo, into committed
  `docs/`). #10 and #11 can ride along.

### A5. `audit: { blockOn: 'runtime' }` is less conservative than its header promises

12. The reachability walk follows only a runtime package's `dependencies`, although
    `audit-reach.ts:39` says "(plus optional)" and its header says every ambiguity resolves
    to `runtime`. So an `optionalDependencies` package of a runtime dependency (a platform
    binary, say) is labelled `build-only`, and a HIGH advisory in it stops blocking. Two
    more holes:
    - only top-level `node_modules/<pkg>` is read, so a nested install is never followed;
    - an unresolvable runtime package's own children read as `build-only`, when they should
      make the walk unusable.

    Where: `audit-guard.ts:516-527`.

    ✔ `reach.ts` against a scratch project:
    `native-bin (optional dep of a runtime dep): reach = build-only | blocking = 0 | ok = true`.

    Patch? Only together with other audit work; it affects only adopters who opted into
    `blockOn: 'runtime'`.

### A6. Emitted documentation is attached to the wrong declaration

13. **`SiteConfig.haltijaDev` ships with no JSDoc.** Its 30-line block sits above
    `debugSink`'s, so both blocks lead into `debugSink` in the `.d.ts`. This is the F13 bug
    `site-config.test.ts` exists to catch, but that test lists only `bundleEntry`,
    `liveExamples` and `bundleRegistrations`.
    - Where: `site-config.ts:838-897`.
    - ✔ `bun <dir>/dts-docs.ts`: `SiteConfig fields with no JSDoc directly above them:
      haltijaDev`, `fields preceded by TWO JSDoc blocks: debugSink`.
    - Same cause, read (wildcard-reachable internals only, so lower stakes):
      - `epub.ts:1021-1023` gives `versionAnchoredDate` buildEpub's sentence ("Build an EPUB 3
        book…") in `dist/…/epub.d.ts:111-114`, checked by grep;
      - `orchestrator.ts:26-31` documents `registerSiteDialects` on `let codemirrorWarned`;
      - `orchestrator.ts:328-333` is gzipSizeInChild's doc above `finalizeStamp`;
      - `orchestrator.ts:126-127` is a duplicate of `:209-210`;
      - `withStamp` lost its doc to `hasMarkdownPage` (already filed: #3106).
    - Patch? Yes, with a generic "every SiteConfig field has exactly one JSDoc" test (my
      script is the shape) in place of the hand-kept list.

### A7. Smaller defects, each with its own cause

14. **A CDN `scriptUrl` gets a false warning on every build.** For an absolute URL,
    `scriptName` is still joined onto `PUBLIC` (`orchestrator.ts:1258`, `asset-stamp.ts:83-87`),
    so every build prints "asset stamp: 1 named input(s) did not exist … generate it first".
    The advice is wrong, and the warning is noise. ✔ `cdn-stamp.ts`: `missing: [
    ".../cdn-site/https://cdn.jsdelivr.net/npm/tosijs-ui@1.19.2/dist/iife.js" ]`. Patch: with A1.
15. **`rebaseRelativeRefs` misses `srcset` and single-quoted attributes.** On alias pages and
    the `/slug` (`slug.html`) copy of every page, a relative `srcset`, or `src='…'` in raw HTML,
    resolves against the wrong directory. `epub.ts embedLocalImages` handles both, so the two
    image rewriters disagree. Where: `generate-site.ts:777`. ✔ `base-urls.ts`: `rebase srcset:
    <img srcset="img/a.png 2x">` and `rebase 'src' : <img src='img/a.png'>` are unchanged, while
    `rebase src : <img src="guide/img/a.png">` is rebased. Patch: low.
16. **`generateSite` writes files at fixed paths while two of its options claim to move
    them.** It writes `docs.json` at a fixed path (`generate-site.ts:1017`) while `docsUrl`
    (`:412`) changes the URL pages fetch. Likewise the stylesheet is always `doc-system.css`
    (written by generate-css and hashed by `asset-stamp.ts:86`) while `stylesUrl` (`:415`)
    changes the `<link>`. A direct `generateSite` caller that sets either option gets pages
    pointing at nothing. buildSite never sets them. Read. Not worth a patch: remove the options
    (C).
17. **`llms-full.txt` drops a page's title when the page has no H1 but has a `# comment` in a
    code fence.** The H1 check is the line regex `/^#\s/m` (`make-llms-txt.ts:292`).
    ✔ `llms-full-h1.ts`: `page heading present: false`. Low.
18. **llms-full.txt shows the raw `<!-- epub-downloads -->` marker where pages show the
    download list.** `llms.txt`/`llms-full.txt` are written (`orchestrator.ts:1638-1674`)
    before `publishVolumeLinks` substitutes the marker (`:1788`); pages and `index.md` are
    written after, so they get the list. Read. Low.
19. **The bundle-registration guard reads every `.js` in the output, not just "the entry plus
    its chunks" as its comment says.** A `staticDirs` script that contains tosijs-ui (a vendored
    copy) can make it report a healthy bundle. Where: `orchestrator.ts:1588-1592`. Read.
    Unsure how often it happens. Settle it with a fixture: a static `vendor.js` holding
    `preferredTagName="tosi-doc-system"` and a bundleEntry that omits the doc system.
20. **The ePub payload goes to a predictable shared `/tmp` file,
    `${tmpdir()}/tosijs-epub-${pid}.json`.** The axe audit was moved to `mkdtempSync` for that
    exact reason ("a predictable name in a shared /tmp could be planted", #3862,
    `a11y-audit.ts:82-85`); the ePub copy was not. Where: `orchestrator.ts:171`. Read. Low (it
    carries config, not doc text).

Already filed, so not counted as new here:
- slug-key collisions and the `generate-site.ts:796-809` warning (#3435, #1570);
- buildSite's registration check swallowing an unreadable corpus (`orchestrator.ts:1584`, #3253);
- a failed declaration `tsc` leaving dist (#4045);
- building the IIFE that bundleEntry pages never load (#2437);
- `tagline` not reachable from SiteConfig (#1520).

---

## B. Phase 1 (no functionality removed)

### Dead code

- **The `make-llms-txt.ts` legacy scan**: `entriesFromSrcScan`, `extractTitle`, the `SRC`/`DIST`
  constants and the `import.meta.main` block that writes `dist/llms.txt`
  (`make-llms-txt.ts:12-13, 41-44, 140-175, 333-336`, about 50 lines). The build always passes a
  corpus (`orchestrator.ts:1646`); no script, bin or test runs the file or calls it without one.
  Its `/\*#([\s\S]+?)\*\//` doesn't even honour the line-start rule. Making `corpus` required
  removes three `!!corpus &&` branches. It is reachable only through the `./*` wildcard
  (`tosijs-ui/doc-system/site/make-llms-txt`), and no sibling repo imports any
  `doc-system/site/*` deep path (grep of the 25 repos).
- **`findAce`** (`epub-a11y.ts:160-165`): a wrapper around `locateAce(...).bin` used only by its
  test. `runAce` calls `locateAce`.
- **The `stripDocMeta` re-export from `epub.ts:62`**: "for back-compat (tosijs-ui/site's public
  surface + tests)", but `index.ts` does not export it. Only `epub.test.ts:8` uses it, and it
  can import from `book-html`.
- **`.filter((doc) => !doc.hidden)`** at `orchestrator.ts:2229`: hidden docs never reach
  `docs.json` (`docs.ts:741`).
- **`GenerateSiteConfig.llmsTxt`** (`generate-site.ts:59-60`) is read by nothing, and its doc
  ("which the 404 page then points to") is false. It is on a public type, so it is listed in C.

### One implementation each

1. **Site URL composition** (fixes A1 and #14). Hand-written today in:
   - `orchestrator.ts:1049-1055, 1699-1701, 1761-1762`;
   - `epub-volumes.ts:83, 129, 206`;
   - the strip direction in `epub.ts:321, 426` and `a11y-audit-cli.ts:59`;
   - `baseUrl + withBase` at 9 sites (`generate-site.ts:450, 501, 512, 521, 1035`;
     `make-llms-txt.ts:119, 290, 303`; `epub.ts:1247`), with a trailing-slash trim at only 4
     (`make-llms-txt.ts:116, 283, 302`, `epub.ts:1227`);
   - and 2 sites with no `withBase` at all (A1 #1, #2).

   The merge goes into `routing.ts`:
   - `siteUrl(baseUrl, basePath, p)`, which trims `baseUrl` and applies `withBase`;
   - `stripBase(basePath, p)` for the inverse.

   It keeps every copy's guards: absolute and protocol-relative URLs pass through, `'/'` and
   empty `basePath` are no-ops, and trailing slashes are trimmed on both `baseUrl` and
   `basePath`. It is one function each way, not a mode switch.
2. **Child processes.** Nine launch sites in scope:
   - `buildEpubInChild`, which has a timeout but no signal handling;
   - `checkExamplesInChild`, with neither;
   - `libraryBundle`'s two children, the IIFE build and the ESM build (all through
     `drainChild`, with no timeout);
   - `classicScriptSyntaxErrorInChild`;
   - `gzipSizeInChild`;
   - generate-css via `$`;
   - only the axe audit and Ace use `bounded-child.ts runBounded`, which is the only one
     with both a timeout and SIGINT/SIGTERM forwarding.

   A hung `bun build` or check child hangs the build with no bound. The merge is `runBounded`
   plus `env` and an `inherit` stdio option, keeping the drain-both-pipes-concurrently rule and
   per-call timeouts.
3. **Scratch directories** (fixes A4 #9, #11 and A7 #20).
   - Private and cleaned: `mkdtempSync` in alt-text (`orchestrator.ts:1972`), a11y
     (`a11y-audit.ts:84`) and Ace (`epub-a11y.ts:185`).
   - Predictable, and cleaned only on success: the ePub payload (`orchestrator.ts:171`),
     `${outputDir}/.epub-build` (`epub.ts:1203`) and `node_modules/.cache/tosijs-hydrate-<pid>`
     (`orchestrator.ts:1484`).

   The merge is one `scratchDir(prefix)` registered in buildSite's existing `scratchDirs`. The
   hydrate dir must stay under the project (#178, source paths), so it keeps a fixed parent
   but gets the `finally`.
4. **The check-examples option plumbing** (A2 #6). Build the options once, then derive the
   env (or a JSON argv) from that object and pass the same object to the fallback.
5. **`registerSiteDialects`**, written twice: `orchestrator.ts:33-39` and a verbatim copy at
   `epub-cli.ts:33-35`. Moving it to `example-policy.ts` also breaks the
   restamp↔orchestrator import cycle (#3253).
6. **Escapers in scope.**
   - `generate-site.ts:180 escapeAttr` is identical to `epub.ts:155 escapeXml`.
   - `generate-site.ts:188 escapeText` is identical to `epub.ts:193 escapeXmlText` and to
     `book-html.ts:135 escapeHtml`.
   - `epub-a11y.ts:43 escapeXml` (4 entities) and `epub.ts:196 escapeXmlAttr` are close variants.
   - Out of scope, same family: `render.ts:286-291`, `continue-link.ts:51`,
     `page-schematic.ts:39`, `bin/generate-og.ts:56`.

   All are valid inside double quotes, so no defect. The merge is `escapeHtml`/`escapeAttr`
   exported from `book-html.ts` (already DOM-free).
7. **`escapeRegExp`**: 8 copies (`orchestrator.ts:211`, `restamp.ts:42`, inline at
   `bundle-guard.ts:61`, `doc-title.ts:67`, `css-value-forms.ts:80`, `icon-core.ts:262`,
   `doc-search.ts:169`, `release-notes.ts:247`).
8. **`slugify`**: 3 copies (`routing.ts:206`, `book-html.ts:141`, private `epub-volumes.ts:24`;
   `epub.ts:51` imports the book-html one). ✔ `slugify-eq.ts`: `disagreements in 200k random
   strings: 0`, so the merge is safe. Already filed: #3435.
9. **The metadata-block grammar** (A3): `docs.ts:315-329`, `book-html.ts stripDocMeta`,
   `single-source isSingleSourceDirective`. Use marked `html` tokens, as `single-source.ts:153`
   does.
10. **Doc titles**: `titleFromMarkdown` (`docs.ts:214`) for `.md`, but
    `text.split('\n')[0].replace(TRIM_REGEX,'')` (`docs.ts:613`) for `/*#` blocks, plus
    llms-full's `/^#\s/m` (A7 #17). One rule: the first heading token from the lexer, else the
    first content line.
11. **Example grouping**: `epub.ts:524-554 injectExampleLinks` re-implements
    `insert-examples.ts:277-322`, including the `example-N` ordinal. It skips the
    `tosi-transpiled` step (`nextGroupableSibling`), which is safe only because the ePub renders
    without bakes (`epub.ts:1263`). Export the walk from live-example as a DOM-agnostic function.
12. **Config defaults** resolved at each use:
    - `outputDir ?? 'docs'`: 14 sites repo-wide (10 in scope);
    - `docsJson ?? 'demo/docs.json'`: 6 sites (`orchestrator.ts:2163` re-derives it next to
      `DOCS_JSON`);
    - `scriptUrl ?? '/iife.js'`: 3 sites;
    - `liveExamples ?? 'auto'`: 4 sites.

    The merge is one `resolveSiteConfig(config)` called at the top of buildSite, restampSite and
    buildEpub. Phase 1 because the defaults stay as they are.
13. **The tosijs-ui package directory**: `codemirror-copies.ts:116 tosijsUiDir` walks up, but
    the generator version reads the fixed `${import.meta.dir}/../../../package.json`
    (`orchestrator.ts:1813`). Use `tosijsUiDir`.
14. **The DOM-global name list**: `build-dom-shim.ts:25-65` vs `test-setup.ts:35-82`. Keep the
    two policies (the build shim never overwrites native `fetch`/`URL`) and share the list.
    The build list is already missing `NodeFilter`.
15. **Directory walkers**: 6 in scope (`restamp.ts:45 htmlFiles`, `sourcemap-relocate.ts:18`,
    `library-bundle.ts:118`, `docs.ts:443 countScrapable`, `Bun.Glob` at `orchestrator.ts:1589`,
    and `find` via `$` at `orchestrator.ts:352`). Low value.

### Declarations written twice

- **`liveExamples`'s union** `'auto' | 'opt-in' | 'no-code'` appears 3 times
  (`site-config.ts:242`, `generate-site.ts:80`, `page-globals.ts:18`) plus the value list
  `page-globals.ts:25`, beside `ExamplePolicy` (`example-policy.ts:121`, which adds `'none'`).
  Derive the type from one `as const` list, as `EXAMPLE_VIEWS` (`example-policy.ts:161-162`)
  already does.
- **`kind`'s union** `'documentation' | 'book'` appears twice (`site-config.ts:220`,
  `generate-site.ts:110`) plus `SITE_KINDS` (`page-globals.ts:26`).
- **`GenerateSiteConfig`** (`generate-site.ts:57-178`) re-declares about 25 `SiteConfig` fields,
  with separately written JSDoc that has drifted (`assetStamp`, `llmsTxt`; see Docs). Make it
  `Pick<SiteConfig, …> & {…}`; the type's shape stays the same.

### Teardown and caches

These are build-time modules, so there are no element listeners. What a days-long dev-server
process holds:

- **Leaked scratch.** `tosijs-hydrate-<pid>` leaks per failed build, and `.epub-build` per
  failed ePub (A4).
- **Five announce-once module flags** (`orchestrator.ts:31, 627, 630, 632, 637`) and the
  per-process audit memo (`audit-guard.ts:419`, by design). They could be one
  `announced = new Set<string>()`; low.
- **One timer.** `audit-guard.ts:287-289`'s timeout timer is never cleared, but it is unref'd
  and fires once. Harmless.

### Structure (no behaviour change, one file per change)

- **`buildSite` is one 1,665-line function** (`orchestrator.ts:651-2315`). Split it into named
  passes in their own modules: extract+sections, examples, library build, hydration bundles,
  agent files, CSS+stamp, pages, host files, ePub, axe, finalize.
- **The corpus lives on disk between passes.** The parent parses `docs.json` 6 times
  (`orchestrator.ts:971, 1576, 1642, 1718, 1950, 2163`), `ensureSections` reads it twice and
  writes it once, and `publishVolumeLinks` writes it again. Each pass's correctness depends on
  statement order: A7 #18 is one such ordering slip. Hold one in-memory corpus, and write the
  file once, before the children need it.
- **Navigation is rebuilt for every page.** `buildNavTree` runs twice per page
  (`generate-site.ts:220`, `488`), and each doc is rendered three times (`:853` for the
  warnings, then `pageHtml` for `/slug/` and `slug.html`; aliases and the 404 add more).
  Build the nav once per site, render once per doc, and rebase the copies (`rebaseRelativeRefs`
  already exists). Measured:
  - ✔ `render-cost.ts`: `82 docs. generateSite median 229ms; one render+highlight pass over the
    corpus median 28ms`;
  - ✔ `nav-cost.ts`: `330 buildNavTree calls: 89ms`.

  So about 145 of 229 ms is repeated work on this corpus, and the nav part grows
  quadratically with page count.
- **`opts.skipAudit` does two jobs**: it also decides "not a release build" for the axe/Ace
  checks (`orchestrator.ts:2135`). The dev-server lock check on the next line already does
  that job; `orchestrator.ts:812-818` records the same conflation being fixed once before.

### Tests and build

- **13 in-scope test files hand-roll `mkdtempSync`/`rmSync`** (22 across all of `site/`), and
  6 stub `console.warn` by hand. A shared `withTempDir`/`captureWarnings` helper (in `src/test-setup.ts` or a
  `test-helpers.ts`) would replace them.
- **The unit lane does not test `buildSite` itself.** `orchestrator.test.ts` covers only
  `shouldCleanDist`, and #3106 already asks for one fixture build.
- **Tests each merge needs:**
  - a `siteUrl` table test (origin, `origin/`, basePath `'/'`, `/repo`, `/repo/`, absolute
    paths);
  - "the ePub child gets every config field `buildEpub` reads" (or forward the whole JSON-safe
    config and test that `liveExamples` reaches it);
  - check-examples child/fallback parity: same corpus, same options, same result;
  - metadata found by the lexer: nested fence, wrapped block, `~~~` fence;
  - `rebaseRelativeRefs` with `srcset` and single quotes;
  - the d.ts JSDoc check as a scan of every field, replacing the hand-kept `DOCUMENTED` list;
  - `.epub-build` absent after a failed zip.

### Docs, with no API change

1. **The second-best spelling is taught first.**
   - Places: `orchestrator.ts:1064-1071` and `1077-1079`, `check-examples.ts:15-17, 96-98`, and
     the `SiteConfig.checkExamples` JSDoc (`site-config.ts:491-495`).
   - What they tell authors: retag illustrative code as `typescript`/`xml`.
   - Why it is wrong: since 1.15 the survivor is `` ```js:static `` (CLAUDE.md, "Prefer that to
     the old trick of lying about the language").
   - The build message also says "Six fence languages EXECUTE", which leaves out declared
     dialects.
2. **`SiteConfig.strict`'s JSDoc** (`site-config.ts:415-423`, the text IDE users see) lists 2
   of the checks `strict` turns into failures. There are 12 `misconfigured(config.strict, …)`
   sites in buildSite (8 in `orchestrator.ts`, 4 in `generate-site.ts`) and 2 more in
   `restampSite`. `doc-site-system.md` "Strict builds"
   (2122-2165) lists more, but not dangling wikilinks, bare-name links, accessibility findings,
   `altText` without `accessibility`, `exampleModules` without `checkExamples`, or axe failures.
3. **Stale comments about the audit.**
   - `audit-guard.ts:253-265`: "The audit is FAST — sub-second … runs synchronously
     everywhere".
   - `orchestrator.ts:683-686`: "the dev server runs its own synchronous audit just before
     binding the port".
   - Both are wrong today; `doc-site-system.md:582-590` has the current account (79.5s, and
     the server binds first).
4. **Stale comments about stamps.**
   - `epub.ts:102` (`modified`: "default now") and `epub.ts:813-816` ("dcterms:modified … IS set
     from the commit"): it is a version hash (`epub.ts:1196`).
   - `GenerateSiteConfig.assetStamp` (`generate-site.ts:146`): "DETERMINISTIC per commit … see
     build-stamp.ts", but it is a content hash.
   - `orchestrator.ts:1793-1850` gives three successive accounts of the stamp (commit, then
     version, then content hash) above code that does only the last.
5. **Dead or misleading comments.**
   - The orphaned `withBase` JSDoc at `generate-site.ts:331-339`.
   - `generate-site.ts:796-797` says the slug-collision warning is for docs that "share a base
     name"; `buildSlugMap` disambiguates those, so it fires only for #1570/#3435.
   - `index.ts:4` reads "See ./README is at ../doc-site-system.md".
6. **`doc-site-system.md`** (published, read by adopters):
   - The pipeline diagram (37-45) shows generate-css after generateSite. It now runs before
     the pages, for the stamp (`orchestrator.ts:1851-1877`).
   - "Mount-agnostic builds" (2274-2296) says content links are emitted relative. Only legacy
     `?filename` links are (`generate-site.ts:472-475`). Author-written `/slug/` links and the
     section TOC links (`sections.ts:136`) are root-absolute too, and the bare-name-link
     warning tells authors to write `/name/` (`generate-site.ts:980-981`), which 404s without
     JS under a `basePath`. The doc names only wikilinks. Already filed as #1413/#1404; the
     docs should say so.
   - "llms.txt" says `{baseUrl}/llms.txt` resolves, but it is `{baseUrl}{basePath}/llms.txt`.
7. **No `/*#` example in scope throws.** The only doc block in scope is `docs.ts:1-44`, and its
   example is display-only.

---

## C. Phase 2 (one way to do each thing)

### Redundant public spellings

| Task | Redundant spelling | Same as | Consumer uses | Notes |
|---|---|---|---|---|
| Make a dialect's fences live at build time | `registerLiveLanguage` exported from `tosijs-ui/site` (`index.ts:136`) | `SiteConfig.dialects`, which calls it for every non-built-in name (`orchestrator.ts:33-39`) | 0 (25 repos) | `dialects` is a strict superset. It also reaches the ePub child (`epub-cli.ts:33`), stamps `__TOSI_DIALECTS` for the page's check, and skips build checks for a replaced built-in. A `registerLiveLanguage` call in a config module reaches neither child, so the ePub's example numbering drifts: the bug (1.16.3 review F3) that `dialects` was added to fix. Read, not ✔. Remove the `./site` re-export at 1.20 (it stays in `example-policy` for `registerDialect`). |
| Tell `generateSite` where docs.json and the stylesheet are | `GenerateSiteConfig.docsUrl`, `.stylesUrl` | nothing: the files are always written at the default paths (A7 #16) | 0 (buildSite never sets them) | remove (`localizedUrl` is honoured; it can stay) |
| Say whether the site has an llms.txt | `GenerateSiteConfig.llmsTxt` | nothing reads it | 0 | remove |

No other `./site` export is redundant with another. The other unused ones are listed in E.

### The existing `@deprecated` inventory in scope

- **`LlmsTxtMeta.haltijaDev`** (`make-llms-txt.ts:62-67`).
  - Still needed? No. It has been ignored since 1.16.16, the interface is not exported from
    `./site`, and no repo imports the module.
  - Does it warn once and name its replacement? It is ignored silently. A warning would be
    wrong for a no-op; the JSDoc names where the text went.
  - Do the docs teach only the survivor? Yes; it is not taught.
  - Verdict: remove at 1.20.
- **What the inventory misses**, all candidates for 1.20:
  - the legacy no-corpus path of `generateLlmsTxt` (B, dead code), which is a legacy API in
    all but name;
  - `GenerateSiteConfig.llmsTxt`/`docsUrl`/`stylesUrl` (the table above);
  - `registerLiveLanguage` on `./site`;
  - `epub.ts:61`'s "back-compat" re-export, which has no public reach (B).

  None warns at runtime, and none needs to: they are either removable or ignored.

---

## D. Not proposing

These look redundant but stay, with the reason:

- **Child processes for check-examples, the ePub, generate-css, both bundles, gzip and the
  syntax check**: settled, CLAUDE.md "Dev servers are the most dangerous thing in this repo"
  (never `Bun.build()` or native-heavy work in a long-lived process). B merges how they are
  launched, not whether.
- **`check-examples.ts:64 EXECUTABLE`, four languages vs `isLiveFence`'s six**: settled, a
  different question (CLAUDE.md; `check-examples.ts:50-63`).
- **`collectCodeTokens`, `liveFenceLanguages`, `isLiveFence`, `parseFenceInfo` as owners**:
  settled. A3 brings `docs.ts` into line with them, it does not add an owner.
- **Two DOM shims** (`build-dom-shim.ts` vs `test-setup.ts`): a different job. The build shim
  must not replace Bun's native `fetch`/`URL`. Only the name list merges.
- **`emitLibrary` vs `libraryTsconfig` vs `libraryBundle` vs `libraryBuild`**: four ways to
  build the library, but not one thing. They take different inputs, and `libraryBundle` is
  the documented recommendation. `emitLibrary` is set by 6 of the 21 sibling configs
  (`libraryTsconfig` 4, `libraryBuild` 2, `libraryBundle` 1), so removing it is not worth a
  break. Steer in docs only.
- **`audit: false` vs `audit: { mode: 'off' }`, and `preflight: false` vs `'off'`**:
  boolean shorthand, not worth a break (`audit-guard.ts:399-401`).
- **`extractDocs({ output })` vs `saveDocsJSON`**: a different job. tjs-lang transforms the
  corpus between the two (`tjs-lang/bin/site.ts:21`).
- **The 404 page's inline edit-distance script** (`generate-site.ts:1114-1146`): it runs in
  the browser with no bundle. A different job.
- **Building `iife.js` for `bundleEntry` sites whose pages never load it**: filed as #2437.
- **The ePub highlighting with policy `'none'`** (`epub.ts:1255-1269`): deliberate and
  documented.
- **Per-process audit memo**: settled, `doc-site-system.md:594-598`.
- **`markdownPages` on by default and `.nojekyll` always**: settled,
  `doc-site-system.md` "Markdown copies of pages".

---

## E. Unused, but not redundant

`tosijs-ui/site` exports 50 runtime names.

- **Imported by the 25 sibling repos: 10.**
  - `buildSite` (19 repos), `defineSiteConfig` (19), `devServer` (18);
  - `currentHolder` (3), `DEFAULT_BOOK_CSS` (2);
  - `describeHolder`, `extractDocs`, `saveDocsJSON`, `splitConditions`, `restampSite` (1 each).
  - (I grepped beyond the table, including dynamic `import()`: `tosijs-3d/bin/site.ts:74`.)
- **This repo's bins** add `buildEpub` and `EpubImageError` (`bin/build-book.ts`).
- **The other 38 are unused and duplicate nothing.**
  - 21 are in this scope.
  - The rest belong to build-lock, checklist, open-browser, data-store, single-source and
    highlight, which other reviewers have.

The ones that need a decision:

- **`generateSite` + `GenerateSiteConfig`.** A public low-level entry point that no consumer
  calls, with 4 options nothing sets (`llmsTxt`, `docsUrl`, `stylesUrl`, `localizedUrl`), 2 of
  which aren't honoured (A7 #16). Keep it as a documented seam (then fix the options), or make
  it internal at 1.20.
- **`auditDependencies`, `reportAudit`, `resolveAuditMode`.** The gate for a caller's own
  build loop. Nobody has one; `resolveAuditMode` is meaningless without the others.
- **The ePub-volume plumbing.** `listEpubVolumes` and `epubVolumeIdentity` have an adopter
  story ("link the books without re-deriving the filename", `epub-volumes.ts:15-17`), but the
  served `epub-volumes.json` meets that need at runtime. `attachCovers`,
  `printCoverManifestUrl`, `renderEpubDownloads` and `VOLUME_MANIFEST` have no adopter story.
- **`testReportVerdict`.** Keep it: #4178 (from tosijs) asks for a companion
  `awaitDocTestResults` beside it.

On configuration surface:

- 16 of `SiteConfig`'s 65 top-level fields are set by none of the 21 sibling configs: `lang`,
  `searchPlaceholder`, `altText`, `ignoreDocPaths`, `kind`, `exampleTabs`, `exampleView`,
  `exampleModules`, `exampleConsole`, `scriptUrl`, `strict`, `markdownPages`, `memoryLimitMb`,
  `idleTimeoutHours`, `preflight`, `trustLan`. Most are recent opt-ins. `strict` is unset
  everywhere, this repo included (#3106).
- Some may be set in a `bin/site.ts` rather than the config, so this is a floor on use, not
  proof.

### For #4341 (agent search vs Markdown copies): what the build already emits for agents

| Output | Where it is written | What it is |
|---|---|---|
| `/{slug}/index.md` | `generate-site.ts:899-901` (aliases: `:925-927`) | **A Markdown copy of each page already ships**, on by default (`markdownPages`), with `<link rel="alternate" type="text/markdown" href="index.md">` in the page head (`:615-619`). `noindex` pages get neither. The "Markdown copy" half of #4341 is done. |
| `llms.txt` | project root **and** `<outputDir>/llms.txt` (`orchestrator.ts:1638-1662`, `make-llms-txt.ts:187-267`) | llmstxt.org index in nav order. Each link is the page's `index.md` and each description is the page's own. The `- Docs:` link drops `basePath` (A1 #2). |
| `llms-full.txt` | `<outputDir>` only (`orchestrator.ts:1664-1673`, `make-llms-txt.ts:274-298`) | The whole indexed corpus as one markdown file, with metadata comments stripped and `Source: <url>` after each page. |
| `docs.json` | `<outputDir>/docs.json` (`generate-site.ts:1017`) | Every published doc's text and metadata (plus tjs bakes), cache-stamped. It is the only searchable index: search runs client-side over it (`doc-search.ts`). The build emits no search endpoint or prebuilt search index. |
| `sitemap.xml`, `robots.txt` | `generate-site.ts:1028-1063`, only with `baseUrl` | `noindex` pages left out, `lastmod` from git (`page-dates.ts`). The robots line drops `basePath` (A1 #1). |
| JSON-LD per page | `generate-site.ts:524-573`, only with `baseUrl` | `WebSite`/`TechArticle` (or `Book`/`Chapter`) plus `BreadcrumbList`. |
| `epub-volumes.json`, `version.json` | `orchestrator.ts:993-996, 2202-2216`; `orchestrator.ts:344-377` | The ePub manifest; build identity. |

---

## F. Numbers

- **Scope size.** 40 files, 12,034 lines:
  - 7,091 code;
  - 4,321 comment (36%);
  - 44 doc (`/*#`);
  - 578 blank.

  Tests for the area: 41 files, 7,020 lines. Measured with `bun <dir>/loc.ts`.
- **Largest files.**
  - `orchestrator.ts` 2,316 (38% comment). `buildSite` alone is about 1,665 lines
    (651-2315).
  - `epub.ts` 1,435.
  - `generate-site.ts` 1,170.
  - `site-config.ts` 943 (84% comment: it is the config reference).
  - `audit-guard.ts` 870.
  - `docs.ts` 795.
- **Configuration surface.**
  - `SiteConfig`: 65 top-level fields.
  - `tosijs-ui/site`: 50 runtime exports, 10 used by consumers.
  - `doc-site-system.md`, the adopter reference for this area, is 2,613 lines.
- **Ways to do the common jobs.**
  - Build a site: 1 entry point (`buildSite`), plus `devServer({ build })` and the low-level
    `generateSite`.
  - Build the library inside it: 4 (`emitLibrary`, `libraryTsconfig`, `libraryBundle`,
    `libraryBuild`).
  - Compose a site URL from `baseUrl`/`basePath`: 1 helper plus about 20 hand-written sites
    (A1; B "One implementation", item 1).
  - Launch a child process: 9 sites, 1 of them bounded.
  - Turn the dependency audit off: 4 (`audit: false`, `{ mode: 'off' }`, `TOSIJS_AUDIT=off`,
    `skipAudit`).
- **Corpus handling.** One `buildSite` parses `docs.json` at least 9 times, across the parent,
  `ensureSections`, the check child and each ePub child.
- **`generateSite` time on this repo's 82-doc corpus: 229 ms median.**
  - 89 ms of that is 330 rebuilds of the same nav tree.
  - About 55 ms is markdown rendered a second and third time.

  Measured with `render-cost.ts` and `nav-cost.ts`.
- **Board #1587 ("The ePub is not reproducible") looks stale.** ✔ `epub-repro.ts`: two builds
  of the same book a second apart gave `sha256: 51bd6f41b8cc48dc vs 51bd6f41b8cc48dc
  (identical)`. To settle it, rerun with a real corpus and a generated cover before closing.
- **Not finished.** Nothing in scope was skipped. I did not check out-of-scope callers of the
  copies beyond the greps cited (render.ts and live-example belong to other reviewers).
