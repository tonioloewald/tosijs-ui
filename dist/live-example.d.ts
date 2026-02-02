import { Component, ElementCreator, PartsMap } from 'tosijs';
import { TabSelector } from './tab-selector';
interface ExampleContext {
    [key: string]: any;
}
interface ExampleParts extends PartsMap {
    codeEditors: HTMLElement;
    undo: HTMLButtonElement;
    redo: HTMLButtonElement;
    exampleWidgets: HTMLButtonElement;
    editors: TabSelector;
    code: HTMLElement;
    sources: HTMLElement;
    style: HTMLStyleElement;
    example: HTMLElement;
}
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
    lastUpdate: number;
    interval?: any;
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
    updateUndo: () => void;
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
    get remoteKey(): string;
    remoteChange: (event?: StorageEvent) => void;
    showCode: () => void;
    closeCode: () => void;
    openEditorWindow: () => void;
    refreshRemote: () => void;
    updateSources: () => void;
    refresh: () => Promise<void>;
    private refreshInline;
    private registerComponentsInIframe;
    private refreshInIframe;
    initFromElements(elements: HTMLElement[]): void;
    showDefaultTab(): void;
    render(): void;
}
export declare const liveExample: ElementCreator<LiveExample>;
export {};
