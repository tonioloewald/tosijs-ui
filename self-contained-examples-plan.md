# Self-contained examples (M10 half 2)

**Goal.** Make a doc page *runnable* with nothing but the ~123KB hydration entry. CodeMirror and
the tjs transpiler become pure **edit-time** enhancements — they load only when the reader opens or
edits a code panel, never on first paint, and never to merely *run* a `tjs`/`ts` example's preview.

This supersedes the earlier "defer editor construction" framing (approaches a/b in the M10 TODO).
Those only defer **CodeMirror**; a `tjs` example still pulls the **transpiler** to render its preview.
Baking the transpiled JS into the page removes both from the first-paint path and, as a bonus, makes
a saved example self-contained (runnable with zero runtime deps).

## The key insight: the bake artifact already exists

The runtime execution pipeline (`src/live-example/execution.ts`) is:

```
source → rewriteImports(src, contextKeys) → transform(…, {transforms:['typescript']}) → withScopeCapture → new AsyncFunction(…)
         └─ cheap string op ─────────────┘   └─ THE EXPENSIVE PART (loads tjs/ts) ────┘   └─ cheap ─────┘   └─ cheap ─┘
```

The only expensive step is `transform` (the tjs/ts transpiler). **The bake artifact is exactly the
post-`transform` string** — which is precisely what `check-examples.ts` already computes for every
executable block on every build (`js = transform(rewriteImports(block.text, contextKeys))`). So the
build already produces the bytes we want to embed; today it just throws them away after syntax-checking.

Runtime *with* a bake: `withScopeCapture(bakedCode, …)` + `AsyncFunction` — **no transpiler loaded.**
`js`-dialect blocks need no bake at all: `rewriteImports` alone is the whole pipeline (no transform),
so runtime just skips the transform step.

## Identity: key bakes by source text, not ordinal

Three independent passes enumerate the code blocks — `check-examples` (walks `marked.lexer`, recursing
into lists), `generate-site` (renders via `renderDocMarkdown`), and `insert-examples` (groups
consecutive `<pre>` DOM siblings). If they disagree on *which block is which*, a bake attaches to the
wrong example — silent, confusing breakage.

**Solution: key by exact source text** — `Map<sourceText, { dialect, js }>`. Identical source ⇒
identical bake, so there is no cross-pass ordinal to get wrong. Two byte-identical blocks legitimately
share one bake. All three passes see the same `marked`-tokenized `token.text`, so the keys line up.

## Storage: a hidden, non-executing `<script>` co-located with the `<pre>`

Emitted by the shared renderer right after the block's `<pre>`:

```html
<script type="application/tosi-transpiled" data-dialect="tjs">"…JSON-stringified JS…"</script>
```

- A `<script>` with a non-JS `type` **never renders and never executes** — invisible to no-JS readers,
  self-contained in the page, no extra request. (Beats a custom `<transpiled-code>` element, which
  still renders its text content as `display:inline` unless styled away.)
- **Escaping:** the JS can contain `</script>`. Store `JSON.stringify(js).replace(/</g, '\\u003c')`
  (the same trick the JSON-LD emitter uses); `JSON.parse` at hydration. `<` prevents the
  `</script>` breakout without changing the decoded bytes.
- Co-located with the `<pre>` in the single markdown-render pass ⇒ block identity is positional at
  emit time; `insert-examples` absorbs the sibling when it groups the `<pre>`s.

## Runtime

- `insert-examples`: when grouping `<pre>` siblings into a `<live-example>`, also absorb an immediately
  following `<script type="application/tosi-transpiled">` sibling per block; set `example.compiledJs`
  (new per-block field) from the parsed JSON.
- live-example execution: if `compiledJs` is present, run `withScopeCapture(compiledJs) + AsyncFunction`
  directly — **do not `loadTransform`**. Fall back to the current runtime-transpile path when there is
  no bake (client-side SPA navigation to a not-yet-visited page; a corpus built by an older builder).
- Editors + transpiler load only on edit intent (`showCode` / first focus of a panel).

## Save-to-source keeps the invariant

On save of an edited example, the editor's tjs is already loaded, so re-transpile the edited source and
persist **both** the source block and a fresh `<script type="application/tosi-transpiled">` — so a saved
custom example stays self-contained (runnable with zero runtime deps).

## Slices (each independently committable)

1. **Build-side, INERT.** `check-examples` child returns the bakes (`Map<sourceText,{dialect,js}>`)
   alongside problems — it already transpiles, so nothing transpiles twice. Orchestrator threads them
   to `generate-site`; `renderDocMarkdown(text, { bakes })` emits the co-located `<script>`. Nothing
   reads it yet ⇒ cannot break execution. **Test:** build, grep a generated page for the `<script>`,
   assert its JSON parses to valid JS. ← START HERE
2. **Runtime consume. ✅ DONE.** `insert-examples` reads each block's baked `<script>` →
   `example.compiledJs`; `executeInline`/`executeInIframe` run it verbatim (skip `rewriteImports` +
   `transform`). `refresh()` uses the bake ONLY when tests are off (`bake = dialect!=='js' &&
   !testManager.enabled.value ? compiledJs : undefined`) — so localhost / the doc-test harness (tests
   ON, default off-localhost) take the ORIGINAL full-transform path unchanged and the harness can't
   regress. **Plus a second, larger win found while verifying:** every js example was calling
   `loadTransform('js')`, which loaded the whole tjs bundle even though tjs's `js` dialect is a no-op
   and the build check guarantees js/`test` blocks are vanilla JS — so `loadTransform('js')` now
   returns identity and loads nothing. Net: a reader page runs ALL its examples (js via identity, tjs
   via bake) with the tjs transpiler NEVER requested on first paint.
   **Verified:** the doc-tests lane (all examples, js-identity behaviorally exact); a reader-path
   Playwright test (tests seeded off) asserting the tjs previews render from the bake AND zero
   `/tjs/tjs-browser.js`, with a tests-on control that proves the probe (transpiler DOES load then);
   unit tests for `executeInline`+bake, `insert-examples`→`compiledJs`, and `loadTransform('js')`
   identity.
   **SPA-nav resolution:** the landing page ADOPTS the pre-rendered DOM (bakes present → no
   transpiler); client-side navigation re-renders markdown without bakes → runtime-transpile
   fallback. So the bake pays off on direct/first-paint loads (the SEO/blank-screen case). Shipping
   bakes in `docs.json` to cover SPA-nav too is a deferred follow-up (below).
3. **Defer editors. ✅ DONE.** The editor panel (4 `<tosi-code>` + toolbar) is built by `ensureEditors()`
   on first `showCode`/`viewChanges`/remote-popout, NOT in `content()` — constructing a `<tosi-code>`
   is what imports the CodeMirror chunk. Approach (a): values live in the existing `pendingValues`
   string cache until the panel is built (extended from "until hydration" to "until editors built"),
   and the preview runs from them; the parts proxy resolves the dynamically-appended editors (it
   queries `this` live and caches on first success). Guarded every editor-subtree part access
   (`activeTab`, `updateUndo`, `updateTestResultsVisibility`, `showDefaultTab`, `ensureProductTabs`)
   on `editorsBuilt`. **Verified:** a Playwright test asserts zero `code-editor-cm` requests and zero
   `<tosi-code>` in the DOM on first paint, then a working editor (with source text) after `showCode`;
   the full 17-spec Playwright lane (incl. `code-editor`, `doc-system`, `hydration`) and the doc-tests
   lane stay green. **Net across slices 2+3: a reader page loads NEITHER the transpiler NOR CodeMirror
   on first paint** — the M10 goal.
4. **Save.** Re-transpile on save; persist source + fresh bake.

## Open items to resolve during implementation

- **Client re-render on SPA nav — RESOLVED (slice 2b ✅ DONE).** The landing page adopts the
  pre-rendered DOM; SPA nav now re-renders with the doc's bakes too. `checkExamples` groups bakes
  **per doc filename**; `generateSite` attaches each doc's bakes to its `Doc` in the emitted
  `docs.json` (`doc.bakes` = `[source, {dialect,js}]` entries) AND renders the static page from the
  same per-doc map; the client passes `doc.bakes` into `renderDocMarkdown(doc.text, { bakes })` on
  every non-adopted render. Confirmed zero-cost for prose: only the one doc with tjs examples carries
  bakes; the other 56 add nothing. **Verified:** a Playwright test lands on `/`, clicks through to the
  component page (client-side), and asserts the tjs examples render from the docs.json bakes with zero
  `/tjs/tjs-browser.js`.
- **Hydrate-in-place reconciliation.** Confirm the "pre-render the chrome, hydrate in place" path
  adopts the pre-rendered `<script>` siblings rather than re-rendering markdown over them.
- **`ts` via bun vs CDN.** `check-examples` transpiles `ts` with `Bun.Transpiler` (network-free);
  the runtime `ts` path fetches the TypeScript compiler from a CDN. Both strip types, so the baked
  bun output is a valid executable — but confirm equivalence, or restrict baking to `tjs` (the common
  doc dialect) and leave `ts` on the runtime path initially.

## Do NOT

- Gate the editor/transpiler on "does this corpus have code examples" — the doc system is an
  *authoring* system; prose/book sites need the editor most.
- Make `renderDocMarkdown` async (it is shared by generate-site, book-html, epub) — pass bakes as
  precomputed data via module-level per-parse state, the same pattern the footnote renderer uses.
