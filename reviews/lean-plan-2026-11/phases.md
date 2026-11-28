# Lean plan: sections B–F merged

**Basis:** `af13cd1ee`. `src/`, `bin/` and the docs are clean against HEAD, so every `file:line` below was checked in the working tree.

**Source codes:**

| code | report |
|---|---|
| OF | overlays-forms |
| DA | data |
| IT | icons-theme |
| LB | layout-entries-bin-docs |
| EL | editor-live-example |
| DC | doc-client |
| SB | site-build |
| SS | site-serve |

**Defect references** like `OF-A10` point at the report's section A, which is handled separately. Here they only say which defect a package fixes or prevents.

**Spot-checks:** every package's cited lines were opened, and the code says what the report claims, except where "Dropped on checking" says otherwise. Recounts give the command used.

Helper scripts are in `<scratchpad, not kept>/`:
- `show.sh` prints a `file:line` range;
- `cgrep.sh` greps the 25 consumer repos, skipping `node_modules`, `dist`, `docs`, built bundles and changelogs.

---

## 1. Phase 1 packages (no functionality removed)

Each package is one commit or PR. Each entry gives what it **merges or deletes**, what the merged version must **keep**, the **tests** it needs, and the reports that raised it (**by**).

### 1a. Duplication whose copies disagree (defect-prone)

**P1. Save-to-source finds example blocks with marked's lexer.**
- **Merges:** `live-example/save-to-source.ts:65` uses a line regex, ``/^([ \t]*)```([^\n]*)\n([\s\S]*?)\n[ \t]*```/gm``. Replace it with block offsets from `collectCodeTokens` (`doc-system/code-fences.ts:18`). In `.ts`/`.js` sources, map each `/*#` block's offset back to the file.
- **Keep:**
  - `parseFenceInfo`, which is already used;
  - the out-of-range refusal (`component.ts:2557`);
  - CRLF handling, which is correct today;
  - passing `examplePolicy()` into the recount at `component.ts:2556`.
- **Tests:**
  - EL's `ordinals.ts` over `demo/docs.json`, as a unit test. Two docs disagree today: `doc-site-system.md:2487` and `doc-browser.ts:61`.
  - Six shapes: an indented illustration, a blockquoted fence, `` ``` js ``, `~~~js`, a four-backtick block holding a fence, and CRLF.
- **Fixes:** EL-A1, which writes edits into the wrong block.
- **Family recount:** there are **6 hand-written fence scanners in 5 files**, the others handled in P2 and P20:
  - `save-to-source.ts:65`
  - `site/docs.ts:316`
  - `render.ts:511`
  - `doc-search.ts:100` and `:162`
  - `site/truncated-doc.ts:48`

  Command: ``grep -rn --include='*.ts' -F '```' src bin | grep -v test`` filtered to regex and line-scanner lines. EL counted 5, grouping doc-search's two sites as one.
- **By:** EL

**P2. One directive grammar, read from the lexer's `html` tokens.**
- **Merges:**
  - `site/docs.ts:315-318`: a fence-strip regex that closes on the first inner ` ``` `;
  - `site/docs.ts:329`: the single-line `<!--(\{.*\})-->`;
  - `book-html.ts:149-150` `stripDocMeta`, which is multi-line;
  - `site/single-source.ts:50` `DIRECTIVE`, which is multi-line;
  - two lists of "which keys make a directive": `single-source.ts:64` (`directiveOf`) and `:117` (`isSingleSourceDirective`);
  - `book-target.ts:265` `mayHaveSingleSourceDirective`, a single-line pre-filter that gates everything.

  The model to follow is `single-source.ts:153`, which already calls `marked.lexer`. Fold the inset frontmatter strip (`single-source.ts:367-370`, which strips any `---…---`) into `parseFrontmatter` (`site/docs.ts:248`, which requires `key: value` lines).
- **Keep:**
  - both comment forms, `<!--{}-->` and `/*{}*/`;
  - frontmatter wins over the JSON block;
  - a cheap pre-filter, but one that matches what the parser matches;
  - a multi-line block either parses or is reported as an error (`single-source.ts:18-20` promises build errors).
- **Tests:**
  - a four-backtick fence that illustrates `{"hidden":true}`;
  - a wrapped block;
  - a `~~~` fence;
  - a fragment that opens with a `---` rule;
  - a multi-line inset directive.
- **Fixes:** SB-A3 #7 (a page silently unpublished) and #8, SS-A6, SS-A7.
- **By:** SB, SS

**P3. `siteUrl(baseUrl, basePath, p)` and `stripBase(basePath, p)` in `routing.ts`.**
- **Merges** every hand-written composition:
  - `baseUrl + withBase(…)` at 9 sites: `generate-site.ts:450, 501, 512, 521, 1035`, `make-llms-txt.ts:119, 290, 303` and `epub.ts:1247`;
  - a trailing-slash trim at only 4 of them: `make-llms-txt.ts:116, 283, 302` and `epub.ts:1227`;
  - no `withBase` at all at 2: `generate-site.ts:1060` (robots) and `make-llms-txt.ts:230`;
  - by hand at `orchestrator.ts:1049-1055, 1699-1701, 1761-1762` and `epub-volumes.ts:83, 129, 206`;
  - the strip direction at `epub.ts:321, 426` and `a11y-audit-cli.ts:59`;
  - an absolute `scriptUrl` joined onto PUBLIC at `orchestrator.ts:1258` and `asset-stamp.ts:83-87`.
- **Keep:**
  - absolute and protocol-relative URLs pass through;
  - `'/'` or an empty `basePath` is a no-op;
  - trailing slashes are trimmed on both arguments;
  - two functions, not one with a mode flag.

  Also move `basePathDoubling` out of the firebase-only branch (`orchestrator.ts:2086`).
- **Tests:**
  - a table: origin, `origin/`, `'/'`, `/repo`, `/repo/`, an absolute path;
  - a CDN `scriptUrl` gives no asset-stamp warning.
- **Fixes:** SB-A1 #1–#4 and SB-A7 #14.
- **By:** SB

**P4. Build each child's options once, then serialize them.**
- **Merges:**
  - the ePub payload's hand-picked fields (`orchestrator.ts:152-168`). It lacks `liveExamples`, which `epub.ts:1086` reads.
  - the check-examples fallback (`orchestrator.ts:321-324`) against the child's options (`check-examples-cli.ts:55-61`). The fallback drops `liveExamples`, `overriddenDialects` and `modules`.
  - `registerSiteDialects` (`orchestrator.ts:33-39`) and its verbatim copy (`epub-cli.ts:33-35`). Move it to `example-policy.ts`, which also breaks the restamp↔orchestrator cycle (#3253).
- **Keep:** forward every JSON-safe config field to the ePub child. Derive the env or argv from the same object the fallback uses.
- **Tests:**
  - the ePub child sees `liveExamples`;
  - child and fallback give the same result on one corpus.
- **Fixes:** SB-A2 #5 and #6.
- **By:** SB

**P5. One bounded spawn.**
- **Recount:**
  - `src/doc-system/site` has **33 external-process launch sites in 12 files**, excluding `cp`/`mv`/`rm`/`mkdir`.
  - **5** have a timeout:
    - `runBounded` at `a11y-audit.ts:105` and `epub-a11y.ts:188`;
    - `git()` at `data-store.ts:282`;
    - the ePub child at `orchestrator.ts:174/178`;
    - `bun audit` at `audit-guard.ts:286-289`.
  - **1** forwards signals: `bounded-child.ts:20`.
  - **0** end grandchildren.

  Command: ``grep -rn --include='*.ts' -E "Bun\.spawn(Sync)?\(|\bspawn(Sync)?\(\[|\bspawn\($|\bspawn\(cmd|runBounded\(\[|\$`(bun|git|zip|lsof|ps|pgrep|vm_stat|sysctl)" src/doc-system/site | grep -v test``, plus the multi-line `epub-a11y.ts:188`. SB counted "9 in scope, 1 bounded" and SS "16 call sites, 2 time-limited", over different scopes.
- **Unbounded sites to convert first:**
  - check-examples (`orchestrator.ts:272`);
  - the IIFE and ESM bundles (`:1318`, `:1491`);
  - gzip (`:423`);
  - generate-css (`:1875`);
  - the classic-script check (`bundle-guard.ts:106`);
  - preflight's five `$` calls (`preflight.ts:475-505`).
- **Also merges:**
  - `descendantsOf` (`preflight.ts:504`, which equals `dev-server.ts:3581`);
  - "cwd of pid" (`preflight.ts:488` and `dev-server.ts:619`; only one trims).
- **Keep:**
  - SIGINT/SIGTERM forwarding;
  - draining both pipes concurrently;
  - a per-call timeout;
  - the `env`, `stdin` and `inherit` stdio options;
  - git's error mapping as a layer on top, not a mode;
  - killing descendants on timeout;
  - after the child exits or is killed, a grace period, then no more waiting on pipes.

  SS did not confirm whether Bun has a process-group option; check before building.
- **Tests:** SS's ✔ scripts `03-bounded-grandchild`, `04-git-hook` and `05-git-hook-22s`.
- **Fixes:** SS-A2 and part of SS-A3.
- **By:** SB, SS

**P6. `readBodyCapped(request, maxBytes)`.**
- **Merges** every read-then-check site:
  - `checklist-handler.ts:83`;
  - `dev-server.ts:2921` (the debug sink);
  - `:1376` (source write, no cap);
  - `:1482` (data: 16 MB, checked after parsing);
  - `:1853` (`/report`, no cap).
- **Keep:**
  - a Content-Length check first, then a counted stream;
  - the per-route caps: sink 64 KB, checklist 1 MB as sent (keep `inflateCapped` at 8 MB), data and source 16 MB;
  - `maxRequestBodySize: 16 MB` on both `Bun.serve` calls (`:3312`, `:3353`) as a backstop.
- **Tests:** SS ✔ `02-checklist-body` (a 20 MB body was read in full before the refusal), one per route.
- **Fixes:** SS-A1 and #4077.
- **By:** SS

**P7. Scratch files: private, registered, cleaned in `finally`.**
- **Merges:**
  - the ePub payload `tmpdir()/tosijs-epub-${pid}.json` (`orchestrator.ts:171`);
  - `.epub-build` (`epub.ts:1203`), cleaned only on the strict-image path (`:1324`);
  - the hydrate dir (`orchestrator.ts:1484-1490`), removed only at `:1609`;
  - `bin/resolve-site-config.ts:341` `${tmpdir()}/${name}.caddy`, which is never removed.
- **Keep:**
  - `mkdtempSync` privacy, as in `orchestrator.ts:1972`, `a11y-audit.ts:84` and `epub-a11y.ts:185`;
  - the hydrate dir under the project (#178), but cleaned in `finally`;
  - registration in `scratchDirs` (`orchestrator.ts:703`, cleaned at `:2313`).
- **Tests:** `.epub-build` is absent after a failed zip (SB ✔ `epub-leftover`).
- **Fixes:** SB-A4 #9 and #11, SB-A7 #20.
- **By:** SB, LB

**P8. `isInside(root, p)` (lexical) and `realInside(root, p)` (through symlinks): two functions, no mode flag.**
- **Recount: 10 lexical sites and 2 realpath families:**
  - `dev-server.ts:158` and `:1280`
  - `editable-sources.ts:73`
  - `data-store.ts:86`
  - `session-secret.ts:51`
  - `a11y-audit.ts:67`
  - `sections.ts:58`
  - `output-guard.ts:19`
  - `epub.ts:451`
  - `host-preset.ts:192`, which no report listed and which uses `'/'` rather than `path.sep`
  - realpath: `data-store.ts:127-206` and `single-source.ts:302`

  SS's text says 8, its list has 9, and its F section says 10. Command: `grep -rn --include='*.ts' -E "startsWith\([^)]*path\.sep|isUnderRoot|realpathSync" src | grep -v test`.
- **Keep:**
  - whether the root itself counts as inside. It does in `a11y-audit`, `sections` and `isUnderRoot`, and does not in `editable-sources` and `data-store`.
  - `output-guard`'s two-way nesting check.
- **Tests:** a sibling-prefix path (`/docs` against `/docs-site`), the root itself, and a symlink out.
- **Owner question:** source writes follow symlinks (`dev-server.ts:1417` `Bun.write`), but data writes refuse them (`data-store.ts:211`). See E.
- **By:** SS

**P9. `dropSession(state, token)`.**
- **Merges** three teardown copies: `dev-auth.ts:318-324` clears 4 maps, `:796-800` clears 2 and `:763-768` clears 3.
- **Keep:** clear all four maps on every path. Mirror `dropLink` (`:455`).
- **Tests:** SS ✔ `01-session-evict`: `sessionDevices` and `sessionGrants` must not outlive their session.
- **Fixes:** SS-A4.
- **By:** SS

**P10. `localOnly(request, srv, viaTunnel)`.**
- **Merges:** the loopback-only gate, written three times (`dev-server.ts:2825-2829`, `3019-3023`, `3086-3090`) with different refusals (403 with a log, or 404 silent).
- **Deletes:** the unreachable `viaTunnel ||` half of `csrfOk` (`:2331-2332`), which would fail open for any future caller.
- **Keep:** the 404, logged once; call `isSameOriginRequest` directly.
- **Tests:** the five-caller route table (see S2).
- **By:** SS

**P11. `stopHolder()`, with a check of the process name.**
- **Merges:** three ways to stop a process by pid:
  - `bin/dev.ts:56-78`, which checks only `isProcessAlive` (LB-A11);
  - `bin/tunnel.ts:454-475`;
  - `dev-server.ts:595-660`.
- **Keep:** `ps -p <pid> -o comm=` before signalling, as the other two already do.
- **Tests:** `dev --stop` refuses a pid that isn't a dev server.
- **Card:** #1542.
- **By:** LB

**P12. Text and attribute escaping in one DOM-free module.**
- **Recount: 13 functions in 9 files (11 independent bodies) with 4 behaviours:**

  | escapes | functions |
  |---|---|
  | `&<>` | `render.ts:286`, `book-html.ts:135`, `epub.ts:193`, `generate-site.ts:188` |
  | `&<>"` | `page-schematic.ts:39`, `bin/generate-og.ts:56`, `continue-link.ts:51`, `epub-a11y.ts:43`, plus the derived `render.ts:289` and `book-html.ts:139` |
  | `&<>"'` | `epub.ts:155`, `generate-site.ts:180` |
  | `&<"` | `epub.ts:196`, which skips `>` |

  Command: `grep -rn --include='*.ts' -E "'&amp;'" src bin | grep -v test`. Excluded: `epub.ts:180` (XHTML repair) and `highlight.ts:518` (a decode table). LB counted 10 functions; DC counted 9 copies with 3 behaviours.
- **Keep:** one function that escapes `& < > " '`. It is safe for text and for both quote styles, so it needs no text/attribute mode switch (LB). DC and SB suggest an `escapeText`/`escapeAttr` pair instead; either works.
- **Tests:** one table test.
- **No live bug:** every current use is inside `"` or in text.
- **By:** LB, DC, SB

**P13. `scriptJson(value)` for JSON written into a `<script>`.**
- **Merges:** the escaped form (`render.ts:270`, `.replace(/</g, '\\u003c')`) with the unescaped sites:
  - `dev-server.ts:1682-1688` (build-error text, up to 2000 characters);
  - `orchestrator.ts:1702`, `:1773`;
  - `page-globals.ts:63`, `:77`.
- **Tests:** `</script>` in a build-error message.
- **Fixes:** SS-A8.
- **By:** SS

**P14. A guarded path get/set.**
- **Merges:**
  - `schema-form/fields.ts:560` `getByPath` and `:573` `setByPath`;
  - the proposals lookups (`schema-form.ts:1795, 1846, 2679`);
  - the table's sort key `row[prop]` (`data-table.ts:2629`).
- **Keep:**
  - `Object.hasOwn` on each segment when reading;
  - refusing `__proto__`, `constructor` and `prototype` while descending, and `__proto__` as a leaf (tosijs's `assertSafeKey`/`assertSafeLeafKey` semantics);
  - a numeric segment creates an array (`fields.ts:582`);
  - immutability, which tosijs's mutating setter lacks.

  The table's display goes through tosijs bindings (`data-table.ts:3161`), so it needs an upstream ask: tosijs should export its guard.
- **Tests:** inherited names on read, next to `fields.test.ts:759`, plus a proposals own-key test.
- **Fixes:** DA-A-1 (#4324 covers only the first item).
- **By:** DA

**P15. One way to compile and run code against a context.**
- **Merges six copies:**
  - `buildExample` (`execution.ts:230`) and its callers `executeInline` (`:362`) and `executeInIframe` (`:521`);
  - `runTests` (`test-harness.ts:384`);
  - `executeCode` (`code-transform.ts:298`);
  - the REPL fallback (`component.ts:1612`);
  - `runInlineTjsTests` (`component.ts:2040`).

  Also merge the scope object `{preview, console, ...context}` (four copies) and the "message | source (line N)" formats: `describeError` (`error-location.ts:158`), the matcher's (`test-harness.ts:139`) and `describeModuleError` (`execution.ts:281`).
- **Keep (the union):**
  - `contextParamNames`;
  - the console-redeclare retry;
  - `EvalError` mapped to `CSP_REFUSED`;
  - `diagnoseConstruction` with `cause`;
  - the `sourceURL` tag;
  - the source returned with each run instead of held in a module variable (`execution.ts:23`, `test-harness.ts:59`).

  This is not a router: the realm and the preview are inputs.
- **Tests:** EL's two concurrency scripts, `:iframe` line numbers, and a body that redeclares `preview`.
- **Fixes:** EL-A2 and the `:iframe` part of EL-A7.
- **By:** EL

**P16. One import-clause parser, with two right-hand sides.**
- **Merges:** the context-key branch (`code-transform.ts:235-254`, which can't handle `as` or `default, {named}`) with `rewriteBareImportsToDynamic` (`:136-168`).
- **Keep:**
  - statement-start anchoring, as `assertContextProvided` (`:197-199`) does;
  - erasing `import type` before rewriting;
  - both quote styles (#141).
- **Tests:** `as`, `default, { named }`, `import type`, and import text inside strings and template literals.
- **Fixes:** EL-A3.
- **By:** EL

**P17. One memoized `loadTjsBrowser()`.**
- **Merges** four copies of "installed peer, then the CDN chain": `code-transform.ts:410`, `:491`, `:548` and `:577`.
- **Keep:** each feature's own `typeof` check. Run `noteStripExports` once. Pass `from-ts` as a parameter.
- **Tests:** tjs-lang 0.13 installed must not fetch a second transpiler.
- **Fixes:** EL-A7 (two tjs-lang copies on one page).
- **By:** EL

**P18. Search headings from the renderer's lexer and walk.**
- **Merges:** `doc-search.ts:110` `docHeadings`, which uses the global `marked` and top-level tokens only, with `render.ts:146` `allHeadings` and `docMarked`. `heading-id.ts:16-22` `headingText` also needs to read wikilink labels.
- **Keep:** doc-search's try/catch.
- **Tests:** nested headings, wikilink headings and footnote headings checked against the rendered ids.
- **Fixes:** DC-A1. It is a prerequisite for #4341.
- **By:** DC

**P19. `docTextFromSource(content, path)`, shared by the preview and `extractDocs`.**
- **Merges:** `doc-browser.ts:1718-1722` (unanchored `/\/\*#[\s\S]+?\*\//g`) with the extractor (`site/docs.ts:565`, line-anchored).
- **Keep:**
  - the line anchor;
  - the frontmatter strip (`docs.ts:531`);
  - `.tjs`/`.ajs` doc comments (`docs.ts:574-600`).

  Also fix `editorModeFor` (`1706-1713`) to use the `tjs` and `ajs` modes.
- **Tests:** `doc-browser.ts` and `editable-sources.ts` as fixtures.
- **Fixes:** DC-A2.
- **By:** DC

**P20. Prose read from tokens: description, lead, snippet and title.**
- **Merges:**
  - `derivedDescription` (`render.ts:502`), a line scanner at `:511`;
  - `leadOf` (`doc-search.ts:99-100`) and `snippetOf` (`:159/162`), which strip fences with a regex;
  - titles: `titleFromMarkdown` (`site/docs.ts:214`) against `text.split('\n')[0]` (`docs.ts:613`);
  - llms-full's H1 test, `/^#\s/m` (`make-llms-txt.ts:292`);
  - `truncated-doc.ts:48`'s fence count.
- **Keep:**
  - skip raw HTML and image-only lines;
  - skip list items;
  - title rule: the first heading token, else the first content line.
- **Tests:** pages that start with a list or an image; a `# comment` inside a fence.
- **Fixes:** SB-A7 #17.
- **By:** DC, SB

**P21. `legacyLink(href) → {filename, hash} | null` in `routing.ts`.**
- **Merges** four copies: `routing.ts:113` `rewriteDocLinks`, `:127` `legacyQueryPath`, `doc-browser.ts:757-762` and `epub.ts:329`.
- **Keep:**
  - an optional leading `/`;
  - reject `=` and `&`;
  - split off the hash;
  - decode.
- **Tests:** `?menu.ts#popmenu` through all four call sites.
- **Fixes:** DC-A8.
- **By:** DC

**P22. One attribute spec for the nav, used by both emitters.**
- **Merges:** the attributes written by the string emitter (`generate-site.ts:214-261`) and the DOM emitter (`doc-browser.ts:2084-2207`). Keep the two emitters; merging them into one function with an output switch would be a router.
- **Keep:**
  - the landmark and its aria-label;
  - `aria-current` (toggled in `applyStatus`, `2179-2188`);
  - `-open`;
  - the toggle's `aria-*`;
  - the list id.
- **Tests:** the hydrated attributes equal the static ones.
- **Fixes:** DC-A3.
- **By:** DC

**P23. Dev-page predicates.**
- **Merges:** the two identical `isLocalhost` copies (`live-example/component.ts:936-939`, `doc-browser.ts:885-887`) into one `isLoopback()`, beside `servedForDevelopment` (`live-example/dev-served.ts:16`).
- **Keep:**
  - accept `[::1]`, which the dev cert covers;
  - write next to each predicate why `/report` is loopback-only while the runner runs on the LAN and the tunnel (#3962).
- **Fixes:** DC-A7.
- **By:** DC, EL

**P24. `makeIcon` applies the caller's parts last.**
- **Merges:** `icon-core.ts:274-307`, which overwrites the caller's parts with its defaults, with `wrapIcon` (`:329-340`), which merges.
- **Keep:** `wrapIcon`'s rule: add classes, assign styles last.
- **Tests:** what is *rendered*, both through the creator and through `<tosi-icon stroke fill stroke-width>`.
- **Fixes:** IT-A1.
- **By:** IT

**P25. `toIcon(icon: string | Element | undefined, fallback)` in icon-core.**
- **Merges** four rules over seven sites:
  - `notifications.ts:582-583` (`instanceof SVGElement`);
  - `select.ts:756-761` (`instanceof HTMLElement`);
  - `segmented.ts:203`, `:428-433` and `:489` (a string used as is);
  - `menu.ts:1152-1155`, `1208-1211`, `1265-1268` and `1403-1406` (`typeof === 'string'`, the correct copy).
- **Keep:** clone an element that is reused (`select.ts:758`).
- **Tests:** string, SVG and composite icons in menu, notifications, select and segmented.
- **Fixes:** OF-A10. #3948 is the typing half.
- **By:** OF

**P26. `<tosi-float>` announces its own removal.**
- **Merges:**
  - `TosiFloat.disconnectedCallback` dispatches `close`, covering the removals at `float.ts:251` and `:272`;
  - menu's `poppedMenus`/`onClose` use it;
  - search-field's MutationObserver (`search-field.ts:740-744`) is deleted;
  - live-example's REPL completions use it.

  On example disconnect, also close the completion float and clear its timer (`component.ts:1752-1754`, `2938`).
- **Tests:** after the float removes itself, select's `aria-expanded` is false (OF ✔ `float-self-removal`).
- **Fixes:** OF-A4 and EL-A7 (floats outliving the example).
- **By:** OF, EL

**P27. One menu-row builder: `menuRow(item, options, {trailing, handlers})`.**
- **Merges:** `menu.ts:1147` (action), `1204` (drop item), `1260` (submenu) and `1403-1415` (drop label), plus the caption line written four times.
- **Keep (the union):**
  - an icon from a string;
  - `checked` as the icon fallback;
  - the checked class;
  - `role`;
  - `aria-selected` in a listbox;
  - `tooltip`;
  - `properties`;
  - `disabled` and `aria-disabled`;
  - `aria-haspopup` on submenus.
- **Tests:** a submenu's `role`, `aria-haspopup` and checked class.
- **Fixes:** OF-A8 (#3968).
- **By:** OF

**P28. One shortcut grammar, matched on `event.code`.**
- **Merges:**
  - `match-shortcut.ts`'s `matchShortcut`, `parseShortcut`, `canonicalShortcut`, `keystroke`/`keycode` (`:18-33`, unused) and `modifierKeys` (`:14`);
  - palette's `matchesShortcut` (`palette.ts:207`), `describeShortcut` (`:266`) and the modifier name tables (`:248-254`, `:273-277`);
  - `isMac`, at `palette.ts:189-191` and `match-shortcut.ts:10-12`.
- **Keep (the union):**
  - `mod`;
  - glyph forms (`⌘⇧K`);
  - both `+` and `-` separators;
  - a warning for an unknown modifier;
  - the guard for a keydown with no `key`;
  - `iPod` and the user-agent fallback;
  - palette's `ariaShortcut`.

  One parser, with no `grammar:` flag. The public names stay until phase 2.
- **Tests:** both grammars, a key-less event, `⌥X` on Mac, `⌘⇧1`, `⌘-`.
- **Fixes:** OF-A5 and IT-A11c.
- **By:** OF, IT

**P29. `listenForShortcuts(host, getItems)`.**
- **Merges:** `TosiMenu.handleShortcut` (`menu.ts:1837-1854`, added at `1938`, removed at `1949`) and `TosiSelect.handleShortcut` (`select.ts:691-704`, `708`, `725`).
- **Keep:**
  - select's `disabled` check;
  - menu's animation;
  - capture-phase removal;
  - an early return, cached when the items are set, when no item has a `shortcut`.
- **Tests:** lazy providers are not called on unrelated keys.
- **Fixes:** OF-A6.
- **By:** OF

**P30. One accessible-name helper.**
- **Merges:** `menu.ts:1831-1834` and `select.ts:563-587`.
- **Keep:** the order `aria-label`, `title`, `data-tooltip`, `<label>`s, then a fallback. This also gives `<tosi-menu>` label support.
- **Fixes:** OF-A25 (#3572).
- **By:** OF

**P31. Form callbacks go to the base class.**
- **Recount, repo-wide: 14 overrides in 7 components.**
  - **8 match the base** when no `defaultValue` is set: `select.ts:430-436`, `tag-list.ts:344-350`, `month.ts:269`, `segmented.ts:216`, `rating.ts:125` and `rich-text.ts:281`.
  - **2 are no-op stubs that drop the base:** `segmented.ts:211-214` and `mapbox.ts:197-199`.
  - **4 really differ:** `rating.ts:121` (readonly), `rich-text.ts:275` (`contentEditable`), `month.ts:273` (`selectedDays`) and `mapbox.ts:201` (`coords`).

  Command: `grep -rn -E "^\s+form(Disabled|Reset)Callback\(" src | grep -v test`. The base is `tosijs/src/component.ts:2722-2736`. OF counted 10 and 7 in its scope; month and mapbox are outside it.
- **Delete** the 8; replace the 2 stubs.
- **Keep:** the 4 that differ. Note that the base resets to `defaultValue ?? ''`, so deleting the overrides starts honouring `defaultValue`.
- **Tests:** reset and disable through the base for each component (OF's `form-callbacks.ts` is the template).
- **Fixes:** OF-A20 and LB-A7 (map).
- **By:** OF, LB

**P32. `trackDrag` reports the end of a drag.**
- **Merges:** each caller's own test for `mouseup`: `float.ts:156`, `sizer.ts:87` and editable-rect ×4. The callback gets a `done` flag, and `trackDrag` removes the TRACKER itself. data-table's own touch-id tracking (`data-table.ts:3458-3471`) then goes.
- **Tests:** a mouse end and a touch end.
- **Fixes:** OF-A32.
- **By:** OF

**P33. One "is this a number?" rule.**
- **Merges:** export `numericValue` (`natural-compare.ts:50`) and use it in `valueRenderer`'s `toNumber`, table inference (`data-table.ts:1374`, `:2658`) and the filter's `=` and `>`.
- **Keep:**
  - the number passthrough;
  - `''` is not numeric;
  - decide once whether `1e3` and `0x10` count. Today five copies give five answers (DA ✔ `numeric.ts`).
- **Fixes:** DA-A-8.1 and A-6.4.
- **By:** DA

**P34. Table inference calls `humanise`.**
- **Merges:** `data-table.ts:2655` into `fields.ts:114`.
- **Tests:** `first_name` and `last-name`.
- **Fixes:** DA-A-8.3.
- **By:** DA

**P35. A private `allRows()` in `<tosi-table>`.**
- **Merges:** the union that `selectedRows` already computes (`data-table.ts:4346-4356`), used at `:3562`, `:3574` and `:3659`.
- **Tests:** deselecting pinned rows.
- **Fixes:** DA-A-3.
- **By:** DA

**P36. `idOf(record)` in crud.**
- **Merges:** `crud.ts:619` and `:698`, which treat `null` as no id, with `:721`, which checks only `undefined`.
- **Fixes:** DA-A-5.4.
- **Owner's call:** `blankRecord` filling numbers with `0` (`crud.ts:653-654`) contradicts `blankFor` (`fields.ts:651`), but `crud.test.ts:113` pins the `0`. Changing it is a behaviour change.
- **By:** DA

**P37. `controlSpec(field) → {tag, type, step, required, readonly, options}` in `fields.ts`.**
- **Merges:** `data-table.ts:3044-3066` and `schema-form.ts:2548-2570`.
- **Keep:**
  - the form's `required` and its `readonly` for a `const`;
  - the table's checkbox derived from `col.type`;
  - one rule for option labels: today one copy uses `o.label` and the other `String(o.label)`.

  It returns data, so it is not a router. Each component keeps its own listeners.
- **By:** DA

**P38. A `/__docstore` fetch helper and DOM-free endpoint constants (`dev-endpoints.ts`).**
- **Merges four clients with four error contracts:**
  - `doc-browser.ts:1754-1805`
  - `theme-editor-panel.ts:53-87`
  - `data-client.ts:58-92`
  - `live-example/source-access.ts:40`
- **Merges the endpoint strings:**
  - `'/__docstore/source'` ×4: `doc-browser.ts:1796`, `theme-editor-panel.ts:72`, `component.ts:2573` and `dev-server.ts:2930`;
  - `'/__docstore/data'` ×2;
  - `CHECKLIST_ENDPOINT` (`checklist-client.ts:60`), which `checklist-handler.ts:44` and `dev-server.ts:2993` don't use.
- **Keep:**
  - refusing an HTML catch-all answer (today only `data-client` and `loadSource` do);
  - the 401/403 distinction;
  - the JSON `error` body;
  - read and write as separate functions.
- **By:** DC, SS

**P39. Every bin uses `parseArgv`.**
- **Merges:**
  - `make-icon-data.js:118-133`, which ignores unknown flags and treats `--help` as a run;
  - `bin/dev.ts:33, 56, 80-81`;
  - `bin/verify-schema-dep.ts:21`;
  - `bin/generate-og.ts:105-108`;
  - `resolve-site-config.ts:67`'s own `--config=` reader, which `parseArgv` then rejects (#4036, #2876);
  - `bin/checklist.ts:45, 49`, which re-derives `rest`.
- **Keep:** make-icon-data's old space form (`--input dir`) alongside `--input=dir`. Add `config` to the values of `tosijs-tunnel`, `tosijs-deploy` and `tosijs-caddy-install`.
- **Tests:** `--help` on every bin (#1595), and the `--name=value` spellings.
- **Fixes:** LB-A10.
- **By:** LB

**P40. `ssh(host, cmd, {batch})`.**
- **Merges:**
  - the copies with BatchMode and ConnectTimeout: `tunnel-links.ts:194-201`, `resolve-site-config.ts:618`, `tunnel.ts:247` and `:290`;
  - the copies without options: `resolve-site-config.ts:344, 352, 368, 390, 561, 572-573`. Because of these, `registerCaddyFragment` and `refreshHostIndex` can hang on a prompt.
- **Keep:** the interactive installer (`caddy-install.ts:306`) opts out.
- **By:** LB

**P41. Text on a colour: one WCAG `textOn(bg)` in `theme.ts`.**
- **Merges:** `Color.contrasting()` (`theme.ts:212`, `:226`, the `tag-colors.ts:17` fallback) with the best-of-two rule in `tag-colors.ts:13-19`. CSS `textOn` (`css-value-forms.ts:72-79`) stays, because it is the same rule computed by the browser.
- **Owner's call:** this changes `--tosi-accent-text` for some accents, always toward AA.
- **Tests:** a teal accent checked against WCAG.
- **Fixes:** IT-A7.
- **By:** IT

**P42. "Is a colour": one predicate and one `supports()`.**
- **Merges:**
  - the predicates: `theme-data.ts:308` and `:352`, `css-value-forms.ts:101` and `theme-discovery.ts:64`;
  - the `CSS.supports` guards: `theme-data.ts:312-315`, `theme-discovery.ts:52-55` and `css-value.ts:132-135`.
- **Keep:**
  - browser-confirmed named colours only, which rejects `serif`;
  - the `url(` exclusion;
  - one explicit list of the syntaxes tosijs `Color` can transform, which the docs then cite.
- **Fixes:** IT-A9 (document the limit).
- **By:** IT

**P43. One page probe, in place of the `resolveColor`/`resolveLength` copies.**
- **Merges:** `theme-discovery.ts:179-202` and `251-260` with `css-value.ts:561-587`.
- **Keep:**
  - discovery's cached canvas context, `willReadFrequently` and `clearRect`;
  - css-value's invalid-value guard (`:565`);
  - a scope parameter.

  This stops css-value building a canvas on every call (`:576`).
- **Fixes:** IT-A10b.
- **By:** IT

**P44. One home for lengths: `css-value-forms.ts`.**
- **Merges:**
  - `LENGTH_UNITS` (`theme-editor.ts:224`, `css-value.ts:130`) and the unit alternation in `css-value-forms.ts:100`;
  - `splitLength` (`theme-editor.ts:227-234`, `css-value.ts:137-142`).
- **Keep:** only `0` may be unitless, and the amount is a number. `theme-editor` re-exports both public names.
- **Fixes:** IT-A10a.
- **By:** IT

**P45. `parseOptionList(str)` in `caption-icon.ts`.**
- **Merges:**
  - `select.ts:408-424`, where an empty entry becomes a `null` separator;
  - `segmented.ts:195-206`, which filters empty entries and resolves icons eagerly;
  - `tag-list.ts:187-191` and `:330-332`, which supports `\,` escaping.
- **Keep:**
  - `\,` escaping;
  - `null` separators;
  - `caption:icon` through `splitCaptionIcon`;
  - the icon kept as a name.

  One grammar; each caller filters its own result.
- **By:** OF

**P46. A shared example-grouping walk.**
- **Merges:** `epub.ts:524-554` `injectExampleLinks` with `insert-examples.ts:277-322`, including the `example-N` ordinal. Export the walk from live-example as a DOM-agnostic function.
- **Keep:** the `tosi-transpiled` skip (`nextGroupableSibling`). The ePub is only safe without it today because it renders without bakes.
- **By:** SB

**P47. Small merges where the copies disagree:**

| package | merges | the disagreement | by |
|---|---|---|---|
| Popup surface style | `menu.ts:985-999` = `search-field.ts:347-360`, and `live-example/component.ts:902-912` | the live-example copy lacks `chainSurface`, `chainElevation` and `tosiRadius` | OF |
| Resolved position | `tooltip.ts:185-190` re-derives `pop-float.ts:351-354` | top edge and `>`, against centre and `<`; `positionFloat` should return what it resolved | OF |
| `normalizeAddress()` | `dev-auth.ts:1743`, `:1761`, `:1790` | the loopback copy does not strip an IPv6 zone id | SS |
| `envFlag()` and `isCI()` | `preflight.ts:535`, `dev-server.ts:957`, `open-browser.ts:200`, `dev-server.ts:3351`, plus five more flag rules | 3 CI rules and 7 boolean rules (SS-A9) | SS |
| Project-link icons table | `header.ts:144-150` and `doc-browser.ts:1348-1354` | labels differ (`key` against `'npmjs'`) | LB |
| `createsCycle` via `chain()` | `nav-tree.ts:132-148` → `book-target.ts:85` | a doc under a cyclic section becomes a root (DC-A11) | DC |

### 1b. Duplicates that agree today

| # | package | merges | keep | tests | by |
|---|---|---|---|---|---|
| P48 | `escapeRegExp` | **Recount: 14 identical copies** (13 in `src`, 1 in `bin`): `css-value-forms.ts:80`, `router.ts:234`, `icon-core.ts:262`, `palette.ts:289`, `theme-editor.ts:376`, `doc-search.ts:169`, `release-notes.ts:247`, `doc-title.ts:67`, `orchestrator.ts:212`, `bundle-guard.ts:61`, `restamp.ts:43`, `code-transform.ts:193` and `:237`, `bin/tunnel.ts:232`. **Plus 2 glob variants without `*`:** `theme-discovery.ts:41` and `book-manifest.ts:64`. Command: `grep -rn --include='*.ts' -E "\\\\\\$&" src bin \| grep -v test`. SB counted 8, IT 15, LB 15. `make-llms-txt.ts:325` escapes `[]` for a markdown link and is not one. | the glob callers escape after splitting on `*`, so they can use the same helper; `RegExp.escape` exists in this Bun, and whether to use it depends on the browser targets (owner) | one unit test | IT, LB, SB |
| P49 | `slugify` | `routing.ts:206`, `book-html.ts:141`, `epub-volumes.ts:24` (private) | `routing`'s copy; ✔ the copies agree on 200k random strings (SB). The Unicode heading rule (`heading-id.ts:25`) is a different rule | — | DC, SB (#3435) |
| P50 | `fnv1a32()` and `projectTempPath(kind, root)` | **6 copies, confirmed:** `build-lock.ts:43`, `debug-sink.ts:35`, `checklist-store.ts:97`, `epub.ts:1057`, `example-store.ts:38`, `bin/tunnel.ts:123` | `>>> 0` per step or once at the end gives the same result (✔ SS, 5,000 strings) | — | LB, SS |
| P51 | Nav-tree helpers in `nav-tree.ts` | flatten ×4: `book-html.ts:154`, `generate-site.ts:321`, `continue-link.ts:28`, `doc-browser.ts:2097`. Trail ×2: `continue-link.ts:16` = `generate-site.ts:311`. Open path: `doc-browser.ts:2201` = `nav-tree.ts:154` | — | — | DC |
| P52 | `validateErrors(value, schema, known, who)` in `validator.ts` | `schema-form.ts:1943-1966` and `data-table.ts:2953-2974`, which also re-implements `errorFor` | `warnNoValidator(who)`, `strict: true` | needs `CSS.escape` in test-setup (H1) | DA |
| P53 | `controlText(value)` | `data-table.ts:3017-3026`, `schema-form.ts:2603-2616`, `curate.ts:253-261` | the form skips the focused element | — | DA |
| P54 | `indexAfterMove(i, from, to)` | `schema-form.ts:2368-2391` re-derives `moveItem` (`fields.ts:630-643`) | — | a unit test (#3240: proposals are tested only in Playwright) | DA |
| P55 | `lcsWalk(a, b, emit)`, and cache `blocks` | `diff.ts:203-240` and `:287-326`; the getter at `:603-605` recomputes on every read | `MAX_TOKENS`; add a common prefix/suffix trim to `diffLines` | ✔ EL `diff-cost`: 6,000 lines take 124 ms and +226 MB | EL |
| P56 | Small live-example merges | `normalizeSource` ×3 (`save-to-source.ts:160`, `component.ts:3024`, `example-store.ts:35`); the `tosi-transpiled` test ×3 (`insert-examples.ts:36`, `:51`, `:68`); the font stack ×2 (`code-editor.ts:424`, `code-editor-cm.ts:224`) | — | — | EL |
| P57 | Site-serve helpers | cookies (`dev-auth.ts:541`, `:715`, `:1063`, plus inline surgery at `dev-server.ts:2377-2383`); JSON responses (`dev-server.ts:1446`, `checklist-handler.ts:31`, 13 inline); no-store ×3 spellings, wrapped once so `doc-site-system.md:793` becomes true; invite-page chrome (`invite-page.ts:69-76` = `dev-server.ts:2779-2792`); link printing (`dev-server.ts:1067-1068` = `:1111-1112`); `passCheck` runs twice per request (`:2355`, `:2565`; #3448) | — | — | SS |
| P58 | `noPreviewHost(bin)` | `deploy-preview.ts:76-88` = `caddy-install.ts:65-77` | — | — | LB |
| P59 | Config defaults resolved once | **Recount:** `outputDir ?? 'docs'` at 14 sites (12 in `site/`), `docsJson ?? 'demo/docs.json'` 6, `scriptUrl ?? '/iife.js'` 3, `liveExamples ?? 'auto'` 5. Command: `grep -rnF "outputDir ?? 'docs'" src bin`. Merge into one `resolveSiteConfig()` at the top of buildSite, restampSite and buildEpub | the defaults themselves | — | SB |
| P60 | tosijs-ui's package dir | `orchestrator.ts:1813` should use `tosijsUiDir` (`codemirror-copies.ts:116`) | — | — | SB |
| P61 | Small overlay merges | chip colours (`tag-list.ts:539-543` = `search-field.ts:815-819`, into `tag-colors.ts`); z-index (`bringToFront` at `pop-float.ts:341` and `float.ts:179`: keep the second, and skip the scan in `refitFloats` at `:448`); form value (`form.ts:427-445` against `:544-561`, keeping the radio and empty-array cases) | ✔ OF `z-scan`: opening one menu makes 4,003 `getComputedStyle` calls | — | OF |
| P62 | Listbox-in-a-float controller | `search-field.ts:569-611` and `723-780`; `live-example/component.ts:1519-1555` and `1752-1845` | search-field's ARIA and watcher (or P26), and live-example's Tab-to-insert | — | OF |
| P63 | Small theme merges | colour-well alpha sync (`theme-editor.ts:620-627` = `css-value.ts:553-559`); the palette spinner keyframes (`palette.ts:609-616`) should use the icon `spin` rule, which also brings reduced motion | — | — | IT |
| P64 | Small doc-client merges | `filenameForSlug` (`doc-browser.ts:724`) = `filenameForPath`'s inner `find` (`routing.ts:162`); `pageName()` for `generate-site.ts:539` = `make-llms-txt.ts:123`; "scroll to the failed example" ×2 (`doc-browser.ts:2114`, `2484`), scoped to `docContent`; inject-once ×3 (`highlight-styles.ts:115`, `theme-editor-panel.ts:90`, `checklist-panel.ts:138`) and the 4 unguarded `StyleSheet` calls (`doc-browser.ts:2340-2345`), all through `StyleSheet(id)` (#4179) | — | ✔ DC: 3 browsers leave 12 `<style>` elements | DC |
| P65 | Following a container's size | 5 mechanisms (LB table); one `observeParent(el, cb)` built on splitter's parent ResizeObserver (`splitter.ts:438-440`) | splitter's `typeof ResizeObserver` guard | **LB is unsure:** first run a Playwright check that `offsetParent` equals `parentElement` in the doc browser | LB |
| P66 | Dark derivation, after the tosijs fix | `createDarkTheme` (`theme.ts:289`) and `componentThemeGenerator.dark` (`theme-data.ts:702`) | **blocked:** file the `Color` `_hsl` cache bug with tosijs first (IT-A8) | — | IT |
| — | Directory walkers (low value) | 6 in `site/` (SB B15) | — | — | SB |

### 1c. Teardown and caches

Items marked "= A" are already defects in section A. They are listed here so the teardown pass doesn't miss them.

**T1. Release on disconnect what connect added.**

| site | what is never released | = A? |
|---|---|---|
| `side-nav.ts:177` | the window `resize` listener; also re-arm the transition (`:199`, `:209-217`) | = LB-A3 |
| `rich-text.ts:472-475` | the `selectionchange` listener | = OF-A13 |
| `crud.ts:842` | a form `change` listener, added on every connect | |
| `filter-builder.ts:432-436` | the remove listener; it also calls `reset()` on every connect (`:619`) | = DA-A-6.5 |
| `css-var-editor.ts:85` | a change listener on every connect; `update` also runs twice, because of `changeCallback` at `:28` | |
| `palette.ts:848-853` | running searches and their timers; call `this.searching?.abort()` | |
| `carousel.ts:463-468` | `snapTimer` (`:341`) and the animation frame (`:384`) | |
| `sizer.ts:98-100` | `target` is cached from the first parent | |
| `data-table` | no `disconnectedCallback`: two MutationObservers (bounded) | |
| `<tosi-lottie>`, `<tosi-map>`, `<tosi-3d>` | the animation, the map's WebGL context, the engine | = LB-A3 |

**T2. Once-guards for global installers, and a `dispose()`.**
- `initTooltips` (`tooltip.ts:219`) has no once-guard (= OF-A26).
- `enableLiveTheme` after disable stacks observers (`live-theme.ts:172-189`; = IT-A11e).
- `devServer` adds `exit`, `SIGINT`, `SIGTERM` and `SIGUSR2` on every call (`dev-server.ts:903-914`, `:1136`).
- `TosiDocSystem` re-runs `initPrefs` on every connect (`doc-system.ts:724`). Each run re-registers the global `prefs` (`:406`) and adds a `matchMedia` listener (`:416`) and four observers.
- `createDocBrowser` needs a `dispose()` to release:
  - `i18n.locale.observe` (`doc-browser.ts:1118`);
  - `testManager.enabled.observe` (`:2836`);
  - `popstate` and `beforeunload` (`:1155`, `:1200`);
  - its four styles;
  - the global bindings.

**T3. Per-example timers that run whether or not anything is open (EL).**
- Per connected example:
  - a 250 ms interval (`component.ts:2916`);
  - a 500 ms localStorage poll (`remote-sync.ts:158`);
  - a `BroadcastChannel` (`:151`).
- An unconditional `sendClose()` on every disconnect (`component.ts:2945`).
- `options` JSON-parses its attribute on every read (`:1164`).

Start them only when a pop-out is opened, and send the close only then.

**T4. Server-side growth.**
- `triggers` (`dev-server.ts:2099`) is never cleared; clear it when the streak resets.
- The haltija socket `queue` (`:3246`) is unbounded until upstream opens.
- The doc-browser's background runner does not remove its frame and handler in a `finally`, and nothing stops a run when tests are toggled off (DC).
- Session maps: see P9.

**T5. Caches and garbage.**
- css-value builds a canvas per call; fixed by P43.
- `TosiDiff.blocks`; fixed by P55.
- Five announce-once flags (`orchestrator.ts:627-637`) could be one `Set`; low.
- select's `XinLocalized.allInstances` membership is decided at connect and again at disconnect (`select.ts:716-729`); read only.
- `notifications.ts:554` re-appends the singleton on every post; harmless.

**By design, so nobody "fixes" them:**
- localize's single page-lifetime MutationObserver (`localize.ts:534-575`);
- the theme editor's `<style>` outliving it;
- the icon-spin `WeakSet` and adopted sheet;
- `watchReader`'s capture listeners;
- `ensureMenu` and its siblings;
- pocket-bar's `pointerdown` listener (correctly torn down);
- `compressCache`, `auth.sessions`, `auth.grants` and the redemption gate (all bounded);
- the audit timer (unref'd).

### 1d. Dead code (internal only)

Anything still reachable through the `./*` wildcard needs a check before it goes.

| # | area | delete |
|---|---|---|
| D1 | overlays | `rich-text.ts:272` `savedValue` (✔ OF: the only `--noUnusedLocals` error in the project); `select.ts:266-267`'s `Array.isArray` branch (replace it with submenu recursion: OF-A29); `tag-list.ts:205` `Tag.icon`; `dialog.ts:348`'s z-index line (OF-A24) |
| D2 | data | `filter-builder.ts:484` `resent` (a typo), `:622-624` (a `render` that only calls `super`), `:334` (an invalid selector); `month.ts:556-567` (`selected`/`inRange` never read) and `:424` (unreachable); `data-table.ts:2956` `_value`; `:2759-2763` `rowClasses` |
| D3 | data comments | orphaned or contradicted: `data-table.ts:2941-2947`, `schema-form.ts:1968-1974`, `data-table.ts:2976-2983`, `:3092-3094` (against `:1749-1767`), `:2495`; `crud.ts:857-863`; `schema-form.ts:1602-1613`; `fields.ts:321-324`; `unenforced.ts:13-15` (now the fallback: fix the header, keep the file); `validator.ts:2, 21-24` ("two functions"; there are three) |
| D4 | icons-theme | `localize.ts:817` `contents` (a misspelling of `content`); `select.ts:233, 717, 728` should use `TosiLocalized`, which leaves `XinLocalized` with no internal user; stop generating `src/icon-data.ts` at `bin/dev.ts:105` and derive `IconName` from `icons/data/index` (`icon-types.ts:2`). The generator keeps `--output` for adopters |
| D5 | layout/bin | `tab-selector.ts:175` (`tabs` and `_bodyId`), `:405-406` (the id: LB-A2), `:367-368`, `:343`, `:444`; `carousel.ts:346-354`, `:169-173`, `:122`; `side-nav.ts:176`, which is always true (decide whether `assignedNodes()` was meant); `via-tag.ts:87-92` (with LB-A4); `mapbox.ts:235-242`, `:330-335`; `babylon-3d.ts:375`; `make-icon-data.js:5` and `release-notes.ts:5` (dead `<!--{}-->` metadata); `bin/docs.ts` (#1576) |
| D6 | live-example | `remote-sync.ts:77` `sendCloseSignal`, which has no caller; `styles.ts:193`, `:446-453` (with the `--code-editors-bar-*` variables at `:9-10`), and the `.sizer` half of `:455`; `code-editor-cm.ts:290` `CmHandle.focus`; `:300` `CmOptions.languageExtension`, which no caller passes (it is read at `:354`); stop passing `{ transforms: ['typescript'] }` (`code-transform.ts:305`, `execution.ts:367`, `:526`, `test-harness.ts:398`, `check-examples.ts:221`); `code-editor.ts:288` `role = 'code editor'` (EL is unsure: run an axe pass) |
| D7 | site-build | the `make-llms-txt.ts` legacy scan (`:12-13`, `41-44`, `140-175`, `333-336`), after which `corpus` can be required; `epub-a11y.ts:160-165` `findAce`; `stripDocMeta` in the `epub.ts:62` re-export (keep `DEFAULT_BOOK_CSS`: `site/index.ts:50` re-exports it from there); `orchestrator.ts:2229`'s hidden filter |
| D8 | site-serve | `haltijaIsDrivable` (`dev-server.ts:437-458`) and its rationale (`:3610-3626`); `isSPA` (`:918`, `:3191`); the shadowed `HALTIJA_VERSION ??` (`:316`); `_now` (`dev-auth.ts:145`); the alias at `single-source.ts:132`; `csrfOk`'s `viaTunnel ||` (P10) |
| D9 | JSDoc on the wrong declaration (one pass plus one test) | `site-config.ts:838-897` (`haltijaDev`, SB-A6 #13); `epub.ts:1021-1023`; `orchestrator.ts:26-31`, `:126-127`, `:328-333`; `render.ts:411`; `doc-system-styles.ts:43`; `release-notes.ts:329-335`; `generate-site.ts:331-339`; the 10 misplaced blocks in `dev-server.ts` (SS: `:112-142`, `:206-230`, `:403-412`, `:995-1000`, `:1691-1722`, `:2414-2419`, `:2472-2557`, `:3005-3009`, `:3207-3224`). **Test:** "every `SiteConfig` field has exactly one JSDoc" (SB's `dts-docs.ts`), in place of the hand-kept `DOCUMENTED` list |

### 1e. Declarations written twice

| # | derive | from | by |
|---|---|---|---|
| W1 | the `liveExamples` union (`site-config.ts:242`, `generate-site.ts:80`, `page-globals.ts:18`, `:25`) and `SiteExamplePolicy` (`insert-examples.ts:97`) | one `as const` list beside `ExamplePolicy` (`example-policy.ts:121`), as `EXAMPLE_VIEWS` (`:161-162`) does; type `setExamplePolicy` (`insert-examples.ts:157`) as `SiteExamplePolicy` | SB, EL |
| W2 | the `kind` union (`site-config.ts:220`, `generate-site.ts:110`) | `SITE_KINDS` (`page-globals.ts:26`) | SB |
| W3 | `GenerateSiteConfig` (`generate-site.ts:57-178`, about 25 fields, JSDoc drifted) | `Pick<SiteConfig, …> & {…}` | SB |
| W4 | `Dialect` (`live-example/types.ts:15`) | `BUILT_IN_DIALECTS` (`example-policy.ts:39`) as `as const` | EL |
| W5 | the four-slot source shape (`save-to-source.ts:134`, `example-store.ts:13`, `types.ts:38-49`, `remote-sync.ts:53`, `:176`, `example-hooks.ts:15`) and about 10 literal `['js','html','css','test']` | `SOURCE_SLOTS` and `ExampleSources`; also add `testStatus`, `splitter` and `refresh` to `ExampleParts` (`types.ts:17-36`) | EL |
| W6 | the notification type union (`notifications.ts:191`), `COLOR_MAP` (`:199`) and `SEVERITY` (`:220`) | one table | OF |
| W7 | `AffixPosition` and `POSITIONS` (`affix.ts:152-173`), `FloatPosition` (`pop-float.ts:256-269`) | `EDGE_POSITIONS` as `as const` | LB |
| W8 | internal `_dropMode`, `_dataTypes` and `submenuDepth` on public `PopMenuOptions` (`menu.ts:1547`, `1575-1576`) | an internal type | OF |
| W9 | theme literals: `componentThemeGenerator.defaults` (`theme-data.ts:693`) = `defaultColors` (`theme.ts:145-149`); `VALUE_KINDS` (`theme-editor.ts:203`) = `CssValueKind` (`css-value-forms.ts:13`) = the `CSS_VALUE_FORMS` and `LITERAL_LABELS` keys; `TRIGGERS` (`palette.ts:202-203`); `ThemeColors` (`theme.ts:129-132`) and `.base` (`theme-data.ts:688-692`); `DOC_THEME_DEFAULTS` (`doc-system-styles.ts:875-882`) and `rootColors` (`:172-177`, `#222` against `#222222`); `docSystemThemeGenerator.base` (`:888`) and `DocSystemTheme` (`:36`) | the data in each case | IT, DC |
| W10 | `IconData` declared twice (`icon-types.ts:4` and the generated `icon-data.ts:1`) | — (with D4) | IT |
| W11 | `CURATED_KEYS`/`SECTION_KEYS` (`curate.ts:66-75`); `ValueRendererType` and its `switch` (`value-renderer.ts:66-79`, `216-301`) | `satisfies readonly (keyof …)[]`; a `RENDERERS` record | DA |
| W12 | `PageTestResults` (`doc-browser.ts:200`) = `PageTally` (`test-completion.ts:62`); the literals `navSize = 200`/`minSize = 600` (`doc-browser.ts:695-696`) and `HEADER_LINKS_COLLAPSE_PX` (`:629`) | an alias; `SIDEBAR_WIDTH`/`_BREAKPOINT` moved to `nav-styles.ts` | DC |
| W13 | `Upgrader` (`dev-server.ts:518`, restated at `:1538`, `:2401`, and as `srv: any` at `:1706`); the admission union (`:1444`, `:1542`, `dev-auth.ts:1268`); `SessionRejection` (`invite-page.ts:9`); `'edit' \| 'view'` written about 12 times | the existing declarations, and one `type Access` | SS |
| W14 | the `dist-sizes.json` shape (`bin/record-sizes.ts:21-24` and `orchestrator.ts:406-418`) | one type | LB |
| W15 | the DOM-global name lists (`build-dom-shim.ts:25-65` and `test-setup.ts:35-82`) | one list; keep both policies (the build shim never replaces native `fetch`/`URL`); `NodeFilter` is missing from the build list | SB (see H1) |

### 1f. Structure (one file per change, no behaviour change)

| # | change | notes | by |
|---|---|---|---|
| S1 | Split `buildSite` (`orchestrator.ts:651-2315`, 1,665 lines) into named passes | Then keep **one in-memory corpus**: today `docs.json` is parsed 6 times in the parent (`:971`, `1576`, `1642`, `1718`, `1950`, `2163`), and the order of statements causes bugs (SB-A7 #18). Then **build the nav once per site and render each doc once**: ✔ 145 of `generateSite`'s 229 ms is repeated work, and the nav part grows quadratically. `skipAudit` is doing two jobs (`:2135`) | SB |
| S2 | Extract `createRequestHandler(ctx)` from `devServer` | `handleRequest` (`dev-server.ts:2399-3205`) is 807 lines inside a 2,897-line closure. Then split out `rebuild-queue.ts` (`2025-2262`), `health-tick.ts` (`3443-3553`, adding SS-A3's reentrancy guard), `haltija-lane.ts`/`haltija-bridge.ts`, `compress-cache.ts`, and the link messages into `invite-page.ts`. Fold the remaining direct `process.exit` calls into `shutdown()` (`:3400`; #1604). Optionally make the route table data, which would generate the guard table and the docs | SS |
| S3 | Split `dev-auth.ts` (2,023 lines) into five modules | link tokens and the gate; sessions; passes and keys; addresses; admission | SS |
| S4 | Split `createDocBrowser` (`doc-browser.ts:688-2894`, one 2,206-line closure) | source editor, test runner, history and scroll, header and search, sharing a small context object; one typed getter for `doc-system.ts`'s `config`, which is parsed 5 times (`:471`, `669`, `679`, `688`, `781`) with 4 keys missing from `DocSystemConfig` (`:106`) | DC |
| S5 | Split `live-example/component.ts` (2,350 code lines) | console and REPL (`844-1970`), test mode, persistence, inline views. In `styles.ts`: merge the console-line rules (`:296` and `:550`); fix the descendant combinators (`:110`, `143`, `168`, `179`, `188`) or the comment at `:34-40`; scope `.-maximize` (`:66`) | EL |
| S6 | data-table and schema-form modules | `table-layout.ts` (`defaultWidth`, `columnLayout`, `probeMaxElementHeight`, `derivedMaxVisibleRows`, `computeStickyInfo`, re-exported); `table-column-menu.ts` (`4166-4297`, which makes DA-A-2 unit-testable); `schema-form/proposals.ts` (about 280 lines) | DA |
| S7 | Split `localize.ts` so `TosiLocalized`/`localize()` live apart from `<tosi-locale-picker>` | breaks the `localize.ts:437` ↔ `select.ts:233` cycle. ✔ LB: `tosijs-ui/tab-selector` ships `select`, `menu`, `float` and `drag-and-drop` only because of `tab-selector.ts:154` (a 15.5 kB gzip entry) | IT, LB |
| S8 | Overlay modules | `menu-filter.ts` (`menu.ts:874-982`); `findShortcutAction` into `match-shortcut.ts`; P45's parser into `caption-icon.ts`; the chip helper into `tag-colors.ts` | OF |
| S9 | bin | split `resolve-site-config.ts` (685 lines, 9 concerns) into `bin/lib/argv.ts`, `site-config.ts`, `preview-host.ts` and `links.ts`, keeping a re-export shim (it ships in `files`); `TosiRow`/`TosiColumn` share one base class plus `syncVar` (`layout.ts:62-148`); call `previewRootFor` once (`bin/tunnel.ts:168-172`, `580-583`); replace the raw `var()` strings (`affix.ts:313-316`, `497`; `header.ts:115`; `pocket-bar.ts:303`, `324`; `tab-selector.ts:221-224`) | LB |
| S10 | Theme and icons | `theme-editor.update` derives the theme twice (`:1169`; measure first, #4151); give `icon-suffixes.ts` the token meanings that `icon-core.ts:370-428` and `icon-svg.ts:56`, `:138-163` restate (low) | IT |
| S11 | Move `doc-system/release-notes.ts` out of the browser-safe modules | its stated reason (`:4-6`, `root = "./src"`) is stale: `bunfig.toml:9` is `root = "."`. This changes the wildcard path `bin/release-notes.ts:76` imports | DC |

### 1g. Test and build harness

| # | package | detail | by |
|---|---|---|---|
| H1 | Derive the test-setup globals from the happy-dom Window | `test-setup.ts:35-82` hand-lists about 45 names and leaves out `CSS` (so `CSS.escape` is missing: #3229, and no mounted form with a union, array or plugin can be unit-tested), `location`/`history` (which blocks `createDocBrowser` unit tests), `TouchEvent`, `PointerEvent` and `matchMedia`. Copy what the Window has and `globalThis` lacks; keep the explicit binds; share the list with W15. LB-A13 (the `fetch` replacement) is a defect in this same file. **Check first** that leaving `location`/`history` out was not deliberate | LB, DA, DC, SB |
| H2 | `withTempDir` and `captureWarnings` helpers | 13 test files in SB's scope (22 across `site/`) hand-roll `mkdtempSync`/`rmSync`; 6 stub `console.warn`; temporary git repos repeat (SS) | SB, SS |
| H3 | `tick()` and `waitUntil(pred, timeout)` | `form.test.ts` repeats a 10 ms sleep **12** times; doc tests have poll loops with no timeout (`data-table.ts:88-94`, `105-111`, `151-158`, `390-401`, `823-829`; `theme-editor.ts:79`; `css-value.ts:56`). `waitUntil` sits beside `waitFor`, which is the live-example area's decision | OF, DA, IT |
| H4 | One `mount()` for live-example tests | `example-console-panel.test.ts:8`, `example-view.test.ts:15`, `running-indicator.test.ts:32`, and `dialect-bake.test.ts:14` (named `run`) | EL |
| H5 | Bin harness | a shared `bin/lib/checks.ts` (`smoke-consumer.ts:31-40`, `925-933`; `verify-schema-dep.ts:39-41`, `145-157`); make `smoke-consumer.ts:437-459` and `package-exports.test.ts` iterate `exports`, including each `.js` twin (LB-A1); make `verify-schema-dep --version` install into a scratch dir (`:24` rewrites `package.json` and `bun.lock`), and add the three checks the `^1.8.0` floor encodes; `deprecated-aliases.test.ts` covers class aliases only | LB |
| H6 | Missing coverage, to fill as merges land | **No unit tests:** tooltip, float, tag, segmented, rating, password-strength, rich-text, track-drag, drag-and-drop, editable-rect (OF); tab-selector, sizer, size-break, layout, header, via-tag (LB); the `createDocBrowser` factory, whose 9 tests all cover `hasTestBlock` (DC); request routing (SS; #4188); `buildSite` itself (SB; #3106); `<tosi-css-value>`, `<tosi-color>`, live-theme, theme-chain (IT). **Low line coverage** (✔ OF): drag-and-drop 8%, tag 25%, rating 40%. Every ✔ script in the eight reports is a ready-made regression test | all |

### 1h. Docs packages (no API change), grouped by file

Items that only document an A defect are marked "(A)"; the code fix lands there.

**R0. Teach real imports in examples.**
- The repo-wide **recount:**
  - `} = tosijsui` (the doc-runner global): **11 lines in 6 files** (`diff.ts` ×3, `select.ts` ×3, `form.ts` ×2, `month.ts`, `rating.ts`, `splitter.ts`). No report named `splitter.ts`.
  - `} = tosijs`: `icons.ts:21`.
  - `from 'tosijs'.elements`: **10 uses in 9 files**, of which `code-transform.ts` and `component.ts` document the rewrite itself. IT said 10 files.
  - Commands: `grep -rn -E "\} = tosijsui\b" src` and `grep -rn -E "from ['\"]tosijs['\"]\.elements" src`.
- Prerequisite: register `tosijs-ui/<subpath>` context keys, so examples can teach the subpath imports. That fixes `component.ts:342` (`registerDialect` and `liveExample` imported from the root), `checklist.ts:18`, `theme-stress-tests.md:113` and `:224` (#4152).
- By: OF, DA, IT, EL, LB.

| file | fixes | by |
|---|---|---|
| **README.md** | Quick Start (`:35-48`) teaches the root barrel first; teach the subpath first (✔ LB: one component is 106.9 kB gzip from the root, against 29.2 kB for `/data-table`, 15.5 kB `/tab-selector`, 2.3 kB `/splitter`, 1.1 kB `/side-nav`) | LB |
| **Using-Components.md** | `:436-449`: says 5 TSV header rows, there are 4 (✔: the emoji row and languages come out wrong); `:360-362`: "clear error … if an icon doesn't exist" is false (✔ an empty `<svg>`); `:298`: `codeEditor` is not in the root barrel; the H1 reads "# 0."; teaches the root barrel first; it isn't published (not in `docPaths`, `tosijs-site.config.ts:137`), so publish it or fold it into the README (#3094) | LB |
| **src/docs/migrating.md** | `:217-220` says "most log a runtime deprecation warning", but only 5 of the 33 xin aliases warn; it promises removal "in a future major" (see E1); `:82` and `:95` name `<live-example>` where the tag is `<tosi-example>`; it stops at 1.16.21, missing 1.19.0's break (`tosiThemeEditor` left the root) and 1.20.0's `onCloseTab` | LB, DA |
| **src/docs/adopting-the-doc-system.md** | `:56`: the build one-liner exits 0 on a failed build (A, LB-A14; also tell the four consumers); `:43` lists 4 fence languages, but its own `:126` says 6 | LB |
| **src/docs/theme-stress-tests.md** | `:113`, `:224` import from the root (#4152; R0) | LB |
| **doc-site-system.md** | `:83`: the same build one-liner (A); `:37-45`: the pipeline diagram has generate-css after the pages; `:2274-2296`: "mount-agnostic" overstates it (say #1413/#1404); the llms.txt URL omits `basePath`; `:572` and `preflight.ts:547`: non-TTY does not downgrade (✔ SS); `:780-781` says "every five", but the code checks every 60 s tick; `:793`, "every response carries no-store", is false (fixed by P57); `:1051`, `:1467`, `:1715` say a 7-character code, but it is 8 letters from a 22-letter alphabet (`dev-auth.ts:194-195`); `:568`: "git gets 20 seconds per step" (A, SS-A2), and teach `{ dirs }` before the `['dir']` shorthand; `:828`: the debug sink "before auth" (A, SS-A11); "Strict builds" (`2122-2165`) is missing six checks | SB, SS |
| **CLAUDE.md** | "Creates one `<live-example>` per group" should say `<tosi-example>`; `:131` says the compression cache is "keyed on path + mtime", but it is keyed on path + mtime + size and emptied on every rebuild | LB, SS |
| **JSDoc and comments that ship in `.d.ts`** | `site-config.ts:415-423`: `strict` lists 2 of about 14 checks; `site-config.ts:491-495`, `check-examples.ts:15-17`, `96-98` and `orchestrator.ts:1064-1071`, `1077-1079` teach retagging as `typescript` instead of `:static`, and "six fence languages" leaves out dialects; stale audit claims at `audit-guard.ts:253-265` and `orchestrator.ts:683-686`; stale stamp claims at `epub.ts:102`, `813-816`, `generate-site.ts:146` and `orchestrator.ts:1793-1850`; `generate-site.ts:796-797`; `index.ts:4`; `site-config.ts:742`, `dev-server.ts:1030-1031` (7 characters, 32^7) and `dev-auth.ts:81` (15 minutes, where the default is 5); `bin/tunnel.ts:139-147`; `tosijs-site.config.ts:2` (`bin/site-config.ts` doesn't exist); `smoke-consumer.ts:490`; `release-notes.ts:4-6`; `highlight.ts:99` cites `TODO.md` instead of a card (#1580 is DC's guess) | SB, SS, LB, DC |

In-source `/*#` blocks:

| file:line | fix | by |
|---|---|---|
| `babylon-3d.ts:108-109`, `via-tag.ts:56-58` | the "already-loaded global" promise is false (A, LB-A4) | LB |
| `bodymovin-player.ts:98`, `:178` | the `json` property, and a malformed `%c` (A, LB-A6) | LB |
| `carousel.ts:53`, `:67` | `loop` (A, LB-A5) | LB |
| `code-editor.ts:74-88` | "Migrating from ACE" goes with C row 27 | EL |
| `color-input.ts:7-14` | listens for a `change` that never fires (A, IT-A11a) | IT |
| `crud.ts:135-137` | "so a guard reads as a guard:" introduces a missing example | DA |
| `data-table.ts` | `:11` and `:797` fetch from GitHub at run time; `:520` and `1270-1284` ("no `.tr`", "Breaking change in v1.5.0") are contradicted by the CSS and the tests; `:487-489`: the Row Access heading is cut off; `:939-940`: hiding columns (A, DA-A-2.3); `:190-203` `ColumnOptions` has drifted; `:1292-1305` the strings list | DA |
| `diff.ts:14`, `:42`, `:61` | the runner global (R0) | EL |
| `doc-browser.ts:8-10`, `31-49`, `74-89` | teaches `'query'` routing for embeds where `'memory'` is the safe spelling; the options interface is stale | DC |
| `doc-system.ts:19`, `:31`; `doc-system-styles.ts:337`; `example-policy.ts:173` | `<ul>` should be `<nav>`; the config keys; `navHidden` should be `navVisible`/`alwaysCompact`; `@param` names 2 of the 4 policies | DC |
| `drag-and-drop.ts:106`, `:140`, `:292` | a syntax error on click; b8r's `data-event`; a stray `)` | OF |
| `filter-builder.ts:119`, `128-129`, `142`, `121-144` | the example passes no filters; the keys are `isTrue`/`isFalse`; the method is `makeTest`; the list has drifted | DA |
| `float.ts:68-72`, `:82` | an unclosed CSS rule; the default is `remove`, not hide | OF |
| `form.ts:267`, `:367`; `month.ts:132`; `rating.ts:8`; `select.ts:16-17`, `198`; `splitter.ts` | the runner global (R0) | OF, DA |
| `hash-state.ts:52-54`, `67-76` | an empty namespace reads every instance's keys; "Neither disturbs the other" is false (A, DA-A-7.3) | DA |
| `icons.ts:21`, `236-237`, `301-308`, `310-312`, `621-622` | the `tosijs` global; 28 of 320 data modules hold a redirect token (✔ `grep -L '<svg' src/icons/data/*.ts`); "four attributes" lists five, there is no `color` attribute, and the stroke-width text is stale; the viewBox is not 1024 | IT |
| `localize.ts:37-41`, `105`, `254-259`, `399-430` | the lowercase rule; `'tosijs'.elements`; `xin.i18n` doesn't exist; the `updateLocale` protocol calls `localeChanged()` and has typos (A, IT-A11d) | IT |
| `make-sorter.ts:38`; `notifications.ts:69` | undeclared globals | DA, OF |
| `mapbox.ts:118-131`; `size-break.ts:53-68`; `markdown-viewer.ts:8-11` | token advice under "Form Integration"; `.sizer` matches nothing; two opening sentences say the same thing | LB, EL |
| `menu.ts:367`; `tooltip.ts:9` | teaches `xin-menu`; "markdown" means HTML until OF-A1 is fixed | OF |
| `month.ts:9`; `natural-compare.ts:29-30` | `[part="today"]` should be `.today`; the reader-locale promise (A, DA-A-8.2) | DA |
| `notifications.ts:25` | teaches two spellings; teach only `postNotification` | OF |
| `password-strength.ts:93-96`, `100`; `rating.ts:47`; `rich-text.ts:68-71`; `tag-list.ts:106` | the attribute names and defaults; `strength` is a method; `step` defaults to 1; `commandButton` takes an icon element, and `spacer`/`elastic` belong to layout; `tags` has a setter | OF |
| `schema-form.ts:89-90` against `99`, `1289-1301`, `1311-1319`, `384-386` | "two functions" against "all three"; a repeated paragraph; the API list is missing 7 members; teaches bare `discriminator` while the code reads `x-discriminator` first (`fields.ts:231-242`) | DA |
| `tab-selector.ts:79-82` | `removeTabBody(number)` and `setupTabs()` (A, LB-A2) | LB |
| `theme.ts` | teaches `createTheme`/`applyTheme` and never mentions theme data; cross-link the two | IT |

---

## 2. Phase 2: one way to do each thing

**Uses** counts the 25 consumer repos.
- For imports, the source is the consumer-usage count (a scratch file, not kept).
- For everything else it is the report's own grep, re-run here with `cgrep.sh` for the zero rows.
- "0 ✔" means I re-grepped it here.

**Warns** means that today the spelling warns once at runtime and names its replacement.

| # | task | redundant spelling | same as | uses | warns | notes | source |
|---|---|---|---|---|---|---|---|
| 1 | create or name a component | 28 silent `xin*`/`Xin*` root aliases (list: LB C) | `Tosi*`/`tosi*` (✔ `===`) | 0 (source grep, 26 repos) | n | ✔ exports snapshot: 33 of 282 root names are `xin*`. Removal needs E1 decided and `migrating.md` fixed | OF, DA, IT, LB, EL |
| 2 | same | `xinRating`, `xinSegmented`, `xinSelect`, `xinTag`, `xinTagList` | `tosi*` (wrapped, same tag) | 0 | y | | OF, LB |
| 3 | tabs | `TabSelector`, `tabSelector` | `TosiTabs`, `tosiTabs` | 2 repos, 3 uses each (tjs-lang, loewald-dot-com) | n | warn once in a patch first; `xinTabs` 0 | LB |
| 4 | sidenav | `SideNav`, `sideNav` | `TosiSidenav`, `tosiSidenav` | 2 repos, 2 uses each | n | `xinSidenav` 0 | LB |
| 5 | markdown | `MarkdownViewer`, `markdownViewer` | `TosiMd`, `tosiMd` (same object) | 2 repos/5 and 2 repos/6: **more than the survivor** | n | removal needs edits in tjs-lang, loewald-dot-com and tosijs-product; `xinMd` 0 | EL, LB |
| 6 | other legacy names | `DataTable`/`dataTable`, `LocalePicker`/`localePicker`, `richText` | `TosiTable`/`tosiTable`, `TosiLocalePicker`/`tosiLocalePicker`, `tosiRichText` | 0 | only `richText` | | DA, IT, LB, OF |
| 7 | gamepad types | `XinButton`, `XinGamepad`, `XinXRController{ComponentState,State,Map}` | `Tosi*` types | 0 | n/a (types) | | LB |
| 8 | 3D | `B3d`/`b3d` | tosijs-3d's `tosi-b3d` | 0 (the one consumer uses tosijs-3d's) | y, once per page | the docs promise "until a future major" (E1) | LB |
| 9 | style a menu | `.xin-menu`, `-item`, `-item-checked`, `-separator`, `-element`, `-shortcut`, `-trigger`, `-with-icons`, `-item-highlight`, `.xin-drop-over` | `.tosi-*` | kith-email (`index.html`, 3 rules: **would break**); tosijs-virta lists both (✔) | n | `menu.ts:984` says "remove in next major"; first move `menu.ts:1860` off `.xin-menu-item`, rename the `xin-menu-helper` id, and halve `menuHelperStyleSpec`; needs a CSS migration line in 1.20 | OF |
| 10 | theme a select | `--gap`, `--touch-size`, `--padding`, `--value-padding`, `--icon-width`, `--fieldWidth` (`select.ts:309-315`) | `--tosi-select-*` | 0 | n | defined and never read, so they give no compatibility | OF |
| 11 | table grid | `--grid-columns`, `--grid-row-width` (`data-table.ts:4129-4131`) | `--tosi-table-grid-*` | 0 ✔ | n | written on every resize | DA |
| 12 | tabs vars | `--xin-tabs-*` (`tab-selector.ts:221-224`) | `--tosi-tabs-*` | 0 ✔ | n | | LB |
| 13 | icon vars | `--xin-icon-*`, `--icon-*` fallbacks (`icon-core.ts:562-567`), and the `--xin-icon-size` write (`:590`) | `--tosi-icon-*` | not counted | n | retire them together with IT-A2's fix | IT |
| 14 | legacy theme | `createThemeWithLegacy`, `legacyAliases` (`theme.ts:340-372`) | `createTheme` plus the `--xin-*` names | 0 ✔ (kith-email's `legacyAliases` is its own) | n | | IT |
| 15 | carousel var | `--carouse-button-width` (`carousel.ts:199`, `235`), a misspelling | `--carousel-button-width` | 0 ✔ | n | a patch can add the right name and fall back to the old one | LB |
| 16 | pin columns in code | `pinnedLeft`/`pinnedRight` (`data-table.ts:2683-2715`) | `column.pinned` (✔) | 0 ✔ | n (✔ 0 warnings) | | DA |
| 17 | component vars | `componentVars('select', …)` (`theme.ts:389`) | `varDefault.tosiSelectTouchSize(…)` (✔ same output) | 0 ✔ | n | also 0 internal uses | IT |
| 18 | every icon as one map | `tosijs-ui/icon-data` (97,573 B) | the default export of `tosijs-ui/icons/data` (✔ the test asserts identity) | 0 ✔ | n | do D4 first | IT |
| 19 | live theme | `liveTheme`, `enableLiveTheme`, `disableLiveTheme` | `applyTheme` from your own observer, or the editor | 0 ✔ | n | buggy teardown, and its style id collides with the editor's | IT |
| 20 | post a notification | `TosiNotification.post` | `postNotification` | `.post` 0 ✔; `postNotification` 5 repos/10 | n | keep `post` as the implementation; teach only `postNotification` | OF |
| 21 | read select options | `TosiSelect.selectOptions` | `options` | 0 ✔ | n | | OF |
| 22 | match or show a shortcut | `keystroke`, `keycode`, `canonicalShortcut`, `parseShortcut`, `modifierKeys` (`match-shortcut.ts`); `matchesShortcut`, `describeShortcut` (`palette.ts:207`, `266`) | **not the same**: two grammars, plus a `keystroke` vocabulary that never compares equal (✔ OF) | 0 ✔ | n | merge the grammars first (P28), then pick the names; `ariaShortcut` is a palette-only capability | OF, IT |
| 23 | iframe execution | the boolean `iframe` attribute | `mode="iframe"` | 0 | n | the docs call it a "back-compat alias" (`component.ts:596`) | EL |
| 24 | run code against a context | `executeCode` (`live-example/index.ts:40`) | `executeInline`, which has more guards | 0 ✔ | n | the weaker copy of P15; remove it | EL |
| 25 | insert examples | the `insertExamples(el, ctx, creator, tagName, file)` function | the `LiveExample.insertExamples` static | 0 (✔ loewald-dot-com uses the static) | n | | EL |
| 26 | transform options | `TransformFn`'s second parameter (`types.ts:54-56`) | the closure | n/a | n | drop it after D6 removes the call sites | EL |
| 27 | editor theming | `<tosi-code>`'s `.theme`, `.options` and `.ace` (`code-editor.ts:325-359`), and the `editor` getter's `console.info` (`307-317`) | `--code-bg`/`--text-color`; `editor` | 0 | y (warn-once no-ops) | twelve minors old; delete them with the ACE section | EL |
| 28 | embedded routing | `routing="internal"` (`doc-system.ts:791`) | `routing="memory"` | 0 ✔ | n | | DC |
| 29 | checklist endpoint | the `setChecklistEndpoint` re-export from `/checklist-panel` (`checklist-panel.ts:349`) | `/checklist-client`; `watchChecklist({endpoint})` | 0 ✔ (tosijs-3d defines its own) | n | new in 1.19.2 | DC |
| 30 | section the list | the `checklistSections` re-export (`src/checklist.ts:87`) | `/checklist-client` | 0 | n | | DC |
| 31 | contrast helpers | the re-export at `doc-system-styles.ts:59` (wildcard) | `tosijs-ui/theme` and the root | 0 | n | | DC |
| 32 | slug, escape | `slugify` and `escapeHtml` exported from `book-html.ts` (wildcard) | `routing.slugify`; P12 | 0 | n | | DC |
| 33 | ePub menu | `epubMenuItem`'s legacy branch (`doc-system.ts:148-153`) | none: it builds the derived URL that 404'd (#218) | 0 hand-written pages | n | removing it changes a hand-written page's menu | DC |
| 34 | make a dialect live at build | `registerLiveLanguage` from `/site` (`site/index.ts:136`) | `SiteConfig.dialects`, a superset | 0 ✔ | n | it stays in `example-policy` | SB |
| 35 | `generateSite` options | `GenerateSiteConfig.docsUrl`, `.stylesUrl` (`generate-site.ts:412`, `415`; never honoured), `.llmsTxt` (`:59-60`; never read) | nothing | 0 | n | | SB |
| 36 | llms meta | `LlmsTxtMeta.haltijaDev` (`make-llms-txt.ts:62-67`) | ignored since 1.16.16 | 0 | n | | SB |
| 37 | reach site internals | `tosijs-ui/doc-system/site/<module>` through `./*` | `tosijs-ui/site` | 0 ✔ | n | proposal: `"./doc-system/site/*": null`. `dev-auth` alone exposes 90 exports. This also retires `isLoopbackAddress` (`dev-server.ts:435`), the `parsePs` four-field branch (`preflight.ts:69-77`) and the `make-llms-txt` deep path. Add a smoke-consumer assertion | SS, SB |
| 38 | turn preflight off | `preflight: false` | `'off'` | 0 set it | n | **contested:** SB keeps it as boolean shorthand (`audit-guard.ts:399-401`, beside `audit: false`) | SS / SB |
| 39 | delete a crud record | `TosiCrud.remove()` (`crud.ts:725`) | rename it (e.g. `deleteRecord()`) and leave `remove()` to the DOM | 0 (crud has no consumers) | n | a collision, not a redundancy (DA-A-5.1); breaking, so 1.20 | DA |
| 40 | tosijs namespace | `export * as tosijs` (`index.ts:108`) | `import * as tosijs from 'tosijs'`; `window.xinjs` | 0 | n | it also puts `xinjsui.tosijs` on the CDN global | LB |

Callback properties against events: `selectionChanged` (`data-table.ts:1896`) and `monthChanged` (`month.ts:297`) have no event equivalent, so nothing can be removed yet. The one-way version would add `selectionchange` and `monthchange` first (DA).

### `@deprecated` inventory

✔ `grep -rn "@deprecated" src` gives 80 tags, grouped here by component.

| name | file:line | warns? | consumers | docs still teach it? |
|---|---|---|---|---|
| `XinTag`, `xinTag` | `tag.ts:87-94` | creator only | 0 | no |
| `XinSegmented`, `xinSegmented` | `segmented.ts:509-517` | creator only | 0 | no |
| `XinSelect`, `xinSelect` | `select.ts:769-777` | creator only | 0 | no |
| `XinTagList`, `xinTagList` | `tag-list.ts:549-557` | creator only | 0 | no |
| `XinRating`, `xinRating` | `rating.ts:290-298` | creator only | 0 | no |
| `XinWord`, `richText` | `rich-text.ts:496-504` | `richText` only | 0 | no |
| `xinMenu`, `XinMenu` | `menu.ts:1955-1959` | n | 0 | no |
| the `.xin-menu*` CSS classes | `menu.ts:984` | n | kith-email | **yes**, `menu.ts:367` |
| `XinFloat`, `xinFloat` | `float.ts:189-196` | n | 0 | no |
| `XinNotification`, `xinNotification` | `notifications.ts:649-656` | n | 0 | no |
| `XinField`, `XinForm`, `xinField`, `xinForm` | `form.ts:803-820` | n | 0 | no |
| `XinPasswordStrength`, `xinPasswordStrength` | `password-strength.ts:333-341` | n | 0 | no |
| `XinCarousel`, `xinCarousel` | `carousel.ts:498-506` | n | 0 | no |
| `XinSizer`, `xinSizer` | `sizer.ts:115-122` | n | 0 | no |
| `SideNav`, `sideNav`, `xinSidenav` | `side-nav.ts:231-242` | n | `SideNav` 2/2, `sideNav` 2/2 | no (only migrating.md) |
| `TabSelector`, `tabSelector`, `xinTabs` | `tab-selector.ts:500-510` | n | 2/3 each; `xinTabs` 0 | no |
| `DataTable`, `dataTable`, `xinTable` | `data-table.ts:4615-4625` | n | 0 | migrating.md wrongly says most of them warn |
| `pinnedLeft`, `pinnedRight` (get/set) | `data-table.ts:2683-2705` | n (✔) | 0 | no |
| `MarkdownViewer`, `markdownViewer`, `xinMd` | `markdown-viewer.ts:304-314` | n | 2/5, 2/6, 0 | no |
| `LocalePicker`, `localePicker` | `localize.ts:789-796` | n | 0 | no |
| `XinLocalized`, `xinLocalized` | `localize.ts:845-852` | n | 0 outside; internal at `select.ts:233`, `717`, `728` (D4) | no |
| gamepad `Xin*` types (5) | `gamepad.ts:45-117` | n/a | 0 | no |
| `B3d`, `b3d` | `babylon-3d.ts:294`, `522` | y, once per page | 0 | the docs lead with the banner, but promise "a future major" (`:6`, `:301`) |
| `<tosi-code>` `theme`, `options`, `ace` | `code-editor.ts:325`, `340`, `355` | y, once | 0 | only the migration section |
| `LlmsTxtMeta.haltijaDev` | `make-llms-txt.ts:63` | n (ignored) | 0 | no |

**Legacy that carries no `@deprecated`** (C rows 10–15, 23, 26, 28, 33–37, plus):
- `mode="ide"` (reserved: D);
- `legacyHeadingSlug` (`single-source.ts:134-143`): warn at build when an anchor resolves only that way;
- the `GLOBAL_EDIT_COOKIE` expiry (`dev-auth.ts:568`);
- bare `discriminator`, deprecated only in a comment (`fields.ts:231-242`) and taught first in the docs;
- the `xin-menu-helper` id;
- rich-text's `_xinIconSize`;
- the `xin.i18n` sentence in the docs;
- `SvgIcon`'s `strokeWidth: 1`, documented on a 1024-unit scale;
- the `editor` getter's `console.info`;
- `routing: 'query'` as the default (E7);
- the `projectLinks` header icons;
- the data-table "Breaking change in v1.5.0" doc remnant.

**Runtime warnings:** of the 33 root `xin*` aliases, only the 5 creators in row 2 warn. `richText`, `B3d` and the `<tosi-code>` shims warn too. Nothing else warns.

---

## 3. Not proposing

**Settled in CLAUDE.md or on a card:**

| item | where settled | by |
|---|---|---|
| The doc-system cluster (and `highlight-block`, `theme-editor`, `checklist`) stays out of the root barrel | CLAUDE.md "Subpath Exports"; `index.ts:1-50` | LB, EL, DC, IT |
| No blanket `sideEffects: false` | CLAUDE.md; `index.ts:15-19` | LB |
| `iife.js` is CDN-only; no `browser` condition | CLAUDE.md | LB, EL, DC |
| Keep the `./*.js` wildcard (A1 adds explicit twins) | CLAUDE.md | LB |
| CodeMirror and Prism stay hard dependencies; `tosijs-ui/codemirror` keeps `export *` of 80 names | CLAUDE.md "Key Dependencies"; `codemirror.ts:19-34` | EL |
| `isLiveFence`, `parseFenceInfo`, `collectCodeTokens`, `liveFenceLanguages` are the owners; check-examples' four-language `EXECUTABLE` answers a different question | CLAUDE.md "Live example code blocks"; `check-examples.ts:50-63` | EL, DC, SB |
| Child processes, never `Bun.build()` in-process (P5 changes how they launch, not whether) | CLAUDE.md "Dev servers…" | SB, SS |
| Object- and function-valued props default to `null` | CLAUDE.md | OF, DA |
| Lazy global installers with no teardown (`ensureMenu`, `ensureFloatListeners`, `ensureTooltipStyles`); trackDrag's TRACKER created at import | CLAUDE.md "Subpath Exports" | OF |
| `xin*` removal is a library-wide call; the `xinjs`/`xinjsui` CDN globals stay | CLAUDE.md "Naming convention", "Key Dependencies" | DA, LB, DC |
| The vendored `JSONSchema` type; the injected validator | CLAUDE.md tosijs-schema paragraph; `validator.ts:7-19` | DA |
| The suffix grammar's single owner (`icon-suffixes.ts`); rule-before-suffix order in `suffixedIcon` | CLAUDE.md; #3332 N2 | IT |
| The 641 generated per-icon modules; redirect modules hold the redirect | #3885; `make-icon-data.js:516-517` | IT |
| `tosijs-ui/test-setup` stays a published preload (A13 changes what it does) | #170 | LB |
| `parseArgv` accepts only `--name=value`; bins import `dist/`; smoke-consumer doesn't run the network bins; the exports `types`/`import`/`default` triple | #85, `argv.test.ts:74`; `resolve-site-config.ts:142-149`; CLAUDE.md; `smoke-consumer.ts:566-592` | LB |
| The theme editor out of the root, with fixed colours; `theme-fonts.ts` imports nothing | 1.19.0, `theme-editor.ts:162-163`; `theme-fonts.ts:1-3` | IT |
| localize's `#` annotations; `localizePhrase` | #55 | IT |
| The redemption gate's serialization and `'window'` default; two listeners; `/__alive` before `touch()`; `killStrayServer` leaving foreign listeners alone; the reused haltija channel; `isSameOriginRequest` admitting headerless requests; the debug sink unauthenticated; `mayDriveWithAgent` | `dev-auth.ts:68-85`, `807-880`, `1668-1679`; #4000, #77, #91, #99 | SS |
| The per-process audit memo; `markdownPages` on by default, and `.nojekyll` | `doc-site-system.md:594-598` and "Markdown copies" | SB |
| The 35% comment ratio (the repo's record-why practice) | practices | SS |

**A different job:**
- `popMenu`, `<tosi-menu>` and `popDropMenu`; `popFloat` and `positionFloat`; `<tosi-float>` and `popFloat`; the `TosiDialog` statics and `tosiDialog`; tag-list's `value` and `tags`; `TosiForm.fields` and `value` (OF, `menu.ts:424-438`).
- `nopreservescroll` and `preserveScroll`; `makeSorter` and `naturalSorter` (`make-sorter.ts:119-133`); the pinned counts and the pinned arrays; `table.value` and its properties; crud's cancellable debounce (`crud.ts:749-757`, `851`); `unenforced.ts`'s fallback list (DA).
- `icon-svg.ts` is DOM-free by design (IT).
- `<tosi-md>` (sanitized) and `renderDocMarkdown` (the trusted corpus). `servedForDevelopment` and `isLocalhost` answer different questions; only the identical copies merge (P23). `mode="ide"` is reserved for #3943. The `src/live-example.ts` shim is load-bearing. The example-console switch works at four scopes by design. The memoized `null` for an unavailable tjs-lang is deliberate (EL).
- `doc-browser-entry.ts` exists to avoid an import cycle. `projectLinks` and `navbarLinks` do different things. There are two Prism palettes on purpose. The `?filename` link form stays. The hidden filters stay. So do the `messageHandler` accumulation, the pre- and post-hydration full-screen handling and `TestReportLike` (DC).
- Two DOM shims (only the list merges: W15). The four library-build options (`emitLibrary` 6 configs, `libraryTsconfig` 4, `libraryBuild` 2, `libraryBundle` 1). `extractDocs({output})` and `saveDocsJSON`. The 404 page's inline script. ePub highlighting under `'none'`. The iife built for `bundleEntry` sites is #2437 (SB).
- Env twins of config fields (only their parsing merges: P47). The haltija bridge without a same-origin check: first find out whether haltija checks Origin (SS).

**Not worth a break by itself:**
- tosi-field's `key` against `name`; `options`, `choices` and `availableTags` (OF).
- `deSelect(rows)` (DA).
- `audit: false` against `{mode:'off'}` (SB; see C row 38). The `editableData ['dir']` shorthand: teach the object form first (SS).
- Renaming off-convention names, because a rename adds a spelling:
  - `SvgIcon`, `colorInput` (IT);
  - `LiveExample`, `CodeEditor`, `HighlightBlock`/`tosiHighlight` (EL);
  - `SizeBreak`, `AbTest`, `BodymovinPlayer`, `MapBox` (LB);
  - see E11.
- A camelCase boundary on rule prefixes (#3332, the maintainer's call; IT). Hard-coded English strings: file one localization card beside #3947 and #3979 (LB). 3D, map and lottie stay in the root barrel (they lazy-load, about 10 kB; LB). A positioning or clamping "merge": there is one geometry, and fitting it to the viewport is #3970 (OF). `findHighestZ` and `bringToFront` stay exported (OF).

**Listed in C, but not redundant:**
- bare `discriminator`, because it reads OpenAPI schemas unmodified (DA);
- `applyTheme` against `applyThemeData`, which writes every mode: a teaching decision;
- `createDarkTheme`, which differs from theme data on 3 variables until the tosijs fix;
- tosijs-ui's `contrastRatio`, which throws on a translucent colour where tosijs's ignores alpha;
- `resolveIcon`, which rule authors use;
- `<tosi-color>`, which alone has opacity (#4054) (all IT);
- the root barrel against the subpath (same function, 7–47× the size);
- `<tosi-md>`'s `didRender`, used by loewald-dot-com and a private consumer (EL).

---

## 4. Unused, but not redundant: decisions for the owner

| # | decision | reviewer's recommendation | by |
|---|---|---|---|
| E1 | `migrating.md:217-220` and `babylon-3d.ts:6`, `301` promise removal only "in a future major", but there is no separate major. May 1.20.0 remove the 33 `xin*` aliases, `B3d`/`b3d` and the gamepad XR helpers? | Decide library-wide, then fix migrating.md either way | LB, DA |
| E2 | What the `./*` wildcard makes public | Null out `./doc-system/site/*` (C row 37). Decide whether `schema-form/fields` and `/curate` are API: smoke-consumer asserts `fields` resolves, so `leafFields` is de-facto API (#3229). `resetHighlightStateForTest` ships this way too | SS, DA, DC |
| E3 | Internals in the root barrel through `export *` | Make internal at 1.20: `refitFloats`/`roomOnScreen` (marked `@internal`); 9 menu internals (`createMenuAction` … `findShortcutAction`), after P27; `columnLayout`, `derivedMaxVisibleRows`, `probeMaxElementHeight`; `splitLimits`; `THEME_MODES` (read by nothing); 7 `chain*` exports; the palette's `highlight` (a very generic root name), `rankResults`, `ariaShortcut`, `defaultPaletteRow`. Either keep the affix helpers documented or make them internal. Mark `TosiTable` members private where nothing says so | OF, DA, LB, IT |
| E4 | Public surface that does nothing | Remove or wire up: `TosiForm.context` (`form.ts:648`), segmented's `direction` (`:168`), EditableRect's `rotationSnap`/`positionSnap` (`:91-92`) (OF); `persistToDom`: remove it, or fix it with `textContent` (EL) | OF, EL |
| E5 | 22 of the 39 variables `createTheme` emits are read by no component (`--tosi-button-*`, `--tosi-input-*`, …). There are also two roots: `--tosi-transition` against `--tosi-duration`, and `--tosi-surface` against `--tosi-bg` (#4156 covers radius) | Have the components read them, or document them as being for adopters' own CSS | IT |
| E6 | `liveTheme`, `enableLiveTheme`, `disableLiveTheme`: no user anywhere | Retire them in 1.20, or fix IT-A11e | IT |
| E7 | `createDocBrowser` defaults to the legacy `'query'` routing, which rewrites the host's URL, while its docs pitch it as the embed API. It has 0 direct callers | Make `'memory'` the default at 1.20 | DC |
| E8 | live-example exports: `RemoteSyncManager`, `STORAGE_KEY`, `executeInline`/`executeInIframe` (their signatures take internal elements), `createTestContext`; `testManager` can be written directly | Decide after P15; export `testManager` read-only, or document it as read-only | EL |
| E9 | `/site` exports with no consumer (38 of 50) | Keep `generateSite` as a documented seam and fix its options, or make it internal. Decide on `auditDependencies`/`reportAudit`/`resolveAuditMode`. `attachCovers`, `printCoverManifestUrl`, `renderEpubDownloads` and `VOLUME_MANIFEST` have no adopter story. `openDevBrowser`/`buildOpenPlan` look internal. **Keep** `testReportVerdict` (#4178), `lockPathFor`/`lockDecision`/`isProcessAlive` (with #1542), `assembleCorpus`/`resolveInsets`/`SingleSourceError`, and the checklist exports (tosijs-3d documents `checklistHandler`) | SB, SS |
| E10 | `tosijs-ui/doc-browser` test exports (`focusableCodeBlocks`, `hasTestBlock`, `testIndicatorStyleSpec`); `highlight.ts:197` `loadableGrammars` (0 references) | Check tosijs's iife namespace import before removing | DC |
| E11 | Naming gaps: the `RichText` class has no `TosiRichText`; `EditableRect` (tag `<tosi-editable>`); `FilterBuilder`, `FilterPart` | If 1.20 renames anything, rename these then; any rename adds a spelling first | OF, DA |
| E12 | Policy: source writes follow symlinks (`dev-server.ts:1417`), data writes refuse them (`data-store.ts:211`) | Pick one; it decides P8's `realInside` users | SS |
| E13 | 16 of `SiteConfig`'s 65 fields are set by none of the 21 sibling configs; `strict` is set nowhere (#3106) | Information (a floor, since `bin/site.ts` files may set more) | SB |
| E14 | `dragAndDrop.end()` is missing; tosijs-virta fakes a `dragend` to get it (`virta.ts:7706-7715`) | Add it (OF-A33) | OF |
| E15 | `__test`, re-exported from `@codemirror/view` | Drop it if the surface is ever pinned | EL |

---

## 5. Numbers

Line totals come from each reviewer's own classifier. The classifiers differ (for example, DC counts template-literal CSS as code), so compare the shapes, not the decimals.

| area | files | lines | code | comment | doc (`/*#`) | blank | largest files |
|---|---|---|---|---|---|---|---|
| overlays-forms | 21 | 10,253 | ~5,628 | ~512 | ~3,519 (34%) | ~615 | menu 1,960; search-field 827; form 821; select 781 |
| data | 17 | 12,751 | 6,065 | 2,337 | 3,728 | 621 | data-table 4,627; schema-form 3,002; crud 1,010 |
| icons-theme | (incl. generated index) | 8,668 | 5,473 | 864 | 1,910 | 421 | theme-editor 1,214; palette 1,151; icons/data/index 966; localize 853 |
| layout, entries, bin | 18 src + 3 entries + 15 bin + 1 js | 5,424 + 275 + 4,034 + 665 | 3,014 + 155 + 2,673 | 427 + 109 + 1,092 | 1,590 + 0 + 61 | 411 + 14 + 223 | babylon-3d 525; affix 517; smoke-consumer 933; resolve-site-config 685 |
| teaching docs | 12 | 1,513 | | | | | Using-Components 486; README 192 |
| editor-live-example | 24 | 10,487 | 6,267 | 2,442 | 1,136 | 642 | component.ts 3,895 (2,350 code); diff 831; code-transform 763 |
| doc-client | 29 | 9,928 | 6,303 | 2,818 (28%) | 245 | 562 | doc-browser 2,895; doc-system-styles 1,061; doc-system 875 |
| site-build | 40 | 12,034 | 7,091 | 4,321 (36%) | 44 | 578 | orchestrator 2,316; epub 1,435; generate-site 1,170; site-config 943 |
| site-serve | 16 | 9,160 | 5,499 | 3,238 (35%) | 0 | 439 | dev-server 3,717; dev-auth 2,023; preflight 657 |
| **total** | | **~85,200** | | | | | |

**Single units of code that are too long:**
- `buildSite`: 1,665 lines;
- `devServer()`: 2,897 lines, of which `handleRequest` is 807;
- `createDocBrowser`: 2,206 lines;
- the `<tosi-example>` class: 2,350 code lines.

**Ways to do the common task:**

| area | task | count |
|---|---|---|
| overlays | pop a floating element | 5 public entry points; 4 icon-argument rules; 2 shortcut grammars and 2 display formats |
| data | put an array in a table | 2. Also: sort from code 4, select 3, pin a column 2 plus 2 in the UI; change notices are 3 callbacks against 6 events |
| icons-theme | draw an icon | 6 with a DOM, 4 without. Also: apply a theme 6 (writing 3 style ids, 2 of which collide), edit a colour 3 |
| layout | import `<tosi-tabs>` | 12 working ways, 1 recommended; the path chosen changes the bundle 7× |
| editor | compile and run against a context | 6 (+2 build-side). Also: put a live example on a page 4, ask for iframe execution 4 |
| doc-client | link to a page | 4. Also: put a doc browser on a page 3, nav renderers 3 |
| site-build | compose a site URL | 1 helper plus about 20 hand-written sites. Also: build the library 4, turn the audit off 4 |
| site-serve | gate an endpoint | 5. Also: "inside root" 12 (P8), env boolean rules 7 |

**Copies, recounted here:**

| family | count | earlier counts |
|---|---|---|
| regex escape | 14 identical + 2 glob variants | 8, 15, 15 |
| HTML/XML escape | 13 functions in 9 files, 4 behaviours | 10; 9 with 3 behaviours |
| FNV-1a | 6 | confirmed |
| slugify | 3 | confirmed |
| hand-written fence scanners | 6 sites in 5 files | 5 |
| path containment | 10 lexical + 2 realpath | 8, 9, 10 |
| form-callback overrides | 14 in 7 components, 8 same as base | 10 and 7 in OF's scope |
| process launches in `site/` | 33, 5 bounded, 0 kill grandchildren | |
| `outputDir ?? 'docs'` | 14 | |
| runner-only globals in examples | `= tosijsui` 11 lines in 6 files; `'tosijs'.elements` 10 uses in 9 files | |

**Surface:**
- the root barrel has 282 runtime exports, 33 of them `xin*`/`Xin*` (✔ `exports-before.json`), all unused in the 26 repos;
- `tosijs-ui/site` has 50 exports, 10 used;
- `SiteConfig` has 65 fields;
- `dist/iife.js` is 533.6 kB gzip at HEAD (✔ LB).

**Tests:**
- unit tests per area: data 210/16 files, icons-theme 266/12, editor 342/27, overlays 250 for the area, site-serve about 397 `test(` calls;
- all green when the reviewers ran them.

---

## 6. Card hygiene

| card | state | evidence | by |
|---|---|---|---|
| #1578 crud: one keystroke rebuilds the table | looks fixed | the identity guards at `crud.ts:959` and `:975`; verify in a browser, then close | DA |
| #1427 per-icon modules from a frozen snapshot | looks done | regenerated every build (`bin/dev.ts:105`); `icon-creators.test.ts:23` asserts they match. Only "document them" remains, which is the redirect-token docs item (icons.ts row) | IT |
| #1587 the ePub is not reproducible | looks stale | ✔ two builds a second apart gave identical sha256 (`51bd6f41…`). Rerun with a real corpus and a generated cover before closing | SB |
| #3944 menus use `100vh` | done | `pop-float.ts:410-419` measures the visual viewport (#2460, 1.16.3); `overscrollBehavior: 'contain'` at `menu.ts:989`. Close after an iPhone check | OF |
| #3976 live-example no-code mode | looks done | `nothingToRun` (`execution.ts:305`, used at `:348`, `:519`) skips construction | EL |
| #3946 inline tjs tests and friends | items 1–5 look done | `shapeTjsOutput`, the ts path without `dialect`, `refreshOutput`, `assertContextProvided`, `stripExports`; item 6 is build-side and unchecked | EL |
| #1604 fold the exits into `shutdown()` | partly done | `shutdown()` exists (`dev-server.ts:3400`); 7 direct `process.exit` calls remain (S2) | SS |
| #4341 search endpoint, or Markdown copies | the Markdown half shipped | `markdownPages` writes `/{slug}/index.md` (`generate-site.ts:899-901`) with `rel="alternate"` (`:615-619`); search needs P18 first | SB, DC |
| #4336 the value attribute reaches component setters | **incomplete** | also missing: `<tosi-search-field>` (`search-field.ts:516-524`, where a string `value` is dropped), `code-editor.ts:185`, `palette.ts:633`, `splitter.ts:328` | OF |
| #4324 `getByPath` | **incomplete** | it covers only `getByPath`; the proposals map and the table's display path have the same hole (P14) | DA |
| #3226 heading ids in print | **incomplete** | footnote ids `fn-N`/`fnref-N` also repeat across chapters (✔ DC) | DC |
| #3968 menu submenu roles | fixed by P27 | | OF |
| `highlight.ts:99` | cites `TODO.md`, which is now a pointer | it should cite a card; #1580 is DC's guess | DC |

---

## Dropped on checking

- **`select.ts:448` `getValue` as dead code (OF B):** dropped. It is used as a bound closure at `select.ts:460`, `483` and `493`. `selectOptions` stays in C row 21.

Corrected rather than dropped:
- **`form.test.ts`'s 10 ms sleep (OF B):** 12 copies, not 13.
- **`CmOptions.languageExtension` (EL B):** it is an option no caller passes, and it is read at `code-editor-cm.ts:354`. Delete it as an unused option, not as dead code.
- **The `epub.ts:62` back-compat re-export (SB B):** only the `stripDocMeta` half is dead. `DEFAULT_BOOK_CSS` in the same statement is load-bearing, because `site/index.ts:50` re-exports it from `./epub.js`.
- **`isInside` copies (SS B7):** 10 lexical sites, not 8. `host-preset.ts:192` was missing.
- **Regex escape, HTML escape, fence scanners and form callbacks:** recounted; see the packages and F.
- **The mount helper (EL B):** `dialect-bake.test.ts:14` is named `run()`, not `mount()`.
- **Paths:** `single-source.ts` is `src/doc-system/site/single-source.ts`; `book-target.ts` is `src/doc-system/book-target.ts`; DC's `checklist.ts:87` is `src/checklist.ts:87`.
