import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
/** Map a `<tosi-code mode>` value to a CodeMirror language extension. */
export declare function languageForMode(mode: string): Extension;
export interface CmHandle {
    view: EditorView;
    getValue(): string;
    setValue(text: string): void;
    setMode(mode: string): void;
    setReadOnly(readOnly: boolean): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    focus(): void;
    refresh(): void;
    destroy(): void;
}
export interface CmOptions {
    value?: string;
    mode?: string;
    readOnly?: boolean;
    /** additional language-adjacent extensions (e.g. a tjs language + autocomplete) */
    languageExtension?: Extension;
    onChange?: (value: string) => void;
    /** style-injection root — pass the host's ShadowRoot when mounted in shadow DOM */
    root?: Document | ShadowRoot;
}
/** Create a CodeMirror editor mounted in `parent`, returning an editor-agnostic handle. */
export declare function createCmEditor(parent: HTMLElement, opts?: CmOptions): CmHandle;
