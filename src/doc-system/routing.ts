/*
Shared slug / URL helpers for the static doc system.

These are used in BOTH places that must agree on URLs:
- the build-time generator (bin/) which emits one /slug/index.html per doc
- the runtime <tosi-doc-system> component which resolves location.pathname -> doc
  and builds nav hrefs.

Because the generator and the component both operate on the same docs.json, every
function here is a pure, order-independent function of the docs array, so the two
sides always produce identical slugs.
*/

export interface DocLike {
  filename: string
}

const README = /^readme\.md$/i

/** filename without its final extension; README.md maps to '' (the site root) */
function baseSlug(filename: string): string {
  if (README.test(filename)) return ''
  return filename.replace(/\.[^.]+$/, '')
}

/**
 * Build a deterministic { filename -> slug } map for a set of docs.
 *
 * Collisions (e.g. `layout.ts` and `layout.css` both -> `layout`) are resolved by
 * falling back to the dotted filename with dots turned into dashes for EVERY member
 * of the colliding group. Computed from counts first, so the result does not depend
 * on array order.
 */
export function buildSlugMap(docs: DocLike[]): Record<string, string> {
  const counts: Record<string, number> = {}
  for (const doc of docs) {
    const base = baseSlug(doc.filename)
    counts[base] = (counts[base] || 0) + 1
  }
  const map: Record<string, string> = {}
  for (const doc of docs) {
    const base = baseSlug(doc.filename)
    // README ('' base) is unique by construction; never disambiguate it.
    map[doc.filename] =
      base !== '' && counts[base] > 1
        ? doc.filename.replace(/\./g, '-')
        : base
  }
  return map
}

/** site-root-relative path for a slug: '' -> '/', 'button' -> '/button/' */
export function pathForSlug(slug: string): string {
  return slug === '' ? '/' : `/${slug}/`
}

/** strip a pathname down to its slug: '/button/' -> 'button', '/' -> '' */
export function slugForPath(pathname: string): string {
  return pathname.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/index\.html$/i, '')
}

/**
 * Resolve a browser location.pathname to a doc filename, using a slug map.
 * Returns '' if nothing matches (caller falls back to the first/README doc).
 */
export function filenameForPath(
  pathname: string,
  slugMap: Record<string, string>
): string {
  const slug = slugForPath(pathname)
  for (const [filename, docSlug] of Object.entries(slugMap)) {
    if (docSlug === slug) return filename
  }
  return ''
}
