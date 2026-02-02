import { Component, ElementCreator } from 'tosijs';
export declare class TosiRating extends Component {
    static formAssociated: boolean;
    static initAttributes: {
        max: number;
        min: 0 | 1;
        icon: string;
        step: number;
        ratingStroke: string;
        ratingFill: string;
        emptyStroke: string;
        emptyFill: string;
        readonly: boolean;
        iconSize: number;
        hollow: boolean;
        required: boolean;
        name: string;
    };
    private _value;
    private _internals;
    get value(): number | null;
    set value(v: number | null);
    constructor();
    private updateFormValue;
    private updateValidity;
    formAssociatedCallback(form: HTMLFormElement | null): void;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
    formStateRestoreCallback(state: string | null): void;
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
            width: string;
        };
        ':host::part(container)': {
            position: string;
            display: string;
        };
        ':host::part(empty), :host::part(filled)': {
            height: string;
            whiteSpace: string;
            overflow: string;
        };
        ':host::part(empty)': {
            pointerEvents: string;
        };
        ':host::part(filled)': {
            position: string;
            left: number;
        };
        ':host svg': {
            transform: string;
            pointerEvents: string;
            transition: string;
        };
        ':host svg:hover': {
            transform: string;
        };
        ':host svg:active': {
            transform: string;
        };
    };
    content: () => HTMLSpanElement;
    displayValue(value: number | null): void;
    update: (event: Event) => void;
    handleKey: (event: KeyboardEvent) => void;
    connectedCallback(): void;
    private _renderedIcon;
    render(): void;
}
/** @deprecated Use TosiRating instead */
export declare const XinRating: typeof TosiRating;
export declare const tosiRating: ElementCreator<TosiRating>;
/** @deprecated Use tosiRating instead (tag is now tosi-rating) */
export declare const xinRating: ElementCreator<TosiRating>;
