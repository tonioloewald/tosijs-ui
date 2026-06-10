/*
Shared markdown rendering for the static doc system.

`renderDocMarkdown` MUST stay in lockstep with how <tosi-md> renders doc text
(see src/markdown-viewer.ts: `marked(source, this.options)` with default options),
so the build-time pre-render is byte-identical to what the component would produce
on the client. Fenced code blocks are left as <pre><code class="language-*"> so the
static page shows readable, indexable code AND the component can later upgrade
consecutive blocks into <live-example> widgets via insertExamples().
*/

import { marked, MarkedOptions } from 'marked'

export const docMarkedOptions: MarkedOptions = {}

/** Render a doc's markdown text to HTML (synchronous, default marked options). */
export function renderDocMarkdown(text: string): string {
  return marked(text, docMarkedOptions) as string
}

/**
 * First prose line of a doc, for <meta name="description">. Skips the title
 * heading, code fences, blockquotes, tables and other non-sentence lines, then
 * truncates to a sensible length on a word boundary.
 */
export function docDescription(text: string, maxLength = 160): string {
  const lines = text.split('\n')
  let inFence = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (line === '') continue
    if (line.startsWith('#')) continue // headings
    if (line.startsWith('<!--') || line.startsWith('/*')) continue // metadata
    if (line.startsWith('<')) continue // raw html
    if (line.startsWith('|') || line.startsWith('>')) continue // tables, quotes
    if (line.startsWith('![') || /^\[.*\]\(.*\)$/.test(line)) continue // image/link-only lines
    // Strip inline markdown for a clean snippet.
    const clean = line
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .trim()
    if (clean.length <= maxLength) return clean
    return clean.slice(0, clean.lastIndexOf(' ', maxLength)).trim() + '…'
  }
  return ''
}
