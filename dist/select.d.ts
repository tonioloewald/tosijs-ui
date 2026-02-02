import { Component, ElementCreator, PartsMap } from 'tosijs';
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
export declare class TosiSelect extends Component<SelectParts> {
    static formAssociated: boolean;
    static initAttributes: {
        editable: boolean;
        placeholder: string;
        showIcon: boolean;
        hideCaption: boolean;
        localized: boolean;
        disabled: boolean;
        required: boolean;
        name: string;
    };
    options: string | SelectOptions;
    private _value;
    filter: string;
    private isExpanded;
    get value(): string;
    set value(v: string);
    private updateFormValue;
    private updateValidity;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
    formStateRestoreCallback(state: string | null): void;
    private setValue;
    private getValue;
    get selectOptions(): SelectOptions;
    private buildOptionMenuItem;
    poppedOptions: MenuItem[];
    get optionsMenu(): MenuItem[];
    handleChange: (event: Event) => void;
    handleKey: (event: KeyboardEvent) => void;
    filterMenu: (...args: any[]) => void;
    popOptions: (event?: Event) => void;
    private updateAriaExpanded;
    content: () => HTMLButtonElement[];
    get allOptions(): SelectOption[];
    findOption(): SelectOption;
    localeChanged: () => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
/** @deprecated Use TosiSelect instead */
export declare const XinSelect: typeof TosiSelect;
export declare const tosiSelect: ElementCreator<TosiSelect>;
/** @deprecated Use tosiSelect instead (tag is now tosi-select) */
export declare const xinSelect: ElementCreator<TosiSelect>;
export {};
