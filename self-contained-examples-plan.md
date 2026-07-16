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
2. **Runtime consume.** `insert-examples` absorbs the sibling → `example.compiledJs`; execution uses it
   and skips `loadTransform`. **Test:** Playwright — a `tjs` example renders its preview with the
   transpiler chunk NOT requested on first paint; editing still works (falls back / loads on edit).
3. **Defer editors.** Editors construct on first `showCode` (not in `content`), so a page with examples
   ships zero CodeMirror until a panel opens. Must not break unit/doc tests that mount editors.
4. **Save.** Re-transpile on save; persist source + fresh bake.

## Open items to resolve during implementation

- **Client re-render on SPA nav.** `renderDocMarkdown` is shared with the client (doc-browser). On
  client-side navigation the client has no bake map ⇒ no `<script>` ⇒ live-example falls back to
  runtime transpile (loads tjs). Acceptable as a first-paint optimization; to make it universal, ship
  the bake map in `docs.json` and let the client render with it. Decide in slice 2.
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
