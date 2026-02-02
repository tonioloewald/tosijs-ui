/*#
# example

`<xin-example>` makes it easy to insert interactive code examples in a web page. It
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

You can also use Typescript. It will be stripped down to
Javascript using [sucrase](https://github.com/alangpierce/sucrase).

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

test('this test intentionally fails', () => {
  expect(1 + 1).toBe(3)
})
```

Tests have access to:
- `preview` - the DOM element containing the rendered HTML
- `expect(value)` - Jest-like assertions (.toBe, .toEqual, .toBeTruthy, etc.)
- `test(name, fn)` - define a test case
- `describe(name, fn)` - group tests
- All context libraries (tosijs, tosijs-ui, etc.)

## `context`

A `<xin-example>` is given a `context` object which is the set of values available
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

import { Component, ElementCreator, elements } from 'tosijs'
import { codeEditor, CodeEditor } from '../code-editor'
import { tabSelector, TabSelector } from '../tab-selector'
import { icons } from '../icons'
import { popMenu } from '../menu'

import { ExampleContext, ExampleParts } from './types'
import { loadTransform } from './code-transform'
import {
  STORAGE_KEY,
  createRemoteKey,
  RemoteSyncManager,
  openEditorWindow,
} from './remote-sync'
import { executeInline, executeInIframe } from './execution'
import { insertExamples } from './insert-examples'
import { liveExampleStyleSpec } from './styles'
import { runTests, TestResults } from './test-harness'

const { div, xinSlot, style, button, pre, span } = elements

export class LiveExample extends Component<ExampleParts> {
  static initAttributes = {
    persistToDom: false,
    prettier: false,
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

  static insertExamples(
    element: HTMLElement,
    context: ExampleContext = {}
  ): void {
    insertExamples(element, context, liveExample, LiveExample.tagName as string)
  }

  get activeTab(): Element | undefined {
    const { editors } = this.parts
    return [...editors.children].find(
      (elt) => elt.getAttribute('hidden') === null
    )
  }

  private getEditorValue(which: string): string {
    return (this.parts[which] as CodeEditor).value
  }

  private setEditorValue(which: string, code: string): void {
    const codeEditor = this.parts[which] as CodeEditor
    codeEditor.value = code
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

  exampleMenu = () => {
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
      ],
    })
  }

  handleShortcuts = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey) {
      let block = false
      switch (event.key) {
        case 's':
        case 'r':
          this.refresh()
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
      div({ part: 'testResults', hidden: true }),
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
      tabSelector(
        {
          part: 'editors',
          onChange: this.updateUndo,
        },
        codeEditor({ name: 'js', mode: 'javascript', part: 'js' }),
        codeEditor({ name: 'html', mode: 'html', part: 'html' }),
        codeEditor({ name: 'css', mode: 'css', part: 'css' }),
        codeEditor({ name: 'test', mode: 'javascript', part: 'test' }),
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
              title: 'flip direction (⌘/ | ^/)',
              class: 'transparent',
              onClick: this.flipLayout,
            },
            icons.columns({ class: 'layout-indicator' })
          ),
          button(
            {
              title: 'copy as markdown (⌘⇧C | ^⇧C)',
              class: 'transparent',
              onClick: this.copy,
            },
            icons.copy()
          ),
          button(
            {
              title: 'reload (⌘R | ^R)',
              class: 'transparent',
              onClick: this.refreshRemote,
            },
            icons.refreshCw()
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
    xinSlot({ part: 'sources', hidden: true }),
  ]

  connectedCallback(): void {
    super.connectedCallback()
    const { sources } = this.parts

    this.initFromElements([...sources.children] as HTMLElement[])

    // Set up remote sync
    this.remoteSync = new RemoteSyncManager(
      this.storageKey,
      this.remoteKey,
      (payload) => {
        if (payload.close) {
          window.close()
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

    this.undoInterval = setInterval(this.updateUndo, 250)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    this.remoteSync?.sendClose()
    this.remoteSync?.stopListening()

    if (this.undoInterval) {
      clearInterval(this.undoInterval)
    }
  }

  copy = () => {
    const js = this.js !== '' ? '```js\n' + this.js.trim() + '\n```\n' : ''
    const html =
      this.html !== '' ? '```html\n' + this.html.trim() + '\n```\n' : ''
    const css = this.css !== '' ? '```css\n' + this.css.trim() + '\n```\n' : ''
    const test =
      this.test !== '' ? '```test\n' + this.test.trim() + '\n```\n' : ''

    navigator.clipboard.writeText(js + html + css + test)
  }

  toggleMaximize = () => {
    this.classList.toggle('-maximize')
  }

  showCode = () => {
    this.classList.add('-maximize')
    this.classList.toggle('-vertical', this.offsetHeight > this.offsetWidth)
    this.parts.codeEditors.hidden = false
  }

  closeCode = () => {
    if (this.remoteId !== '') {
      window.close()
    } else {
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

    const transform = await loadTransform()
    const { example, style: styleEl, exampleWidgets } = this.parts

    let preview: HTMLElement | null

    if (this.iframe) {
      preview = await executeInIframe({
        html: this.html,
        css: this.css,
        js: this.js,
        context: this.context,
        transform,
        exampleElement: example,
        widgetsElement: exampleWidgets,
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
      })
    }

    if (this.persistToDom) {
      this.updateSources()
    }

    // Run tests if there are any
    if (this.test && preview) {
      this.testResults = await runTests(
        this.test,
        preview,
        this.context,
        transform
      )
      this.displayTestResults()
    }
  }

  private displayTestResults(): void {
    const { testResults: resultsEl } = this.parts
    const results = this.testResults

    if (!results || results.tests.length === 0) {
      resultsEl.hidden = true
      this.classList.remove('-test-passed', '-test-failed')
      return
    }

    resultsEl.hidden = false
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
        ;(this.parts[mode] as CodeEditor).value = source
      } else {
        const language = ['js', 'html', 'css', 'test'].find((lang) =>
          element.matches(`.language-${lang}`)
        )
        if (language) {
          ;(this.parts[language] as CodeEditor).value =
            language === 'html' ? element.innerHTML : element.innerText
        }
      }
    }
  }

  showDefaultTab() {
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

export const liveExample = LiveExample.elementCreator({
  tag: 'xin-example',
  styleSpec: liveExampleStyleSpec,
}) as ElementCreator<LiveExample>

// Auto-initialize remote editor window
const params = new URL(window.location.href).searchParams
const remoteId = params.get('lx')
if (remoteId) {
  document.title += ' [code editor]'
  document.body.textContent = ''
  document.body.append(liveExample({ remoteId }))
}
