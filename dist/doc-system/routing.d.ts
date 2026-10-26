export interface DocLike {
    filename: string;
    /** this doc is the site root (`/`) instead of README; see `homeDoc` */
    home?: boolean;
}
/**
 * The doc served at the site root: the one doc marked `home`, or README when none is.
 * Marked by the build from the site's `home` option, or by a doc's own `{"home": true}`.
 * The build refuses a corpus with more than one, so a second mark is ignored here rather
 * than giving two docs the root.
 */
export declare function homeDoc(docs: DocLike[]): string | null;
/**
 * Build a deterministic { filename -> slug } map for a set of docs.
 *
 * Collisions (e.g. `layout.ts` and `layout.css` both -> `layout`) are resolved by
 * falling back to the dotted filename with dots turned into dashes for EVERY member
 * of the colliding group. Computed from counts first, so the result does not depend
 * on array order.
 */
export declare function buildSlugMap(docs: DocLike[]): Record<string, string>;
/**
 * What each `[[target]]` in a corpus can reach: { slugify(target) -> slug }.
 *
 * A page is reached by its slug, and also by its title when no page has that slug and no
 * other page has the same title (GitHub #234). Authors write a page's TITLE —
 * `[[The feature registry]]` — while the page lives at its file name, `/registry/`; before
 * this, every such link went to `/the-feature-registry/` and 404'd without a word. A slug
 * always wins over a title, so no link that already worked changes target.
 */
export declare function wikilinkTargets(docs: Array<DocLike & {
    title?: string;
}>): Map<string, string>;
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
 *
 * `aliases` ({ alias path -> slug }, the site config's `aliases`) are a doc's extra paths: a
 * page's own slug wins, so an alias never takes a path from a page.
 */
export declare function filenameForPath(pathname: string, slugMap: Record<string, string>, aliases?: Record<string, string>): string;
/**
 * Check a site's `aliases` against its slug map, and return the problems in words (empty when
 * there are none). An alias is one lowercase path segment with no dot, takes no page's own
 * path, and names a page.
 *
 * Lowercase because on a case-insensitive filesystem (macOS, Windows) writing `Guide/` replaces
 * `guide/`, and a crawler at `/guide/` then got another page. No dot because every file the
 * build writes at the root has one (`docs.json`, `sitemap.xml`, `llms.txt`).
 */
export declare function aliasProblems(aliases: Record<string, string>, slugMap: Record<string, string>): string[];
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
/**
 * Prefix a root-relative path with the site's `basePath`.
 *
 * THE ONE COPY. There were two identical implementations (`generate-site.ts`, `epub.ts` —
 * the latter's comment said "mirrors generate-site's withBase") and a third consumer,
 * `make-llms-txt.ts`, that had none at all. So `baseUrl` meant the ORIGIN to the page
 * generator and ORIGIN-PLUS-PATH to llms.txt, and on a GitHub project page no configuration
 * satisfied both: matching the canonical URLs doubled the prefix in llms.txt, and matching
 * llms.txt dropped it from every canonical and sitemap entry (tosijs-ui#144).
 *
 * Nothing failed — `basePath` affects metadata only, so the site works and you find it by
 * reading the emitted `<head>`. The reporter's shipped to Pages before they noticed.
 *
 * `baseUrl` is the ORIGIN ONLY. Absolute URLs and an empty/`/` basePath pass through.
 */
export declare function withBase(basePath: string | undefined, p: string): string;
