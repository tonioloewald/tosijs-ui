/*!
# example

`<xin-example>` makes it easy to insert interactive code examples in a web page. It
started life as a super lightweight, easier-to-embed implementation of
[b8rjs's fiddle component](https://b8rjs.com)—which I dearly missed—but now the student
is, by far, the master. And it's still super lightweight.

*You're probably looking at it right now.*

```js
// this code executes in an async function body
// it has xinjs, xinjsui, and preview (the preview div) available as local variables
const { div } = xinjs.elements
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

## context

A `<xin-example>` can be given a `context` object {[key: string]: any}, which is the
set of values available in the javascript's execution context (it is wrapped in an
async function and passed those values). By default, that context comprises `preview`
(the `<div>` in which the example is rendered), `xinjs` (`* from xinjs`),
and `xinjsui` (`* from xinjsui`).

The `LiveExample` class provides the static `insertExamples(element: HTMLElement)`
function that will replace any sequence of
`pre code[class="language-html"],pre code[class="language-js"],pre code[class="language-css"]`
elements with a `<xin-example>` instance.
*/

import { Component, ElementCreator, elements } from 'xinjs'
import { codeEditor, CodeEditor } from './code-editor'
import { tabSelector, TabSelector } from './tab-selector'
import { icons } from './icons'
import { popMenu } from './menu'

const { div, xinSlot, style, button, h4 } = elements

const AsyncFunction = (async () => {}).constructor

interface ExampleContext {
  [key: string]: any
}

export class LiveExample extends Component {
  prettier = false
  prefix = 'lx'
  storageKey = 'live-example-payload'
  context: ExampleContext = {}
  uuid: string = crypto.randomUUID()
  remoteId = ''

  // FIXME workarounds for StorageEvent issue on Quest
  lastUpdate = 0
  interval?: Timer

  static insertExamples(
    element: HTMLElement,
    context: ExampleContext = {}
  ): void {
    const sources = [
      ...element.querySelectorAll(
        'pre code[class="language-html"],pre code[class="language-js"],pre code[class="language-css"]'
      ),
    ].map((code) => ({
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
      const example = liveExample({ style: { margin: `1em -1em` }, context })
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
    const { undo, redo } = this.parts as {
      undo: HTMLButtonElement
      redo: HTMLButtonElement
    }
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

  exampleMenu = () => {
    popMenu({
      target: this.parts.exampleWidgets,
      width: 'auto',
      menuItems: [
        {
          icon: 'edit',
          caption: 'view/edit code',
          action: this.showCode,
        },
        {
          icon: 'editDoc',
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
            icons.undo()
          ),
          button(
            {
              title: 'redo',
              part: 'redo',
              class: 'transparent',
              onClick: this.redo,
            },
            icons.redo()
          ),
          button(
            {
              title: 'copy as markdown',
              class: 'transparent',
              onClick: this.copy,
            },
            icons.copy()
          ),
          button(
            {
              title: 'reload',
              class: 'transparent',
              onClick: this.refreshRemote,
            },
            icons.refresh()
          )
        )
        /*
        button(
          {
            part: 'more',
            slot: 'after-tabs',
            title: 'code menu',
            class: 'transparent',
          },
          icons.moreVertical()
        )
        */
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
    console.log('received new code from remote', sentAt, this.lastUpdate)
    this.lastUpdate = sentAt
    this.css = css
    this.html = html
    this.js = js
    this.refresh()
  }

  showCode = () => {
    this.parts.codeEditors.hidden = false
  }

  closeCode = () => {
    if (this.remoteId !== '') {
      window.close()
    } else {
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

  refresh = () => {
    if (this.remoteId !== '') {
      return
    }

    const { example, style } = this.parts as {
      style: HTMLStyleElement
      example: HTMLElement
    }

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
      // @ts-expect-error ts is wrong and it makes me so mad
      const func = new AsyncFunction(...Object.keys(context), this.js)
      func(...Object.values(context)).catch((err: Error) => console.error(err))
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
      }
    }
  }

  showDefaultTab() {
    const { editors } = this.parts as { editors: TabSelector }
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
      zIndex: 10,
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
      background:
        '#f7f7f7 url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 8 8" fill-opacity=".02" ><rect x="4" width="4" height="4" /><rect y="4" width="4" height="4" /></svg>\')',
    },

    ':host [part="editors"]': {
      flex: '1 1 200px',
      height: '100%',
      position: 'relative',
    },

    ':host [part="exampleWidgets"]': {
      position: 'absolute',
      left: '2px',
      bottom: '2px',
      '--widget-color': 'var(--brand-color)',
      background: 'var(--widget-bg)',
      borderRadius: '5px',
      width: '44px',
      height: '44px',
      lineHeight: '44px',
      zIndex: '100',
    },

    ':host [part="exampleWidgets"] svg': {
      fill: 'var(--widget-color)',
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
      zIndex: 10,
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
      '--text-color': 'var(--code-editors-bar-color)',
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
