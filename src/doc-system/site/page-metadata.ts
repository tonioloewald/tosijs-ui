/*
A doc page's description, and the lint of every page's title and description (#3563).

The description is what a search result, a link unfurl and an `llms.txt` reader see instead of
the page. It is ONE rule here, used by the page `<head>`, `llms.txt` and the lint: `llms.txt`
had a second copy that cut at 120 characters and kept the markdown, so the same page described
itself two ways.

The lint reports what an author can fix in the page's metadata block: a title or description
that is missing, repeated, too short to say anything, too long for a search result, or derived
from a first paragraph that had to be cut mid-sentence. Thresholds follow the practice the
review produced (tosijs-coding-practices #3561): descriptions 70–155 characters, a `<title>` of
20–60. It warns by default and fails a `strict` build.

Build-time and pure: no DOM, no Bun.
*/

import { derivedDescription, DESCRIPTION_MAX } from '../render.js'
import { pageTitle } from '../doc-title.js'

/** The fields of a corpus doc the metadata depends on. */
export interface MetadataDoc {
  filename: string
  path?: string
  title: string
  headTitle?: string
  description?: string
  text?: string
  hidden?: boolean
  noindex?: boolean
}

export interface PageDescription {
  text: string
  /** `metadata`: the page's own; `derived`: its first paragraph; `site`: the site default */
  source: 'metadata' | 'derived' | 'site' | 'none'
  /** a derived description that had to be cut mid-sentence */
  cut: boolean
}

/** The page's description: its own, else its first paragraph, else the site's. */
export function pageDescription(
  doc: MetadataDoc,
  siteDescription?: string
): PageDescription {
  const own = doc.description?.trim()
  if (own) return { text: own, source: 'metadata', cut: false }
  const derived = derivedDescription(doc.text ?? '')
  if (derived.text) return { ...derived, source: 'derived' }
  const site = siteDescription?.trim()
  if (site) return { text: site, source: 'site', cut: false }
  return { text: '', source: 'none', cut: false }
}

export const DESCRIPTION_MIN = 70
export const TITLE_MIN = 20
export const TITLE_MAX = 60

export interface MetadataFinding {
  /** what is wrong, worded for a group heading */
  problem: string
  /** the page's source file (or filename), so the author knows where to look */
  page: string
}

/** Lint every indexable page's title and description. Pure; the caller reports. */
export function lintMetadata(
  docs: MetadataDoc[],
  site: { projectName?: string; description?: string } = {}
): MetadataFinding[] {
  const pages = docs.filter((doc) => !doc.hidden && !doc.noindex)
  const findings: MetadataFinding[] = []
  const add = (problem: string, doc: MetadataDoc) =>
    findings.push({ problem, page: doc.path || doc.filename })

  const titles = new Map<string, MetadataDoc[]>()
  const descriptions = new Map<string, MetadataDoc[]>()
  for (const doc of pages) {
    if (!doc.title?.trim() && !doc.headTitle?.trim()) {
      add('no title', doc)
    } else {
      const title = pageTitle(doc, site.projectName)
      const key = title.toLowerCase()
      titles.set(key, [...(titles.get(key) ?? []), doc])
      if (title.length < TITLE_MIN)
        add(
          `title under ${TITLE_MIN} characters (name what a reader searches for; \`headTitle\` sets only the <title>)`,
          doc
        )
      else if (title.length > TITLE_MAX)
        add(`title over ${TITLE_MAX} characters (search results cut it)`, doc)
    }

    const description = pageDescription(doc, site.description)
    if (description.source === 'none' || description.source === 'site') {
      add(
        description.source === 'site'
          ? 'no description of its own (it gets the site description)'
          : 'no description, and no first paragraph to derive one from',
        doc
      )
      continue
    }
    const key = description.text.toLowerCase()
    descriptions.set(key, [...(descriptions.get(key) ?? []), doc])
    if (description.cut)
      add(
        `description derived from a first paragraph that had to be cut at ${DESCRIPTION_MAX} characters`,
        doc
      )
    else if (description.text.length < DESCRIPTION_MIN)
      add(`description under ${DESCRIPTION_MIN} characters`, doc)
    else if (description.text.length > DESCRIPTION_MAX)
      add(
        `description over ${DESCRIPTION_MAX} characters (search results cut it)`,
        doc
      )
  }
  for (const group of titles.values())
    if (group.length > 1)
      for (const doc of group) add('title shared with another page', doc)
  for (const group of descriptions.values())
    if (group.length > 1)
      for (const doc of group) add('description shared with another page', doc)
  return findings
}

/** The findings grouped by problem, one line of pages each; '' when there are none. */
export function metadataReport(
  findings: MetadataFinding[],
  pageCount: number
): string {
  if (!findings.length) return ''
  const groups = new Map<string, string[]>()
  for (const { problem, page } of findings)
    groups.set(problem, [...(groups.get(problem) ?? []), page])
  const flagged = new Set(findings.map((f) => f.page)).size
  const lines = [
    `\n⚠️  Page metadata: ${flagged} of ${pageCount} page(s) need a title or description written.`,
    `    Set \`title\`/\`headTitle\`/\`description\` in each page's metadata block (or noindex it).`,
  ]
  for (const [problem, pages] of groups)
    lines.push(`    ${problem} (${pages.length}):`, `      ${pages.join(', ')}`)
  return lines.join('\n') + '\n'
}
