/*
What the accessibility mode cannot fix, found at build time (#3521).

The renderer fixes what it can decide mechanically: figures and the one `<h1>`. What is left
needs an author: an image with nothing describing it, a heading that skips a level, a link
whose text says nothing out of context. Those are reported here, by file and line, and fail
the build under `strict`.

It reads `accessibleDocTokens`, the same lexer and rewrites the page renders, so a figure the
page shows with a caption is never reported as an image without one.

An image inside a figure is not reported however empty its `alt` is: the caption describes it,
and empty alt is then what WCAG asks for. Judging whether a caption or an alt text is GOOD is
out of scope, and stays the author's.
*/

import { accessibleDocTokens } from '../render.js'
import { headingText } from '../heading-id.js'

export interface A11yFinding {
  /** a short description of the problem, naming the offending markup */
  message: string
  /** the block's markdown, for locating it in the source file */
  raw: string
  /** for a markdown image with no alt and no caption: the one an `altText` hook could fill */
  image?: { href: string; title?: string | null; raw: string }
}

/*
Link text that says nothing when read out of context, which is how a screen reader's list of
links presents it (WCAG 2.4.4). Compared whole, lowercased, punctuation dropped.
*/
const AMBIGUOUS_LINK_TEXT = new Set([
  'here',
  'click here',
  'this',
  'this link',
  'link',
  'more',
  'read more',
  'learn more',
  'this page',
  'go',
])

const plain = (token: any): string =>
  headingText(token)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

const hasText = (tokens: any[]): boolean =>
  tokens.some((t) =>
    t.type === 'image' ? !!String(t.text).trim() : !!plain(t)
  )

/** Raw `<img>` tags with no `alt` attribute at all (an `alt=""` is taken as deliberate). */
const IMG_WITHOUT_ALT = /<img\b(?![^>]*\balt\s*=)[^>]*>/gi

function walkInline(tokens: any[], block: string, out: A11yFinding[]): void {
  for (const t of tokens ?? []) {
    if (t.type === 'image' && !String(t.text).trim()) {
      out.push({
        message: `![](${t.href}) has no alt text and no caption`,
        raw: block,
        image: { href: t.href, title: t.title, raw: t.raw },
      })
    } else if (t.type === 'link') {
      const images = (t.tokens ?? []).filter((c: any) => c.type === 'image')
      if (images.length && !hasText(t.tokens)) {
        out.push({
          message: `a linked image (to ${t.href}) has no alt text, so the link has no name`,
          raw: block,
        })
        continue // its image is reported as part of the link
      }
      const text = plain(t)
      if (AMBIGUOUS_LINK_TEXT.has(text)) {
        out.push({
          message: `a link named "${text}" (to ${t.href}) says nothing out of context`,
          raw: block,
        })
      }
      // An image beside the link's text is decorative there: the text names the link, and
      // empty alt is right for it.
      walkInline(
        (t.tokens ?? []).filter((c: any) => c.type !== 'image'),
        block,
        out
      )
    } else if (t.type === 'html') {
      for (const img of String(t.raw).match(IMG_WITHOUT_ALT) ?? [])
        out.push({ message: `${img} has no alt attribute`, raw: block })
    } else if (Array.isArray(t.tokens)) {
      walkInline(t.tokens, block, out)
    }
  }
}

function walkBlocks(
  tokens: any[],
  out: A11yFinding[],
  state: { depth: number }
): void {
  for (const t of tokens) {
    if (t.type === 'figure') continue // the caption names the image; nothing to report
    if (t.type === 'heading') {
      if (state.depth && t.depth > state.depth + 1) {
        out.push({
          message: `"${headingText(t)}" is an <h${
            t.depth
          }> directly under an <h${state.depth}>`,
          raw: t.raw,
        })
      }
      state.depth = t.depth
      walkInline(t.tokens, t.raw, out)
    } else if (t.type === 'html') {
      walkInline([t], t.raw, out)
    } else if (t.type === 'list') {
      for (const item of t.items) walkBlocks(item.tokens, out, state)
    } else if (t.type === 'table') {
      for (const cell of [...t.header, ...t.rows.flat()])
        walkInline(cell.tokens, t.raw, out)
    } else if (t.type === 'blockquote') {
      walkBlocks(t.tokens, out, state)
    } else if (Array.isArray(t.tokens)) {
      walkInline(t.tokens, t.raw, out)
    }
  }
}

/** Every problem the accessibility mode reports for one doc, in document order. */
export function accessibilityFindings(
  text: string,
  title?: string
): A11yFinding[] {
  const out: A11yFinding[] = []
  walkBlocks(accessibleDocTokens(text, title), out, { depth: 0 })
  return out
}

/**
 * The 1-based line in `source` where a finding's block starts, or undefined when it cannot be
 * found (a block the extractor reshaped). Matched on the block's first non-blank line, which
 * survives the extractor's handling of doc comments.
 */
export function findingLine(source: string, raw: string): number | undefined {
  const first = raw.split('\n').find((line) => line.trim())
  if (!first) return undefined
  const at = source.indexOf(first.trim())
  return at < 0 ? undefined : source.slice(0, at).split('\n').length
}
