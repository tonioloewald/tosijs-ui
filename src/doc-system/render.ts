/*
Shared markdown rendering for the static doc system.

Both the build-time pre-render and the client (doc-browser) call THIS function, so
the static page hydrates byte-identically. Fenced code blocks are left as
<pre><code class="language-*"> so the static page shows readable, indexable code
AND the component can later upgrade consecutive blocks into <live-example> widgets
via insertExamples(). A fence info string may carry a `#id` (```js#my-example) to
give that example a stable anchor — see the docMarked renderer below.
*/

import { Marked, Renderer } from 'marked'

const baseRenderer = new Renderer()

// A doc-scoped marked instance. Its ONLY customization: a fenced code block whose
// info string carries a `#id` suffix — e.g. ```js#my-example — renders the lang
// clean (`language-js`, so all existing grouping/highlighting is unaffected) but
// stamps `data-example-id="my-example"` on the <pre>. insertExamples (client) and
// the book builders both read that to give the live example a stable anchor for
// deep-linking. A block with no `#id` is byte-identical to default marked output.
// Build-time transpiled JS for executable blocks, keyed by exact source text (see
// `renderDocMarkdown`). When present for a block, the renderer emits a hidden,
// non-executing `<script type="application/tosi-transpiled">` sibling carrying the
// baked JS so the page can RUN the example without loading the tjs/ts transpiler —
// see self-contained-examples-plan.md. Per-parse module state, safe because
// `docMarked.parse` is synchronous (same pattern as the footnote state below).
export interface ExampleBake {
  dialect: string
  js: string
}
export type ExampleBakes = Map<string, ExampleBake>
let currentBakes: ExampleBakes | undefined

const docMarked = new Marked()
docMarked.use({
  renderer: {
    code(token: any) {
      // Fence info grammar: `<lang>` optionally with a `:<mode>` and/or `#<id>` in
      // EITHER order — `js`, `css#anchor`, `js:iframe`, `ts:ide#demo`, `ts#demo:ide`.
      // `:mode` (inline | iframe | ide) sets the live example's execution mode; `#id`
      // gives it a stable anchor. `#id` is `[A-Za-z0-9_-]+` and `:mode` is `[a-z]+`, so
      // the two can't overlap — parse each independently, order-free. Both are stripped
      // so the language stays clean (`language-js`) for grouping/highlighting.
      const info = String(token.lang || '')
      const lang = info.match(/^[a-z]+/)?.[0] ?? ''
      const id = info.match(/#([A-Za-z0-9_-]+)/)?.[1] ?? ''
      const mode = info.match(/:([a-z]+)/)?.[1] ?? ''
      const bake = currentBakes?.get(token.text)
      if (!id && !mode && !bake) return false // default rendering — byte-identical
      let html = baseRenderer.code({ ...token, lang })
      const attrs = [
        id && `data-example-id="${id}"`,
        mode && `data-example-mode="${mode}"`,
      ]
        .filter(Boolean)
        .join(' ')
      if (attrs) html = html.replace(/^<pre>/, `<pre ${attrs}>`)
      if (bake) {
        // `<` → < prevents a `</script>` inside the JS from breaking the tag;
        // JSON.parse decodes it unchanged at hydration.
        const json = JSON.stringify(bake.js).replace(/</g, '\\u003c')
        html += `<script type="application/tosi-transpiled" data-dialect="${bake.dialect}">${json}</script>`
      }
      return html
    },
  },
})

// ── Prose Markdown: wikilinks + footnotes ────────────────────────────────────
// Enabled by default because each activates ONLY on its own syntax ([[…]] /
// [^id]) — a doc that doesn't use them renders byte-identically (tosijs-ui's own
// docs use neither). marked core supports neither; both are common in prose.

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Per-parse footnote state. `parse()` is synchronous and Marked tokenizes fully
// before rendering, so a module-level object is safe: preprocess resets it, the
// tokenizers fill it (defs during the block pass, refs during inline — refs set
// the number by first-appearance order), postprocess renders the endnotes.
const plainMarked = new Marked() // renders footnote-definition markdown (no extensions)
let footnoteDefs = new Map<string, string>()
let footnoteOrder: string[] = []

docMarked.use({
  hooks: {
    preprocess(markdown: string) {
      footnoteDefs = new Map()
      footnoteOrder = []
      return markdown
    },
    postprocess(html: string) {
      if (footnoteOrder.length === 0) return html
      const items = footnoteOrder
        .map((id) => {
          const body = plainMarked.parseInline(
            footnoteDefs.get(id) ?? ''
          ) as string
          const eid = slugify(id)
          return `<li id="fn-${eid}"><p>${body} <a href="#fnref-${eid}" class="footnote-backref" aria-label="Back to reference">↩</a></p></li>`
        })
        .join('\n')
      return `${html}\n<section class="footnotes" role="doc-endnotes">\n<hr />\n<ol>\n${items}\n</ol>\n</section>\n`
    },
  },
  extensions: [
    {
      // [[slug]] / [[slug|label]] → link to /slug/. Not matched inside code spans
      // (Marked tokenizes those first). Resolves by slugifying the target.
      name: 'wikilink',
      level: 'inline',
      start(src: string) {
        return src.match(/\[\[/)?.index
      },
      tokenizer(src: string) {
        const m = /^\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/.exec(src)
        if (!m) return undefined
        return {
          type: 'wikilink',
          raw: m[0],
          target: m[1].trim(),
          label: (m[2] ?? m[1]).trim(),
        }
      },
      renderer(token: any) {
        return `<a href="/${slugify(
          token.target
        )}/" class="wikilink">${escapeHtml(token.label)}</a>`
      },
    },
    {
      // [^id]: definition (single line) — collected, rendered as endnotes.
      name: 'footnoteDef',
      level: 'block',
      start(src: string) {
        return src.match(/^\[\^[^\]]+\]:/m)?.index
      },
      tokenizer(src: string) {
        const m = /^\[\^([^\]]+)\]:[ \t]*([^\n]*)(?:\n|$)/.exec(src)
        if (!m) return undefined
        footnoteDefs.set(m[1].trim(), m[2].trim())
        return { type: 'footnoteDef', raw: m[0] } // collected; renders nothing inline
      },
      renderer() {
        return ''
      },
    },
    {
      // [^id] reference → superscript link to the endnote.
      name: 'footnoteRef',
      level: 'inline',
      start(src: string) {
        return src.match(/\[\^/)?.index
      },
      tokenizer(src: string) {
        const m = /^\[\^([^\]]+)\]/.exec(src)
        if (!m) return undefined
        const id = m[1].trim()
        if (!footnoteOrder.includes(id)) footnoteOrder.push(id)
        return { type: 'footnoteRef', raw: m[0], id }
      },
      renderer(token: any) {
        const n = footnoteOrder.indexOf(token.id) + 1
        const eid = slugify(token.id)
        return `<sup class="footnote-ref"><a href="#fn-${eid}" id="fnref-${eid}">${n}</a></sup>`
      },
    },
  ],
})

/** Render a doc's markdown text to HTML (synchronous, default marked options). */
/*
Markdown wraps a lone CUSTOM ELEMENT in a paragraph, and that paragraph is the bug.

marked classifies raw HTML by tag name, and it cannot know whether an unknown tag is block or
inline — so `<my-thing></my-thing>` alone on a line comes out as `<p><my-thing></my-thing></p>`.
The paragraph is auto-height, so a page whose whole content is one embedded app gets an element
whose `height: 100%` resolves against a 33px box (tosijs-ui#115, measured: `p` 33px inside a
842px `.doc-content`). `layout: "full-screen"` exists precisely for that page, and the promise it
makes was not being kept.

The unwrap is deliberately NARROW, because a heuristic here earns its own bugs. It fires only
when a paragraph's entire content is a single element whose tag name contains a hyphen — i.e. a
custom element, the one case marked provably cannot classify. `<p><img></p>` and
`<p><em>text</em></p>` are left exactly alone: those are real paragraphs, and a `<p>` around them
is what the author asked for.
*/
const LONE_CUSTOM_ELEMENT =
  /<p>\s*(<([a-z][a-z0-9]*-[a-z0-9-]*)\b[\s\S]*?<\/\2>)\s*<\/p>/gi

export function unwrapLoneCustomElements(html: string): string {
  return html.replace(LONE_CUSTOM_ELEMENT, (whole, inner: string) => {
    /*
    Only when the element is the paragraph's WHOLE content. The regex already anchors both ends,
    but a nested same-tag structure could let the lazy match close early and leave a tail — so
    the result is checked for a stray closing tag rather than trusted.
    */
    return inner.includes('</p>') ? whole : inner
  })
}

export function renderDocMarkdown(
  text: string,
  opts: { bakes?: ExampleBakes } = {}
): string {
  currentBakes = opts.bakes
  try {
    return unwrapLoneCustomElements(docMarked.parse(text) as string)
  } finally {
    currentBakes = undefined
  }
}

/**
 * Derive a clean <meta name="description"> from a doc's first prose paragraph.
 * Skips the title heading, code fences, tables, quotes, html and image/link-only
 * lines; strips inline markdown; drops low-value "This is a…" leads; and truncates
 * on a sentence boundary where possible (never mid-clause ending in a comma).
 * Pages can override this entirely via their JSON metadata `description`.
 */
export function docDescription(text: string, maxLength = 160): string {
  const lines = text.split('\n')
  let inFence = false
  const prose: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (line === '') {
      if (prose.length) break // end of the first prose paragraph
      continue
    }
    if (line.startsWith('#')) continue // headings
    if (line.startsWith('<!--') || line.startsWith('/*')) continue // metadata
    if (line.startsWith('<')) continue // raw html
    if (line.startsWith('|') || line.startsWith('>')) continue // tables, quotes
    if (line.startsWith('![') || /^\[.*\]\(.*\)$/.test(line)) continue // image/link-only
    prose.push(line)
    if (prose.join(' ').length >= maxLength) break
  }

  let s = prose
    .join(' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^This (?:is|component is|widget is)\s+(?:a|an|the)\s+/i, '')
    .trim()
  if (!s) return ''
  s = s.charAt(0).toUpperCase() + s.slice(1)
  if (s.length <= maxLength) return s.replace(/[,;:\s]+$/, '')

  const slice = s.slice(0, maxLength)
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  )
  if (sentenceEnd > maxLength * 0.6)
    return slice.slice(0, sentenceEnd + 1).trim()
  const wordEnd = slice.lastIndexOf(' ')
  return (
    slice
      .slice(0, wordEnd)
      .replace(/[,;:.\s]+$/, '')
      .trim() + '…'
  )
}
