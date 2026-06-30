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
const docMarked = new Marked()
docMarked.use({
  renderer: {
    code(token: any) {
      const info = String(token.lang || '')
      const hash = info.indexOf('#')
      if (hash === -1) return false // default rendering
      const id = info.slice(hash + 1).match(/^[A-Za-z0-9_-]+/)?.[0]
      if (!id) return false
      const html = baseRenderer.code({ ...token, lang: info.slice(0, hash) })
      return html.replace(/^<pre>/, `<pre data-example-id="${id}">`)
    },
  },
})

/** Render a doc's markdown text to HTML (synchronous, default marked options). */
export function renderDocMarkdown(text: string): string {
  return docMarked.parse(text) as string
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
  if (sentenceEnd > maxLength * 0.6) return slice.slice(0, sentenceEnd + 1).trim()
  const wordEnd = slice.lastIndexOf(' ')
  return slice.slice(0, wordEnd).replace(/[,;:.\s]+$/, '').trim() + '…'
}
