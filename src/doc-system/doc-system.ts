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
- `accent` / `background` / `text` — base theme colors (most of the palette is
  derived from `accent` via color math).

The element is light-DOM (no shadow root) so the pre-rendered markdown remains the
real, indexable page content until hydration replaces it with the live browser.
Live-example modules default to the `xinjs` / `xinjsui` IIFE globals; override by
setting the element's `context` property before it connects.
*/

import { Component, ElementCreator, StyleSheet, elements, tosi, vars } from 'tosijs'
import { createDocBrowser, Doc, ProjectLinks, LinkItem } from '../doc-browser'
import { docSystemStyleSpec } from './doc-system-styles'
import { icons } from '../icons'
import { popMenu } from '../menu'
import { i18n, setLocale, initLocalization } from '../localize'

const { button } = elements

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
      (theme === 'system' &&
        matchMedia('(prefers-color-scheme: dark)').matches)
    document.body.classList.toggle('darkmode', dark)
    document.body.classList.toggle('high-contrast', this.prefs.highContrast.value)
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
                  (this.prefs.highContrast.value = !this.prefs.highContrast.value),
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

    // Header-bar links are declared as a real, crawlable list in the static page.
    const navbarLinks = this.parseLinks('.doc-navbar')

    this.browser = createDocBrowser({
      docs: this.corpus,
      routing: 'path',
      context: this.context || {
        tosijs: (globalThis as any).xinjs,
        'tosijs-ui': (globalThis as any).xinjsui,
      },
      projectName: config.projectName,
      projectLinks: config.projectLinks,
      navbarLinks: navbarLinks.length ? navbarLinks : undefined,
      contentElement,
    })

    // Add the settings (theme + language) menu to the header.
    const header = this.browser.querySelector('header')
    if (header) header.append(this.settingsButton())

    this.replaceChildren(this.browser)
  }
}

export const tosiDocSystem =
  TosiDocSystem.elementCreator() as ElementCreator<TosiDocSystem>
