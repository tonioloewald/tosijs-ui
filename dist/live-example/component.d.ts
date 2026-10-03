import { ElementCreator } from 'tosijs';
import { ExampleContext, ExampleParts } from './types.js';
export declare const testManager: {
    enabled: import("tosijs").BoxedScalar<boolean>;
} & import("tosijs").TosiProps<{
    enabled: boolean;
}>;
/** Enable test mode (runs tests and shows indicators) */
export declare function enableTests(): void;
/**
 * How many examples on this page carry tests — regardless of whether tests are ENABLED.
 *
 * "Off" and "none exist" rendered identically: the widget is hidden when tests are
 * disabled, and they are disabled by default anywhere but localhost, so a page with
 * failing tests looked exactly like a page with no tests (tosijs-ui#113). That bites
 * hardest down the sanctioned remote-viewing path — `tosijs-tunnel` necessarily serves
 * from a non-localhost hostname — where a maintainer read a clean page as "the failure is
 * localhost-specific" and lost the thread.
 *
 * The `localStorage` override always existed, but you had to know the key, which means you
 * had to already suspect there was something to see. This is the number that lets the UI
 * say a runner exists here without turning it on.
 */
export declare function pageTestCount(): number;
/** Disable test mode */
export declare function disableTests(): void;
declare const LiveExample_base: import("tosijs").WithAttributes<{
    persistToDom: boolean;
    iframe: boolean;
    mode: string;
}>;
export declare class LiveExample extends LiveExample_base<ExampleParts> {
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
            borderRadius: string;
            boxShadow: string;
            overflow: string;
        };
        ':host.-locally-edited > [part="example"] > [part="exampleWidgets"]': {
            outline: string;
            outlineOffset: string;
            borderRadius: string;
        };
        ':host.-maximize': {
            position: string;
            left: string;
            top: string;
            height: string;
            right: string;
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
        ':host.-maximize > [part="example"] > [part="exampleWidgets"] .hide-if-maximized, :host:not(.-maximize) > [part="example"] > [part="exampleWidgets"] .show-if-maximized': {
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
            boxSizing: string;
            padding: string;
        };
        ':host .preview > :first-child': {
            marginTop: string;
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
        ':host [part="running"]': {
            position: string;
            top: string;
            left: string;
            width: string;
            height: string;
            margin: string;
            borderRadius: string;
            border: string;
            borderTopColor: string;
            boxSizing: string;
            animation: string;
            pointerEvents: string;
            zIndex: string;
        };
        ':host [part="running"].still': {
            animation: string;
        };
        ':host [part="running"][hidden]': {
            display: string;
        };
        '@keyframes tosi-example-spin': {
            from: {
                transform: string;
            };
            to: {
                transform: string;
            };
        };
        ':host .example-console': {
            display: string;
            flexDirection: string;
            height: string;
            background: string;
            fontFamily: string;
            fontSize: string;
            lineHeight: string;
        };
        ':host .example-console .console-lines': {
            flex: string;
            minHeight: string;
            overflow: string;
            padding: string;
        };
        ':host .example-console .console-line': {
            whiteSpace: string;
            overflowWrap: string;
            padding: string;
        };
        ':host .example-console .console-warn': {
            color: string;
            background: string;
        };
        ':host .example-console .console-error': {
            color: string;
            background: string;
        };
        ':host .example-console .console-debug, :host .example-console .console-dropped': {
            opacity: string;
        };
        ':host .example-console .console-input': {
            opacity: string;
        };
        ':host .example-console .console-input::before': {
            content: string;
        };
        ':host .example-console .console-result::before': {
            content: string;
            opacity: string;
        };
        ':host .example-console .console-prompt': {
            flex: string;
            display: string;
            alignItems: string;
            gap: string;
            padding: string;
            boxShadow: string;
        };
        ':host .example-console .console-field': {
            flex: string;
            resize: string;
            border: string;
            boxShadow: string;
            outline: string;
            padding: string;
            margin: string;
            background: string;
            color: string;
            font: string;
        };
        ':host [part="editors"]': {
            flex: string;
            height: string;
            position: string;
        };
        ':host [part="exampleWidgets"]': {
            position: string;
            top: string;
            right: string;
            zIndex: string;
            color: string;
            '--widget-color': string;
            '--tosi-pocket-handle-color': string;
            '--tosi-pocket-handle-bg': string;
            '--tosi-pocket-handle-radius': string;
            '--tosi-pocket-handle-size': string;
        };
        ':host [part="exampleWidgets"] button': {
            '--text-color': string;
        };
        ':host [part="exampleWidgets"] .tests-toggle input': {
            display: string;
        };
        ':host [part="exampleWidgets"] .tests-toggle': {
            opacity: string;
            filter: string;
            transition: string;
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
        '@keyframes test-pulse': {
            '0%, 100%': {
                opacity: string;
            };
            '50%': {
                opacity: string;
            };
        };
        ':host.-test-running > [part="example"] > [part="exampleWidgets"]': {
            '--widget-color': string;
            animation: string;
        };
        ':host.-test-passed > [part="example"] > [part="exampleWidgets"]': {
            '--widget-color': string;
        };
        ':host.-test-failed > [part="example"] > [part="exampleWidgets"]': {
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
        ':host(.-test-only) [part="testResults"]': {
            position: string;
            maxWidth: string;
            maxHeight: string;
            background: string;
            padding: string;
            fontSize: string;
        };
        ':host(.-test-only) .preview': {
            display: string;
        };
        ':host .test-pass': {
            color: string;
        };
        ':host .test-fail': {
            color: string;
        };
        ':host .example-docs': {
            padding: string;
            overflow: string;
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
    /** Resolved execution mode — `mode` attribute wins; `iframe` boolean is the alias. */
    get effectiveMode(): 'inline' | 'iframe' | 'ide';
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
    get dialect(): string;
    set dialect(value: string);
    get options(): Record<string, unknown>;
    set options(value: Record<string, unknown>);
    private runAbort?;
    /**
     * How long a `run` dialect's run must take before its spinner appears, in ms. A faster run
     * never shows one, so a quick example doesn't flash.
     */
    static runningDelayMs: number;
    private static readonly CONSOLE_LINES;
    private consoleBuffer;
    private consoleDroppedCount;
    private consoleView?;
    private consoleLinesEl?;
    private consoleInputEl?;
    private consoleHistory;
    private consoleHistoryIndex;
    private consoleScrollQueued;
    private static completionLists;
    private readonly completionListId;
    private readonly completionList;
    /**
     * What the current run logged, as `{ level, text }` lines (and REPL input/results), ending
     * with a `dropped` line when the cap was reached, so a reader of this sees the truncation.
     */
    get consoleOutput(): {
        level: string;
        text: string;
    }[];
    private droppedText;
    private get consoleEnabled();
    private consoleForRun;
    private clearConsole;
    private addConsoleLine;
    private consoleLineElement;
    private consoleDroppedEl?;
    private renderConsoleDropped;
    private scrollConsole;
    private buildConsoleView;
    private static readonly CONSOLE_INPUT_MAX_ROWS;
    private sizeConsoleInput;
    private consoleKeydown;
    /**
     * Evaluate `source` inside the example's own scope, like a browser console: its top-level
     * variables and functions, `preview`, its console, and the page's modules (`import { x }
     * from 'tosijs'` works). Input gives its completion value; `await` works. The first call
     * re-runs the example once, to give the REPL that scope. A `run` dialect (whose source is
     * not JavaScript) gets `preview`, the modules and the console only. The input and its result
     * go into the Console tab.
     */
    consoleEval: (source: string) => Promise<unknown>;
    private replEvaluate?;
    private replWanted;
    /**
     * What could complete the text before the caret: after a dot, the properties of the value
     * the path before it evaluates to (in the example's scope); otherwise the names in scope —
     * `preview`, `console`, the page's modules, what the example declares, and globals.
     * `start` is where the partial name begins.
     */
    consoleCompletions: (text: string) => Promise<{
        start: number;
        options: string[];
    }>;
    private localNames;
    private ensureReplScope;
    private static readonly COMPLETIONS_SHOWN;
    private completionOptions;
    private completionStart;
    private activeCompletion;
    private completionFloat?;
    private completionRequest;
    private completionTimer?;
    private get completionsOpen();
    private consoleInput;
    private consoleBlur;
    /** Recompute the completion list for the text before the caret, and show or close it. */
    updateCompletions: () => Promise<void>;
    private setActiveCompletion;
    private applyCompletion;
    private closeCompletions;
    private evalInExample;
    private currentPreview;
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
    private docsView?;
    private docsRequest;
    private updateDocs;
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
    /**
     * Does this example consist ONLY of tests?
     *
     * A ` ```test ` fence with no `js`/`html`/`css` beside it has nothing to render, so the
     * preview was an empty box — which reads as a broken example rather than as a passing test
     * suite, and hid the one thing the block was there to show. For these, the results ARE the
     * content.
     */
    private get isTestOnly();
    private updateTestResultsVisibility;
    undo: () => void;
    redo: () => void;
    get isMaximized(): boolean;
    flipLayout: () => void;
    saveToSource: () => Promise<void>;
    handleTestsToggle: (event: Event) => void;
    updateExampleWidgets: () => void;
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
    collapseWidgetsAfterAction: (event: Event) => void;
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
export {};
