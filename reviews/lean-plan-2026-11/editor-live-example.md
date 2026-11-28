# Lean-plan review: editor-live-example

Basis: `af13cd1ee` (1.19.2 + the unreleased `on<Event>` change). Line numbers refer to that commit.

Scope: `src/live-example/*.ts` (not tests), `src/live-example.ts`, `src/code-editor.ts`, `src/code-editor-cm.ts`,
`src/codemirror.ts`, `src/highlight-block.ts`, `src/markdown-viewer.ts`, `src/diff.ts`.

**Read line by line:** every non-test file in scope, including all 3,894 lines of `component.ts` (its 740-line `/*#` doc
block too) and all of `styles.ts`. **Tests:** I read their names and helpers, not every assertion. Baseline ✔:
`bun test src/live-example src/code-editor.test.ts src/code-editor-cm-types.test.ts src/diff.test.ts src/markdown-viewer.test.ts src/highlight-block.test.ts src/codemirror.test.ts src/codemirror-single-instance.test.ts`
gives `342 pass, 0 fail, 807 expect() calls, 27 files`.

**Not run:** the `/*#` examples themselves. They need Playwright or haltija, which the brief rules out, so section B does
not say whether any of them throws.

All throwaway scripts are in `…/scratchpad/lean/editor-live-example/`. "✔" means I executed one, and the command is
`cd ~/tosijs-ui && bun --preload ./src/test-setup.ts <script>` unless I say otherwise.

---

## A. Defects

### A1. Save to source writes an edit into the wrong example (cause: save-to-source still scans fences by hand)

`findFencedBlocks` (`src/live-example/save-to-source.ts:65`) is a line regex, `/^([ \t]*)```([^\n]*)\n([\s\S]*?)\n[ \t]*```/gm`.
The page assigns ordinals from marked's real parse (rendered DOM → `insertExamples`), and save-to-source assigns them
from this regex. CLAUDE.md records this exact failure for `build-warnings` in 1.16.7 ("do not write a line scanner") and
for `:static` in 1.16.1. This copy survived both fixes, and it is the copy whose disagreement **writes to a source file**.

✔ `misdirect3.ts`: each case is a document with three live examples on the page. I save the middle one with
`rewriteExampleBlocks(src, pageOrdinal, { js: 'EDITED()' })`:

| shape before the edited example | page examples | result |
| --- | --- | --- |
| 4-space-indented code that *illustrates* a fence | 2 | **wrote into another block** |
| a blockquoted ` ```js ` example | 3 | **wrote into another block** |
| ` ``` js ` (space before the language) | 3 | **wrote into another block** |
| a `~~~js` tilde fence | 3 | **wrote into another block** |
| a ` ````md ` block holding a ` ```js ` fence | 2 | refused (null) |
| CRLF line endings | 2 | correct |

The same run with no third example (✔ `misdirect.ts`) still misdirects the indented case. The blockquote, space and
tilde cases are refused there, because the out-of-range guard (`component.ts:2557`) only catches the *last* example.

✔ `ordinals.ts` runs the same check over the whole real corpus (`demo/docs.json`, 82 docs). Two docs disagree today:
`src/doc-system/doc-site-system.md:2487` and `src/doc-browser.ts:61`. Both are indented-code illustrations of fences, and
neither page has a live example, so nothing in this repo is misdirected *today*. Any adopter page that shows the fence
syntax that way (exactly what `doc-site-system.md` does) and then has a real example gets edits saved into the
illustration.

- **Fix:** derive block positions from marked's lexer (`collectCodeTokens` already exists, `src/doc-system/code-fences.ts:18`).
  For `.ts`/`.js` sources, map each `/*#` block's offset back to the file.
- **Tests:** keep `ordinals.ts` as a unit test over `demo/docs.json`, plus the six shapes above.
- **Minor, same function:** the diagnostic recount at `component.ts:2556` omits `examplePolicy()`, which the rewrite on
  `:2547` passed, so under `opt-in` the "finds only N groups" number is wrong.
- **Patch on its own: yes.** It is silent data corruption of a source file.

### A2. A failing example or test can quote another example's source line (cause: module-level "current source")

The "current source" is held in a module-level variable: `test-harness.ts:59` (`currentTestSource`, set `:420`, cleared
`:468`) and `execution.ts:23` (`exampleSource`, set `:388`, read `:418`). The comment at `execution.ts:20` assumes "an
example runs to completion before the next one starts". That is false: every example's `refresh()` runs concurrently,
and `enableTests()` (`component.ts:981`) re-runs them all at once.

- ✔ `concurrent-tests.ts`:
  - A alone: `Expected "A" to be "a" | expect('A').toBe('a') (line 3)`
  - A while B runs: `Expected "A" to be "a" | test('B is slow', async () => { (line 3)`
- ✔ `concurrent-examples.ts` (inline examples):
  - A alone: `A broke | throw new Error('A broke') (line 2)`
  - A while B runs: `A broke | const bLine2 = 'this is B' (line 2)`

`error-location.ts:50-52` itself says a wrong line is worse than none.

- **Fix:** pass the source in a closure. `createMatchers(value, negated, source)`, and the run returns its own
  `describe(err)`.
- **Patch on its own: yes.** It affects any page with more than one async example or test.

### A3. Import rewriting is two clause parsers that disagree, and neither is a parser (cause: `rewriteImports`)

✔ `imports.ts` and `imports-in-strings.ts` (plain `bun`, no preload):

- **`import { elements as els } from 'tosijs'`** (a context key) becomes `const { elements as els } = tosijs`, which is a
  **SyntaxError**. The resolver path handles `as` (`code-transform.ts:118-127`, `destructureClause`), but the
  context-key regex at `:239-243` does not.
- **`import tosi, { elements } from 'tosijs'`** throws `UnsupportedImportError`, and the message (`:278-280`) says the
  supported forms include "`default, { named }`", which is the form that just failed. The resolver path handles that
  form (`:155-158`). This is the #141 failure again: a sentence that rules out its own cause.
- **`import type { X } from 'tosijs'`** in a `ts` example throws. The rewrite runs *before* the TypeScript transform
  (`execution.ts:367`, `:526`), so the type-only import that `fromTS` would erase never reaches it. Most real TS
  examples have one.
- **Strings and template literals:** `"import { a } from 'tosijs'"` inside a string literal is rewritten into
  `"const { a } = tosijs"`. A template literal whose line starts with `import …` makes the leftover check (`:260`) throw.
  `assertContextProvided` in the same file (`:197-199`) avoids both on purpose, so the two copies disagree about what an
  import statement is. The build check treats `UnsupportedImportError` as "display-only", so such an example quietly
  stops running.

**Fix:** one clause parser for both targets, where only the right-hand side differs (`tosijs` vs
`await import('<prefix>pkg')`). Anchor it to statement starts the way `assertContextProvided` is anchored. Erase
`import type` before rewriting.

**Patch on its own: yes** for the `as` and `default, { named }` forms (both ordinary JavaScript). The string and template
cases are lower priority.

### A4. Blocked site data makes `live-example` (and so the iife) fail to import

`component.ts:941-946` reads `localStorage` at module evaluation (`:954`). The `typeof` guard does not help, because the
**accessor itself** throws (Chrome with site data blocked, sandboxed frames). `example-store.ts` and `remote-sync.ts`
wrap every access, so this is the copy without the guard.

- ✔ `blocked-storage.ts`:
  - `example-store.ts: imports fine`
  - `component.ts: IMPORT THROWS — SecurityError: … Access is denied`
- **Effect:** the doc browser and the iife import this module, so the whole doc site fails to hydrate for that reader.
- **Same pattern:** `enableTests` (`:977`), `disableTests` (`:1009`), and the pop-out's `render()` (`:3852`: unguarded
  `getItem` + `JSON.parse`).
- **Patch on its own: yes.** One try/catch.

### A5. `toEqual` passes for different Maps, Sets and Dates (test-harness `deepEqual`)

`test-harness.ts:85-101` compares own enumerable keys only.

✔ `misc.ts`: `toEqual(Map{1=>2}, new Map())`, `toEqual(Set{1}, Set{2})` and `toEqual(Date(0), Date(1e12))` all
**PASS**.

A matcher that passes falsely is the worst kind for a test tier that #1525 wants to promote. Worth a patch (small);
bundle it with A2 since it is the same file.

### A6. `<tosi-example>` with child `<pre>` sources mangles code (`initFromElements`, `component.ts:3796-3821`)

- ✔ `misc.ts`: the first-line-mode branch dedents with `.sort()` (`:3804`), which sorts **lexicographically**. With
  indents 4 and 12, `[4,12].sort()` gives `[12,4]`, and `const a = 1 … nested()` came out as `"= 1\n\nnested()\n"`.
- ✔ The same branch reads `innerHTML` for a js block (`:3799`), so `if (a < b)` became `if (a &lt; b)`.
- ✔ `persist.ts`: the write side, `updateSources` (`:3446-3456`, under the `persistToDom` attribute), writes source
  through `innerHTML`, so `if (a<b) { go() }` read back as `if (a { go() }`.
- No consumer sets `persistToDom` (checked with the grep helper described under C1). It is low impact because
  hand-written `<tosi-example>` markup is rare.
- **Patch on its own: no.** Fold it in with A4.

### A7. Lower-severity copy disagreements (all read)

- **`:iframe` examples' errors carry no line.** `executeInIframe` (`execution.ts:521-556`) has none of `executeInline`'s
  `sourceURL` tag, `diagnoseConstruction`, `cause` or CSP message. It shows `String(e.message)`.
- **Two tjs-lang copies on one page.** `loadTjsDocs` (`code-transform.ts:491-522`) and `loadTjsTestApiImpl` (`:548-568`)
  fall through to the CDN when the *installed* peer lacks the feature, while `loadTjs` (`:410-431`) used the installed
  one. With tjs-lang 0.13.x installed (inside the peer range), opening a tjs example's Docs tab downloads the pinned 0.14
  bundle as a second transpiler. Each loader also re-walks the CDN chain on its own when the peer is absent.
- **Misleading construction diagnosis.** `diagnoseConstruction` (`error-location.ts:205-210`) blames "the CONTEXT KEYS"
  whenever the body compiles without parameters. Keys are now always sanitized (`contextVarName`), so the remaining
  cause is a body that redeclares a parameter: `const preview = …`, or `const tosijs = …`. The message then points at the
  wrong thing. The console retry (`execution.ts:240-247`) already special-cases exactly this for `console`.
- **`<tosi-highlight>` language race.** Its stale-result guard checks only the value (`highlight-block.ts:137`). Change
  `language` while a grammar loads and the old grammar's markup can land under the new class.
- **`setExamplePolicy('none')` is silently ignored.** The setter accepts `ExamplePolicy` (`insert-examples.ts:157`), but
  `examplePolicy()` reads only `opt-in`/`no-code` (`:105-111`). Type it `SiteExamplePolicy`, as `:97` defines.
- **Floats in `<body>` outlive the example.** The completion float and its timer (`component.ts:1752-1754`) are not
  closed in `disconnectedCallback` (`:2938-2959`). An example removed while its completion list is open leaves the list
  in `<body>`.
- **Already filed, still live:**
  - #2725 T1: a replaced `js` dialect gets an empty JS tab.
  - #3133: `initialViewApplied` never resets; `mayHaveSingleSourceDirective` is fence-blind.
  - #2791 B2: two REPL paths with different semantics (`component.ts:1610-1645` vs `:1915-1955`).
  - #1411: `<tosi-md src>` assigns a plain field, so nothing re-renders (`markdown-viewer.ts:198-202`). It also has no
    error handling: a 404 renders the error body as markdown.

Card hygiene (read): **#3976 looks done.** `nothingToRun` (`execution.ts:305`, `:348`, `:519`) skips construction for
empty and `run`-dialect examples, and the hooks exist. Items 1–5 of **#3946** also appear implemented
(`shapeTjsOutput`, the ts path without `dialect`, `refreshOutput`, `assertContextProvided`, `stripExports`). Its item 6
is build-side and outside this area.

---

## B. Phase 1 (no functionality removed)

### Dead code

"Internal" here means exported from its module but in no entry point's export list. It is still reachable through the
`./*` wildcard, so check that before deleting.

- `remote-sync.ts:77-86` `sendCloseSignal`: no caller. `RemoteSyncManager.sendClose` (`:192`) is the live copy.
- `styles.ts`, selectors for elements nothing creates:
  - `.layout-indicator` (`:193-200`)
  - `.code-editors > h4` (`:446-453`), together with the `--code-editors-bar-bg/-color` variables it alone reads (`:9-10`)
  - `.sizer` (`:455-466`; keep the `button.transparent` half of that rule)
- `code-editor-cm.ts:300` `CmOptions.languageExtension`, and `:290` `CmHandle.focus`: no caller.
- `component.ts:936-939` `isLocalhost`: an identical copy lives at `doc-browser.ts:885-887`. Put one `isLocalhost()`
  beside `servedForDevelopment` in `dev-served.ts`.
- The `{ transforms: ['typescript'] }` argument passed at `code-transform.ts:305`, `execution.ts:367`, `:526`,
  `test-harness.ts:398` (and the build's `check-examples.ts:221`). It is a sucrase leftover that every transform ignores
  (`types.ts:52-56`). Stop passing it now; the type change is C.
- `code-editor.ts:288` `role = 'code editor'`. ✔ It renders `role="code editor"` on the host, which is not a valid role
  list for an editor; CodeMirror puts the real `textbox` role on its content. Probably remove. I'm unsure; an axe pass
  would settle it.

### One implementation each

1. **Compile and run code against a context: 6 copies.**
   - The copies:
     - `buildExample` (`execution.ts:230-248`)
     - its callers `executeInline` (`:362-425`) and `executeInIframe` (`:521-556`)
     - `runTests` (`test-harness.ts:384-461`)
     - `executeCode` (`code-transform.ts:298-316`)
     - the REPL fallback (`component.ts:1612-1645`)
     - `runInlineTjsTests` (`component.ts:2040-2048`)
   - **Merged version keeps the union of the guards:**
     - `contextParamNames`
     - the console-redeclare retry
     - `EvalError` → `CSP_REFUSED`
     - `diagnoseConstruction` with `cause`
     - the `sourceURL` tag
     - and a per-run source returned with the function, which fixes A2
   - **Not a router:** realm (the `Ctor`) and preview are inputs, and `runTests` still turns a construction failure into
     a result.
   - **Tests the merge needs:** A2's two scripts, the `:iframe` line numbers, and a body that redeclares `preview`.
2. **The scope object: 4 copies.** `{ preview, console?, ...context, ...extra }` is built at `execution.ts:374-379` and
   `:534-539`, `test-harness.ts:384-393` and `component.ts:2040-2043`, plus the Map at `component.ts:1614-1623`. Fold it
   into item 1.
3. **"message | source (line N)": 3 formats.**
   - `describeError` (`error-location.ts:158-175`)
   - the matcher's (`test-harness.ts:139-145`)
   - `describeModuleError` (`execution.ts:281-293`; the same thing with a zero offset)
   - Merge into one `describeError(err, source, { tag, offset })`.
4. **Import clause parsing: 2.** `rewriteImports`' context branch (`code-transform.ts:235-254`) and
   `rewriteBareImportsToDynamic` (`:136-168`). One parser, two right-hand sides. This is A3's fix.
5. **tjs-lang loader: 4 copies** of "installed peer, then `bundleUrls`" (`code-transform.ts:410`, `:491`, `:548`, `:577`).
   - Write one memoized `loadTjsBrowser()` returning the module.
   - Each feature reads from it with its existing `typeof` check, and `noteStripExports` runs once.
   - Fixes the mixed-version case in A7.
   - **Not a router:** `from-ts` is a separate file passed as a parameter.
6. **LCS: 2 copies** (`diff.ts:203-240` lines, `:287-326` tokens).
   - Merge into one `lcsWalk(a, b, emit)`. Keep `MAX_TOKENS`, and give `diffLines` a common prefix/suffix trim, which it
     lacks.
   - ✔ `diff-cost.ts`, one-line edit:
     | lines | time | RSS growth |
     | --- | --- | --- |
     | 1,000 | 6 ms | +13 MB |
     | 3,000 | 35 ms | +68 MB |
     | 6,000 | 124 ms | +226 MB |
   - ✔ `TosiDiff`'s `blocks` getter (`:603-605`) recomputes everything on every `value`/`changeCount` read: 12 ms each at
     2,000 lines, uncached. Cache it on (original, modified).
7. **"Same source ignoring trailing whitespace": 3 copies.** `save-to-source.ts:160`, `component.ts:3024`,
   `example-store.ts:35`. Make it one `normalizeSource`.
8. **"Is a `tosi-transpiled` script": 3 copies** in one file (`insert-examples.ts:36-37`, `:51-52`, `:68`).
9. **Font stack:** the CodeMirror font is written twice (`code-editor.ts:424`, `code-editor-cm.ts:224`).

### Declarations written twice

- `Dialect = 'js' | 'tjs' | 'ts'` (`types.ts:15`) beside `BUILT_IN_DIALECTS` (`example-policy.ts:39`). Derive the type
  from an `as const` list.
- **The four-slot source shape is declared at least 6 times:**
  - `ExampleEdits` (`save-to-source.ts:134`)
  - `ExampleEdit` (`example-store.ts:13`)
  - `RemotePayload` and its `original` (`types.ts:38-49`)
  - the `code` parameter of `openEditorWindow`/`send` (`remote-sync.ts:53`, `:176`)
  - `ExampleSource` (`example-hooks.ts:15`)

  The literal `['js','html','css','test']` is also iterated about 10 times in `component.ts` (`:2414`, `:2962`,
  `:3005`, `:3025`, `:3139`, `:3446`, `:3800`, `:3810`, `:3832`) and `save-to-source.ts:168`. Fix: one
  `SOURCE_SLOTS = [...] as const` plus `type ExampleSources = Partial<Record<Slot, string>>`.
- `ExampleParts` (`types.ts:17-36`) lacks `testStatus`, `splitter` and `refresh`, which `content()` creates
  (`component.ts:2712`, `:2720`, `:2799`). Hence the `as HTMLElement` casts at `:2342` and `:1335`.

### Teardown and caches

- **Always-on per-example cost** (read; ✔ indirectly: `persist.ts` would not exit until I added `process.exit`). Every
  connected example runs:
  - a 250 ms `setInterval` (`component.ts:2916`) that calls `hasLocalEdits` and `updateTestResultsVisibility`
  - a 500 ms localStorage poll (`remote-sync.ts:158`)
  - a `BroadcastChannel` (`:151`)

  All three are released on disconnect, but they exist even when no pop-out was ever opened. A page with 30 examples has
  60 intervals. The poll is needed only where `BroadcastChannel` is missing, or in the pop-out itself for its first
  payload. Undo state can follow the editor's `change` event once the panel is built.
- **Unconditional close signal.** `disconnectedCallback` calls `remoteSync.sendClose()` (`:2945`) unconditionally: one
  localStorage write plus a broadcast per example on every SPA navigation. Send it only if a pop-out was opened.
- **Completion float and timer:** see A7.
- **Bounded already, fine:** `resultCache` (256, `code-transform.ts:612`), the dark-mode registry
  (`code-editor-cm.ts:316-342`), `source-access` (per file).
- **Repeated JSON parsing.** `this.options` JSON-parses the `data-options` attribute on every read (`component.ts:1164`).
  `consoleEnabled` → `allowedTabs` reads it twice and runs on each `refreshOutput`. Cache it per attribute value.

### Structure (no behaviour change, one file per change)

`component.ts` is 2,350 lines of code in one class. Split it along seams that already have their own state:

- the console and REPL (`:844-1970`, about 1,100 lines) → `example-console-panel.ts`
- test mode (`:933-1012`) → `test-mode.ts`
- source persistence: save to source, local edits, View changes, the menu (`:2486-2611`, `:2961-3281`) →
  `example-persistence.ts`
- inline views (`:3283-3408`) → `inline-view.ts`

In `styles.ts`, merge the console-line rules written twice (`:296-312` and `:550-566`) into one
`:is(.example-console, [part="output"])` list. Two related problems in the same file:

- The comment at `styles.ts:34-40` says every state rule uses a child chain so a container's state never reaches a
  nested example. Lines `:110`, `:143`, `:168`, `:179` and `:188` use descendant combinators. Fix the rules or the
  comment.
- `.-maximize` (`:66`) is a bare global selector.

### Tests and build

- **Repeated harness:** a `mount()` helper is reimplemented in `example-console-panel.test.ts:8`,
  `example-view.test.ts:15`, `running-indicator.test.ts:32` and `dialect-bake.test.ts:14`. Make it one shared helper.
- **Tests the fixes need:**
  - A1: the corpus ordinal check plus the six shapes
  - A2: the two concurrency scripts
  - A3: `as`, `default, { named }`, `import type`, and import text in strings and templates. Context-path `as` is
    untested today; only the resolver path is (`code-transform.test.ts:125`).
  - A4: the throwing accessor
  - A5: Map, Set and Date
  - A6: indents 4 and 12; `<`

### Docs (no API change)

- **Wrong advice today: `component.ts:342`.** The doc example `import { registerDialect, liveExample } from 'tosijs-ui'`
  works only because the example context's `tosijs-ui` is the iife. The root barrel does **not** export either name
  (#133; confirmed in `exports-before.json`). A reader who copies it gets an import error.
  - It cannot simply be respelled `'tosijs-ui/live-example'`, because subpaths are not context keys.
  - Either add the subpath to the default context, or make the block `js:static` with the right import and keep a
    runnable twin.
- **Teaching order: `diff.ts:14`, `:42`, `:61`.** These examples use the injected `const { tosiDiff } = tosijsui` rather
  than `import { tosiDiff } from 'tosijs-ui'`. The import is what an adopter writes, and what other pages teach.
- **`code-editor.ts:74-88`:** the "Migrating from ACE" section goes once C removes the shims.
- **`markdown-viewer.ts:8-11`:** two consecutive opening sentences say the same thing.

---

## C. Phase 2 (one way to do each thing)

### C1. Redundant public spellings

**Consumer counts:** "imports" is the count in `consumer-usage.txt`. "refs" is my own grep of the 25 sibling repos
(`editor-live-example/cgrep.ts`; same files and skips as `consumer-usage.ts`, plus `www`/`tjs-out`/`docs-domain` and
built bundles), so it counts every mention, not just imports.

| task | redundant spelling | same as | consumers | notes |
| --- | --- | --- | --- | --- |
| create `<tosi-md>` | `markdownViewer`, `xinMd` | `tosiMd` (`markdown-viewer.ts:309-315`, the same function object) | `markdownViewer`: tjs-lang 8 refs, loewald-dot-com 4, tosijs-product 1 (imports: 2 repos, 6 uses). `xinMd`: 0 | **More used than the survivor** (`tosiMd`: 3 repos, 1 import each). Removal needs edits in 3 repos. |
| the class | `MarkdownViewer` (type + value) | `TosiMd` (`:305-307`, the same value) | tjs-lang 6 refs, loewald-dot-com 4 (imports: 2 repos, 5) | Same as the row above. |
| iframe execution | boolean `iframe` attribute | `mode="iframe"` (`component.ts:1027-1036`, `effectiveMode`) | 0 | Not `@deprecated`, no warning; the docs call it a "back-compat alias" (`:596`). |
| run code against a context | `executeCode` (`code-transform.ts:298`, exported from `live-example/index.ts:40`) | `executeInline` minus a preview, but with **fewer guards** (no console retry, no line location, no CSP message) | 0, and 0 in-repo | Remove rather than merge: the weaker copy of B1. |
| insert examples | `insertExamples(el, ctx, creator, tagName, file)` (`insert-examples.ts:209`, exported) | `LiveExample.insertExamples(el, ctx, file)` (`component.ts:1060-1072`), which supplies the two internals | 0 consumers; the doc-browser uses the static | The function form makes callers pass `liveExample` and its tag. Export only the static one, or a function with the static's signature. |
| transform signature | `TransformFn`'s second `options` parameter (`types.ts:54-56`) | the closure the dialect is baked into | n/a | Ignored by every transform. Drop it from the type at the minor (B removes the call sites first). |
| editor theming (removed in 1.7) | `<tosi-code>.theme`, `.options`, `.ace` (`code-editor.ts:325-359`) | `--code-bg`/`--text-color`; `editor` | 0 | Warn-once no-ops, twelve minors old. Delete at 1.20.0. |

### C2. The `@deprecated` inventory in scope

- **`code-editor.ts:325`, `:340`, `:355`** (`theme`, `options`, `ace`)
  - Each warns once and names its replacement (`warnRemoved`, `:133-139`).
  - The docs teach only the survivor apart from the migration table.
  - **No longer needed:** remove at 1.20.0, along with the migration section.
- **The `editor` getter's first-access `console.info`** (`code-editor.ts:307-317`): not tagged `@deprecated`, but part of
  the same 1.7 migration. It prints on *correct* CodeMirror 6 use; tjs-lang's playground uses `editor` this way. Under
  the "does this line change what the reader does" rule it should go with the shims.
- **`markdown-viewer.ts:304`, `:306`, `:311`, `:314`** (`MarkdownViewer` type and value, `markdownViewer`, `xinMd`)
  - Tagged `@deprecated`, **no runtime warning**. That matches the repo-wide `xin*` alias convention; cf. #1613 on
    warnings nobody can act on.
  - The docs teach only `<tosi-md>`/`tosiMd`.
  - Still needed until tjs-lang, loewald-dot-com and tosijs-product migrate.
- **What the inventory misses:**
  - the `iframe` attribute alias
  - `TransformFn`'s `options`
  - `mode="ide"`, which "today runs exactly like iframe" (`component.ts:597-599`); see D
  - `didRender` on `<tosi-md>` (`markdown-viewer.ts:262`): not deprecated and used by loewald-dot-com and a private consumer,
    so keep it
  - `src/live-example.ts`: "backward compatibility" in its comment, but it is load-bearing; see D

---

## D. Not proposing

- **`tosijs-ui/codemirror` re-exports all 80 names** (`codemirror.ts:43-44`). Only 3 are used by a consumer (tjs-lang's
  playground: `EditorView`, `EditorState`, `Compartment`). `export *` is the mechanism: the file's own rationale and
  CLAUDE.md's "one CodeMirror instance" both depend on it, and a curated list would strand the next extension author.
  Settled (`codemirror.ts:19-34`). See E for `__test`.
- **CodeMirror and Prism as hard dependencies; the doc cluster out of the root barrel; iife CDN-only.** Settled, CLAUDE.md
  (Key Dependencies; Subpath Exports).
- **`isLiveFence`/`parseFenceInfo`:** already single, and save-to-source uses `parseFenceInfo`. A1 is about block
  *positions*, not the predicate. Settled, CLAUDE.md "Live example code blocks".
- **`<tosi-md>` (kilpi-sanitized, plain marked) vs `renderDocMarkdown`.** Different jobs: untrusted text vs the trusted
  corpus, with wikilinks, footnotes, fences and accessibility. Not a duplicate. The Docs tab's use of `tosiMd`
  (`component.ts:2243-2245`) is the right one, since that markdown comes from example source.
- **`servedForDevelopment` vs `isLocalhost`.** Different questions (the tunnel counts for tests and not for save-to-source,
  which asks the server). Merge the two identical `isLocalhost` copies (B), not the predicates.
- **`mode="ide"`.** A reserved name for #3943's sandbox. Its docs already say not to rely on it.
- **`src/live-example.ts`.** It is what makes `tosijs-ui/live-example.js` resolve through the `./*.js` wildcard; CLAUDE.md
  (Subpath Exports) says that spelling is supported.
- **`setExampleConsole` / the `__TOSI_EXAMPLE_CONSOLE` global / the fence option / the site config.** One switch at
  different scopes, by design (`example-console.ts:139-143`).
- **Naming: `LiveExample`/`liveExample`, `CodeEditor`/`codeEditor`, `HighlightBlock`/`tosiHighlight`** break the `Tosi*`
  convention. Renaming adds spellings, the opposite of this plan, and is not worth a break by itself.
- **Memoized `null` for an unavailable tjs-lang** (`code-transform.ts:595-596`), so a CDN blip means raw JS for the page's
  life. A deliberate cost trade, documented at `:591-594`.

---

## E. Unused, but not redundant (the few that need a decision)

- **`RemoteSyncManager`, `STORAGE_KEY`** (`live-example/index.ts:42`): pop-out internals exported "for advanced usage".
  No in-repo use outside `live-example/`, and no consumer.
- **`executeInline`, `executeInIframe`** (`index.ts:41`): their signatures take the example's own internal elements
  (`exampleElement`, `styleElement`, `widgetsElement`). No consumer. If B1 merges them, decide whether they stay public.
- **`createTestContext`** (`index.ts:20`): no user anywhere.
- **`persistToDom`** (an attribute, `component.ts:1015`): unused and broken (A6). Remove it, or fix it with
  `textContent`.
- **`__test`**, re-exported from `@codemirror/view` through `tosijs-ui/codemirror`: an internal of theirs that we
  advertise. Harmless, but if the surface is ever pinned, this is the one name to drop.
- **`testManager`** (exported tosi state): writing it directly skips `enableTests`' persistence, CSS variable and
  re-run. Read-only export, or document it as read-only.

---

## F. Numbers

- **Size** (non-test, ✔ `loc.ts`): 24 files, 10,487 lines. **6,267 code, 2,442 comment, 1,136 doc (`/*#`), 642 blank.**
  Comment plus doc is 34% of the area.
- **Largest files** (total lines / code):

  | file | total | code |
  | --- | --- | --- |
  | `live-example/component.ts` | 3,895 | 2,350 (plus 740 doc, 619 comment) |
  | `diff.ts` | 831 | 481 |
  | `live-example/code-transform.ts` | 763 | 425 |
  | `live-example/styles.ts` | 612 | 460 |
  | `code-editor.ts` | 582 | 284 |
  | `live-example/execution.ts` | 560 | 356 |
- **Tests:** 342 across 27 files, all passing ✔.
- **Ways to compile and run code against a context:** **6** in this area. `check-examples.ts:227` and `:295` add 2 on the
  build side.
- **Ways to put a live example on a page:** **4**. A markdown fence; `liveExample()` plus properties; `<tosi-example>`
  with `<pre class="language-*">` children; `<tosi-example>` with first-line-mode `<pre>` children (the broken one, A6).
- **Ways to ask for iframe execution:** **4**. A `:iframe` fence, `mode="iframe"`, the boolean `iframe` attribute,
  `mode="ide"`.
- **Spellings of the markdown component:** 3 creators and 2 classes. The deprecated ones are used more than the
  survivors.
- **Fence scanners still written by hand across the repo:** 5. Save-to-source (A1) is in this area; `docs.ts:316`,
  `render.ts:511`, `doc-search.ts:100`/`:162` and `truncated-doc.ts:48` belong to other areas. Only save-to-source's
  writes to disk.
- **Timers per connected example:** 2 intervals (about 250 ms and 500 ms) plus 1 `BroadcastChannel`, whether or not its
  code panel or a pop-out is ever opened.
