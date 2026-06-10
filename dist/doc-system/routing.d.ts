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
/** strip a pathname down to its slug: '/button/' -> 'button', '/' -> '' */
export declare function slugForPath(pathname: string): string;
/**
 * Resolve a browser location.pathname to a doc filename, using a slug map.
 * Returns '' if nothing matches (caller falls back to the first/README doc).
 */
export declare function filenameForPath(pathname: string, slugMap: Record<string, string>): string;
