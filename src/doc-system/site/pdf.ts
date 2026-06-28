/*
Build-time PDF generator for the doc system — the ePub's sibling emitter.

Renders the same corpus, in the same nav-tree order, into one print-oriented
HTML document (book stylesheet + a generated table of contents, each doc a
chapter that starts on a new page), then prints it to PDF via headless Chromium
(Playwright). Live examples are pretty-printed, force-wrapped code listings, not
executed — same as the ePub.

Build-time only; requires `playwright` (already a dev dependency here). Never
import from browser code.
*/

import * as fs from 'fs'
import * as path from 'path'
import { renderDocMarkdown } from '../render'
import { buildSlugMap } from '../routing'
import { buildNavTree, NavNode } from '../nav-tree'
import type { Doc } from './docs'
import type { SiteConfig } from './site-config'
import { DEFAULT_BOOK_CSS, stripDocMeta, flatten } from './epub'

export interface BuildPdfOptions {
  /** corpus path; default config.docsJson ?? 'demo/docs.json' */
  docsJson?: string
  /** output .pdf path; default `${outputDir}/${slug(name)}.pdf` */
  output?: string
  /** book title; default config.name */
  title?: string
  /** override the whole stylesheet */
  css?: string
  /** extra CSS appended to the default (ignored if `css` is set) */
  extraCss?: string
  /** page format, default 'A4' */
  format?: 'A4' | 'Letter'
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Print-only tweaks layered on the shared book stylesheet.
const PRINT_CSS = `
@page { margin: 18mm 16mm; }
.book-title { text-align: center; margin: 30vh 0 1em; }
.book-toc { page-break-after: always; }
.book-toc h2 { page-break-before: avoid; }
.book-toc ol { list-style: none; padding-left: 0; }
.book-toc ol ol { padding-left: 1.2em; }
.book-toc a { color: inherit; }
.chapter { page-break-before: always; }
`

function tocHtml(nodes: NavNode<Doc>[]): string {
  const items = nodes
    .map(
      (node) =>
        `<li><a href="#${slugify(node.doc.filename)}">${escapeHtml(
          node.doc.title
        )}</a>${node.children.length ? `<ol>${tocHtml(node.children)}</ol>` : ''}</li>`
    )
    .join('')
  return items
}

/** Build a PDF of the doc site from the extracted corpus. Returns the path. */
export async function buildPdf(
  config: SiteConfig,
  opts: BuildPdfOptions = {}
): Promise<string> {
  const docsJson = opts.docsJson ?? config.docsJson ?? 'demo/docs.json'
  const docs: Doc[] = JSON.parse(fs.readFileSync(docsJson, 'utf8')).filter(
    (d: Doc) => !d.hidden
  )
  const slugMap = buildSlugMap(docs)
  const roots = buildNavTree(docs, slugMap)
  const title = opts.title ?? config.name
  const css = opts.css ?? DEFAULT_BOOK_CSS + (opts.extraCss ? '\n' + opts.extraCss : '')

  const chapters = flatten(roots)
    .map((node) => {
      const id = slugify(node.doc.filename)
      return `<section class="chapter" id="${id}">\n${renderDocMarkdown(
        stripDocMeta(node.doc.text)
      )}\n</section>`
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="${config.lang ?? 'en'}">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>${css}\n${PRINT_CSS}</style>
</head>
<body>
<h1 class="book-title">${escapeHtml(title)}</h1>
<nav class="book-toc"><h2>Contents</h2><ol>${tocHtml(roots)}</ol></nav>
${chapters}
</body>
</html>`

  // Print to PDF with headless Chromium.
  let chromium: any
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    throw new Error(
      'PDF build needs Playwright. Install it (`npm i -D playwright && npx playwright install chromium`).'
    )
  }

  const output = path.resolve(
    opts.output ??
      path.join(config.outputDir ?? 'docs', `${slugify(title)}.pdf`)
  )
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    await page.pdf({
      path: output,
      format: opts.format ?? 'A4',
      printBackground: true,
      displayHeaderFooter: false,
    })
  } finally {
    await browser.close()
  }

  console.log(`pdf: ${output} (${chapters.split('class="chapter"').length - 1} chapters)`)
  return output
}
