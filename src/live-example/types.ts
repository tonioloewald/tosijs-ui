import { PartsMap } from 'tosijs'
import { TosiTabs } from '../tab-selector'
import { CodeEditor } from '../code-editor'

export interface ExampleContext {
  [key: string]: any
}

// The source language of an example's executable block:
//   js  — plain JavaScript, run as-is (tjs `dialect: 'js'` leaves it untouched)
//   tjs — tjs-lang source, transpiled to JS (structural ==, type guards, etc.)
//   ts  — TypeScript, lowered to tjs (via from-ts) and then to JS
export type Dialect = 'js' | 'tjs' | 'ts'

export interface ExampleParts extends PartsMap {
  codeEditors: HTMLElement
  undo: HTMLButtonElement
  redo: HTMLButtonElement
  exampleWidgets: HTMLButtonElement
  editors: TosiTabs
  code: HTMLElement
  sources: HTMLElement
  style: HTMLStyleElement
  example: HTMLElement
  testResults: HTMLElement
  testIndicator: HTMLElement
  js: CodeEditor
  html: CodeEditor
  css: CodeEditor
  test: CodeEditor
}

export interface RemotePayload {
  remoteKey: string
  sentAt: number
  css: string
  html: string
  js: string
  test?: string
  close?: boolean
}

// A transform closure produced by `loadTransform(dialect)`. The dialect is baked
// into the closure, so callers (execution.ts) just pass the rewritten code; the
// legacy `options` argument is accepted for back-compat and ignored.
export type TransformFn = (
  code: string,
  options?: { transforms: ('jsx' | 'typescript' | 'flow' | 'imports')[] }
) => { code: string }
