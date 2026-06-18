<!--{"pin":"bottom","title":"Doc-Site System","description":"How tosijs-ui's static, pre-rendered, hydrating documentation-site system works — and how to adopt it (tosijs-ui/site) in your own project.","parent":"Appendices"}-->

# `tosijs-ui/site` — static, pre-rendered, hydrating doc sites

A build system that turns a project's markdown (`.md` files + `/*#` block
comments in source) into a **fast, SEO/AI-friendly documentation site** that
works with no JavaScript and then upgrades itself into the interactive
`<tosi-doc-system>` doc browser when the bundle loads.

The output is a plain folder of static files — drop it on GitHub Pages,
Firebase Hosting, or any static host.

> **Status:** extraction in progress. The runtime component lives here in
> `src/doc-system/`; the build tooling still lives in `bin/` (`site-config.ts`,
> `generate-site.ts`, `generate-css.ts`, `generate-og.ts`, `build-dom-shim.ts`,
> `docs.ts`) and is being consolidated into `src/doc-system/` behind the
> importable `tosijs-ui/site` entry described here. See "Current layout" at the
> bottom.

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

```ts
import { defineSiteConfig } from 'tosijs-ui/site'

export default defineSiteConfig({
  name: 'my-lib',
  description: 'What my library does.',
  baseUrl: 'https://my-lib.example.com',
  host: 'github-pages',          // emits .nojekyll + CNAME (domain from baseUrl)
  bundleEntry: 'demo/site.ts',   // omit to use tosijs-ui's published iife.js
  navbarLinks: [
    { href: 'https://github.com/me/my-lib', label: 'github', icon: 'github' },
  ],
})
```

**2. `bin/site.ts`** — the only build file you write:

```ts
import { buildSite, devServer } from 'tosijs-ui/site'
import config from '../site.config'

process.argv.includes('--build') ? buildSite(config) : devServer(config)
```

**3. scripts** in `package.json`:

```json
{ "scripts": { "start": "bun bin/site.ts", "build": "bun bin/site.ts --build" } }
```

**4. build-time dependencies.** The build (not your shipped library) needs a few
tools installed alongside tosijs-ui. They're declared as optional peers, so
install whichever the build reports missing:

```bash
bun add -d happy-dom sucrase marked
```

`happy-dom` powers the theme-stylesheet step (the build runs with no real DOM);
`sucrase` transforms TypeScript live-examples; `marked` renders markdown. If one
is absent the build fails mid-run with a `Cannot find package …` from inside
`node_modules/tosijs-ui/dist/…` — that means a build-time peer isn't installed.

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

  ```ts
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

```ts
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

```ts
import { defineIcons } from 'tosijs-ui'
import myIcons from './my-icons'
defineIcons(myIcons)
```

(Each SVG file's `class` attribute — `filled` / `stroked` / `color` — is preserved.)

## Configuration reference

All fields are optional except `name`. See `bin/site-config.ts` for the
authoritative typed definition.

### Identity & SEO
| field | default | purpose |
|---|---|---|
| `name` | — | brand name; `<title>` suffix, `og:site_name` |
| `description` | — | site-level meta + structured-data fallback |
| `baseUrl` | — | absolute origin for canonical/OG/sitemap URLs |
| `lang` | `'en'` | `<html lang>` |
| `favicon` | `/favicon.svg` | favicon href |
| `ogImage` | — | default share image (per-page overridable) |
| `headExtra` | — | raw lines injected into every `<head>` |

### Branding & chrome
| field | default | purpose |
|---|---|---|
| `projectLinks` | — | logo + view-source links |
| `navbarLinks` | — | header-bar icon links |
| `theme` | — | base colors (palette derived from `accent`) |
| `localizedStrings` | — | TSV table for the language picker |

### Doc sources
| field | default | purpose |
|---|---|---|
| `docPaths` | `['src', 'README.md']` | dirs scanned for `/*#` + `.md` files (list root `.md` files explicitly) |

### Bundle
| field | default | purpose |
|---|---|---|
| `bundleEntry` | — | your IIFE entrypoint; omit to use the fallback bundle |
| `bundleExternals` | — | modules left external, e.g. `['jolt-physics']` |
| `scriptUrl` | `/iife.js` | bundle URL pages load (fallback + output name) |

### Static assets
| field | default | purpose |
|---|---|---|
| `staticDirs` | `['demo/static']` or `['static']` | dirs copied to the web root |

### Hosting
| field | default | purpose |
|---|---|---|
| `host` | `'static'` | `'github-pages' \| 'firebase' \| 'static'` preset |
| `domain` | derived from `baseUrl` | custom domain → `CNAME` (github-pages); implies `basePath: '/'` |
| `basePath` | `'/'` | URL prefix; set `'/<repo>'` for a GitHub project page without a custom domain |

### Build toggles & dev server
| field | default | purpose |
|---|---|---|
| `generateIcons` | `false` | run icon-data generation (tosijs-ui-specific) |
| `llmsTxt` | `true` | emit `llms.txt` discoverability index |
| `outputDir` | `'docs'` | served web-root output dir |
| `port` | `8787` | dev-server port |
| `watchPaths` | — | extra dev-server watch dirs |

## Host presets & custom domains

| `host` | `.nojekyll` | `CNAME` | `basePath` | other |
|---|:---:|:---:|---|---|
| `github-pages` + `domain` | ✅ | `domain` | `/` | — |
| `github-pages`, no `domain` | ✅ | — | set `'/<repo>'` yourself | — |
| `firebase` | — | — | `/` | optional `firebase.json` rewrites |
| `static` (default) | — | — | `/` | nothing host-specific |

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
  `/*{ "pin": "bottom" }*/` (ts/js/css) — controls nav ordering; per-page SEO
  overrides (`description`, `keywords`, `image`, `noindex`, `headTitle`) live
  in the same block.
- **Consecutive `js`/`html`/`css`/`test` code blocks** become one live example
  (see the main project's "Live example code blocks" docs).

## Notes & gotchas

- **Build-time only.** The orchestrator and generators run under Bun and never
  enter a browser bundle. Only the runtime `<tosi-doc-system>` component ships
  to the page (and is tree-shaken away for consumers that don't use it).
- **Dependency direction for `tosijs` itself.** If the core `tosijs` repo uses
  this to build *its* docs, that's a **build-time-only** dependency on
  tosijs-ui — the published `tosijs` library still depends on nothing upstream.
  It is not circular, but CI must build/resolve tosijs-ui first.
- **Not every site fits.** This is for reference/doc sites built from markdown.
  A bespoke scroll-driven marketing page (e.g. `tosijs-product`) wants a
  different page model — use tosijs-ui's *components* there, not this doc
  system (or host its API docs as a separate site).

## Current layout (extraction in progress)

| concern | today | target |
|---|---|---|
| config type + `defineSiteConfig` | `bin/site-config.ts` | `src/site/` |
| orchestrator (prebuild/build/serve) | `bin/dev.ts` | `src/site/` (`buildSite`/`devServer`) |
| static page generator | `bin/generate-site.ts` | `src/site/` |
| theme → static CSS | `bin/generate-css.ts` | `src/site/` |
| OG image generation | `bin/generate-og.ts` | `src/site/` |
| doc extraction | `bin/docs.ts` | `src/site/` |
| runtime component | `src/doc-system/` | unchanged (ships in the bundle) |
