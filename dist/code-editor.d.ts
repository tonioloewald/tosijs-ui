import { Component as WebComponent, ElementCreator, PartsMap } from 'tosijs';
import type { CmHandle } from './code-editor-cm';
interface CodeEditorParts extends PartsMap {
    host: HTMLDivElement;
}
export declare class CodeEditor extends WebComponent<CodeEditorParts> {
    static preferredTagName: string;
    private source;
    private _handle;
    private _loadPromise;
    private _appliedMode;
    private _appliedDisabled;
    get value(): string;
    set value(text: string);
    private _original;
    get original(): string;
    set original(text: string);
    private diffOverlay;
    get showingDiff(): boolean;
    showDiff(on: boolean): void;
    static initAttributes: {
        mode: string;
        disabled: boolean;
    };
    role: string;
    /** The underlying CodeMirror EditorView (undefined until loaded). */
    get editor(): CmHandle['view'] | undefined;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    content: () => HTMLDivElement[];
    static shadowStyleSpec: {
        ':host': {
            display: string;
            position: string;
            width: string;
            height: string;
        };
        '[part="host"]': {
            height: string;
        };
        '.cm-editor': {
            height: string;
        };
        '.cm-scroller': {
            outline: string;
            fontFamily: string;
        };
    };
    onResize(): void;
    connectedCallback(): void;
    render(): void;
}
export declare const codeEditor: ElementCreator<CodeEditor>;
export {};
