import { Component, ElementCreator, PartsMap } from 'xinjs';
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
interface SelectParts extends PartsMap {
    button: HTMLButtonElement;
    value: HTMLInputElement;
}
export declare class XinSelect extends Component<SelectParts> {
    editable: boolean;
    showIcon: boolean;
    hideCaption: boolean;
    options: string | SelectOptions;
    value: string;
    placeholder: string;
    filter: string;
    localized: boolean;
    disabled: boolean;
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
