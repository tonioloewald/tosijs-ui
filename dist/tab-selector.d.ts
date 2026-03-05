import { Component as WebComponent, ElementCreator } from 'tosijs';
type TabCloseHandler = (tabBody: Element) => boolean | undefined | void;
export declare class TosiTabs extends WebComponent {
    static initAttributes: {
        localized: boolean;
    };
    value: number;
    makeTab(tabs: TosiTabs, tabBody: HTMLElement, bodyId: string): HTMLElement;
    static styleSpec: {
        ':host': {
            '--tosi-tabs-selected-color': string;
            '--tosi-tabs-bar-color': string;
            '--tosi-tabs-bar-height': string;
            display: string;
            flexDirection: string;
            position: string;
            overflow: string;
            boxShadow: string;
        };
        slot: {
            position: string;
            display: string;
            flex: string;
            overflow: string;
            overflowY: string;
        };
        'slot[name="after-tabs"]': {
            flex: string;
        };
        '::slotted([hidden])': {
            display: string;
        };
        ':host::part(tabpanel)': {
            display: string;
            flexDirection: string;
            overflowX: string;
        };
        ':host::part(tabrow)': {
            display: string;
        };
        ':host .tabs': {
            display: string;
            userSelect: string;
            whiteSpace: string;
        };
        ':host .tabs > div': {
            padding: string;
            cursor: string;
            display: string;
            alignItems: string;
        };
        ':host .tabs > [aria-selected="true"]': {
            '--text-color': string;
            color: string;
        };
        ':host .elastic': {
            flex: string;
        };
        ':host .border': {
            background: string;
        };
        ':host .border > .selected': {
            content: string;
            width: number;
            height: string;
            background: string;
            transition: string;
        };
        ':host button.close': {
            border: number;
            background: string;
            textAlign: string;
            marginLeft: string;
            padding: number;
        };
        ':host button.close > svg': {
            height: string;
        };
    };
    onCloseTab: TabCloseHandler | null;
    content: (HTMLDivElement | HTMLSlotElement)[];
    addTabBody(body: HTMLElement, selectTab?: boolean): void;
    removeTabBody(body: HTMLElement): void;
    keyTab: (event: Event) => void;
    get bodies(): Element[];
    pickTab: (event: Event) => void;
    setupTabs: () => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    localeChanged: () => void;
    onResize(): void;
    render(): void;
}
/** @deprecated Use TosiTabs instead */
export declare const TabSelector: typeof TosiTabs;
export declare const tosiTabs: ElementCreator<TosiTabs>;
/** @deprecated Use tosiTabs instead */
export declare const tabSelector: ElementCreator<TosiTabs>;
/** @deprecated Use tosiTabs instead */
export declare const xinTabs: ElementCreator<TosiTabs>;
export {};
