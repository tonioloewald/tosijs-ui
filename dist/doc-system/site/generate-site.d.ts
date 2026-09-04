import type { Doc } from './docs.js';
import type { ProjectLinks, LinkItem } from '../../doc-browser.js';
import { type ExampleBakes } from '../render.js';
declare global {
    var Bun: any;
}
export interface GenerateSiteConfig {
    docs: Doc[];
    /** directory to write pages into (the served web root, e.g. ./docs) */
    outputDir: string;
    projectName?: string;
    /** site-level description, used as a fallback when a doc has none */
    description?: string;
    /** <html lang>, default 'en' */
    lang?: string;
    /** favicon href, default /favicon.svg */
    favicon?: string;
    /** default og:image (per-page overridable via doc metadata) */
    ogImage?: string;
    projectLinks?: ProjectLinks;
    /** brand mark left of the title: icon name, image URL, or inline <svg> */
    logo?: string;
    /** header-bar links (rendered as real <a> for no-JS, upgraded on hydration) */
    navbarLinks?: LinkItem[];
    /** translation table (TSV) for the settings menu's language picker */
    localizedStrings?: string;
    /** URL the localization table is written to / loaded from (default /localized-strings.txt) */
    localizedUrl?: string;
    /** absolute site origin for canonical/og URLs, e.g. https://ui.tosijs.net */
    baseUrl?: string;
    /**
     * URL prefix the site is served under, default '/'. Set to '/<repo>' for a
     * GitHub project page without a custom domain; every root-relative URL the
     * generator emits is rewritten under it.
     */
    basePath?: string;
    /** URL the component fetches the corpus from (default /docs.json) */
    docsUrl?: string;
    /** path to the IIFE bundle script (default /iife.js) — the CDN/classic-script path */
    scriptUrl?: string;
    /**
     * Cache-busting stamp appended to generated asset URLs as `?v=`.
     *
     * Stable filenames go stale: a CDN or browser cache can serve yesterday's `hydrate.js`
     * against today's HTML, and the site then looks broken in a way that reproduces nowhere
     * else — the fix being a hard reload nobody thinks to try. Content-hashed FILENAMES would
     * also solve it, and are the wrong trade here: `docs/` is committed in this repo and its
     * siblings, so hashing would add and delete a file on every build and put churn in every
     * diff. A query keeps the filenames stable.
     *
     * Must be DETERMINISTIC per commit, not per build, for the same reason — see build-stamp.ts.
     * Left unset, nothing is appended and the output is exactly as before.
     */
    assetStamp?: string;
    /** cache-buster for `docs.json`, keyed to the corpus itself (see orchestrator) */
    docsStamp?: string;
    /**
     * path to an ESM hydration bundle. When set, pages load THIS as a
     * `<script type="module">` instead of the classic IIFE `scriptUrl`, so
     * code-split chunks (the CodeMirror editor) load lazily instead of on every page.
     */
    hydrateUrl?: string;
    /**
     * Build-time transpiled JS for `tjs` examples, per doc filename (each keyed by
     * source text). The renderer embeds a doc's bakes as hidden
     * `<script type="application/tosi-transpiled">` siblings (pre-rendered page runs
     * without the tjs transpiler), and they're attached to each Doc in the emitted
     * docs.json so client-side SPA navigation gets them too. See
     * self-contained-examples-plan.md.
     */
    bakes?: Map<string, ExampleBakes>;
    /** URL of the burned-in theme stylesheet (written by ./generate-css.ts) */
    stylesUrl?: string;
    /** extra lines injected into every <head> (favicon, analytics, etc.) */
    headExtra?: string;
}
/**
 * Depth of a page below the site root: 0 for the root index (served at the mount
 * root), 1 for every `/slug/` page. The generator only ever emits a flat `/slug/`
 * tree (see `pathForSlug`), so a non-root page is always exactly one directory deep.
 */
export declare function pageDepth(slug: string): number;
/**
 * Rewrite a root-relative *functional* URL (asset ref, nav / content link) to be
 * relative to a page at `depth`, so ONE build works at ANY mount point — a GitHub
 * project page under `/repo`, a custom-domain root, or a moved mount — with no
 * `basePath` rebuild. Relative URLs resolve against wherever the page is actually
 * served, so `basePath` is deliberately NOT applied here: a page at `/repo/x/`
 * gets `../styles.css` → `/repo/styles.css`, the same page at `/x/` gets it at
 * `/styles.css`. External (`https://…`, `//…`) and already-relative refs pass
 * through untouched. (Metadata URLs still use `withBase` — they need the absolute
 * origin.) See issue #25; the runtime/SPA-navigation half is issue #16.
 */
export declare function relativeUrl(depth: number, p: string): string;
export declare function withStamp(url: string, stamp?: string): string;
export declare function generateSite(config: GenerateSiteConfig): Promise<number>;
