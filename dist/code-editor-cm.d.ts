import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
/** Map a `<tosi-code mode>` value to a CodeMirror language extension. */
export declare function languageForMode(mode: string): Extension;
/** Runtime-introspection hooks for tjs autocomplete (all optional). */
export interface TjsAutocompleteConfig {
    getMetadata?: () => Record<string, unknown> | undefined;
    getImports?: () => Record<string, Record<string, unknown>> | undefined;
    getLiveBindings?: () => Record<string, unknown> | undefined;
    getMembers?: (path: string) => Promise<unknown[] | undefined>;
}
/**
 * Lazy-load tjs-lang's CodeMirror language + completion bundle. Returns a single
 * CodeMirror `Extension` (tjs language, forbidden-keyword highlighting, theme, and
 * `tjsCompletionSource`-driven autocomplete) suitable for `setLanguageExtension()`,
 * or `null` when tjs-lang (an optional peer) isn't installed or its editor build
 * lacks `tjsEditorExtension`. The dynamic import keeps it out of the bundle until a
 * tjs editor actually mounts.
 */
export declare function loadTjsExtension(autocomplete?: TjsAutocompleteConfig): Promise<Extension | null>;
export interface CmHandle {
    view: EditorView;
    getValue(): string;
    setValue(text: string): void;
    setMode(mode: string): void;
    /** Swap the language compartment wholesale (e.g. an async-loaded tjs bundle). */
    setLanguageExtension(ext: Extension): void;
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
