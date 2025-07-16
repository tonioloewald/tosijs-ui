import { Component as WebComponent, ElementCreator } from 'tosijs';
type ObjectTest = (obj: any) => boolean;
type ArrayFilter = (array: any[]) => any[];
interface FilterMaker {
    caption: string;
    negative?: string;
    needsValue?: boolean;
    makeTest: (value: any) => ObjectTest;
}
export declare const availableFilters: {
    [key: string]: FilterMaker;
};
interface Filter {
    description: string;
    test: ObjectTest;
}
type Fields = Array<{
    name?: string;
    prop: string;
}>;
export interface FilterPartState {
    haystack: string;
    condition: string;
    needle: string;
}
export declare class FilterPart extends WebComponent {
    fields: Fields;
    filters: {
        [key: string]: FilterMaker;
    };
    haystack: string;
    condition: string;
    needle: string;
    content: () => (SVGElement | HTMLSpanElement)[];
    filter: Filter;
    constructor();
    get state(): FilterPartState;
    set state(newState: FilterPartState);
    buildFilter: () => void;
    connectedCallback(): void;
    render(): void;
}
export declare const filterPart: ElementCreator<FilterPart>;
export type FilterState = FilterPartState[];
export declare class FilterBuilder extends WebComponent {
    private _fields;
    get fields(): Fields;
    set fields(_fields: Fields);
    get state(): FilterState;
    set state(parts: FilterState);
    filter: ArrayFilter;
    description: string;
    addFilter: () => void;
    content: () => (HTMLButtonElement | HTMLDivElement)[];
    filters: {
        [key: string]: FilterMaker;
    };
    reset: () => void;
    buildFilter: () => void;
    connectedCallback(): void;
    render(): void;
}
export declare const filterBuilder: ElementCreator<FilterBuilder>;
export {};
