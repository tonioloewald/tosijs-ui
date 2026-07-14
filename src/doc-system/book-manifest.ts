/*
Pure "book manifest" logic: curate a subset of the doc corpus into a book
(ePub / print) WITHOUT touching the live-site navigation. One source, two
outputs.

Everything here is an overlay on the defaults — omit the manifest and you get the
whole visible corpus in normal nav order (the doc system's zero-config behavior).
The manifest never introduces a new ordering mechanism: it selects docs, then
overlays each doc's `order` so the SHARED buildNavTree/flatten (used by the site,
print, and ePub alike) sequences the book. So "front/back matter" are just
regular docs you name in `order` (or position with a per-doc `order`), and pins /
parents keep working exactly as on the site.

No fs, no DOM — a pure function of the docs array, so it's shared + unit-testable.
*/

export interface BookManifest {
  /**
   * Globs selecting which docs are in the book (matched against each doc's
   * `path` AND `filename`, so `chapters/**` or `*.md` both work). Default: every
   * visible doc.
   */
  include?: string[]
  /** Globs removed from the selection, applied after `include`. */
  exclude?: string[]
  /**
   * Explicit reading order, by filename (with or without extension), slug, or
   * title. Listed docs lead in this exact sequence; everything else follows in
   * normal order. Unmatched keys are ignored.
   */
  order?: string[]
  /**
   * Baseline order for docs you neither pinned via metadata nor named in
   * `order`: `'nav'` (default — today's pin / `order` / title sort) or
   * `'filename'` (natural sort, so `01-*.md`, `02-*.md`, … sequence with zero
   * metadata). A per-doc `order` still wins over `'filename'`.
   */
  sort?: 'nav' | 'filename'
}

interface BookDocLike {
  filename: string
  path?: string
  title?: string
  order?: number
}

// glob → RegExp. `**` matches any run including `/`; `*` matches any run except
// `/`; `?` matches a single non-`/`. Everything else is matched literally.
function globToRegExp(glob: string): RegExp {
  let re = ''
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*'
        i += 1
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp('^' + re + '$')
}

function matchesAny(doc: BookDocLike, globs: RegExp[]): boolean {
  return globs.some((re) => re.test(doc.path ?? '') || re.test(doc.filename))
}

const baseName = (filename: string): string => filename.replace(/\.[^.]+$/, '')

/** Does `key` (from an `order` list) name this doc? filename / basename / title. */
function docMatchesKey(doc: BookDocLike, key: string): boolean {
  const k = key.trim().toLowerCase()
  return (
    doc.filename.toLowerCase() === k ||
    baseName(doc.filename).toLowerCase() === k ||
    (doc.title ?? '').toLowerCase() === k
  )
}

/**
 * Apply a book manifest to the (already visible) corpus. Returns a NEW array of
 * shallow-copied docs with `order` overlaid for book sequencing. Pure — never
 * mutates the input, so the caller's site-nav copy is untouched.
 */
export function selectBookDocs<T extends BookDocLike>(
  docs: T[],
  manifest?: BookManifest
): T[] {
  if (!manifest) return docs.slice()

  // 1) select ────────────────────────────────────────────────────────────────
  let selected = docs.slice()
  if (manifest.include && manifest.include.length) {
    const inc = manifest.include.map(globToRegExp)
    selected = selected.filter((d) => matchesAny(d, inc))
  }
  if (manifest.exclude && manifest.exclude.length) {
    const exc = manifest.exclude.map(globToRegExp)
    selected = selected.filter((d) => !matchesAny(d, exc))
  }

  const copies = selected.map((d) => ({ ...d }))

  // 2) baseline order overlay ─────────────────────────────────────────────────
  // 'filename' fills only docs with no explicit `order`, so metadata still wins.
  if (manifest.sort === 'filename') {
    const natural = copies.slice().sort((a, b) =>
      (a.path ?? a.filename).localeCompare(b.path ?? b.filename, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    )
    natural.forEach((d, i) => {
      if (d.order === undefined) d.order = i * 10
    })
  }

  // 3) explicit `order` list leads, in the given sequence ─────────────────────
  // Large-negative orders keep listed docs ahead of everything else while
  // preserving their relative order; pins/parents still apply (navSortKey).
  if (manifest.order && manifest.order.length) {
    manifest.order.forEach((key, i) => {
      for (const d of copies) {
        if (docMatchesKey(d, key)) d.order = -1_000_000 + i
      }
    })
  }

  return copies
}
