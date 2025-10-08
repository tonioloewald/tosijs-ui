import { Component as WebComponent, ElementCreator } from 'xinjs';
export declare class XinTag extends WebComponent {
    caption: string;
    removeable: boolean;
    removeCallback: (event: Event) => void;
    content: () => HTMLSpanElement[];
    constructor();
}
export declare const xinTag: ElementCreator<XinTag>;
interface Tag {
    value: string;
    caption?: string;
    color?: string;
    background?: string;
    icon?: string | HTMLElement;
}
type TagList = (string | Tag | null)[];
export declare class XinTagList extends WebComponent {
    disabled: boolean;
    name: string;
    availableTags: string | TagList;
    value: string | string[];
    textEntry: boolean;
    editable: boolean;
    placeholder: string;
    get tags(): string[];
    constructor();
    addTag: (tag: string) => void;
    toggleTag: (toggled: string) => void;
    enterTag: (event: KeyboardEvent) => void;
    popSelectMenu: () => void;
    content: () => (HTMLButtonElement | HTMLDivElement)[];
    removeTag: (event: Event) => void;
    render(): void;
}
export declare const xinTagList: ElementCreator<XinTagList>;
export {};
