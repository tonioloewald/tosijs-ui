/*
Single-sourcing: write a passage once, publish it in several places (#217).

Two directives, both spelled like the doc metadata block and both resolved at EXTRACTION, so
the corpus that reaches the site, the ePub, `llms.txt` and the markdown pages has already been
assembled and no consumer needs to know either exists:

  <!--{ "inset": "install.md#with-bun" }-->        another doc, or one heading's section of it
  <!--{ "only": "book" }--> … <!--{ "end": "only" }-->   text for the site or for books only

Resolving here rather than at render is what makes an inset's live examples and tests run
where they are inset: by the time anything looks for a fence, the fence is in the page.

The directives are found with marked's own lexer, as top-level HTML blocks. Nothing here scans
lines: a directive shown inside a code fence is an illustration, and only the parser the pages
are rendered with knows which is which (see `code-fences.ts` for how that was learned).

Failures are build errors, never warnings. An inset that resolves nowhere, an include cycle and
an unbalanced `only` each leave a page silently missing text, and a book is the medium where
that cannot be corrected after the fact.
*/
import * as fs from 'fs'
import * as path from 'path'
import { marked } from 'marked'
import { buildSlugMap, resolveParent, slugify } from '../routing.js'
import { mayHaveSingleSourceDirective } from '../book-target.js'

export class SingleSourceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SingleSourceError'
  }
}

interface SourceDoc {
  text: string
  filename: string
  path?: string
  title?: string
  /** the text a book binds, when it differs from `text` (the site's) */
  bookText?: string
}

type Directive =
  | { kind: 'inset'; ref: string }
  | { kind: 'only'; targets: string[] }
  | { kind: 'end' }

const DIRECTIVE = /^\s*<!--\s*(\{[\s\S]*\})\s*-->\s*$/

/** The directive a top-level HTML token spells, or null for ordinary HTML. */
function directiveOf(token: any): Directive | null {
  if (token.type !== 'html') return null
  const m = DIRECTIVE.exec(token.raw)
  if (!m) return null
  let data: any
  try {
    data = JSON.parse(m[1])
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  if (typeof data.inset === 'string') return { kind: 'inset', ref: data.inset }
  if (data.only !== undefined) {
    const targets = (Array.isArray(data.only) ? data.only : [data.only]).map(
      (t: unknown) => String(t).trim().toLowerCase()
    )
    return { kind: 'only', targets }
  }
  if (data.end === 'only') return { kind: 'end' }
  return null
}

/*
A directive only works at the top level of a document, on a line of its own.

Inside a list item, a blockquote or the middle of a paragraph it is a different kind of token,
which nothing here visits: an inset there was shipped as a raw comment and an unclosed `only`
was accepted, both on a green build, while the docs promised that a mistake fails. So a
directive found anywhere but the top level is itself the error.
*/
function refuseNested(tokens: any[], where: string): void {
  const refuse = (raw: string): never => {
    throw new SingleSourceError(
      `${where}: ${raw.trim()} is not a directive on its own line at the top level of ` +
        `the document (it is inside a list, quote, table or paragraph, or shares its line).`
    )
  }
  // Every nested token, wherever marked keeps it: `tokens`, list `items`, table cells.
  const walk = (node: any): void => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    if (typeof node.type === 'string' && typeof node.raw === 'string') {
      if (
        directiveOf(node) ||
        (node.type === 'html' && mayHaveSingleSourceDirective(node.raw))
      )
        refuse(node.raw)
    }
    for (const key of ['tokens', 'items', 'header', 'rows']) walk(node[key])
  }
  for (const t of tokens) {
    // Top level: a clean directive is fine; a comment that looks like one but does not
    // parse as one (two on a line, text after it, bad JSON) would otherwise ship as a comment.
    if (
      t.type === 'html' &&
      !directiveOf(t) &&
      mayHaveSingleSourceDirective(t.raw)
    )
      refuse(t.raw)
    for (const key of ['tokens', 'items', 'header', 'rows']) walk(t[key])
  }
}

/** Is this JSON directive single-sourcing rather than doc metadata? */
export function isSingleSourceDirective(json: string): boolean {
  try {
    const data = JSON.parse(json)
    return (
      !!data &&
      typeof data === 'object' &&
      (typeof data.inset === 'string' ||
        data.only !== undefined ||
        data.end === 'only')
    )
  } catch {
    return false
  }
}

const mayHaveDirective = mayHaveSingleSourceDirective

const headingSlug = (token: any): string =>
  slugify(String(token.text ?? '').replace(/`/g, ''))

/*
What an inset contributes: the passage, not its place in some other page's outline.

A whole doc loses its metadata block and its title heading; a section loses its own heading.
The host supplies the heading at the level that fits where the passage now sits, which is the
only place that level can be known.
*/
function bodyOf(text: string, anchor: string | undefined, ref: string): string {
  const tokens = marked.lexer(text) as any[]
  if (!anchor) {
    let seenTitle = false
    let seenMeta = false
    return tokens
      .filter((t) => {
        // The doc's own metadata block: the first JSON comment that is not a directive.
        if (
          !seenMeta &&
          t.type === 'html' &&
          DIRECTIVE.test(t.raw) &&
          !directiveOf(t)
        ) {
          seenMeta = true
          return false
        }
        if (!seenTitle && t.type === 'heading' && t.depth === 1) {
          seenTitle = true
          return false
        }
        return true
      })
      .map((t) => t.raw)
      .join('')
      .trim()
  }
  const want = slugify(anchor)
  const start = tokens.findIndex(
    (t) => t.type === 'heading' && headingSlug(t) === want
  )
  if (start < 0) {
    const have = tokens
      .filter((t) => t.type === 'heading')
      .map((t) => `#${headingSlug(t)}`)
    throw new SingleSourceError(
      `inset "${ref}": no heading "#${anchor}" in that document.\n` +
        `   Headings there: ${have.join(', ') || '(none)'}`
    )
  }
  const depth = tokens[start].depth
  let end = tokens.length
  for (let i = start + 1; i < tokens.length; i++) {
    if (tokens[i].type === 'heading' && tokens[i].depth <= depth) {
      end = i
      break
    }
  }
  return tokens
    .slice(start + 1, end)
    .map((t) => t.raw)
    .join('')
    .trim()
}

export interface ResolveInsetsOptions {
  /**
   * Real paths of the directories a fragment file may be read from: the ones extraction
   * walked. `extractDocs` supplies this. Without it no file inset is read at all.
   */
  fragmentDirs?: ReadonlySet<string>
  /** read a fragment file; injectable so the rule is testable without a filesystem */
  readFile?: (absolutePath: string) => string | undefined
  /** resolve symlinks; injectable for the same reason */
  realPath?: (absolutePath: string) => string
}

/*
Which files a FILE inset may read: fragments, and nothing else.

A fragment is a markdown file whose name starts with `_`, in a directory doc extraction
walked. That is: a file extraction saw and skipped for its underscore.

The first cut read any file under the project root, and the pre-tag review found two things
wrong with that, both in this one branch:

  - It published withheld text. A hidden or draft doc is dropped from the corpus, so a
    reference to it missed the doc lookup and fell through to reading the same file from
    disk, with the `draft: true` that withheld it stripped off as frontmatter.
  - It read anything: `{"inset": "../.env"}` built green with the secrets in the page. The
    source editor is confined to doc sources (#128) precisely so that someone invited to edit
    a page cannot read the files beside it, and a directive in that page went around it.

Requiring the `_` prefix closes both by construction instead of by a list of exclusions. A
`_` file is skipped by extraction, so it is never a page and cannot be a hidden one; and the
name is the author's own statement that the file exists to be included.

Both tests are made on the REAL path. A symlink named `_x.md` is whatever it points at, so
the name that counts is the target's, and the directory that counts is the target's.

The cost, stated: someone who can edit a page can read the `_`-prefixed markdown in the
published directories by insetting it. That is what a fragment is for.
*/
const isFragmentName = (file: string): boolean =>
  file.startsWith('_') && /\.(md|markdown)$/i.test(file)

function fragmentPath(
  abs: string,
  fragmentDirs: ReadonlySet<string> | undefined,
  realPath: (p: string) => string
): string | { refused: string } {
  const notFragment = {
    refused:
      'a file inset must name a fragment: a markdown file whose name starts with "_". ' +
      'A document is inset by its filename, slug or title, and a hidden one cannot be.',
  }
  if (!isFragmentName(path.basename(abs))) return notFragment
  let real: string
  try {
    real = realPath(abs)
  } catch {
    return abs // does not exist: reported by the caller as "no such file"
  }
  if (!isFragmentName(path.basename(real))) return notFragment
  if (!fragmentDirs?.has(path.dirname(real))) {
    return {
      refused:
        'it is not in a directory the docs are extracted from (a directory under ' +
        'docPaths that is not ignored).',
    }
  }
  return real
}

/*
Replace every inset directive in the corpus with the text it names.

A reference is tried as a DOC first (filename, slug or title, the same matcher `parent` uses)
and then as a FILE relative to the including doc's source. The second form is what lets a
fragment exist without being a page: a file whose name starts with `_` is skipped by extraction
and can still be inset.

Mutates `docs` in place and returns how many insets were resolved.
*/
export function resolveInsets(
  docs: SourceDoc[],
  options: ResolveInsetsOptions = {}
): number {
  if (!docs.some((d) => mayHaveDirective(d.text))) return 0
  const realPath = options.realPath ?? ((p: string) => fs.realpathSync(p))
  const readFile =
    options.readFile ??
    ((p: string) => {
      try {
        return fs.statSync(p).isFile() ? fs.readFileSync(p, 'utf8') : undefined
      } catch {
        return undefined
      }
    })
  const slugMap = buildSlugMap(docs)
  const raw = new Map(docs.map((d) => [d.filename, d.text]))
  const byFilename = new Map(docs.map((d) => [d.filename, d]))
  const done = new Map<string, string>()
  let count = 0

  // `id` names a source for cycle reporting; `dir` is what a file inset is relative to.
  const expand = (
    text: string,
    id: string,
    dir: string | undefined,
    stack: string[]
  ): string => {
    if (!mayHaveDirective(text)) return text
    if (stack.includes(id)) {
      throw new SingleSourceError(`inset cycle: ${[...stack, id].join(' → ')}`)
    }
    const tokens = marked.lexer(text) as any[]
    refuseNested(tokens, id)
    if (!tokens.some((t) => directiveOf(t)?.kind === 'inset')) return text
    return tokens
      .map((t) => {
        const d = directiveOf(t)
        if (d?.kind !== 'inset') return t.raw
        count++
        const [target, anchor] = d.ref.split('#') as [string, string?]
        if (!target.trim()) {
          throw new SingleSourceError(
            `inset "${d.ref}" in ${id}: names no document. Write "doc.md#heading".`
          )
        }
        const next = [...stack, id]
        let source: string | undefined
        let sourceId = ''
        let sourceDir: string | undefined
        const docFile = resolveParent(target, docs, slugMap)
        if (docFile) {
          sourceId = docFile
          const doc = byFilename.get(docFile)!
          sourceDir = doc.path ? path.dirname(doc.path) : undefined
          source = raw.get(docFile)
        } else if (target && dir !== undefined) {
          const found = fragmentPath(
            path.resolve(dir, target),
            options.fragmentDirs,
            realPath
          )
          if (typeof found !== 'string') {
            throw new SingleSourceError(
              `inset "${d.ref}" in ${id}: no document has that name, and ${found.refused}`
            )
          }
          sourceId = path.relative(process.cwd(), found)
          sourceDir = path.dirname(found)
          // A fragment is not extracted, so its frontmatter was never stripped for it.
          source = readFile(found)?.replace(
            /^---\r?\n[\s\S]*?\r?\n---\r?\n/,
            ''
          )
        }
        if (source === undefined) {
          throw new SingleSourceError(
            `inset "${d.ref}" in ${id}: no such document or file.\n` +
              `   Tried a doc named "${target}" (filename, slug or title)` +
              (target && dir !== undefined
                ? `, then the fragment file ${path.join(dir, target)}.`
                : '.')
          )
        }
        const expanded = expand(source, sourceId, sourceDir, next)
        return bodyOf(expanded, anchor, d.ref) + '\n\n'
      })
      .join('')
  }

  for (const doc of docs) {
    if (!mayHaveDirective(doc.text)) continue
    const dir = doc.path ? path.dirname(doc.path) : undefined
    done.set(doc.filename, expand(doc.text, doc.filename, dir, []))
  }
  for (const [filename, text] of done) byFilename.get(filename)!.text = text
  return count
}

/** Where conditional text can be aimed. */
const TARGETS = ['site', 'book']

/*
One source, two variants: what the site shows and what a book binds.

`only` blocks do not nest. Nesting has no meaning with two targets (site inside book is
nothing), so a second `only` before an `end` is far more likely a forgotten `end` than an
intention, and it is reported as one.
*/
export function splitConditions(
  text: string,
  where = 'document'
): { site: string; book: string } {
  if (!mayHaveDirective(text)) return { site: text, book: text }
  const tokens = marked.lexer(text) as any[]
  refuseNested(tokens, where)
  if (!tokens.some((t) => directiveOf(t) && directiveOf(t)!.kind !== 'inset'))
    return { site: text, book: text }
  let site = ''
  let book = ''
  let open: string[] | null = null
  for (const t of tokens) {
    const d = directiveOf(t)
    if (d?.kind === 'only') {
      if (open) {
        throw new SingleSourceError(
          `${where}: an "only" block opens inside another. Is an {"end": "only"} missing?`
        )
      }
      const unknown = d.targets.filter((x) => !TARGETS.includes(x))
      if (unknown.length || !d.targets.length) {
        throw new SingleSourceError(
          `${where}: "only" must name ${TARGETS.map((x) => `"${x}"`).join(
            ' or '
          )}, not ${JSON.stringify(unknown.join(', '))}.`
        )
      }
      open = d.targets
      continue
    }
    if (d?.kind === 'end') {
      if (!open) {
        throw new SingleSourceError(
          `${where}: {"end": "only"} with no "only" block open.`
        )
      }
      open = null
      continue
    }
    if (!open || open.includes('site')) site += t.raw
    if (!open || open.includes('book')) book += t.raw
  }
  if (open) {
    throw new SingleSourceError(
      `${where}: an "only" block is never closed with {"end": "only"}.`
    )
  }
  return { site, book }
}

/*
Assemble the corpus: insets first, so a condition inside an inset passage travels with it,
then split each doc. `text` becomes the site's variant and `bookText` is set only where a book
differs, so every consumer that has never heard of conditions keeps reading the right thing and
only the two that bind books (`epub.ts`, `book-html.ts`) need to ask.
*/
export function assembleCorpus(
  docs: SourceDoc[],
  options: ResolveInsetsOptions = {}
): void {
  resolveInsets(docs, options)
  for (const doc of docs) {
    const { site, book } = splitConditions(doc.text, doc.filename)
    doc.text = site
    if (book !== site) doc.bookText = book
    else delete doc.bookText
  }
}
