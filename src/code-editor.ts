/*#
# code

A [CodeMirror 6](https://codemirror.net/) wrapper.

Sometimes, it's nice to be able to just toss a code-editor in a web-page.

`<tosi-code>`'s `value` is the code it contains. Its `mode` attribute sets the
language (`javascript`, `typescript`, `tjs`, `css`, `html`, `markdown`).

```html
<tosi-code style="width: 100%; height: 100%" mode="css">
body {
  box-sizing: border-box;
}
</tosi-code>
```

The `<tosi-code>` element has an `editor` property that gives you its CodeMirror
[`EditorView`](https://codemirror.net/docs/ref/#view.EditorView), and
`undo()` / `redo()` / `canUndo()` / `canRedo()` methods for history control.

CodeMirror is loaded lazily on first use — a page with no `<tosi-code>` bundles
none of it.
*/

/*{ "parent": "Components" }*/

import { Component as WebComponent, ElementCreator, elements, PartsMap } from 'tosijs'
import { tosiDiff, TosiDiff } from './diff'
import type { CmHandle } from './code-editor-cm'

const { div } = elements

interface CodeEditorParts extends PartsMap {
  host: HTMLDivElement
}

export class CodeEditor extends WebComponent<CodeEditorParts> {
  static preferredTagName = 'tosi-code'

  private source = ''
  private _handle: CmHandle | undefined
  private _loadPromise: Promise<CmHandle> | undefined
  private _appliedMode = ''
  private _appliedDisabled: boolean | undefined

  get value(): string {
    return this._handle ? this._handle.getValue() : this.source
  }

  set value(text: string) {
    if (this._handle) {
      this._handle.setValue(text)
    } else {
      this.source = text
    }
  }

  // Baseline for `showDiff()` — the version to diff the current `value` against.
  // Defaults to the current value (no diff) until a caller sets it.
  private _original: string | undefined
  get original(): string {
    return this._original ?? this.value
  }
  set original(text: string) {
    this._original = text
  }

  // Diff overlay — built only on the editor's public surface (`value` + `original`)
  // and the tosi-diff component, never the underlying editor's API, so it is
  // editor-agnostic (this is why it survived the Ace → CodeMirror swap untouched).
  private diffOverlay: TosiDiff | undefined

  get showingDiff(): boolean {
    return this.diffOverlay !== undefined && !this.diffOverlay.hidden
  }

  showDiff(on: boolean): void {
    if (on) {
      if (this.diffOverlay === undefined) {
        this.diffOverlay = tosiDiff({
          style: {
            position: 'absolute',
            inset: '0',
            zIndex: '5',
            overflow: 'auto',
            background: 'var(--tosi-diff-bg, var(--background, #fff))',
          },
        })
        this.append(this.diffOverlay)
      }
      this.diffOverlay.original = this.original
      this.diffOverlay.modified = this.value
      this.diffOverlay.hidden = false
    } else if (this.diffOverlay !== undefined) {
      this.diffOverlay.hidden = true
    }
  }

  static initAttributes = {
    mode: 'javascript',
    disabled: false,
  }

  role = 'code editor'

  /** The underlying CodeMirror EditorView (undefined until loaded). */
  get editor(): CmHandle['view'] | undefined {
    return this._handle?.view
  }

  // History control — so consumers use these instead of reaching into `editor`.
  undo(): void {
    this._handle?.undo()
  }
  redo(): void {
    this._handle?.redo()
  }
  canUndo(): boolean {
    return this._handle?.canUndo() ?? false
  }
  canRedo(): boolean {
    return this._handle?.canRedo() ?? false
  }

  content = () => [div({ part: 'host' })]

  static shadowStyleSpec = {
    ':host': {
      display: 'block',
      position: 'relative',
      width: '100%',
      height: '100%',
    },
    '[part="host"]': { height: '100%' },
    '.cm-editor': { height: '100%' },
    '.cm-scroller': {
      outline: 'none',
      fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
    },
  }

  onResize() {
    this._handle?.refresh()
  }

  connectedCallback() {
    super.connectedCallback()

    if (this.source === '') {
      this.value = this.textContent !== null ? this.textContent.trim() : ''
    }

    if (this._loadPromise === undefined) {
      // Lazy chunk — CodeMirror only enters the bundle here, on first editor use.
      this._loadPromise = import('./code-editor-cm').then(({ createCmEditor }) => {
        const handle = createCmEditor(this.parts.host, {
          value: this.source,
          mode: this.mode,
          readOnly: this.disabled,
          root: this.shadowRoot ?? undefined,
          onChange: (value) =>
            this.dispatchEvent(new CustomEvent('change', { detail: { value } })),
        })
        this._handle = handle
        this._appliedMode = this.mode
        this._appliedDisabled = this.disabled
        return handle
      })
    }
  }

  render(): void {
    super.render()

    if (this._handle) {
      if (this.disabled !== this._appliedDisabled) {
        this._handle.setReadOnly(this.disabled)
        this._appliedDisabled = this.disabled
      }
      if (this.mode !== this._appliedMode) {
        this._handle.setMode(this.mode)
        this._appliedMode = this.mode
      }
    }
  }
}

export const codeEditor = CodeEditor.elementCreator() as ElementCreator<CodeEditor>
