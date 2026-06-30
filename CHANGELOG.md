# Changelog

## 1.6.14

Lighter live-example transpilation. Additive; affects only how the live-example
runner loads its (optional, lazy) transpiler.

### Changed

- **Live examples now use tjs-lang 0.8.5's self-contained browser bundles**
  (`tjs-lang/browser` + `tjs-lang/browser/from-ts`). The transpiler is a single
  self-contained chunk, and the TypeScript compiler is **lazy-loaded from a CDN at
  runtime** only when a `ts` example actually transpiles — so `typescript` (~MB)
  and the transpiler's own deps are never in a consumer's dependency graph. This
  also fixes the `ts` example path, which previously tried to load the TypeScript
  compiler through a CDN transform that timed out on its size.
- `tjs-lang` optional peer bumped to `^0.8.5`.

### Fixed

- A garbled character in the first `example` doc snippet that made it throw.

## 1.6.13

The documentation system becomes a real publishing pipeline: every doc site can
now emit an **ePub** of the whole corpus, **print to PDF** from the browser, and
**deep-link every example from the book back to the live site**. All changes are
**additive — no breaking changes** — and concern the doc-site tooling
(`tosijs-ui/site`) and doc browser, not the components.

### Added

- **ePub of the whole doc site** (`tosijs-ui/site`). Set `epub: true` (or an
  options object) in the site config and the build emits a valid EPUB 3 of the
  corpus alongside the static pages, regenerated on every build:
  - one chapter per doc in nav-tree order, a readable **Contents page** in the
    reading flow plus the reader's Contents drawer (EPUB3 `nav.xhtml` + EPUB2
    `toc.ncx`), and a customizable stylesheet (`epub.css` / default force-wraps
    code listings)
  - an **auto-generated cover** from the title + favicon (`epub.cover` /
    `epub.coverColor` to override); needs the optional `@resvg/resvg-js`, and is
    omitted gracefully if it's absent
- **Print to PDF** from the doc browser — a "Print as PDF" item in the settings
  menu assembles the whole corpus into a print-styled window and opens the print
  dialog. No server, no headless browser. (A headless `buildPdf` is also available
  for CI via `bun run book:pdf`, not deployed.)
- **"Download ePub"** item in the settings menu (alongside Print), linking the
  built book.
- **Example anchors + book deep links.** Every live example gets a stable anchor
  (`/{slug}/#example-1`, or a custom `id` via a ` ```js#my-id ` fence on any block
  of the group). Arriving at such a URL scrolls the example into view with a brief
  highlight. Each example in the ePub/PDF links back to its anchor on the live
  site — a reader is one tap from the real, interactive, editable version.

### Removed

- The broken **bundlejs** size badge (bundlejs errors computing the bundle).

### Notes

- The ePub needs `happy-dom` (dev dep) + the `zip` CLI; the generated cover needs
  the optional `@resvg/resvg-js`.

## 1.6.12

Packaging improvements for independent, tree-shakeable consumption. All changes
are **additive — no breaking changes**; one minor behavioral edge case is noted
below.

### Added

- **Subpath exports**, so an app can import only what it needs without the barrel
  dragging in dev tools:
  - curated: `tosijs-ui/icons`, `tosijs-ui/code-editor`, `tosijs-ui/live-example`,
    `tosijs-ui/doc-browser`, `tosijs-ui/diff`, `tosijs-ui/theme`
  - per-component wildcard: `import { tosiRating } from 'tosijs-ui/rating'`
    (resolves `dist/rating.js`, registering just that element)

  The full barrel `import 'tosijs-ui'` is unchanged and still registers every
  `<tosi-*>` element.

### Changed

- **`menu`, `tooltip`, and `float` now inject their stylesheet and register their
  global listeners on first use, not at import.** Importing these modules (or the
  barrel) no longer has import-time side effects. This also fixes a latent bug
  where the menu `keydown` handler attached to `document.body` at import time,
  which may not exist yet.

### Possible edge case

If you imported `menu` / `tooltip` / `float` **purely for the side effect** — i.e.
you hand-author markup with the internal classes (`.tosi-menu`, `.tosi-tooltip`,
…) and relied on a bare `import` injecting the stylesheet, **without** ever
calling the API (`popMenu`, `popDropMenu`, `initTooltips`, `showTooltip`) or using
the `<tosi-*>` element — those styles now apply only once the API/element is first
used. Normal usage (the element creators, the `<tosi-*>` elements, and the
`popMenu`/`initTooltips` entry points) is unaffected.
