import { ElementCreator, XinStyleSheet } from 'tosijs';
export interface SearchTag {
    caption: string;
    background?: string;
    color?: string;
    [key: string]: unknown;
}
export interface SearchHint {
    caption: string;
    tag: SearchTag;
}
export type SearchHintRule = (text: string, tags: SearchTag[]) => SearchHint | SearchHint[] | null | undefined;
export interface SearchQuery {
    tags: SearchTag[];
    text: string;
}
declare const TosiSearchField_base: import("tosijs").WithAttributes<{
    placeholder: string;
    disabled: boolean;
}>;
export declare class TosiSearchField extends TosiSearchField_base {
    static preferredTagName: string;
    static lightStyleSpec: XinStyleSheet;
    hints: SearchHintRule[];
    private tagList;
    private textValue;
    private listed;
    private active;
    private float?;
    private readonly listId;
    private readonly hintList;
    get value(): SearchQuery;
    set value(query: SearchQuery);
    get hintCount(): number;
    typeText: (text: string) => void;
    private input;
    private handleInput;
    private handleKeydown;
    private handleBlur;
    private handleHintMousedown;
    private handleHintClick;
    private removeTag;
    private focusInput;
    content: () => HTMLDivElement[];
    constructor();
    private tagsChanged;
    private updateHints;
    private openHints;
    private closeHints;
    private setActive;
    private syncActive;
    private pick;
    disconnectedCallback(): void;
    render(): void;
}
export declare const tosiSearchField: ElementCreator<TosiSearchField>;
export {};
