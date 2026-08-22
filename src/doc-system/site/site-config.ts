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

import type { ProjectLinks, LinkItem } from '../../doc-browser.js'
import type { DocSystemTheme } from '../doc-system-styles.js'
import type { Doc } from './docs.js'
import type { PreflightMode } from './preflight.js'
import type { AuditConfig } from './audit-guard.js'
import type { BookManifest } from '../book-manifest.js'

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
  /**
   * Brand mark shown left of the site title in the header. One of: the name of a
   * known icon (from `tosijs-ui`'s `icons`, e.g. `'tosiUi'`), an image URL / path
   * / `data:` URI, or a raw inline `<svg …>…</svg>` string. Omit to fall back to
   * the tosijs-ui logo when `projectLinks.tosijs` is set, or to no mark otherwise.
   * Size/spacing are CSS-tunable via `--tosi-logo-mark-size` (default 32px) and
   * `--tosi-logo-mark-gap` (default 10px) on the `.logo-mark` element.
   */
  logo?: string
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
   * Where to BUILD the hydration bundle. Defaults to the site output (`outputDir`).
   *
   * Set it only when the bundle is itself a **published** artifact — e.g. tosijs-ui writes
   * its iife to `dist` because `dist/iife.js` is the CDN `<script>` target consumers reach
   * through unpkg/jsdelivr. When set, the `.js` is copied into the site output as well, so
   * pages load it either way.
   *
   * It used to be `dist` unconditionally, which put SITE output in the LIBRARY tree — the
   * same directory `emitLibrary` / `libraryTsconfig` write to. Only the `.js` was copied
   * out, so the sourcemap stayed behind in a directory the project publishes and commits,
   * never served and unreachable by any consumer: 65 MiB across 216 packed blobs in one
   * adopter, ~35% of that repo's entire packed blob store, for a file nothing could load
   * (tosijs-ui#69). Defaulting to the site output also puts the map beside the script it
   * describes, where a browser can use it.
   */
  bundleOutDir?: string
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
   * GitHub project page without a custom domain.
   *
   * As of the mount-agnostic build (issue #25), `basePath` only affects
   * *metadata* URLs — `canonical`, `og:url`, `og:image`, and `sitemap.xml` —
   * which need the real absolute served path for SEO. *Functional* URLs (nav /
   * content links, `scriptUrl`, `stylesUrl`, favicon, `docsUrl`) are emitted
   * **relative to each page**, so one build works at `/repo`, at a custom-domain
   * root, or a moved mount with no rebuild. You still want `basePath` correct so
   * search engines see canonical URLs at the real path; getting it wrong now only
   * mis-states metadata, it no longer 404s the page's assets.
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
        /** base title; a named volume becomes "<title> — <volume>" unless overridden */
        title?: string
        /**
         * Per-volume titles, keyed by `book` name — for volumes with real book names
         * rather than "<project> — <volume>". Each volume also gets its own
         * `dc:identifier` and cover art, because a shared identifier makes readers
         * treat two volumes as one book and silently replace it.
         */
        volumeTitles?: Record<string, string>
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
   * Default true.
   *
   * The check resolves example imports against the doc-system's example context, which is
   * `tosijs` / `tosijs-ui` by default. A library that documents ITSELF imports its own
   * package name, so pass `contextKeys` rather than turning the guard off:
   *
   * ```ts
   * checkExamples: { contextKeys: ['tosijs', 'tosijs-ui', 'my-lib'] }
   * ```
   *
   * `false` disables it entirely, which used to be the only option for a self-documenting
   * library — and with the guard off, broken snippets ship: one adopter published a page
   * teaching its own core contract with a hard `SyntaxError` in the example, plus ten pages
   * importing a symbol their barrel did not export (tosijs-ui#71).
   */
  checkExamples?: boolean | { contextKeys?: string[] }

  /**
   * Opt in to the import-resolver service worker (tjs-lang 0.11+): live examples can
   * import real npm packages from anywhere — bare specifiers the doc-system doesn't
   * inject become `/<prefix>/<spec>` requests the worker resolves + caches. Copies the
   * worker to the web root and registers it client-side. `true` uses defaults
   * (`prefix: '/lib/'`); pass an object to configure. OFF by default — experimental.
   * See import-resolver-plan.md.
   */
  importResolver?:
    | boolean
    | {
        /** same-origin path prefix bare imports are rewritten to (default '/lib/') */
        prefix?: string
        /** default CDN for unlisted packages */
        defaultCdn?: 'jsdelivr' | 'esmsh'
        /** packages forced through esm.sh (e.g. ones needing its interop) */
        esmShPackages?: string[]
      }

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
   * Machine-health preflight before each build and at dev-server launch: refuse to add
   * load to a machine that is already dying (a runaway dev server, a VM stall).
   *
   * `'fail'` (default) refuses; `'warn'` prints and proceeds; `false`/`'off'` skips it.
   * Also `DEV_SKIP_PREFLIGHT=1`. A hard failure is **automatically downgraded to a
   * warning in CI and when stdout is not a TTY** — the guard is there to stop a human
   * from making a bad situation worse, and on a throwaway runner there is no human, no
   * stale dev server, and nothing to kill.
   */
  preflight?: PreflightMode | false
  /**
   * Dependency-audit gate. Runs `bun audit` on the INITIAL build (`bun run build`
   * and, asynchronously, at dev-server launch — never on watch rebuilds) and fails
   * the build on any advisory at or above `level` (default 'high') that is not
   * explicitly gated with a reason AND a future expiry date.
   *
   * On by default (`true` / omitted → `mode: 'fail'`). Opt out with `false`,
   * `{ mode: 'off' }`, or the `TOSIJS_AUDIT=off|warn|fail` env var. Unlike
   * `preflight`, it is NOT downgraded in CI — a dependency advisory is deterministic
   * and environment-independent, so CI is exactly where you want it enforced. It
   * fails OPEN when the audit itself can't run (offline, registry down).
   *
   * Time-box accepted risks instead of silencing them:
   *   audit: { allow: [{ advisory: 'GHSA-…', reason: '…', expires: '2026-08-15' }] }
   * An expired or malformed gate stops suppressing, so the build fails again and the
   * risk is re-evaluated. See `doc-site-system.md` → "Dependency audit gate".
   */
  audit?: boolean | AuditConfig
  /**
   * Open the dev page in a browser once the server is listening, REUSING the
   * project's tab instead of piling up a new one on every launch/restart (the
   * create-react-app "open a specific tab" trick). On macOS the server drives the
   * browser by AppleScript: it finds a tab already at this project's dev origin
   * (`https://localhost:<port>`) and brings it to front, else opens a new one. The
   * origin is the per-project "frame id" — because each project runs its own dev
   * port, you get exactly one tab per project (and it survives in-page navigation,
   * which a URL name/hash marker would not).
   *
   * Off by default. `true` = on (auto-detect a running Chrome/Brave/Edge/Chromium/
   * Safari, else hand off to the default browser). A string names the browser
   * (`'Google Chrome'`, `'safari'`, `'brave'`, …). The `BROWSER` env var overrides
   * (`BROWSER=none` disables for one run). Skipped in CI and when stdout isn't a
   * TTY. Reuse is macOS-only; other platforms open via `xdg-open`/`start` (no reuse).
   *
   * macOS note: driving another app by AppleScript triggers a one-time automation
   * permission prompt ("<runtime> wants to control <Browser>") — approve it once.
   */
  openBrowser?: boolean | string
  /**
   * Preview host for `bun bin/deploy-preview.ts` — rsync the built site to a box you
   * control, so a phone, a client, or a reviewer can see it without your dev server
   * (or your laptop) being up.
   *
   * Only `host` is required; everything else has a sensible default:
   *
   * ```ts
   * preview: { host: 'root@203.0.113.10' }
   * // → rsyncs <outputDir>/ to /srv/preview/<name>/ on that box
   * ```
   *
   * The deploy is a plain `rsync --delete` of static files — the whole artifact is a
   * few MB — so there is no pipeline, no build service, and (because static files
   * have no write endpoint) no meaningful attack surface to design around. See
   * REMOTE-ACCESS-PLAN.md.
   */
  preview?: {
    /**
     * ssh target, e.g. `root@203.0.113.10` or `deploy@preview.example.com`.
     *
     * OPTIONAL, because the documented practice is to keep it out of a committed config and
     * supply it from `PREVIEW_HOST` — which is also the bins' own resolution order
     * (`--host=` > `PREVIEW_HOST` > this). Typing it as required made a config that followed
     * the practice fail typecheck, and the workaround (`host: process.env.PREVIEW_HOST ?? ''`)
     * is noise that means nothing at runtime. Every bin that needs a host already checks for
     * one and prints how to supply it, so absence is handled where it is felt (#72).
     */
    host?: string
    /** remote directory; defaults to `/srv/preview/<name>` */
    path?: string
    /** public URL, printed after a successful deploy (e.g. `https://dev.example.com`) */
    url?: string
    /**
     * Expose THIS machine's dev server at an authenticated public URL, via an SSH
     * reverse tunnel to `host` (`tosijs-tunnel`).
     *
     * The box does no compute — it terminates TLS and routes. The work stays where the
     * data is, which is what lets one small VPS serve many projects.
     *
     * Authorization keys on the LISTENER, not on the peer address or any header.
     * Requests forwarded by the tunnel arrive on a dedicated loopback listener, and
     * anything arriving there needs a valid session to write — and, by default, even to
     * read. Which socket a request landed on is not something a client can forge.
     *
     * This deliberately replaces an earlier "the peer looks like loopback, so it must be
     * local" rule. A tunnel counterfeits loopback by construction, so that reasoning
     * authorized remote writes; see `mayWriteSource` in dev-auth.ts.
     */
    tunnel?: {
      /**
       * Port to bind on the remote box (loopback there). Defaults to a value derived
       * from the project name (FNV-1a into 9000-9899) so two projects sharing a host do
       * not collide — a flat default meant the second project's tunnel silently
       * attached to the first one's.
       */
      remotePort?: number
      /**
       * Local loopback port the tunnel forwards TO. Requests arriving here are treated
       * as remote — writes always require a session — because which socket a request
       * landed on is not something a client can forge, unlike a header. Defaults to
       * `port + 1`.
       */
      localPort?: number
      /** the authenticated public URL that fronts it */
      url?: string
      /**
       * Require a valid session even to VIEW the tunnelled workspace.
       *
       * **Defaults to `true`**, because an edit host is yours, not an audience's. If
       * you want to show someone the site, point them at the static preview host —
       * that is what it is for, and it has its own shareable link.
       *
       * The naming convention makes the posture legible without reading config:
       *
       *     <project>.dev.example.com        read-only preview, shareable
       *     <project>.edit.dev.example.com   live workspace, session required
       *
       * The earlier default was `false`, on the reasoning that an expired link should
       * degrade to a readable page rather than a wall "when you open a second window".
       * That reasoning was wrong: a second window **shares the session cookie**, so a
       * holder is never walled. The wall only appears for someone genuinely not
       * authenticated — which is the correct answer for a workspace mirroring an
       * uncommitted tree. Note also that the hostname is not a secret: Let's Encrypt
       * publishes every certificate it issues to public Certificate Transparency logs.
       *
       * Set `false` deliberately if you actually want a live read-only audience: the
       * page becomes readable to anyone with the URL, while writes still require a
       * session.
       */
      requireToken?: boolean
      /**
       * How a magic link may be redeemed. Default `'window'`.
       *
       * - `'window'` — redeemable repeatedly until `linkTtlMinutes` elapses, so the same
       *   link opens on your laptop AND your phone.
       * - `'single-use'` — spent on first redemption. Ratchet up to this when the link
       *   travels somewhere you do not control, e.g. pasted into a chat that others read.
       *
       * `'single-use'` was the default and it was wrong in practice: glance at a link and
       * close the tab and you need a new one; open it on a laptop then reach for a phone
       * and it is dead — in a feature whose whole point is reading your workspace on a
       * phone. One adopter replaced it with a never-expiring link of their own, which is
       * the tell: security people route around is friction plus a worse system built beside
       * it.
       */
      linkPolicy?: 'window' | 'single-use'
      /**
       * How long a link stays redeemable, in minutes. Default 15.
       *
       * Defaults to 5 minutes — short, because the link is a bearer token for its lifetime
       * and the 7-character code is what makes that acceptable. A link is redeemed seconds
       * after it is typed, so a longer window buys exposure and nothing else.
       *
       * Raise it for a long-lived share; lower it (or use `'single-use'`) to tighten. This
       * bounds the LINK, never the session it hands over — the session cookie is the
       * durable credential and has its own lifetime.
       */
      linkTtlMinutes?: number
    }
  }
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

/*
Port resolution — ONE definition, shared by the dev server and the `tosijs-tunnel` bin.

These lived separately: the server derived the tunnel listener from `PORT + 1` while the
bin fell back to a hard-coded 8788. They agree only when PORT is 8787 — i.e. only on
tosijs-ui itself — so every other adopter got a server listening on one port and a tunnel
probing another. tosijs hit it on their first run (PORT 8018 → listener 8019 → bin probed
8788), and the advice in the failure message documented the bin's stale default rather
than the server's real one.

Deliberately takes a minimal structural shape rather than the full SiteConfig, so the
bins can import it without dragging in the type graph, and `env` is a parameter so it is
testable without touching process state.
*/
export interface PortResolvable {
  port?: number
  preview?: { tunnel?: { localPort?: number } }
}

export function resolveDevPort(
  config: PortResolvable,
  env: Record<string, string | undefined> = process.env
): number {
  return Number(env.PORT || config.port || 8787)
}

/**
 * The loopback port the tunnel forwards to. Defaults to `devPort + 1` so two projects —
 * or a dev server and a test lane — stay disjoint by construction.
 */
export function resolveTunnelLocalPort(
  config: PortResolvable,
  env: Record<string, string | undefined> = process.env
): number {
  return Number(
    config.preview?.tunnel?.localPort ?? resolveDevPort(config, env) + 1
  )
}
