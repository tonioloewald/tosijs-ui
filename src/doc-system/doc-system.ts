/*#
# doc-system

`<tosi-doc-system>` turns a folder of pre-rendered, statically-served pages into a
fast, SPA-like documentation site **without giving up SEO or web-1.0 fallback**.

Each page is plain HTML — optimized `<head>`, the doc's markdown already rendered
to HTML, and a real `<ul>` of links to every other page — so search engines and
no-JS browsers get everything. When the library's IIFE bundle loads, the
`<tosi-doc-system>` element upgrades that static content into the interactive
[doc-browser](?doc-browser.ts): client-side navigation (no full reloads), live
code examples, search, and responsive navigation.

```html
<body>
  <tosi-doc-system docs="/docs.json" config='{"projectName":"My Project"}'>
    <article class="doc-content"><!-- markdown pre-rendered to HTML --></article>
    <ul class="doc-nav"><!-- links to every page --></ul>
  </tosi-doc-system>
  <script src="/iife.js"></script>
</body>
```

## Attributes

- `docs` — URL of the generated `docs.json` (default `/docs.json`). The whole doc
  corpus is the size of a JPEG, so the client fetches it once and renders any page
  instantly.
- `config` — inline JSON `{ projectName, projectLinks }` baked in at build time.

The element is light-DOM (no shadow root) so the pre-rendered markdown remains the
real, indexable page content until hydration replaces it with the live browser.
Live-example modules default to the `xinjs` / `xinjsui` IIFE globals; override by
setting the element's `context` property before it connects.
*/

import { Component, ElementCreator, StyleSheet } from 'tosijs'
import { createDocBrowser, Doc, ProjectLinks } from '../doc-browser'
import { docSystemStyleSpec } from './doc-system-styles'

interface DocSystemConfig {
  projectName?: string
  projectLinks?: ProjectLinks
}

export class TosiDocSystem extends Component {
  static preferredTagName = 'tosi-doc-system'

  static initAttributes = {
    docs: '/docs.json',
    config: '',
    // Base theme colors — most of the palette is derived from `accent`.
    accent: '',
    background: '',
    text: '',
  }

  // Modules exposed to live examples. Defaults to the IIFE globals on connect.
  context?: Record<string, any>

  // Light DOM: leave the pre-rendered children in place until render() swaps in
  // the live browser. (null = framework leaves our children alone, as in tosi-md.)
  content = null

  // The loaded corpus and the mounted browser; both also act as one-time guards.
  private corpus?: Doc[]
  private browser?: HTMLElement

  private stylesApplied = false

  // Inject the theme synchronously on connect (before the async corpus load) so a
  // static page is styled as soon as the bundle runs, and wire automatic dark mode.
  private applyStyles(): void {
    if (this.stylesApplied) return
    this.stylesApplied = true
    // When the generator has burned the theme into a static <link>, the page is
    // already styled (no JS / no flash) — don't inject a duplicate. Otherwise this
    // is a drop-in usage, so inject the computed theme.
    if (!document.querySelector('link[data-tosi-doc-system]')) {
      StyleSheet(
        'tosi-doc-system',
        docSystemStyleSpec({
          accent: this.accent || undefined,
          background: this.background || undefined,
          text: this.text || undefined,
        })
      )
    }
    const dark = matchMedia('(prefers-color-scheme: dark)')
    const syncDark = () =>
      document.body.classList.toggle('darkmode', dark.matches)
    syncDark()
    dark.addEventListener('change', syncDark)
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.applyStyles()
    // Async data source: fetch once, then let the normal render pipeline mount.
    if (this.corpus === undefined) {
      const url = this.docs || '/docs.json'
      fetch(url)
        .then((response) => response.json())
        .then((corpus: Doc[]) => {
          this.corpus = corpus
          this.queueRender()
        })
        .catch((error) =>
          console.error('<tosi-doc-system> could not load docs from', url, error)
        )
    }
  }

  render(): void {
    super.render()
    if (this.corpus === undefined || this.browser !== undefined) return

    let config: DocSystemConfig = {}
    if (this.config) {
      try {
        config = JSON.parse(this.config)
      } catch {
        console.warn('<tosi-doc-system> ignoring invalid config attribute')
      }
    }

    // Adopt the pre-rendered markdown for the landing page so it is hydrated in
    // place, never re-rendered. createDocBrowser grafts this node into its content
    // area; the static nav list (already crawled) is replaced by the reactive one.
    const contentElement =
      (this.querySelector('.doc-content') as HTMLElement | null) || undefined

    this.browser = createDocBrowser({
      docs: this.corpus,
      routing: 'path',
      context: this.context || {
        tosijs: (globalThis as any).xinjs,
        'tosijs-ui': (globalThis as any).xinjsui,
      },
      projectName: config.projectName,
      projectLinks: config.projectLinks,
      contentElement,
    })

    this.replaceChildren(this.browser)
  }
}

export const tosiDocSystem =
  TosiDocSystem.elementCreator() as ElementCreator<TosiDocSystem>
