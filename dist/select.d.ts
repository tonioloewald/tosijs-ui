import { Component, ElementCreator, PartsMap } from 'tosijs';
import { MenuItem } from './menu';
type OptionRequest = () => Promise<string | undefined>;
export interface SelectOption {
    icon?: string | HTMLElement;
    caption: string;
    value: string | OptionRequest;
    tooltip?: string;
}
export interface SelectOptionSubmenu {
    icon?: string | HTMLElement;
    caption: string;
    options: SelectOptions;
    tooltip?: string;
}
export type SelectOptions = Array<string | null | SelectOption | SelectOptionSubmenu>;
interface SelectParts extends PartsMap {
    button: HTMLButtonElement;
    value: HTMLInputElement;
}
export declare class TosiSelect extends Component<SelectParts> {
    static preferredTagName: string;
    static formAssociated: boolean;
    static lightStyleSpec: {
        ':host': {
            '--tosi-select-gap': string;
            '--tosi-select-touch-size': string;
            '--tosi-select-padding': string;
            '--tosi-select-value-padding': string;
            '--tosi-select-icon-width': string;
            '--tosi-select-field-width': string;
            '--gap': string;
            '--touch-size': string;
            '--padding': string;
            '--value-padding': string;
            '--icon-width': string;
            '--fieldWidth': string;
            display: string;
            position: string;
        };
        ':host button': {
            display: string;
            alignItems: string;
            justifyItems: string;
            gap: string;
            textAlign: string;
            height: string;
            padding: string;
            position: string;
            width: string;
        };
        ':host:not([show-icon]) button > :first-child': {
            display: string;
        };
        ':host[hide-caption] button > :nth-child(2)': {
            display: string;
        };
        ':host [part="value"]': {
            width: string;
            padding: string;
            height: string;
            lineHeight: string;
            boxShadow: string;
            whiteSpace: string;
            outline: string;
            background: string;
            flex: string;
        };
        ':host [part="value"]:not(:focus)': {
            overflow: string;
            textOverflow: string;
            background: string;
        };
    };
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
    private _options;
    get options(): SelectOptions;
    set options(v: SelectOptions | string);
    private static parseOptionsString;
    value: string;
    filter: string;
    private isExpanded;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
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
export type XinSelect = TosiSelect;
/** @deprecated Use TosiSelect instead */
export declare const XinSelect: typeof TosiSelect;
export declare const tosiSelect: ElementCreator<TosiSelect>;
/** @deprecated Use tosiSelect instead (tag is now tosi-select) */
export declare const xinSelect: ElementCreator<TosiSelect>;
export {};
