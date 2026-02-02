import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class XinTag extends WebComponent {
    static initAttributes: {
        caption: string;
        removeable: boolean;
    };
    removeCallback: (event: Event) => void;
    content: () => HTMLSpanElement[];
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
    static initAttributes: {
        name: string;
        textEntry: boolean;
        editable: boolean;
        placeholder: string;
        disabled: boolean;
    };
    value: string | string[];
    availableTags: string | TagList;
    get tags(): string[];
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
