/*
Shared, browser-safe assembly of the whole doc corpus into one printable HTML
"book": a title page, a generated table of contents, then every doc as a chapter
that starts on a new page. Used by the client-side **Print** button in the
doc-browser (the user's browser prints it to PDF). Pure rendering — no fs, no
Node-only APIs — so it bundles into the iife. Live examples are pretty-printed,
force-wrapped code listings, not executed.
*/

import { renderDocMarkdown } from './render.js'
import { buildSlugMap } from './routing.js'
import { buildNavTree, NavNode, NavDoc } from './nav-tree.js'

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
/*
Prism token colours for the book — a LIGHT palette, deliberately distinct from the site's.

The site has TWO palettes, one per mode. A book has one background and it is light: the
pre rule above is #f6f8fa, an ePub reader may impose white or sepia, and paper is paper.
Reusing the site palette here would be light-on-light — invisible body text dressed as syntax
highlighting, which is the exact failure a nested diff hit in tosijs-ui#143.

Contrast-checked against #f6f8fa; the comment green is the weakest at ~4.6:1, still above
WCAG AA for body text. Colours are literal rather than custom properties because this
stylesheet ships inside an ePub, where custom properties are not reliably supported.

NO BACKTICKS in this comment: it lives inside a JS template literal, so one would end the
string and drop the rest of the stylesheet into code. (It did. Same shape as a block comment
ending a doc comment early — punctuation that means something to the container.)
*/
.token.comment, .token.prolog, .token.cdata { color: #5c6f5c; font-style: italic; }
.token.punctuation { color: #666; }
.token.string, .token.char, .token.attr-value, .token.regex { color: #a03030; }
.token.number, .token.boolean, .token.constant { color: #0b7285; }
.token.keyword, .token.important, .token.atrule { color: #0a5bb5; }
.token.function, .token.class-name { color: #7a4b00; }
.token.operator, .token.entity, .token.url { color: #444; }
.token.tag, .token.selector, .token.builtin { color: #0a6b52; }
.token.attr-name, .token.property { color: #2a5db0; }
.token.deleted { color: #b02020; }
.token.inserted { color: #2a6b2a; }
.token.bold { font-weight: bold; }
.token.italic { font-style: italic; }
/* the in-flow Contents page (ePub spine TOC) */
.toc-title { text-align: center; }
ol.toc, ol.toc ol { list-style: none; padding-left: 0; }
ol.toc ol { padding-left: 1.2em; }
ol.toc li { margin: 0.3em 0; }
ol.toc > li > a { font-weight: bold; }
/* per-example "run this live" deep link */
.example-live-link { margin: 0.6em 0 0; font-size: 0.85em; }
.example-live-link a { color: #08c; font-weight: bold; }
/* footnotes / endnotes + wikilinks */
sup.footnote-ref { font-size: 0.7em; line-height: 0; }
sup.footnote-ref a { text-decoration: none; }
.footnotes { margin-top: 2em; font-size: 0.9em; }
.footnotes hr { border: none; border-top: 1px solid #ccc; margin: 1em 0; }
.footnote-backref { text-decoration: none; }
a.wikilink { text-decoration: none; border-bottom: 1px dotted currentColor; }
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
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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
        )}</a>${
          node.children.length ? `<ol>${tocHtml(node.children)}</ol>` : ''
        }</li>`
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
        `<section class="chapter" id="${slugify(
          node.doc.filename
        )}">\n${renderDocMarkdown(stripDocMeta(node.doc.text))}\n</section>`
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
${
  opts.autoPrint
    ? '<script>addEventListener("load",function(){setTimeout(function(){print()},300)})</script>'
    : ''
}
</body>
</html>`
}
