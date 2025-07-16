import { Component as WebComponent, ElementCreator } from 'tosijs';
import { MenuItem } from './menu';
type OptionRequest = () => Promise<string | undefined>;
export interface SelectOption {
    icon?: string | HTMLElement;
    caption: string;
    value: string | OptionRequest;
}
export interface SelectOptionSubmenu {
    icon?: string | HTMLElement;
    caption: string;
    options: SelectOptions;
}
export type SelectOptions = Array<string | null | SelectOption | SelectOptionSubmenu>;
export declare class XinSelect extends WebComponent {
    editable: boolean;
    showIcon: boolean;
    hideCaption: boolean;
    options: string | SelectOptions;
    value: string;
    placeholder: string;
    filter: string;
    localized: boolean;
    private setValue;
    private getValue;
    get selectOptions(): SelectOptions;
    private buildOptionMenuItem;
    get optionsMenu(): MenuItem[];
    handleChange: (event: Event) => void;
    handleKey: (event: KeyboardEvent) => void;
    filterMenu: (...args: any[]) => void;
    popOptions: (event?: Event) => void;
    content: () => HTMLButtonElement[];
    constructor();
    get allOptions(): SelectOption[];
    findOption(): SelectOption;
    localeChanged: () => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const xinSelect: ElementCreator<XinSelect>;
export {};
