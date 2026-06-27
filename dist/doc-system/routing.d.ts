export interface DocLike {
    filename: string;
}
/**
 * Build a deterministic { filename -> slug } map for a set of docs.
 *
 * Collisions (e.g. `layout.ts` and `layout.css` both -> `layout`) are resolved by
 * falling back to the dotted filename with dots turned into dashes for EVERY member
 * of the colliding group. Computed from counts first, so the result does not depend
 * on array order.
 */
export declare function buildSlugMap(docs: DocLike[]): Record<string, string>;
/** site-root-relative path for a slug: '' -> '/', 'button' -> '/button/' */
export declare function pathForSlug(slug: string): string;
/**
 * Rewrite legacy `?<filename>` (and `/?<filename>`) doc links in an HTML string
 * to resolved hrefs. Used by the static generator so the pre-rendered pages have
 * clean links for no-JS readers, crawlers, and the brief window before the
 * doc-browser hydrates. `hrefFor` returns the target href for a known filename,
 * or null to leave the link untouched (unknown filename / a real query string).
 */
export declare function rewriteDocLinks(html: string, hrefFor: (filename: string) => string | null): string;
/**
 * Map a legacy `?<filename>` query (the old doc-browser's query-param routing,
 * e.g. `?button.ts`, `?README.md`) to the new slug path (`/button/`, `/`).
 *
 * Returns the new path, or null when `search` isn't a bare-filename query or
 * doesn't match a known doc. Uses the slug map so README -> '/' and collision
 * disambiguation (foo.ts + foo.css -> /foo-ts/, /foo-css/) are handled.
 */
export declare function legacyQueryPath(search: string, slugMap: Record<string, string>): string | null;
/** strip a pathname down to its slug: '/button/' -> 'button', '/' -> '' */
export declare function slugForPath(pathname: string): string;
/**
 * Resolve a browser location.pathname to a doc filename, using a slug map.
 * Returns '' if nothing matches (caller falls back to the first/README doc).
 */
export declare function filenameForPath(pathname: string, slugMap: Record<string, string>): string;
/** Turn a human name/title into a slug: 'Form Components' -> 'form-components'. */
export declare function slugify(s: string): string;
/**
 * Resolve a doc's `parent` value (a NAME or a slug) to the parent doc's
 * filename. Tries, in order: exact filename, exact slug (slug->slug no-op),
 * slugify(value) against doc slugs, then slugify(value) against slugify(title).
 * Returns '' if nothing matches (the build then auto-creates a section doc).
 */
export declare function resolveParent(parentValue: string, docs: Array<{
    filename: string;
    title?: string;
}>, slugMap: Record<string, string>): string;
