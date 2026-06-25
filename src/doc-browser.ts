/*#
# doc-browser

The `tosijs-ui` library provides everything you need to create a self-documented testbed similar
to the [tosijs-ui documentation site](https://ui.tosijs.net). It's like Storybook but much simpler
to set up and maintain.

## Quick Start

### 1. Extract Documentation

Use the CLI tool to extract documentation from your source files:

```bash
npx tosijs-ui-docs --dirs src,README.md --output docs.json
```

This scans for:

- `.md` files (uses entire content)
- Multi-line comments starting with `/*#` in `.ts`, `.js`, `.css` files

### 2. Create Your Doc Browser

```typescript
import { createDocBrowser } from 'tosijs-ui'
import * as mylib from './my-library.js'
import docs from './docs.json'

const browser = createDocBrowser({
  docs,
  context: { mylib },
  projectName: 'My Project',
  projectLinks: {
    github: 'https://github.com/user/project',
    npm: 'https://www.npmjs.com/package/project',
  },
})

document.body.append(browser)
```

### 3. Add Live Examples in Your Docs

In your source files or markdown, use code fences. Any sequence of
html, js, and css code examples will be turned in to a live, interactive
example.

    /*#
    # My Component

    This component does amazing things!

    ```html
    <my-component></my-component>
    ```
    ```js
    import { myComponent } from 'mylib'
    preview.append(myComponent({ value: 'Hello!' }))
    ```
    ```css
    my-component {
      color: blue;
    }
    ```
    *‎/

    export class MyComponent extends Component {
      // ...
    }

    export const myComponent = MyComponent.elementCreator({
      tag: 'my-component'
    })

## Documentation Format

### Inline Comments

Start multi-line comments with `/*#` to mark them as documentation:

```typescript
/*#
# Component Name

Description and examples go here...
*‎/
```

### Metadata

Control sort order with JSON metadata:

```
<!--{ "pin": "bottom" }-->
```

or

```
/*{ "pin": "bottom" }*‎/
```

## Programmatic API

```typescript
import { extractDocs, saveDocsJSON } from 'tosijs-ui'

const docs = extractDocs({
  dirs: ['src', 'README.md'],
  ignore: ['node_modules', 'dist'],
})

saveDocsJSON(docs, './docs.json')

// Or use the docs directly
import { createDocBrowser } from 'tosijs-ui'
const browser = createDocBrowser({ docs, context: { mylib } })
```

## createDocBrowser Options

```typescript
interface DocBrowserOptions {
  docs: Doc[] // Array of documentation objects
  context?: Record<string, any> // Modules for live examples
  projectName?: string // Display name
  projectLinks?: ProjectLinks // Links to show in header
  navSize?: number // Nav width (default: 200)
  minSize?: number // Min width before compact (default: 600)
}

interface ProjectLinks {
  github?: string
  npm?: string
  discord?: string
  blog?: string
  tosijs?: string
  bundle?: string
  cdn?: string
  [key: string]: string | undefined
}
```

## See Also

The `tosijs-ui` demo is a complete working example. See:

- `/demo/src/index.ts` - How the doc browser is set up
- `/bin/docs.ts` - The extraction tool
- `/src/doc-browser.ts` - The createDocBrowser implementation
*/
/*{"pin":"bottom","parent":"Appendices"}*/

import {
  elements,
  vars,
  varDefault,
  bindings,
  touch,
  getListItem,
  debounce,
  tosi,
  StyleSheet,
  XinStyleSheet,
} from 'tosijs'
import { buildSlugMap, pathForSlug, filenameForPath } from './doc-system/routing'
import { buildNavTree, NavNode } from './doc-system/nav-tree'
import { renderDocMarkdown } from './doc-system/render'
import { LiveExample, testManager } from './live-example'
import { TestResults } from './live-example/test-harness'
import { tosiSidenav, TosiSidenav } from './side-nav'
import { icons } from './icons'
import { tosiLocalized } from './localize'
import { popMenu } from './menu'

// Types for global test results
export interface PageTestResults {
  passed: boolean
  tests: TestResults['tests']
  totalPassed: number
  totalFailed: number
}

export interface DocTestResults {
  passed: number
  failed: number
  pages: Record<string, PageTestResults>
}

declare global {
  interface Window {
    __docTestResults?: Promise<DocTestResults>
  }
}

const { div, span, a, header, button, template, input, h2, details, summary, ul, li } =
  elements

// Test colors
const testColor = {
  pass: varDefault.testColorPass('#0a0'),
  fail: varDefault.testColorFail('#c00'),
  running: varDefault.testColorRunning('#fa0'),
}

// Test indicator styles - widget inherits button styles from base stylesheet
const testIndicatorStyleSpec: XinStyleSheet = {
  '@keyframes test-pulse': {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.7' },
  },
  '@keyframes test-appear': {
    from: { opacity: '0', transform: 'scale(0.8)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
  '@keyframes test-fade': {
    '0%, 20%': { opacity: '1', transform: 'scale(1)' },
    '70%': { opacity: '1', transform: 'scale(1.1)' },
    '100%': { opacity: '0', transform: 'scale(0.9)', pointerEvents: 'none' },
  },

  // Hide when tests disabled
  'body:not(.tests-enabled) .doc-link::after, body:not(.tests-enabled) .test-widget':
    {
      display: 'none !important',
    },

  // Nav link dot indicators
  '.doc-link.-test-passed::after, .doc-link.-test-failed::after': {
    content: "''",
    width: vars.fontSize50,
    height: vars.fontSize50,
    borderRadius: '50%',
    marginLeft: vars.spacing50,
    display: 'inline-block',
    verticalAlign: 'middle',
  },
  '.doc-link.-test-passed::after': { background: testColor.pass },
  '.doc-link.-test-failed::after': {
    background: testColor.fail,
    animation: 'test-pulse 2s ease-in-out infinite',
  },

  // Floating widget - position and colors only, inherits button structure
  '.test-widget': {
    _testBg: testColor.running,
    position: 'fixed',
    bottom: vars.spacing,
    right: vars.spacing,
    zIndex: '1000',
    background: vars.testBg,
    color: 'white',
    gap: vars.spacing50,
  },
  '.test-widget[hidden]': { display: 'none' },
  '.test-widget.-running': {
    _testBg: testColor.running,
    animation:
      'test-appear 0.3s ease-out, test-pulse 2s ease-in-out 0.3s infinite',
  },
  '.test-widget.-passed': {
    _testBg: testColor.pass,
    animation: 'test-fade 3s ease-out forwards',
  },
  '.test-widget.-failed': {
    _testBg: testColor.fail,
    animation: 'test-pulse 2s ease-in-out infinite',
  },

  // Count badge
  '.test-widget .count': {
    background: 'white',
    color: vars.testBg,
    borderRadius: '50%',
    width: vars.lineHeight,
    height: vars.lineHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
}

export interface Doc {
  text: string
  title: string
  filename: string
  path: string
  pin?: string
  hidden?: boolean
  testStatus?: 'passed' | 'failed' | 'pending'
}

export interface ProjectLinks {
  github?: string
  npm?: string
  discord?: string
  blog?: string
  tosijs?: string
  bundle?: string
  cdn?: string
  [key: string]: string | undefined
}

/** A configurable link for the header bar or the overflow menu. */
export interface LinkItem {
  href: string
  label: string
  /** optional icon name (from `icons`); falls back to the text label if unknown */
  icon?: string
}

/**
 * How the doc browser maps docs to URLs.
 * - 'query' (default, legacy): single-page app, links are `?filename`.
 * - 'path': clean per-page URLs (`/slug/`), for the static pre-rendered site
 *   driven by <tosi-doc-system>. Requires a real page to exist at each path.
 * - 'memory': self-contained — navigation never touches window.history/location
 *   and the instance ignores the page URL. For an embedded/nested browser (a
 *   live demo, a floating help panel). Drive it via `initialRoute` +
 *   `onRouteChange`, and the returned element's `.navigate(slug)` method.
 */
export type DocRoutingMode = 'query' | 'path' | 'memory'

export interface DocBrowserOptions {
  docs: Doc[]
  context?: Record<string, any>
  projectName?: string
  projectLinks?: ProjectLinks
  navSize?: number
  minSize?: number
  routing?: DocRoutingMode
  /**
   * Memory routing only: the slug to show first (instead of the page URL / first
   * doc). Lets a host mount the browser already pointed at a specific doc.
   */
  initialRoute?: string
  /**
   * Memory routing only: called with the current doc's slug whenever in-app
   * navigation happens, so a host can reflect it (e.g. to an attribute).
   */
  onRouteChange?: (slug: string) => void
  /**
   * Header-bar links. When provided, these replace the legacy `projectLinks` icon
   * set in the header (each renders as an icon if `icon` names a known icon, else
   * as its text label). `projectLinks` is still used for the logo and view-source.
   */
  navbarLinks?: LinkItem[]
  /**
   * Pre-rendered content for the landing doc to ADOPT in place (true hydration).
   * When provided, the current page's already-rendered markdown is left untouched
   * — only live examples are wired up — instead of being re-rendered from text.
   * Used by <tosi-doc-system>. Subsequent navigation renders from doc text.
   */
  contentElement?: HTMLElement
}

export function createDocBrowser(options: DocBrowserOptions): HTMLElement {
  const {
    docs,
    context = {},
    projectName = '',
    projectLinks = {},
    navSize = 200,
    minSize = 600,
    routing = 'query',
    initialRoute,
    onRouteChange,
    navbarLinks,
    contentElement,
  } = options

  // Memory routing is fully self-contained: it never reads or writes
  // window.history/location, so an embedded or nested browser can't hijack the
  // host page's URL (or recurse into it).
  const memoryRouting = routing === 'memory'

  // Initialize testStatus on all docs so tosi can track it
  for (const doc of docs) {
    doc.testStatus = undefined
  }

  // Routing abstraction — keeps the legacy `?filename` SPA behavior the default,
  // while letting <tosi-doc-system> drive clean `/slug/` URLs off the same docs.
  // Both path and memory routing key off slugs; only legacy query routing doesn't.
  const slugMap = routing === 'query' ? {} : buildSlugMap(docs)
  const slugFor = (filename: string): string => slugMap[filename] ?? filename
  const filenameForSlug = (slug: string): string => {
    for (const d of docs) if (slugFor(d.filename) === slug) return d.filename
    return ''
  }
  const hrefFor = (filename: string): string =>
    routing === 'query' ? `?${filename}` : pathForSlug(slugFor(filename))
  const filenameFromLocation = (): string => {
    // Memory routing ignores the page URL entirely — it starts at initialRoute.
    if (memoryRouting) return initialRoute ? filenameForSlug(initialRoute) : ''
    return routing === 'path'
      ? filenameForPath(document.location.pathname, slugMap)
      : document.location.search !== ''
        ? document.location.search.substring(1).split('&')[0]
        : ''
  }

  const docName = filenameFromLocation() || docs[0]?.filename || 'README.md'

  const currentDoc = docs.find((doc) => doc.filename === docName) || docs[0]

  const { app } = tosi({
    app: {
      docs,
      currentDoc,
      compact: false,
    },
  })

  // Assigned by the hierarchical nav builder (path routing); re-applies current
  // highlight, test status, search visibility, and auto-open imperatively.
  // resetOpen=true collapses every section except the current doc's.
  let refreshNav: (resetOpen?: boolean) => void = () => {}

  // Test result tracking
  const pageTestResults: Record<string, PageTestResults> = {}
  let testResultsResolve: ((results: DocTestResults) => void) | undefined
  let backgroundTestsStarted = false
  let pagesWithTests = 0
  let pagesTested = 0

  // Set up global promise for scriptable browser integration. A memory-routed
  // (embedded) browser must not clobber the host page's global.
  if (!memoryRouting) {
    window.__docTestResults = new Promise((resolve) => {
      testResultsResolve = resolve
    })
  }

  const updateDocTestStatus = (filename: string) => {
    const results = pageTestResults[filename]
    // Callback receives bare object, return is proxy - cast to work with both
    const doc = (app.docs as unknown as Doc[]).find(
      (d) => d.filename === filename
    )
    if (doc) {
      doc.testStatus = results
        ? results.passed
          ? 'passed'
          : 'failed'
        : undefined
    }
    refreshNav()
  }

  const checkAllTestsComplete = () => {
    if (pagesTested >= pagesWithTests && testResultsResolve) {
      const allResults: DocTestResults = {
        passed: 0,
        failed: 0,
        pages: pageTestResults,
      }

      for (const pageResults of Object.values(pageTestResults)) {
        allResults.passed += pageResults.totalPassed
        allResults.failed += pageResults.totalFailed
      }

      testResultsResolve(allResults)
      testResultsResolve = undefined

      // Post results to dev server on localhost (not from test iframes)
      if (isLocalhost && !isTestFrame) {
        fetch('/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allResults),
        }).catch(() => {
          // Ignore errors - server may not support this endpoint
        })
      }
    }
  }

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'

  const handleTestComplete = (event: CustomEvent) => {
    const { results } = event.detail as {
      results: TestResults
      element: LiveExample
    }
    const filename = String(app.currentDoc.filename)

    // Reset page results each time (don't accumulate across reloads)
    pageTestResults[filename] = {
      passed: results.failed === 0,
      tests: [...results.tests],
      totalPassed: results.passed,
      totalFailed: results.failed,
    }

    updateDocTestStatus(filename)
  }

  // Track when a page finishes loading all its tests
  const markPageTested = (_filename: string) => {
    pagesTested++
    checkAllTestsComplete()
    updateTestWidget()
  }

  bindings.docLink = {
    toDOM(elt, filename) {
      elt.setAttribute('href', hrefFor(filename))
      ;(elt as HTMLElement).dataset.filename = filename
    },
  }

  bindings.current = {
    toDOM(elt, currentFile) {
      elt.classList.toggle(
        'current',
        currentFile === (elt as HTMLElement).dataset.filename
      )
    },
  }

  bindings.testStatus = {
    toDOM(elt, status) {
      elt.classList.remove('-test-passed', '-test-failed')
      if (status === 'passed') {
        elt.classList.add('-test-passed')
      } else if (status === 'failed') {
        elt.classList.add('-test-failed')
      }
    },
  }

  const filterDocs = debounce(() => {
    const needle = searchField.value.toLocaleLowerCase()
    app.docs.forEach((doc: any) => {
      doc.hidden =
        !doc.title.toLocaleLowerCase().includes(needle) &&
        !doc.text.toLocaleLowerCase().includes(needle)
    })
    touch(app.docs)
    // resetOpen: when the field is cleared this collapses back to the current
    // section; while typing, matching sections expand via the needle branch.
    refreshNav(true)
  })

  const searchField = input({
    slot: 'nav',
    placeholder: 'search',
    type: 'search',
    style: {
      width: 'calc(100% - 10px)',
      margin: '5px',
    },
    onInput: filterDocs,
  })

  // Memory routing is decoupled from the page URL, so it ignores browser
  // back/forward (the host owns history, if any).
  if (!memoryRouting) {
    window.addEventListener('popstate', () => {
      navigateTo(filenameFromLocation())
    })
  }

  const headerContent: any[] = [
    button(
      {
        class: 'iconic',
        style: { color: vars.linkColor },
        title: 'navigation',
        bind: {
          value: app.compact,
          binding: {
            toDOM(element, compact) {
              element.style.display = compact ? '' : 'none'
              ;(element.nextSibling as HTMLElement).style.display = compact
                ? ''
                : 'none'
            },
          },
        },
        onClick() {
          const nav = document.querySelector(
            TosiSidenav.tagName!
          ) as TosiSidenav
          nav.contentVisible = !nav.contentVisible
        },
      },
      icons.menu()
    ),
    span({ style: { flex: '0 0 10px' } }),
  ]

  if (projectName) {
    headerContent.push(
      a(
        {
          href: '/',
          style: {
            display: 'flex',
            alignItems: 'center',
            borderBottom: 'none',
          },
        },
        projectLinks.tosijs
          ? icons.tosiUi({
              style: { _xinIconSize: 40, marginRight: 10 },
            })
          : span(),
        h2(projectName)
      )
    )
  }

  headerContent.push(span({ class: 'elastic' }))

  // A header link renders as an icon (if `icon` names a known icon) or its label.
  const headerLink = (link: LinkItem) => {
    const iconFactory = link.icon ? (icons as any)[link.icon] : undefined
    return a(
      {
        class: iconFactory ? 'iconic' : '',
        title: link.label,
        target: '_blank',
        href: link.href,
      },
      iconFactory ? iconFactory() : link.label
    )
  }

  if (navbarLinks) {
    // Configurable link set.
    navbarLinks.forEach((link) => headerContent.push(headerLink(link)))
  } else {
    // Legacy: derive header icons from the known `projectLinks` keys.
    const legacy: Array<[string | undefined, string, string]> = [
      [projectLinks.tosijs, 'tosi', 'tosijs'],
      [projectLinks.discord, 'discord', 'discord'],
      [projectLinks.blog, 'blog', 'blog'],
      [projectLinks.github, 'github', 'github'],
      [projectLinks.npm, 'npm', 'npmjs'],
    ]
    for (const [href, icon, label] of legacy) {
      if (href) headerContent.push(headerLink({ href, label, icon }))
    }
  }

  // The rendered-markdown content area. When hydrating a static page we ADOPT the
  // pre-rendered node so the landing page's HTML is never re-rendered; otherwise we
  // render from doc text. Every navigation funnels through navigateTo() -> showDoc().
  const docContent = contentElement || div()
  docContent.classList.add('doc-content')
  Object.assign(docContent.style, {
    display: 'block',
    maxWidth: '44em',
    margin: 'auto',
    padding: '0 1em',
    overflow: 'hidden',
  })

  // Adoption is zero-flash hydration of a statically pre-rendered page: it only
  // holds for the page's own path-routed instance, whose static `.doc-content`
  // matches the initial doc. A memory-routed embed's initial doc
  // (initialRoute/docs[0]) has no relation to whatever happens to sit inside the
  // host element (often an empty placeholder), so always render it fresh.
  let adoptInitialContent = contentElement !== undefined && !memoryRouting
  const showDoc = (doc: Doc) => {
    if (adoptInitialContent) {
      adoptInitialContent = false // leave the pre-rendered HTML untouched
    } else {
      docContent.innerHTML = renderDocMarkdown(doc.text)
    }
    // Stamp each example with its source file (for the source↔doc map). doc.path
    // is the extracted file (.md, or a source file with /*# … */ comments).
    LiveExample.insertExamples(docContent, context, doc.path || undefined)
    if (routing === 'path') {
      document.title = projectName
        ? `${doc.title} — ${projectName}`
        : doc.title
    }
  }
  // Always resolve to the RAW doc from the original array — docs reached via the
  // app.docs proxy expose BoxedScalar fields (doc.text), which break marked().
  const navigateTo = (filename: string) => {
    const doc = docs.find((d) => d.filename === filename) || docs[0]
    app.currentDoc = doc as any
    showDoc(doc)
    refreshNav(true)
  }

  // User-initiated navigation: record the new location (history for path/query,
  // the onRouteChange callback for memory) and then render the doc. Every nav
  // click funnels through here so memory mode never touches window.history.
  const go = (filename: string) => {
    if (memoryRouting) {
      onRouteChange?.(slugFor(filename))
    } else {
      const href = hrefFor(filename)
      window.history.pushState({ href }, '', href)
    }
    navigateTo(filename)
  }

  // ── Hierarchical nav (path routing) ───────────────────────────────────────
  // Build nested <details> from the doc tree; current-highlight, test status,
  // search visibility, and auto-open are applied imperatively by refreshNav.
  const navStyle = {
    slot: 'nav',
    // .doc-nav so the shared nav CSS (list reset, indentation) matches the
    // runtime nav too, not just the static pre-rendered <nav class="doc-nav">.
    class: 'doc-nav',
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: 'calc(100% - 44px)',
      overflowY: 'scroll',
    },
  }

  const buildHierarchicalNav = (): HTMLElement => {
    const roots = buildNavTree(docs as any, slugMap)
    const leaves = new Map<string, { li: HTMLElement; link: HTMLElement }>()
    const branches: {
      li: HTMLElement
      el: HTMLDetailsElement
      link: HTMLElement
      filename: string
      subtree: string[]
    }[] = []

    const subtreeFilenames = (node: NavNode<any>): string[] => {
      const out = [node.doc.filename]
      for (const c of node.children) out.push(...subtreeFilenames(c))
      return out
    }

    const navClick = (doc: Doc) => (event: Event) => {
      // Use the href from the closure, not the event — the click can land on a
      // child of the <a> (the localized label), so event.currentTarget/target
      // isn't reliably the anchor.
      const nav = (event.target as HTMLElement).closest(
        'tosi-sidenav'
      ) as TosiSidenav | null
      if (nav) nav.contentVisible = true
      go(String(doc.filename))
      event.preventDefault()
      const results = pageTestResults[doc.filename]
      if (results && !results.passed) {
        setTimeout(() => {
          const failed = document.querySelector('tosi-example.-test-failed')
          if (failed)
            failed.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }

    const renderNode = (node: NavNode<any>): HTMLElement => {
      const link = a(
        {
          class: 'doc-link',
          href: hrefFor(node.doc.filename),
          onClick: navClick(node.doc),
        },
        tosiLocalized(node.doc.title)
      )
      if (node.children.length === 0) {
        const item = li(link)
        leaves.set(node.doc.filename, { li: item, link })
        return item
      }
      const det = details(
        summary(link),
        ul(...node.children.map(renderNode))
      ) as HTMLDetailsElement
      const item = li(det)
      branches.push({
        li: item,
        el: det,
        link,
        filename: node.doc.filename,
        subtree: subtreeFilenames(node),
      })
      return item
    }

    const root = div(navStyle, ul(...roots.map(renderNode)))

    // Search is computed straight from the raw docs (plain strings) — going
    // through app.docs gives BoxedScalars / unreliable write-through.
    const matchesSearch = (filename: string, needle: string): boolean => {
      if (!needle) return true
      const doc = docs.find((d) => d.filename === filename) as any
      return (
        !!doc &&
        (String(doc.title).toLocaleLowerCase().includes(needle) ||
          String(doc.text).toLocaleLowerCase().includes(needle))
      )
    }
    const applyStatus = (link: HTMLElement, filename: string, current: string) => {
      link.classList.toggle('current', filename === current)
      const r = pageTestResults[filename]
      link.classList.toggle('-test-passed', !!r && r.passed)
      link.classList.toggle('-test-failed', !!r && !r.passed)
    }

    refreshNav = (resetOpen = false) => {
      // app.currentDoc.filename is a BoxedScalar; coerce so === / includes work.
      const cur = app.currentDoc as any
      const current = cur && cur.filename != null ? String(cur.filename) : ''
      const needle = searchField.value.trim().toLocaleLowerCase()

      // Use inline display (not the [hidden] attr): an author `display` rule on
      // .doc-nav li would override [hidden]'s display:none.
      for (const [filename, { li: item, link }] of leaves) {
        item.style.display = matchesSearch(filename, needle) ? '' : 'none'
        applyStatus(link, filename, current)
      }
      for (const { li: item, el, link, filename, subtree } of branches) {
        // Visible if the section name matches, or any descendant leaf is shown.
        const visible =
          matchesSearch(filename, needle) ||
          subtree.some(
            (fn) => leaves.has(fn) && leaves.get(fn)!.li.style.display !== 'none'
          )
        item.style.display = visible ? '' : 'none'
        applyStatus(link, filename, current)
        // While searching, expand sections with matches. On navigation/clear
        // (resetOpen), collapse everything except the current doc's section.
        // Otherwise (e.g. test-status refresh) leave user toggles alone.
        if (needle) el.open = visible
        else if (resetOpen) el.open = subtree.includes(current)
        else if (subtree.includes(current)) el.open = true
      }
    }
    refreshNav(true)
    return root
  }

  const navContent =
    routing !== 'query'
      ? buildHierarchicalNav()
      : div(
          {
            ...navStyle,
            bindList: {
              idPath: 'filename',
              hiddenProp: 'hidden',
              value: app.docs,
            },
          },
          template(
            a(
              {
                class: 'doc-link',
                bindCurrent: 'app.currentDoc.filename',
                bindDocLink: '^.filename',
                bindTestStatus: '^.testStatus',
                onClick(event: Event) {
                  const doc = getListItem(event.target as HTMLElement)
                  const nav = (event.target as HTMLElement).closest(
                    'tosi-sidenav'
                  ) as TosiSidenav
                  nav.contentVisible = true
                  go(String((doc as Doc).filename))
                  event.preventDefault()
                },
              },
              tosiLocalized({ bindText: '^.title' })
            )
          )
        )

  const container = div(
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100vw',
        height: '100vh',
        overflow: 'hidden',
      },
    },
    header(...headerContent),
    tosiSidenav(
      {
        name: 'Documentation',
        navSize,
        minSize,
        style: {
          flex: '1 1 auto',
          overflow: 'hidden',
        },
        onChange() {
          const nav = document.querySelector(
            TosiSidenav.tagName!
          ) as TosiSidenav
          app.compact = nav.compact as any
        },
      },
      searchField,
      navContent,
      div(
        {
          style: {
            position: 'relative',
            overflowY: 'scroll',
            height: '100%',
          },
        },
        a(
          {
            class: 'view-source',
            target: '_blank',
            style: {
              display: projectLinks.github ? 'flex' : 'none',
              alignItems: 'center',
              gap: '6px',
              position: 'fixed',
              top: 'calc(var(--xin-header-height, 60px) + 5px)',
              right: '5px',
              fontSize: '0.875em',
              color: 'var(--brand-color, inherit)',
              opacity: '0.7',
              borderBottom: 'none',
              transition: 'opacity 0.2s ease',
            },
            onMouseenter(event: Event) {
              ;(event.target as HTMLElement).style.opacity = '0.9'
            },
            onMouseleave(event: Event) {
              ;(event.target as HTMLElement).style.opacity = '0.7'
            },
            bind: {
              value: app.currentDoc,
              binding(element: HTMLAnchorElement, doc: Doc) {
                if (
                  projectLinks.github &&
                  doc.path &&
                  doc.path !== 'README.md'
                ) {
                  element.href = `${projectLinks.github}/blob/main/${doc.path}`
                  element.style.display = 'flex'
                } else {
                  element.style.display = 'none'
                }
              },
            },
          },
          icons.github({
            style: {
              _xinIconSize: 16,
            },
          }),
          'View source on GitHub'
        ),
        docContent
      )
    )
  )

  // Render the landing doc (adopts pre-rendered HTML when hydrating).
  showDoc(currentDoc)

  // Inject test indicator styles
  StyleSheet('test-indicators', testIndicatorStyleSpec)

  // Floating widget for test status
  const testWidget = button(
    {
      class: 'test-widget',
      hidden: true,
      onClick: showTestMenu,
    },
    span({ part: 'label' }, 'Tests'),
    span({ class: 'count', part: 'count' }, '0')
  )
  container.appendChild(testWidget)

  let testsRunning = false

  function setTestWidgetRunning() {
    testsRunning = true
    testWidget.hidden = false
    testWidget.classList.remove('-passed', '-failed')
    testWidget.classList.add('-running')
    updateTestWidgetDisplay()
  }

  function updateTestWidgetDisplay() {
    const labelEl = testWidget.querySelector('[part="label"]')
    const countEl = testWidget.querySelector('[part="count"]')

    const totalPassed = Object.values(pageTestResults).reduce(
      (sum, r) => sum + r.totalPassed,
      0
    )
    const totalFailed = Object.values(pageTestResults).reduce(
      (sum, r) => sum + r.totalFailed,
      0
    )

    if (labelEl) {
      if (testsRunning) {
        labelEl.textContent = 'Running'
      } else if (totalFailed > 0) {
        labelEl.textContent = 'Failed'
      } else if (totalPassed > 0) {
        labelEl.textContent = 'Passed'
      } else {
        labelEl.textContent = 'Tests'
      }
    }
    if (countEl) {
      countEl.textContent =
        totalFailed > 0 ? String(totalFailed) : String(totalPassed)
    }
  }

  function updateTestWidget() {
    const totalFailed = Object.values(pageTestResults).reduce(
      (sum, r) => sum + r.totalFailed,
      0
    )

    if (testsRunning && pagesTested >= pagesWithTests) {
      // Tests complete
      testsRunning = false
      testWidget.classList.remove('-running')
      if (totalFailed > 0) {
        testWidget.classList.add('-failed')
        testWidget.classList.remove('-passed')
        testWidget.hidden = false
      } else {
        testWidget.classList.add('-passed')
        testWidget.classList.remove('-failed')
        testWidget.hidden = false // Show briefly before fade
      }
    }

    updateTestWidgetDisplay()
  }

  function showTestMenu() {
    const failedPages = Object.entries(pageTestResults).filter(
      ([, results]) => !results.passed
    )

    const menuItems: any[] = []

    for (const [filename, results] of failedPages) {
      const doc = docs.find((d) => d.filename === filename)
      const failedTests = results.tests.filter((t) => !t.passed)

      for (const test of failedTests) {
        menuItems.push({
          caption: `${doc?.title || filename}: ${test.name}`,
          action: () => {
            // Navigate to the page
            const docObj = app.docs.find(
              (d: any) => String(d.filename) === filename
            )
            if (docObj) {
              go(filename)
              // Scroll to failing test after render
              setTimeout(() => {
                const failedExample = document.querySelector(
                  'tosi-example.-test-failed'
                )
                if (failedExample) {
                  failedExample.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
                }
              }, 100)
            }
          },
        })
      }
    }

    if (menuItems.length > 0) {
      menuItems.push(null) // separator
    }

    menuItems.push({
      icon: 'copy',
      caption: 'Copy test results to clipboard',
      action: () => {
        const report = generateTestReport()
        navigator.clipboard.writeText(report)
      },
    })

    popMenu({
      target: testWidget,
      menuItems,
    })
  }

  function generateTestReport(): string {
    const lines: string[] = ['# Test Results', '']
    let totalPassed = 0
    let totalFailed = 0

    for (const [filename, results] of Object.entries(pageTestResults)) {
      const doc = docs.find((d) => d.filename === filename)
      const title = doc?.title || filename

      totalPassed += results.totalPassed
      totalFailed += results.totalFailed

      if (results.tests.length > 0) {
        lines.push(`## ${title}`)
        lines.push('')
        for (const test of results.tests) {
          const icon = test.passed ? '✓' : '✗'
          const line = test.error
            ? `- ${icon} ${test.name}: ${test.error}`
            : `- ${icon} ${test.name}`
          lines.push(line)
        }
        lines.push('')
      }
    }

    lines.unshift(
      `**Summary: ${totalPassed} passed, ${totalFailed} failed**`,
      ''
    )

    return lines.join('\n')
  }

  // Detect if running as background test iframe (never for an embedded browser —
  // it shares the host page's URL but isn't the test target).
  const searchParams = new URLSearchParams(window.location.search)
  const isTestFrame = !memoryRouting && searchParams.get('_testMode') === '1'
  const testFrameFilename = isTestFrame ? filenameFromLocation() : null

  // Listen for test completion events
  container.addEventListener('testcomplete', ((event: CustomEvent) => {
    handleTestComplete(event)
    updateTestWidget()

    // If running in test iframe, post results to parent
    if (isTestFrame && window.parent !== window && testFrameFilename) {
      const { results } = event.detail as { results: TestResults }
      window.parent.postMessage(
        { type: 'tosi-test-results', filename: testFrameFilename, results },
        '*'
      )
    }
  }) as EventListener)

  // If running as test iframe, signal when all tests on this page are done
  if (isTestFrame && testFrameFilename) {
    const signalDone = () => {
      const examples = container.querySelectorAll('tosi-example')
      const withTests = [...examples].filter((ex) =>
        ex.classList.contains('-has-tests')
      )
      const running = withTests.filter((ex) =>
        ex.classList.contains('-test-running')
      )
      if (withTests.length > 0 && running.length === 0) {
        window.parent.postMessage(
          { type: 'tosi-tests-done', filename: testFrameFilename },
          '*'
        )
      } else {
        setTimeout(signalDone, 100)
      }
    }
    // Give time for examples to start running
    setTimeout(signalDone, 500)
  }

  // Background test runner for all doc pages
  const runBackgroundTests = async () => {
    if (backgroundTestsStarted) return
    if (!testManager.enabled.value) return
    if (isTestFrame) return // Don't run background tests in test iframe
    backgroundTestsStarted = true

    // Find all docs that have test blocks
    const docsWithTests = docs.filter((doc) => doc.text.includes('```test'))
    pagesWithTests = docsWithTests.length

    if (pagesWithTests > 0) {
      setTestWidgetRunning()
    }

    if (pagesWithTests === 0) {
      if (testResultsResolve) {
        testResultsResolve({ passed: 0, failed: 0, pages: {} })
        testResultsResolve = undefined
      }
      return
    }

    const currentFilename = String(app.currentDoc.filename)

    // Create a hidden iframe that loads the full page. Keep its real 800x600
    // layout size (layout-dependent example tests need it) but park it
    // off-screen rather than rely on opacity:0 over the visible page — Chromium
    // (and haltija on top of it) still composites a 0-opacity layer at 0,0,
    // which flashes as the frame navigates page to page.
    const testFrame = document.createElement('iframe')
    testFrame.style.cssText =
      'position: fixed; left: -10000px; top: 0; width: 800px; height: 600px; opacity: 0; pointer-events: none;'
    document.body.appendChild(testFrame)

    // Listen for test results posted from the iframe
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type !== 'tosi-test-results') return
      const { filename, results } = event.data as {
        type: string
        filename: string
        results: TestResults
      }
      if (!pageTestResults[filename]) {
        pageTestResults[filename] = {
          passed: true,
          tests: [],
          totalPassed: 0,
          totalFailed: 0,
        }
      }
      const pageResults = pageTestResults[filename]
      pageResults.tests.push(...results.tests)
      pageResults.totalPassed += results.passed
      pageResults.totalFailed += results.failed
      pageResults.passed = pageResults.totalFailed === 0
      updateDocTestStatus(filename)
      updateTestWidget()
    }
    window.addEventListener('message', messageHandler)

    for (const doc of docsWithTests) {
      // Skip current page — it runs tests naturally
      if (doc.filename === currentFilename) continue

      // Navigate iframe to the page
      testFrame.src =
        routing === 'path'
          ? `${window.location.origin}${hrefFor(doc.filename)}?_testMode=1`
          : `${window.location.origin}${window.location.pathname}?${doc.filename}&_testMode=1`

      // Wait for the iframe to signal it's done (max 30s per page)
      await new Promise<void>((resolve) => {
        const deadline = Date.now() + 30_000
        const onDone = (event: MessageEvent) => {
          if (
            event.data?.type === 'tosi-tests-done' &&
            event.data.filename === doc.filename
          ) {
            window.removeEventListener('message', onDone)
            resolve()
          }
        }
        window.addEventListener('message', onDone)
        setTimeout(() => {
          window.removeEventListener('message', onDone)
          resolve()
        }, deadline - Date.now())
      })

      markPageTested(doc.filename)
    }

    // Clean up
    window.removeEventListener('message', messageHandler)
    testFrame.remove()

    // Mark current page as tested if it has tests
    if (docsWithTests.some((d) => d.filename === currentFilename)) {
      setTimeout(() => markPageTested(currentFilename), 1000)
    }
  }

  // Run background tests when enabled (initially or when toggled on)
  const startBackgroundTests = () => {
    if (!testManager.enabled.value) return
    if (isLocalhost) {
      setTimeout(runBackgroundTests, 1000)
    } else {
      const currentHasTests = currentDoc.text.includes('```test')
      if (currentHasTests) {
        pagesWithTests = 1
        setTestWidgetRunning()
        setTimeout(() => markPageTested(currentDoc.filename), 2000)
      } else if (testResultsResolve) {
        testResultsResolve({ passed: 0, failed: 0, pages: {} })
        testResultsResolve = undefined
      }
    }
  }

  // Start now if enabled, and watch for toggle. A memory-routed (embedded)
  // browser never spawns the test-runner iframes (they'd navigate the host site).
  if (!memoryRouting) {
    startBackgroundTests()
    testManager.enabled.observe(startBackgroundTests)
  }

  // Memory routing: let the host drive navigation programmatically (by slug) and
  // read the current slug back, so the browser can live in a floating panel etc.
  if (memoryRouting) {
    ;(container as any).navigate = (slug: string) =>
      navigateTo(filenameForSlug(slug) || slug)
    Object.defineProperty(container, 'currentSlug', {
      get: () => slugFor(String(app.currentDoc.filename)),
    })
  }

  return container as HTMLElement
}
