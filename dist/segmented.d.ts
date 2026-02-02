import { Component as WebComponent, ElementCreator } from 'tosijs';
interface Choice {
    icon?: string | SVGElement;
    value: string;
    caption: string;
}
export declare class TosiSegmented extends WebComponent {
    static formAssociated: boolean;
    static initAttributes: {
        direction: string;
        other: string;
        multiple: boolean;
        name: string;
        placeholder: string;
        localized: boolean;
        required: boolean;
    };
    private _choicesValue;
    get choices(): string | Choice[];
    set choices(v: string | Choice[]);
    static get observedAttributes(): string[];
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    value: null | string;
    private updateFormValue;
    private updateValidity;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
    formStateRestoreCallback(state: string | null): void;
    get values(): string[];
    content: () => (HTMLSlotElement | HTMLDivElement)[];
    static styleSpec: {
        ':host': {
            display: string;
            gap: string;
            alignItems: string;
        };
        ':host, :host::part(options)': {
            flexDirection: string;
        };
        ':host label': {
            display: string;
            alignItems: string;
            gap: string;
            gridTemplateColumns: string;
            padding: string;
            font: string;
        };
        ':host label:focus': {
            outline: string;
            boxShadow: string;
            borderRadius: string;
        };
        ':host label:has(:checked)': {
            color: string;
            background: string;
        };
        ':host label:has(:checked):focus': {
            boxShadow: string;
        };
        ':host svg': {
            height: string;
            stroke: string;
        };
        ':host label.no-icon': {
            gap: number;
            gridTemplateColumns: string;
        };
        ':host input[type="radio"], :host input[type="checkbox"]': {
            visibility: string;
        };
        ':host::part(options)': {
            display: string;
            borderRadius: string;
            background: string;
            color: string;
            overflow: string;
            alignItems: string;
        };
        ':host::part(custom)': {
            padding: string;
            color: string;
            background: string;
            font: string;
            border: string;
            outline: string;
        };
        ':host::part(custom)::placeholder': {
            color: string;
            opacity: string;
        };
    };
    private valueChanged;
    handleChange: () => void;
    handleKey: (event: KeyboardEvent) => void;
    connectedCallback(): void;
    private get _choices();
    get isOtherValue(): boolean;
    render(): void;
}
/** @deprecated Use TosiSegmented instead */
export declare const XinSegmented: typeof TosiSegmented;
export declare const tosiSegmented: ElementCreator<TosiSegmented>;
/** @deprecated Use tosiSegmented instead (tag is now tosi-segmented) */
export declare const xinSegmented: ElementCreator<TosiSegmented>;
export {};
