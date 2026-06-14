import type { Doc } from './docs';
import type { ProjectLinks, LinkItem } from '../../doc-browser';
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
    /** path to the IIFE bundle script (default /iife.js) */
    scriptUrl?: string;
    /** URL of the burned-in theme stylesheet (written by bin/generate-css.ts) */
    stylesUrl?: string;
    /** extra lines injected into every <head> (favicon, analytics, etc.) */
    headExtra?: string;
}
export declare function generateSite(config: GenerateSiteConfig): Promise<number>;
