import { ElementCreator } from 'tosijs'
import { isLiveFence } from '../doc-system/example-policy.js'
import { ExampleContext } from './types.js'
import type { LiveExample } from './component.js'

interface SourceBlock {
  block: HTMLPreElement
  language: string | undefined
  code: string
  // Build-time transpiled JS from the block's baked `<script>` sibling, if any.
  compiled?: string
  // Execution mode from a `<lang>:<mode>` fence (inline | iframe | ide), if any.
  mode?: string
}

// A block's `<pre>` may be followed by a hidden `<script type="application/tosi-
// transpiled">` carrying its build-time transpiled JS (see
// self-contained-examples-plan.md). It sits BETWEEN consecutive code blocks, so the
// grouping walk must step over it — otherwise a tjs+test pair stops grouping. Returns
// the next element sibling that isn't such a script.
function nextGroupableSibling(el: Element | null): Element | null {
  let n = el?.nextElementSibling ?? null
  while (
    n?.tagName === 'SCRIPT' &&
    n.getAttribute('type') === 'application/tosi-transpiled'
  ) {
    n = n.nextElementSibling
  }
  return n
}

// The block's build-time transpiled JS, from the baked `<script>` immediately after
// its `<pre>` (JSON-encoded so a `</script>` in the JS can't break out). Absent on
// client-rendered pages (SPA nav re-renders markdown without bakes); the example then
// transpiles on demand at run time.
function bakedJsForBlock(block: Element): string | undefined {
  const n = block.nextElementSibling
  if (
    n?.tagName !== 'SCRIPT' ||
    n.getAttribute('type') !== 'application/tosi-transpiled'
  ) {
    return undefined
  }
  try {
    const parsed = JSON.parse(n.textContent || '')
    return typeof parsed === 'string' ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Find and replace sequences of code blocks with live examples
 */
/**
 * How fences are treated when no per-fence mode says otherwise.
 *
 * `'auto'` (default) — the six executable languages run, which is every corpus written
 * before 1.15 and stays correct for a component library's docs.
 * `'opt-in'` — nothing runs unless its fence asks, via `:inline` / `:iframe` / `:ide`.
 */
/*
Re-exported from `doc-system/example-policy.ts`, NOT redeclared.

There were two exported types with this name and different value sets — `'auto' | 'opt-in'`
here, `'auto' | 'opt-in' | 'none'` there — both reachable through the `./*` wildcard, so which
one an adopter got depended on which path they imported. `'none'` is a build-target concept
(an ePub, a printed page: nothing there can be live), so it is meaningless as a SITE setting,
which is why the narrow one existed. Express that as a subtraction from the real type rather
than as a second declaration that can drift.
*/
import type { ExamplePolicy } from '../doc-system/example-policy.js'
export type { ExamplePolicy }

/** The subset valid for `SiteConfig.liveExamples` — `'none'` is a build target, not a site. */
export type SiteExamplePolicy = Exclude<ExamplePolicy, 'none'>

/*
Read at insert time rather than captured, so the page can set it before hydration without
ordering constraints. The static build stamps `globalThis.__TOSI_EXAMPLE_POLICY` into the
page head — the same channel `__TJS_LOCAL_BASE` uses — and a consumer embedding the browser
directly can call `setExamplePolicy`.
*/
export function examplePolicy(): ExamplePolicy {
  const g = globalThis as { __TOSI_EXAMPLE_POLICY?: string }
  return g.__TOSI_EXAMPLE_POLICY === 'opt-in' ? 'opt-in' : 'auto'
}

export function setExamplePolicy(policy: ExamplePolicy): void {
  ;(globalThis as { __TOSI_EXAMPLE_POLICY?: string }).__TOSI_EXAMPLE_POLICY =
    policy
}

export function insertExamples(
  element: HTMLElement,
  context: ExampleContext,
  liveExampleCreator: ElementCreator<LiveExample>,
  liveExampleTagName: string,
  // The source file this doc was extracted from (a `.md`, or a `.ts`/`.js`/`.css`
  // with extracted doc comments). Stamped onto each example as
  // `data-source-file` + `data-example-ordinal` so a DocStore can locate the
  // originating fenced block to save edits back. Read-only; the write path comes
  // with Foundation B. Omitted when there's no source (e.g. embedded corpora).
  sourceFile?: string
): void {
  /*
  Which fences become live examples (tosijs-ui#140, #146).

  Six languages execute, and two of them — `html` and `css` — do not look like code anyone
  is asking to RUN. A `css` fence showing "here is how you'd style this in your app" was
  injected as a page-wide stylesheet; an `html` fence showing "the markup this compiles to"
  rendered as a broken-looking demo. Neither fails a build, so a doc site could ship both
  and never know. Until now a static sample in those languages was impossible: the only
  workaround was to mislabel the fence (`xml` for HTML), which changes the highlighting to
  a language it isn't.

  Two escapes, and the DEFAULT IS UNCHANGED so no existing corpus moves:

    ```js:static     one fence, opted out — works whatever the policy
    policy 'opt-in'  nothing runs unless it asks to, with `:inline`/`:iframe`/`:ide`

  `opt-in` is the setting for a prose or book site, where code is overwhelmingly
  illustration and a runaway `css` fence is a restyled chapter.
  */
  const optIn = examplePolicy() === 'opt-in'
  const sources: SourceBlock[] = [
    ...element.querySelectorAll(
      '.language-html,.language-js,.language-tjs,.language-ts,.language-css,.language-test'
    ),
  ]
    .filter((el) => !el.closest(liveExampleTagName))
    .map((code) => ({
      block: code.parentElement as HTMLPreElement,
      language: code.classList[0].split('-').pop(),
      code: (code as HTMLElement).innerText,
      compiled: bakedJsForBlock(code.parentElement as HTMLPreElement),
      mode:
        (code.parentElement as HTMLElement).getAttribute('data-example-mode') ||
        undefined,
    }))
    // THE shared rule — see doc-system/example-policy.ts. The static highlighter asks the
    // same question, and for one build the two disagreed: it tokenized the `html` fence of
    // every grouped example, and this read spans instead of markup.
    .filter((s) =>
      isLiveFence(s.language ?? '', s.mode, optIn ? 'opt-in' : 'auto')
    )

  // Per-doc ordinal: the Nth live example on the page. Combined with sourceFile
  // it's the key back to the originating fenced-block group in the source.
  let ordinal = 0
  for (let index = 0; index < sources.length; index += 1) {
    const exampleSources = [sources[index]]

    // Group consecutive code blocks
    while (
      index < sources.length - 1 &&
      nextGroupableSibling(sources[index].block) === sources[index + 1].block
    ) {
      exampleSources.push(sources[index + 1])
      index += 1
    }

    const example = liveExampleCreator({ context })
    if (sourceFile !== undefined) {
      example.setAttribute('data-source-file', sourceFile)
      example.setAttribute('data-example-ordinal', String(ordinal))
    }
    // Execution mode from a `<lang>:<mode>` fence — take the FIRST mode in the group.
    // Contradictory modes across the group's blocks are an authoring error: shout in the
    // console (which the doc-tests console-clean guard also catches) but obey the first.
    const modes = exampleSources
      .map((s) => s.mode)
      .filter((m): m is string => !!m)
    if (modes.length) {
      const distinct = [...new Set(modes)]
      if (distinct.length > 1) {
        console.error(
          `live example ${ordinal + 1}${
            sourceFile ? ` (${sourceFile})` : ''
          }: contradictory modes [${distinct.join(', ')}] — using the first, "${
            modes[0]
          }".`
        )
      }
      example.setAttribute('mode', modes[0])
    }
    // Stable anchor for deep-linking (and for book "run this live" links): an
    // author override `data-example-id` (from a ```js#my-id fence on any block in
    // the group) wins, else the 1-based positional `example-N`. The book builder
    // derives the same id from the same rendered DOM, so the links line up.
    const overrideId = exampleSources
      .map((s) => s.block.getAttribute('data-example-id'))
      .find((v): v is string => !!v)
    example.id = overrideId || `example-${ordinal + 1}`
    ordinal += 1
    const parent = exampleSources[0].block.parentElement as HTMLElement
    parent.insertBefore(example, exampleSources[0].block)

    /*
    One executable block per example — say so when an author writes two (tosijs-ui#139).

    `js`/`tjs`/`ts` all write the same single-valued slot, so a second executable fence
    silently overwrote the first: the earlier block vanished from the rendered page, the
    example ran as the later dialect, and nothing anywhere said so. Silent content loss in
    the direction the author cannot see — the page renders, the example works, and only the
    source shows what was meant.

    Warning rather than refusing: the page is still usable, and failing a doc build over a
    fence would be worse than the loss it prevents. It names the file so the author can find
    it, which the console alone would not.

    A dialect SELECTOR — the same example offered as TJS/TS/AJS — is the feature this
    limitation is standing in front of; see #139 for the shape.
    */
    const executable = exampleSources.filter(
      (s) =>
        s.language !== undefined && ['js', 'tjs', 'ts'].includes(s.language)
    )
    if (executable.length > 1) {
      const kept = executable[executable.length - 1]
      console.warn(
        `⚠️  ${sourceFile ?? 'doc'}: example ${example.id} has ${
          executable.length
        } executable blocks ` +
          `(${executable
            .map((s) => s.language)
            .join(', ')}) — only the LAST is used.\n` +
          `   The others are discarded and will not appear on the page. Keeping: ${kept.language}.\n` +
          `   Separate them with prose to make separate examples.`
      )
    }

    exampleSources.forEach((source) => {
      switch (source.language) {
        case 'js':
        case 'tjs':
        case 'ts':
          // All three are the example's executable "source" block; they land in
          // the same editor and the dialect drives how it's transpiled/run.
          example.js = source.code
          example.dialect = source.language
          // The build-time bake (tjs only today) lets refresh() run the preview
          // without loading the transpiler — see self-contained-examples-plan.md.
          // Pair it with the source it was transpiled from so refresh() drops it the
          // moment the example is edited.
          if (source.compiled !== undefined) {
            example.compiledJs = source.compiled
            example.compiledJsSource = source.code
          }
          break
        case 'html':
          example.html = source.code
          break
        case 'css':
          example.css = source.code
          break
        case 'test':
          example.test = source.code
          break
      }
      source.block.remove()
    })

    example.showDefaultTab()
    // Snapshot the original source, then restore any locally-saved edit on top
    // (per-browser scratchpad, keyed by the data-source-file/ordinal stamps).
    example.snapshotAndRestoreLocalEdit()
  }
}
