# Lean-plan review: layout-entries-bin-docs

Basis: `af13cd1ee` (source is clean against it). The working tree has rebuilt `dist/` and `docs/` files from that source, so the bundle sizes below were measured against that build. ✔ means I ran it, and the command and output are given. "Read" means I only read the code. Throwaway scripts are in `…/scratchpad/lean/layout-entries-bin-docs/`.

**Coverage.** I read every line of all 18 `src/` files in scope, the three entry points, `package.json` `exports`, every non-test `bin/*.ts`, `README.md`, `Using-Components.md` and every `src/docs/*.md`. In `bin/make-icon-data.js` (a `.js` file, but a shipped bin) I read lines 1–155: the header and the argv parser. I only grepped the SVG processing (lines 156–665). For the tests in my area I read the test names, not their bodies.

---

## A. Defects

### A1. The `.js` spelling of a remapped subpath resolves somewhere else, or nowhere (exports map)

`package.json` `exports` has a `./*.js` wildcard, so that `tosijs-ui/foo.js` reaches `dist/foo.js`. Five named subpaths remap to a different file: `./site`, `./doc-browser`, `./live-example`, `./checklist-client` and `./checklist-panel`. Their `.js` spellings fall through to the wildcard.

✔ `cd ~/tosijs-ui && node --input-type=module -e "console.log(import.meta.resolve('tosijs-ui/<spec>'))"` (Node 22.22.1) gives:

| spec | resolves to |
|---|---|
| `doc-browser` | `dist/doc-browser-entry.js` |
| `doc-browser.js` | `dist/doc-browser.js`. This is the library module, which does not define `<tosi-doc-system>`. |
| `site.js` | `dist/site.js`, which does not exist (`ls`: "No such file") |
| `checklist-client.js` | `dist/checklist-client.js`, which does not exist |
| `checklist-panel.js` | `dist/checklist-panel.js`, which does not exist |

Bun resolves `site.js` leniently, but not `doc-browser.js`.

- **Why it matters.** `tosijs-ui/doc-browser.js` silently brings back the #158/#159 trap that `src/doc-browser-entry.ts` exists to prevent. The page serves, every leaf component registers, `<tosi-doc-system>` stays inert, and there are no doc-test results. CLAUDE.md says the `./*.js` wildcard exists because the extension-ful spelling is "exactly what an adopter copying this repo's own ESM import style would write".
- **Why no test catches it.**
  - `src/package-exports.test.ts` checks only concrete targets.
  - `bin/smoke-consumer.ts:437-459` checks one nested `.js` path (`schema-form/fields.js`) and none of the remapped ones.
- **Fix.** Add explicit `"./site.js"`, `"./doc-browser.js"`, `"./checklist-client.js"` and `"./checklist-panel.js"` keys, plus `./live-example.js`, which happens to work through a shim. Make the test iterate `exports`.
- **Card:** none. **Patch on its own:** yes. It is additive, and it closes a documented silent-failure path.

### A2. `<tosi-tabs>`: two copies of "which children are tab bodies", plus leftovers from #3572 (`src/tab-selector.ts`)

✔ `cd ~/tosijs-ui && bun --preload ./src/test-setup.ts …/layout-entries-bin-docs/probe-components.ts` showed the following.

- **The two copies disagree.**
  - The `bodies` getter (`:372-374`) keeps every child with `name`.
  - `setupTabs` (`:396-398`) keeps only children with `name` and **no** `slot`.
  - So a control in `slot="after-tabs"` that has a `name` (`button({slot:'after-tabs', name:'add'})`) gives `bodies` 3 entries and builds 2 tabs.
  - `render()` (`:439-449`) then throws on every frame: `TypeError: undefined is not an object (evaluating 'tab.removeAttribute')`.
  - The underline is never placed, and `pickTab` and `keyTab` index the wrong body.
- **Author ids are clobbered.** `setupTabs` sets `tabBody.id = \`${instanceId}-${index}\`` (`:405-406`). Probe: an author's `id="author-id"` became `"tosi-tabs-2-0"`. Since 855e28280 (#3572), `aria-controls` uses `ariaControlsElements` and the id goes nowhere: `makeTab`'s `_bodyId` (`:175`) is unused. Deep links (`#details`) to a tab body break, for no benefit.
- **`removeTabBody` doesn't do what the doc says.** The doc says it takes `number | HTMLElement` (`:79-80`). The code takes only `HTMLElement` (`:331`), and git shows it never took a number (bba8dcb61). Probe: `removeTabBody(0)` gives `TypeError: body.remove is not a function`.
- **Read:** `:82` says "insert or remove tab bodies directly and call `setupTabs()`", but `setupTabs` never queues a render, so `hidden` is stale until something else renders.
- **Coverage:** no unit test, no Playwright interaction test and no ```test fence covers `<tosi-tabs>` behaviour. Only `tests/live-example-csp.pw.ts` mentions the tag.
- **Card:** none. **Patch on its own:** yes. One `isTabBody()` predicate, deleting the id assignment and fixing the doc line is a small, contained change.

### A3. Teardown missing or one-shot (shared cause: `connectedCallback` work with no symmetric `disconnectedCallback`)

- **`<tosi-sidenav>`** ✔ (same probe).
  - `globalThis.addEventListener('resize', this.handleResize)` (`side-nav.ts:177`) is never removed. `disconnectedCallback` (`:219-223`) removes only the MutationObserver. Probe: 1 added, 0 removed, so every sidenav ever created stays reachable from `window`.
  - `size-break.ts:118/123` does remove its listener, so the two copies disagree.
  - Transition suppression is one-shot. `connectedCallback` sets `--side-nav-transition: 0s` every time (`:199`), but `releaseTransition` runs only while `transitionSuppressed` is true, and that is true only initially (`:209-217`). Probe: `""` after the first layout and `"0s"` after a reconnect, so a moved sidenav never animates again.
- **`<tosi-3d>`** (read). There is no `disconnectedCallback`, and each connect builds a new `BABYLON.Engine` and `Scene` on the same canvas (`babylon-3d.ts:450-516`). The old render loop is never stopped. It is deprecated, so this is not worth a patch.
- **`<tosi-lottie>`** (read). There is no `disconnectedCallback`, so the animation is never destroyed and lottie's autoplay loop keeps running after removal (`bodymovin-player.ts:120-208`). Card #3817 is about placeholder children, not this.
- **`<tosi-map>`** (read). There is no `disconnectedCallback`, so the `mapboxgl.Map` (a WebGL context) lives until the element is collected.
- **`<tosi-carousel>`** (read, minor). `disconnectedCallback` (`carousel.ts:463-468`) clears the interval but not `snapTimer` (`:341`) or the pending animation frame (`:384`).
- **`<tosi-sizer>`** (read, minor). `target` is taken from `parentElement` once (`sizer.ts:98-100`) and never refreshed, so after reparenting it resizes its old parent.
- **Patch on its own:** the sidenav pair, yes. The doc browser creates sidenavs, and nested memory-routed doc browsers come and go. The rest belong in Phase 1.

### A4. `scriptTag()` ignores an already-loaded global and never settles on failure (`src/via-tag.ts:82-104`)

- **The preloaded-global path is dead.** The existing-symbol promise (`:87-92`) is unconditionally overwritten by the load promise (`:98-100`), and the script is always appended.
  - ✔ (probe-components): with `globalThis.ALREADY` defined, `scriptTag(src,'ALREADY')` appended the `<script>` and was still pending after 300ms.
  - So two promises in the docs are false: `babylon-3d.ts:108-109` ("if `BABYLON` is already defined … it will use that") and `via-tag.ts:56-58` (lottie "won't load it again, which affords offline use").
- **It never rejects** (read). There is no `onerror` on the script (`:99`) or on the stylesheet (`:118`).
  - So offline, `B3d.babylonReady`, `BodymovinPlayer.bodymovinAvailable` and `MapBox.mapboxAvailable` hang forever.
  - The `.catch` handlers at `mapbox.ts:235-242` and `:330-335` are unreachable for a load failure. The comment at `:331` ("clear the flag so a later render can retry") describes a path that cannot happen.
- **Card:** none. **Patch on its own:** yes. It is a few lines plus a test.

### A5. `<tosi-carousel>` loops when `loop` is off (`src/carousel.ts`)

✔ (probe-components), with `arrows`, 3 slides and no `loop`.

- **The back button is enabled on page 0.** `disabled` is only recomputed inside `set page` when the page changes (`:172-177`), and `render()` never sets it (`:470-495`).
- **The keyboard ignores `loop`.** `ArrowLeft` on the strip (`:358-365`) calls `back()`, which always wraps (`:367-373`). Probe: `page` 0 → 2.
- **The docs promise otherwise.** `:53` says `loop` "causes next/previous buttons to loop", and `:67` says the keyboard pages "like the arrow buttons".
- The carousel's tests (`src/carousel.test.ts`, `tests/carousel.pw.ts`) cover hover, focus, taps and resize, but not `loop`.
- **Patch on its own:** borderline. It is a one-line guard in `back`/`forward` plus setting `disabled` in `render`.

### A6. `<tosi-lottie>` details (`src/bodymovin-player.ts`)

- **The documented `json` path logs an error.** `json` is declared as a string attribute (`:122`), but the doc says to set "its `json` property to the content of a lottie.json file" (`:98`). ✔ (probe-docs): assigning the parsed object logs tosijs's `json is declared string … but was written object` on every write. Lottie's `animationData` wants an object.
- **The warning format string is malformed.** `:178` has `% c(url)`, so there are 5 `%c` directives for 6 style arguments ✔ (counted in probe-docs). It also uses `console.log` for what is a misconfiguration.
- **Patch on its own:** no. It belongs with A3's lottie teardown.

### A7. `<tosi-map>` value and form contract (read; `src/mapbox.ts`)

- `this.value` is never assigned. `moveend` only calls `internals.setFormValue` (`:316-328`), so `el.value` stays `''`, no `change` event ever fires, and the `newValue !== this.value` test (`:323`) is always true.
- `formDisabledCallback` is overridden with a no-op (`:197-199`), which drops tosijs's default sync of the `disabled` attribute.
- The variable names `[long, lat]` (`:271`, `:300`) are swapped relative to the data. The `[lat, long]` passed to mapbox is in fact `[lng, lat]`, so it works, but it reads as a bug.
- **Patch on its own:** no.

### A8. `<tosi-affix>`: `inside = undefined` means inside (`src/affix.ts:359-366`)

✔ (probe-components): `affix.inside = undefined` makes `wanted.inside` `true`. The setter treats anything except `false`, `null` and `'false'` as true. Minor; Phase 1.

### A9. Layout helpers read a variable nothing defines (`src/layout.ts:203-207`)

`elastic()` and `spacer()` use `var(--tosi-space, 0.5em)`. `--tosi-space` is defined nowhere (grep of `src/`; the theme defines `--tosi-spacing*`, `theme.ts:157-161`). So the gap is always `0.5em` and never follows the theme.

There is a related doc mismatch in another reviewer's file: `rich-text.ts:70-71` documents `spacer(width = '10px')` and `elastic(width = '10px')`, but the real helpers take element parts, not a width.

### A10. `bin/make-icon-data.js` (the shipped bin `tosijs-make-icons`) misreads its arguments and writes files on `--help`

The bin has its own parser (`:118-133`). It accepts only the space form (`--input dir`) and silently ignores unknown flags. Every other bin uses `--name=value` through `parseArgv`.

✔, run in a scratch directory (`…/layout-entries-bin-docs/icons-probe`) holding `icons/dot.svg` and `other/ring.svg`:

- **`bun …/bin/make-icon-data.js --help`** printed "Successfully generated icon data to: ./src/icon-data.ts" and exited 0.
- **`--input=./other --output=./out.ts`** ingested `./icons` (it found `dot`, not `ring`), wrote `./src/icon-data.ts`, and did not create `out.ts`.

This is exactly the hazard the `parseArgv` docblock describes (`resolve-site-config.ts:440-459`).

**Cards:** #1595 (no lane runs a bin's `--help`) and probably #1600 (`make-icon-data.js`). **Patch on its own:** yes. It runs in adopters' repos and writes files.

### A11. `bun bin/dev.ts --stop` signals a pid without checking what it is (`bin/dev.ts:56-78`, read)

It kills `holder.pid` after only `isProcessAlive` (`kill(pid,0)`, `build-lock.ts:129-138`). The other two signal sites in the repo check the process name first: `dev-server.ts:595-607` (killStrayServer) and `bin/tunnel.ts:454-467` (`--close`). A crashed server leaves its lock behind, and a recycled pid then gets SIGTERM.

**Card:** #1542 (export `stopHolder()`), which is the right home. **Patch on its own:** no. Fold it into #1542.

### A12. `tosijs-release-notes --check`: the recommended escape hatch disables the patch gate (`bin/release-notes.ts:100,114-120,169-181`)

The "already tagged" error tells you to "pass `--version=X.Y.Z`" (`:117`). But `bumpConcerns` is fed `classifyBump(since, pkgVersion)`, and `pkgVersion` is read from package.json (`:169`), not from `--version`.

✔ (probe-docs):
- `classifyBump('v1.2.3', '1.2.3')` returns `'unknown'`, so a `[break]` bullet yields 0 concerns.
- The same bullet with package.json at 1.2.4 yields 1 blocking concern.

So the gate that blocks `[break]` in a patch never fires on the path the tool itself recommends. **Patch on its own:** yes. It is a one-line change (use `version`) on a release gate.

### A13. The published `tosijs-ui/test-setup` replaces Bun's `fetch` with happy-dom's (`src/test-setup.ts:96`)

✔ `bun --preload ./src/test-setup.ts …/probe-fetch.ts`: a `fetch` to a local `Bun.serve` throws "Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource". That breaks any adopter unit test that talks to a local stub server (#170 publishes this preload). This repo's own tests avoid it by stubbing `fetch` or spawning child processes.

I'm unsure which tests rely on happy-dom's relative-URL fetch. To settle it, run `bun test` once without line 96. Alternatives are happy-dom's `settings.fetch.disableSameOriginPolicy` or a `url:` on the Window. **Patch on its own:** low priority. Batch it with B's test-setup item.

### A14. The adoption page's build file exits 0 on a failed build (`src/docs/adopting-the-doc-system.md:56`)

`process.argv.includes('--build') ? buildSite(config) : devServer(config)` drops `buildSite`'s boolean. It returns `false` and deliberately does not exit (`orchestrator.ts:661-665`). The same one-liner is at `doc-site-system.md:83` (another reviewer's file). Twenty lines later the same reference shows the right form (`if (!(await buildSite(config))) throw …`).

Consumers copied the broken shape. These four exit 0 on a failed build:
- a private consumer's `bin/site.ts` (a verbatim copy)
- `manta-recon/bin/site.ts:28`
- `tosijs-native/bin/site.ts:11`
- a private consumer's `bin/site.ts`

The other five check the result. This is the user's own "fail-hard" rule failing in the doc meant to teach the paved road. **Patch on its own:** yes (docs only). Also tell those four repos.

---

## B. Phase 1 (no functionality removed)

### Dead code (internal)

- **`tab-selector.ts`:**
  - the unused `makeTab` parameters `tabs` and `_bodyId` (`:175`);
  - the generated body id (`:405-406`), which A2 says to delete;
  - the commented-out `default:` (`:367-368`);
  - redundant `Number(...)` calls (`:343`, `:444`).
- **`carousel.ts`:**
  - `snapPosition`'s `Math.ceil`/`Math.floor` of an already-rounded integer (`:346-354`);
  - the double `isNaN` (`:169-173`);
  - the repeated `auto > 0` check (`:122`).
- **`side-nav.ts:176`:** `this.parts.content.childNodes.length === 0` is always true, because a `<slot>` has no child nodes. ✔ (probe-components: 0 with slotted content present), so `contentVisible` is forced true on every connect. Decide what was meant (probably `assignedNodes()`), or write `true`.
- **`via-tag.ts:87-92`:** the overwritten branch (fix it, per A4).
- **`mapbox.ts`:** the unreachable `.catch` handlers (`:235-242`, `:330-335`) and the no-op `formDisabledCallback` (`:197-199`).
- **`babylon-3d.ts:375`:** `this.update !== undefined` is always true (its default is `noop`).
- **`bin/make-icon-data.js:5`:** `<!--{ "pin": "bottom" }-->` is dead metadata that contradicts the winning `/*{ "parent": "icons" … }*/` (`:101`). ✔ `demo/docs.json` records `parent: icons`, with no pin.
- **`bin/release-notes.ts:5`:** the same pattern, harmlessly duplicating `:63`.
- **`bin/docs.ts`:** the shim. It is card #1576.

### One implementation each

| family | copies (file:line) | disagreement | the merge keeps |
|---|---|---|---|
| HTML/XML escaping | `page-schematic.ts:39`, `bin/generate-og.ts:56`, `doc-system/render.ts:286/289`, `book-html.ts:135/139`, `continue-link.ts:51`, `site/epub-a11y.ts:43`, `site/epub.ts:155/193/196`, `site/generate-site.ts:180/188` (10 functions) | only `epub.ts:155` and `generate-site.ts:180` escape `'`. `epub.ts:196` skips `>`. No live bug seen: every use is in `"`-quoted attributes or text. | one `escapeXml` that escapes `& < > " '`, which is safe for text and both quote styles. No text/attr mode switch is needed. |
| RegExp escape | `bin/tunnel.ts:232` plus 14 in `src/` (css-value-forms:80, router:234, icon-core:262, palette:289, theme-editor:376, doc-search:169, doc-title:67, release-notes:247, orchestrator:212, bundle-guard:61, restamp:43, code-transform:193/237) | identical | one `escapeRegExp` |
| FNV-1a | `bin/tunnel.ts:122-129`, `site/build-lock.ts:43`, `site/debug-sink.ts:35`, `site/checklist-store.ts:97`, `site/epub.ts:1057`, `live-example/example-store.ts:38` | equivalent (example-store applies `>>>0` once at the end) | `fnv1a(text)`. Three of the copies also build the same per-project temp path (`tmpdir()/tosijs-<kind>-<hash>`), which should be a single `projectTempPath(kind, root)`. |
| argv parsing | `parseArgv` (`resolve-site-config.ts:514-544`, used by 6 shipped bins); `make-icon-data.js:118-133`; `bin/dev.ts:33,56,80-81` (`argv.includes`); `bin/verify-schema-dep.ts:21`; `bin/generate-og.ts:105-108`; `resolveSiteConfig`'s own `--config=` reader (`:67`), which `parseArgv` then rejects (#4036, #2876) | A10; unknown flags are silently accepted everywhere except `parseArgv` | `parseArgv` everywhere. Give `make-icon-data` its `--name=value` spellings while still accepting the old space form, and add `config` to the values of `tosijs-tunnel`, `tosijs-deploy` and `tosijs-caddy-install` (#4036). |
| ssh invocation | `tunnel-links.ts:194-201` (`sshTo`: BatchMode + ConnectTimeout), `resolve-site-config.ts:618` (same), `tunnel.ts:247,290` (same, inline), `resolve-site-config.ts:344,352,368,390,561,572-573` (no options), `caddy-install.ts:306` (interactive by design) | `registerCaddyFragment` and `refreshHostIndex` can sit on a prompt | one `ssh(host, cmd, { batch })`. The interactive installer opts out. |
| "No preview host" remediation text | `deploy-preview.ts:76-88`, `caddy-install.ts:65-77` | the same 9 lines, except the bin name | `noPreviewHost(bin)` |
| stop a process by pid | `bin/dev.ts:56-78`, `bin/tunnel.ts:454-475`, `site/dev-server.ts:595-660` | A11 | `stopHolder()` (#1542), with the process-name check |
| following a container's size | tosijs `handleResize` (shared ResizeObserver: tab-selector:434, babylon-3d:384, side-nav:125, size-break:95); window `resize` (side-nav:177, size-break:118, pocket-bar:386); a private ResizeObserver on self (carousel:454, affix:397) or on the parent (splitter:438-440); a MutationObserver on children (side-nav:179). That is 5 mechanisms. | feature-checking `typeof ResizeObserver` happens in splitter and carousel only; teardown differs (A3) | for "my parent's size", use one `observeParent(el, cb)` built on splitter's parent ResizeObserver plus its guard. That would retire the window listeners in side-nav and size-break, which measure `offsetParent` while observing themselves. I'm unsure whether `offsetParent` can differ from `parentElement` in the doc browser; a Playwright check on `page-layout.pw.ts` would settle it. |
| known project links → icon | `header.ts:144-150` (`linkIcons`), `doc-browser.ts:1348-1354` (legacy `projectLinks`) | labels differ (`title: key` vs `'npmjs'`) | one table, exported from `header.ts` |
| check/report mini-harness | `bin/smoke-consumer.ts:31-40,925-933`, `bin/verify-schema-dep.ts:39-41,145-157` | — | a shared `bin/lib/checks.ts` (neither file ships) |
| temp files in `bin/` | `resolve-site-config.ts:341` writes `${tmpdir()}/${name}.caddy` (a predictable name, never removed). Every other `bin/`/site temp dir uses `mkdtempSync` and removes it. | — | `mkdtemp` plus `rm` in `finally` |

### Declarations written twice

- **The position vocabulary is declared three times.** `affix.ts:152-153` (the `AffixPosition` type) and `:160-173` (the `POSITIONS` set) repeat the same 12 strings, and `pop-float.ts:256-269` declares `FloatPosition` as those 12 plus `side` and `auto`. Derive all three from one `const EDGE_POSITIONS = [...] as const` in `pop-float.ts`.
- **9 of the 14 named subpaths in `package.json` `exports` are exactly what `./*` would produce** ✔ (a string comparison over `exports`): `./icons`, `./code-editor`, `./codemirror`, `./diff`, `./highlight-block`, `./theme`, `./checklist`, `./theme-editor` and `./test-setup`. Only `./site`, `./live-example`, `./doc-browser`, `./checklist-client` and `./checklist-panel` remap. Those five need their `.js` twins (A1); the other nine could go. That is a judgement call: explicit keys document the package, and `src/package-exports.test.ts:33-45` asserts four of them.
- **`smoke-consumer.ts:437-459` hand-lists the subpaths to resolve.** It misses `./icons`, `./code-editor`, `./codemirror`, `./live-example`, `./doc-browser`, `./diff`, `./theme` and `./test-setup`, plus every `.js` twin. Iterate `manifest.exports` instead.
- **`test-setup.ts:35-82` hand-lists about 45 happy-dom globals.** ✔ happy-dom provides `TouchEvent`, `PointerEvent`, `WheelEvent`, `matchMedia`, `getSelection`, `Range`, `location`, `history`, `sessionStorage`, `HTMLSlotElement`, `ShadowRoot` and `CSS`, but the preload leaves them undefined. Shipped code references `TouchEvent` (`track-drag.ts:178`) and `matchMedia` (`reduced-motion.ts:13`, guarded). The file's own comment says the copies drifted by exactly this kind of list. Derive the set (copy what the happy-dom Window has and `globalThis` lacks), and keep the explicit binds.
- **The `dist-sizes.json` shape** is written by `bin/record-sizes.ts:21-24` and read by `orchestrator.ts:406-418`, with no shared type.

### Teardown and caches

These are A3, plus pocket-bar's per-instance capture-phase `document` `pointerdown` listener (`pocket-bar.ts:381`). It is torn down correctly; it is listed only so the A3 pass doesn't "fix" it.

### Structure (no behaviour change, one file per change)

- **`bin/resolve-site-config.ts` (685 lines) holds nine concerns:**
  - config lookup;
  - safe paths;
  - port re-exports;
  - the device registry;
  - short links;
  - gate-page embedding;
  - argv parsing;
  - Caddy and index registration over ssh;
  - box keys and the global-link plan.

  Its imports are scattered mid-file (`:165-168`, `:273-274`). Split it into `bin/lib/argv.ts`, `site-config.ts`, `preview-host.ts` and `links.ts`. It ships in `files`, so keep a re-export shim.
- **`layout.ts:62-148`:** `TosiRow` and `TosiColumn` are line-for-line identical apart from the flex direction and the variable prefix. Make one base class, which is data rather than a mode switch, and give all three classes one `syncVar(style, name, value)` in place of 8 `if/else` blocks.
- **`tab-selector.ts:154`:** importing `TosiLocalized` from `localize.js` drags in the locale picker, `<tosi-select>` and `<tosi-menu>`. ✔ The tabs subpath is a 15.5 kB gzip entry chunk; its sourcemap lists `localize`, `select`, `menu`, `float`, `pop-float` and `drag-and-drop`, all needed only to support the `localized` attribute. The fix is to split `localize.ts` (another reviewer's file) so that `TosiLocalized` and `localize()` live apart from the picker.
- **Duplicated `previewRootFor(...)`:** `bin/tunnel.ts:168-172` and `:580-583` make the same call, so the non-default-root warning prints twice. `deploy-preview.ts:31-42` imports from the same module twice.
- **`bin/checklist.ts:45,49`** re-derives the positional arguments that `parseArgv` already returns as `rest`.
- **Raw `var()` strings against CLAUDE.md's rule:**
  - `affix.ts:313-316,497`
  - `header.ts:115`
  - `pocket-bar.ts:303,324`
  - `tab-selector.ts:221-224` (the `--xin-tabs-*` fallbacks)

### Tests and build

Tests these merges would need, none of which exist today:

- **`<tosi-tabs>`:** author ids survive; a named `after-tabs` control is not a body; `removeTabBody`'s contract. The probes in `probe-components.ts` already contain all three.
- **`<tosi-sidenav>`:** the window listener is removed on disconnect; a reconnect releases the transition.
- **`<tosi-carousel>`:** with `loop` off, neither the keyboard nor the first back press wraps.
- **`scriptTag`:** an existing global is reused, and a failed load rejects.
- **`exports`:** every named subpath's `.js` twin reaches the same file.
- **The bins:** `make-icon-data --help` and the `--name=value` spellings; `dev --stop` refuses a pid that isn't a dev server (#1542).

Other items:

- **`src/deprecated-aliases.test.ts`** covers only the class aliases. Nothing checks the creator aliases, or which aliases warn.
- **`bin/verify-schema-dep.ts`:**
  - `--version=X` runs `bun add tosijs-schema@X` (`:24`), which rewrites this repo's `package.json` and `bun.lock` and never restores them (read).
  - None of its 17 checks tests what CLAUDE.md says the `^1.8.0` floor encodes: `oneOf` and `exclusiveMin`/`exclusiveMax` enforcement, and `unenforcedKeywords`. So it cannot tell 1.8.0 from 1.7.x. Add three checks, and install into a scratch directory.

### Docs (no API change)

**Examples that throw or mislead**

- **`Using-Components.md:436-449`, localization.** The guide says "5 header rows", but `initLocalization` reads 4 (`localize.ts:582`: locales, a skipped row, languages, emoji). ✔ (probe-docs), running the guide's own TSV:
  - `i18n.languages` = English names, not native ones;
  - `i18n.emoji` = `["English (US)","Français","suomi"]`;
  - the flag row becomes a translatable string.

  `localize('Cancel')` still returns "Annuler", so the mistake is easy to miss. The real format is `demo/src/localized-strings.ts`.
- **`Using-Components.md:360-362`** claims "a clear error at runtime if an icon doesn't exist". ✔ `icons.noSuchIconAnywhere()` returns an empty `<svg>`, with no throw and no `console.warn` or `console.error`.
- **`Using-Components.md:298`** uses `codeEditor(...)` in the Tabs snippet. It is not in the root barrel, which is where every other snippet imports from, so the implied import fails.
- **`size-break.ts:53-68`:** the example CSS styles `.preview .sizer`, which matches nothing (the element is `<tosi-sizer>`).
- **`mapbox.ts:118-131`:** the token guidance sits under a "Form Integration" heading.

**Advice that is wrong today**

- **`src/docs/migrating.md:217-220`** says "Most log a runtime deprecation warning; a few are silent". ✔ (probe-aliases) The opposite is true: 5 of the 33 xin*/Xin* exports warn (`xinRating`, `xinSegmented`, `xinSelect`, `xinTag`, `xinTagList`), and 28 are silent identical aliases.
- **`migrating.md:82,95`** names a `<live-example>` tag. The tag is `<tosi-example>` (`live-example/component.ts:1023`). CLAUDE.md repeats the error ("Creates one `<live-example>` per group").
- **`migrating.md` stops at 1.16.21.** It omits 1.19.0's only `### Breaking` item: `tosiThemeEditor`/`TosiThemeEditor` left the root (CHANGELOG.md:50-52). It will also need 1.20.0's `onCloseTab` removal.
- **A14** (the adoption page's build file).
- **`adopting-the-doc-system.md:43`** says `tosijs-ui/live-example` is required for js/ts/tjs/test fences. Its own `:126` says six languages execute, and html and css fences also become live examples.
- **The "preloaded global" promises:** `babylon-3d.ts:108-109` and `via-tag.ts:56-58` (A4).
- **`tab-selector.ts:79-82`** (A2).
- **`bin/tunnel.ts:139-147`:** the comment is headed "`process.env`, NOT `{}`", and the code at `:150` passes `{}`. The code is correct (the port is pre-resolved into the config), and the comment describes a fix that has since been reshaped.
- **`tosijs-site.config.ts:2`** says "See bin/site-config.ts", which doesn't exist. The file is `src/doc-system/site/site-config.ts`.
- **The lead about `onFoo` members:** I checked. None of the docs in scope describe an `on<Event>` member. `tab-selector.ts:95` correctly notes the `onCloseTab` → `handleCloseTab` rename.

**Teaching order that puts the second-best spelling first**

- **README's Quick Start (`:35-48`) and every snippet in `Using-Components.md` import from the root barrel.** Neither file mentions per-component subpaths, which CLAUDE.md calls "the correct tree-shaking path". ✔ Measured with `bun build <entry> --minify --splitting --format esm --target browser --external tosijs --external marked --external tjs-lang` (gzip of the entry chunk):

  | import | entry chunk (gzip) |
  |---|---|
  | any one component, root barrel | 106.9 kB |
  | `tosijs-ui/data-table` | 29.2 kB |
  | `tosijs-ui/tab-selector` | 15.5 kB |
  | `tosijs-ui/splitter` | 2.3 kB |
  | `tosijs-ui/side-nav` | 1.1 kB |

  Teach the subpath first, and keep the barrel as the convenience.
- **The theme-editor and checklist examples import from `tosijs-ui`** (`theme-stress-tests.md:113,224`, `checklist.ts:18`). The prose says to use the subpath in an app, but live examples can only import context keys (`code-transform.ts:191-206`), so a subpath import cannot run there. Card #4152 covers the theme editor. Register `tosijs-ui/<subpath>` context keys that point at the same object, so examples can teach the real import.
- **`Using-Components.md` isn't published.** It is not in `docPaths` (`tosijs-site.config.ts:137`), not in `files` and not in `llms.txt`, so adopters never see the consumer mental model. Its H1 still reads "# 0.". Publish it once it's corrected, or fold it into the README. That fits #3094's guidance RFC.

---

## C. Phase 2 (one way to do each thing)

### Redundant public spellings

"Uses" counts imports by name in the consumer table. I also grepped the source of all 26 sibling repos for each name, excluding `node_modules`, `dist`, `docs`, `www`, `docs-domain`, `tjs-out`, `build` and `.claude`.

| task | redundant spelling | same as | consumer uses | notes |
|---|---|---|---|---|
| tabs class | `TabSelector` (type + const, `tab-selector.ts:500-503`) | `TosiTabs` ✔ (`deprecated-aliases.test.ts` asserts `toBe`) | 2 repos, 3 uses (`tjs-lang/demo` ×2, `loewald-dot-com/src/blog.ts`) | silent. A patch could warn once before 1.20 removes it. |
| tabs creator | `tabSelector` (`:508`), `xinTabs` (`:511`) | `tosiTabs` ✔ identical | `tabSelector` 2 repos, 3 uses; `xinTabs` 0 | silent |
| sidenav class | `SideNav` (`side-nav.ts:232-234`) | `TosiSidenav` ✔ | 2 repos, 2 uses (`tjs-lang/demo/src/index.ts`, `loewald-dot-com`) | silent |
| sidenav creator | `sideNav` (`:240`), `xinSidenav` (`:243`) | `tosiSidenav` ✔ | `sideNav` 2 repos, 2 uses; `xinSidenav` 0 | silent |
| sizer | `XinSizer` (`sizer.ts:116-118`), `xinSizer` (`:123`) | `TosiSizer`, `tosiSizer` ✔ | 0 | silent |
| carousel | `XinCarousel` (`carousel.ts:499-501`), `xinCarousel` (`:507`) | `TosiCarousel`, `tosiCarousel` ✔ | 0 | silent |
| gamepad types | `XinButton`, `XinGamepad`, `XinXRControllerComponentState`, `XinXRControllerState`, `XinXRControllerMap` (`gamepad.ts:46,54,106,112,118`) | `Tosi*` types | 0 | type-only, so there is no runtime cost to remove them |
| all 33 xin*/Xin* root aliases (the lead) | `XinCarousel`, `XinField`, `XinFloat`, `XinForm`, `XinLocalized`, `XinMenu`, `XinNotification`, `XinPasswordStrength`, `XinRating`, `XinSegmented`, `XinSelect`, `XinSizer`, `XinTag`, `XinTagList`, `XinWord`; `xinCarousel`, `xinField`, `xinFloat`, `xinForm`, `xinLocalized`, `xinMd`, `xinMenu`, `xinNotification`, `xinPasswordStrength`, `xinRating`, `xinSegmented`, `xinSelect`, `xinSidenav`, `xinSizer`, `xinTable`, `xinTabs`, `xinTag`, `xinTagList` | ✔ (probe-aliases) 28 are `===` their survivor; 5 (`xinRating`, `xinSegmented`, `xinSelect`, `xinTag`, `xinTagList`) wrap it, build the same tag and warn once, naming the replacement | **0 in all 26 repos** (source grep of every name) | remove all 33 at 1.20.0. The catch: `migrating.md:220` promised "removed in a future major" (see E). |
| other legacy root aliases (for completeness; not my files) | `DataTable`/`dataTable`, `MarkdownViewer`/`markdownViewer`, `LocalePicker`/`localePicker`, `richText` | `TosiTable`/`tosiTable`, `TosiMd`/`tosiMd`, `TosiLocalePicker`/`tosiLocalePicker`, `tosiRichText` | `markdownViewer` 2 repos, 6 uses; `MarkdownViewer` 2 repos, 5 uses; the rest 0 | only `richText` warns |
| the tosijs namespace | `export * as tosijs from 'tosijs'` (`index.ts:108`) | `import * as tosijs from 'tosijs'`, or the `xinjs` global | 0 (no `tosijsui.tosijs` in any consumer; nothing internal reads it; the example context uses `globalThis.xinjs`, `doc-system.ts:828`) | it also puts `xinjsui.tosijs` on the CDN global |
| tabs CSS hooks | `--xin-tabs-selected-color`, `--xin-tabs-bar-color`, `--xin-tabs-bar-height` (`tab-selector.ts:221-224`) | `--tosi-tabs-*` | 0 | undocumented, and no warning is possible |
| carousel CSS hook (a misspelling, not an alias) | `--carouse-button-width` (`carousel.ts:199,235`) | the intended `--carousel-button-width` | 0 | a patch could add the right name and fall back to the misspelled one |

**Not redundant:**

- `xinjs`/`xinjsui` (the CDN globals, `index-iife.ts:69`) are the only spelling: there is no `tosijs`/`tosijsui` global, and the README teaches them (`:52-54`).
- The root barrel and the subpath give the same function at a 7–47× different initial size (B, Docs).

### The `@deprecated` inventory in my scope

- **tabs, sidenav, sizer, carousel** (11 names above).
  - Still needed? Only `TabSelector`, `tabSelector`, `SideNav` and `sideNav`, for 2 repos.
  - Warns at runtime? None of them do.
  - Docs teach only the survivor? Yes. I grepped `src/`, `demo/src`, `tests`, README and Using-Components; only `migrating.md` names the old spellings, as it should.
- **`gamepad.ts`**, the 5 type aliases: unused, cannot warn, and the docs never name them.
- **`babylon-3d.ts` `B3d`/`b3d`** (`:303`, `:525`).
  - Warns? Yes, once per page on first connect, naming tosijs-3d (`:281-291`).
  - Still needed? No consumer imports `b3d` from tosijs-ui. One consumer takes `b3d` from `tosijs-3d/tosi-b3d`.
  - The docs lead with the deprecation banner. But they promise "not going anywhere before a major release" (`:6`) and "removed in a future major" (`:301`).
- **What the inventory misses:**
  - the `--xin-tabs-*` variables;
  - the gamepad XR helpers (`xrControllers`, `xrControllersText`), which exist only for `<tosi-3d>`;
  - `sizer.ts:29`'s `Component as XinComponent` (internal, harmless);
  - the 28 silent xin aliases outside these files, which `migrating.md` misdescribes.

---

## D. Not proposing

- **Re-adding the doc-system cluster (or `highlight-block`, `theme-editor`, `checklist`) to the root barrel.** Settled: CLAUDE.md "Subpath Exports & Tree-Shaking"; `index.ts:1-50`.
- **A blanket `sideEffects: false`.** Settled: CLAUDE.md, `index.ts:15-19`.
- **A `browser` condition pointing at `iife.js`.** Settled: CLAUDE.md.
- **Dropping the `./*.js` wildcard.** Settled: CLAUDE.md ("There is a second `./*.js` wildcard"). A1 adds explicit twins; it does not remove the wildcard.
- **Collapsing each subpath's `types`/`import`/`default` triple.** Settled: `smoke-consumer.ts:566-592`.
- **`tosijs-ui/test-setup` as a published preload.** Settled: #170, `test-setup.ts:12-17`. A13 changes what it does, not whether it ships.
- **Renaming the CDN globals `xinjs`/`xinjsui`.** Settled as "legacy names kept for backward compatibility" (CLAUDE.md, Key Dependencies).
- **Naming outliers with a single spelling:** `SizeBreak`/`sizeBreak`, `AbTest`/`abTest`, `B3d`/`b3d`, `BodymovinPlayer`/`bodymovinPlayer`, `MapBox`/`mapBox`. A `tosi*` creator would add a spelling, not remove one.
- **`parseArgv` accepting only `--name=value`.** Settled: #85; `bin/argv.test.ts:74`.
- **Bins importing from `dist/`, not `src/`.** Settled: `resolve-site-config.ts:142-149`.
- **`smoke-consumer` not executing the network bins.** Settled: CLAUDE.md, `smoke-consumer.ts:283-299`.
- **3D, map and lottie staying in the root barrel.** They lazy-load; `index.ts:38-39` records about 10 kB. ✔ Their subpaths measured 7.2 kB, 1.4 kB and 0.85 kB entry chunks.
- **Hard-coded English strings** (pocket-bar `'toolbar'` `:250-251`; the carousel's titles `:421-432,488`; tab-selector's `'close'` `:196`; splitter's `'Resize'` `:433`). This is a localization feature, not leanness. #3947 and #3979 are the sibling cards; file one family card rather than fix them here.
- **`src/live-example.ts`**, the one-line shim. It is the `.js`-twin target and what `index-iife.ts` imports; keep it.

---

## E. Unused, but not redundant (only the items that need a decision)

- **`B3d`/`b3d` plus the gamepad XR helpers.** They have zero consumers, but the docs promise they stay "until a future major". The brief says there is no separate major, while CLAUDE.md reserves "2.0" for the tjs-native port. The owner should decide whether 1.20.0 may remove them, or whether the docs' promise holds. The same applies to the 33 xin aliases, given `migrating.md:220`.
- **The affix helpers `affixPosition`, `parsePlacement`, `describePlacement` and `affixCell`** (`affix.ts:178-235`). They are documented on the affix page (`:138-143`) and have zero consumers. Keep them documented, or make them internal (`affix.test.ts` imports them by module, which works either way).
- **`splitLimits`** (`splitter.ts:131-140`). It is undocumented, exported so `splitter.test.ts` can reach it, and therefore re-exported from the root by `export *`.
- **`linkableUrl`** (`checklist.ts:98-99`). It duplicates `checklist-store.ts:176-177`; merging them is #4191.

The other zero-use exports in my files (`tosiGrid`, `TosiHeaderLinks`, `tosiPocketBar`, `tosiAffix`, `tosiSplitter`, `abTest`, `mapBox`, `bodymovinPlayer`, `scriptTag`/`styleSheet`, `pageSchematic`, `gamepadState`/`gamepadText`) are documented components or helpers. They need no decision.

---

## F. Numbers

**Lines.** Totals are from `wc -l`. The code/comment/doc/blank split is from a rough classifier (`count-lines.ts`, which treats `/*#`/`/*{` blocks as doc); it counts one extra line per file.

| part of scope | files | lines | code | comment | doc | blank |
|---|---|---|---|---|---|---|
| `src/` | 18 | 5,424 | 3,014 | 427 | 1,590 | 411 |
| entry points | 3 | 275 | 155 | 109 | 0 | 14 |
| `bin/` non-test `.ts` | 15 | 4,034 | 2,673 | 1,092 | 61 | 223 |
| `bin/make-icon-data.js` | 1 | 665 | | | | |
| teaching docs | 12 | 1,513 | | | | |

The teaching docs are README 192, Using-Components 486 and `src/docs` 835.

**Largest files.**
- `src/`: `babylon-3d.ts` 525, `affix.ts` 517, `tab-selector.ts` 511, `carousel.ts` 507, `splitter.ts` 461.
- `bin/`: `smoke-consumer.ts` 933, `resolve-site-config.ts` 685, `make-icon-data.js` 665, `tunnel.ts` 657.

**Root barrel.** 282 runtime exports, of which 33 are xin*/Xin* (12%): 28 silent, 5 warn. Zero of the 33 are used in 26 consumer repos. ✔ (probe-iife-spread): `window.xinjsui` carries 333 names, with no collisions between the spread modules.

**The area's most common task, importing a component.** Take `<tosi-tabs>`. There are 3 creator spellings (`tosiTabs`, `tabSelector`, `xinTabs`) across 3 import paths (the root, `tosijs-ui/tab-selector` and its `.js` twin), plus 3 names on the CDN global. That is 12 working ways, and 1 is recommended. The path chosen changes the initial bundle 7× (106.9 vs 15.5 kB gzip ✔).

**Ways to follow a container's size in this area:** 5 (B).

**Argv parsers in `bin/`:** 6 (B).

**Copies across `src/` and `bin/`:**
- HTML/XML escape functions: 10
- RegExp-escape one-liners: 15
- FNV-1a implementations: 6

**`dist/iife.js` at HEAD:** 533.6 kB gzip ✔ (`git show HEAD:dist/iife.js` measured with zlib). It matches README's "~533KB". `dist-sizes.json` records 546,394 bytes (533.6 kB).

**Behaviour tests.**
- **No behaviour tests:**
  - `tab-selector`
  - `side-nav`, except layout checks in `page-layout.pw.ts`/`doc-system.pw.ts`
  - `sizer`
  - `size-break`
  - `layout`
  - `header`
  - `ab-test`
  - `babylon-3d`
  - `bodymovin-player`
  - `gamepad`
  - `via-tag`
- **Some:** `splitter` (3 unit tests, a Playwright spec and a test fence), `pocket-bar` (11), `carousel` (4 unit tests and a Playwright spec), `affix` (4 and a Playwright spec), `checklist` (4, a Playwright spec and a fence; it also covers `pageSchematic`), `mapbox` (1).
