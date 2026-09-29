import { ElementCreator, XinStyleSheet } from 'tosijs';
export interface SearchTag {
    caption: string;
    background?: string;
    color?: string;
    /** What this tag means, as a predicate: used by the field's `filter`. */
    test?: (item: any) => boolean;
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
    /** How the text left in the field matches an item, for `filter`. Without it, text is ignored. */
    textTest: ((item: any, text: string) => boolean) | null;
    /**
     * The query as an array filter: an item passes if every tag's `test` passes and, when there
     * is text and a `textTest`, the text matches too. Tags without a `test` do not filter.
     * A new function each time the query changes, so hand it to a `<tosi-table>` as it is.
     */
    get filter(): <T>(items: T[]) => T[];
    private filterMemo?;
    private get hintsOpen();
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
    /** Remove every tag and the text. Fires `change` if there was anything to remove. */
    clear: () => void;
    private input;
    private handleInput;
    private handleClear;
    private syncClear;
    private handleKeydown;
    private handleBlur;
    private handleHintMousedown;
    private handleHintClick;
    private removeTag;
    private focusInput;
    content: () => (HTMLDivElement | HTMLButtonElement)[];
    constructor();
    private tagsChanged;
    private updateHints;
    private openHints;
    private handleScroll;
    private closeHints;
    private setActive;
    private syncActive;
    private pick;
    disconnectedCallback(): void;
    render(): void;
}
export declare const tosiSearchField: ElementCreator<TosiSearchField>;
export {};
