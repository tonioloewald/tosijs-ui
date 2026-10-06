import { PartsMap } from 'tosijs';
import { TosiTabs } from '../tab-selector.js';
import { CodeEditor } from '../code-editor.js';
export interface ExampleContext {
    [key: string]: any;
}
export type Dialect = 'js' | 'tjs' | 'ts';
export interface ExampleParts extends PartsMap {
    codeEditors: HTMLElement;
    undo: HTMLButtonElement;
    redo: HTMLButtonElement;
    exampleWidgets: HTMLElement;
    testsCheckbox: HTMLInputElement;
    editors: TosiTabs;
    code: HTMLElement;
    sources: HTMLElement;
    style: HTMLStyleElement;
    example: HTMLElement;
    testResults: HTMLElement;
    running: HTMLElement;
    output: HTMLElement;
    js: CodeEditor;
    html: CodeEditor;
    css: CodeEditor;
    test: CodeEditor;
}
export interface RemotePayload {
    remoteKey: string;
    sentAt: number;
    css: string;
    html: string;
    js: string;
    test?: string;
    close?: boolean;
    original?: {
        js?: string;
        html?: string;
        css?: string;
        test?: string;
    };
}
export type TransformFn = (code: string, options?: {
    transforms: ('jsx' | 'typescript' | 'flow' | 'imports')[];
}) => TransformResult | Promise<TransformResult>;
export interface TransformResult {
    code: string;
    /**
     * tjs-lang's runner for the source's inline tests, built from the test bodies AFTER they
     * were given the module's semantics (TJS `==`, boxed-primitive truthiness, local `extend`
     * calls). Present for `tjs`/`ts` sources that have inline tests, on a tjs-lang new enough
     * to return it. Run as `code + testUtils + 'return ' + testRunner`.
     */
    testRunner?: string;
}
