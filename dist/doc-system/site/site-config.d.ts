import type { ProjectLinks, LinkItem } from '../../doc-browser';
import type { DocSystemTheme } from '../doc-system-styles';
export type SiteHost = 'github-pages' | 'firebase' | 'static';
export interface SiteConfig {
    /** project / brand name — header, <title> suffix, og:site_name */
    name: string;
    /** one-line site description — home-page meta + structured data */
    description?: string;
    /** absolute site origin for canonical/og URLs, e.g. https://ui.tosijs.net */
    baseUrl?: string;
    /** <html lang>, default 'en' */
    lang?: string;
    /** favicon href, default /favicon.svg */
    favicon?: string;
    /** default social/share image (og:image); per-page overridable via doc metadata */
    ogImage?: string;
    /** extra raw lines injected into every <head> (analytics, verification, etc.) */
    headExtra?: string;
    /** logo + view-source links (createDocBrowser projectLinks) */
    projectLinks?: ProjectLinks;
    /** header-bar icon links */
    navbarLinks?: LinkItem[];
    /** base theme colors — most of the palette is derived from `accent` */
    theme?: DocSystemTheme;
    /** translation table (TSV) powering the settings menu's language picker */
    localizedStrings?: string;
    /**
     * doc-extraction source paths (dirs scanned for tosijs doc-comment blocks,
     * plus `.md` files). Default ['src', 'README.md']. Include root markdown
     * files explicitly, e.g. ['src', 'README.md', 'Building-Apps.md'].
     */
    docPaths?: string[];
    /**
     * Directory where the build writes auto-created section ("parent") docs and
     * regenerates their `<!-- toc -->` blocks. Committed source (like
     * src/version.ts) so authors can add intro prose + metadata. Default
     * 'src/docs'. Must sit inside a scanned docPath so the section docs are
     * extracted into the corpus.
     */
    sectionsDir?: string;
    /**
     * Path to YOUR bundle entrypoint. If set, the build bundles it (IIFE) and
     * pages load it. Your entry should import what your pages/live-examples need
     * from tosijs / tosijs-ui / your own lib, so custom elements register AND
     * inline `js`/`test` examples can resolve those imports.
     * If omitted, pages fall back to `scriptUrl` (tosijs-ui's published iife.js).
     */
    bundleEntry?: string;
    /** modules to leave external in the bundle, e.g. ['jolt-physics'] */
    bundleExternals?: string[];
    /**
     * URL of the JS bundle pages load. Default '/iife.js'. Used as the fallback
     * when `bundleEntry` is omitted (point it at a prebuilt/CDN bundle), and as
     * the output name when `bundleEntry` is set.
     */
    scriptUrl?: string;
    /**
     * directories whose contents are copied into the web root (favicon, images,
     * fonts, wasm, models…). Default ['demo/static'] if present, else ['static'].
     */
    staticDirs?: string[];
    /** hosting preset; controls which host files are emitted. Default 'static'. */
    host?: SiteHost;
    /**
     * custom domain. When host==='github-pages', a CNAME file is written with
     * this value. Derived from `baseUrl`'s hostname when omitted; set explicitly
     * to override (e.g. apex vs www, or a domain differing from the canonical
     * origin). A custom domain serves from root, so it implies basePath '/'.
     */
    domain?: string;
    /**
     * URL prefix the site is served under, default '/'. Set to '/<repo>' for a
     * GitHub project page without a custom domain; every absolute URL the
     * generator emits (links, canonical, sitemap, scriptUrl, stylesUrl) is
     * rewritten under it.
     */
    basePath?: string;
    /**
     * Project-specific codegen run first, before doc extraction and the build
     * (e.g. stamp a version file, regenerate icon data). Runs before the dist
     * dir is reset, so don't emit into dist here — use it for src/ codegen.
     */
    prebuild?: () => void | Promise<void>;
    /**
     * Also build the library: `tsc --declaration --outDir dist` (ESM + types).
     * Default false. Repos whose single build publishes BOTH an npm package and
     * its doc site (the tosijs-* libs) set this true; a pure docs site omits it.
     */
    emitLibrary?: boolean;
    /** emit llms.txt agent-discoverability index. Default true. */
    llmsTxt?: boolean;
    /** served web-root output dir, default 'docs' */
    outputDir?: string;
    /** dev-server port, default 8787 */
    port?: number;
    /** extra dev-server watch paths (added to docPaths + bundleEntry dir). */
    watchPaths?: string[];
}
/** Identity helper that gives a site config module full type-checking + IDE help. */
export declare function defineSiteConfig(config: SiteConfig): SiteConfig;
