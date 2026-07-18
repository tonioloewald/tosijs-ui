/*#
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
*/

/*{ "parent": "Appendices" }*/

import {
  Component,
  ElementCreator,
  StyleSheet,
  elements,
  tosi,
  vars,
} from 'tosijs'
import { createDocBrowser, Doc, ProjectLinks, LinkItem } from '../doc-browser'
import { buildSlugMap, legacyQueryPath } from './routing'
import { buildBookHtml, slugify } from './book-html'
import { docSystemStyleSpec } from './doc-system-styles'
import { icons } from '../icons'
import { popMenu } from '../menu'
import { i18n, setLocale, initLocalization } from '../localize'
// Side-effect: register <tosi-css-var-editor> so doc pages can drop the live CSS-var
// tweaker under an example. Part of the doc-system, NOT re-exported from tosijs-ui.
import './css-var-editor'

const { button, div } = elements

interface DocSystemConfig {
  projectName?: string
  projectLinks?: ProjectLinks
}

const PREFS_KEY = 'tosi-doc-system-prefs'

export class TosiDocSystem extends Component {
  static preferredTagName = 'tosi-doc-system'

  static initAttributes = {
    docs: '/docs.json',
    config: '',
    localized: '',
    // Routing mode. '' (default) → clean `/slug/` URLs that drive the page. Set
    // 'memory' (or 'internal') for a self-contained instance that never touches
    // the page URL — for embedding the docs in a panel, dialog, etc. A nested
    // <tosi-doc-system> (inside a live example) is forced to 'memory' too.
    routing: '',
    // Memory routing only: the current doc slug. Set it to navigate the embedded
    // browser; it's reflected back here as the user clicks around, so a host can
    // bind/observe it (e.g. docs in a floating element).
    route: '',
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

  // Route-reflection bookkeeping (memory routing): the last slug applied to the
  // browser, so external `route` changes navigate but internal navigation (which
  // writes `route` back) doesn't re-navigate or loop.
  private appliedRoute = ''
  private suppressed = false

  // How many <tosi-doc-system> ancestors this element has, crossing shadow
  // boundaries. 0 = the page's own; ≥1 = embedded in another (e.g. the live
  // demo on the doc-system page). Used to force memory routing on nested
  // instances and to stop runaway recursion (a doc page that demos itself).
  private nestingDepth(): number {
    let depth = 0
    let node: Node | null = this.parentNode
    while (node) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).tagName === 'TOSI-DOC-SYSTEM'
      ) {
        depth++
      }
      node = node.parentNode || (node as ShadowRoot).host || null
    }
    return depth
  }

  // User theme/locale preferences (persisted to localStorage).
  private prefs: any
  private stylesApplied = false

  // ---- Theme ---------------------------------------------------------------

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
  }

  private applyThemePrefs = (): void => {
    const theme = this.prefs.theme.value
    const dark =
      theme === 'dark' ||
      (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    const contrast = this.prefs.highContrast.value
    document.body.classList.toggle('darkmode', dark)
    document.body.classList.toggle('high-contrast', contrast)
    // Also on <html>, because the generated pages set it there BEFORE first paint
    // (a static page is now painted, not hidden, so a dark reader would otherwise
    // see a flash of the light theme — and only a head script can read the stored
    // preference). If we left that class alone, switching to light would clear it
    // from <body> while <html> still supplied the dark vars, and the page would be
    // stuck dark. Other code watches `body.darkmode` (e.g. the code editor), so the
    // body class stays authoritative — this just keeps the two from disagreeing.
    document.documentElement.classList.toggle('darkmode', dark)
    document.documentElement.classList.toggle('high-contrast', contrast)
  }

  private persistPrefs(): void {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          theme: this.prefs.theme.value,
          highContrast: this.prefs.highContrast.value,
          locale: this.prefs.locale.value,
        })
      )
    } catch {
      // localStorage may be unavailable (private mode); preferences just won't persist.
    }
  }

  private initPrefs(): void {
    let saved: any = {}
    try {
      saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    } catch {
      /* ignore */
    }
    this.prefs = tosi({
      prefs: {
        theme: saved.theme || 'system',
        highContrast: saved.highContrast || false,
        locale: saved.locale || '',
      },
    }).prefs

    this.applyThemePrefs()
    matchMedia('(prefers-color-scheme: dark)').addEventListener(
      'change',
      this.applyThemePrefs
    )
    this.prefs.theme.observe(() => {
      this.applyThemePrefs()
      this.persistPrefs()
    })
    this.prefs.highContrast.observe(() => {
      this.applyThemePrefs()
      this.persistPrefs()
    })
    this.prefs.locale.observe(() => this.persistPrefs())
  }

  // ---- Localization --------------------------------------------------------

  private async initLocale(): Promise<void> {
    if (!this.localized) return
    try {
      const text = await (await fetch(this.localized)).text()
      initLocalization(text)
      if (this.prefs.locale.value) setLocale(this.prefs.locale.value)
    } catch (error) {
      console.warn(
        '<tosi-doc-system> could not load localization from',
        this.localized,
        error
      )
    }
  }

  // ---- Settings menu -------------------------------------------------------

  private settingsButton(): HTMLElement {
    return button(
      {
        class: 'iconic',
        // Header buttons default to the brand color (invisible on the brand bar);
        // use the link color like the nav toggle so the icon is visible.
        style: { color: vars.linkColor },
        title: 'settings',
        onClick: (event: Event) => {
          const menuItems: any[] = []

          // Print / ePub of the whole corpus, before a separator + the prefs.
          let projectName = ''
          try {
            projectName = JSON.parse(this.config || '{}').projectName || ''
          } catch {
            // ignore — fall through to document.title
          }
          const bookTitle = projectName || document.title || 'Documentation'
          menuItems.push({
            caption: 'Print as PDF',
            icon: 'printer',
            action: () => {
              const win = window.open('', '_blank')
              if (!win) {
                window.alert(
                  'Allow pop-ups to print the documentation as a book.'
                )
                return
              }
              win.document.open()
              win.document.write(
                buildBookHtml(this.corpus as any, {
                  title: bookTitle,
                  autoPrint: true,
                })
              )
              win.document.close()
            },
          })
          menuItems.push({
            caption: 'Download ePub',
            icon: 'book',
            action: () => {
              const link = document.createElement('a')
              link.href = `/${slugify(bookTitle)}.epub`
              link.download = ''
              link.click()
            },
          })
          menuItems.push(null)

          const localeOptions = (i18n.localeOptions.value as any[]) || []
          if (localeOptions.length > 1) {
            menuItems.push({
              caption: 'Language',
              icon: 'globe',
              menuItems: localeOptions.map((locale) => ({
                caption: locale.caption,
                icon: locale.icon,
                checked: () => locale.value === i18n.locale.value,
                action: () => {
                  this.prefs.locale.value = locale.value
                  setLocale(locale.value)
                },
              })),
            })
          }
          menuItems.push({
            caption: 'Color Theme',
            icon: 'rgb',
            menuItems: [
              {
                caption: 'System',
                checked: () => this.prefs.theme.value === 'system',
                action: () => (this.prefs.theme.value = 'system'),
              },
              {
                caption: 'Dark',
                checked: () => this.prefs.theme.value === 'dark',
                action: () => (this.prefs.theme.value = 'dark'),
              },
              {
                caption: 'Light',
                checked: () => this.prefs.theme.value === 'light',
                action: () => (this.prefs.theme.value = 'light'),
              },
              null,
              {
                caption: 'High Contrast',
                checked: () => this.prefs.highContrast.value,
                action: () =>
                  (this.prefs.highContrast.value =
                    !this.prefs.highContrast.value),
              },
            ],
          })
          popMenu({
            target: event.target as HTMLElement,
            localized: true,
            menuItems,
          })
        },
      },
      icons.moreVertical()
    )
  }

  // ---- Lifecycle -----------------------------------------------------------

  // Parse a declarative <ul class="..."> of <li><a href data-icon?>label</a> into
  // LinkItem[]. Returns [] when the list is absent.
  private parseLinks(selector: string): LinkItem[] {
    const list = this.querySelector(selector)
    if (!list) return []
    return [...list.querySelectorAll('a')].map((anchor) => ({
      href: anchor.getAttribute('href') || '',
      label: (anchor.textContent || '').trim(),
      icon: (anchor as HTMLElement).dataset.icon || undefined,
    }))
  }

  connectedCallback(): void {
    super.connectedCallback()
    // A doc page can demo the doc system itself. The page's browser (depth 0)
    // and one embedded demo (depth 1) are fine, but a demo INSIDE that demo
    // (depth ≥ 2) would recurse forever — so render an inert placeholder and
    // stop. (Don't even fetch the corpus.)
    if (this.nestingDepth() >= 2) {
      this.suppressed = true
      this.replaceChildren(
        div(
          { class: 'doc-system-nested' },
          '📖 nested doc-system preview (suppressed)'
        )
      )
      return
    }
    this.applyStyles()
    this.initPrefs()
    void this.initLocale()
    // Async data source: fetch once, then let the normal render pipeline mount.
    if (this.corpus === undefined) {
      const url = this.docs || '/docs.json'
      fetch(url)
        .then((response) => response.json())
        .then((corpus: Doc[]) => {
          this.corpus = corpus
          // Redirect legacy ?filename query-param links (the old doc-browser's
          // routing) to the new /slug/ paths.
          const legacy = legacyQueryPath(location.search, buildSlugMap(corpus))
          if (legacy) {
            if (legacy !== location.pathname) {
              // Different page — navigate to the real pre-rendered static page.
              location.replace(legacy + location.hash)
              return
            }
            // Same page — just drop the stale legacy query, no reload.
            history.replaceState(null, '', legacy + location.hash)
          }
          this.queueRender()
        })
        .catch((error) =>
          console.error(
            '<tosi-doc-system> could not load docs from',
            url,
            error
          )
        )
    }
  }

  render(): void {
    super.render()
    if (this.suppressed || this.corpus === undefined) return

    // Already mounted: the only live input is an external `route` change (memory
    // routing), which navigates the embedded browser. The appliedRoute guard
    // stops the browser's own write-back to `route` from re-navigating.
    if (this.browser !== undefined) {
      const navigate = (this.browser as any).navigate as
        | ((slug: string) => void)
        | undefined
      if (navigate && this.route && this.route !== this.appliedRoute) {
        this.appliedRoute = this.route
        navigate(this.route)
      }
      return
    }

    let config: DocSystemConfig = {}
    if (this.config) {
      try {
        config = JSON.parse(this.config)
      } catch {
        console.warn('<tosi-doc-system> ignoring invalid config attribute')
      }
    }

    // Nested instances (a live demo of the doc system) must never drive the page
    // URL — force memory routing. A top-level instance opts in via the attribute.
    const nested = this.nestingDepth() >= 1
    const memory =
      nested || this.routing === 'memory' || this.routing === 'internal'

    // Adopt the pre-rendered markdown for the landing page so it is hydrated in
    // place, never re-rendered. createDocBrowser grafts this node into its content
    // area; the static nav list (already crawled) is replaced by the reactive one.
    const contentElement =
      (this.querySelector('.doc-content') as HTMLElement | null) || undefined

    // Header-bar links are declared as a real, crawlable list in the static page.
    const navbarLinks = this.parseLinks('.doc-navbar')

    this.appliedRoute = this.route

    this.browser = createDocBrowser({
      docs: this.corpus,
      routing: memory ? 'memory' : 'path',
      initialRoute: memory ? this.route || undefined : undefined,
      onRouteChange: memory
        ? (slug: string) => {
            // Record before reflecting so the resulting render() no-ops.
            this.appliedRoute = slug
            this.route = slug
          }
        : undefined,
      context: this.context || {
        tosijs: (globalThis as any).xinjs,
        'tosijs-ui': (globalThis as any).xinjsui,
      },
      projectName: config.projectName,
      projectLinks: config.projectLinks,
      navbarLinks: navbarLinks.length ? navbarLinks : undefined,
      contentElement,
    })

    // Add the settings (theme + language) menu — except in a nested demo, where
    // a gear that retints the whole host page would be surprising.
    if (!nested) {
      const header = this.browser.querySelector('header')
      if (header) header.append(this.settingsButton())
    }

    this.replaceChildren(this.browser)

    // (The `document.body.style.opacity = '1'` that used to live here is gone. It was
    // the other half of an opacity gate the generated <head> no longer emits — the page
    // is pre-rendered and readable before any JS runs, so there is nothing to reveal.
    // Setting opacity on a body that was never hidden did nothing but keep a stale
    // comment alive, claiming a behavior the release had already removed.)
  }
}

export const tosiDocSystem =
  TosiDocSystem.elementCreator() as ElementCreator<TosiDocSystem>
