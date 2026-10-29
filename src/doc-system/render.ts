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
import { parseFenceInfo } from './example-policy.js'
import { HeadingIds, headingSlug, headingText } from './heading-id.js'
import { pathForSlug, slugify } from './routing.js'

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
let currentWikilinks: Map<string, string> | undefined

// Per-parse, reset in `preprocess` below (same pattern as the footnote state).
let headingIds = new HeadingIds()

/*
The accessibility mode (`accessibility: 'wcag22-aa'` in the site config, #3521) changes what a
page renders, so it lives here, in the one renderer the build, the ePub, print and the hydrated
browser share. Two rewrites, both off unless asked for:

- A figure. An image alone in its paragraph, followed by a paragraph that is only italic text
  (on the next line, or after a blank one), becomes `<figure>` with that text as its
  `<figcaption>`. The caption is then programmatically tied to the image, which is what makes an
  empty `alt` correct for an image the caption describes.
- One `<h1>`, the page title. A page with no `#` heading gets its title as one; a later `#` is
  demoted to `##`; and the rest are shifted so the first level below the title is `##`. Skipped
  levels are left alone and reported by the build: renumbering them would guess at structure.
*/
/** `SiteConfig.accessibility`. One level for now; the name says which standard it targets. */
export type AccessibilityMode = 'wcag22-aa'

let currentA11y: { title?: string } | undefined

const isBlank = (t: any) =>
  (t.type === 'text' && !String(t.raw).trim()) || t.type === 'br'

/** The image token of a paragraph whose only content is one image, else undefined. */
function loneImage(tokens: any[]): any {
  const content = tokens.filter((t) => !isBlank(t))
  return content.length === 1 && content[0].type === 'image'
    ? content[0]
    : undefined
}

/** The em token of a paragraph whose only content is italic text, else undefined. */
function loneEmphasis(tokens: any[]): any {
  const content = tokens.filter((t) => !isBlank(t))
  return content.length === 1 && content[0].type === 'em'
    ? content[0]
    : undefined
}

function figureFrom(paragraph: any): any {
  // `![…](…)` and `*caption*` on consecutive lines are one paragraph to marked.
  const content = paragraph.tokens.filter((t: any) => !isBlank(t))
  if (
    content.length === 2 &&
    content[0].type === 'image' &&
    content[1].type === 'em'
  )
    return {
      type: 'figure',
      raw: paragraph.raw,
      image: content[0],
      caption: content[1],
    }
  return undefined
}

function withFigures(tokens: any[]): any[] {
  const out: any[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type === 'blockquote' && Array.isArray(token.tokens)) {
      token.tokens = withFigures(token.tokens)
    }
    if (token.type !== 'paragraph') {
      out.push(token)
      continue
    }
    const joined = figureFrom(token)
    if (joined) {
      out.push(joined)
      continue
    }
    const image = loneImage(token.tokens)
    let next = i + 1
    while (tokens[next]?.type === 'space') next += 1
    const caption =
      image &&
      tokens[next]?.type === 'paragraph' &&
      loneEmphasis(tokens[next].tokens)
    if (caption) {
      out.push({
        type: 'figure',
        raw: tokens
          .slice(i, next + 1)
          .map((t) => t.raw)
          .join(''),
        image,
        caption,
      })
      i = next
      continue
    }
    out.push(token)
  }
  return out
}

function withOneTitle(tokens: any[], title?: string): any[] {
  const headings = tokens.filter((t) => t.type === 'heading')
  /*
  A page with no `#` takes its title from its first heading, whatever its level, so that
  heading IS the title: promote it rather than print the same words twice.
  */
  const lead = headings[0]
  const first =
    headings.find((t) => t.depth === 1) ??
    (lead && title && headingText(lead).trim() === title.trim()
      ? lead
      : undefined)
  // The shift comes from the sub-headings as written; a demoted `#` is not one of them.
  const below = headings
    .filter((h) => h !== first && h.depth > 1)
    .map((h) => h.depth)
  const shift = below.length ? Math.min(...below) - 2 : 0
  if (first) first.depth = 1
  for (const h of headings) {
    if (h === first) continue
    if (h.depth === 1) h.depth = 2
    else if (shift > 0) h.depth -= shift
  }
  if (!first && title)
    return [
      {
        type: 'heading',
        raw: '',
        depth: 1,
        text: title,
        tokens: [
          { type: 'text', raw: title, text: escapeHtml(title), escaped: true },
        ],
      },
      ...tokens,
    ]
  return tokens
}

/**
 * The accessibility mode's token rewrites (#3521), exported so the build's report reads exactly
 * the structure the page renders.
 */
export function accessibleTokens(tokens: any[], title?: string): any[] {
  return withOneTitle(withFigures(tokens), title)
}

const docMarked = new Marked()
docMarked.use({
  renderer: {
    // Every heading gets an id, so `[text](#that-heading)` resolves — see heading-id.ts.
    heading(this: any, token: any) {
      const id = headingIds.next(headingSlug(token))
      const inner = this.parser.parseInline(token.tokens)
      return `<h${token.depth}${
        id ? ` id="${escapeAttr(id)}"` : ''
      }>${inner}</h${token.depth}>\n`
    },
    code(token: any) {
      // Fence info grammar: `<lang>` optionally with a `:<mode>` and/or `#<id>` in
      // EITHER order — `js`, `css#anchor`, `js:iframe`, `ts:ide#demo`, `ts#demo:ide`.
      // `:mode` (inline | iframe | ide) sets the live example's execution mode; `#id`
      // gives it a stable anchor. `#id` is `[A-Za-z0-9_-]+` and `:mode` is `[a-z]+`, so
      // the two can't overlap — parse each independently, order-free. Both are stripped
      // so the language stays clean (`language-js`) for grouping/highlighting.
      // Parsed by `parseFenceInfo` — the ONE copy of this grammar. It used to live here and
      // `save-to-source.ts` had a second, worse one; see the note on that function.
      const parsed = parseFenceInfo(String(token.lang || ''))
      const lang = parsed.lang
      const id = parsed.id ?? ''
      const mode = parsed.mode ?? ''
      const bake = currentBakes?.get(token.text)
      // Fence options (#184) ride to the page as JSON in an attribute; a parse error rides
      // too, so the page can say which example it belongs to (the build does not know).
      const options =
        parsed.options && escapeAttr(JSON.stringify(parsed.options))
      const optionsError =
        parsed.optionsError && escapeAttr(parsed.optionsError)
      if (!id && !mode && !bake && !options && !optionsError) return false // default rendering — byte-identical
      let html = baseRenderer.code({ ...token, lang })
      const attrs = [
        id && `data-example-id="${id}"`,
        mode && `data-example-mode="${mode}"`,
        options && `data-example-options="${options}"`,
        optionsError && `data-example-options-error="${optionsError}"`,
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
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
    processAllTokens(tokens: any) {
      if (!currentA11y) return tokens
      const rewritten = accessibleTokens([...tokens], currentA11y.title)
      // A TokensList carries `links` (reference definitions); keep it.
      return Object.assign(rewritten, { links: tokens.links })
    },
    preprocess(markdown: string) {
      footnoteDefs = new Map()
      footnoteOrder = []
      headingIds = new HeadingIds()
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
      // Built only by `accessibleTokens` above; there is no syntax of its own to tokenize.
      name: 'figure',
      renderer(this: any, token: any) {
        const image = this.parser.parseInline([token.image])
        const caption = this.parser.parseInline(token.caption.tokens)
        return `<figure>${image}<figcaption>${caption}</figcaption></figure>\n`
      },
    },
    {
      // [[slug]] / [[slug|label]] → link to /slug/. Not matched inside code spans
      // (Marked tokenizes those first). Given the corpus's `wikilinkTargets`, a target is
      // looked up there (by slug, then title) and one that reaches no page is marked
      // `-missing` for the build to report; without them it is slugified as written.
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
        const key = slugify(token.target)
        const slug = currentWikilinks ? currentWikilinks.get(key) : key
        const missing =
          slug === undefined
            ? ` -missing" data-target="${escapeAttr(token.target)}`
            : ''
        return `<a href="${pathForSlug(
          slug ?? key
        )}" class="wikilink${missing}">${escapeHtml(token.label)}</a>`
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
  opts: {
    bakes?: ExampleBakes
    /** the corpus's `wikilinkTargets`; without it a `[[target]]` is slugified as written */
    wikilinks?: Map<string, string>
    /**
     * The accessibility mode (#3521): figures with captions, and exactly one `<h1>`. `title` is
     * the page title, rendered as that `<h1>` when the markdown has none.
     */
    accessible?: boolean
    title?: string
  } = {}
): string {
  currentBakes = opts.bakes
  currentWikilinks = opts.wikilinks
  currentA11y = opts.accessible ? { title: opts.title } : undefined
  try {
    return unwrapLoneCustomElements(docMarked.parse(text) as string)
  } finally {
    currentBakes = undefined
    currentWikilinks = undefined
    currentA11y = undefined
  }
}

/**
 * A doc's tokens as the accessibility mode renders them, for the build's report: the same
 * lexer and the same rewrites as `renderDocMarkdown`, so the report and the page cannot
 * disagree about what is a figure or which heading is the `<h1>`.
 */
export function accessibleDocTokens(text: string, title?: string): any[] {
  return accessibleTokens([...docMarked.lexer(text)], title)
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
