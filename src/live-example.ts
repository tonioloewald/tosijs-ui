/*#
# example

`<xin-example>` makes it easy to insert interactive code examples in a web page. It
started life as a super lightweight, easier-to-embed implementation of
[b8rjs's fiddle component](https://b8rjs.com)—which I dearly missed—but now the student
is, by far, the master. And it's still super lightweight.

*You're probably looking at it right now.*

```js
// this code executes in an async function body
// it has xinjs, xinjsui, and preview (the preview div) available as local variables
import { div } from 'xinjs'.elements
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

```js
function makeElement(tag: string, ...children: Array<string | HTMLElement>): HTMLElement {
  const element = document.createElement(tag)
  element.append(...children)
  return element
}

preview.append(
  makeElement('h2', 'hello typescript')
)
```

You can also create a live-example from HTML. And if you add the `persist-to-dom`
attribute, it will persist your code to the DOM.

<xin-example persist-to-dom>
  <pre class="language-html">
    <h1 class="make-it-red">Pure HTML!</h1>
    <button>Click Me!</button>
  </pre>
  <pre class="language-js">
    preview.querySelector('button').addEventListener('click', () => {
      alert('you clicked?')
    })
  </pre>
  <pre class="language-css">
    .make-it-red {
      color: red;
    }
  </pre>
</xin-example>

You can simply wrap it around a sequence of code blocks in the DOM with the
languages (js, html, css) as annotations or you can directly set the `js`, `html`,
and `css` properties.

## Code-Editor

The **code-editor** is actually the same component spawned in a new window using
a couple of clever tricks, the most important of which is leveraging
[StorageEvent](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent).

This functionality was originally added to make working in XR easier, but it turned
out that it's just better than the earlier way of doing things.

It actually uses just one `localStorage` item to handle any number of code-editors,
and cleans up after itself when you close the example (including closing stray
windows.

> **To Do** a little refactoring and tweaking to split the the editor off as a
completely separate component that can be used for other things, and make the
example itself lighter-weight.

## `context`

```html
<p>testing</p>
```
```js
import { elements } from 'xinjs'
import { svgIcon } from 'xinjs-ui'

preview.querySelector('p').style.color = 'red'
preview.append(
  elements.p('another paragraph'),
  svgIcon({icon: 'tosiPlatform', size: 64})
)
```

A `<xin-example>` is given a `context` object {[key: string]: any}, which is the
set of values available in the javascript's execution context (it is wrapped in an
async function and passed those values). The context always includes `preview`
which is the element containing the HTML for the example.

If the context keys have hyphens in them, these are removed to allow the examples
to `import` libraries:

So we provide context like this:

```
import * as xinjs from 'tosjs'
import * as xinjsui from 'xinjs-ui'

...

context = {
  xinjs,
  'xinjs-ui': xinjsui
}
```

```
import { elements, tosi } from 'xinjs'
import { icons } from 'xinjs-ui'
```

is rewritten as:

```
import { elements, tosi } from 'xinjs'
import { icons } from 'xinjs-ui'
```

The `LiveExample` class provides the static `insertExamples(element: HTMLElement)`
function that will replace any sequence of
`pre code[class="language-html"],pre code[class="language-js"],pre code[class="language-css"]`
elements with a `<xin-example>` instance.
*/

import { Component, ElementCreator, PartsMap, elements } from 'xinjs'
import { codeEditor, CodeEditor } from './code-editor'
import { tabSelector, TabSelector } from './tab-selector'
import { icons } from './icons'
import { popMenu } from './menu'

const { div, xinSlot, style, button, h4, pre } = elements

const AsyncFunction = (async () => {
  /* do not care */
}).constructor

interface ExampleContext {
  [key: string]: any
}

interface ExampleParts extends PartsMap {
  codeEditors: HTMLElement
  undo: HTMLButtonElement
  redo: HTMLButtonElement
  exampleWidgets: HTMLButtonElement
  editors: TabSelector
  code: HTMLElement
  sources: HTMLElement
  style: HTMLStyleElement
  example: HTMLElement
}

export class LiveExample extends Component<ExampleParts> {
  persistToDom = false
  prettier = false
  prefix = 'lx'
  storageKey = 'live-example-payload'
  context: ExampleContext = {}
  uuid: string = crypto.randomUUID()
  remoteId = ''

  // FIXME workarounds for StorageEvent issue on Quest
  lastUpdate = 0
  interval?: any

  static insertExamples(
    element: HTMLElement,
    context: ExampleContext = {}
  ): void {
    const sources = [
      ...element.querySelectorAll('.language-html,.language-js,.language-css'),
    ]
      .filter((element) => !element.closest(LiveExample.tagName as string))
      .map((code) => ({
        block: code.parentElement as HTMLPreElement,
        language: code.classList[0].split('-').pop(),
        code: (code as HTMLElement).innerText,
      }))
    for (let index = 0; index < sources.length; index += 1) {
      const exampleSources = [sources[index]]
      while (
        index < sources.length - 1 &&
        sources[index].block.nextElementSibling === sources[index + 1].block
      ) {
        exampleSources.push(sources[index + 1])
        index += 1
      }
      const example = liveExample({ context })
      ;(exampleSources[0].block.parentElement as HTMLElement).insertBefore(
        example,
        exampleSources[0].block
      )
      exampleSources.forEach((source) => {
        switch (source.language) {
          case 'js':
            example.js = source.code
            break
          case 'html':
            example.html = source.code
            break
          case 'css':
            example.css = source.code
            break
        }
        source.block.remove()
      })
      example.showDefaultTab()
    }
  }

  constructor() {
    super()

    this.initAttributes('persistToDom', 'prettier')
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
      h4('Code'),
      button(
        {
          title: 'close code',
          class: 'transparent close-button',
          onClick: this.closeCode,
        },
        icons.x()
      ),
      tabSelector(
        {
          part: 'editors',
          onChange: this.updateUndo,
        },
        codeEditor({
          name: 'js',
          mode: 'javascript',
          part: 'js',
        }),
        codeEditor({ name: 'html', mode: 'html', part: 'html' }),
        codeEditor({ name: 'css', mode: 'css', part: 'css' }),
        div(
          {
            slot: 'after-tabs',
            class: 'row',
          },
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
    addEventListener('storage', this.remoteChange)

    // FIXME workaround for Quest 3
    this.interval = setInterval(this.remoteChange, 500)
    this.undoInterval = setInterval(this.updateUndo, 250)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    const { storageKey, remoteKey } = this

    // FIXME workaround for Quest 3
    clearInterval(this.interval)
    clearInterval(this.undoInterval)

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        remoteKey,
        sentAt: Date.now(),
        close: true,
      })
    )
  }

  copy = () => {
    const js = this.js !== '' ? '```js\n' + this.js.trim() + '\n```\n' : ''
    const html =
      this.html !== '' ? '```html\n' + this.html.trim() + '\n```\n' : ''
    const css = this.css !== '' ? '```css\n' + this.css.trim() + '\n```\n' : ''

    navigator.clipboard.writeText(js + html + css)
  }

  toggleMaximize = () => {
    this.classList.toggle('-maximize')
  }

  get remoteKey(): string {
    return this.remoteId !== ''
      ? this.prefix + '-' + this.remoteId
      : this.prefix + '-' + this.uuid
  }

  remoteChange = (event?: StorageEvent) => {
    const data = localStorage.getItem(this.storageKey)
    if (event instanceof StorageEvent && event.key !== this.storageKey) {
      return
    }
    if (data === null) {
      return
    }
    const { remoteKey, sentAt, css, html, js, close } = JSON.parse(data)
    // FIXME workaround for Quest
    if (sentAt <= this.lastUpdate) {
      return
    }
    if (remoteKey !== this.remoteKey) {
      return
    }
    if (close === true) {
      window.close()
    }
    console.log('received new code', sentAt, this.lastUpdate)
    this.lastUpdate = sentAt
    this.css = css
    this.html = html
    this.js = js
    this.refresh()
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
    const { storageKey, remoteKey, css, html, js, uuid, prefix } = this
    const href = location.href.split('?')[0] + `?${prefix}=${uuid}`
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        remoteKey,
        sentAt: Date.now(),
        css,
        html,
        js,
      })
    )
    window.open(href)
  }

  refreshRemote = () => {
    const { remoteKey, css, html, js } = this
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({ remoteKey, sentAt: Date.now(), css, html, js })
    )
  }

  updateSources = () => {
    if (this.persistToDom) {
      const { sources } = this.parts
      sources.innerText = ''
      for (const language of ['js', 'css', 'html']) {
        if (this[language]) {
          sources.append(
            pre({ class: `language-${language}`, innerHTML: this[language] })
          )
        }
      }
    }
  }

  refresh = async () => {
    if (this.remoteId !== '') {
      return
    }

    const { transform } = await import(
      'https://cdn.jsdelivr.net/npm/sucrase@3.35.0/+esm'
    )

    const { example, style } = this.parts

    const preview = div({ class: 'preview' })
    preview.innerHTML = this.html
    style.innerText = this.css
    const oldPreview = example.querySelector('.preview')
    if (oldPreview) {
      oldPreview.replaceWith(preview)
    } else {
      example.insertBefore(preview, this.parts.exampleWidgets)
    }

    const context = { preview, ...this.context }
    try {
      let code = this.js
      for(const moduleName of Object.keys(this.context)) {
        code = code.replace(new RegExp(`import \\{(.*)\\} from '${moduleName}'`, 'g'), `const {$1} = ${moduleName.replace(/-/g, '')}`)
      }
      // @ts-expect-error ts is wrong and it makes me so mad
      const func = new AsyncFunction(
        ...Object.keys(context).map((key: string) => key.replace(/-/g, '')),
        transform(code, { transforms: ['typescript'] }).code
      )
      func(...Object.values(context)).catch((err: Error) => console.error(err))
      if (this.persistToDom) {
        this.updateSources()
      }
    } catch (e) {
      console.error(e)
      window.alert(`Error: ${e}, the console may have more information…`)
    }
  }

  initFromElements(elements: HTMLElement[]) {
    for (const element of elements) {
      element.hidden = true
      const [mode, ...lines] = element.innerHTML.split('\n') as string[]
      if (['js', 'html', 'css'].includes(mode)) {
        const minIndex = lines
          .filter((line) => line.trim() !== '')
          .map((line) => (line.match(/^\s*/) as string[])[0].length)
          .sort()[0]
        const source = (
          minIndex > 0 ? lines.map((line) => line.substring(minIndex)) : lines
        ).join('\n')
        ;(this.parts[mode] as CodeEditor).value = source
      } else {
        const language = ['js', 'html', 'css'].find((language: string) =>
          element.matches(`.language-${language}`)
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
    }
  }

  render(): void {
    super.render()

    if (this.remoteId !== '') {
      const data = localStorage.getItem(this.storageKey)
      if (data !== null) {
        const { remoteKey, sentAt, css, html, js } = JSON.parse(data)
        if (this.remoteKey !== remoteKey) {
          return
        }
        this.lastUpdate = sentAt
        this.css = css
        this.html = html
        this.js = js
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
  styleSpec: {
    ':host': {
      '--xin-example-height': '320px',
      '--code-editors-bar-bg': '#777',
      '--code-editors-bar-color': '#fff',
      '--widget-bg': '#fff8',
      '--widget-color': '#000',
      position: 'relative',
      display: 'flex',
      height: 'var(--xin-example-height)',
      background: 'var(--background)',
      boxSizing: 'border-box',
    },

    ':host.-maximize': {
      position: 'fixed',
      left: '0',
      top: '0',
      height: '100vh',
      width: '100vw',
      margin: '0 !important',
    },

    '.-maximize': {
      zIndex: 101,
    },

    ':host.-vertical': {
      flexDirection: 'column',
    },

    ':host .layout-indicator': {
      transition: '0.5s ease-out',
      transform: 'rotateZ(270deg)',
    },

    ':host.-vertical .layout-indicator': {
      transform: 'rotateZ(180deg)',
    },

    ':host.-maximize .hide-if-maximized, :host:not(.-maximize) .show-if-maximized':
      {
        display: 'none',
      },

    ':host [part="example"]': {
      flex: '1 1 50%',
      height: '100%',
      position: 'relative',
      overflowX: 'auto',
    },

    ':host .preview': {
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'inset 0 0 0 2px #8883',
    },

    ':host [part="editors"]': {
      flex: '1 1 200px',
      height: '100%',
      position: 'relative',
    },

    ':host [part="exampleWidgets"]': {
      position: 'absolute',
      left: '5px',
      bottom: '5px',
      '--widget-color': 'var(--brand-color)',
      borderRadius: '5px',
      width: '44px',
      height: '44px',
      lineHeight: '44px',
      zIndex: '100',
    },

    ':host [part="exampleWidgets"] svg': {
      stroke: 'var(--widget-color)',
    },

    ':host .code-editors': {
      overflow: 'hidden',
      background: 'white',
      position: 'relative',
      top: '0',
      right: '0',
      flex: '1 1 50%',
      height: '100%',
      flexDirection: 'column',
      zIndex: '10',
    },

    ':host .code-editors:not([hidden])': {
      display: 'flex',
    },

    ':host .code-editors > h4': {
      padding: '5px',
      margin: '0',
      textAlign: 'center',
      background: 'var(--code-editors-bar-bg)',
      color: 'var(--code-editors-bar-color)',
      cursor: 'move',
    },

    ':host .close-button': {
      position: 'absolute',
      top: '0',
      right: '0',
      color: 'var(--code-editors-bar-color)',
    },

    ':host button.transparent, :host .sizer': {
      width: '32px',
      height: '32px',
      lineHeight: '32px',
      textAlign: 'center',
      padding: '0',
      margin: '0',
    },

    ':host .sizer': {
      cursor: 'nwse-resize',
    },
  },
}) as ElementCreator<LiveExample>

export function makeExamplesLive(element: HTMLElement) {
  const preElements = [...element.querySelectorAll('pre')].filter((pre) =>
    ['js', 'html', 'css', 'json'].includes(pre.innerText.split('\n')[0])
  )
  for (let i = 0; i < preElements.length; i++) {
    const parts = [preElements[i]]
    while (preElements[i].nextElementSibling === preElements[i + 1]) {
      parts.push(preElements[i + 1])
      i += 1
    }
    const example = liveExample()
    element.insertBefore(example, parts[0])
    example.initFromElements(parts)
  }
}

const params = new URL(window.location.href).searchParams
const remoteId = params.get('lx')
if (remoteId) {
  document.title += ' [code editor]'
  document.body.textContent = ''
  document.body.append(liveExample({ remoteId }))
}
