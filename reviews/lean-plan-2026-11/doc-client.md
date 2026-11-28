# Lean review: doc-client

Scope: `src/doc-browser.ts`, `src/doc-browser-entry.ts`, and every non-test `.ts` directly in
`src/doc-system/`: 29 files, 9,928 lines. That count includes `test-completion.ts`, which the
brief's list left out but which sits in the directory. Basis is `af13cd1ee`. I read every file
line by line. Nothing was skimmed.

✔ marks something I ran. The scripts are in `…/scratchpad/lean/doc-client/`, and each one ran
from `~/tosijs-ui` as `bun <script>`, or as
`bun --preload ./src/test-setup.ts <script>` when it needs a DOM. Anything without ✔ is "read".

---

## A. Defects

### A1. Search builds heading ids with a different lexer and walk than the renderer
**Cause:** `doc-search.ts:110-128` (`docHeadings`) uses the global `marked` and walks top-level
tokens only. The renderer uses `docMarked`, which has the wikilink and footnote extensions, and it
stamps an id on every heading, including headings inside blockquotes and lists
(`render.ts:229-235`). Both sides share `HeadingIds`, so the counters drift apart.

- ✔ `headings.ts`: 4 of 5 cases disagree.
  - `> ## Note` followed by `## Note`: the page has `note` and `note-1`, and search links to `note`.
  - The same happens with a heading inside a list item.
  - `## See [[Other Page]]`: the page has `see`, search has `see-other-page`.
  - `## Caveats[^1]`: the page has `caveats`, search has `caveats1`.
- Effect: a palette section hit lands on the wrong heading or on nothing.
- Fix: derive the headings from the renderer's own lexer and its `allHeadings` walk
  (`render.ts:146`). Keep doc-search's try/catch.
- Related, same family: `heading-id.ts:16-22` `headingText` reads `token.text`. Custom inline
  tokens (wikilink, footnoteRef) have none, so a page id drops a wikilink's label.
  `## See [[Other Page]]` gets `see` (✔ in the same run).
- No card found. A small patch, worth it on its own only weakly. Better folded into B2.

### A2. The source editor's Preview uses its own copy of the extraction rule
- **Where:** `doc-browser.ts:1718-1722` (`docMarkdownFromSource`), commented as a "pure mirror of
  docs.ts extraction".
  - It uses the unanchored `/\/\*#[\s\S]+?\*\//g`.
  - The extractor uses the line-anchored `/^[ \t]*(\/\*#…)/gm` (`site/docs.ts:565`).
- ✔ `preview.ts` (both regexes copied verbatim):
  - On `src/doc-browser.ts` the preview finds 2 blocks where the build finds 1. It appends
    `` `. `[ \t]*` allows the indented fences… `` from the mid-line mention at `doc-browser.ts:179`.
  - On `site/editable-sources.ts` the preview invents a doc where the build has none.
- Read, three more divergences:
  - `.md` previews skip the frontmatter strip (`docs.ts:531`).
  - `.tjs`/`.ajs` previews drop `/# … #/` doc comments (`docs.ts:574-600`).
  - Insets and conditional text are left unresolved.
- Same closure: `editorModeFor` (`1706-1713`) opens `.tjs` as `typescript` and `.ajs` as
  `javascript`, though `<tosi-code>` has `tjs` and `ajs` modes (read).
- Not worth a patch alone, since it only shows up in a dev editing session. Fix it with B1.

### A3. After hydration the nav loses its landmark and its current-page marker
**Cause:** two renderers of one nav, `generate-site.ts:214-261` (an HTML string) and
`doc-browser.ts:2084-2207` (DOM).

- The static page has `<nav class="doc-nav" aria-label="Documentation">` and `aria-current="page"`
  (`generate-site.ts:237,260`).
- Hydration replaces it with a `div.doc-nav.-live` in the sidenav's `nav` slot. `applyStatus`
  (`2179-2188`) toggles only the `current` class.
- ✔ `browser.ts` (path routing): `<nav>` elements 0, `[role=navigation]` 0, `[aria-current]` 0,
  `.doc-link.current` 1.
- So every hydrated page drops its navigation landmark and current-page cue for assistive
  technology.
- Fix: give the nav div `role="navigation"` and the aria-label, and toggle `aria-current` in
  `applyStatus`.
- The list ids also differ (`tosi-nav-N-slug` against `tosi-nav-slug`). That one is harmless.
- **Worth a patch** (accessibility, a few lines). No card (#3575 is a different axe rule on this nav).

### A4. `Doc.hidden` is honoured by 1 of the 3 runtime navs
- ✔ `hidden.ts`: query nav shows `["Home"]`; memory and path navs show `["Draft","Home"]`.
- `continueTarget` (via `buildNavTree`, `doc-browser.ts:1504`) can also link to a hidden doc.
- Built sites never contain hidden docs (`docs.ts:718` drops them), so only a
  `createDocBrowser({ docs })` with a hand-built corpus is affected.
  - The doc-browser's `Doc` type documents `hidden` (`:401`).
- Low. Filter in `buildHierarchicalNav`.

### A5. Navigating to the document already showing re-renders the whole article
- **Where:** `go()` (`doc-browser.ts:1626-1668`) always calls `navigateTo`, which runs
  `docContent.innerHTML = …`. The popstate path deliberately skips that for the same document
  (`1186-1191`, #152).
- ✔ `same-page.ts`: clicking `/guide/#usage` on `/guide/` replaces the heading element, in memory
  and path routing alike.
- Effect: a palette section hit on the current page (`openDoc` → `go`, `1042-1058`), or a
  `/same/#h` or `?same.md#h` link, destroys and re-runs every live example. Inline example edits
  are lost, and the scroll resets before it scrolls to the target.
- Fix: when the filename is unchanged, update the URL and scroll only.
- **Worth a patch.** Not #2872, which is about push against replace.

### A6. Global state is written per instance
**Cause:** the factory mutates registries shared by the whole page.

- `bindings.docLink/current/testStatus` (`doc-browser.ts:999-1024`) go into tosijs's global
  registry and close over this instance's `hrefFor`.
  - ✔ `browser.ts`: after a query browser is created, `docLink` gives `?guide.md`. Once a memory
    browser exists, the same binding gives `/guide/`.
  - Only the flat (query) nav reads these bindings, so a query-routed page that embeds another
    browser gets wrong hrefs on rows bound later. Low.
- `StyleSheet()` ×4 per call (`2340-2345`, never deduped). ✔ `styles.ts`: 3 browsers leave 12
  `<style>` elements. #4179 (StyleSheet dedupes by id from tosijs 1.10.12) would cure it.
- `doc-system.ts:406` registers the generic global key `prefs`. That is against the project's own
  unique-key rule, and it is re-registered on every connect (see B4). Latent: none of the 25
  consumer repos registers `prefs` (grep).

### A7. Two "is this a dev page?" rules disagree
- The background runner runs wherever `servedForDevelopment()` is true: localhost, the LAN, or the
  tunnel (`live-example/dev-served.ts:16`).
- Its results are POSTed to `/report` only when `isLocalhost` (hostname `localhost`/`127.0.0.1`,
  `doc-browser.ts:873,885-887`).
- A third copy lives in `live-example/component.ts:936`. None of the three accepts `[::1]`, though
  the dev cert covers it.
- So on the tunnel or LAN the whole corpus runs and its report goes nowhere.
- Read. It may be intended, so a remote reader cannot overwrite the single kept report (#3962).
  Settle it by deciding which rule applies and writing the reason next to the predicate. Not
  patch-worthy alone.

### A8. The build's legacy-link rewrite drops `?file#heading`
**Cause:** four copies of "a legacy `?filename` link": `routing.ts:113` `rewriteDocLinks`,
`routing.ts:127` `legacyQueryPath`, `doc-browser.ts:757-762`, and `site/epub.ts:329`.

- ✔ `legacy-links.ts`: `rewriteDocLinks` leaves `href="?menu.ts#popmenu"` and
  `/?menu.ts#popmenu` untouched, because its `[^"&=]+` capture swallows the hash.
  - The ePub copy splits the hash first and matches.
  - The client copy parses with `URL` and resolves to `/menu/`.
- So the static HTML (no-JS readers, crawlers) keeps a relative `?menu.ts#…`, which resolves to
  the current page.
- Zero such links in this corpus today. Low. Fix it with B5.

### A9. Footnote anchors use the ASCII slug
- **Where:** `render.ts:322,404` use `routing.slugify`. Headings use the Unicode GitHub rule.
- ✔ `footnotes.ts`: `[^注]` and `[^备]` both become `fn-`/`fnref-`, so ids are duplicated and both
  references land on the first note. `## 注意` gets the id `注意`.
- Low. Use the footnote's number, which is already known at render time, or
  `slugOfHeadingText`.

### A10. The printed book repeats element ids across chapters
- ✔ `book-ids.ts`: `usage`, `fn-1` and `fnref-1` each appear twice in a two-chapter book.
- Already filed in **#3226** (first bullet, headings). Footnote ids are not named there and belong
  in the same fix.

### A11. Smaller (all read)
- **Breadcrumbs.** `crumbsFor` (`doc-browser.ts:1033-1041`) resolves `parent` by filename or slug
  only, and in query routing `slugFor` is the identity function. `resolveParent`
  (`routing.ts:220`) also matches slugified names and titles. So a search result's breadcrumb can
  show the raw `parent` text (`appendices`) instead of the section title. Cosmetic.
- **Unscoped scroll.** "Scroll to the failed example" is written twice (`2114-2120`, `2484-2494`)
  as `document.querySelector('tosi-example.-test-failed')`. It is unscoped, so an embedded browser
  can scroll the host page's failure.
- **Theme editor load failure.** `theme-editor-panel.ts:57-61` throws on a failed read, and the
  caller is `void openThemeEditor(…)` (`doc-system.ts:607`). The result is an unhandled rejection
  and no message to the reader.
- **Stall reporting.** There are two rules for "an example never finished".
  - A background frame posts N failures named `example never finished running (30000ms)`
    (`doc-browser.ts:2600-2619`).
  - The page in view uses `closePage({stalled})` (`test-completion.ts:124`), which gives 1 failure
    named `every example with tests finished`.
  - Same verdict, different counts in the report.
- **Cycles.** `nav-tree.ts:132-148` `createsCycle` returns true for any cycle above the parent, so
  a doc under a cyclic section becomes a root. `book-target.ts:85` `chain()` still inherits through
  that section. Only reachable through an authoring error.

---

## B. Phase 1 (no functionality removed)

### Dead code
- `release-notes.ts:329-335`: an orphan comment block, superseded by `336-350`.
- `doc-system-styles.ts:43`: an orphan JSDoc line, followed by the real one for `codeBg`.
- `render.ts:411`: the JSDoc for `renderDocMarkdown` sits above `LONE_CUSTOM_ELEMENT`, so
  `renderDocMarkdown` has no doc in the emitted `.d.ts`.
- No dead internal functions. Unused exports are listed under E.

### One implementation each

**B1. Doc text from a source file.** Replace `docMarkdownFromSource` (`doc-browser.ts:1718`) with a
pure `docTextFromSource(content, path)` shared with `extractDocs`. It keeps:
- the line-anchored regex;
- the frontmatter strip;
- TJS doc comments when the scanner is loaded.

Test it with `doc-browser.ts` and `editable-sources.ts` as fixtures.

**B2. Heading walk.** `docHeadings` should use the renderer's lexer and its nested walk
(`render.ts:146`). It keeps doc-search's try/catch. `headingText` should read wikilink labels.
Fixes A1.

**B3. Nav-tree helpers, into `nav-tree.ts`.**
- Flatten exists four times: `flatten` (`book-html.ts:154`), `flattenNav` (`generate-site.ts:321`),
  `readingOrder` (`continue-link.ts:28`) and `subtreeFilenames` (`doc-browser.ts:2097`).
- The trail exists twice: `trailTo` (`continue-link.ts:16`) is the same as `navTrail`
  (`generate-site.ts:311`).
- `refreshNav`'s `subtree.includes(current)` (`doc-browser.ts:2201`) is the same as `navOpenPath`
  (`nav-tree.ts:154`).

**B4. Nav markup.** Keep two emitters, one string and one DOM. Making them one function with an
output switch would be a router in disguise. Give them one attribute spec instead:
- the landmark and aria-label;
- `aria-current`;
- `-open`;
- the toggle's `aria-*`;
- the list id.

Add a test that compares the hydrated attributes with the static ones. Fixes A3.

**B5. Legacy `?filename`, four copies.** One `legacyLink(href) → {filename, hash} | null` in
`routing.ts`. It is the union of every copy's guards:
- an optional leading `/`;
- reject `=` and `&`;
- split off the hash;
- decode.

All four sites use it. Fixes A8.

**B6. `slugify`, three copies.** `routing.ts:206`, `book-html.ts:141`, `epub-volumes.ts:24`.
✔ `slugify.ts`: identical output on 11 inputs. Keep `routing`'s. Card **#3435**.

**B7. HTML/XML escaping, 9 copies, 3 behaviours.** Some escape `'` and some do not; there are
text-only and attribute variants.
- `render.ts:286-291`
- `book-html.ts:135-139`
- `continue-link.ts:51`
- `generate-site.ts:180-189`
- `epub.ts:155`, `:193`, `:196`
- `epub-a11y.ts:43`
- `page-schematic.ts:39`
- `bin/generate-og.ts:56`

Make one `escapeText`/`escapeAttr` pair in a DOM-free module. The attribute form escapes `&<>"'`.

**B8. Dev-page predicate, three copies** (A7). Keep `servedForDevelopment`, plus an explicit
`isLoopback()` that accepts `[::1]` if `/report` stays loopback-only.

**B9. `/__docstore` clients, four.**
- `doc-browser.ts:1754-1805`: returns null plus an "unauthorized" flag, or a status number.
- `theme-editor-panel.ts:53-87`: an error string, or a throw.
- `data-client.ts:58-92`: throws `DataStoreError`.
- `live-example/source-access.ts:40`: a boolean.

Only `data-client` and `loadSource` refuse an HTML catch-all answer. Make one fetch helper that
keeps the HTML guard, the 401/403 distinction and the JSON `error` body. Keep read and write as
separate functions, again to avoid a router in disguise.

**B10. Config attribute.** `doc-system.ts` parses `this.config` five times (`471`, `669`, `679`,
`688`, `781`). `DocSystemConfig` (`106-118`) lacks `aliases`, `themePresets`, `themeFile` and
`theme`, which three ad hoc parsers read. Use one typed getter.

**B11. Description, lead and snippet.** The page's "first prose paragraph" is defined twice:
- `derivedDescription` (`render.ts:502`) is a line scanner that skips raw HTML and image-only lines;
- `leadOf` (`doc-search.ts:99`) uses a fence regex and skips list items.

They disagree on pages that start with a list or an image. `snippetOf` (`:159`) strips fences a
third way. One marked-token reading would cover all three.

**B12. Smaller merges.**
- Parent chains: `createsCycle` should be `chain(parent).some(d => d === child)` (`book-target.ts:85`).
  Fixes the cycle item in A11.
- `filenameForSlug` (`doc-browser.ts:724`) is the same as the inner `find` of `filenameForPath`
  (`routing.ts:162`). Export it from `routing.ts`.
- The page's own name, `withoutProjectSuffix(doc.headTitle?.trim() || doc.title, name)`, is written
  twice in site (`generate-site.ts:539`, `make-llms-txt.ts:123`). Move it to `doc-title.ts` as
  `pageName()`. That confirms the lead: `pageTitle` is now the only `<title>` rule.
- "Inject styles once" is written three ways (`highlight-styles.ts:115`,
  `theme-editor-panel.ts:90`, `checklist-panel.ts:138`), and `doc-browser`'s four calls have no
  guard at all. Move all of it to `StyleSheet(id)` with #4179.
- "Scroll to the failed example" ×2 (A11): make it one function scoped to `docContent`.

### Declarations written twice
- `PageTestResults` (`doc-browser.ts:200`) is the same as `PageTally` (`test-completion.ts:62`).
  Alias one to the other.
- `SIDEBAR_WIDTH`/`SIDEBAR_BREAKPOINT` (`doc-system-styles.ts:33-34`, commented "keep them in
  step") are restated as the literals `navSize = 200` and `minSize = 600`
  (`doc-browser.ts:695-696`), and again as `HEADER_LINKS_COLLAPSE_PX = 600` (`:629`). Move them to
  `nav-styles.ts`, which both files already import.
- `DOC_THEME_DEFAULTS` (`doc-system-styles.ts:875-882`) repeats the literals in `rootColors`
  (`172-177`), spelling the same colour as `#222` in one and `#222222` in the other.
  `docSystemThemeGenerator.base` (`888-895`) repeats the keys of `DocSystemTheme` (`36-56`).
- The options interface in the doc-browser's `/*#` doc (`:74-89`) is hand-copied and lacks
  `aliases`, `searchPlaceholder` and `accessibility`.

### Teardown and caches
- **`createDocBrowser` has no dispose.** None of these is ever released:
  - `i18n.locale.observe` (`1118`, every instance, memory-routed included);
  - `testManager.enabled.observe` (`2836`);
  - the window `popstate` and `beforeunload` listeners (`1155`, `1200`);
  - the four `<style>` elements;
  - the global bindings.

  This matters for memory-routed embeds that get recreated: a help panel reopened, or the
  doc-system page's two nested demos re-running on every edit. Proposal: a `dispose()` on the
  returned element.
- **`TosiDocSystem` has no `disconnectedCallback`.** Its `connectedCallback` re-runs `initPrefs`
  on every connect (`724`), so each connect adds:
  - a new global `prefs` registration;
  - a `matchMedia` listener (`416`);
  - four observers (`420-432`);
  - a localization fetch.

  Nested (depth-1) instances do this on every example re-run.
- **Background runner** (lead). Read; it looks tight.
  - Per-page listeners and the timer are removed on every outcome (`2752-2757`).
  - The frame and `messageHandler` are removed at the end, but not in a `finally`, so a throw in
    the loop leaks both.
  - `watchReader`'s three capture listeners (`556-565`) are module-global, installed once and never
    removed. That is bounded.
  - Nothing stops a run. Toggling tests off, or removing the browser, leaves the loop loading pages
    into a frame on `document.body`.
  - The `event.source` check compares the frame's `WindowProxy`, which survives navigation, so a
    late message from a timed-out page appends to its already-closed entry. It cannot flip a fail
    to a pass.
- **`css-var-editor.ts:85`** adds a `change` listener on every connect and never removes it. It
  also passes `changeCallback: this.update` (`28`), so `update` runs twice per change. Harmless,
  because it is idempotent.

### Structure (one file per change)
- **Split `createDocBrowser`.** It is one closure of 2,206 lines (`688-2894`). Split it into:
  - source editor (`1700-2065`);
  - test runner and widget (`818-997`, `2305-2830`);
  - history and scroll (`1120-1206`, `1626-1668`);
  - header and search (`1026-1118`, `1276-1362`, `2853-2879`).

  These pieces share `app`, `docContent`, `contentPane` and `go`, so they need a small context
  object.
- **Move `release-notes.ts`.** It imports `$` from `bun` and sits among browser-safe modules. Its
  stated reason for living in `src/` (`:4-6`, "`root = "./src"`") is no longer true:
  `bunfig.toml` now sets `root = "."`. Moving it to `site/` or `bin/` changes the wildcard path
  `dist/doc-system/release-notes.js`, which `bin/release-notes.ts:76` imports.
- **Parse `doc-system.ts` config once** (B10).

### Tests and build
- **No unit tests for the factory.** `createDocBrowser` has none: `doc-browser.test.ts` has 9
  tests, all for `hasTestBlock`.
- **It does run under happy-dom.** My probes ran it under the preload once `location` and
  `history` were put on `globalThis`. `test-setup.ts` does not expose them: the first run died with
  `ReferenceError: location is not defined`. Adding them would open this closure to unit tests.
  Check first that leaving them out was not deliberate.
- **Tests the merges need:**
  - static against hydrated nav attributes (A3/B4);
  - `docHeadings` against rendered ids for nested, wikilink and footnote headings (A1);
  - preview against extractor on real files (A2);
  - a legacy link with a hash through all four copies (A8);
  - same-document navigation keeps its example elements (A5);
  - two-chapter print ids (A10).

### Docs (no API change)
- `doc-system.ts:19` shows `<ul class="doc-nav">`; the generator emits `<nav class="doc-nav">`.
  `:31` documents `config` as `{ projectName, projectLinks }`, but the build writes about twelve
  keys.
- `doc-system-styles.ts:337` says the doc-browser sets `sidenav.navHidden`. No such property
  exists; it sets `navVisible` and `alwaysCompact` (`doc-browser.ts:1270-1271`).
- `example-policy.ts:173`: the `@param policy` line names 2 of the 4 policies.
- `release-notes.ts:4-6` gives a stale reason (see Structure).
- `highlight.ts:99` says "tracked in TODO.md", which is now a pointer to the board. It should cite
  the card. I am not sure which card that is; #1580 is a guess.
- `doc-browser.ts:8-10,31-49`: the doc presents `createDocBrowser` as the way to embed a browser
  in your own app, but teaches it with the default `'query'` routing. That mode rewrites the host
  page's URL. `'memory'` is the embed-safe spelling and should come first.
- **Examples that throw:** the only executable fences in scope are the two `html` fences in
  `doc-system.ts`. Each is a live nested `<tosi-doc-system>`, and running them needs a dev server.
  Not checked.

---

## C. Phase 2 (one way to do each thing)

| Task | Redundant spelling | Same as | Consumer uses | Notes |
|---|---|---|---|---|
| Embedded routing on `<tosi-doc-system>` | `routing="internal"` (`doc-system.ts:791`) | `routing="memory"` | 0 | Undocumented apart from a comment (`:252`). Same branch (read). Remove at 1.20. |
| Set the checklist endpoint | `setChecklistEndpoint` re-exported from `tosijs-ui/checklist-panel` (`checklist-panel.ts:349`) | the same binding from `tosijs-ui/checklist-client`; also `watchChecklist({ endpoint })` (`:333`) | 0 / 0 / 0 | 3 spellings, all new in 1.19.2. Keep the `watchChecklist` option for panel users and the client export for DOM-free clients. Drop the panel re-export. |
| Section the list | `checklistSections` re-exported from `tosijs-ui/checklist` (`checklist.ts:87`) | `tosijs-ui/checklist-client` | 0 | Same binding. |
| Contrast helpers | `export { contrastRatio, readableOn }` in `doc-system-styles.ts:59` (wildcard path) | `tosijs-ui/theme`, root | 0 (only its own test) | |
| Slug a string | `slugify` exported from `book-html.ts` (wildcard) | `routing.slugify` | 0 external | ✔ identical; #3435 |
| Escape HTML | `escapeHtml` exported from `book-html.ts` (wildcard) | B7's merged pair | 0 | |
| ePub menu link | `epubMenuItem`'s legacy branch when the config has no `ebooks` (`doc-system.ts:148-153`) | none: it builds the derived URL that 404'd (#218) | 0 hand-written `<tosi-doc-system>` pages in the 25 repos | Removing it changes a hand-written page's menu, so it is a 1.20 call. |

**`@deprecated` inventory in scope: none.** The things the code calls "legacy" carry no
`@deprecated` and none warns at runtime:
- `routing: 'query'`, which is still the default (`doc-browser.ts:438,697`);
- the `projectLinks` header icons (`1348`);
- `?filename` links;
- the `epubMenuItem` legacy branch;
- `'internal'`;
- the `xinjs`/`xinjsui` globals.

What the inventory misses: `'internal'`, the `epubMenuItem` branch, and the question of the
`'query'` default (see E).

---

## D. Not proposing

- **`doc-browser-entry.ts`** stays a separate file. It avoids the import cycle (settled in its own
  comment, `:21-25`).
- **Already single:** `isLiveFence`/`parseFenceInfo`. `code-fences`, `render`, `highlight` and
  `hasTestBlock` all call them (read). The doc-system cluster stays out of the barrel, and the iife
  stays CDN-only (CLAUDE.md).
- **`xinjs`/`xinjsui` globals:** CLAUDE.md keeps the legacy names.
- **`projectLinks` against `navbarLinks`:** not redundant. `projectLinks` also drives the logo
  fallback, "View on GitHub" and the raw-source URL. 4 repos set it through the site config;
  `navbarLinks` has 0 uses.
- **Two Prism palettes** (`highlight-styles.ts` and the book CSS): different backgrounds, argued
  in `book-html.ts:75-90`.
- **The `?filename` authored link form:** it is the routing-agnostic form
  (`doc-browser.ts:1416-1420`). Wikilinks are additive.
- **Hidden filters in search, book and quick links:** they duplicate the extraction filter
  (`docs.ts:718`) but protect hand-built corpora. Keep them, and add one to the tree nav (A4).
- **`messageHandler` accumulation against `tallyExamples`:** deliberate (`test-completion.ts:43-53`).
- **Full-screen handled before and after hydration:** two genuinely different DOMs
  (`doc-system-styles.ts:331-339`, `doc-browser.ts:1549-1555`).
- **`single-source`'s `legacyHeadingSlug`** is deliberate compatibility, and `site/test-report.ts`'s
  structural `TestReportLike` keeps site from importing a DOM module.

---

## E. Unused, but not redundant (only the ones needing a decision)

- **`createDocBrowser` itself.** It has 0 direct callers in the 25 repos; every site goes through
  `<tosi-doc-system>`, and tosijs's iife namespace-imports the subpath. Decide whether 1.20 makes
  `'memory'` the default instead of the legacy `'query'`, since the docs pitch this function as
  the embed API.
- **`tosijs-ui/doc-browser`'s other exports:** `focusableCodeBlocks`, `hasTestBlock` and
  `testIndicatorStyleSpec` are exported "for the test", with 0 named imports. tosijs's iife
  exposes them through its namespace import, so check that before removing them.
- **`highlight.ts`:** `loadableGrammars` has 0 references anywhere, tests included.
  `resetHighlightStateForTest` is test-only and ships through the wildcard.
- **`tosijs-ui/checklist-panel` and `tosijs-ui/checklist-client`:** `closeChecklist`,
  `CHECKLIST_ENDPOINT` and `CHECKLIST_ENDPOINT_SNIPPET` are new and have 0 uses (#4187 documents
  them).

---

## F. Numbers

- **Lines.** 29 files, 9,928 lines. ✔ `count.ts` (a heuristic: template-literal CSS counts as code):

  | Kind | Lines |
  |---|---|
  | code | 6,303 |
  | `/*#` doc | 245 |
  | comment | 2,818 (28%) |
  | blank | 562 |

  `doc-browser.ts` alone has 806 comment lines.
- **Largest files.** `doc-browser.ts` 2,895; `doc-system-styles.ts` 1,061; `doc-system.ts` 875;
  `highlight.ts` 604; `render.ts` 568; `release-notes.ts` 427; `checklist-panel.ts` 350.
- **`createDocBrowser`** is one 2,206-line closure. Its unit tests are 9, all for one helper.
- **Ways to link to another doc page: 4.** `?filename`, `/slug/`, `[[slug]]`, `[[Title]]`.
- **Ways to put the doc browser on a page: 3.** The generated pages' `<tosi-doc-system>`, the
  element (or `tosiDocSystem()`) by hand, and `createDocBrowser()`. Two import paths register the
  element: `tosijs-ui/doc-browser` and `tosijs-ui/doc-system/doc-system`.
- **Nav renderers: 3** (static string, hydrated tree, flat query list), plus the print TOC, the
  ePub nav and `llms.txt`.
- **Copies:** HTML-escape 9; legacy-link predicate 4; slugify 3; localhost test 3; setting the
  checklist endpoint 3.

### For #4341 (a `/search` endpoint)

**What it holds.** The index (`doc-search.ts:131-156`) is built lazily on the first search, from
the `docs.json` the page already fetched; every doc's full text ships to the client anyway. For
each non-hidden doc it holds:
- title words;
- top-level headings with renderer-style ids (wrong in the A1 cases);
- keywords;
- description words;
- "lead" words (its own first-paragraph rule, B11);
- a word → count map over the whole text, code included.

Words are lowercased, split on camelCase, and split on anything that is not a Unicode letter or
number.

**How it ranks** (`180-247`):
- Every query word must match (AND).
- Each word scores the best of: title (100 whole word / 60 prefix), heading (35/30), keywords
  (25/10), description (18/6), lead (18/6).
- On top of that comes a body score of `min(24, 4 + 4·log2(1+uses))`, plus 10 for any whole-word
  use.
- Matching is word-prefix only, with s/es plurals. There is no stemming and no fuzzy match.
- +100 when the title equals the query; +50 when a multi-word query appears in the title.
- Ties go by `docs.json` order. That is the flat `pinnedSort`, not tree order, though the header
  comment (`:26`) says "nav order".

**What it returns.** At most 30 hits. Each becomes a page row, plus a section row at score+1 when
a heading matched (`doc-browser.ts:1059-1086`).

✔ `search-cost.ts`, on this repo's corpus:

| | |
|---|---|
| `docs.json` | 707 KiB, 82 docs |
| index build | 42 ms |
| headings | 471 |
| (doc, word) pairs | 25,379 |
| one query | 1.5–4.4 ms |

`date` puts `month` first, and `popMenu` puts `menu#popmenu-and-tosi-menu` first.

**For the card.** The two functions are pure and DOM-free (they import only `marked` and
`heading-id`), so a server or edge handler could run them unchanged over the built `docs.json`.
- Hits carry the doc, not a URL; the caller builds one with `routing.ts`.
- Heading ids need A1 fixed first.
- Nothing is persisted, so each process rebuilds the index (42 ms here).
