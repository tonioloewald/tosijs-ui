# Lean plan: tosijs-ui, November 2026

> **Status: a plan for the owner to read. It changes no source.** The basis is `af13cd1ee` on
> `main`: 1.19.2 plus the unreleased on<Event> fix. It was read on 2026-11-28. Line numbers refer
> to that commit.
>
> **Method:** the `lean-plan` skill as drafted on the board (#4259). The draft isn't served yet,
> because the board does not accept skill text from tosijs-coding-practices until the owner tags
> it `custodian:tosijs-coding-practices`.
>
> **The evidence** lives in [`lean-plan-2026-11/`](lean-plan-2026-11/):
> - one report per area: `overlays-forms`, `data`, `icons-theme`, `layout-entries-bin-docs`,
>   `editor-live-example`, `doc-client`, `site-build`, `site-serve`;
> - [`phases.md`](lean-plan-2026-11/phases.md), which merges every phase 1 and phase 2 finding;
> - `BRIEF.md`, the method the reviewers followed;
> - `exports-before.json`, the runtime-export snapshot that phase 1 must leave unchanged.

## 1. In brief

1. **The review found 41 live defects. They are filed as cards (#4342–#4381, #4384), plus two
   upstream asks to tosijs (#4382, #4383) and three to consumer repos (#4385–#4387).**
   - **Fix these before 1.20.0:**
     - **Security:**
       - untrusted text reaches `innerHTML` through every tooltip `title` and the default
         `text/html` drop (D1, #4342);
       - dev-server request bodies are read whole before any size check (D38, #4379);
       - the checklist store deletes before its ownership check (D40, #4381).
     - **Silent corruption or silent loss:**
       - save to source writes an edit into the wrong example (D2, #4343);
       - a page can be unpublished by a fence that only illustrates a metadata block (D3, #4344);
       - `<tosi-month>` selects the wrong date anywhere west of UTC (D11, #4352);
       - `buildSite` publishes books with dead "Run this example live" links (D35, #4376);
       - `robots.txt` and `llms.txt` point crawlers and agents at the wrong URLs (D34, #4375);
       - a reader with site data blocked gets a doc site that never hydrates (D10, #4351).
     - **Failure reported as success:**
       - the adopter guide teaches a build script that exits 0 on a failed build, and four
         consumers copied it (D33, #4374);
       - `release-notes --check` turns its own `[break]` gate off on the path its error message
         recommends (D32, #4373).
   - **Then the rest, in 1.20.x patches.** Most are 1–10 line fixes. §4 lists them all.
2. **One cause sits under most of the defects: a rule written twice whose copies disagree.**
   - Some families, recounted:
     - fence and directive scanners: 6 sites in 5 files, beside the owner CLAUDE.md names;
     - "icon as string or element": 4 rules;
     - "is this a number?": 5 rules;
     - session teardown: 3 copies;
     - "is this a dev page?": 3 copies;
     - nav renderers: 3;
     - import-clause parsers: 2;
     - site URLs: about 20 hand-written compositions;
     - form-callback overrides: 14, of which 8 match the base class.
   - The project has stated "one owner per rule" in CLAUDE.md three times. It still drifts,
     because nothing enforces it.
3. **The single best lever is class-wide guard tests,** in the shape of
   `src/on-event-members.test.ts`, which this cycle added. Each turns a defect family into a
   failing test that covers new components automatically:
   - **(a) a fence-scanner guard** that fails on a fence regex outside the owners;
   - **(b) a form-contract test** that mounts every form-associated component and checks that
     `value` comes before connect, `change` fires once, `disabled` works and reset works;
   - **(c) a teardown test** that connects and disconnects each component N times and counts
     the listeners, observers and timers left behind.
4. **Phase 1 (no functionality removed) is 113 packages** (`phases.md` §1):
   - **47 merges where the copies disagree today.** Each closes or prevents a defect, so start
     here.
   - 19 merges where the copies agree today, 5 teardown, 9 dead-code, 15
     declarations-written-twice, 11 structure and 6 harness packages, plus docs.
   - **The four biggest structural debts:**
     - `buildSite`, one function of 1,665 lines;
     - `devServer()`, 2,897 lines, whose 807-line request handler is the security boundary and
       has no unit test;
     - `createDocBrowser`, 2,206 lines;
     - `<tosi-example>`, 2,350 code lines.
5. **Phase 2 (one way to do each thing) is 40 rows** (`phases.md` §2).
   - The headline: **all 33 `xin*`/`Xin*` root aliases have zero uses in the 26 sibling repos,
     and only 5 of them warn.**
   - `migrating.md` says most of them warn, and it promises removal only "in a future major",
     which this project doesn't have.
6. **Decisions for the owner before 1.20.0.** Each has a recommendation in §6.
   - **(E1)** Retire the `xin*` aliases? Recommendation: warn in 1.20.0, delete in 1.21.0.
   - **(D13)** Rename `TosiCrud.remove()`, which overrides `Element.remove()`. Recommendation:
     yes, in 1.20.0.
   - **(E2)** Close the `./*` wildcard over `doc-system/site/*`, which makes 90 `dev-auth`
     internals public. Recommendation: yes, in 1.20.0.
   - **(E7)** Make `'memory'` routing the default for `createDocBrowser`. Recommendation:
     yes, in 1.20.0.
   - **(D12)** What does `visible: true` mean on a table column? Recommendation:
     `visible !== false`.
   - **(D26)** Pick accent text by WCAG contrast. Recommendation: yes; it is a patch on the
     1.16.15 ground.

## 2. How to read the evidence

- **Who read what.**
  - Eight reviewers each read one area line by line. Each says exactly what they only skimmed:
    see §8, and the "Not finished" notes in each report.
  - A ninth merged phases 1 and 2 across the areas, and re-opened every cited `file:line`. It
    dropped one item (`select.ts:448` is not dead) and corrected six counts or paths.
  - I read the barrel, the entry points and every report's defect section. I re-checked the
    defects marked **checked** below against the code, and re-ran D11 myself.
- **What ✔ means.** The reviewer executed a reproduction: a unit check, a throwaway script, or
  `bun test`, under happy-dom where a DOM was needed. The scripts were throwaway and are not
  kept; each report gives the input and the output.
  - **read** means it was inferred from the code.
  - No browser was run: Playwright and dev servers were off-limits, so eight reviewers would not
    fight over ports. So:
    - "examples that throw" is by reading only;
    - the modal top-layer case (D16) is unverified;
    - so are the touch paths (D23) and `resolveColor`/oklch (D26).
- **What the usage counts can and can't prove.**
  - Imports were counted by name across the 25 sibling repos that depend on tosijs-ui, skipping
    their `node_modules`, `dist` and `docs`. A count shows which spelling won.
  - **A count does not prove a removal is safe.** About 20 files use namespace imports
    (`import * as …`) or the iife, which the count can't see into. Users outside these repos are
    invisible.
  - Phase 2 rows are proposals for the owner, not conclusions.

## 3. The numbers that frame it

| measure | value |
| --- | --- |
| source (non-test `src/` + `bin/`, excluding generated `icon-data.ts`) | 844 files: 49,477 code, 12,173 doc (`/*#`), 18,539 comment, 5,507 blank lines |
| of which generated per-icon modules | 641 files, 2,272 code lines |
| tests | 32,139 lines of unit tests; 79 Playwright specs |
| largest files | `data-table.ts` 4,626; `live-example/component.ts` 3,894; `site/dev-server.ts` 3,717; `schema-form.ts` 3,001; `doc-browser.ts` 2,894; `site/orchestrator.ts` 2,315; `site/dev-auth.ts` 2,023; `menu.ts` 1,960 |
| root runtime exports | **282**, of which 33 are `xin*`/`Xin*` aliases |
| root exports any consumer imports by name | **33 of 282** |
| `tosijs-ui/site` runtime exports | 50, of which 10 are imported. 19 repos use it, nearly all for `buildSite`, `defineSiteConfig` and `devServer` only |
| reachable by accident through `./*` | every internal module, e.g. `tosijs-ui/doc-system/site/dev-auth`: 90 runtime exports (✔ checked) |
| payload | root barrel 106.5 kB gzip against its 110 kB ceiling (`src/index.test.ts`); `dist/iife.js` 546,394 B gzip (`dist-sizes.json`, 1.19.2), with no ceiling |
| cost of a root import against the subpath | one component: about 107 kB gzip entry through the root; 15.5 kB for tabs, 2.3 kB for splitter and 1.1 kB for sidenav through the subpath (✔ LB) |

**Ways to do the most common task, per area** (`phases.md` §5):

| task | ways |
| --- | --- |
| pop a floating element | 5 public entry points, with 4 icon-argument rules and 2 shortcut grammars |
| put an array in a table | 2. Sorting from code: 4; selecting: 3 |
| draw an icon | 6 with a DOM, 4 without |
| apply a theme | 6, which write 3 style ids, 2 of which collide |
| import `<tosi-tabs>` | 12 working ways, 1 recommended; the path chosen changes the bundle 7× |
| compile and run an example against a context | 6, plus 2 build-side |
| link to a doc page | 4 |
| compose a site URL | 1 helper and about 20 hand-written sites |
| gate a dev-server endpoint | 5. "Inside root": 12 |

**Copies, recounted** (`phases.md` §5):
- regex escape: 14 identical copies plus 2 glob variants;
- HTML escape: 13 functions in 9 files, with 4 behaviours;
- path containment: 10 lexical checks plus 2 through symlinks;
- process launches in `site/`: 33, of which 5 have a time limit and 0 end their grandchildren;
- FNV-1a: 6 copies;
- `outputDir ?? 'docs'`: written out 14 times.

## 4. Fix first: defects found on the way

They are neither cleanup nor redundancy. Every one is on the board, with its evidence and its
fix. **checked** means I re-read it against the code myself.

| D | defect | evidence | where | card | patch alone? |
| --- | --- | --- | --- | --- | --- |
| D1 | Untrusted text reaches `innerHTML`: tooltip titles, the default `text/html` drop (whose type check is also reversed), the build-status `<script>` | ✔, checked | `tooltip.ts:172`, `drag-and-drop.ts:420`, `site/dev-server.ts:1682` | #4342 | **yes** |
| D2 | Save to source writes an edit into the wrong example (a regex fence scanner) | ✔, checked | `live-example/save-to-source.ts:65` | #4343 | **yes** |
| D3 | A fence illustrating `<!--{"hidden":true}-->` unpublishes the page; a wrapped metadata block is ignored; the directive grammars disagree | ✔ | `site/docs.ts:315-329`, `book-target.ts:265`, `site/single-source.ts:367` | #4344 | **yes** |
| D4 | Search heading ids and the editor Preview use their own copies of the renderer's rules | ✔ | `doc-search.ts:110`, `doc-browser.ts:1718` | #4345 | no |
| D5 | The hydrated nav loses its landmark and `aria-current` | ✔, checked | `doc-browser.ts:2179` | #4346 | **yes** |
| D6 | Navigating to the doc already showing re-renders the article and re-runs its examples | ✔, checked | `doc-browser.ts:1626` | #4347 | **yes** |
| D7 | Doc browser: no dispose; global bindings close over one instance; `hidden` honoured by 1 of 3 navs; legacy links lose their `#hash`; ASCII footnote ids; dev-page predicates | ✔ / read | `doc-browser.ts`, `routing.ts:113`, `render.ts:322` | #4348 | no |
| D8 | Concurrent examples quote each other's source in errors; `toEqual` passes for different Map/Set/Date | ✔ | `test-harness.ts:59`, `execution.ts:23` | #4349 | **yes** |
| D9 | Import rewriting: `as` gives a SyntaxError, `default, { named }` is refused, `import type` throws | ✔ | `live-example/code-transform.ts:239` | #4350 | **yes** |
| D10 | With site data blocked, live-example's import throws, so the doc site never hydrates | ✔, checked | `live-example/component.ts:941` | #4351 | **yes** |
| D11 | `<tosi-month>` mixes UTC and local dates: wrong date west of UTC | ✔, re-run | `month.ts:167` | #4352 | **yes** |
| D12 | `<tosi-table>`: `aria-sort` inverted; "Sort Ascending" toggles; "Hide Column" disabled on inferred columns; a dotted `prop` throws; pinned rows in single-select | ✔ | `data-table.ts:3266, 4197, 4224, 3161` | #4353 | **yes** |
| D13 | `TosiCrud.remove()` overrides `Element.remove()`; a failing `list` is an unhandled rejection; a late schema never reaches the table | ✔, checked | `crud.ts:725, 496, 964` | #4354 | **yes** (the rename is for 1.20.0) |
| D14 | `<tosi-filter>`: tags case-sensitive on the data side; negated "any field" keeps rows; moving it wipes it | ✔ | `filter-builder.ts:188-619` | #4355 | small |
| D15 | Router: hash `navigate()` renders twice and erases hashState's keys; a malformed `%` throws | ✔ | `router.ts:257, 359, 370` | #4356 | **yes** |
| D16 | Popups never learn `<tosi-float>` removed itself, so the select stays `aria-expanded`; possible modal top-layer issue | ✔ / read | `menu.ts:1621`, `float.ts:251` | #4357 | **yes** |
| D17 | `matchShortcut` throws on a keydown with no `key`; ⌥ and ⇧+digit shortcuts never match | ✔ | `match-shortcut.ts:81` | #4358 | **yes** (one line) |
| D18 | Click menus ignore `filterForClick` and `hideDisabled`; the four row builders disagree (#3968) | ✔ / read | `menu.ts:1587, 1147-1415` | #4359 | small |
| D19 | An icon given as "string or element" is resolved 4 ways; 3 are wrong | ✔ | `notifications.ts:583`, `select.ts:756`, `segmented.ts:428` | #4360 | **yes** |
| D20 | The value/change/disabled contract is broken in select, password-strength, rich-text, color-input, segmented, rating and mapbox | ✔ | (per component, see the card) | #4361 | **yes** |
| D21 | `closeOnBackgroundClick` closes on any click inside the dialog | ✔ | `dialog.ts:312` | #4362 | **yes** |
| D22 | Converting tooltips strips the `aria-label` from menu and select triggers | ✔ | `tooltip.ts:229` | #4363 | **yes** |
| D23 | Smaller: tag doesn't re-render; select filter and nested check; form `fields`; touch drags never fire `change` | ✔ / read | various | #4364 | no |
| D24 | `makeIcon` overwrites the caller's parts; `<tosi-icon>` re-declares variables it should inherit; the `square` placeholder | ✔, checked | `icon-core.ts:274, 559, 443` | #4365 | **yes** |
| D25 | `tosijs-make-icons`: ids stripped but `url(#…)` kept (live in tosijs-3d); classes by path substring; `--help` writes files; locale casing (#4319) | ✔, checked | `bin/make-icon-data.js:264, 276, 304, 118` | #4366 | **yes** |
| D26 | Theme data writes `-2x`-style variables under another name; accent text by luma, not WCAG | ✔, checked | `theme-data.ts:285`, `theme.ts:226` | #4367 | **yes** |
| D27 | `groupVariables` throws on `--`; the documented localization protocol breaks localization; live theme stacks observers | ✔ | `theme-discovery.ts:243`, `localize.ts:481`, `live-theme.ts:172` | #4368 | small |
| D28 | `.js` spellings of remapped subpaths resolve to the wrong file (`doc-browser.js`) or to nothing | ✔, checked | `package.json` `exports` | #4369 | **yes** |
| D29 | `<tosi-tabs>`: two "is a tab body" rules, so render throws with a named `after-tabs` control; author ids clobbered | ✔ | `tab-selector.ts:372, 396, 405` | #4370 | **yes** |
| D30 | `<tosi-sidenav>` leaks its resize listener and never animates after a reconnect; 3D, lottie and map have no teardown | ✔ / read | `side-nav.ts:177, 199` | #4371 | sidenav |
| D31 | `scriptTag()` ignores a loaded global and never rejects; the carousel loops with `loop` off | ✔ | `via-tag.ts:82`, `carousel.ts:172` | #4372 | small |
| D32 | `release-notes --check --version=…` turns off the `[break]`-in-a-patch gate | ✔ | `bin/release-notes.ts:169` | #4373 | **yes** |
| D33 | The adopter guide's build script exits 0 on a failed build; 4 consumers copied it | ✔, checked | `src/docs/adopting-the-doc-system.md:56`, `doc-site-system.md:83` | #4374, #4385–#4387 | **yes** |
| D34 | Site URLs are composed per call site: robots.txt and llms.txt drop `basePath`; a trailing slash doubles | ✔, checked | `site/generate-site.ts:1060`, `site/make-llms-txt.ts:230` | #4375 | **yes** |
| D35 | buildSite's ePub never receives `liveExamples`, so books get dead links | ✔, checked | `site/orchestrator.ts:152` | #4376 | **yes** |
| D36 | A failed ePub leaves `.epub-build/` in the output; cleanup only on success; audit reach; a misplaced `.d.ts` JSDoc | ✔ / read | `site/epub.ts:1203`, `site/audit-guard.ts:516` | #4377 | the first, yes |
| D37 | Site build, smaller: `srcset` rebasing, dead `generateSite` options, the llms-full title, a predictable `/tmp` payload | ✔ / read | various | #4378 | no |
| D38 | Request bodies are read whole before the size check; the real cap is Bun's 128 MB | ✔ | `site/checklist-handler.ts:83`, `dev-server.ts:1376, 1482, 1853, 2921` | #4379 | **yes** |
| D39 | Child-process timeouts don't bound the wait; a git save reports a false failure | ✔, checked | `site/bounded-child.ts:20`, `site/data-store.ts:282` | #4380 | **yes** |
| D40 | Evicted sessions leak two maps; the checklist store checks ownership after deleting | ✔ | `site/dev-auth.ts:796`, `site/checklist-store.ts:267` | #4381 | **yes** |
| D41 | Five "is a number" rules give five answers; sorting ignores `setLocale()` | ✔ | `value-renderer.ts:136`, `natural-compare.ts:42` | #4384 | no |

**Upstream, filed in tosijs:**
- #4382: `Color.darken()` leaves a stale cached HSL. This is why the two dark-theme derivations
  disagree.
- #4383: a path read through a binding returns inherited members, so a `constructor` column
  renders `function Object()`.

**Extended existing cards:**
- #4324: the inherited-member hole is wider than `getByPath`;
- #4336: rich-text details, and the four components its list misses;
- #4319: the icon half moved to #4366;
- #4077: generalised in #4379;
- #1542: `--stop` signals an unchecked pid;
- #3226: footnote ids repeat too.

### The causes, and what each fix sketch shares

1. **A rule written twice, with copies that disagree.** This is the majority:
   D2, D3, D4, D5, D7, D9, D12, D13, D17, D18, D19, D20, D23, D26, D29, D34, D35, D40, D41.
   - The fix is the matching phase 1 merge: P1/P2/P18/P19 are the lexer, P3 is `siteUrl`,
     P16 the import parser, P25 `toIcon`, P31 form callbacks, P33 `isNumeric`.
   - **So most patches are best written as the merge itself, not as a third copy.**
2. **Untrusted text as markup (D1).**
   - One DOM-free escaping module (P12).
   - `scriptJson()` for JSON in `<script>` (P13).
   - `tosijs-kilpi` for HTML, which is already a dependency.
3. **A bound checked after the work it bounds (D38, D39).**
   - `readBodyCapped()` plus `maxRequestBodySize` (P6).
   - One bounded spawn that kills the process group and stops waiting at the deadline (P5).
4. **Connect with no matching disconnect (D7, D16, D20, D22, D30).** Teardown packages T1 and
   T2, and the teardown guard test from §1.
5. **Environment that CI doesn't have:**
   - blocked storage (D10);
   - a non-UTC time zone (D11);
   - a Turkish locale (D25);
   - Node's resolver rather than Bun's (D28).

   Each fix adds the lane that would have caught it: a `TZ=America/New_York` run of the month
   tests, a throwing-`localStorage` import test, and `package-exports.test.ts` iterating
   `exports` under Node.
6. **Failure reported as success, or the reverse (D32, D33, D36, D39).** This is the repo's own
   fail-hard rule. Consider making the `tosijs-site` bin, or a `runSite(config)` helper, own the
   exit code, so an adopter has nothing to forget.

## 5. Phase 1: no functionality removed

### The guard every package must pass

- **All four lanes:** `bun test`, `bun run test-browser`, `bun playwright test` and
  `bun run test-consumer`.
- **The type surface:** `bunx tsc --noEmit` and `bun run typecheck-guards`.
- **The runtime exports:** each entry point's runtime exports must equal
  [`exports-before.json`](lean-plan-2026-11/exports-before.json), taken from the working tree's
  `dist/` at `af13cd1ee` and keyed by export-map entry. Re-take the snapshot with
  [`export-snapshot.ts`](lean-plan-2026-11/export-snapshot.ts), whose header gives the command,
  and diff it. ✔ Re-taking it at `af13cd1ee` reproduces the file exactly.
- **The declarations:** `git diff dist/**/*.d.ts` may show only internals deleted on purpose.

### The packages

All 113 are in [`phases.md` §1](lean-plan-2026-11/phases.md). Each gives what it merges or
deletes, with `file:line`, what the merged version must keep, the tests it needs, and which
reports raised it. **They become cards once the owner has read this plan.** In order of value:

- **Merges where the copies disagree (P1–P47).** Start here: each one is a defect's fix or its
  prevention.
  - Front of the queue:
    - P1/P2: the fence and directive scanners, onto the lexer;
    - P3: `siteUrl`;
    - P4: child options built once;
    - P5: one bounded spawn;
    - P6: capped body reads;
    - P8: `isInside` and `realInside`, two functions with no mode flag;
    - P12/P13: escaping;
    - P14: a guarded path get/set;
    - P16: one import-clause parser;
    - P24/P25: icons;
    - P26: the float announces its own removal;
    - P27/P28: one menu-row builder, one shortcut grammar;
    - P31: form callbacks go to the base class;
    - P33: one `isNumeric`.
- **Merges that agree today (P48–P66).**
  - Biggest by count: `escapeRegExp` (14 copies), `slugify` (3), FNV-1a and project temp paths
    (6), nav-tree helpers, config defaults resolved once (`outputDir ?? 'docs'` ×14).
  - P66, one dark derivation, is **blocked** on tosijs #4382.
- **Teardown and caches (T1–T5):**
  - release on disconnect what connect added, across 10 components (T1);
  - once-guards and a `createDocBrowser().dispose()` (T2);
  - per-example timers that run when nothing is open (T3);
  - server-side growth: `triggers`, the haltija queue, session maps (T4).
  - The by-design globals are listed so nobody "fixes" them.
- **Dead code (D1–D9 in phases.md):** internal only. Anything the `./*` wildcard reaches needs
  a check first.
- **Declarations written twice (W1–W15).** Mostly `as const` lists that should drive their
  unions (`liveExamples`, `kind`, `Dialect`, source slots), plus `GenerateSiteConfig` as a
  `Pick<SiteConfig, …>`.
- **Structure (S1–S11), one file per change:**
  - split `buildSite` into named passes over **one in-memory corpus** (`docs.json` is parsed 6
    times today);
  - extract `createRequestHandler(ctx)` from `devServer`, so the security boundary can be unit
    tested (#4188);
  - split `dev-auth.ts`, `createDocBrowser` and `<tosi-example>`.
- **Test and build harness (H1–H6):**
  - derive the test-setup globals from the happy-dom Window; `CSS`, `location` and `history`
    are missing today, and that is why `CSS.escape` paths are untestable (#3229);
  - shared `withTempDir`, `tick`, `waitUntil` and `mount` helpers;
  - smoke-consumer iterates `exports`;
  - the component coverage gaps are listed.
- **Docs, with no API change (`phases.md` §1h, by file).** The ones that teach something wrong
  today:
  - the exit-0 build script (D33);
  - `migrating.md` says most `xin*` aliases warn (5 of 33 do), names a `<live-example>` tag
    that doesn't exist, and stops at 1.16.21;
  - Using-Components' localization example (5 header rows where the parser reads 4);
  - the localization protocol sample (D27);
  - README and Using-Components teach only root imports, which cost 7–47× a subpath;
  - several `doc-site-system.md` claims: non-TTY preflight, "every five minutes", "every
    response carries no-store", a "7-character" link code that is 8.

## 6. Phase 2: one way to do each thing

All 40 rows, and the `@deprecated` inventory, are in [`phases.md` §2](lean-plan-2026-11/phases.md).
**Each row waits for the owner's yes, and becomes a card only then.**

### Finish what's already promised

- There are 80 `@deprecated` tags, grouped into 25 rows. **At runtime, only the 5 wrapped
  creators warn** (`xinRating`, `xinSegmented`, `xinSelect`, `xinTag`, `xinTagList`), plus
  `richText`, `B3d` and the `<tosi-code>` ACE shims.
- The other 28 `xin*` aliases are identical, silent re-exports. `migrating.md` claims
  otherwise.
- Still in use: `TabSelector`/`tabSelector` and `SideNav`/`sideNav` (tjs-lang,
  loewald-dot-com), and `MarkdownViewer`/`markdownViewer`, which is used **more than its
  survivor** (tjs-lang, loewald-dot-com, tosijs-product).
- The `.xin-menu*` classes are used by kith-email's CSS (3 rules).
- **Legacy with no `@deprecated` at all:**
  - the `--xin-icon-*`/`--icon-*` fallbacks;
  - six select variables that are defined and never read;
  - `--carouse-button-width`, a typo;
  - `routing="internal"`;
  - the boolean `iframe` attribute;
  - `createThemeWithLegacy`.

### New candidates (grouped; the full table is `phases.md` §2)

| task | redundant spelling | same as | uses | notes |
| --- | --- | --- | --- | --- |
| name a component | 28 silent + 5 warning `xin*` aliases | `tosi*` (✔ `===`) | 0 | E1 decides when |
| tabs, sidenav, markdown | `TabSelector`, `SideNav`, `MarkdownViewer` (+ creators) | `TosiTabs`, `TosiSidenav`, `TosiMd` | 2–3 repos each | warn first; migrate tjs-lang, loewald-dot-com, tosijs-product |
| reach site internals | `tosijs-ui/doc-system/site/<module>` via `./*` | `tosijs-ui/site` | 0 | `"./doc-system/site/*": null` (E2) |
| delete a crud record | `TosiCrud.remove()` | a new `deleteRecord()`, leaving `remove()` to the DOM | 0 | a collision, not a redundancy (D13) |
| run code against a context | `executeCode` | `executeInline` (more guards) | 0 | the weaker copy |
| live theme | `liveTheme`, `enableLiveTheme`, `disableLiveTheme` | `applyTheme` / the editor | 0 | buggy teardown (D27); E6 |
| editor theming | `<tosi-code>` `.theme`/`.options`/`.ace` | CSS variables, `editor` | 0 | warn-once no-ops, twelve minors old |
| style a menu | `.xin-menu*` classes | `.tosi-*` | kith-email | would break it: migrate first |
| tosijs namespace | `export * as tosijs` on the root | `import * as tosijs from 'tosijs'` | 0 | also puts `xinjsui.tosijs` on the CDN global |
| everything else | 30 smaller rows: CSS variables, re-exports, dead options | | 0 | `phases.md` §2 |

**Contested:** `preflight: false` against `'off'`. Recommendation: keep both, as `audit: false`
does. It isn't worth a break.

### Not proposing

`phases.md` §3 lists each of these with where it was settled:
- **Settled in CLAUDE.md:**
  - the barrel exclusions;
  - no `sideEffects: false`;
  - the CDN-only iife;
  - CodeMirror and Prism as dependencies;
  - the fence owners;
  - child processes for builds;
  - `null` defaults;
  - the lazy global installers;
  - the per-icon modules;
  - the published test-setup.
- **A different job:** `popMenu`, `<tosi-menu>` and `popDropMenu`; `<tosi-md>` against
  `renderDocMarkdown`; `servedForDevelopment` against `isLocalhost`; `makeSorter` against
  `naturalSorter`.
- **Not worth a break by itself:** renaming off-convention classes such as `SvgIcon`,
  `LiveExample` and `MapBox`, because a rename adds a spelling.

### Unused, but not redundant: the decisions

The full list is E1–E15 in `phases.md` §4. These need an answer for 1.20.0:

| # | decision | recommendation |
| --- | --- | --- |
| E1 | The docs promise `xin*` and `B3d` stay "until a future major", but the policy has no separate major | **Make all 33 aliases warn once in 1.20.0, and fix `migrating.md` to say the next minor deletes them. Delete in 1.21.0.** Zero uses found, but namespace and CDN users are invisible, so warn first |
| D13 | `TosiCrud.remove()` | **Rename it in 1.20.0** (`[break]`). The override is a live bug and crud has no consumers |
| E2 | The `./*` wildcard exposes every site internal | **`"./doc-system/site/*": null` in 1.20.0** (`[break]`). Zero consumer imports, and it is the dev server's security boundary |
| E7 | `createDocBrowser` defaults to `'query'` routing, which rewrites the host page's URL | **Default to `'memory'` in 1.20.0** (`[break]`). There are 0 direct callers, and the docs pitch it as the embed API |
| E6 | `liveTheme` and friends | Same as E1: warn in 1.20.0, delete in 1.21.0 |
| D12 | What `visible: true` means on a table column | **`visible !== false` enables Hide**, which matches the docs |
| D26 | Accent text by WCAG instead of luma | **Yes, as a patch** (the 1.16.15 ground: it moves some colours, always toward AA) |
| E3–E5, E8–E15 | internals in the root barrel, surface that does nothing, unread theme variables, live-example exports, naming gaps, the symlink policy | Each has a recommendation in `phases.md` §4. None blocks 1.20.0 |

### How to run phase 2

1. **A minor deprecates and breaks nothing.** Each spelling warns once and names its
   replacement, and the docs teach only the survivor. In this project, 1.20.0 is that minor for
   the aliases.
2. **Migrate the consumers, with a codemod per row:**
   - tjs-lang and loewald-dot-com for `TabSelector`/`SideNav`/`MarkdownViewer`;
   - tosijs-product for `MarkdownViewer`;
   - kith-email for `.xin-menu*`.
3. **The next minor deletes,** one commit per category. Per CLAUDE.md, a minor may remove;
   there is no separate major.

## 7. Order of work

| step | contains | release |
| --- | --- | --- |
| 1 | The "before 1.20.0" defects in §1: D1, D2, D3, D10, D11, D32, D33, D34, D35, D38, D40. Write each as its merge package where one exists (D2 as P1, D3 as P2, D34 as P3, D38 as P6). Add the TZ, blocked-storage and Node-exports lanes they need | 1.20.0 |
| 2 | The owner-approved 1.20 breaks: the crud rename (D13), `doc-system/site/*` closed (E2), memory routing (E7). Make the `xin*` and live-theme spellings warn once. Fix the docs that teach something wrong (§5 docs) | 1.20.0 |
| 3 | The nine-lens `/pre-release-review`; 1.20.0 is a final minor | 1.20.0 |
| 4 | The remaining defects, each written as its merge package: D5, D6, D8, D9, D12, D15–D22, D24–D26, D28–D30, D39, then the medium and low ones | 1.20.x patches |
| 5 | The three guard tests (§1, item 3), as soon as the defects they cover are fixed, so the suite is green when each lands | 1.20.x |
| 6 | The rest of phase 1, in `phases.md` order, one commit per package, each passing §5's guard. Structure (S1–S4) after the merges it would otherwise conflict with | 1.20.x |
| 7 | Migrate the consumers (phase 2, step 2) | their repos |
| 8 | Delete the approved phase 2 spellings, one commit per category | 1.21.0 |

## 8. What this did not cover

- **No browser runs.** Doc examples that might throw were judged by reading. Also unverified:
  - the modal top-layer case (D16);
  - touch drags (D23);
  - `resolveColor` and oklch dark mode (D26);
  - the parent-observer merge (P65), which needs a check against `page-layout.pw.ts`.
- **Only sampled:**
  - the 641 per-icon modules (the generator was read instead);
  - the SVG-processing half of `bin/make-icon-data.js` (lines 156–665, grepped);
  - `bin/tunnel.ts` and `bin/resolve-site-config.ts` from the dev-auth side.
  - In several areas the reviewers read test bodies only by their names. The `tests/*.pw.ts`
    specs weren't reviewed.
  - `doc-site-system.md` §1439–1872 (tunnel, global keys, short links) wasn't read in full, so
    stale claims there are unchecked.
- **Consumers were counted, not read.** The counts are imports by name across 25 repos.
  Namespace imports, the iife and anyone outside these repos are invisible.
- **Nothing was prototyped.** The merge packages are designs. Each must prove itself against
  §5's guard.
- **Vendored code** (the `JSONSchema` type) and `CHANGELOG.md` were not reviewed.
