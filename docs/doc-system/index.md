# doc-system

`<tosi-doc-system>` turns a folder of pre-rendered, statically-served pages into a
fast, SPA-like documentation site **without giving up SEO or web-1.0 fallback**.

Each page is plain HTML — optimized `<head>`, the doc's markdown already rendered
to HTML, and a real `<ul>` of links to every other page — so search engines and
no-JS browsers get everything. When the library's IIFE bundle loads, the
`<tosi-doc-system>` element upgrades that static content into the interactive
[doc-browser](?doc-browser.ts): client-side navigation (no full reloads), live
code examples, search, responsive navigation, and a settings menu (theme +
language).

```html
<body>
  <tosi-doc-system docs="/docs.json" config='{"projectName":"My Project"}'>
    <article class="doc-content"><!-- markdown pre-rendered to HTML --></article>
    <ul class="doc-nav"><!-- links to every page --></ul>
    <ul class="doc-navbar"><!-- header-bar links --></ul>
  </tosi-doc-system>
  <script src="/iife.js"></script>
</body>
```

## Attributes

- `docs` — URL of the generated `docs.json` (default `/docs.json`). The whole doc
  corpus is the size of a JPEG, so the client fetches it once and renders any page
  instantly.
- `config` — inline JSON `{ projectName, projectLinks }` baked in at build time.
- `localized` — URL of a tab-separated translation table; when set, it powers the
  settings menu's language picker.
- `routing` — `''` (default) drives the page with clean `/slug/` URLs. Set
  `"memory"` for a **self-contained** instance whose navigation never touches the
  page URL or history — for embedding the docs in a dialog, side panel, or
  floating element. (A `<tosi-doc-system>` nested inside another one — e.g. the
  live demo on this page — is forced to memory routing automatically, and a demo
  nested two levels deep renders an inert placeholder instead of recursing.)
- `route` — memory routing only: the current doc's slug. Set it to navigate the
  embedded browser to a doc; it's reflected back here as the user clicks around,
  so a host can observe/bind it (e.g. to remember where a help panel was left).
- `accent` / `background` / `text` — base theme colors (most of the palette is
  derived from `accent` via color math).

The element is light-DOM (no shadow root) so the pre-rendered markdown remains the
real, indexable page content until hydration replaces it with the live browser.
Live-example modules default to the `xinjs` / `xinjsui` IIFE globals; override by
setting the element's `context` property before it connects.

A self-contained, controllable embed (e.g. docs in a floating panel):

```html
<tosi-doc-system docs="/docs.json" routing="memory" route="data-table">
</tosi-doc-system>
```
