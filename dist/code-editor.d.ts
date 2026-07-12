import { Component as WebComponent, ElementCreator, PartsMap } from 'tosijs';
import type { CmHandle, TjsAutocompleteConfig } from './code-editor-cm';
export type { TjsAutocompleteConfig } from './code-editor-cm';
interface CodeEditorParts extends PartsMap {
    host: HTMLDivElement;
    diffHost: HTMLDivElement;
}
export declare class CodeEditor extends WebComponent<CodeEditorParts> {
    static preferredTagName: string;
    private source;
    private _handle;
    private _loadPromise;
    private _appliedMode;
    private _appliedDisabled;
    private _tjsAutocomplete;
    /**
     * Runtime-introspection hooks for tjs autocomplete (`getLiveBindings` /
     * `getMembers`) — lets completion suggest the REAL members of live values (e.g.
     * a tosijs proxy or a DOM element) that static analysis can't see. Only used in
     * tjs mode; setting it re-applies the tjs extension so it takes effect live.
     */
    get tjsAutocomplete(): TjsAutocompleteConfig | undefined;
    set tjsAutocomplete(config: TjsAutocompleteConfig | undefined);
    get value(): string;
    set value(text: string);
    private _original;
    get original(): string;
    set original(text: string);
    private diffOverlay;
    private get partsReady();
    get showingDiff(): boolean;
    showDiff(on: boolean): void;
    static initAttributes: {
        mode: string;
        disabled: boolean;
    };
    role: string;
    /** The underlying CodeMirror EditorView (undefined until loaded). */
    get editor(): CmHandle['view'] | undefined;
    /** @deprecated Removed in 1.7 — CodeMirror themes via `--code-bg`/`--text-color`. */
    get theme(): string;
    set theme(_: string);
    /** @deprecated Removed in 1.7 — ACE-shaped options have no CodeMirror equivalent. */
    get options(): Record<string, unknown>;
    set options(_: Record<string, unknown>);
    /** @deprecated Removed in 1.7 — there is no ACE global; use `editor` (an EditorView). */
    get ace(): undefined;
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
        '[part="diffHost"]': {
            position: string;
            inset: string;
            zIndex: string;
            overflow: string;
            background: string;
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
    disconnectedCallback(): void;
    private isTjsMode;
    /**
     * When in tjs mode, lazily upgrade the editor to tjs-lang's CodeMirror language +
     * autocomplete. No-op (keeps TS highlighting) if not tjs, if tjs-lang isn't
     * installed, or if the mode/handle changed before the async load resolved.
     */
    private applyTjsExtension;
    render(): void;
}
export declare const codeEditor: ElementCreator<CodeEditor>;
