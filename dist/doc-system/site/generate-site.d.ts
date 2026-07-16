import type { Doc } from './docs';
import type { ProjectLinks, LinkItem } from '../../doc-browser';
import { type ExampleBakes } from '../render';
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
export declare function generateSite(config: GenerateSiteConfig): Promise<number>;
