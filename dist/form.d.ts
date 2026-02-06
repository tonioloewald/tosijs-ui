import { Component as XinComponent, ElementCreator } from 'tosijs';
export declare class TosiField extends XinComponent {
    static initAttributes: {
        caption: string;
        key: string;
        type: "" | "checkbox" | "number" | "range" | "date" | "text" | "color";
        optional: boolean;
        pattern: string;
        placeholder: string;
        min: string;
        max: string;
        step: string;
        fixedPrecision: number;
        prefix: string;
        suffix: string;
    };
    value: any;
    content: HTMLLabelElement;
    private valueChanged;
    handleChange: () => void;
    connectedCallback(): void;
    render(): void;
}
export declare class TosiForm extends XinComponent {
    context: {
        [key: string]: any;
    };
    value: {
        [key: string]: any;
    };
    get isValid(): boolean;
    static styleSpec: {
        ':host': {
            display: string;
            flexDirection: string;
        };
        ':host::part(header), :host::part(footer)': {
            display: string;
        };
        ':host::part(content)': {
            display: string;
            flexDirection: string;
            overflow: string;
            height: string;
            width: string;
            position: string;
            boxSizing: string;
        };
        ':host form': {
            display: string;
            flex: string;
            position: string;
            overflow: string;
        };
    };
    content: (HTMLSlotElement | HTMLFormElement)[];
    getField: (key: string) => TosiField | null;
    get fields(): any;
    set fields(values: {
        [key: string]: any;
    });
    submit: () => void;
    handleSubmit: (event: SubmitEvent) => void;
    submitCallback: (value: {
        [key: string]: any;
    }, isValid: boolean) => void;
    connectedCallback(): void;
    private handleElementChange;
    private initializeNamedElements;
}
/** @deprecated Use TosiField instead */
export declare const XinField: typeof TosiField;
/** @deprecated Use TosiForm instead */
export declare const XinForm: typeof TosiForm;
export declare const tosiField: ElementCreator<TosiField>;
export declare const tosiForm: ElementCreator<TosiForm>;
/** @deprecated Use tosiField instead (tag is now tosi-field) */
export declare const xinField: ElementCreator<TosiField>;
/** @deprecated Use tosiForm instead (tag is now tosi-form) */
export declare const xinForm: ElementCreator<TosiForm>;
