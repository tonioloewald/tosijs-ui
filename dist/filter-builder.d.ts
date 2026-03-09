import { Component as WebComponent, ElementCreator, PartsMap } from 'tosijs';
import { TosiSelect } from './select';
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
    haystack: TosiSelect;
    condition: TosiSelect;
    needle: HTMLInputElement;
    remove: HTMLButtonElement;
}
export declare class FilterPart extends WebComponent<FilterPartParts> {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            display: string;
        };
        ':host .tosi-icon:': {
            verticalAlign: string;
            pointerEvents: string;
        };
        ':host [part="haystack"], :host [part="condition"]': {
            flex: string;
        };
        ':host [part="needle"]': {
            flex: number;
        };
        ':host [hidden]+[part="padding"]': {
            display: string;
            content: string;
            flex: string;
        };
    };
    static initAttributes: {
        haystack: string;
        condition: string;
        needle: string;
    };
    fields: Fields;
    filters: {
        [key: string]: FilterMaker;
    };
    content: () => HTMLSpanElement[];
    filter: Filter;
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
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            height: string;
            display: string;
            gridTemplateColumns: string;
            alignItems: string;
        };
        ':host [part="filterContainer"]': {
            display: string;
            flexDirection: string;
            alignItems: string;
            flex: string;
        };
        ':host [part="haystack"]': {
            _fieldWidth: string;
        };
        ':host [part="condition"]': {
            _fieldWidth: string;
        };
        ':host [part="needle"]': {
            _fieldWidth: string;
        };
        ':host [part="add"], :host [part="reset"]': {
            '--button-size': string;
            borderRadius: string;
            height: string;
            lineHeight: string;
            margin: string;
            padding: string;
            textAlign: string;
            width: string;
            flex: string;
        };
    };
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
