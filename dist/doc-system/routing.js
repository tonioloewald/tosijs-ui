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
const README = /^readme\.md$/i;
/** filename without its final extension; README.md maps to '' (the site root) */
function baseSlug(filename) {
    if (README.test(filename))
        return '';
    return filename.replace(/\.[^.]+$/, '');
}
/**
 * Build a deterministic { filename -> slug } map for a set of docs.
 *
 * Collisions (e.g. `layout.ts` and `layout.css` both -> `layout`) are resolved by
 * falling back to the dotted filename with dots turned into dashes for EVERY member
 * of the colliding group. Computed from counts first, so the result does not depend
 * on array order.
 */
export function buildSlugMap(docs) {
    const counts = {};
    for (const doc of docs) {
        const base = baseSlug(doc.filename);
        counts[base] = (counts[base] || 0) + 1;
    }
    const map = {};
    for (const doc of docs) {
        const base = baseSlug(doc.filename);
        // README ('' base) is unique by construction; never disambiguate it.
        map[doc.filename] =
            base !== '' && counts[base] > 1
                ? doc.filename.replace(/\./g, '-')
                : base;
    }
    return map;
}
/** site-root-relative path for a slug: '' -> '/', 'button' -> '/button/' */
export function pathForSlug(slug) {
    return slug === '' ? '/' : `/${slug}/`;
}
/**
 * Map a legacy `?<filename>` query (the old doc-browser's query-param routing,
 * e.g. `?button.ts`, `?README.md`) to the new slug path (`/button/`, `/`).
 *
 * Returns the new path, or null when `search` isn't a bare-filename query or
 * doesn't match a known doc. Uses the slug map so README -> '/' and collision
 * disambiguation (foo.ts + foo.css -> /foo-ts/, /foo-css/) are handled.
 */
export function legacyQueryPath(search, slugMap) {
    const query = search.replace(/^\?/, '');
    // Legacy links are a single bare filename — anything with key=value pairs is
    // a real query string, not the old routing.
    if (!query || query.includes('=') || query.includes('&'))
        return null;
    const filename = decodeURIComponent(query);
    const slug = slugMap[filename];
    if (slug === undefined)
        return null;
    return pathForSlug(slug);
}
/** strip a pathname down to its slug: '/button/' -> 'button', '/' -> '' */
export function slugForPath(pathname) {
    return pathname.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/index\.html$/i, '');
}
/**
 * Resolve a browser location.pathname to a doc filename, using a slug map.
 * Returns '' if nothing matches (caller falls back to the first/README doc).
 */
export function filenameForPath(pathname, slugMap) {
    const slug = slugForPath(pathname);
    for (const [filename, docSlug] of Object.entries(slugMap)) {
        if (docSlug === slug)
            return filename;
    }
    return '';
}
