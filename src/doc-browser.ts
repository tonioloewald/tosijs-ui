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
/*{"pin": "bottom"}*/

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
import { markdownViewer, MarkdownViewer } from './markdown-viewer'
import { LiveExample, testManager } from './live-example'
import { TestResults } from './live-example/test-harness'
import { sideNav, SideNav } from './side-nav'
import { icons } from './icons'
import { xinLocalized } from './localize'
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

const { div, span, a, header, button, template, input, h2 } = elements

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

export interface DocBrowserOptions {
  docs: Doc[]
  context?: Record<string, any>
  projectName?: string
  projectLinks?: ProjectLinks
  navSize?: number
  minSize?: number
}

export function createDocBrowser(options: DocBrowserOptions): HTMLElement {
  const {
    docs,
    context = {},
    projectName = '',
    projectLinks = {},
    navSize = 200,
    minSize = 600,
  } = options

  // Initialize testStatus on all docs so tosi can track it
  for (const doc of docs) {
    doc.testStatus = undefined
  }

  const docName =
    document.location.search !== ''
      ? document.location.search.substring(1).split('&')[0]
      : docs[0]?.filename || 'README.md'

  const currentDoc = docs.find((doc) => doc.filename === docName) || docs[0]

  const { app } = tosi({
    app: {
      docs,
      currentDoc,
      compact: false,
    },
  })

  // Test result tracking
  const pageTestResults: Record<string, PageTestResults> = {}
  let testResultsResolve: ((results: DocTestResults) => void) | undefined
  let backgroundTestsStarted = false
  let pagesWithTests = 0
  let pagesTested = 0

  // Set up global promise for scriptable browser integration
  window.__docTestResults = new Promise((resolve) => {
    testResultsResolve = resolve
  })

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

      // Post results to dev server on localhost
      if (isLocalhost) {
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
      elt.setAttribute('href', `?${filename}`)
    },
  }

  bindings.current = {
    toDOM(elt, currentFile) {
      const boundFile = elt.getAttribute('href') || ''
      elt.classList.toggle('current', currentFile === boundFile.substring(1))
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

  window.addEventListener('popstate', () => {
    const filename = window.location.search.substring(1)
    app.currentDoc =
      app.docs.find((doc: any) => doc.filename === filename) || app.docs[0]
  })

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
          const nav = document.querySelector(SideNav.tagName!) as SideNav
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

  if (projectLinks.tosijs) {
    headerContent.push(
      a({ class: 'iconic', title: 'tosijs', target: '_blank' }, icons.tosi(), {
        href: projectLinks.tosijs,
      })
    )
  }

  if (projectLinks.discord) {
    headerContent.push(
      a(
        { class: 'iconic', title: 'discord', target: '_blank' },
        icons.discord(),
        { href: projectLinks.discord }
      )
    )
  }

  if (projectLinks.blog) {
    headerContent.push(
      a({ class: 'iconic', title: 'blog', target: '_blank' }, icons.blog(), {
        href: projectLinks.blog,
      })
    )
  }

  if (projectLinks.github) {
    headerContent.push(
      a(
        { class: 'iconic', title: 'github', target: '_blank' },
        icons.github(),
        { href: projectLinks.github }
      )
    )
  }

  if (projectLinks.npm) {
    headerContent.push(
      a({ class: 'iconic', title: 'npmjs', target: '_blank' }, icons.npm(), {
        href: projectLinks.npm,
      })
    )
  }

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
    sideNav(
      {
        name: 'Documentation',
        navSize,
        minSize,
        style: {
          flex: '1 1 auto',
          overflow: 'hidden',
        },
        onChange() {
          const nav = document.querySelector(SideNav.tagName!) as SideNav
          app.compact = nav.compact as any
        },
      },
      searchField,
      div(
        {
          slot: 'nav',
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: 'calc(100% - 44px)',
            overflowY: 'scroll',
          },
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
                const a = event.target as HTMLAnchorElement
                const doc = getListItem(event.target as HTMLElement)
                const nav = (event.target as HTMLElement).closest(
                  'xin-sidenav'
                ) as SideNav
                nav.contentVisible = true
                const { href } = a
                window.history.pushState({ href }, '', href)
                app.currentDoc = doc
                event.preventDefault()

                // If this page has failing tests, scroll to first failure after render
                const docFilename = String((doc as Doc).filename)
                const results = pageTestResults[docFilename]
                if (results && !results.passed) {
                  setTimeout(() => {
                    const failedExample = document.querySelector(
                      'xin-example.-test-failed'
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
            },
            xinLocalized({ bindText: '^.title' })
          )
        )
      ),
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
        markdownViewer({
          style: {
            display: 'block',
            maxWidth: '44em',
            margin: 'auto',
            padding: `0 1em`,
            overflow: 'hidden',
          },
          bindValue: 'app.currentDoc.text',
          didRender(this: MarkdownViewer) {
            LiveExample.insertExamples(this, context)
          },
        })
      )
    )
  )

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
              window.history.pushState(
                { href: `?${filename}` },
                '',
                `?${filename}`
              )
              app.currentDoc = docObj
              // Scroll to failing test after render
              setTimeout(() => {
                const failedExample = document.querySelector(
                  'xin-example.-test-failed'
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

  // Listen for test completion events
  container.addEventListener('testcomplete', ((event: CustomEvent) => {
    handleTestComplete(event)
    updateTestWidget()
  }) as EventListener)

  // Background test runner for all doc pages
  const runBackgroundTests = async () => {
    if (backgroundTestsStarted) return
    if (!testManager.enabled.value) return
    backgroundTestsStarted = true

    // Find all docs that have test blocks
    const docsWithTests = docs.filter((doc) => doc.text.includes('```test'))
    pagesWithTests = docsWithTests.length

    if (pagesWithTests > 0) {
      setTestWidgetRunning()
    }

    if (pagesWithTests === 0) {
      // No tests to run, resolve immediately
      if (testResultsResolve) {
        testResultsResolve({ passed: 0, failed: 0, pages: {} })
        testResultsResolve = undefined
      }
      return
    }

    // Create a hidden iframe to run tests in background
    const testFrame = document.createElement('iframe')
    testFrame.style.cssText =
      'position: fixed; left: -9999px; width: 800px; height: 600px; visibility: hidden;'
    document.body.appendChild(testFrame)

    const currentFilename = String(app.currentDoc.filename)

    for (const doc of docsWithTests) {
      // Skip current page - it will run tests naturally
      if (doc.filename === currentFilename) {
        continue
      }

      // Reset page results for this doc
      pageTestResults[doc.filename] = {
        passed: true,
        tests: [],
        totalPassed: 0,
        totalFailed: 0,
      }

      // Create a container and render the doc content
      const testContainer = document.createElement('div')
      const viewer = markdownViewer({
        value: doc.text,
        didRender() {
          LiveExample.insertExamples(this as MarkdownViewer, context)
        },
      })
      testContainer.appendChild(viewer)

      // Listen for test results from this container
      const handleBgTest = (event: CustomEvent) => {
        const { results } = event.detail as { results: TestResults }
        const pageResults = pageTestResults[doc.filename]
        pageResults.tests.push(...results.tests)
        pageResults.totalPassed += results.passed
        pageResults.totalFailed += results.failed
        pageResults.passed = pageResults.totalFailed === 0
        updateDocTestStatus(doc.filename)
        updateTestWidget()
      }
      testContainer.addEventListener(
        'testcomplete',
        handleBgTest as EventListener
      )

      // Append to iframe for execution
      const frameDoc = testFrame.contentDocument
      if (frameDoc) {
        frameDoc.body.innerHTML = ''
        frameDoc.body.appendChild(testContainer)

        // Wait for all live examples to finish rendering/testing
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      markPageTested(doc.filename)
    }

    // Clean up
    testFrame.remove()

    // Mark current page as tested if it has tests
    if (docsWithTests.some((d) => d.filename === currentFilename)) {
      // Current page tests will complete naturally, just wait a bit
      setTimeout(() => {
        markPageTested(currentFilename)
      }, 1000)
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

  // Start now if enabled, and watch for toggle
  startBackgroundTests()
  testManager.enabled.observe(startBackgroundTests)

  return container as HTMLElement
}
