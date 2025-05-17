import { Component as WebComponent, ElementCreator } from 'xinjs';
type TabCloseHandler = (tabBody: Element) => boolean | undefined | void;
export declare class TabSelector extends WebComponent {
    value: number;
    static makeTab(tabs: TabSelector, tabBody: HTMLElement, bodyId: string): HTMLElement;
    static styleSpec: {
        ':host': {
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
            '--text-color': any;
            color: any;
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
            background: any;
            transition: string;
        };
        ':host button.close': {
            fill: any;
            border: number;
            background: string;
            textAlign: string;
            marginLeft: any;
            padding: number;
        };
        ':host button.close > svg': {
            height: string;
        };
    };
    onCloseTab: TabCloseHandler | null;
    content: any[];
    constructor();
    addTabBody(body: HTMLElement, selectTab?: boolean): void;
    removeTabBody(body: HTMLElement): void;
    keyTab: (event: Event) => void;
    get bodies(): Element[];
    pickTab: (event: Event) => void;
    setupTabs: () => void;
    connectedCallback(): void;
    onResize(): void;
    render(): void;
}
export declare const tabSelector: ElementCreator<TabSelector>;
export {};
