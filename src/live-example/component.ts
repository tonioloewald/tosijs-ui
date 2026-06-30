/*#
# example

`<tosi-example>` makes it easy to insert interactive code examples in a web page. It
started life as a super lightweight, easier-to-embed implementation of
[b8rjs's fiddle component](https://b8rjs.com)—which I dearly missed—but now the student
is, by far, the master. And it's still super lightweight.

*You're probably looking at it right now.*

```js
// this code executes in an async function body
// it has tosijs, tosijsui, and preview (the preview div) available as local variables
import { div } from 'tosijs'.elements
preview.append(div({class: 'example'}, 'fiddle de dee!'))
preview.append('Try editing some code and hitting refresh…')
```
```html
<h2>Example</h2>
```
```css
.preview {
  padding: 0 var(--spacing);
}

.example {
  animation: throb ease-in-out 1s infinite alternate;
}

@keyframes throb {
  from { color: blue }
  to { color: red }
}
```

## Source dialects: `js`, `tjs`, `ts`

The executable block's fence language picks how the source is compiled before it
runs, via [tjs-lang](https://www.npmjs.com/package/tjs-lang):

- **`js`** — plain JavaScript, run as-is (tjs's `dialect: 'js'` leaves vanilla JS
  untouched, so there's no surprise rewriting).
- **`tjs`** — [tjs-lang](https://www.npmjs.com/package/tjs-lang) source, lowered to
  JavaScript. Type annotations and tjs's safety transforms are compiled away.
- **`ts`** — TypeScript, lowered to tjs (via `tjs-lang/browser/from-ts`) and then to
  JavaScript. The TypeScript compiler loads lazily, only for pages that use it.

A `tjs` block — note the type annotation (which a plain `js` block couldn't run)
and the inline `test '…' { … }` unit test. Open the code panel: the source tab
is labeled **tjs**, with read-only **JS** (the compiled output) and **tjs tests**
(the inline-test results) tabs, alongside the **DOM tests** tab.

```tjs
import { div } from 'tosijs'.elements

function badge(label: string, n: number) {
  return `${label}: ${n}`
}

test 'badge formats label and number' {
  expect(badge('count', 42)).toBe('count: 42')
}

preview.append(div({ class: 'badge' }, badge('count', 42)))
```
```test
test('tjs example transpiled and ran', () => {
  const badge = preview.querySelector('.badge')
  expect(badge).not.toBe(null)
  expect(badge.textContent).toBe('count: 42')
})
```

The inline test above is tjs's native `test '…' { … }` syntax. In a *TypeScript*
example the equivalent is written inside a comment (so it survives `tsc`) — but
that comment form can't appear inside a doc comment like this one, since the
test's own closing delimiter would end the doc comment.

## CSS Isolation with `iframe`

Add the `iframe` attribute to render the preview inside an iframe for complete CSS isolation.

## Test Blocks

Add `\`\`\`test` code blocks to write inline tests that run against the preview:

```html
<button class="demo-btn">Click me</button>
```
```js
preview.querySelector('.demo-btn').onclick = () => {
  preview.querySelector('.demo-btn').textContent = 'Clicked!'
}
```
```test
test('button exists', () => {
  const btn = preview.querySelector('.demo-btn')
  expect(btn).toBeDefined()
  expect(btn.textContent).toBe('Click me')
})

test('slow test shows running state', async () => {
  await waitMs(500)
  expect(true).toBe(true)
})
```

Tests have access to:
- `preview` - the DOM element containing the rendered HTML
- `expect(value)` - Jest-like assertions (.toBe, .toEqual, .toBeTruthy, etc.)
- `test(name, fn)` - define a test case (can be async)
- `describe(name, fn)` - group tests
- `waitMs(ms)` - wait for a specified number of milliseconds
- `waitFor(selector, timeout?)` - wait for an element to appear (default 1s timeout)
- All context libraries (tosijs, tosijs-ui, etc.)

### Async Tests

Tests can be async functions. Use `waitMs` for simple delays and `waitFor` to wait
for dynamically created elements:

```html
<button class="async-btn">Load Data</button>
<div class="result"></div>
```
```js
preview.querySelector('.async-btn').onclick = () => {
  setTimeout(() => {
    preview.querySelector('.result').innerHTML = '<span class="data">Loaded!</span>'
  }, 100)
}
// Auto-click to trigger the async behavior
preview.querySelector('.async-btn').click()
```
```test
test('waitFor finds dynamically created element', async () => {
  const data = await waitFor('.data')
  expect(data.textContent).toBe('Loaded!')
})

test('waitMs delays execution', async () => {
  const start = Date.now()
  await waitMs(50)
  expect(Date.now() - start).toBeGreaterThan(40)
})
```

## `context`

A `<tosi-example>` is given a `context` object which is the set of values available
in the javascript's execution context. The context always includes `preview`.

```
import * as tosijs from 'tosijs'
import * as tosijsui from 'tosijs-ui'

context = {
  tosijs,
  'tosijs-ui': tosijsui
}
```
*/

/*{ "parent": "Components" }*/

import { Component, ElementCreator, elements, tosi } from 'tosijs'
import { codeEditor, CodeEditor } from '../code-editor'
import { tosiTabs } from '../tab-selector'
import { icons } from '../icons'
import { popMenu } from '../menu'

import { Dialect, ExampleContext, ExampleParts, TransformFn } from './types'
import {
  loadTransform,
  loadTjsTestApi,
  rewriteImports,
  contextVarName,
  AsyncFunction,
  TjsTestResult,
} from './code-transform'
import {
  STORAGE_KEY,
  createRemoteKey,
  RemoteSyncManager,
  openEditorWindow,
} from './remote-sync'
import { executeInline, executeInIframe } from './execution'
import { insertExamples } from './insert-examples'
import { rewriteExampleBlocks } from './save-to-source'
import {
  exampleEditKey,
  saveExampleEdit,
  loadExampleEdit,
  clearExampleEdit,
  hasExampleEdit,
  ExampleEdit,
} from './example-store'
import { liveExampleStyleSpec } from './styles'
import { runTests, TestResults } from './test-harness'

const { div, tosiSlot, style, button, pre, span } = elements

// Test mode: controlled by localStorage, defaults to enabled on localhost
const TESTS_ENABLED_KEY = 'tosijs-ui-tests-enabled'

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

function getStoredTestsEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false
  const stored = localStorage.getItem(TESTS_ENABLED_KEY)
  if (stored !== null) {
    return stored === 'true'
  }
  // Default: enabled on localhost, disabled elsewhere
  return isLocalhost
}

// Test manager - observable state for test mode
export const { testManager } = tosi({
  testManager: {
    enabled: getStoredTestsEnabled(),
  },
})

// Set CSS variable on body for test visibility (CSS vars pierce shadow DOM)
function updateTestsEnabledClass() {
  document.body.classList.toggle('tests-enabled', testManager.enabled.value)
  document.body.style.setProperty(
    '--tests-enabled',
    testManager.enabled.value ? '1' : '0'
  )
}
if (typeof document !== 'undefined') {
  // Set initial state when DOM is ready
  if (document.body) {
    updateTestsEnabledClass()
  } else {
    document.addEventListener('DOMContentLoaded', updateTestsEnabledClass)
  }
}

/** Enable test mode (runs tests and shows indicators) */
export function enableTests(): void {
  localStorage.setItem(TESTS_ENABLED_KEY, 'true')
  testManager.enabled.value = true
  updateTestsEnabledClass()
  // Re-run tests on all existing examples
  document.querySelectorAll('tosi-example').forEach((el) => {
    ;(el as LiveExample).refresh()
  })
}

/** Disable test mode */
export function disableTests(): void {
  localStorage.setItem(TESTS_ENABLED_KEY, 'false')
  testManager.enabled.value = false
  updateTestsEnabledClass()
}

export class LiveExample extends Component<ExampleParts> {
  static preferredTagName = 'tosi-example'
  static lightStyleSpec = liveExampleStyleSpec

  static initAttributes = {
    persistToDom: false,
    iframe: false,
  }

  prefix = 'lx'
  storageKey = STORAGE_KEY
  context: ExampleContext = {}
  uuid: string = crypto.randomUUID()
  remoteId = ''

  private remoteSync?: RemoteSyncManager
  private undoInterval?: ReturnType<typeof setInterval>
  private testResults?: TestResults
  private pendingValues: Record<string, string> = {}
  private pendingShowDefaultTab = false
  private beforeUnloadHandler?: () => void

  static insertExamples(
    element: HTMLElement,
    context: ExampleContext = {},
    sourceFile?: string
  ): void {
    insertExamples(
      element,
      context,
      liveExample,
      LiveExample.tagName as string,
      sourceFile
    )
  }

  get activeTab(): Element | undefined {
    const { editors } = this.parts
    return [...editors.children].find(
      (elt) => elt.getAttribute('hidden') === null
    )
  }

  private get hydrated(): boolean {
    try {
      return this.parts.js !== undefined
    } catch {
      return false
    }
  }

  private getEditorValue(which: string): string {
    if (!this.hydrated) return this.pendingValues[which] ?? ''
    return (this.parts[which] as CodeEditor).value
  }

  private setEditorValue(which: string, code: string): void {
    if (!this.hydrated) {
      this.pendingValues[which] = code
      return
    }
    const codeEditor = this.parts[which] as CodeEditor
    codeEditor.value = code
  }

  private flushPendingValues(): void {
    for (const [which, code] of Object.entries(this.pendingValues)) {
      const codeEditor = this.parts[which] as CodeEditor
      if (codeEditor) codeEditor.value = code
    }
    this.pendingValues = {}

    if (this.pendingShowDefaultTab) {
      this.pendingShowDefaultTab = false
      this.showDefaultTab()
    }
  }

  get css(): string {
    return this.getEditorValue('css')
  }
  set css(code: string) {
    this.setEditorValue('css', code)
  }

  get html(): string {
    return this.getEditorValue('html')
  }
  set html(code: string) {
    this.setEditorValue('html', code)
  }

  get js(): string {
    return this.getEditorValue('js')
  }
  set js(code: string) {
    this.setEditorValue('js', code)
  }

  get test(): string {
    return this.getEditorValue('test')
  }
  set test(code: string) {
    this.setEditorValue('test', code)
  }

  get remoteKey(): string {
    return createRemoteKey(this.prefix, this.uuid, this.remoteId)
  }

  // The source block's dialect (js | tjs | ts). Set by insert-examples from the
  // fenced-block language; persisted as an attribute so it survives a re-render.
  // `js` is the default and keeps the original pass-through behavior.
  get dialect(): Dialect {
    return (this.getAttribute('data-dialect') as Dialect) || 'js'
  }
  set dialect(value: Dialect) {
    this.setAttribute('data-dialect', value)
  }

  // ── Read-only product tabs (tjs/ts only) ──────────────────────────────────
  // A `tjs`/`ts` example's source is editable; the JavaScript it compiles to is
  // shown read-only in an extra "JS" tab. The tab is added lazily (examples show
  // every named editor as a tab, so a static child would pollute plain-`js`
  // examples) the first time the code panel opens. `js` examples get nothing.
  private jsOutEditor?: CodeEditor
  private tjsTestsView?: HTMLElement
  private productTabsReady = false
  private lastGeneratedJs = ''
  private inlineTjsTestCount = 0
  private lastTjsTests?: TjsTestResult

  // Run the example's inline tjs tests (the `/*test 'desc' { … }*/` comments in
  // the tjs/ts source — distinct from the DOM-testing `test` block). Extract +
  // strip the tests, transpile the rest the same way execution does, then run
  // `execJs + testUtils + return testRunner` with the example context injected.
  private async runInlineTjsTests(transform: TransformFn): Promise<void> {
    if (this.dialect === 'js') {
      this.inlineTjsTestCount = 0
      return
    }
    const api = await loadTjsTestApi()
    if (!api) {
      this.inlineTjsTestCount = 0
      return
    }
    let extracted
    try {
      extracted = api.extractTests(this.js)
    } catch {
      this.inlineTjsTestCount = 0
      return
    }
    this.inlineTjsTestCount = extracted.tests.length
    if (extracted.tests.length === 0) {
      this.lastTjsTests = undefined
      this.renderTjsTests()
      return
    }
    try {
      const execJs = (
        await transform(rewriteImports(extracted.code, Object.keys(this.context)))
      ).code
      const body = `${execJs}\n${api.testUtils}\nreturn ${extracted.testRunner}`
      // The test-stripped source still runs its top-level statements (to define
      // the functions under test), which may touch `preview` — give them a
      // throwaway one, mirroring execution's `{ preview, ...context }` scope.
      const fullContext = { preview: div({ class: 'preview' }), ...this.context }
      const keys = Object.keys(fullContext).map(contextVarName)
      const values = Object.values(fullContext)
      // @ts-expect-error AsyncFunction constructor typing
      const fn = new AsyncFunction(...keys, body)
      this.lastTjsTests = (await fn(...values)) as TjsTestResult
    } catch (error) {
      this.lastTjsTests = {
        passed: 0,
        failed: 1,
        results: [
          {
            description: 'inline tests failed to run',
            passed: false,
            error: String(error),
          },
        ],
      }
    }
    this.renderTjsTests()
  }

  private renderTjsTests(): void {
    const view = this.tjsTestsView
    if (!view) return
    const results = this.lastTjsTests
    if (!results || results.results.length === 0) {
      view.replaceChildren(div({ class: 'tjs-test-empty' }, 'No inline tjs tests.'))
      return
    }
    view.replaceChildren(
      div(
        { class: 'tjs-test-summary' },
        `${results.passed}/${results.results.length} passed`
      ),
      ...results.results.map((r) =>
        div(
          { class: r.passed ? 'test-pass' : 'test-fail' },
          `${r.passed ? '✓' : '✗'} ${r.description}`,
          r.error ? span({ class: 'tjs-test-error' }, ` — ${r.error}`) : ''
        )
      )
    )
  }

  // The JavaScript `this.js` compiles to under the current dialect — the same
  // pipeline execution runs (rewriteImports → dialect transform), so the tab
  // shows what actually executes. Transpile errors render as a comment.
  private async computeGeneratedJs(transform: TransformFn): Promise<string> {
    if (this.dialect === 'js') return ''
    try {
      return (
        await transform(rewriteImports(this.js, Object.keys(this.context)))
      ).code
    } catch (error) {
      return `// transpile error:\n// ${(error as Error).message}`
    }
  }

  private ensureProductTabs(): void {
    if (this.productTabsReady || this.dialect === 'js' || !this.hydrated) return
    this.productTabsReady = true
    const { editors } = this.parts
    // Relabel the source tab from "js" to the actual dialect (the `part` stays
    // `js`, so everything referencing this.parts.js / this.js is unaffected).
    this.parts.js.setAttribute('name', this.dialect)
    this.jsOutEditor = codeEditor({
      name: 'JS',
      mode: 'javascript',
      disabled: true,
    }) as unknown as CodeEditor
    editors.append(this.jsOutEditor)
    // Add a read-only "tjs tests" results tab only when the source has inline
    // `/*test*/` tests (computed during refresh, which runs before first open).
    if (this.inlineTjsTestCount > 0) {
      this.tjsTestsView = div({ name: 'tjs tests', class: 'tjs-test-results' })
      editors.append(this.tjsTestsView)
    }
    editors.setupTabs()
    this.jsOutEditor.value = this.lastGeneratedJs
    this.renderTjsTests()
  }

  updateUndo = () => {
    const { activeTab } = this
    const { undo, redo } = this.parts
    if (activeTab instanceof CodeEditor && activeTab.editor !== undefined) {
      const undoManager = activeTab.editor.session.getUndoManager()
      undo.disabled = !undoManager.hasUndo()
      redo.disabled = !undoManager.hasRedo()
    } else {
      undo.disabled = true
      redo.disabled = true
    }
    this.updateEditedIndicator()
    this.updateTestResultsVisibility()
  }

  private updateTestResultsVisibility(): void {
    const { testResults: resultsEl } = this.parts
    const results = this.testResults
    // The "DOM tests" tab's editor is this.parts.test (the part stays `test`
    // even though the tab label changed).
    const isTestTabActive = this.activeTab === this.parts.test
    const hasFailed = results && results.failed > 0

    // Show results if: has results AND (test tab is active OR there are failures)
    resultsEl.hidden =
      !results || results.tests.length === 0 || (!isTestTabActive && !hasFailed)
  }

  undo = () => {
    const { activeTab } = this
    if (activeTab instanceof CodeEditor) {
      activeTab.editor.undo()
    }
  }

  redo = () => {
    const { activeTab } = this
    if (activeTab instanceof CodeEditor) {
      activeTab.editor.redo()
    }
  }

  get isMaximized(): boolean {
    return this.classList.contains('-maximize')
  }

  flipLayout = () => {
    this.classList.toggle('-vertical')
  }

  // Persist this example's edits back to the source file's fenced blocks, located
  // by the source↔doc map (data-source-file + data-example-ordinal). Dev only —
  // writes via the /__docstore/source endpoint; the watcher then rebuilds.
  saveToSource = async (): Promise<void> => {
    const sourceFile = this.getAttribute('data-source-file')
    const ordinalAttr = this.getAttribute('data-example-ordinal')
    if (!sourceFile || ordinalAttr === null) {
      window.alert('No source mapping for this example.')
      return
    }
    let content: string
    try {
      const response = await fetch(
        `/__docstore/source?file=${encodeURIComponent(sourceFile)}`
      )
      if (!response.ok) throw new Error(String(response.status))
      content = await response.text()
    } catch {
      window.alert(
        'Source endpoint unavailable — saving to source works in dev only.'
      )
      return
    }
    const updated = rewriteExampleBlocks(content, Number(ordinalAttr), {
      js: this.js,
      html: this.html,
      css: this.css,
      test: this.test,
    })
    if (updated === null) {
      window.alert('Nothing to save (no matching blocks or no changes).')
      return
    }
    try {
      const response = await fetch('/__docstore/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: sourceFile, content: updated }),
      })
      if (!response.ok) throw new Error(String(response.status))
      window.alert(`Saved to ${sourceFile}`)
    } catch {
      window.alert('Save failed.')
    }
  }

  exampleMenu = () => {
    const testsOn = testManager.enabled.value
    popMenu({
      target: this.parts.exampleWidgets,
      width: 'auto',
      menuItems: [
        {
          icon: 'edit2',
          caption: 'view/edit code',
          action: this.showCode,
        },
        {
          icon: 'edit',
          caption: 'view/edit code in a new window',
          action: this.openEditorWindow,
        },
        null,
        {
          icon: this.isMaximized ? 'minimize' : 'maximize',
          caption: this.isMaximized ? 'restore preview' : 'maximize preview',
          action: this.toggleMaximize,
        },
        null,
        {
          icon: testsOn ? 'check' : '',
          caption: 'Run tests',
          action: () => {
            if (testsOn) {
              disableTests()
            } else {
              enableTests()
            }
          },
        },
      ],
    })
  }

  handleShortcuts = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey) {
      let block = false
      switch (event.key) {
        case 's':
        case 'r':
          this.doRefresh()
          block = true
          break
        case '/':
          this.flipLayout()
          break
        case 'c':
          if (event.shiftKey) {
            this.copy()
            block = true
          }
          break
      }
      if (block) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
  }

  content = () => [
    div(
      { part: 'example' },
      style({ part: 'style' }),
      div({ part: 'testIndicator', title: 'test status' }),
      pre({ part: 'testResults', hidden: true }),
      button(
        {
          title: 'example menu',
          part: 'exampleWidgets',
          onClick: this.exampleMenu,
        },
        icons.code()
      )
    ),
    div(
      {
        class: 'code-editors',
        part: 'codeEditors',
        onKeydown: this.handleShortcuts,
        hidden: true,
      },
      tosiTabs(
        {
          part: 'editors',
          onChange: this.updateUndo,
        },
        codeEditor({ name: 'js', mode: 'javascript', part: 'js' }),
        codeEditor({ name: 'html', mode: 'html', part: 'html' }),
        codeEditor({ name: 'css', mode: 'css', part: 'css' }),
        // The `test` block tests the rendered preview (DOM), so its tab is
        // labeled "DOM tests" to distinguish it from inline tjs unit tests. The
        // `part`/`name` stay `test`; only the displayed label differs.
        codeEditor({ name: 'DOM tests', mode: 'javascript', part: 'test' }),
        div(
          { slot: 'after-tabs', class: 'row' },
          button(
            {
              title: 'undo',
              part: 'undo',
              class: 'transparent',
              onClick: this.undo,
            },
            icons.cornerUpLeft()
          ),
          button(
            {
              title: 'redo',
              part: 'redo',
              class: 'transparent',
              onClick: this.redo,
            },
            icons.cornerUpRight()
          ),
          button(
            {
              title: 'example menu — refresh, flip, undo, copy, save/revert edits',
              class: 'transparent source-menu',
              onClick: this.sourceMenu,
            },
            icons.moreVertical()
          ),
          button(
            {
              title: 'close code',
              class: 'transparent',
              onClick: this.closeCode,
            },
            icons.x()
          )
        )
      )
    ),
    tosiSlot({ part: 'sources', hidden: true }),
  ]

  connectedCallback(): void {
    super.connectedCallback()

    // Flush any values set before the shadow DOM was ready
    this.flushPendingValues()

    const { sources } = this.parts
    this.initFromElements([...sources.children] as HTMLElement[])

    // Set up remote sync
    this.remoteSync = new RemoteSyncManager(
      this.storageKey,
      this.remoteKey,
      (payload) => {
        if (payload.close) {
          if (this.remoteId !== '') {
            // Remote editor window — close the popup
            window.close()
          } else {
            // Original window — restore from maximized state
            this.classList.remove('-maximize')
            this.parts.codeEditors.hidden = true
          }
          return
        }
        this.css = payload.css
        this.html = payload.html
        this.js = payload.js
        if (payload.test) this.test = payload.test
        this.refresh()
      }
    )
    this.remoteSync.startListening()

    // Stochastic undo-state polling — jittered base interval avoids
    // synchronizing when many examples are on the same page.
    const jitter = Math.random() * 100
    this.undoInterval = setInterval(() => {
      if (!document.hidden) this.updateUndo()
    }, 250 + jitter)

    // Send close signal when the tab/window closes — disconnectedCallback
    // does not fire reliably during page unload.
    this.beforeUnloadHandler = () => this.remoteSync?.sendClose()
    addEventListener('beforeunload', this.beforeUnloadHandler)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    this.remoteSync?.sendClose()
    this.remoteSync?.stopListening()

    if (this.undoInterval) {
      clearInterval(this.undoInterval)
      this.undoInterval = undefined
    }

    if (this.beforeUnloadHandler) {
      removeEventListener('beforeunload', this.beforeUnloadHandler)
      this.beforeUnloadHandler = undefined
    }
  }

  private exampleMarkdown(): string {
    const block = (lang: string, code: string) =>
      code !== '' ? '```' + lang + '\n' + code.trim() + '\n```\n' : ''
    return (
      block(this.dialect, this.js) +
      block('html', this.html) +
      block('css', this.css) +
      block('test', this.test)
    )
  }

  copy = () => {
    navigator.clipboard.writeText(this.exampleMarkdown())
  }

  downloadExample = () => {
    const src = this.getAttribute('data-source-file') || 'example'
    const ord = this.getAttribute('data-example-ordinal')
    const name =
      (src.split('/').pop() || 'example').replace(/\.\w+$/, '') +
      (ord !== null ? `-example-${ord}` : '') +
      '.md'
    const url = URL.createObjectURL(
      new Blob([this.exampleMarkdown()], { type: 'text/markdown' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // ── Local edit scratchpad (per-browser; keyed by the source↔doc map) ───────
  // The original source blocks, snapshotted at mount so "revert" can restore
  // them after a locally-saved edit.
  private originalCode: ExampleEdit | null = null

  private localEditKey(): string {
    const src = this.getAttribute('data-source-file')
    const ord = this.getAttribute('data-example-ordinal')
    return src && ord !== null ? exampleEditKey(src, ord) : ''
  }

  private applyEdit(edit: ExampleEdit): void {
    if (edit.js !== undefined) this.js = edit.js
    if (edit.html !== undefined) this.html = edit.html
    if (edit.css !== undefined) this.css = edit.css
    if (edit.test !== undefined) this.test = edit.test
  }

  // "Has edits" = current code differs from the snapshotted original (trailing
  // whitespace ignored, since editors normalize it). Drives Save/Revert enabled
  // state and the local-edit indicator.
  hasLocalEdits(): boolean {
    if (!this.originalCode) return false
    const o = this.originalCode
    const t = (s?: string) => (s ?? '').replace(/\s+$/, '')
    return (
      t(this.js) !== t(o.js) ||
      t(this.html) !== t(o.html) ||
      t(this.css) !== t(o.css) ||
      t(this.test) !== t(o.test)
    )
  }

  private updateEditedIndicator(): void {
    this.classList.toggle('-locally-edited', this.hasLocalEdits())
  }

  private canUndo(): boolean {
    const t = this.activeTab
    return (
      t instanceof CodeEditor &&
      t.editor !== undefined &&
      t.editor.session.getUndoManager().hasUndo()
    )
  }

  private canRedo(): boolean {
    const t = this.activeTab
    return (
      t instanceof CodeEditor &&
      t.editor !== undefined &&
      t.editor.session.getUndoManager().hasRedo()
    )
  }

  saveLocalEdit = () => {
    const key = this.localEditKey()
    if (!key) {
      window.alert('This example has no source mapping to key a local save.')
      return
    }
    saveExampleEdit(key, {
      js: this.js,
      html: this.html,
      css: this.css,
      test: this.test,
    })
    this.updateEditedIndicator()
  }

  revertLocalEdit = () => {
    const key = this.localEditKey()
    if (key) clearExampleEdit(key)
    if (this.originalCode) this.applyEdit(this.originalCode)
    // Reverting leaves nothing to diff — drop out of the diff view if we're in it.
    if (this.viewingChanges) this.viewChanges()
    this.updateEditedIndicator()
    this.refresh()
  }

  // Called once by insert-examples after the source blocks + map attrs are set:
  // snapshot the original, then restore any saved local edit on top.
  snapshotAndRestoreLocalEdit = () => {
    // this.js/html/css/test are guarded (return '' before hydration). Do NOT
    // touch this.parts.* directly here — that throws "elementRef does not exist"
    // when the example isn't hydrated yet, which breaks the whole doc render.
    // Editor diff baselines are applied later, in viewChanges().
    this.originalCode = {
      js: this.js,
      html: this.html,
      css: this.css,
      test: this.test,
    }
    const key = this.localEditKey()
    if (!key || !hasExampleEdit(key)) return
    const edit = loadExampleEdit(key)
    if (edit) {
      this.applyEdit(edit)
      this.updateEditedIndicator()
      this.refresh()
    }
  }

  // Toggle a per-tab diff (current vs original source) across the example's
  // editors. Each editor diffs its own single text — no need to combine the
  // html/css/js/test split — so switching tabs shows that tab's changes.
  viewingChanges = false
  viewChanges = () => {
    if (!this.hydrated) return
    this.viewingChanges = !this.viewingChanges
    if (this.viewingChanges) this.showCode()
    const originals = this.originalCode ?? {}
    for (const tab of ['js', 'html', 'css', 'test'] as const) {
      // Set the diff baseline (the source) right before showing the diff, now
      // that the editors are hydrated.
      this.parts[tab].original = originals[tab] ?? ''
      this.parts[tab].showDiff(this.viewingChanges)
    }
  }

  // The example's overflow menu. Stable item set — actions stay put and toggle
  // enabled (Save/Revert key off whether there are edits); items are only hidden
  // when they could NEVER apply here (local save needs a source-map key; save to
  // source additionally needs the dev server). Shortcuts are display-only; the
  // keys are routed by handleShortcuts / the editor, not the menu.
  // Refresh means different things in the two modes: the page-embedded example
  // re-runs itself; the pop-out editor window (refresh() is a no-op there) pushes
  // its code to the main window so IT re-runs.
  doRefresh = () => {
    if (this.remoteId !== '') {
      this.refreshRemote()
    } else {
      void this.refresh()
    }
  }

  sourceMenu = (event: Event) => {
    const key = this.localEditKey()
    const hasEdits = () => this.hasLocalEdits()
    // View changes / Revert need the source snapshot, which only the page-embedded
    // example has — the pop-out editor window has no originalCode to compare to.
    const hasSnapshot = this.originalCode != null
    popMenu({
      target: (event.target as HTMLElement).closest('button') as HTMLElement,
      width: 'auto',
      menuItems: [
        {
          icon: 'refreshCw',
          caption: 'Refresh',
          shortcut: '⌘R',
          action: this.doRefresh,
        },
        { icon: 'columns', caption: 'Flip layout', shortcut: '⌘/', action: this.flipLayout },
        {
          icon: 'cornerUpLeft',
          caption: 'Undo',
          shortcut: '⌘Z',
          action: this.undo,
          enabled: () => this.canUndo(),
        },
        {
          icon: 'cornerUpRight',
          caption: 'Redo',
          shortcut: '⌘⇧Z',
          action: this.redo,
          enabled: () => this.canRedo(),
        },
        null,
        { icon: 'copy', caption: 'Copy as markdown', shortcut: '⌘⇧C', action: this.copy },
        { icon: 'download', caption: 'Download', action: this.downloadExample },
        null,
        ...(hasSnapshot
          ? [
              this.viewingChanges
                ? { icon: 'edit', caption: 'Back to editing', action: this.viewChanges }
                : {
                    icon: 'code',
                    caption: 'View changes',
                    action: this.viewChanges,
                    enabled: hasEdits,
                  },
            ]
          : []),
        ...(key
          ? [
              {
                icon: 'save',
                caption: 'Save changes (local)',
                action: this.saveLocalEdit,
                enabled: hasEdits,
              },
            ]
          : []),
        ...(key && isLocalhost
          ? [
              {
                icon: 'upload',
                caption: 'Save to source',
                action: () => {
                  void this.saveToSource()
                },
                enabled: hasEdits,
              },
            ]
          : []),
        ...(hasSnapshot
          ? [
              {
                icon: 'rotateCcw',
                caption: 'Revert to original',
                action: this.revertLocalEdit,
                enabled: hasEdits,
              },
            ]
          : []),
      ],
    })
  }

  toggleMaximize = () => {
    this.classList.toggle('-maximize')
  }

  showCode = () => {
    this.classList.add('-maximize')
    this.classList.toggle('-vertical', this.offsetHeight > this.offsetWidth)
    this.parts.codeEditors.hidden = false
    this.ensureProductTabs()
  }

  closeCode = () => {
    if (this.remoteId !== '') {
      // Remote editor window — send close signal to original, then close popup
      this.remoteSync?.sendClose()
      window.close()
    } else {
      // Original window — restore and close any remote editor
      this.remoteSync?.sendClose()
      this.classList.remove('-maximize')
      this.parts.codeEditors.hidden = true
    }
  }

  openEditorWindow = () => {
    const { css, html, js, test } = this
    openEditorWindow(this.prefix, this.uuid, this.storageKey, this.remoteKey, {
      css,
      html,
      js,
      test,
    })
    // Maximize preview — the remote window handles code editing
    this.classList.add('-maximize')
  }

  refreshRemote = () => {
    this.remoteSync?.send({
      css: this.css,
      html: this.html,
      js: this.js,
      test: this.test,
    })
  }

  updateSources = () => {
    if (this.persistToDom) {
      const { sources } = this.parts
      sources.innerText = ''
      for (const language of ['js', 'css', 'html', 'test']) {
        if (this[language as 'js' | 'css' | 'html' | 'test']) {
          sources.append(
            pre({
              class: `language-${language}`,
              innerHTML: this[language as 'js' | 'css' | 'html' | 'test'],
            })
          )
        }
      }
    }
  }

  refresh = async () => {
    if (this.remoteId !== '') return

    const transform = await loadTransform(this.dialect)
    const { example, style: styleEl, exampleWidgets } = this.parts

    // Keep the read-only generated-JS tab (tjs/ts) in sync with the source, and
    // re-run any inline tjs tests for the "tjs tests" results tab.
    if (this.dialect !== 'js') {
      this.lastGeneratedJs = await this.computeGeneratedJs(transform)
      if (this.jsOutEditor) this.jsOutEditor.value = this.lastGeneratedJs
      await this.runInlineTjsTests(transform)
    }

    let preview: HTMLElement | null
    let executionError: Error | undefined

    const onError = (error: Error) => {
      executionError = error
    }

    if (this.iframe) {
      preview = await executeInIframe({
        html: this.html,
        css: this.css,
        js: this.js,
        context: this.context,
        transform,
        exampleElement: example,
        widgetsElement: exampleWidgets,
        onError,
      })
    } else {
      preview = await executeInline({
        html: this.html,
        css: this.css,
        js: this.js,
        context: this.context,
        transform,
        exampleElement: example,
        styleElement: styleEl,
        widgetsElement: exampleWidgets,
        onError,
      })
    }

    if (this.persistToDom) {
      this.updateSources()
    }

    // Run tests if enabled and there are any
    if ((this.test || executionError) && preview && testManager.enabled.value) {
      // Let queued renders (rAF) settle before running tests
      await new Promise((resolve) => requestAnimationFrame(resolve))

      this.classList.add('-has-tests', '-test-running')
      this.classList.remove('-test-passed', '-test-failed')
      // `test` blocks are conventional JS/TS regardless of the example's dialect,
      // so they're transpiled as plain js — never lowered through tjs/ts.
      const testTransform =
        this.dialect === 'js' ? transform : await loadTransform('js')
      this.testResults = this.test
        ? await runTests(this.test, preview, this.context, testTransform)
        : { passed: 0, failed: 0, tests: [] }
      if (executionError) {
        this.testResults.failed += 1
        this.testResults.tests.unshift({
          name: 'example loads without error',
          passed: false,
          error: String(executionError),
        })
      }
      this.classList.remove('-test-running')
      this.displayTestResults()
    } else {
      this.classList.remove(
        '-has-tests',
        '-test-running',
        '-test-passed',
        '-test-failed'
      )
    }
  }

  private displayTestResults(): void {
    const { testResults: resultsEl, testIndicator } = this.parts
    const results = this.testResults

    if (!results || results.tests.length === 0) {
      resultsEl.hidden = true
      this.classList.remove('-test-passed', '-test-failed')
      testIndicator.title = 'no tests'
      return
    }

    resultsEl.innerHTML = ''

    const summary = div(
      { style: { marginBottom: '8px', fontWeight: 'bold' } },
      `${results.passed}/${results.tests.length} tests passed`
    )
    resultsEl.append(summary)

    for (const test of results.tests) {
      const icon = test.passed ? '✓' : '✗'
      const cls = test.passed ? 'test-pass' : 'test-fail'
      const testEl = div(
        { class: cls },
        span(icon + ' '),
        test.name,
        test.error
          ? span({ style: { opacity: '0.7' } }, ` - ${test.error}`)
          : ''
      )
      resultsEl.append(testEl)
    }

    this.classList.toggle('-test-passed', results.failed === 0)
    this.classList.toggle('-test-failed', results.failed > 0)

    // Update indicator title
    testIndicator.title =
      results.failed === 0
        ? `${results.passed} tests passed`
        : `${results.failed}/${results.tests.length} tests failed`

    // Update visibility based on tab and failure status
    this.updateTestResultsVisibility()

    // Dispatch event for doc-browser to track results
    this.dispatchEvent(
      new CustomEvent('testcomplete', {
        bubbles: true,
        detail: {
          results,
          element: this,
        },
      })
    )
  }

  initFromElements(elements: HTMLElement[]) {
    for (const element of elements) {
      element.hidden = true
      const [mode, ...lines] = element.innerHTML.split('\n') as string[]
      if (['js', 'html', 'css', 'test'].includes(mode)) {
        const minIndex = lines
          .filter((line) => line.trim() !== '')
          .map((line) => (line.match(/^\s*/) as string[])[0].length)
          .sort()[0]
        const source = (
          minIndex > 0 ? lines.map((line) => line.substring(minIndex)) : lines
        ).join('\n')
        this.setEditorValue(mode, source)
      } else {
        const language = ['js', 'html', 'css', 'test'].find((lang) =>
          element.matches(`.language-${lang}`)
        )
        if (language) {
          this.setEditorValue(
            language,
            language === 'html' ? element.innerHTML : element.innerText
          )
        }
      }
    }
  }

  showDefaultTab() {
    if (!this.hydrated) {
      this.pendingShowDefaultTab = true
      return
    }
    const { editors } = this.parts
    if (this.js !== '') {
      editors.value = 0
    } else if (this.html !== '') {
      editors.value = 1
    } else if (this.css !== '') {
      editors.value = 2
    } else if (this.test !== '') {
      editors.value = 3
    }
  }

  render(): void {
    super.render()

    if (this.remoteId !== '') {
      const data = localStorage.getItem(this.storageKey)
      if (data !== null) {
        const payload = JSON.parse(data)
        if (this.remoteKey !== payload.remoteKey) return

        this.css = payload.css
        this.html = payload.html
        this.js = payload.js
        if (payload.test) this.test = payload.test
        this.parts.example.hidden = true
        this.parts.codeEditors.hidden = false
        this.classList.add('-maximize')
        this.updateUndo()
      }
    } else {
      this.refresh()
    }
  }
}

export const liveExample = LiveExample.elementCreator() as ElementCreator<LiveExample>

// Auto-initialize remote editor window
const params = new URL(window.location.href).searchParams
const remoteId = params.get('lx')
if (remoteId) {
  document.title += ' [code editor]'
  document.body.textContent = ''
  document.body.append(liveExample({ remoteId }))
}
