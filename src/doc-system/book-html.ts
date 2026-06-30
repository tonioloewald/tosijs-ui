/*
Shared, browser-safe assembly of the whole doc corpus into one printable HTML
"book": a title page, a generated table of contents, then every doc as a chapter
that starts on a new page. Used by the client-side **Print** button in the
doc-browser (the user's browser prints it to PDF) and by the headless PDF builder
(site/pdf.ts). Pure rendering — no fs, no Node-only APIs — so it bundles into the
iife. Live examples are pretty-printed, force-wrapped code listings, not executed.
*/

import { renderDocMarkdown } from './render'
import { buildSlugMap } from './routing'
import { buildNavTree, NavNode, NavDoc } from './nav-tree'

export interface BookDoc {
  filename: string
  title: string
  text: string
  parent?: string
  hidden?: boolean
}

// Clean book typography; force-wraps code so listings never overflow a page.
export const DEFAULT_BOOK_CSS = `/* doc-system book stylesheet */
html { font-size: 100%; }
body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.5;
  margin: 0 1em;
  color: #1a1a1a;
}
h1, h2, h3, h4, h5, h6 {
  font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.2;
  margin: 1.4em 0 0.5em;
}
h1 { font-size: 1.8em; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.2em; }
p { margin: 0.6em 0; }
a { color: #08c; text-decoration: none; }
ul, ol { margin: 0.6em 0; padding-left: 1.4em; }
blockquote {
  margin: 0.8em 0;
  padding: 0 0 0 1em;
  border-left: 3px solid #ccc;
  color: #555;
}
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; margin: 0.8em 0; font-size: 0.85em; }
th, td { border: 1px solid #ccc; padding: 0.3em 0.6em; text-align: left; }
code, pre {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.8em;
}
:not(pre) > code {
  background: #f3f3f3;
  padding: 0.1em 0.3em;
  border-radius: 3px;
}
pre {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  padding: 0.7em 0.9em;
  margin: 0.8em 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
pre code { background: none; padding: 0; }
`

// Print-only layout: page margins, a chapter per page, an avoid-break TOC.
export const PRINT_CSS = `
@page { margin: 18mm 16mm; }
.book-title { text-align: center; margin: 30vh 0 1em; }
.book-toc { page-break-after: always; }
.book-toc h2 { page-break-before: avoid; }
.book-toc ol { list-style: none; padding-left: 0; }
.book-toc ol ol { padding-left: 1.2em; }
.book-toc a { color: inherit; }
.chapter { page-break-before: always; }
`

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Drop the `<!--{ … }-->` metadata directives the extractor leaves in the text. */
export function stripDocMeta(text: string): string {
  return text.replace(/<!--\{[\s\S]*?\}-->\s*/g, '')
}

/** Flatten a nav-tree depth-first into reading order. */
export function flatten<T extends NavDoc>(nodes: NavNode<T>[]): NavNode<T>[] {
  const out: NavNode<T>[] = []
  for (const node of nodes) {
    out.push(node)
    out.push(...flatten(node.children))
  }
  return out
}

function tocHtml(nodes: NavNode<BookDoc>[]): string {
  return nodes
    .map(
      (node) =>
        `<li><a href="#${slugify(node.doc.filename)}">${escapeHtml(
          node.doc.title
        )}</a>${node.children.length ? `<ol>${tocHtml(node.children)}</ol>` : ''}</li>`
    )
    .join('')
}

export interface BookHtmlOptions {
  title: string
  /** full stylesheet (defaults to DEFAULT_BOOK_CSS + PRINT_CSS) */
  css?: string
  lang?: string
  /** inject a script that opens the print dialog once the page has loaded */
  autoPrint?: boolean
}

/** Assemble the whole corpus into one self-contained printable HTML document. */
export function buildBookHtml(docs: BookDoc[], opts: BookHtmlOptions): string {
  const visible = docs.filter((d) => !d.hidden)
  const slugMap = buildSlugMap(visible)
  const roots = buildNavTree(visible, slugMap)
  const css = opts.css ?? `${DEFAULT_BOOK_CSS}\n${PRINT_CSS}`

  const chapters = flatten(roots)
    .map(
      (node) =>
        `<section class="chapter" id="${slugify(node.doc.filename)}">\n${renderDocMarkdown(
          stripDocMeta(node.doc.text)
        )}\n</section>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="${opts.lang ?? 'en'}">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(opts.title)}</title>
<style>${css}</style>
</head>
<body>
<h1 class="book-title">${escapeHtml(opts.title)}</h1>
<nav class="book-toc"><h2>Contents</h2><ol>${tocHtml(roots)}</ol></nav>
${chapters}
${opts.autoPrint ? '<script>addEventListener("load",function(){setTimeout(function(){print()},300)})</script>' : ''}
</body>
</html>`
}
