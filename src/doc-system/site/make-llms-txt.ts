import * as fs from 'fs'
import * as path from 'path'
import { buildSlugMap, pathForSlug, withBase } from '../routing.js'
import { buildNavTree, type NavNode } from '../nav-tree.js'
import { flatten, stripDocMeta } from '../book-html.js'
import { liveFenceLanguages } from './build-warnings.js'
import { pageDescription } from './page-metadata.js'
import { docDescription } from '../render.js'
import type { ExamplePolicy } from '../example-policy.js'

const SRC = 'src'
const DIST = 'dist'

/** A doc as it appears in the extracted corpus (docs.json). */
interface CorpusDoc {
  title?: string
  headTitle?: string
  filename: string
  path?: string
  text?: string
  description?: string
  hidden?: boolean
  noindex?: boolean
  pin?: 'top' | 'bottom'
  order?: number
  parent?: string
}

interface LlmsEntry {
  title: string
  description: string
  /** rendered-doc URL (corpus mode) or dist/*.js path (legacy scan) */
  link: string
  /** the page's markdown copy, when the site writes one */
  markdown?: string
  /** the nav section this page sits in (its top-level ancestor), '' at the top level */
  section?: string
}

function extractTitle(text: string): string {
  const match = text.match(/^#+ (.+)/m)
  return match ? match[1].trim() : ''
}

export interface LlmsTxtMeta {
  name?: string
  description?: string
  /**
   * Site **ORIGIN ONLY** — `https://example.github.io`, not
   * `https://example.github.io/repo`. The path the site is mounted under is `basePath`,
   * and this module applies it (#144). Putting the path here doubles it in every
   * canonical URL and sitemap entry, because `generate-site` adds `basePath` on top.
   */
  baseUrl?: string
  /** URL prefix the site is mounted under — mirrors `SiteConfig.basePath`. */
  basePath?: string
  /** project links — `github` / `npm` (or any) become Source/npm links */
  projectLinks?: Record<string, string | undefined>
  /** optional framing line(s) under the description */
  tagline?: string
  /**
   * @deprecated Ignored since 1.16.16. It used to add a paragraph about driving the dev
   * server with the `hj` CLI; `llms.txt` is for whoever consumes the library, so that note
   * belongs in the project's own agent instructions. Kept so existing callers still compile.
   */
  haltijaDev?: boolean | 'tunnel'
  /**
   * Mirrors `SiteConfig.markdownPages` (default true): the build writes `index.md` beside
   * every page, so the index says so. Pass false when the site ships HTML only — pointing a
   * reader at a file that is not there costs more than not mentioning it.
   */
  markdownPages?: boolean
  /** Mirrors `SiteConfig.liveExamples`: which fences are live decides the examples note. */
  liveExamples?: ExamplePolicy
}

/** The pages an index lists: titled, not hidden, not noindex. */
function indexable(corpus: CorpusDoc[]): Array<CorpusDoc & { title: string }> {
  // A noindex page is one the author asked not to be found; the sitemap and the markdown
  // copies already leave it out, and an index for agents is no different.
  return corpus.filter(
    (doc): doc is CorpusDoc & { title: string } =>
      !!doc.title && !doc.hidden && !doc.noindex
  )
}

/**
 * The indexable pages in NAV order, each with its top-level section (#3564). An index sorted
 * by title reads a book's chapters out of order, and the nav order is the author's.
 */
function inNavOrder(
  corpus: CorpusDoc[]
): Array<{ doc: CorpusDoc & { title: string }; section: string }> {
  const docs = indexable(corpus)
  const roots = buildNavTree(docs, buildSlugMap(corpus))
  const out: Array<{ doc: CorpusDoc & { title: string }; section: string }> = []
  for (const root of roots as NavNode<CorpusDoc & { title: string }>[]) {
    const section = root.children.length ? root.doc.title : ''
    for (const node of flatten([root])) out.push({ doc: node.doc, section })
  }
  return out
}

/**
 * Build entries from the extracted corpus — every doc that was actually
 * extracted (`.md`, `.ts`/`.js`/`.css` doc comments, auto-created sections),
 * linking to its rendered URL, in nav order. This is what the build uses: it
 * reflects the real docs and needs no `dist/` library output.
 */
export function entriesFromCorpus(
  corpus: CorpusDoc[],
  meta: LlmsTxtMeta
): LlmsEntry[] {
  const slugMap = buildSlugMap(corpus)
  const base = (meta.baseUrl ?? '').replace(/\/$/, '')
  return inNavOrder(corpus).map(({ doc, section }) => {
    const link =
      base + withBase(meta.basePath, pathForSlug(slugMap[doc.filename]))
    return {
      // The <title> a search result shows names the page better than a terse nav label.
      title: doc.headTitle?.trim() || doc.title,
      // The page's own description, by the rule its <head> uses; no site fallback, which
      // would repeat the summary on every line.
      description: pageDescription({ ...doc, title: doc.title }).text,
      link,
      markdown:
        meta.markdownPages === false
          ? undefined
          : `${link.endsWith('/') ? link : link + '/'}index.md`,
      section,
    }
  })
}

/**
 * Legacy fallback when no corpus is passed (e.g. running this file directly):
 * scan `src/*.ts` for doc-comment blocks that have a built `dist/*.js` sibling.
 */
function entriesFromSrcScan(): LlmsEntry[] {
  const entries: LlmsEntry[] = []
  let files: string[]
  try {
    /*
    `.tjs` too — and note `'x.tjs'.endsWith('.ts')` is FALSE, so the old test excluded it
    silently rather than catching it by accident. Same root as tosijs-ui#108: a module ported
    from `.ts` to `.tjs` dropped out of both the doc corpus and this index at once.
    */
    files = fs
      .readdirSync(SRC)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.tjs'))
  } catch {
    return entries
  }
  for (const file of files) {
    const content = fs.readFileSync(path.join(SRC, file), 'utf8')
    const match = content.match(/\/\*#([\s\S]+?)\*\//)
    if (!match) continue
    const markdown = match[1].trim()
    const title = extractTitle(markdown)
    if (!title) continue
    const distFile = file.replace(/\.ts$/, '.js')
    if (!fs.existsSync(path.join(DIST, distFile))) continue
    entries.push({
      title,
      description: docDescription(markdown),
      link: `dist/${distFile}`,
    })
  }
  return entries.sort((a, b) => a.title.localeCompare(b.title))
}

/**
 * Write an `llms.txt` index in the llmstxt.org shape (#3564): an H1 with the project's name, its
 * summary as a blockquote, notes, then H2 sections of `- [title](url): description` lines. Pages
 * are in nav order, and a nav section with pages under it is a section of its own; the
 * top-level pages are `## Docs`. Each link is the page's markdown copy when the site writes
 * them, which is what an agent fetching from the index wants.
 *
 * Pass the extracted `corpus` (the build does) to index every doc by its rendered URL; omit it
 * to fall back to the legacy `src/*.ts`-with-`dist/*.js` scan.
 */
export function generateLlmsTxt(
  outputPath: string,
  meta: LlmsTxtMeta = {},
  corpus?: CorpusDoc[]
): void {
  const pkg = readPackage()
  const entries = corpus
    ? entriesFromCorpus(corpus, meta)
    : entriesFromSrcScan()

  // Only orient agents about the live-example execution model when the corpus
  // actually has live examples (a book / pure-docs site has none).
  // THE shared rule (build-warnings.ts), under the site's policy — this was a regex of its
  // own, which told an opt-in prose site about live examples it does not have.
  const hasLiveExamples =
    !!corpus && liveFenceLanguages(corpus, meta.liveExamples).size > 0
  const liveExampleNote = hasLiveExamples
    ? [
        'Live examples run inline on the shared page by default (not sandboxed):',
        'each has its own `preview` element, but they share one tosijs module, so',
        '`tosi()` state singletons are shared across every example on a page. This is',
        'deliberate (it shows tosi isolation and lets you drive demos via the global',
        'singleton). Namespace example state with unique top-level keys so examples',
        "don't clobber each other; the `iframe` attribute isolates DOM/CSS, not state.",
        '',
      ]
    : []

  const markdownLinks = !!corpus && meta.markdownPages !== false
  const pagesNote = markdownLinks
    ? [
        "Each link below is the page's markdown. Drop `index.md` from it for the HTML page" +
          (hasLiveExamples ? ', where the examples run.' : '.'),
        ...(meta.baseUrl
          ? [`The whole corpus, as one markdown file: ${fullTxtUrl(meta)}`]
          : []),
        '',
      ]
    : []

  const name = meta.name ?? pkg.name ?? ''
  const description = meta.description ?? pkg.description ?? ''
  const links: string[] = []
  if (meta.baseUrl) links.push(`- Docs: ${meta.baseUrl}`)
  if (meta.projectLinks?.github)
    links.push(`- Source: ${meta.projectLinks.github}`)
  const npm =
    meta.projectLinks?.npm ??
    (pkg.name ? `https://www.npmjs.com/package/${pkg.name}` : undefined)
  if (npm) links.push(`- npm: ${npm}`)

  const lines: string[] = [
    `# ${name}`,
    '',
    ...(description ? [`> ${description}`, ''] : []),
    ...(meta.tagline ? [meta.tagline, ''] : []),
    ...(pkg.version ? [`Version ${pkg.version}.`, ''] : []),
    ...(links.length ? [...links, ''] : []),
    ...pagesNote,
    ...liveExampleNote,
  ]

  let section: string | undefined
  for (const entry of entries) {
    const heading = entry.section || 'Docs'
    if (heading !== section) {
      if (section !== undefined) lines.push('')
      section = heading
      lines.push(`## ${heading}`, '')
    }
    const url = (markdownLinks && entry.markdown) || entry.link
    lines.push(
      `- [${linkText(entry.title)}](${url})` +
        (entry.description ? `: ${oneLine(entry.description)}` : '')
    )
  }
  lines.push('')

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`llms.txt generated (${entries.length} entries)`)
}

/**
 * Write `llms-full.txt`: the whole indexed corpus as one markdown file, in nav order (#3564).
 * For a reader that wants everything in one fetch rather than following the index. Each page
 * is its own markdown, under a `# title` when it has none, with its URL after it.
 */
export function generateLlmsFullTxt(
  outputPath: string,
  meta: LlmsTxtMeta,
  corpus: CorpusDoc[]
): void {
  const pkg = readPackage()
  const name = meta.name ?? pkg.name ?? ''
  const description = meta.description ?? pkg.description ?? ''
  const slugMap = buildSlugMap(corpus)
  const base = (meta.baseUrl ?? '').replace(/\/$/, '')
  const parts = [
    `# ${name}` + (description ? `\n\n> ${description}` : '') + '\n',
  ]
  for (const { doc } of inNavOrder(corpus)) {
    const text = stripDocMeta(doc.text ?? '').trim()
    const url =
      base + withBase(meta.basePath, pathForSlug(slugMap[doc.filename]))
    parts.push(
      (/^#\s/m.test(text) ? '' : `# ${doc.title}\n\n`) +
        text +
        `\n\nSource: ${url}\n`
    )
  }
  fs.writeFileSync(outputPath, parts.join('\n---\n\n'), 'utf8')
}

function fullTxtUrl(meta: LlmsTxtMeta): string {
  return (
    (meta.baseUrl ?? '').replace(/\/$/, '') +
    withBase(meta.basePath, '/llms-full.txt')
  )
}

/** package.json's fallbacks; a doc site isn't guaranteed one, so degrade, never abort. */
function readPackage(): {
  name?: string
  version?: string
  description?: string
} {
  try {
    return JSON.parse(fs.readFileSync('package.json', 'utf8'))
  } catch {
    console.warn(
      'llms.txt: no readable package.json — using config values only'
    )
    return {}
  }
}

/** Link text cannot hold an unbalanced bracket. */
function linkText(title: string): string {
  return title.replace(/[[\]]/g, '\\$&')
}

/** One entry is one line. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

// Allow running directly (no corpus — uses the legacy src/*.ts scan)
if (import.meta.main) {
  generateLlmsTxt('dist/llms.txt')
}
