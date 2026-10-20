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
/**
 * The doc served at the site root: the one doc marked `home`, or README when none is.
 * Marked by the build from the site's `home` option, or by a doc's own `{"home": true}`.
 * The build refuses a corpus with more than one, so a second mark is ignored here rather
 * than giving two docs the root.
 */
export function homeDoc(docs) {
    const marked = docs.filter((doc) => doc.home);
    return marked.length === 1 ? marked[0].filename : null;
}
/**
 * filename without its final extension. The home doc maps to '' (the site root); README
 * does too unless another doc is home, and is then `readme`.
 */
function baseSlug(filename, home) {
    if (filename === home)
        return '';
    if (README.test(filename))
        return home == null ? '' : 'readme';
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
    const home = homeDoc(docs);
    const counts = {};
    for (const doc of docs) {
        const base = baseSlug(doc.filename, home);
        counts[base] = (counts[base] || 0) + 1;
    }
    const map = {};
    for (const doc of docs) {
        const base = baseSlug(doc.filename, home);
        // The root ('' base) is unique by construction; never disambiguate it.
        map[doc.filename] =
            base !== '' && counts[base] > 1 ? doc.filename.replace(/\./g, '-') : base;
    }
    return map;
}
/**
 * What each `[[target]]` in a corpus can reach: { slugify(target) -> slug }.
 *
 * A page is reached by its slug, and also by its title when no page has that slug and no
 * other page has the same title (GitHub #234). Authors write a page's TITLE —
 * `[[The feature registry]]` — while the page lives at its file name, `/registry/`; before
 * this, every such link went to `/the-feature-registry/` and 404'd without a word. A slug
 * always wins over a title, so no link that already worked changes target.
 */
export function wikilinkTargets(docs) {
    const slugs = buildSlugMap(docs);
    const targets = new Map();
    for (const doc of docs) {
        const slug = slugs[doc.filename];
        if (slug !== '')
            targets.set(slugify(slug), slug);
    }
    const byTitle = new Map();
    for (const doc of docs) {
        const key = doc.title ? slugify(doc.title) : '';
        if (!key || targets.has(key))
            continue;
        // Two pages with one title: neither is reachable by it, so the link is reported.
        byTitle.set(key, byTitle.has(key) ? null : slugs[doc.filename]);
    }
    for (const [key, slug] of byTitle)
        if (slug !== null)
            targets.set(key, slug);
    return targets;
}
/** site-root-relative path for a slug: '' -> '/', 'button' -> '/button/' */
export function pathForSlug(slug) {
    return slug === '' ? '/' : `/${slug}/`;
}
/**
 * Rewrite legacy `?<filename>` (and `/?<filename>`) doc links in an HTML string
 * to resolved hrefs. Used by the static generator so the pre-rendered pages have
 * clean links for no-JS readers, crawlers, and the brief window before the
 * doc-browser hydrates. `hrefFor` returns the target href for a known filename,
 * or null to leave the link untouched (unknown filename / a real query string).
 */
export function rewriteDocLinks(html, hrefFor) {
    return html.replace(/href="\/?\?([^"&=]+)"/g, (match, query) => {
        const href = hrefFor(decodeURIComponent(query));
        return href === null ? match : `href="${href}"`;
    });
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
    return pathname
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .replace(/\/index\.html$/i, '');
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
/** Turn a human name/title into a slug: 'Form Components' -> 'form-components'. */
export function slugify(s) {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
/**
 * Resolve a doc's `parent` value (a NAME or a slug) to the parent doc's
 * filename. Tries, in order: exact filename, exact slug (slug->slug no-op),
 * slugify(value) against doc slugs, then slugify(value) against slugify(title).
 * Returns '' if nothing matches (the build then auto-creates a section doc).
 */
export function resolveParent(parentValue, docs, slugMap) {
    if (!parentValue)
        return '';
    for (const d of docs)
        if (d.filename === parentValue)
            return d.filename;
    for (const d of docs)
        if (slugMap[d.filename] === parentValue)
            return d.filename;
    const target = slugify(parentValue);
    for (const d of docs)
        if (slugMap[d.filename] === target)
            return d.filename;
    for (const d of docs)
        if (d.title && slugify(d.title) === target)
            return d.filename;
    return '';
}
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
export function withBase(basePath, p) {
    if (!p || !basePath || basePath === '/' || /^(https?:)?\/\//.test(p))
        return p;
    return basePath.replace(/\/$/, '') + (p.startsWith('/') ? p : '/' + p);
}
