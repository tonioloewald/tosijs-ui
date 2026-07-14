<!--{"pin":"bottom","title":"Doc-Site System","description":"How tosijs-ui's static, pre-rendered, hydrating documentation-site system works — and how to adopt it (tosijs-ui/site) in your own project.","parent":"Appendices"}-->

# `tosijs-ui/site` — static, pre-rendered, hydrating doc sites

A build system that turns a project's markdown (`.md` files + `/*#` block
comments in source) into a **fast, SEO/AI-friendly documentation site** that
works with no JavaScript and then upgrades itself into the interactive
`<tosi-doc-system>` doc browser when the bundle loads.

The output is a plain folder of static files — drop it on GitHub Pages,
Firebase Hosting, or any static host.

> **Status:** shipped. The whole system — build tooling and runtime component —
> lives in `src/doc-system/` and is importable as `tosijs-ui/site`. See
> "Where the code lives" at the bottom.

## What you get

- **One pre-rendered `/{slug}/index.html` per doc** (README → site root) with
  real `<head>` metadata: `<title>`, description, canonical, Open Graph,
  Twitter card, and `schema.org` `TechArticle` JSON-LD.
- **No-JS readable**: the markdown is already rendered to HTML and every nav
  item is a real `<a>`, so crawlers and AI agents see full content and links.
- **Zero-flash hydration**: the theme is burned into a static stylesheet, so
  pages are styled before any JS runs; then `<tosi-doc-system>` hydrates the
  page into the live doc browser (search, live examples, locale switching).
- **`sitemap.xml` + `robots.txt`** (when `baseUrl` is set), and host files
  (`.nojekyll`, `CNAME`, …) appropriate to the chosen host.

## How it works (pipeline)

```
extractDocs(docPaths)            →  docs.json   (markdown corpus)
generateSite(config, docs)       →  /{slug}/index.html + docs.json + sitemap + robots
generate-css(theme)              →  doc-system.css   (burned-in, no FOUC)
bundle(bundleEntry | iife.js)    →  the JS that hydrates the pages
host preset                      →  .nojekyll / CNAME / firebase.json
```

Static and hydrated output share the same slug + markdown rendering
(`src/doc-system/routing` + `render`) so the page never reflows on hydration.

## Quick start (adopting in your project)

**1. `site.config.ts`** at your repo root:

```typescript
import { defineSiteConfig } from 'tosijs-ui/site'

export default defineSiteConfig({
  name: 'my-lib',
  description: 'What my library does.',
  baseUrl: 'https://my-lib.example.com',
  host: 'github-pages', // emits .nojekyll + CNAME (domain from baseUrl)
  bundleEntry: 'demo/site.ts', // omit to use tosijs-ui's published iife.js
  navbarLinks: [
    { href: 'https://github.com/me/my-lib', label: 'github', icon: 'github' },
  ],
})
```

**2. `bin/site.ts`** — the only build file you write:

```typescript
import { buildSite, devServer } from 'tosijs-ui/site'
import config from '../site.config'

process.argv.includes('--build') ? buildSite(config) : devServer(config)
```

> **If your build does more than `buildSite`** — e.g. you bundle your own
> hydration `iife.js` separately (needed when the bundle requires a Bun plugin,
> which `bundleEntry` can't take) — wrap the whole pipeline in one function and
> pass it to `devServer` as `{ build }`. `buildSite` begins with
> `rm -rf <outputDir>`, so any artifact your extra steps wrote is deleted on the
> first file-change rebuild; without `build`, the watcher only re-runs
> `buildSite` and never regenerates it, so `/iife.js` 404s into the SPA fallback
> and "loads as html". The initial build still runs your steps explicitly:
>
> ```typescript
> const build = async () => {
>   if (!(await buildSite(config))) throw new Error('site build failed')
>   await buildMyIifeBundle() // re-create what buildSite's rm -rf removed
> }
> if (!(await buildSite(config))) process.exit(1)
> await buildMyIifeBundle()
> if (process.argv.includes('--build')) process.exit(0)
> await devServer(config, { build }) // ← watcher runs the full pipeline
> ```

**3. scripts** in `package.json`:

```json
{
  "scripts": { "start": "bun bin/site.ts", "build": "bun bin/site.ts --build" }
}
```

**4. build-time dependencies.** The build (not your shipped library) needs a few
tools installed alongside tosijs-ui. They're declared as optional peers, so
install whichever the build reports missing:

```bash
bun add -d happy-dom tjs-lang marked
```

`happy-dom` powers the theme-stylesheet step (the build runs with no real DOM);
`tjs-lang` transpiles live-examples (vanilla JS via `dialect: 'js'`, plus real
TypeScript); `marked` renders markdown. If one
is absent the build fails mid-run with a `Cannot find package …` from inside
`node_modules/tosijs-ui/dist/…` — that means a build-time peer isn't installed.

**5. dev-server TLS (once).** `devServer` serves over HTTPS and looks for
`tls/key.pem` + `tls/certificate.pem`; if they're missing it tells you to run:

```bash
bunx tosijs-dev-certs
```

This ships with tosijs-ui — it uses [mkcert](https://github.com/FiloSottile/mkcert)
to write a **locally-trusted** cert into `./tls/` (no browser warnings), valid
for `localhost`, `127.0.0.1`, `::1`, and your machine's `.local` name. Run it as
your normal user (it prompts for sudo itself only to install its CA); re-run to
add hostnames. Requires `mkcert` — the command prints install instructions if
it's missing.

## Bundles & live examples (read this)

The static pages are inert HTML until a JS bundle loads and registers the
custom elements (and powers live `js`/`test` examples). You pick one of two
modes:

- **`bundleEntry` — bring your own (recommended for any project with custom
  components).** The build bundles your entrypoint to IIFE and pages load it.
  **Your entrypoint must import everything your pages and live examples
  reference**, and expose any custom modules to live examples by setting each
  `<tosi-doc-system>`'s `context` property (live examples resolve
  `import { x } from 'my-lib'` against `context['my-lib']`):

  ```typescript
  // demo/site.ts
  import 'tosijs-ui' // registers tosi-* elements + the doc-system component
  import * as mylib from '../src/index' // your own components/exports

  // Expose your library to live examples. tosijs / tosijs-ui are provided by
  // default (from the IIFE globals); add your own here.
  for (const el of document.querySelectorAll('tosi-doc-system')) {
    ;(el as any).context = { 'my-lib': mylib }
  }
  ```

  Without the `import` your custom elements won't upgrade; without the
  `context` entry, `import … from 'my-lib'` in a live example won't resolve.

- **`scriptUrl` fallback — use a prebuilt bundle.** Omit `bundleEntry` and
  pages load `scriptUrl` (default `/iife.js`, i.e. tosijs-ui's published
  bundle). Good for a pure docs site with no custom elements of its own.

**Heads-up — IIFE bundle limits.** The bundle is a classic `<script>` (IIFE), so:

- **`import.meta` is illegal** in it — if an isomorphic dep references
  `import.meta.url` in a branch the bundler can't drop, the page dies with a
  `SyntaxError`. Mark that dep external (+ an importmap) or use a browser-only entry.
- **`bundleExternals` are a dynamic `require()` shim** that throws at runtime
  (`Dynamic require of … is not supported`). Load externals via `import()`
  (kept async) or an importmap — never a static top-level import.

The build warns about both, but they fail at page-load, not build-time.

## Custom icons

The icon set is extensible at runtime: `defineIcons({ name: '<svg…>' })` adds new
icons or **overrides a default by reusing its name**. Registered icons work with
`icons.name()`, `<tosi-icon icon="name">`, and the composition language; an icon's
`class="filled|stroked|color"` sets its default styling. Do this in your bundle
entry so the icons are available before the page renders:

```typescript
// demo/site.ts
import { defineIcons } from 'tosijs-ui'

defineIcons({
  // a brand glyph, and an override of the default `star`
  acme: '<svg class="stroked" viewBox="0 0 24 24"><path d="…"/></svg>',
  star: '<svg class="filled" viewBox="0 0 24 24"><path d="…"/></svg>',
})
```

For a **folder of SVGs**, generate a ready-to-register module with the bundled
CLI (it scales/rounds coordinates and emits `export default { name: '<svg>' }`):

```bash
bunx tosijs-make-icons --input ./my-icons --output ./src/my-icons.ts
```

```typescript
import { defineIcons } from 'tosijs-ui'
import myIcons from './my-icons'
defineIcons(myIcons)
```

(Each SVG file's `class` attribute — `filled` / `stroked` / `color` — is preserved.)

## Configuration reference

All fields are optional except `name`. See `src/doc-system/site/site-config.ts`
for the authoritative typed definition.

### Identity & SEO

| field         | default        | purpose                                       |
| ------------- | -------------- | --------------------------------------------- |
| `name`        | —              | brand name; `<title>` suffix, `og:site_name`  |
| `description` | —              | site-level meta + structured-data fallback    |
| `baseUrl`     | —              | absolute origin for canonical/OG/sitemap URLs |
| `lang`        | `'en'`         | `<html lang>`                                 |
| `favicon`     | `/favicon.svg` | favicon href                                  |
| `ogImage`     | —              | default share image (per-page overridable)    |
| `headExtra`   | —              | raw lines injected into every `<head>`        |

### Branding & chrome

| field              | default | purpose                                     |
| ------------------ | ------- | ------------------------------------------- |
| `projectLinks`     | —       | logo + view-source links                    |
| `navbarLinks`      | —       | header-bar icon links                       |
| `theme`            | —       | base colors (palette derived from `accent`) |
| `localizedStrings` | —       | TSV table for the language picker           |

### Doc sources

| field         | default                | purpose                                                                                                                                       |
| ------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `docPaths`    | `['src', 'README.md']` | dirs scanned for `/*#` + `.md` files (list root `.md` files explicitly)                                                                       |
| `sectionsDir` | `'src/docs'`           | where auto-created section docs + their `<!-- toc -->` blocks are written (must be inside a `docPath`, not named `docs`)                      |
| `docsJson`    | `'demo/docs.json'`     | path of the intermediate doc corpus the build writes and re-reads; its directory is created automatically, so you don't need a `demo/` folder |

### Bundle

| field             | default    | purpose                                               |
| ----------------- | ---------- | ----------------------------------------------------- |
| `bundleEntry`     | —          | your IIFE entrypoint; omit to use the fallback bundle |
| `bundleExternals` | —          | modules left external, e.g. `['jolt-physics']`        |
| `scriptUrl`       | `/iife.js` | bundle URL pages load (fallback + output name)        |

### Static assets

| field        | default                           | purpose                     |
| ------------ | --------------------------------- | --------------------------- |
| `staticDirs` | `['demo/static']` or `['static']` | dirs copied to the web root |

### Hosting

| field      | default                | purpose                                                                       |
| ---------- | ---------------------- | ----------------------------------------------------------------------------- |
| `host`     | `'static'`             | `'github-pages' \| 'firebase' \| 'static'` preset                             |
| `domain`   | derived from `baseUrl` | custom domain → `CNAME` (github-pages); implies `basePath: '/'`               |
| `basePath` | `'/'`                  | URL prefix; set `'/<repo>'` for a GitHub project page without a custom domain |

### Build toggles & dev server

| field                | default  | purpose                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prebuild`           | —        | `() => void \| Promise<void>` run first, for source-tree codegen (version stamp, icon data, …). Runs before `dist`/output are reset — don't write there                                                                                                                                                                                                |
| `emitLibrary`        | `false`  | also build the library: `tsc --declaration --incremental --outDir dist` (for repos publishing a package + their docs)                                                                                                                                                                                                                                  |
| `libraryTsconfig`    | —        | run `tsc -p <path>` for the library build instead (handles root `noEmit`, `removeComments`, custom `outDir`); supersedes `emitLibrary`                                                                                                                                                                                                                 |
| `libraryBuild`       | —        | `(ctx: { dist, root, tsconfig? }) => void \| Promise<void>` — fully override the tsc library build; you emit `dist/*.js` + `*.d.ts` for ALL sources. For non-`.ts` sources tsc can't compile (native tjs-lang `.tjs`): run tsc for `.ts` + `tjs convert`/`generateDTS` for `.tjs`. Supersedes `libraryTsconfig`/`emitLibrary`. See `BUILD-TJS-HOOK.md` |
| `generateCssPreload` | —        | module to `bun --preload` into the CSS-extraction subprocess (`generate-css` imports your library to burn the theme); needed when that graph reaches non-`.ts` sources (`.tjs`) requiring a Bun loader plugin — point it at a module that registers it. Pairs with `libraryBuild`                                                                      |
| `llmsTxt`            | `true`   | emit the `llms.txt` index — `true`, `false`, or `(docs) => string` for a custom one (see below)                                                                                                                                                                                                                                                        |
| `epub`               | `false`  | build + ship an ePub of the corpus every build — `true` or `{ author, title, css, cover, coverColor }` (see below)                                                                                                                                                                                                                                     |
| `book`               | —        | curate/reorder the book artifact without touching site nav (see below)                                                                                                                                                                                                                                                                                 |
| `outputDir`          | `'docs'` | served web-root output dir                                                                                                                                                                                                                                                                                                                             |
| `port`               | `8787`   | dev-server port                                                                                                                                                                                                                                                                                                                                        |
| `watchPaths`         | —        | extra dev-server watch dirs                                                                                                                                                                                                                                                                                                                            |
| `haltijaDev`         | `false`  | give a coding agent eyes on your running dev page (see below); also `HALTIJA_DEV=1`                                                                                                                                                                                                                                                                    |
| `editableSources`    | `false`  | dev-only in-browser "edit page source" endpoints                                                                                                                                                                                                                                                                                                       |
| `memoryLimitMb`      | `4096`   | RSS ceiling for the dev server; past it, print growth-per-rebuild and exit (see below); also `DEV_MEMORY_LIMIT_MB`                                                                                                                                                                                                                                     |
| `idleTimeoutHours`   | `8`      | exit after this long with no request and no rebuild; `0` disables (see below); also `DEV_IDLE_TIMEOUT_HOURS`                                                                                                                                                                                                                                           |

#### Not taking the machine down with you

A dev server is a process that lives for **days**, rebuilding thousands of times.
Three things follow from that, and the build system enforces all three — because a
forgotten dev server is not inert, it is a days-old process **still running the code
it loaded at launch**. Updating the package does nothing for one that is already
running.

This is not hypothetical. Three such servers, left over from before a memory-leak
fix landed, grew to 103GB, 57GB and 49GB of RSS on a 32GB machine: ~210GB of demand
against 32GB of RAM, the compressor at 18GB, 14MB of free memory, and the page-out
scanner reclaiming _zero_ pages. macOS's jetsam never intervened — it let the box
thrash for twenty minutes until it was power-cycled.

- **Never call `Bun.build()` (or any native-heavy step) in the long-lived process.**
  Its native arena is never returned — ~30MB of RSS per call, monotonic, invisible to
  the JS heap and to `Bun.gc()` ([oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053)).
  The build shells out to the `bun build` CLI instead, and the ePub step (happy-dom +
  `@resvg/resvg-js`, also native) runs in a child. The OS reclaims a child's memory on
  exit; the same 15 bundles cost **+0.5MB** in-parent instead of **+192MB**.
- **`memoryLimitMb`** — the dev server samples its own RSS after every rebuild and, past
  the ceiling, prints the growth-per-rebuild and exits. Growth per rebuild should be ~0;
  sustained growth is a leak, not a ceiling that is too low.
- **`idleTimeoutHours`** — the dev server exits after 8 idle hours (no request, no
  rebuild). The ceiling bounds how bad _one_ server gets; this bounds _how many there
  are_. An idle server has no value to weigh against being tomorrow's runaway.
- **Preflight** — every build and every dev-server launch samples the process table
  first and **refuses to start** if the machine is already in trouble: any process over
  half of physical RAM, or a `bun` dev process over the RSS ceiling that has been alive
  for more than an hour. It names the PIDs, their sizes, their ages, their project dirs,
  and the `kill` command. Nothing noticed the runaways because nothing ever looked.
  Override with `DEV_SKIP_PREFLIGHT=1`.
- **A health tick, not just events.** Every other check here is edge-triggered — the RSS
  sample fires after a rebuild, the preflight at launch — and all of them are blind to the
  state that actually kills machines: a server nobody is touching, sitting on gigabytes,
  on a box quietly filling up around it. _Nothing rebuilds, so nothing looks._ So the dev
  server also checks on a **timer**: the RSS ceiling every minute, and a full machine
  preflight every five. If the box is dying — even because of someone else's runaway — it
  exits and prints the PIDs on the way out.
- **A rebuild-storm detector.** The other way to eat a machine is not a leak but a **loop**:
  if the build writes a file the watcher watches, every rebuild triggers the next, forever —
  spawning a bundler each time. A loop is a leak with the throttle removed. The known
  self-writes (`version.ts`, `icon-data.ts`) are ignored by the watcher, but **`prebuild` is
  arbitrary consumer code**, and anything it writes into a watched path loops. Nobody types
  20 times in a minute: past that, the server names the files that keep firing — which _is_
  the diagnosis — and stops.

#### `haltijaDev` — Claude eyes on your running dev page

Set `haltijaDev: true` (or run with `HALTIJA_DEV=1`) and `bun start` gives a coding
agent (Claude) eyes **and hands** on your actual running page via
[haltija](https://github.com/tonioloewald/haltija): read the live DOM, click, type,
run JS, watch console/network, and **screen-capture** the rendered page — on the
real page you have open, with your real session state.

How it stays clean:

- The dev server injects a **one-line loader** into served HTML — a localhost-gated
  runtime `import()` of the local haltija channel's `dev.js`. Because it's pulled
  from the local server at runtime, **haltija is never bundled** (zero build bytes),
  and the `localhost` guard means it **self-disables** anywhere else.
- Injection happens **at serve time only**, so it never lands in the built output —
  your deployed static site is untouched.
- The dev server also **spins up (or reuses) a server-only haltija channel**
  (no desktop app) in `--both` mode: **HTTP 8700** (which the `hj` CLI drives) and
  **HTTPS 8701** (which the injected widget loads, so an HTTPS page has no
  mixed-content). Both certs are mkcert-signed — mkcert is already required for the
  dev server's own HTTPS — so there's no browser warning.

Then drive the page with the `hj` CLI (`hj tree`, `hj eval`, `hj click …`,
`hj screenshot`). The widget shows itself when the channel is active (Option+Tab to
toggle) — no silent snooping. For **screen capture** (`getDisplayMedia`, so no
Electron app needed), click the 🖥 button in the widget once to grant the share;
`hj screenshot` then writes a file and returns its path — no giant base64 in the
agent's context (add `--format webp --scale 0.5` for a compact capture, `--chyron
false` to drop the burned-in caption). Local dev only; off by default.

> The channel tracks haltija's **`@beta`** dist-tag, where the in-browser WebRTC
> screen capture landed ahead of `latest`.

#### `llms.txt`

The default index is built from your config — `name`, `description`, `baseUrl`
(→ `Docs:` link), and `projectLinks.github`/`.npm` (→ `Source:`/`npm:` links;
npm falls back to your package name) — plus one entry per documented `src/*.ts`
with a `dist/*.js` pointer. It's written **both** to the project root (so you can
ship it in your package's `files`) **and** to the served output dir, so
`{baseUrl}/llms.txt` resolves for crawlers/agents. Set `llmsTxt: false` to skip,
or pass a function `(docs) => string` to generate your own from the corpus.

#### The book (ePub) & the `book` manifest

Set `epub: true` (or `{ author, title, css, cover, coverColor }`) and every build
emits `{name}.epub` into the output dir, one chapter per doc in nav order, with a
Contents page, EPUB3 nav + EPUB2 ncx, and a cover (an explicit `cover` image, or
one generated from the title + your `favicon`; install `@resvg/resvg-js` to
render the generated one). The doc-browser's settings menu links to it as
"Download ePub". `bun bin/build-book.ts` builds it standalone. PDF is the
in-browser **Print** button, not a batch job.

By default **the book is the whole visible corpus** — zero config. To emit a
_subset_ in a _curated order_ (a library that also ships a book, a novel with
front/back matter) add a `book` manifest. It shapes only the book artifact; the
live-site nav is unchanged (one source, two outputs). Every field is an overlay
on the defaults — it never adds a new ordering mechanism, it overlays each doc's
`order` so the same nav sort sequences the book (pins/parents still apply):

```typescript
book: {
  include: ['chapters/**', 'front/**', 'back/**'], // globs (path or filename); default: all
  exclude: ['**/drafts/**'],                        // removed after include
  order: ['title', 'copyright', 'dedication'],      // lead sequence; by filename/slug/title
  sort: 'filename',                                 // 'nav' (default) | 'filename' natural sort
}
```

- **Front/back matter** are just regular docs — name them in `order` (or give
  them a per-doc `order` in frontmatter) to place them; there's no special
  front-matter concept.
- `sort: 'filename'` makes a folder of `01-*.md`, `02-*.md`, … sequence with no
  metadata; a per-doc `order` still wins.
- Identity (title / author / cover) comes from `epub`, not here.

## Host presets & custom domains

| `host`                      | `.nojekyll` | `CNAME`  | `basePath`               | other                             |
| --------------------------- | :---------: | :------: | ------------------------ | --------------------------------- |
| `github-pages` + `domain`   |     ✅      | `domain` | `/`                      | —                                 |
| `github-pages`, no `domain` |     ✅      |    —     | set `'/<repo>'` yourself | —                                 |
| `firebase`                  |      —      |    —     | `/`                      | optional `firebase.json` rewrites |
| `static` (default)          |      —      |    —     | `/`                      | nothing host-specific             |

`domain` is derived from `baseUrl`'s hostname when omitted (and
`host: 'github-pages'`), so the common case needs no extra config; set it
explicitly to override (apex vs `www`, or a domain that differs from the
canonical origin). A custom domain always serves from root, so it forces
`basePath: '/'`.

## Doc format

- **`.md` files** are included whole.
- **`/*#` … `*/` block comments** in `.ts`/`.js`/`.css` are extracted as
  markdown. The first heading is the page title.
- **Metadata** via a JSON block — `<!--{ "pin": "top" }-->` (html) or
  `/*{ "pin": "bottom" }*/` (ts/js/css) — controls nav ordering, plus per-page
  SEO overrides (`description`, `keywords`, `image`, `noindex`, `headTitle`) and
  the section `parent`, all in the same block.
- **Nav order** is: pin bucket (`top` → none → `bottom`), then `order`, then
  title, then filename. Use **`order`** (a number, **lower first**; default 500)
  to rank items _within_ the same `pin` — e.g. two `"pin": "top"` docs with
  `"order": 1` and `"order": 2`. Siblings inside a section sort the same way.
- **Consecutive `js`/`html`/`css`/`test` code blocks** become one live example
  (see the main project's "Live example code blocks" docs).

## Notes & gotchas

- **Build-time only.** The orchestrator and generators run under Bun and never
  enter a browser bundle. Only the runtime `<tosi-doc-system>` component ships
  to the page (and is tree-shaken away for consumers that don't use it).
- **Dependency direction for `tosijs` itself.** If the core `tosijs` repo uses
  this to build _its_ docs, that's a **build-time-only** dependency on
  tosijs-ui — the published `tosijs` library still depends on nothing upstream.
  It is not circular, but CI must build/resolve tosijs-ui first.
- **Not every site fits.** This is for reference/doc sites built from markdown.
  A bespoke scroll-driven marketing page (e.g. `tosijs-product`) wants a
  different page model — use tosijs-ui's _components_ there, not this doc
  system (or host its API docs as a separate site).
- **Relative asset URLs break (migration gotcha).** Each doc is served at its
  own path (`/{slug}/`), so a `./asset` reference inside a `/*# … */` block now
  resolves under that slug, not the site root. Use **root-absolute** URLs
  (`/asset`) for images and links in doc content.
- **`prebuild` runs before `dist/` exists and `outputDir` is wiped.** Use the
  `prebuild` hook for source-tree codegen (version stamp, icon data, …) and
  write into a `staticDirs` folder for assets — not `dist/` or the output dir,
  which the build resets immediately after.
- **Anything `prebuild` writes into a watched path is an infinite rebuild loop.** The
  file it writes triggers the watcher, which rebuilds, which writes it again. The dev
  server's storm detector will stop you (and name the file), but the fix is on your side:
  write outside the watched paths, or add the file to the watcher's ignore list. This is
  why `version.ts` and `icon-data.ts` — both written by tosijs-ui's own `prebuild` — are
  ignored by the watcher.

## Where the code lives

The extraction is **done**: everything below is in `src/doc-system/`, and the build
half is what `tosijs-ui/site` exports. Nothing here is imported from `bin/` any more.

| concern                                     | module                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| config type + `defineSiteConfig`            | `site/site-config.ts`                                                    |
| orchestrator (`buildSite`)                  | `site/orchestrator.ts`                                                   |
| dev server (`devServer`)                    | `site/dev-server.ts`                                                     |
| machine-health preflight                    | `site/preflight.ts`                                                      |
| doc extraction                              | `site/docs.ts`                                                           |
| section docs + TOC blocks                   | `site/sections.ts`                                                       |
| static page generator                       | `site/generate-site.ts`                                                  |
| theme → static CSS (subprocess)             | `site/generate-css.ts`                                                   |
| DOM shim for the CSS subprocess             | `site/build-dom-shim.ts`                                                 |
| ePub (+ its child-process CLI)              | `site/epub.ts`, `site/epub-cli.ts`                                       |
| `llms.txt`                                  | `site/make-llms-txt.ts`                                                  |
| build guards (bundle, output dir, examples) | `site/bundle-guard.ts`, `site/output-guard.ts`, `site/check-examples.ts` |
| runtime component                           | `src/doc-system/` (ships in the bundle)                                  |

What remains in `bin/` is **not** part of the system — it is this project's own
wiring, plus one tool that hasn't been generalized:

| file                    | what it is                                                                                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bin/dev.ts`            | tosijs-ui's own build entry — a thin wrapper over `buildSite`/`devServer` (declarative config in `tosijs-site.config.ts`, imperative prebuild codegen here)                                                                 |
| `bin/build-book.ts`     | standalone ePub CLI (`bun book`) — a wrapper over the exported `buildEpub`                                                                                                                                                  |
| `bin/docs.ts`           | **back-compat shim**, re-exports `site/docs.ts`; kept because `package.json#files` ships it and `import … from 'tosijs-ui/bin/docs'` consumers exist                                                                        |
| `bin/generate-og.ts`    | **not extracted.** Per-page Open Graph cards (`bun run og`). Opt-in and rarely re-run: it needs Playwright, ffmpeg, and a _running_ dev server to screenshot live examples, so it is a manual step, not part of `buildSite` |
| `bin/make-icon-data.js` | icon codegen (`icons/` → `src/icon-data.ts`); also shipped as the `tosijs-make-icons` bin                                                                                                                                   |
