import { Component, ElementCreator } from 'tosijs';
import { Dialect, ExampleContext, ExampleParts } from './types';
export declare const testManager: {
    enabled: import("tosijs").BoxedScalar<boolean>;
} & import("tosijs").XinProps<{
    enabled: boolean;
}>;
/** Enable test mode (runs tests and shows indicators) */
export declare function enableTests(): void;
/** Disable test mode */
export declare function disableTests(): void;
export declare class LiveExample extends Component<ExampleParts> {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            '--tosi-example-height': string;
            '--code-editors-bar-bg': string;
            '--code-editors-bar-color': string;
            '--widget-bg': string;
            '--widget-color': string;
            position: string;
            display: string;
            height: string;
            background: string;
            boxSizing: string;
        };
        ':host.-locally-edited [part="exampleWidgets"]': {
            outline: string;
            outlineOffset: string;
            borderRadius: string;
        };
        ':host.-maximize': {
            position: string;
            left: string;
            top: string;
            height: string;
            width: string;
            margin: string;
        };
        '.-maximize': {
            zIndex: number;
        };
        ':host.-vertical': {
            flexDirection: string;
        };
        ':host .layout-indicator': {
            transition: string;
            transform: string;
        };
        ':host.-vertical .layout-indicator': {
            transform: string;
        };
        ':host.-maximize .hide-if-maximized, :host:not(.-maximize) .show-if-maximized': {
            display: string;
        };
        ':host [part="example"]': {
            flex: string;
            height: string;
            position: string;
            overflowX: string;
        };
        ':host .preview': {
            height: string;
            position: string;
            overflow: string;
            boxShadow: string;
        };
        ':host .preview-error': {
            padding: string;
            margin: string;
            background: string;
            color: string;
            borderRadius: string;
            fontSize: string;
            fontFamily: string;
            whiteSpace: string;
        };
        ':host [part="editors"]': {
            flex: string;
            height: string;
            position: string;
        };
        ':host [part="exampleWidgets"]': {
            position: string;
            left: string;
            bottom: string;
            '--widget-color': string;
            borderRadius: string;
            width: string;
            height: string;
            lineHeight: string;
            zIndex: string;
        };
        ':host [part="exampleWidgets"] svg': {
            stroke: string;
        };
        ':host .code-editors': {
            overflow: string;
            background: string;
            position: string;
            top: string;
            right: string;
            flex: string;
            height: string;
            flexDirection: string;
            zIndex: string;
        };
        ':host .code-editors:not([hidden])': {
            display: string;
        };
        ':host .code-editors > h4': {
            padding: string;
            margin: string;
            textAlign: string;
            background: string;
            color: string;
            cursor: string;
        };
        ':host button.transparent, :host .sizer': {
            width: string;
            height: string;
            lineHeight: string;
            textAlign: string;
            padding: string;
            margin: string;
        };
        ':host .sizer': {
            cursor: string;
        };
        ':host [part="testIndicator"]': {
            position: string;
            top: string;
            right: string;
            width: string;
            height: string;
            borderRadius: string;
            background: string;
            zIndex: string;
            display: string;
        };
        ':host.-has-tests [part="testIndicator"]': {
            display: string;
            opacity: string;
        };
        ':host.-test-running [part="testIndicator"]': {
            background: string;
            animation: string;
        };
        ':host.-test-passed [part="testIndicator"]': {
            background: string;
            animation: string;
        };
        ':host.-test-failed [part="testIndicator"]': {
            background: string;
            animation: string;
        };
        '@keyframes test-pulse': {
            '0%, 100%': {
                opacity: string;
            };
            '50%': {
                opacity: string;
            };
        };
        '@keyframes test-fade': {
            '0%': {
                opacity: string;
            };
            '50%': {
                opacity: string;
            };
            '100%': {
                opacity: string;
            };
        };
        ':host.-test-passed [part="exampleWidgets"]': {
            '--widget-color': string;
        };
        ':host.-test-failed [part="exampleWidgets"]': {
            '--widget-color': string;
        };
        ':host [part="testResults"]': {
            position: string;
            bottom: string;
            left: string;
            background: string;
            borderRadius: string;
            padding: string;
            fontSize: string;
            margin: string;
            maxWidth: string;
            maxHeight: string;
            overflow: string;
            zIndex: string;
        };
        ':host [part="testResults"][hidden]': {
            display: string;
        };
        ':host .test-pass': {
            color: string;
        };
        ':host .test-fail': {
            color: string;
        };
        ':host .tjs-test-results': {
            padding: string;
            fontSize: string;
            fontFamily: string;
            overflow: string;
            lineHeight: string;
        };
        ':host .tjs-test-summary': {
            fontWeight: string;
            marginBottom: string;
        };
        ':host .tjs-test-empty': {
            opacity: string;
        };
        ':host .tjs-test-error': {
            opacity: string;
        };
    };
    static initAttributes: {
        persistToDom: boolean;
        iframe: boolean;
    };
    prefix: string;
    storageKey: string;
    context: ExampleContext;
    private capturedScope;
    uuid: string;
    remoteId: string;
    private remoteSync?;
    private undoInterval?;
    private testResults?;
    private pendingValues;
    private pendingShowDefaultTab;
    private beforeUnloadHandler?;
    private editorsBuilt;
    static insertExamples(element: HTMLElement, context?: ExampleContext, sourceFile?: string): void;
    get activeTab(): Element | undefined;
    private getEditorValue;
    private setEditorValue;
    private flushPendingValues;
    get css(): string;
    set css(code: string);
    get html(): string;
    set html(code: string);
    get js(): string;
    set js(code: string);
    get test(): string;
    set test(code: string);
    get remoteKey(): string;
    get dialect(): Dialect;
    set dialect(value: Dialect);
    compiledJs?: string;
    compiledJsSource?: string;
    private jsOutEditor?;
    private tjsTestsView?;
    private productTabsReady;
    private lastGeneratedJs;
    private inlineTjsTestCount;
    private lastTjsTests?;
    private runInlineTjsTests;
    private renderTjsTests;
    private computeGeneratedJs;
    private ensureProductTabs;
    private captureScope;
    /**
     * Live bindings for tjs runtime-value autocomplete: the example's context modules
     * (keyed by the identifier the rewritten code uses, e.g. `tosijs`, `tosijsui`),
     * the currently-rendered `preview` element, and the latest run's top-level locals
     * (so `const app = tosi(…)` gives real `app.` / `app.items.` completions, proxy
     * members and all). Read lazily on each completion, so it reflects the latest run.
     */
    private liveBindings;
    updateUndo: () => void;
    private updateTestResultsVisibility;
    undo: () => void;
    redo: () => void;
    get isMaximized(): boolean;
    flipLayout: () => void;
    saveToSource: () => Promise<void>;
    exampleMenu: () => void;
    handleShortcuts: (event: KeyboardEvent) => void;
    content: () => any[];
    private buildEditorPanel;
    private ensureEditors;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private exampleMarkdown;
    copy: () => void;
    downloadExample: () => void;
    private originalCode;
    private localEditKey;
    private applyEdit;
    hasLocalEdits(): boolean;
    private updateEditedIndicator;
    private canUndo;
    private canRedo;
    saveLocalEdit: () => void;
    revertLocalEdit: () => void;
    snapshotAndRestoreLocalEdit: () => void;
    viewingChanges: boolean;
    viewChanges: () => void;
    doRefresh: () => void;
    sourceMenu: (event: Event) => void;
    toggleMaximize: () => void;
    showCode: () => void;
    closeCode: () => void;
    openEditorWindow: () => void;
    refreshRemote: () => void;
    updateSources: () => void;
    refresh: () => Promise<void>;
    private displayTestResults;
    initFromElements(elements: HTMLElement[]): void;
    showDefaultTab(): void;
    render(): void;
}
export declare const liveExample: ElementCreator<LiveExample>;
