import type { Doc } from './docs.js';
import type { ProjectLinks, LinkItem } from '../../doc-browser.js';
import { type ExampleBakes } from '../render.js';
declare global {
    var Bun: any;
}
export interface GenerateSiteConfig {
    docs: Doc[];
    /**
     * Mirrors `SiteConfig.liveExamples`. The static highlighter needs it so it skips the
     * fences that will become live examples — a highlighted block hands the example markup
     * where it expected source. See `doc-system/example-policy.ts`.
     */
    liveExamples?: 'auto' | 'opt-in';
    /** directory to write pages into (the served web root, e.g. ./docs) */
    outputDir: string;
    projectName?: string;
    /** URL of the book cover image, when the build makes one — Print's first page */
    bookCover?: string;
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
     * Cache-busting stamp appended as `?v=` to the CLASSIC assets: the IIFE `<script>` and the
     * stylesheet. Stable filenames go stale — a CDN or browser cache can serve yesterday's bundle
     * against today's HTML — and a query fixes that while keeping those filenames stable.
     *
     * **Never applied to the ESM entry** (`hydrateUrl`). That entry is `hydrate-<hash>.js`,
     * cache-busted by its filename, and it MUST be loaded with no query: code-split chunks import
     * it back by its bare name, so a `?v=` made the browser create a second module instance of
     * the entry on every page (#191 — everything ran twice, and Babylon's prototype patch threw).
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
    /**
     * Write each page's markdown beside its HTML (`/slug/index.md`) and point at it with
     * `<link rel="alternate" type="text/markdown">`. Default true. For readers that want the
     * text and not the page: an LLM's URL fetcher, a script, `curl`. `noindex` pages get
     * neither, the same rule the sitemap applies.
     */
    markdownPages?: boolean;
    /** URL of the burned-in theme stylesheet (written by ./generate-css.ts) */
    stylesUrl?: string;
    /** extra lines injected into every <head> (favicon, analytics, etc.) */
    headExtra?: string;
}
/**
 * Prefix a root-relative path with basePath. No-op for '/', empty, protocol-
 * relative (`//…`), or absolute (`https://…`) URLs.
 *
 * Used ONLY for *metadata* URLs now (canonical, og:url, og:image, sitemap) — they
 * legitimately need the real absolute origin+path. *Functional* URLs go through
 * `relativeUrl` instead, so the artifact is mount-agnostic. See `relativeUrl`.
 */
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
