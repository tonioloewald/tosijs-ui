import { Component as WebComponent, ElementCreator, XinStyleSheet } from 'tosijs';
export declare class TosiTag extends WebComponent {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            '--tag-close-button-color': string;
            '--tag-close-button-bg': string;
            '--tag-button-opacity': string;
            '--tag-button-hover-opacity': string;
            '--tag-bg': string;
            '--tag-text-color': string;
            display: string;
            borderRadius: string;
            color: string;
            background: string;
            padding: string;
            height: string;
            lineHeight: string;
        };
        ':host > [part="caption"]': {
            position: string;
            whiteSpace: string;
            overflow: string;
            flex: string;
            fontSize: string;
            color: string;
            textOverflow: string;
        };
        ':host [part="remove"]': {
            boxShadow: string;
            margin: string;
            padding: number;
            display: string;
            alignItems: string;
            alignSelf: string;
            justifyContent: string;
            height: string;
            width: string;
            color: string;
            background: string;
            borderRadius: string;
            opacity: string;
        };
        ':host [part="remove"]:hover': {
            background: string;
            opacity: string;
        };
    };
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
    static preferredTagName: string;
    static lightStyleSpec: XinStyleSheet;
    static formAssociated: boolean;
    static initAttributes: {
        name: string;
        textEntry: boolean;
        editable: boolean;
        placeholder: string;
        disabled: boolean;
        required: boolean;
    };
    value: string;
    get tags(): string[];
    set tags(v: string[]);
    private _availableTags;
    get availableTags(): TagList;
    set availableTags(v: TagList | string);
    private static parseAvailableTagsString;
    connectedCallback(): void;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
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
