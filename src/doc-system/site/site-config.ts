/*
Build configuration for the static doc-system site.

A project drops a `tosijs-site.config.ts` at its root that does
`export default defineSiteConfig({ ... })`; the build (bin/dev.ts) imports it and
feeds it to the generator. This is the single place a consuming repo (tosijs-ui,
tosijs-3d, ...) configures branding, links, theme, SEO defaults, and build paths —
the seam that makes the build system reusable.

Imports here are type-only so this module stays free of runtime/DOM dependencies
(it is loaded by the build, which has no DOM).
*/

import type { ProjectLinks, LinkItem } from '../../doc-browser'
import type { DocSystemTheme } from '../doc-system-styles'
import type { Doc } from './docs'
import type { BookManifest } from '../book-manifest'

export type SiteHost = 'github-pages' | 'firebase' | 'static'

/** Resolved paths handed to a `libraryBuild` override (see SiteConfig). */
export interface LibraryBuildContext {
  /** absolute path to the `dist` output dir the artifacts must land in */
  dist: string
  /** project root the build runs from */
  root: string
  /** the configured `libraryTsconfig`, if any (so the override can still run tsc) */
  tsconfig?: string
}

export interface SiteConfig {
  // ── Identity & SEO ────────────────────────────────────────────────────────
  /** project / brand name — header, <title> suffix, og:site_name */
  name: string
  /** one-line site description — home-page meta + structured data */
  description?: string
  /** absolute site origin for canonical/og URLs, e.g. https://ui.tosijs.net */
  baseUrl?: string
  /** <html lang>, default 'en' */
  lang?: string
  /** favicon href, default /favicon.svg */
  favicon?: string
  /** default social/share image (og:image); per-page overridable via doc metadata */
  ogImage?: string
  /** extra raw lines injected into every <head> (analytics, verification, etc.) */
  headExtra?: string

  // ── Branding & chrome ─────────────────────────────────────────────────────
  /** logo + view-source links (createDocBrowser projectLinks) */
  projectLinks?: ProjectLinks
  /** header-bar icon links */
  navbarLinks?: LinkItem[]
  /** base theme colors — most of the palette is derived from `accent` */
  theme?: DocSystemTheme
  /** translation table (TSV) powering the settings menu's language picker */
  localizedStrings?: string

  // ── Doc sources ───────────────────────────────────────────────────────────
  /**
   * doc-extraction source paths (dirs scanned for tosijs doc-comment blocks,
   * plus `.md` files). Default ['src', 'README.md']. Include root markdown
   * files explicitly, e.g. ['src', 'README.md', 'Building-Apps.md'].
   */
  docPaths?: string[]
  /**
   * Directory where the build writes auto-created section ("parent") docs and
   * regenerates their `<!-- toc -->` blocks. Committed source (like
   * src/version.ts) so authors can add intro prose + metadata. Default
   * 'src/docs'. Must sit inside a scanned docPath so the section docs are
   * extracted into the corpus.
   */
  sectionsDir?: string
  /**
   * Path to the intermediate doc corpus the build extracts to and re-reads
   * during a build. Default 'demo/docs.json'. Its directory is created if
   * missing, so a project without a demo/ folder still builds.
   */
  docsJson?: string

  // ── Bundle (the JS that hydrates the static pages) ────────────────────────
  /**
   * Path to YOUR bundle entrypoint. If set, the build bundles it (IIFE) and
   * pages load it. Your entry should import what your pages/live-examples need
   * from tosijs / tosijs-ui / your own lib, so custom elements register AND
   * inline `js`/`test` examples can resolve those imports.
   * If omitted, pages fall back to `scriptUrl` (tosijs-ui's published iife.js).
   */
  bundleEntry?: string
  /** modules to leave external in the bundle, e.g. ['jolt-physics'] */
  bundleExternals?: string[]
  /**
   * URL of the JS bundle pages load. Default '/iife.js'. Used as the fallback
   * when `bundleEntry` is omitted (point it at a prebuilt/CDN bundle), and as
   * the output name when `bundleEntry` is set.
   */
  scriptUrl?: string

  // ── Static assets ─────────────────────────────────────────────────────────
  /**
   * directories whose contents are copied into the web root (favicon, images,
   * fonts, wasm, models…). Default ['demo/static'] if present, else ['static'].
   */
  staticDirs?: string[]

  // ── Hosting ───────────────────────────────────────────────────────────────
  /** hosting preset; controls which host files are emitted. Default 'static'. */
  host?: SiteHost
  /**
   * custom domain. When host==='github-pages', a CNAME file is written with
   * this value. Derived from `baseUrl`'s hostname when omitted; set explicitly
   * to override (e.g. apex vs www, or a domain differing from the canonical
   * origin). A custom domain serves from root, so it implies basePath '/'.
   */
  domain?: string
  /**
   * URL prefix the site is served under, default '/'. Set to '/<repo>' for a
   * GitHub project page without a custom domain; every absolute URL the
   * generator emits (links, canonical, sitemap, scriptUrl, stylesUrl) is
   * rewritten under it.
   */
  basePath?: string

  // ── Build toggles & dev server ────────────────────────────────────────────
  /**
   * Project-specific codegen run first, before doc extraction and the build
   * (e.g. stamp a version file, regenerate icon data). Runs before the dist
   * dir is reset, so don't emit into dist here — use it for src/ codegen.
   */
  prebuild?: () => void | Promise<void>
  /**
   * Also build the library: `tsc --declaration --incremental --outDir dist`
   * (ESM + types). Default false. Repos whose single build publishes BOTH an
   * npm package and its doc site (the tosijs-* libs) set this true; a pure docs
   * site omits it. Ignored when `libraryTsconfig` is set.
   */
  emitLibrary?: boolean
  /**
   * Path to a tsconfig for the library build, run as `tsc -p <path>` instead of
   * the fixed `emitLibrary` command. Use this when the root tsconfig has
   * `noEmit: true`, or to control `removeComments`/`outDir`/`declaration`
   * yourself (e.g. keep doc comments in the published JS for AI readers).
   */
  libraryTsconfig?: string
  /**
   * Fully override the library build (the `tsc` step that `libraryTsconfig` /
   * `emitLibrary` run). Receives the resolved paths and is responsible for emitting
   * `dist/*.js` + `*.d.ts` for ALL sources. Use this when some sources aren't `.ts`
   * — e.g. native tjs-lang `.tjs` modules, which `tsc` can't compile: run `tsc` for
   * the `.ts` graph and `tjs convert` + `generateDTS` for the `.tjs` files, into the
   * same `dist`. Takes precedence over `libraryTsconfig` and `emitLibrary`. Pairs
   * with `generateCssPreload` (below) for the CSS-extraction eval. See
   * BUILD-TJS-HOOK.md.
   */
  libraryBuild?: (ctx: LibraryBuildContext) => void | Promise<void>
  /**
   * A module to `--preload` into the CSS-extraction subprocess (`generate-css`),
   * which imports your library to burn the theme stylesheet. Needed when that import
   * graph reaches non-`.ts` sources (e.g. `.tjs`) that require a Bun loader plugin
   * to evaluate — point this at a module that registers it (via `Bun.plugin({...})`
   * at import time). Without it the subprocess throws `Cannot find module './x.tjs'`.
   */
  generateCssPreload?: string
  /**
   * Emit llms.txt agent-discoverability index. Default true (uses `name` /
   * `description` / `baseUrl` / `projectLinks`). Set false to skip, or pass a
   * function for a fully custom index — it receives the doc corpus and returns
   * the file contents.
   */
  llmsTxt?: boolean | ((docs: Doc[]) => string)
  /**
   * Emit an ePub of the whole doc site into the output dir on every build (so it
   * stays in sync with the corpus and is served alongside the static pages, e.g.
   * for a "Download ePub" link). `true` uses defaults; pass options to customize.
   * Default false. Requires `happy-dom` (dev dep) + the `zip` CLI.
   */
  epub?:
    | boolean
    | {
        author?: string
        title?: string
        css?: string
        /** cover image path; omit to generate one from the title + a glyph */
        cover?: string
        /**
         * SVG glyph embedded into the generated cover (in place of the favicon).
         * Root-relative served path or a repo path; must be flat, self-contained
         * SVG with concrete colors (resvg rasterizes plain SVG). Ignored when
         * `cover` is set.
         */
        coverIcon?: string
        /** background color for the generated cover, default '#1f2933' */
        coverColor?: string
      }
  /**
   * Curate the book artifact (ePub, and later print) as a subset / reordering of
   * the corpus, WITHOUT changing the live-site nav — one source, two outputs.
   * Omit it and the book is the whole visible corpus in normal nav order (the
   * zero-config default). Book identity (title / author / cover) comes from
   * `epub`; this only selects and sequences. Every field is an overlay on the
   * defaults (see BookManifest): `include`/`exclude` globs pick docs, `order`
   * lists the lead sequence (front/back matter are just docs you name), and
   * `sort: 'filename'` gives a folder of chapters natural order with no metadata.
   */
  book?: BookManifest

  /**
   * Fail the build when a live example can't transpile — a real syntax/import
   * error, or illustrative code mistakenly tagged with an executable language
   * (`js`/`ts`/`tjs`/`test`) instead of the display-only `typescript`. Catches it
   * at build time, on every page, instead of only when someone opens that page.
   * Default true; assumes the default `tosijs` / `tosijs-ui` example context —
   * set false if your examples import from a custom `context` the check can't see.
   */
  checkExamples?: boolean

  /** served web-root output dir, default 'docs' */
  outputDir?: string
  /** dev-server port, default 8787 */
  port?: number
  /** extra dev-server watch paths (added to docPaths + bundleEntry dir). */
  watchPaths?: string[]
  /**
   * RSS ceiling (MB) for the dev server, default 4096. A watch process lives for
   * days across thousands of rebuilds, so anything the build strands per rebuild
   * compounds until the machine swaps itself to death. Past this, the server
   * prints the growth-per-rebuild and exits rather than take the machine with it.
   * Overridden by the DEV_MEMORY_LIMIT_MB env var. Raise it if a genuinely large
   * build needs the headroom — but sustained growth per rebuild is a leak, not a
   * ceiling that's too low.
   */
  memoryLimitMb?: number
  /**
   * Hours of idleness (no request served, no rebuild) after which the dev server
   * exits, default 8. Zero or negative disables it. Overridden by the
   * DEV_IDLE_TIMEOUT_HOURS env var.
   *
   * The memory ceiling above bounds how bad ONE server gets; this bounds how many
   * there are. A dev server is trivially forgotten — the failure that motivated
   * both guards was three servers left running for days, still executing the code
   * they loaded at launch (updating the package does nothing for a process that is
   * already running). An idle server has no value to trade against that, so it goes.
   */
  idleTimeoutHours?: number
  /**
   * Enable the dev-server source read/write endpoints (`/__docstore/source`) that
   * back in-browser "edit page source". Local dev only — the dev server runs on
   * your own machine over your own files, so there is nothing to secure; writes
   * are confined to the repo root as correctness hygiene. Off by default; opt in.
   */
  editableSources?: boolean
  /**
   * Give a coding agent (Claude) eyes + hands on your running dev page via
   * [haltija](https://github.com/tonioloewald/haltija). When on, the dev server
   * injects a tiny localhost-gated loader into served HTML — a runtime
   * `import()` of the local haltija channel's `dev.js` — and spins up (or reuses)
   * a server-only HTTPS channel on port 8701. Because the loader is pulled from
   * the local server at runtime, **haltija is never bundled** (zero build bytes)
   * and self-disables off-localhost, and because injection happens at serve time
   * it never touches the built output. Local dev only; off by default. Can also
   * be toggled with `HALTIJA_DEV=1`. Requires mkcert (already needed for the dev
   * server's HTTPS) so the 8701 cert is trusted with no browser warning.
   */
  haltijaDev?: boolean
}

/** Identity helper that gives a site config module full type-checking + IDE help. */
export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config
}
