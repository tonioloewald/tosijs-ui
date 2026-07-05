/*
CodeMirror 6 editor factory — the "heavy" module.

`code-editor.ts` imports this **dynamically** (on first `<tosi-code>` connect), so
CodeMirror only enters a consumer's bundle as a separate lazy chunk when the editor
is actually used — mirroring the way the old ACE build loaded from a CDN on first
use. No `<tosi-code>` in the page → no CodeMirror.

Languages here are the always-available set (js/ts/css/html/markdown). First-class
tjs (highlighting + runtime-value autocomplete via tjs-lang's editors/codemirror) is
layered in separately and only when tjs-lang is installed.
*/

import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment, Extension } from '@codemirror/state'
import { indentWithTab, history, defaultKeymap, historyKeymap, undo, redo, undoDepth, redoDepth } from '@codemirror/commands'
import { indentUnit, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { markdown } from '@codemirror/lang-markdown'
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark'

// The doc-system flips dark mode with a `darkmode` class on <body> (which inverts
// the luminance of --code-bg / --text-color, so the editor SURFACE adapts for
// free). Only CM's syntax-token colors need swapping: the light defaultHighlightStyle
// washes out on a dark surface, so use oneDark's brighter palette in dark mode.
const isDarkMode = (): boolean =>
  typeof document !== 'undefined' &&
  !!document.body &&
  document.body.classList.contains('darkmode')

const highlightFor = (dark: boolean): Extension =>
  dark
    ? syntaxHighlighting(oneDarkHighlightStyle)
    : syntaxHighlighting(defaultHighlightStyle, { fallback: true })

/** Map a `<tosi-code mode>` value to a CodeMirror language extension. */
export function languageForMode(mode: string): Extension {
  switch (mode) {
    case 'js':
    case 'javascript':
      return javascript()
    case 'ts':
    case 'typescript':
    // tjs highlights fine as TypeScript until the tjs-lang language is wired
    // (workstream B); this keeps `mode="tjs"` readable today.
    case 'tjs':
    case 'ajs':
      return javascript({ typescript: true })
    case 'css':
      return css()
    case 'html':
      return html()
    case 'md':
    case 'markdown':
      return markdown()
    default:
      return javascript()
  }
}

// A minimal theme so the editor has a real surface instead of showing whatever is
// behind it. It's applied as a CodeMirror theme (not shadow-DOM CSS) so it beats
// CM's injected base styles. Colors come from the doc-system theme vars
// (`--code-bg` / `--text-color`, which pierce the shadow root and adapt to dark
// mode) with sensible standalone fallbacks.
const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--code-bg, var(--input-bg, #fdfdfd))',
    color: 'var(--text-color, #222)',
  },
  '.cm-scroller': {
    fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
  '.cm-gutters': {
    backgroundColor: 'var(--code-bg, var(--input-bg, #fdfdfd))',
    color: 'var(--text-color, #888)',
    border: 'none',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
})

// A basicSetup-equivalent without a hard-coded color theme, so the host page's CSS
// (and dark mode) controls the palette. Line-wrapping mirrors the old ACE `wrap:true`.
function baseExtensions(): Extension {
  return [
    editorTheme,
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    indentUnit.of('  '),
    EditorState.tabSize.of(2),
    // syntax highlighting is applied per-instance via a compartment (dark-mode aware)
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    keymap.of([
      indentWithTab,
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
  ]
}

export interface CmHandle {
  view: EditorView
  getValue(): string
  setValue(text: string): void
  setMode(mode: string): void
  setReadOnly(readOnly: boolean): void
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
  focus(): void
  refresh(): void
  destroy(): void
}

export interface CmOptions {
  value?: string
  mode?: string
  readOnly?: boolean
  /** additional language-adjacent extensions (e.g. a tjs language + autocomplete) */
  languageExtension?: Extension
  onChange?: (value: string) => void
  /** style-injection root — pass the host's ShadowRoot when mounted in shadow DOM */
  root?: Document | ShadowRoot
}

/** Create a CodeMirror editor mounted in `parent`, returning an editor-agnostic handle. */
export function createCmEditor(parent: HTMLElement, opts: CmOptions = {}): CmHandle {
  const language = new Compartment()
  const readonly = new Compartment()
  const highlight = new Compartment()

  const langExt = opts.languageExtension ?? languageForMode(opts.mode ?? 'javascript')

  const view = new EditorView({
    parent,
    root: opts.root,
    state: EditorState.create({
      doc: opts.value ?? '',
      extensions: [
        baseExtensions(),
        highlight.of(highlightFor(isDarkMode())),
        language.of(langExt),
        readonly.of(EditorState.readOnly.of(!!opts.readOnly)),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && opts.onChange) opts.onChange(u.state.doc.toString())
        }),
      ],
    }),
  })

  // Re-apply the right highlight palette when the doc-system toggles dark mode
  // (it flips the `darkmode` class on <body>).
  let dark = isDarkMode()
  const darkObserver =
    typeof MutationObserver !== 'undefined' && typeof document !== 'undefined'
      ? new MutationObserver(() => {
          const nowDark = isDarkMode()
          if (nowDark !== dark) {
            dark = nowDark
            view.dispatch({ effects: highlight.reconfigure(highlightFor(dark)) })
          }
        })
      : null
  darkObserver?.observe(document.body, { attributes: true, attributeFilter: ['class'] })

  const handle: CmHandle = {
    view,
    getValue: () => view.state.doc.toString(),
    setValue(text: string) {
      if (view.state.doc.toString() === text) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      })
    },
    setMode(mode: string) {
      view.dispatch({ effects: language.reconfigure(languageForMode(mode)) })
    },
    setReadOnly(ro: boolean) {
      view.dispatch({
        effects: readonly.reconfigure(EditorState.readOnly.of(ro)),
      })
    },
    undo: () => void undo(view),
    redo: () => void redo(view),
    canUndo: () => undoDepth(view.state) > 0,
    canRedo: () => redoDepth(view.state) > 0,
    focus: () => view.focus(),
    refresh: () => view.requestMeasure(),
    destroy: () => {
      darkObserver?.disconnect()
      view.destroy()
    },
  }
  return handle
}
