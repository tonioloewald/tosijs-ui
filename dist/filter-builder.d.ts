import { Component as WebComponent, ElementCreator, PartsMap } from 'tosijs';
import { XinSelect } from './select';
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
interface FilterPartParts extends PartsMap {
    haystack: XinSelect;
    condition: XinSelect;
    needle: HTMLInputElement;
    remove: HTMLButtonElement;
}
export declare class FilterPart extends WebComponent<FilterPartParts> {
    fields: Fields;
    filters: {
        [key: string]: FilterMaker;
    };
    haystack: string;
    condition: string;
    needle: string;
    content: () => HTMLSpanElement[];
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
export interface FilterBuilderParts extends PartsMap {
    add: HTMLButtonElement;
    resent: HTMLButtonElement;
}
export declare class FilterBuilder extends WebComponent<FilterBuilderParts> {
    private _fields;
    get fields(): Fields;
    set fields(_fields: Fields);
    get state(): FilterState;
    set state(parts: FilterState);
    filter: ArrayFilter;
    description: string;
    addFilter: () => void;
    content: () => (HTMLDivElement | HTMLButtonElement)[];
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
