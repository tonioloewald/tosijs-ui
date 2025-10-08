import { Component as XinComponent, ElementCreator } from 'xinjs';
export declare class XinField extends XinComponent {
    caption: string;
    key: string;
    type: '' | 'checkbox' | 'number' | 'range' | 'date' | 'text' | 'color';
    optional: boolean;
    pattern: string;
    placeholder: string;
    min: string;
    max: string;
    step: string;
    fixedPrecision: number;
    value: any;
    content: HTMLLabelElement;
    constructor();
    private valueChanged;
    handleChange: () => void;
    initialize(form: XinForm): void;
    connectedCallback(): void;
    render(): void;
}
export declare class XinForm extends XinComponent {
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
    content: (HTMLFormElement | HTMLSlotElement)[];
    getField: (key: string) => XinField | null;
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
}
export declare const xinField: ElementCreator<XinField>;
export declare const xinForm: ElementCreator<XinForm>;
