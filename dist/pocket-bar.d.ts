import { Component as WebComponent, ElementCreator, PartsMap } from 'tosijs';
import { SvgIcon } from './icons.js';
interface PocketBarParts extends PartsMap {
    handle: HTMLButtonElement;
    handleIcon: SvgIcon;
    bar: HTMLDivElement;
}
export declare class TosiPocketBar extends WebComponent<PocketBarParts> {
    static preferredTagName: string;
    static initAttributes: {
        icon: string;
        direction: string;
        open: boolean;
    };
    private pinned;
    private get vertical();
    private get resolvedIcon();
    private get floatPosition();
    reposition: () => void;
    private setOpen;
    private handlePointerEnter;
    private handlePointerLeave;
    private handleFocusIn;
    private handleFocusOut;
    toggle: (event?: Event) => void;
    private handleOutsidePointer;
    private handleScrollResize;
    content: () => (HTMLDivElement | HTMLButtonElement)[];
    static shadowStyleSpec: {
        ':host': {
            display: string;
            position: string;
            opacity: string;
            transition: string;
        };
        ':host([open])': {
            opacity: string;
        };
        ':host [part="handle"]': {
            display: string;
            alignItems: string;
            justifyContent: string;
            padding: string;
            border: string;
            margin: string;
            cursor: string;
            color: string;
            background: string;
            backdropFilter: string;
            borderRadius: string;
            transition: string;
        };
        ':host [part="bar"]': {
            position: string;
            display: string;
            gap: string;
            padding: string;
            background: string;
            backdropFilter: string;
            borderRadius: string;
            boxShadow: string;
            opacity: string;
            pointerEvents: string;
            transform: string;
            transition: string;
        };
        ':host([open]) [part="bar"]': {
            opacity: string;
            pointerEvents: string;
            transform: string;
        };
        '::slotted(button), ::slotted(label)': {
            display: string;
            alignItems: string;
            gap: string;
            padding: string;
            margin: string;
            border: string;
            background: string;
            color: string;
            font: string;
            cursor: string;
            borderRadius: string;
            transition: string;
        };
        '::slotted(button:hover), ::slotted(label:hover)': {
            background: string;
        };
        '::slotted(label:has(input[type="checkbox"]:not(:checked)))': {
            opacity: string;
            filter: string;
        };
    };
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const tosiPocketBar: ElementCreator<TosiPocketBar>;
export {};
