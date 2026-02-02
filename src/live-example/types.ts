import { PartsMap } from 'tosijs'
import { TabSelector } from '../tab-selector'
import { CodeEditor } from '../code-editor'

export interface ExampleContext {
  [key: string]: any
}

export interface ExampleParts extends PartsMap {
  codeEditors: HTMLElement
  undo: HTMLButtonElement
  redo: HTMLButtonElement
  exampleWidgets: HTMLButtonElement
  editors: TabSelector
  code: HTMLElement
  sources: HTMLElement
  style: HTMLStyleElement
  example: HTMLElement
  testResults: HTMLElement
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

export type TransformFn = (
  code: string,
  options: { transforms: string[] }
) => { code: string }
