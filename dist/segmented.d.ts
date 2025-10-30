import { Component as WebComponent, ElementCreator } from 'tosijs';
interface Choice {
    icon?: string | SVGElement;
    value: string;
    caption: string;
}
export declare class XinSegmented extends WebComponent {
    choices: string | Choice[];
    other: string;
    multiple: boolean;
    name: string;
    placeholder: string;
    localized: boolean;
    value: null | string;
    get values(): string[];
    content: () => (HTMLDivElement | HTMLSlotElement)[];
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
    constructor();
    private valueChanged;
    handleChange: () => void;
    handleKey: (event: KeyboardEvent) => void;
    connectedCallback(): void;
    private get _choices();
    get isOtherValue(): boolean;
    render(): void;
}
export declare const xinSegmented: ElementCreator<XinSegmented>;
export {};
