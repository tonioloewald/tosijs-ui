/*
Build-time ePub (EPUB 3) generator for the doc system.

Walks the same extracted corpus the static site uses and emits a valid .epub:
one XHTML chapter per doc (in nav-tree order), a nested table of contents
(EPUB3 `nav.xhtml` + an EPUB2 `toc.ncx` fallback), a customizable stylesheet,
and the package document. Live examples are NOT executed — their fenced blocks
render as pretty-printed, force-wrapped code listings (a book has no JS).

The one ePub gotcha that breaks readers/validators is the zip layout: the
`mimetype` entry must be first and STORED (uncompressed). We get that for free
with the canonical `zip -X0` / `zip -Xr9D` two-step (see `zipEpub`).

Build-time only (Bun APIs + the `zip` CLI); never import from browser code.
*/

import * as fs from 'fs'
import * as path from 'path'
import { renderDocMarkdown } from '../render'
import { buildSlugMap } from '../routing'
import { buildNavTree, NavNode } from '../nav-tree'
import type { Doc } from './docs'
import type { SiteConfig } from './site-config'

declare global {
  // eslint-disable-next-line no-var
  var Bun: any
}

export interface BookMeta {
  title: string
  author: string
  language: string
  /** unique identifier (a URL or urn:) */
  identifier: string
  /** dcterms:modified timestamp, e.g. 2026-06-28T00:00:00Z */
  modified: string
}

export interface BuildEpubOptions {
  /** corpus path; default config.docsJson ?? 'demo/docs.json' */
  docsJson?: string
  /** output .epub path; default `${outputDir}/${slug(name)}.epub` */
  output?: string
  /** book title; default config.name */
  title?: string
  /** author / publisher line */
  author?: string
  /** BCP-47 language; default 'en' */
  language?: string
  /** override the whole book stylesheet */
  css?: string
  /** extra CSS appended to the default stylesheet (ignored if `css` is set) */
  extraCss?: string
  /** ISO timestamp for dcterms:modified; default now (seconds precision) */
  modified?: string
}

// ── XML / XHTML helpers ─────────────────────────────────────────────────────

const VOID_ELEMENTS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Best-effort normalize marked's HTML output to well-formed XHTML: self-close
 * void elements and escape bare `&` that isn't already part of an entity.
 */
export function toXhtml(html: string): string {
  let s = html
  for (const tag of VOID_ELEMENTS) {
    s = s.replace(
      new RegExp(`<${tag}\\b([^>]*?)\\s*/?\\s*>`, 'gi'),
      (_m, attrs: string) => {
        const a = attrs.replace(/\/\s*$/, '').trim()
        return `<${tag}${a ? ' ' + a : ''}/>`
      }
    )
  }
  // escape stray ampersands not part of a named/numeric entity
  s = s.replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
  return s
}

// ── Robust HTML→XHTML via a real parser (happy-dom) ─────────────────────────
// marked's output (plus raw HTML in docs) routinely isn't well-formed XML —
// unquoted attributes (`size=256`), HTML named entities (`&trade;`), prose that
// looks like a tag (`Set<Foo>`). A real HTML parser fixes all of it; we walk the
// resulting DOM and re-emit strict XML. Falls back to the regex pass above when
// happy-dom isn't installed.

const VOID_SET = new Set(VOID_ELEMENTS)

function escapeXmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

function serializeXml(node: any): string {
  const TEXT = 3
  const CDATA = 4
  const COMMENT = 8
  const ELEMENT = 1
  switch (node.nodeType) {
    case TEXT:
    case CDATA:
      return escapeXmlText(node.data ?? node.textContent ?? '')
    case COMMENT:
      return `<!--${String(node.data ?? '').replace(/--/g, '- -')}-->`
    case ELEMENT: {
      const tag = String(node.tagName).toLowerCase()
      // drop script/style (meaningless and unsafe in a book)
      if (tag === 'script' || tag === 'style') return ''
      const attrs = Array.from(node.attributes ?? [])
        .map((a: any) => ` ${a.name}="${escapeXmlAttr(String(a.value))}"`)
        .join('')
      const kids = Array.from(node.childNodes ?? [])
      if (kids.length === 0 && VOID_SET.has(tag)) return `<${tag}${attrs}/>`
      return `<${tag}${attrs}>${kids.map(serializeXml).join('')}</${tag}>`
    }
    default:
      return ''
  }
}

let parserOnce: Promise<any> | undefined
/** Lazily load happy-dom's Window (optional — book build only). */
function loadHtmlParser(): Promise<any> {
  return (parserOnce ??= import('happy-dom')
    .then((m: any) => m.Window)
    .catch(() => null))
}

/** Parse HTML in a real parser and re-emit strict XML, using a reused window. */
function htmlToXhtml(html: string, win: any): string {
  win.document.body.innerHTML = html
  return Array.from(win.document.body.childNodes).map(serializeXml).join('')
}

/** Drop the `<!--{ … }-->` metadata directives the extractor leaves in the text. */
export function stripDocMeta(text: string): string {
  return text.replace(/<!--\{[\s\S]*?\}-->\s*/g, '')
}

function xhtmlPage(title: string, bodyHtml: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${bodyHtml}
</body>
</html>
`
}

// ── Default stylesheet (force-wraps code; clean book typography) ─────────────

export const DEFAULT_BOOK_CSS = `/* tosijs-ui ePub default stylesheet */
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
h1 { font-size: 1.8em; page-break-before: always; }
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
/* Code: force-wrap so listings never overflow a page (no horizontal scroll in a book) */
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

// ── Package document, nav, ncx ──────────────────────────────────────────────

interface Chapter {
  id: string
  href: string // e.g. button.xhtml
  title: string
}

function containerXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`
}

function packageOpf(meta: BookMeta, chapters: Chapter[]): string {
  const manifestItems = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="css" href="style.css" media-type="text/css"/>`,
    ...chapters.map(
      (c) => `<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`
    ),
  ]
  const spine = chapters.map((c) => `<itemref idref="${c.id}"/>`)
  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(meta.identifier)}</dc:identifier>
    <dc:title>${escapeXml(meta.title)}</dc:title>
    <dc:language>${escapeXml(meta.language)}</dc:language>
    <dc:creator>${escapeXml(meta.author)}</dc:creator>
    <meta property="dcterms:modified">${meta.modified}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spine.join('\n    ')}
  </spine>
</package>
`
}

function renderNavList(nodes: NavNode<Doc>[], hrefFor: (d: Doc) => string): string {
  const items = nodes
    .map((node) => {
      const label = escapeXml(node.doc.title)
      const link = `<a href="${hrefFor(node.doc)}">${label}</a>`
      const kids = node.children.length
        ? `\n<ol>\n${renderNavList(node.children, hrefFor)}\n</ol>\n`
        : ''
      return `<li>${link}${kids}</li>`
    })
    .join('\n')
  return items
}

function navXhtml(
  meta: BookMeta,
  roots: NavNode<Doc>[],
  hrefFor: (d: Doc) => string
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head><meta charset="utf-8"/><title>${escapeXml(meta.title)}</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeXml(meta.title)}</h1>
    <ol>
${renderNavList(roots, hrefFor)}
    </ol>
  </nav>
</body>
</html>
`
}

function renderNavPoints(
  nodes: NavNode<Doc>[],
  hrefFor: (d: Doc) => string,
  counter: { n: number }
): string {
  return nodes
    .map((node) => {
      const id = `np-${++counter.n}`
      const kids = node.children.length
        ? '\n' + renderNavPoints(node.children, hrefFor, counter)
        : ''
      return `<navPoint id="${id}" playOrder="${counter.n}">
  <navLabel><text>${escapeXml(node.doc.title)}</text></navLabel>
  <content src="${hrefFor(node.doc)}"/>${kids}
</navPoint>`
    })
    .join('\n')
}

function tocNcx(
  meta: BookMeta,
  roots: NavNode<Doc>[],
  hrefFor: (d: Doc) => string
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(meta.identifier)}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(meta.title)}</text></docTitle>
  <navMap>
${renderNavPoints(roots, hrefFor, { n: 0 })}
  </navMap>
</ncx>
`
}

// ── Orchestration ───────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Flatten a nav-tree depth-first into spine / reading order. */
export function flatten(nodes: NavNode<Doc>[]): NavNode<Doc>[] {
  const out: NavNode<Doc>[] = []
  for (const node of nodes) {
    out.push(node)
    out.push(...flatten(node.children))
  }
  return out
}

/** Two-step zip that guarantees mimetype is first + STORED (the ePub gotcha). */
async function zipEpub(buildDir: string, outputAbs: string): Promise<void> {
  const $ = Bun.$
  await $`rm -f ${outputAbs}`.quiet()
  // 1) mimetype first, stored (-0), no extra fields (-X)
  await $`zip -X0 ${outputAbs} mimetype`.cwd(buildDir).quiet()
  // 2) everything else, deflated (-9), recursive (-r), no extra fields, no dir entries (-D)
  await $`zip -Xr9D ${outputAbs} META-INF OEBPS -x mimetype`.cwd(buildDir).quiet()
}

/**
 * Build an EPUB 3 book from the extracted corpus. Returns the output path.
 */
export async function buildEpub(
  config: SiteConfig,
  opts: BuildEpubOptions = {}
): Promise<string> {
  const docsJson = opts.docsJson ?? config.docsJson ?? 'demo/docs.json'
  const docs: Doc[] = JSON.parse(fs.readFileSync(docsJson, 'utf8')).filter(
    (d: Doc) => !d.hidden
  )
  const slugMap = buildSlugMap(docs)
  const roots = buildNavTree(docs, slugMap)

  const fileFor = (d: Doc): string => `${slugMap[d.filename] || 'index'}.xhtml`
  const meta: BookMeta = {
    title: opts.title ?? config.name,
    author: opts.author ?? config.name,
    language: opts.language ?? config.lang ?? 'en',
    identifier:
      config.baseUrl || `urn:tosijs-book:${slugify(opts.title ?? config.name)}`,
    modified: (opts.modified ?? new Date().toISOString()).replace(/\.\d+Z$/, 'Z'),
  }
  const css = opts.css ?? DEFAULT_BOOK_CSS + (opts.extraCss ? '\n' + opts.extraCss : '')

  // Stage the book in a temp dir, then zip it.
  const outDir = config.outputDir ?? 'docs'
  const buildDir = path.resolve(outDir, '.epub-build')
  fs.rmSync(buildDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(buildDir, 'META-INF'), { recursive: true })
  fs.mkdirSync(path.join(buildDir, 'OEBPS'), { recursive: true })

  fs.writeFileSync(path.join(buildDir, 'mimetype'), 'application/epub+zip')
  fs.writeFileSync(path.join(buildDir, 'META-INF', 'container.xml'), containerXml())
  fs.writeFileSync(path.join(buildDir, 'OEBPS', 'style.css'), css)

  // Prefer a real HTML parser (happy-dom) for strict XHTML; regex fallback.
  const WindowClass = await loadHtmlParser()
  const win = WindowClass ? new WindowClass() : null
  if (!win) {
    console.warn(
      'epub: happy-dom not available — falling back to regex XHTML (some chapters ' +
        'with raw HTML may not be strictly well-formed). `npm i -D happy-dom` to fix.'
    )
  }

  // One XHTML chapter per doc, in spine order.
  const chapters: Chapter[] = []
  for (const node of flatten(roots)) {
    const doc = node.doc
    const html = renderDocMarkdown(stripDocMeta(doc.text))
    // happy-dom occasionally throws on exotic content (e.g. an internal selector
    // bug); fall back to the regex pass for that doc rather than aborting.
    let bodyHtml: string
    try {
      bodyHtml = win ? htmlToXhtml(html, win) : toXhtml(html)
    } catch {
      bodyHtml = toXhtml(html)
    }
    const file = fileFor(doc)
    fs.writeFileSync(
      path.join(buildDir, 'OEBPS', file),
      xhtmlPage(doc.title, bodyHtml)
    )
    chapters.push({
      id: `ch-${slugMap[doc.filename] || 'index'}`,
      href: file,
      title: doc.title,
    })
  }

  fs.writeFileSync(
    path.join(buildDir, 'OEBPS', 'package.opf'),
    packageOpf(meta, chapters)
  )
  fs.writeFileSync(
    path.join(buildDir, 'OEBPS', 'nav.xhtml'),
    navXhtml(meta, roots, fileFor)
  )
  fs.writeFileSync(
    path.join(buildDir, 'OEBPS', 'toc.ncx'),
    tocNcx(meta, roots, fileFor)
  )

  const output = path.resolve(
    opts.output ?? path.join(outDir, `${slugify(meta.title)}.epub`)
  )
  await zipEpub(buildDir, output)
  fs.rmSync(buildDir, { recursive: true, force: true })

  console.log(`epub: ${output} (${chapters.length} chapters)`)
  return output
}
