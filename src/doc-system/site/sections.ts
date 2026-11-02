/*
Section docs + TOC writeback (build-time only; uses fs).

A doc's `parent` groups it into a nav section. `ensureSections`:
  1. auto-creates a real .md file for any referenced parent that doesn't exist
     yet (so authors can later add intro prose + metadata like pin/order),
  2. fills the `<!-- toc -->…<!-- /toc -->` block of every .md parent IN THE CORPUS
     (docsJsonPath) so its body lists its children.

The toc is build output: it is written into the extracted corpus, never back into the
parent's source file. Writing it into source dirtied a tracked file on every build (#3733),
and the shared rule is that build steps never write tracked source. A parent with no block
gets one appended. TOC links are root-relative (basePath-agnostic).

Step 1 does write source, deliberately: a stub is a new file for the author to fill in, and
it is created once, never on a watch rebuild.
*/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import * as path from 'path'
import {
  buildSlugMap,
  pathForSlug,
  slugify,
  resolveParent,
} from '../routing.js'
import { pinnedSort } from '../nav-tree.js'
import type { Doc } from './docs.js'

const TOC_RE = /<!-- toc -->[\s\S]*?<!-- \/toc -->/

export interface EnsureSectionsOptions {
  /** path to the generated corpus (e.g. demo/docs.json) */
  docsJsonPath: string
  /** directory for auto-created section docs (e.g. src/docs) */
  sectionsDir: string
  /** re-run doc extraction so docsJsonPath reflects on-disk changes */
  reExtract: () => void
  /**
   * The site's `docPaths`. A stub outside all of them would never be read back, so none is
   * written there (#3584).
   */
  docPaths?: string[]
  /**
   * Whether this build may create stubs. A watch rebuild may not: a parent that is missing for
   * a second, mid-rename, is not a missing parent (#3584). Default true.
   */
  createStubs?: boolean
  /** where warnings and the list of created files go (default console.warn) */
  log?: (message: string) => void
}

/** True when `dir` is one of `docPaths`, or inside one. */
export function insideDocPaths(dir: string, docPaths: string[]): boolean {
  const target = path.resolve(dir)
  return docPaths.some((p) => {
    const root = path.resolve(p)
    return target === root || target.startsWith(root + path.sep)
  })
}

function readDocs(p: string): Doc[] {
  return JSON.parse(readFileSync(p, 'utf8'))
}

export function ensureSections(opts: EnsureSectionsOptions): void {
  const { docsJsonPath, sectionsDir, reExtract } = opts
  const log = opts.log ?? ((message: string) => console.warn(message))
  let docs = readDocs(docsJsonPath)
  let slugMap = buildSlugMap(docs)

  // 1. Auto-create a stub .md for any referenced-but-missing parent.
  const missing = [
    ...new Set(docs.map((d) => d.parent).filter(Boolean) as string[]),
  ].filter(
    (ref) =>
      !resolveParent(ref, docs, slugMap) &&
      !existsSync(path.join(sectionsDir, slugify(ref) + '.md'))
  )
  const readable = !opts.docPaths || insideDocPaths(sectionsDir, opts.docPaths)
  const created: string[] = []
  if (missing.length && opts.createStubs === false) {
    // Said, not written: the next full build creates them if they are still missing.
  } else if (missing.length && !readable) {
    log(
      `⚠️  ${
        missing.length
      } page(s) name a parent that does not exist (${missing
        .map((ref) => `"${ref}"`)
        .join(', ')}). No section doc was created for ${
        missing.length === 1 ? 'it' : 'them'
      }: sectionsDir "${sectionsDir}" is outside every docPath, so the build would never read ` +
        `it back. Set sectionsDir to a folder inside docPaths, or fix the parent names.`
    )
  } else {
    for (const ref of missing) {
      const file = path.join(sectionsDir, slugify(ref) + '.md')
      mkdirSync(sectionsDir, { recursive: true })
      // Heading first so the doc title is clean; empty TOC block filled below.
      writeFileSync(file, `# ${ref}\n\n<!-- toc -->\n<!-- /toc -->\n`, 'utf8')
      created.push(file)
    }
  }
  if (created.length) {
    log(
      `📄 created ${
        created.length
      } section doc(s) for parents that had none: ${created.join(', ')}`
    )
    reExtract()
    docs = readDocs(docsJsonPath)
    slugMap = buildSlugMap(docs)
  }

  // 2. Fill the TOC block of every .md parent, in the corpus only (#3733).
  const childrenOf = new Map<string, Doc[]>()
  for (const doc of docs) {
    const pf = doc.parent ? resolveParent(doc.parent, docs, slugMap) : ''
    if (!pf) continue
    let arr = childrenOf.get(pf)
    if (!arr) {
      arr = []
      childrenOf.set(pf, arr)
    }
    arr.push(doc)
  }

  let changed = false
  for (const [parentFilename, kids] of childrenOf) {
    const parent = docs.find((d) => d.filename === parentFilename)
    // Only .md parents get an auto-TOC in their body (a .ts parent is code).
    if (!parent || !parent.path.endsWith('.md')) continue

    kids.sort(pinnedSort)
    const list = kids
      .map((k) => `- [${k.title}](${pathForSlug(slugMap[k.filename])})`)
      .join('\n')
    const block = `<!-- toc -->\n${list}\n<!-- /toc -->`

    const fill = (text: string): string =>
      TOC_RE.test(text)
        ? text.replace(TOC_RE, () => block)
        : text.replace(/\s*$/, '') + '\n\n' + block + '\n'
    // A page with a book variant (single-source.ts) carries its own copy of the body.
    for (const key of ['text', 'bookText'] as const) {
      const current = parent[key]
      if (typeof current !== 'string') continue
      const updated = fill(current)
      if (updated !== current) {
        parent[key] = updated
        changed = true
      }
    }
  }
  if (changed) writeFileSync(docsJsonPath, JSON.stringify(docs, null, 2))
}
