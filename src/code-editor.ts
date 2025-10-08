/*#
# code

An [ACE Editor](https://ace.c9.io/) wrapper.

Sometimes, it's nice to be able to just toss a code-editor in a web-page.

`<xin-code>`'s `value` is the code it contains. Its `mode` attribute sets the language, and you can further configure
the ACE editor instance via its `options` property.

```html
<xin-code style="width: 100%; height: 100%" mode="css">
body {
  box-sizing: border-box;
}
</xin-code>
```
*/

import { Component as WebComponent, ElementCreator } from 'xinjs'
import { scriptTag } from './via-tag'

const ACE_BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.23.2/'
const DEFAULT_THEME = 'ace/theme/tomorrow'

const makeCodeEditor = async (
  codeElement: any,
  mode = 'html',
  options = {},
  theme = DEFAULT_THEME
) => {
  const { ace } = await scriptTag(`${ACE_BASE_URL}ace.min.js`)
  ace.config.set('basePath', ACE_BASE_URL)
  const editor = ace.edit(codeElement, {
    mode: `ace/mode/${mode}`,
    tabSize: 2,
    useSoftTabs: true,
    useWorker: false,
    ...options,
  })
  editor.setTheme(theme)
  return editor
}

export class CodeEditor extends WebComponent {
  private source = ''

  get value(): string {
    return this.editor === undefined ? this.source : this.editor.getValue()
  }

  set value(text: string) {
    if (this.editor === undefined) {
      this.source = text
    } else {
      this.editor.setValue(text)
      this.editor.clearSelection()
      this.editor.session.getUndoManager().reset()
    }
  }

  mode = 'javascript'
  disabled = false
  role = 'code editor'

  get editor(): any {
    return this._editor
  }
  private _editor: any | undefined
  private _editorPromise: Promise<any> | undefined
  options: any = {}
  theme = DEFAULT_THEME

  static styleSpec = {
    ':host': {
      display: 'block',
      position: 'relative',
      width: '100%',
      height: '100%',
    },
  }

  constructor() {
    super()

    this.initAttributes('mode', 'theme', 'disabled')
  }

  onResize() {
    if (this.editor !== undefined) {
      this.editor.resize(true)
    }
  }

  connectedCallback() {
    super.connectedCallback()

    if (this.source === '') {
      this.value = this.textContent !== null ? this.textContent.trim() : ''
    }

    if (this._editorPromise === undefined) {
      this._editorPromise = makeCodeEditor(
        this,
        this.mode,
        this.options,
        this.theme
      )
      this._editorPromise.then((editor) => {
        this._editor = editor
        editor.setValue(this.source, 1)
        editor.clearSelection()
        editor.session.getUndoManager().reset()
      })
    }
  }

  render(): void {
    super.render()

    if (this._editorPromise !== undefined) {
      this._editorPromise.then((editor) => editor.setReadOnly(this.disabled))
    }
  }
}

export const codeEditor = CodeEditor.elementCreator({
  tag: 'xin-code',
}) as ElementCreator<CodeEditor>
