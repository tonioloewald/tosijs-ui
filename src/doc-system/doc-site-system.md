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

  **Where it lands.** The bundle and its sourcemap are written into your **site output**
  (`outputDir`, default `docs/`), so the map sits beside the script it describes and a
  browser can load it.

  Set `bundleOutDir` only when the bundle is itself a _published_ artifact — tosijs-ui does,
  because `dist/iife.js` is the CDN `<script>` target consumers reach via unpkg/jsdelivr.
  When set, the `.js` is also copied into the site output, so pages load it either way.

  > Before 1.9.9 the bundle was written into `dist/` unconditionally — the same directory
  > `emitLibrary` / `libraryTsconfig` use for your **library** — and only the `.js` was
  > copied out. The sourcemap stayed behind in a tree you publish and commit but never
  > serve, unreachable by any consumer. One adopter accumulated `iife.js.map` at **65 MiB
  > across 216 packed blobs, about 35% of the repository's entire packed blob store**, for a
  > file nothing could load ([#69](https://github.com/tonioloewald/tosijs-ui/issues/69)). If
  > you have that history, `git rm --cached dist/iife.js dist/iife.js.map` and gitignore
  > them; new builds will not put them back.

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

| field              | default | purpose                                                               |
| ------------------ | ------- | --------------------------------------------------------------------- |
| `projectLinks`     | —       | view-source links; `tosijs` key also gates the default logo           |
| `logo`             | —       | brand mark left of the title: icon name, image URL, or inline `<svg>` |
| `navbarLinks`      | —       | header-bar icon links                                                 |
| `theme`            | —       | base colors (palette derived from `accent`)                           |
| `localizedStrings` | —       | TSV table for the language picker                                     |

The header **brand mark** (left of the site title) resolves in this order: an
explicit `logo` — the name of an icon (from `tosijs-ui`'s `icons`, e.g.
`'tosiUi'`), an image URL / `data:` URI, or a raw inline `<svg>…</svg>` string —
otherwise the tosijs-ui logo when `projectLinks.tosijs` is set, otherwise no mark.
The same `logo` is accepted by `createDocBrowser({ logo })` and by an embedded
`<tosi-doc-system config='{"logo":"…"}'>`. Its size and spacing are class-driven
(`.logo-mark`), so retune them with one CSS variable each rather than editing the
build: `--tosi-logo-mark-size` (default 32px) and `--tosi-logo-mark-gap` (default
10px).

### Doc sources

| field         | default                | purpose                                                                                                                                       |
| ------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `docPaths`    | `['src', 'README.md']` | dirs scanned for `/*#` + `.md` files (list root `.md` files explicitly)                                                                       |
| `sectionsDir` | `'src/docs'`           | where auto-created section docs + their `<!-- toc -->` blocks are written (must be inside a `docPath`, not named `docs`)                      |
| `docsJson`    | `'demo/docs.json'`     | path of the intermediate doc corpus the build writes and re-reads; its directory is created automatically, so you don't need a `demo/` folder |

### Bundle

| field             | default     | purpose                                                                    |
| ----------------- | ----------- | -------------------------------------------------------------------------- |
| `bundleEntry`     | —           | your IIFE entrypoint; omit to use the fallback bundle                      |
| `bundleExternals` | —           | modules left external, e.g. `['jolt-physics']`                             |
| `scriptUrl`       | `/iife.js`  | bundle URL pages load (fallback + output name)                             |
| `bundleOutDir`    | `outputDir` | where the bundle is BUILT; set only when it is itself a published artifact |

### Example checking

| field           | default | purpose                                                                                                   |
| --------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `checkExamples` | `true`  | transpile every executable example at build time; `{ contextKeys: [...] }` extends the resolvable imports |

Every ` ```js ` / ` ```ts ` / ` ```tjs ` / ` ```test ` block is compiled during the build, on
every page, so a syntax error or a bad import is caught once rather than when a reader opens
that page. Illustrative code mistakenly fenced as executable is the commonest catch.

**An unresolvable import warns; it does not fail the build.** The block is demoted to
display-only and the build stays green — which matters when you read the next paragraph.

Example imports resolve against the doc-system's example context, which is `tosijs` and
`tosijs-ui` by default. A library that documents **itself** imports its own package name, so
extend the context rather than turning the check off:

```typescript
checkExamples: { contextKeys: ['my-lib'] }   // ADDED to the defaults, not substituted
```

`checkExamples: false` disables it entirely. Worth knowing what that costs: with the guard
off, one adopter published a page teaching its own core contract with a hard `SyntaxError` in
the example, plus ten pages importing a symbol their barrel did not export.

### Static assets

| field        | default                           | purpose                     |
| ------------ | --------------------------------- | --------------------------- |
| `staticDirs` | `['demo/static']` or `['static']` | dirs copied to the web root |

### Hosting

| field      | default                | purpose                                                                                                                                                                                                                                |
| ---------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `host`     | `'static'`             | `'github-pages' \| 'firebase' \| 'static'` preset                                                                                                                                                                                      |
| `domain`   | derived from `baseUrl` | custom domain → `CNAME` (github-pages); implies `basePath: '/'`                                                                                                                                                                        |
| `basePath` | `'/'`                  | URL prefix; set `'/<repo>'` for a GitHub project page without a custom domain                                                                                                                                                          |
| `preview`  | —                      | `{ host, path?, url?, tunnel? }` — deploy the built site, and optionally expose the live dev server; see [`preview`](#preview--deploy-the-built-site-to-a-host-you-control) and [`preview.tunnel`](#previewtunnel--the-live-workspace) |

### Build toggles & dev server

| field                | default  | purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prebuild`           | —        | `() => void \| Promise<void>` run first, for source-tree codegen (version stamp, icon data, …). Runs before `dist`/output are reset — don't write there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `emitLibrary`        | `false`  | also build the library: `tsc --declaration --incremental --outDir dist` (for repos publishing a package + their docs)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `libraryTsconfig`    | —        | run `tsc -p <path>` for the library build instead (handles root `noEmit`, `removeComments`, custom `outDir`); supersedes `emitLibrary`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `libraryBuild`       | —        | `(ctx: { dist, root, tsconfig? }) => void \| Promise<void>` — fully override the tsc library build; you emit `dist/*.js` + `*.d.ts` for ALL sources. For non-`.ts` sources tsc can't compile (native tjs-lang `.tjs`): run tsc for `.ts` + `tjs convert`/`generateDTS` for `.tjs`. Supersedes `libraryTsconfig`/`emitLibrary`. See `BUILD-TJS-HOOK.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `generateCssPreload` | —        | module to `bun --preload` into the CSS-extraction subprocess (`generate-css` imports your library to burn the theme); needed when that graph reaches non-`.ts` sources (`.tjs`) requiring a Bun loader plugin — point it at a module that registers it. Pairs with `libraryBuild`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `llmsTxt`            | `true`   | emit the `llms.txt` index — `true`, `false`, or `(docs) => string` for a custom one (see below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `epub`               | `false`  | build + ship an ePub of the corpus every build — `true` or `{ author, title, css, cover, coverColor }` (see below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `book`               | —        | curate/reorder the book artifact without touching site nav (see below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `outputDir`          | `'docs'` | served web-root output dir                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `port`               | `8787`   | dev-server port                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `watchPaths`         | —        | extra dev-server watch dirs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `haltijaDev`         | `false`  | give a coding agent eyes on your running dev page (see below); also `HALTIJA_DEV=1`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `openBrowser`        | `false`  | on `bun start`, open (or bring to front) this project's browser tab once the server is up — reused per project via the dev origin, so restarts don't pile up tabs. `true` = auto-detect; a string names the browser; `BROWSER=<name>`/`BROWSER=none` override. macOS reuse via AppleScript; other platforms open (no reuse). Skipped in CI / non-TTY (see below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `preview`            | —        | preview-host target for `bun run deploy` — `{ host, path?, url? }`. Only `host` is required; `path` defaults to `/srv/preview/<name>`. Deploying rsyncs the built site and self-registers its own route, so no shared server config and no DNS change (see below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `editableSources`    | `false`  | Enables the dev server's `/__docstore/source` read+write endpoints, so "edit page source" and a live example's "Save to source" write the actual file. **Off** by default (writing files is opt-in): editing still works read-only — the client falls back to the GitHub raw source — but saving hands back a download. Set `true` to author in place. **Authorization depends on how the request arrived.** The dev server binds every interface (so you can view the site from a phone), but reading serves any file in the repo and writing is remote code execution. So: a request that arrived **directly** is authorized only by a **loopback peer** — you, at this keyboard. A request that arrived **through the tunnel** is authorized only by a **valid session**, earned by redeeming an invite link (`tosijs-tunnel --link`), because "looks local" is exactly what a tunnel counterfeits. Note what this means in practice: a phone on `https://<host>.local:8787` can _view_ the site but cannot save, session or not — reach the workspace through the tunnel URL instead, which is the path the session is for. There is no env-var override. (The endpoint always answers `/__docstore/source` with a real status; it never serves the SPA `index.html`, so a disabled/misconfigured server can't leak the rendered page as the "source".) |
| `memoryLimitMb`      | `4096`   | RSS ceiling for the dev server; past it, print growth-per-rebuild and exit (see below); also `DEV_MEMORY_LIMIT_MB`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `idleTimeoutHours`   | `8`      | exit after this long with no request and no rebuild; `0` disables (see below); also `DEV_IDLE_TIMEOUT_HOURS`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `audit`              | `true`   | dependency-audit gate — `bun audit` synchronously on the initial build and before the dev server binds its port; ungated high+ advisories fail the build (findings annotated with the nature of the risk). `true`/omitted = `{ mode: 'fail', level: 'high' }`; `false`/`{ mode: 'off' }` disables; also `TOSIJS_AUDIT=off\|warn\|fail`. Time-box exceptions via `{ allow: [{ advisory, reason, expires }] }` (see below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

#### Dependency audit gate

`bun audit` knows the registry advisory database; nothing in a normal build ever
asks it, so a high-severity advisory in a transitive dep stays invisible until
someone runs it by hand. The gate asks once, at the point a human is looking:

- **When it runs.** The **initial** build only, and always **synchronously**:
  `bun run build` / `--test` audit inside `buildSite` (a finding fails the build),
  and `devServer` audits just **before it binds the port** (a finding throws, so the
  server never comes up). The audit is sub-second — local dependency resolution plus
  one registry round-trip — so waiting for it costs nothing next to the alternative:
  an async audit spikes a server that is already listening and possibly already in
  use, which reads as a crash and races whatever you'd started doing. A gate you wait
  for cannot be raced. **Watch rebuilds never audit** — that would put a network call
  in your edit loop and break offline dev.
- **It audits once per process**, however many callers there are. That invariant lives
  inside `auditDependencies` (the result is memoized), not in each call site
  remembering to pass `skipAudit`. It has to: the `{ build }` pattern above re-calls
  `buildSite` on every rebuild, so when the flag was the only guard, anyone following
  these docs got a registry round-trip on every keystroke — and offline dev broke.
- **What blocks.** Any advisory at or above `level` (default `high`, so `high` +
  `critical`) that isn't gated. `moderate`/`low` are reported, never fatal.
  Consumer-facing and developer-facing advisories block **alike**: a dev-only
  dependency still runs on your machine, and the time-boxed gate below is the escape
  hatch, so the cost of over-blocking is a two-minute gate entry while the cost of
  under-blocking is a miss.
- **Fails open, not closed, when it can't check.** Offline, registry down, a `bun`
  too old, or the audit exceeding its 20s timeout → it warns and proceeds. It fails
  **closed** only on a real finding.
- **Not downgraded in CI.** Unlike the machine-health preflight (a heuristic about
  someone's local box), an advisory is deterministic and environment-independent, so
  CI is exactly where you want it enforced.

**Each finding is annotated with the _nature_ of the risk** — parsed from the
advisory's CVSS vector (3.x `C/I/A` and 4.0 `VC/VI/VA` both understood) and its CWEs:

| label              | meaning                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `LEAK/ALTER`       | confidentiality or integrity impact — can leak data or execute code                                            |
| `DoS-only`         | availability impact only — resource exhaustion, hang, crash                                                    |
| `DoS?+ESCALATABLE` | scored availability-only, but an escalatable CWE (e.g. prototype pollution) means the vector may understate it |
| `UNCLASSIFIED`     | no or unparseable vector — **treat as worst case**                                                             |

**The report is grouped, sorted, and complete.** `bun audit` emits one entry per
(package, vulnerable-range) pair, so a single advisory against a package present at
several versions arrives several times — on a real tree, **16 entries were 12
advisories across 6 packages**, and the lone `critical` (a VM-context escape leading
to RCE) printed _sixth_, purely because the raw output is in package order. So the
gate:

- **groups by advisory**, listing the affected ranges together (`affects <3.1.3,
  > =9.0.0 <9.0.6`), and reports the honest count (`12 … in 6 packages, from 16
  > findings`) rather than over-stating the workload;
- **sorts worst-first** — severity descending, then by nature, so `LEAK/ALTER` and
  `UNCLASSIFIED` come before `DoS-only` and the thing you must read is line one;
- **lists sub-threshold advisories compactly** (one line each, severity-sorted).
  These are never fatal, but they used to be invisible — and a `moderate` today is a
  `high` the day someone re-scores it;
- **tallies advisories per package** whenever any package produces more than one.
  A single moderate is noise; a dependency that keeps generating them is a **code
  smell**, and dropping a library with a long tail of quasi-flaky advisories is a
  legitimate call that needs the aggregate the per-finding view hides.

This is **annotation, not policy**: it never changes whether a finding blocks, it
just lets you triage in seconds instead of opening four browser tabs. Classification
deliberately fails **closed**, because it has to — measured against a real
44-advisory sample, **20% carried no CVSS vector at all, and those skewed severe**
(4 high, 2 critical). Anything that auto-softened on classification would have been
blind on exactly the worst ones. Whether a vulnerable path is reachable _in your
usage_ is not encoded anywhere and is not knowable from the data — that judgment is
yours, and the time-boxed gate is where it belongs.

**What to expect the first time you turn it on.** The first real adoption (`tosijs`,
12 blocking advisories → zero, **no allowlist entries**) is a good model for the shape
of the work:

- **The findings will be concentrated, not scattered.** Twelve advisories across four
  packages turned out to be _one_ stale toolchain. Read the per-package tally before
  you start patching — it usually names the real culprit, and fixing that clears a
  cluster.
- **Budget for an upgrade, not a pin.** If `brace-expansion` is flagged,
  `GHSA-mh99-v99m-4gvg` marks _every_ version below **5.0.8** affected, so an override
  is mandatory — and `brace-expansion@5` breaks **eslint 8**'s bundled `minimatch@3`
  with `expand is not a function`. So that one pin forces an **eslint 8 → 10**
  migration (flat config + typescript-eslint 8). It also clears the whole
  `minimatch`/`js-yaml`/`flatted` cluster, which is the tally's point.
- **"Prefer the minimal fix" has a limit.** When the minimal fix is blocked by a
  transitive incompatibility like that one, the larger replacement _is_ the correct
  fix, not a failure of discipline.
- **Expect the worst finding to be in a dev dependency.** `tosijs` ships **zero**
  runtime dependencies, and its critical finding — a happy-dom VM-context escape
  leading to RCE — was dev-only, and carried _no CVSS vector at all_. This is why the
  gate blocks regardless of dependency class and why classification never softens a
  verdict: filtering on either would have downgraded exactly that finding to a warning.

**Gating an accepted risk — with a deadline.** You can't always patch immediately.
Instead of silencing a finding forever, gate it with a reason and an **expiry**:

```typescript
audit: {
  allow: [
    {
      advisory: 'GHSA-25h7-pfq9-p65f', // GHSA id, the numeric id, or a package name
      reason: 'no untrusted parse path reaches it; patch tracked in #123',
      expires: '2026-08-15', // YYYY-MM-DD — after this the gate stops suppressing
    },
  ],
}
```

On/after `expires` the gate stops working and the build fails again — the risk is
forced back onto the table rather than living in an allowlist nobody re-reads. A
gate missing a `reason` or a valid `expires` is **ignored** (fail-closed): "gated"
means _explicitly and specifically_ gated. Stale gates (matching no current
advisory) are reported so you delete them.

**Due diligence when you do adopt a patch** (the gate prints this when it blocks):

- Read the advisory. Confirm the patched version actually fixes it and is published
  by the package's real maintainers — a fresh release is also how a hijacked package
  ships.
- Prefer the **minimal** fix: a targeted `overrides`/`resolutions` pin to the patched
  version beats a broad `bun update --latest` that churns dozens of transitive deps,
  each a new supply-chain surface. (This repo's own `flatted` advisory was fixed with
  a one-line `overrides: { "flatted": ">=3.4.2" }`.)
- Treat large churn in a "patch" as itself suspicious; review what moved.

**Continuous drift is GitHub's job, not the gate's.** The gate catches advisories at
build time; advisories published later against an unchanged lockfile are caught by
GitHub Dependabot (alerts are automatic on public repos; add `.github/dependabot.yml`
to also get fix PRs). The two are complementary: Dependabot _notifies_, the gate makes
it _un-ignorable_.

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

#### `preview` — deploy the built site to a host you control

A doc site is a folder of static files, so sharing one is a copy, not a pipeline. Set a
host and deploy:

```typescript
preview: {
  url: 'https://ui.dev.example.com', // optional; also names the route to register
}
```

**Do not put `host` in a committed config.** The bins resolve
`--host=` > `PREVIEW_HOST` > `PREVIEW_SSH` > `~/local-secrets/tosijs-preview.env` > config,
and a committed address means any fork running `bun run tunnel` opens outbound SSH to your
box. Keep it in `~/local-secrets/tosijs-preview.env` — a `700` directory beside your repos,
never inside one, sourced from `~/.zshenv` so scripts and agents see it as well as you.
A profile-only `export` is present for a human and absent for every tool.

That is a _structural_ guarantee rather than a rule, and it needed to be: this project
documented "keep it out of a committed config" here while its own `tosijs-site.config.ts`
published the address in a public repo's history for months. **A credential that has ever
been committed is public — rotate it.** Rewriting history does not un-publish anything.

```bash
bun run deploy        # DRY RUN — shows exactly what would change
bun run deploy --go   # sync, self-register, refresh the host's index
```

**Dry run is the default** because this is `rsync --delete` — the remote must mirror the
build so stale pages can't linger, which is destructive if aimed wrong. It also **warns
when your working tree is dirty**, since `/version.json` records the last _commit_ and a
build from a dirty tree may not match it.

The target must sit **inside a known preview root** — `/srv/preview`, `/srv/www`,
`/var/www/preview` or `/opt/preview` — and strictly inside one, never the root itself.
(An earlier rule accepted "any absolute path at least two levels deep", which happily
admitted `/usr/lib` and `/etc/caddy`; `rsync --delete` would have _mirrored_ those, i.e.
emptied them. Admitting the preview root itself was just as bad in a subtler way: one
dropped path segment would have deleted every other project on the box.) If your host
uses a different location, pass it explicitly and open an issue — the allowlist is
deliberately short.

**Projects register themselves.** With `url` set, the deploy writes a small Caddy
fragment declaring its hostname and root; the server glob-imports
`/srv/preview/_sites/*.caddy`. So adding a project touches no shared file, and with a
wildcard DNS record it needs no DNS change either. The deploy **validates the server
config before reloading** and refuses to reload if invalid — one malformed fragment would
otherwise break routing for every project on that host.

The host's root can serve a generated index of everything deployed (see
`deploy/build-index.sh` in the tosijs-ui repo), which makes it self-describing: what is
on it, and which commit each preview is serving.

> The _static_ preview host has **no write endpoint**, so its security question is
> disclosure rather than code execution. It is gated by an invite-link cookie rather than
> `basicauth`: a password dialog on every phone defeats the point of a shareable link,
> and one shared secret is no stronger. Do not confuse this with exposing a _dev server_
> — that has a write endpoint, and is gated by a per-session magic link; see
> [`preview.tunnel`](#previewtunnel--the-live-workspace) below.

#### Runtimes — what runs where

The doc-site system is a **bun** tool: it shells out (`Bun.$`), builds (`bun build`), and
spawns child processes. `import { buildSite } from 'tosijs-ui/site'` under plain Node
fails with `Cannot find package 'bun'`, which names a symptom rather than the cause — so
to be explicit:

| entry point                          | runtime                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `tosijs-ui/site`                     | **bun** — build/CLI only, never bundled into a page                        |
| `tosijs-ui`, `tosijs-ui/<component>` | a **browser** (or a bundler targeting one); bare Node has no `HTMLElement` |
| `tosijs-ui/icon-svg`                 | anything — deliberately DOM-free, which is why it exists                   |

Module _resolution_ works everywhere as of 1.9.1: shipped code uses explicit `.js`
specifiers, which Node ESM requires and bundlers accept. Before that, `dist/` carried
extensionless relative imports that only bun could resolve — so a Node consumer got
`Cannot find module` on entry points that had nothing to do with bun. That was invisible
here because every lane ran under bun; the consumer lane now imports through Node too.

#### Host bootstrap — do this once per box

Both `tosijs-deploy` and `tosijs-tunnel` write a Caddy fragment ending in
`import preview_site` / `import tunnel_site`. **Those snippets have to exist first**, or
`caddy validate` fails on every deploy forever — and the failure is per-project, so
nothing routes.

The package ships a template at `node_modules/tosijs-ui/deploy/Caddyfile`. It is a
_template_, not a drop-in: `{{ACME_EMAIL}}` (your Let's Encrypt account),
`{{PREVIEW_DOMAIN}}` (the domain your preview hosts live under) and `__PREVIEW_TOKEN__` (the
shared invite secret) have to be filled in.

Installing it with the placeholders intact would give you a preview host whose invite gate
is a literal string published in a public repo, issuing certificates under someone else's
account. So don't do it by hand — **`tosijs-caddy-install` does it and refuses when it would
go wrong**:

```bash
# 1. on the box, once: the values the template needs
#    (a secret you invent; never in the Caddyfile, never in git)
cat > /etc/caddy/preview.env <<'EOF'
PREVIEW_TOKEN=<a long random string>
ACME_EMAIL=you@example.com
PREVIEW_DOMAIN=dev.example.com
EOF

# 2. from your project — DRY RUN, prints a diff against the live config, changes nothing
tosijs-caddy-install

# 3. once the diff looks right
tosijs-caddy-install --go
```

It reads `preview.host` from your site config (or `--host=user@box`, or `PREVIEW_HOST`), and:

- **substitutes on the box**, reading `/etc/caddy/preview.env` — so `PREVIEW_TOKEN` never
  travels to your laptop, never appears in your shell history, and is redacted out of the
  diff before it is printed;
- **refuses to install** if any placeholder survived substitution, naming the line — the
  guard that a hand-rolled `sed` pipeline does not have;
- **validates before swapping**: `caddy fmt` then `caddy validate` against a scratch file,
  and the live config is replaced by an atomic `mv` only once it parses, so a bad template
  leaves the running site untouched;
- is **dry-run by default**, because it replaces `/etc/caddy/Caddyfile` wholesale — if the
  box serves anything else through Caddy, read that diff before `--go`.

Bring your own template with `--template=./path/to/Caddyfile`; the same guards apply.

You also want a wildcard DNS record (`*.dev.example.com`) pointing at the box, so a new
project needs no registrar visit, and sshd running `GatewayPorts no`.

#### Linking the books the build produces

The build writes an ePub per volume — but a file nobody links to is a file nobody can
download. Three ways to surface them, cheapest first.

**A marker in any page.** Drop this where you want the list:

```text
<!-- epub-downloads -->
```

It is replaced at build time with one markdown link per volume, using each volume's title
and its real output URL. Substituted into the corpus before pages render, so the static
HTML and the hydrated SPA show the same thing.

**A manifest.** Every build writes `/epub-volumes.json` to the output dir:

```json
[
  { "book": "", "title": "my-project", "filename": "my-project.epub", "url": "/my-project.epub" },
  { "book": "field-guide", "title": "my-project — field-guide",
    "filename": "my-project-field-guide.epub", "url": "/my-project-field-guide.epub" }
]
```

**The helper**, if you are generating links in your own code:

```typescript
import { listEpubVolumes, epubVolumeIdentity } from 'tosijs-ui/site'
```

> **Do not hard-code the filename.** It is _derived_ — `<project>-<volume>.epub` — so a
> hand-written link rots the moment a volume is renamed, and rots silently, since nothing
> checks that a link points at a file the build made. That is exactly how a project ships a
> valid ePub that nobody can download. The marker, the manifest and the helper all derive
> the name from the same function the ePub build uses, so they cannot disagree.

Note the title is for humans and the filename is an identifier: `epub.volumeTitles` renames
the former without moving the latter, so published links survive a retitle.

#### `preview.tunnel` — the live workspace

The static preview publishes a _snapshot_. `preview.tunnel` publishes the **running dev
server on your machine**, at an authenticated public URL, so you can read and edit real
source from a phone or a borrowed laptop. The box does no compute — it terminates TLS and
routes — which is what lets one small VPS front many projects.

```typescript
preview: {
  host: 'me@vps.example.com',
  path: '/srv/preview/my-project',
  url:  'https://my-project.dev.example.com',        // static snapshot
  tunnel: {
    url: 'https://my-project.edit.dev.example.com',  // live workspace
  },
}
```

Two hostnames, because the postures genuinely differ:

| host                             | what it is                    | gate            |
| -------------------------------- | ----------------------------- | --------------- |
| `<project>.dev.example.com`      | read-only snapshot, shareable | invite cookie   |
| `<project>.edit.dev.example.com` | live workspace, yours         | session, always |

```bash
tosijs-tunnel            # open the tunnel (foreground; Ctrl-C closes it)
tosijs-tunnel --status   # is one already up?
tosijs-tunnel --link     # print a fresh edit link + its 7-character code (5 min)
tosijs-tunnel --close    # close any tunnel this project opened
```

**How the gate works.** `--link` prints a URL carrying a short-lived token (see _Link security_ below). Opening it
once exchanges the token for a durable `HttpOnly; Secure; SameSite=Lax` session cookie
and redirects to the same URL with the token stripped — so the token never lands in
history, in the address bar, or in a `Referer`. A second window shares the cookie. A link
that has already been used says so rather than failing silently, because a chat app's
link-preview bot will often spend it before you click.

**What authorizes a write is the LISTENER, not the peer or a header.** The dev server
binds a separate loopback-only port for tunnel traffic; anything arriving there needs a
valid session to write, whatever its address claims. This matters because a reverse
tunnel counterfeits "local" by construction — an earlier design inferred "local" from
absent `X-Forwarded-*` headers and therefore failed _open_ for every forwarder that
omits them.

| option                  | default                       | purpose                                                                                                    |
| ----------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `tunnel.url`            | —                             | the authenticated public URL fronting the workspace                                                        |
| `tunnel.requireToken`   | `true`                        | require a session even to VIEW; set `false` for a live read-only audience                                  |
| `tunnel.linkPolicy`     | `'window'`                    | `'window'` — a link is redeemable repeatedly until it ages out; `'single-use'` — spent on first redemption |
| `tunnel.linkTtlMinutes` | `5`                           | how long a link stays redeemable                                                                           |
| `tunnel.remotePort`     | derived from the project name | loopback port on the box; derived (FNV-1a into 9000-9899) so two projects can't collide                    |
| `tunnel.localPort`      | `port + 1`                    | the loopback port the tunnel forwards to                                                                   |

#### The token is seven characters, and you can type it

`--link` prints the URL **and the code on its own line**, because on the device this exists
for you are not pasting anything — you are reading characters off one screen and entering
them on another:

```
🔗 Edit link — usable on more than one device for 5 min, then it expires:
   https://myproject.edit.dev.example.com/?t=K7MQ2XZ

   code:  K7MQ2XZ   (case-insensitive)
```

It is **Crockford base32** — no `I`, `L`, `O` or `U` — so the mistypes that hurt most on a
headset's floating keyboard are impossible rather than merely unlikely: there is no `O` to
confuse with `0` and no `l` to confuse with `1`. Case is folded on redemption, `I`/`L` are
accepted as `1` and `O` as `0`, and hyphens are ignored, so someone who types what they
_think_ they saw still gets in. The failure this designs out is a correct human being told
they typed it wrong.

Seven characters is ~35 bits, and the server makes that plenty by capping how fast anyone
can guess: **redemption is serialized, and every attempt takes at least 100ms** — success or
failure alike. Ten attempts a second against 32⁷ ≈ 3.4 × 10¹⁰ is ~111 years to exhaust, and
2,944 guesses inside a five-minute window: **about 1 in 11 million** (measured, not
estimated — 20 concurrent attempts complete at 9.8/sec).

Opening more connections buys nothing, because concurrency is one. The floor covers successes
too, so response time cannot answer _was that the right token?_ — delaying only failures would
turn the throttle into the oracle that `safeEqual`'s constant-time comparison exists to
prevent.

After **ten consecutive failures the slot widens to a second** — another factor of ten
against a guesser, and nothing at all against a human, who does not mistype seven characters
ten times running and would wait a second if they did.

There is **no lockout** for ordinary use: a lockout a few mistypes can trigger is a denial of
service against you, on the one credential you need in order to work. The door never closes on
a human; it only gets slower to knock on.

Under an actual flood the endpoint sheds load and refuses everyone, you included, and that is
deliberate. Redeeming a link _while someone is attacking the endpoint_ is a non-goal — what has
to hold is that brute force fails hard, and it does. Note where the security actually comes
from: the **slot** sets the guess rate, the queue depth only decides how a burst is absorbed.

The **session** token is untouched at 128 bits. It lives in an HttpOnly cookie, is never
typed, and is the credential that actually authorises writes. That asymmetry is the design;
only the half a human has to transcribe got shorter.

#### Link security — pick your level

A link is redeemable for **5 minutes**, as many times as you like, and hands over a session
cookie. The cookie is the durable credential; the link only delivers it. For those five
minutes the link is a bearer token — anyone who sees the URL can mint a session — which is a
deliberate trade: a credential too painful to use is one people route around, and the
measured alternative was developers abandoning the tunnel to type LAN IP addresses instead.

```typescript
tunnel: {
  linkPolicy: 'single-use',  // spend it on first redemption
  linkTtlMinutes: 2,         // …and narrow the window
}
```

**This default was deliberately loosened.** Links used to be single-use, and that collided
with the feature's own purpose: glance at a link and close the tab and you need a new one;
open it on your laptop, then reach for your phone, and it is dead — in a workspace built for
reading your uncommitted tree _on a phone_. One project replaced it with a never-expiring
link of their own. That is the argument: security people route around is not security, it is
friction plus a weaker system built beside it.

So the bound moved from _uses_ to _time_. A token scraped from a log or a chat preview is
still worthless — after the window closes rather than after the first redemption — and the
window is short and configurable.

**Ratchet up** with `linkPolicy: 'single-use'` when a link travels somewhere you do not
control (pasted into a shared channel, say), and shorten `linkTtlMinutes`. **Ratchet down**
with a longer TTL for a link you want to keep working across a session. Widening reuse never
widens lifetime: an expired link is refused under either policy.

`requireToken` defaults to **`true`**: a workspace mirrors an uncommitted tree, and the
hostname is not a secret — Let's Encrypt publishes every certificate it issues to public
Certificate Transparency logs, so the URL is discoverable by construction. If you want to
show someone the site, point them at the static preview; that is what it is for.

**What the hostname discloses, and what to do about it.** The edit host's _existence and
name_ are public by construction, even though its content is session-gated. Choose
accordingly:

- **Project name public, content private** — the normal case. Nothing to do; the session
  gate carries the weight. This is the posture the defaults assume.
- **Project _name_ sensitive** — use a random string as the subdomain. `tunnel.url` is
  arbitrary and self-registration doesn't care: `https://khx7q2mwp4.edit.dev.example.com`.
  CT logs then show only that something unnamed exists.
- **Project _existence_ sensitive** — don't use this feature. A public hostname whose
  existence must be secret is a contradiction, and no naming scheme fixes it.

A random-string hostname is a **capability**, and hostnames leak through different
channels than links do — DNS queries, browser history, `Referer`. It buys obscurity of
the name; it is never a substitute for the session gate.

> Not recommended: a wildcard certificate (`*.edit.dev.example.com` via DNS-01) would
> keep individual names out of CT entirely, but it puts a DNS API credential on the
> preview box — escalating a box compromise from "the previews it serves" to
> "cert-minting for the whole zone". That is the wrong trade for a convenience feature,
> and needing no credentials at all is exactly what makes on-demand HTTP certs and
> self-registration clean.

Writing source additionally requires [`editableSources`](#build-toggles--dev-server) to be
enabled. Note the two gates compose but are not the same: `editableSources` says _this
server may write to disk at all_; the session says _you may ask it to_.

The box should also run sshd with `GatewayPorts no`, so the forwarded port binds the
box's loopback rather than the internet. That is defence in depth, not the wall — verify
it yourself with `sshd -T | grep gatewayports`.

#### `book` and `hidden` — multiple volumes from one corpus

Two pieces of doc metadata decide **which book a page binds into, and whether it is
published at all**. Both are inherited down the `parent` chain, so you mark a section
rather than every leaf.

```text
<!--{ "book": "field-guide" }-->              → bind into a volume called "field-guide"
<!--{ "book": ["default", "field-guide"] }--> → bind into BOTH
<!--{ "book": "none" }-->                     → on the site, in NO book
<!--{ "hidden": true }-->                     → not published at all
```

| `book`        | result                                          |
| ------------- | ----------------------------------------------- |
| _(unset)_     | the default volume — `<name>.epub`              |
| `"some-name"` | its own volume — `<name>-some-name.epub`        |
| `["a", "b"]`  | bound into both volumes                         |
| `"default"`   | the main volume, named so a list can include it |
| `"none"`      | on the site, in no volume                       |

A list is what gets you shared front matter — a glossary, a licence page, a copyright
notice — bound into several volumes from one source file rather than copied per book.
`"none"` anywhere in a list wins: `["default", "none"]` is a contradiction, and the
reading that withholds is the safe one.

**The nearest declaration wins, outright.** A section can set `book: "field-guide"` and a
chapter inside it can still divert (`book: "other"`), join several volumes, or opt out
(`"none"`). A list _replaces_ an inherited value rather than adding to it, so a child is
never surprised by a volume it did not name.

**`hidden: true` means not published anywhere**: absent from `docs.json`, from the
generated pages, from every book, and from `llms.txt`. It is inherited, and a child
_cannot_ un-hide itself — accidentally publishing one chapter of a withheld section is
the failure worth preventing. `draft: true` in YAML frontmatter sets it.

> Before 1.9.0 `hidden` only removed a doc from the nav and the book, while its full text
> was still written into `docs.json` **and** it still got a pre-rendered page at its own
> URL. If you have been using `draft:` for working notes, they were public. They are not
> any more.

Volumes are discovered from the corpus — no extra configuration. Each is built in its own
child process, and `epub` settings (title, author, css, the `book` manifest) apply to all
of them. Note the two senses of the word: `config.book` is the **manifest** that curates
and orders docs _within_ a volume; a doc's `book` metadata selects **which** volume.

#### `/version.json` — what am I looking at?

Every build writes a small build-identity file to the web root:

```json
{
  "generator": "1.8.0",
  "site": "tosijs-ui",
  "commit": "66fbc589",
  "commitTime": "2026-07-30T09:10:52+03:00"
}
```

`generator` is the `tosijs-ui` version that produced the site; `commit` /`commitTime`
identify **your project's** source. Nothing exposed this before — `src/version.ts` is
the library version and says nothing about which commit built a given deploy.

It matters most where a deploy is a _snapshot_: a preview host serves whatever was
last pushed to it, so a reviewer can report a bug you fixed this morning with no way to
tell from the page which of you is stale. Same after a partial deploy of a live site.

**Deliberately deterministic — there is no build timestamp.** `docs/` is committed in
these projects, so anything that varied per build would diff on every commit and train
everyone to ignore it. Identity comes from the commit, so rebuilding the same source
twice is byte-identical. There is likewise no `dirty` flag: a build from a dirty tree
reports its last commit, which may not describe what was built, so that warning belongs
at deploy time where a human can act on it — not baked into a committed file that would
then be permanently wrong.

Git fields are **omitted** (never blank) when git isn't available — an adopter need not
be in a repo, and a build must not fail for want of git metadata.

#### `openBrowser` — one dev tab per project

Set `openBrowser: true` and `bun start`, once the server is listening, opens the dev
page in your browser — and on the **next** launch or restart it brings that **same
tab** forward instead of stacking up a new one. This is create-react-app's "open the
tab" trick, adapted:

- **The tab's identity is the dev origin** — `https://localhost:<port>`. Because each
  project runs its own dev port, that yields exactly **one tab per project**: restart
  a project and its tab returns; start a sibling on another port and it gets its own;
  two runs of the same project never spawn a second tab. (The origin is the key on
  purpose — a name/hash marker in the URL would be dropped by the doc-browser SPA on
  the first in-page navigation and couldn't identify the tab later. The origin
  survives every navigation.)
- **macOS** does the reuse via AppleScript, auto-detecting a **running** Chrome / Brave
  / Edge / Chromium / Safari (so it never launches a browser you don't use). Driving
  another app by AppleScript triggers a **one-time** "…wants to control <Browser>"
  automation prompt — approve it once. Other platforms open via `open` / `xdg-open` /
  `start` (a normal new tab, no reuse).
- **Choosing the browser:** pass a string (`openBrowser: 'Google Chrome'`, `'safari'`,
  `'brave'`, …), or set `BROWSER=<name>` at the shell (which wins). `BROWSER=none`
  disables it for one run.
- **When it's skipped:** off by default; in **CI**; when stdout isn't a **TTY**; and
  on **watch rebuilds** (it only fires at launch). Best-effort throughout — a failure
  degrades to a plain open or a no-op and never blocks or crashes the server.

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

### Mount-agnostic builds (`basePath` only affects metadata)

The build emits every **functional** URL — nav / content links, `scriptUrl`,
`stylesUrl`, favicon, `docsUrl` — **relative to each page**, so a single build
works at a `/repo` project page, a custom-domain root, or a moved mount with **no
rebuild**. `basePath` now affects only **metadata** URLs (`canonical`, `og:url`,
`og:image`, `sitemap.xml`), which need the real absolute served path for SEO.

The practical payoff: adding a custom domain to a project page — GitHub flips the
site to the domain root the instant you set it — no longer serves a broken,
unstyled shell in the window before you rebuild with `basePath: '/'`. The assets
resolve at whatever mount the page is served from. (Keep `basePath` correct anyway
so crawlers see canonical URLs at the real path; a stale `basePath` now only
mis-states metadata, it doesn't 404 the page.)

Two runtime pieces are still mount-locked (tracked in issue #16): the hydrated
SPA's own nav/`pushState` hrefs (they use a root-absolute `/slug/`, correct at a
root mount, drifting under `/repo`) and the same-origin tjs-lang loader base
(`__TJS_LOCAL_BASE`). Body-content **wikilinks** (`[[slug]]` → `/slug/`) are
likewise absolute, since they come from the renderer shared with the client. None
of these affect first paint or the no-JS asset load — the custom-domain-cutover
case is fully covered.

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
| dependency audit gate                       | `site/audit-guard.ts`                                                    |
| open dev browser tab (reuse per project)    | `site/open-browser.ts`                                                   |
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
