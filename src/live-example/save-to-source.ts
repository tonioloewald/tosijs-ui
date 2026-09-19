/*
save-to-source

Rewrites the fenced code blocks of a single live example back into the doc source
string, so an in-place example edit can be persisted to the file it came from.

Operates on the *raw source* (the `.md`, or a `.ts`/`.js`/`.css` whose doc
comments contain the markdown), located by the example's ordinal — the same
grouping `insert-examples` uses: consecutive executable fenced blocks
(`js`/`html`/`css`/`test`), separated only by whitespace, form one example; any
other content (prose, a heading, or a non-executable block) starts a new one.

Limitations (v1): only blocks already present in the source are updated — adding a
new block type to an example isn't persisted. Replaces by block position, so it
never depends on the rendered/entity-decoded text matching the source.
*/

// `js`/`tjs`/`ts` are interchangeable "source" blocks (the example's executable
// code); html/css/test are the rest.
const SOURCE_LANGS = new Set(['js', 'tjs', 'ts'])

/*
Which fences count toward grouping is NOT decided here — `isLiveFence` decides it, the same
predicate `insert-examples` filters with. This module used to carry its own flat six-language
set, and the two diverged the moment `:static` shipped: `insert-examples` skipped a
`js:static` fence while this counted it, so every ordinal after it pointed one group too far
and an edit was written into a DIFFERENT block than the one edited. Silently — the
"couldn't locate this example" guard only fires on an out-of-range ordinal, and here a group
existed at that index.

Ordinals are a shared coordinate system between two modules. They agree only if both ask the
same question, so ask the shared one.
*/
import { isLiveFence, parseFenceInfo } from '../doc-system/example-policy.js'
import type { ExamplePolicy } from '../doc-system/example-policy.js'

interface FencedBlock {
  lang: string
  /** the `:<mode>` suffix (`inline` | `iframe` | `ide` | `static`), if the fence carried one */
  mode?: string
  indent: string // leading whitespace of the fence lines (see below)
  start: number // index of the opening ```
  end: number // index just past the closing ```
  codeStart: number // index of the first char of the code body
  codeEnd: number // index just past the last char of the code body
}

/**
 * Find every ```lang …``` fenced block in document order, with positions.
 *
 * `^([ \t]*)` captures the fence's indentation: a doc comment is often itself
 * indented (some code styles indent block-comment bodies), so its fences —
 * and their code lines — are indented in the raw source. The doc extractor dedents
 * them, so examples render with the right ordinals, but a raw scan must match them
 * where they actually sit (and re-indent on write-back). The old anchor-free regex
 * required the closing ``` immediately after a newline, so an indented file yielded
 * ZERO blocks → save-to-source always failed with "no matching block".
 */
export function findFencedBlocks(src: string): FencedBlock[] {
  // Capture the WHOLE info string and let `parseFenceInfo` split it. The previous regex
  // captured the language as `[\w-]*`, which stops at the colon — so `js:static` read as
  // plain `js` and the mode was invisible here while being load-bearing everywhere else.
  const re = /^([ \t]*)```([^\n]*)\n([\s\S]*?)\n[ \t]*```/gm
  const blocks: FencedBlock[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const codeStart = m.index + m[0].indexOf('\n') + 1
    const info = parseFenceInfo(m[2])
    blocks.push({
      lang: info.lang,
      mode: info.mode,
      indent: m[1],
      start: m.index,
      end: m.index + m[0].length,
      codeStart,
      codeEnd: codeStart + m[3].length,
    })
  }
  return blocks
}

/** Re-indent each non-empty line of `text` by `indent` (inverse of dedentBy). */
function indentBy(text: string, indent: string): string {
  if (!indent) return text
  return text
    .split('\n')
    .map((line) => (line ? indent + line : line))
    .join('\n')
}

/** Strip a leading `indent` from each line that has it (best-effort dedent). */
function dedentBy(text: string, indent: string): string {
  if (!indent) return text
  return text
    .split('\n')
    .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
    .join('\n')
}

/** Group executable blocks into examples, mirroring insert-examples. */
export function groupExamples(
  src: string,
  blocks: FencedBlock[],
  policy: ExamplePolicy = 'auto'
): FencedBlock[][] {
  const live = (b: FencedBlock | undefined): boolean =>
    b !== undefined && isLiveFence(b.lang, b.mode, policy)
  const groups: FencedBlock[][] = []
  let current: FencedBlock[] | null = null
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    if (!live(block)) {
      current = null // a fence that is not a live example breaks the run
      continue
    }
    const prev = blocks[i - 1]
    const adjacent =
      current !== null &&
      prev !== undefined &&
      live(prev) &&
      src.slice(prev.end, block.start).trim() === ''
    if (adjacent && current) {
      current.push(block)
    } else {
      current = [block]
      groups.push(current)
    }
  }
  return groups
}

export type ExampleEdits = {
  js?: string
  html?: string
  css?: string
  test?: string
}

/**
 * Return `src` with the `ordinal`-th example's edited blocks replaced, or `null`
 * if that example or none of the edited blocks exist in the source.
 */
export function rewriteExampleBlocks(
  src: string,
  ordinal: number,
  edits: ExampleEdits,
  /* Which fences are live examples — MUST match what `insert-examples` used, or the
     ordinal means something different here than it did there. */
  policy: ExamplePolicy = 'auto'
): string | null {
  const group = groupExamples(src, findFencedBlocks(src), policy)[ordinal]
  if (!group) return null

  // Code editors normalize trailing whitespace (e.g. add a trailing newline), so
  // an *untouched* block's editor value rarely byte-matches the source. Compare
  // with trailing whitespace trimmed so we only rewrite blocks the user actually
  // changed — otherwise saving one block churns its unedited siblings.
  const trimEnd = (s: string): string => s.replace(/\s+$/, '')
  const replacements: { start: number; end: number; text: string }[] = []
  // `edits.js` is the example's source code regardless of its dialect, so it maps
  // to whichever js/tjs/ts block the group actually has.
  const blockFor = (lang: 'js' | 'html' | 'css' | 'test') =>
    lang === 'js'
      ? group.find((b) => SOURCE_LANGS.has(b.lang))
      : group.find((b) => b.lang === lang)
  for (const lang of ['js', 'html', 'css', 'test'] as const) {
    const next = edits[lang]
    if (next === undefined) continue
    const block = blockFor(lang)
    if (!block) continue
    // The source fence may be indented (inside an indented doc comment) while the
    // editor value is dedented — compare dedented, and re-indent when writing back
    // so the block keeps its place in the comment.
    const sourceCode = src.slice(block.codeStart, block.codeEnd)
    if (trimEnd(dedentBy(sourceCode, block.indent)) === trimEnd(next)) continue
    replacements.push({
      start: block.codeStart,
      end: block.codeEnd,
      text: indentBy(next, block.indent),
    })
  }
  if (replacements.length === 0) return null

  // Apply right-to-left so earlier positions stay valid.
  replacements.sort((a, b) => b.start - a.start)
  let out = src
  for (const r of replacements) {
    out = out.slice(0, r.start) + r.text + out.slice(r.end)
  }
  return out
}
