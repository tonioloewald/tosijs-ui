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
    private _loadGeneration;
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
    private _pendingDiff;
    get showingDiff(): boolean;
    showDiff(on: boolean): void;
    static initAttributes: {
        mode: string;
        disabled: boolean;
    };
    role: string;
    /**
     * The underlying CodeMirror `EditorView` (undefined until loaded).
     *
     * **Changed in 1.7 (ACE → CodeMirror 6).** In 1.6 this was an ACE editor, and
     * `editor.session.getUndoManager()` was documented public API. `^1.6.x` resolves
     * 1.7.0, so an app that never changed a line auto-upgrades into a `TypeError` on the
     * next install — and this is the ONE break the warn-once shims below cannot catch,
     * because the property still exists and still returns an object; it is simply a
     * different object. TS consumers get a compile error (1.6 typed this `any`); vanilla
     * JS and CDN consumers — the audience this component's own docs court — would get the
     * bare TypeError with no explanation at all.
     *
     * So: one neutral note on first access. `editor` is NOT deprecated — it is the
     * supported CM6 accessor — so this is `console.info` (not `warn`) and leads with that,
     * to help a 1.6→1.7 migrator without scolding correct CM6 use. Use
     * `undo()`/`redo()`/`canUndo()`/`canRedo()` for history — they survived the migration.
     */
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
    handleResize(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private isTjsMode;
    /**
     * When in tjs mode, lazily upgrade the editor to tjs-lang's CodeMirror language +
     * autocomplete. No-op (keeps TS highlighting) if not tjs, if tjs-lang isn't
     * installed, or if the mode/handle changed before the async load resolved.
     */
    private applyTjsExtension;
    /** True once tjs-lang's CM language+autocomplete is actually live (test seam). */
    get tjsExtensionApplied(): boolean;
    private _tjsExtensionApplied;
    render(): void;
}
export declare const codeEditor: ElementCreator<CodeEditor>;
