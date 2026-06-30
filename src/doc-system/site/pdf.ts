/*
Headless PDF generator for the doc system — prints the shared "book" HTML
(book-html.ts, the same one the doc-browser's Print button uses) to PDF via
headless Chromium (Playwright). For interactive use, prefer the in-browser Print
button — this exists for automated/CI PDF generation.

Build-time only; requires `playwright` (a dev dependency here).
*/

import * as fs from 'fs'
import * as path from 'path'
import { buildBookHtml, DEFAULT_BOOK_CSS, PRINT_CSS } from '../book-html'
import type { Doc } from './docs'
import type { SiteConfig } from './site-config'

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

/** Build a PDF of the doc site from the extracted corpus. Returns the path. */
export async function buildPdf(
  config: SiteConfig,
  opts: BuildPdfOptions = {}
): Promise<string> {
  const docsJson = opts.docsJson ?? config.docsJson ?? 'demo/docs.json'
  const docs: Doc[] = JSON.parse(fs.readFileSync(docsJson, 'utf8'))
  const title = opts.title ?? config.name
  const css =
    opts.css ??
    `${DEFAULT_BOOK_CSS}\n${PRINT_CSS}${opts.extraCss ? '\n' + opts.extraCss : ''}`
  const html = buildBookHtml(docs, { title, css, lang: config.lang })

  let chromium: any
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    throw new Error(
      'PDF build needs Playwright. Install it (`npm i -D playwright && npx playwright install chromium`).'
    )
  }

  const output = path.resolve(
    opts.output ?? path.join(config.outputDir ?? 'docs', `${slugify(title)}.pdf`)
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

  console.log(`pdf: ${output}`)
  return output
}
