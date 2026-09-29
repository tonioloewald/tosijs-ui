import { ElementCreator, XinStyleSheet } from 'tosijs';
export { TosiTag, tosiTag, XinTag, xinTag } from './tag.js';
interface Tag {
    value: string;
    caption?: string;
    color?: string;
    background?: string;
    icon?: string | HTMLElement;
}
type TagList = (string | Tag | null)[];
declare const TosiTagList_base: import("tosijs").WithAttributes<{
    name: string;
    textEntry: boolean;
    editable: boolean;
    placeholder: string;
    disabled: boolean;
    required: boolean;
}>;
export declare class TosiTagList extends TosiTagList_base {
    #private;
    static preferredTagName: string;
    static lightStyleSpec: XinStyleSheet;
    static formAssociated: boolean;
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
export type XinTagList = TosiTagList;
/** @deprecated Use TosiTagList instead */
export declare const XinTagList: typeof TosiTagList;
export declare const tosiTagList: ElementCreator<TosiTagList>;
/** @deprecated Use tosiTagList instead */
export declare const xinTagList: ElementCreator<TosiTagList>;
