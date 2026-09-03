// Site configuration for the tosijs-ui documentation site.
// See bin/site-config.ts for the full set of options.

import { defineSiteConfig } from './src/doc-system/site/site-config'
import localizedStrings from './demo/src/localized-strings'

const PROJECT = 'tosijs-ui'

export default defineSiteConfig({
  name: PROJECT,
  description:
    'Simple, robust web-components for use with tosijs or anything else.',
  baseUrl: 'https://ui.tosijs.net',

  // Used for the logo and the view-source link.
  projectLinks: {
    tosijs: 'https://tosijs.net',
    github: `https://github.com/tonioloewald/${PROJECT}`,
  },
  // Header-bar icon links.
  navbarLinks: [
    { href: 'https://tosijs.net', label: 'tosijs', icon: 'tosi' },
    {
      href: 'https://discord.com/invite/ramJ9rgky5',
      label: 'discord',
      icon: 'discord',
    },
    { href: 'https://loewald.com', label: 'blog', icon: 'blog' },
    {
      href: `https://github.com/tonioloewald/${PROJECT}`,
      label: 'github',
      icon: 'github',
    },
    {
      href: `https://www.npmjs.com/package/${PROJECT}`,
      label: 'npmjs',
      icon: 'npm',
    },
  ],

  localizedStrings,
  favicon: '/favicon.svg',

  // Build + ship the ePub (the settings menu's "Download ePub" links to it).
  // coverIcon is embedded into the generated cover (served from demo/static).
  epub: {
    /*
    A REAL publication date for the book we actually ship.

    Without this the date is derived from the version — deterministic, which is what a
    committed artifact needs, but synthetic: 1.13.0 hashed to 2012, fourteen years adrift, and
    the OPF has no `dc:date` so it is the only date a reader sees. v1.12.8's book carried a
    correct contemporary date and this would have regressed it.

    Update on a release that changes the book's contents. It must stay a literal, not a clock,
    or `docs/tosijs-ui.epub` is dirty in every diff again.
    */
    modified: '2026-09-03T00:00:00Z',
    author: 'Tonio Loewald',
    coverIcon: '/tosi-book.svg',
  },

  // Enable the dev-server source read/write endpoints for in-browser
  // "edit page source" (local dev only).
  editableSources: true,

  // On `bun start`, open (or bring to front) this project's browser tab once the
  // server is up — reusing the tab keyed on the dev origin, so restarts don't pile
  // up tabs. macOS reuse is via AppleScript (one-time automation prompt). Override
  // the browser with BROWSER=<name>, or BROWSER=none to disable for a run.
  openBrowser: true,
  /*
  Preview host — `bun run deploy` (dry run) / `bun run deploy --go`.

  `host` is deliberately ABSENT. It comes from `PREVIEW_HOST`, which lives in
  `~/local-secrets/tosijs-preview.env` (mode 700, beside the repos, structurally
  impossible to commit) and is sourced from `~/.zshenv` so non-interactive shells —
  scripts, agents — see it too. See tosijs-coding-practices → deployment.md.

  This config committed the address until 2026-08-22, and `site-config.ts` has documented
  "keep it out of a committed config" the whole time: the rule was written and believed here
  while the address stayed published in a public repo's history. That address is therefore
  public and has been rotated. Redacting a file does not redact history — only rotation does.
  */
  preview: {
    url: 'https://ui.dev.tosijs.net',
    tunnel: {
      remotePort: 9787, // explicit: predates per-project allocation, and DNS points here
      localPort: 8788,
      url: 'https://ui.edit.dev.tosijs.net',
    },
  },

  // Inject the haltija dev-channel so a coding agent (Claude) can drive the live
  // dev page via `hj`. Dev-only, serve-time inject, never bundled / never in the
  // built output. Spins up a server-only HTTPS channel on 8701 (mkcert-trusted).
  //
  // `'tunnel'` instead of `true` additionally bridges the channel same-origin over the
  // tunnel, so an agent can drive a page running on a headset or a phone (#104). Left OFF
  // here deliberately: it is a per-machine decision, not a property of the project, and a
  // committed `'tunnel'` would enable it for everyone who clones.
  haltijaDev: true,

  // Append-only telemetry sink (#99), so a page on a headset or a phone can report back when
  // there is no console to read. Off-loopback safe: it appends to a scratch file outside the
  // repo that the build never reads and nothing serves back. Path is printed at startup.
  debugSink: true,

  // EXPERIMENTAL (import-resolver-plan.md): the import-resolver service worker, so live
  // examples can import real npm packages from anywhere. Off for 1.7.0; enabled here to
  // exercise the spike on this repo's own doc site.
  importResolver: true,

  // Register the module-cache service worker (demo/static/module-cache-sw.js) so
  // live-example CDN modules (the tjs-lang transpiler, example imports) are
  // cached same-origin and shared across the background-test iframes instead of
  // re-fetched cross-origin per frame. See that file for the phase-2 direction.
  headExtra:
    "<script>if('serviceWorker'in navigator){navigator.serviceWorker.register('/module-cache-sw.js').catch(function(){})}</script>",

  // tosijs-ui's build also publishes the npm package, and bundles its own IIFE.
  emitLibrary: true,
  bundleEntry: './src/index-iife.ts',
  // Opt IN to building the bundle into the library tree — the default is the site output
  // (#69). This project is the exception the option exists for: `dist/iife.js` is published
  // in the npm tarball and is the CDN `<script>` target consumers reach via unpkg/jsdelivr,
  // so it has to keep landing there. A project whose bundle only serves its own doc site
  // should leave this unset and keep site output out of `dist`.
  bundleOutDir: 'dist',
  docPaths: ['src', 'README.md', 'bin', 'icons'],
  staticDirs: ['demo/static'],
  // Served from GitHub Pages at the apex custom domain (CNAME in demo/static;
  // domain derives from baseUrl). basePath stays '/'.
  host: 'github-pages',
  // version stamp + icon-data regeneration are wired in bin/dev.ts (prebuild).
})
