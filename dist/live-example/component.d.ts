import { Component, ElementCreator } from 'tosijs';
import { ExampleContext, ExampleParts } from './types';
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
    static initAttributes: {
        persistToDom: boolean;
        prettier: boolean;
        iframe: boolean;
    };
    prefix: string;
    storageKey: string;
    context: ExampleContext;
    uuid: string;
    remoteId: string;
    private remoteSync?;
    private undoInterval?;
    private testResults?;
    static insertExamples(element: HTMLElement, context?: ExampleContext): void;
    get activeTab(): Element | undefined;
    private getEditorValue;
    private setEditorValue;
    get css(): string;
    set css(code: string);
    get html(): string;
    set html(code: string);
    get js(): string;
    set js(code: string);
    get test(): string;
    set test(code: string);
    get remoteKey(): string;
    updateUndo: () => void;
    private updateTestResultsVisibility;
    undo: () => void;
    redo: () => void;
    get isMaximized(): boolean;
    flipLayout: () => void;
    exampleMenu: () => void;
    handleShortcuts: (event: KeyboardEvent) => void;
    content: () => any[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    copy: () => void;
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
