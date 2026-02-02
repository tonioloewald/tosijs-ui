import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class TosiTag extends WebComponent {
    static initAttributes: {
        caption: string;
        removeable: boolean;
    };
    removeCallback: (event: Event) => void;
    content: () => HTMLSpanElement[];
}
/** @deprecated Use TosiTag instead */
export declare const XinTag: typeof TosiTag;
export declare const tosiTag: ElementCreator<TosiTag>;
/** @deprecated Use tosiTag instead */
export declare const xinTag: ElementCreator<TosiTag>;
interface Tag {
    value: string;
    caption?: string;
    color?: string;
    background?: string;
    icon?: string | HTMLElement;
}
type TagList = (string | Tag | null)[];
export declare class TosiTagList extends WebComponent {
    static formAssociated: boolean;
    static initAttributes: {
        name: string;
        textEntry: boolean;
        editable: boolean;
        placeholder: string;
        disabled: boolean;
        required: boolean;
    };
    private _value;
    availableTags: string | TagList;
    get value(): string | string[];
    set value(v: string | string[]);
    private updateFormValue;
    private updateValidity;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
    formStateRestoreCallback(state: string): void;
    get tags(): string[];
    addTag: (tag: string) => void;
    toggleTag: (toggled: string) => void;
    enterTag: (event: KeyboardEvent) => void;
    popSelectMenu: () => void;
    content: () => (HTMLDivElement | HTMLButtonElement)[];
    removeTag: (event: Event) => void;
    render(): void;
}
/** @deprecated Use TosiTagList instead */
export declare const XinTagList: typeof TosiTagList;
export declare const tosiTagList: ElementCreator<TosiTagList>;
/** @deprecated Use tosiTagList instead */
export declare const xinTagList: ElementCreator<TosiTagList>;
export {};
