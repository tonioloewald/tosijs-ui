import { Component, ElementCreator, Color, PartsMap } from 'xinjs';
interface ColorParts extends PartsMap {
    rgb: HTMLInputElement;
    alpha: HTMLInputElement;
    css: HTMLInputElement;
}
declare class ColorInput extends Component<ColorParts> {
    value: string;
    color: Color;
    static styleSpec: {
        ':host': {
            _gap: number;
            _swatchSize: number;
            _cssWidth: number;
            _alphaWidth: number;
            display: string;
            gap: string;
            alignItems: string;
        };
        ':host input[type="color"]': {
            border: number;
            width: string;
            height: string;
            background: string;
        };
        ':host::part(alpha)': {
            width: string;
        };
        ':host::part(css)': {
            width: string;
            fontFamily: string;
        };
    };
    content: HTMLInputElement[];
    private valueChanged;
    update: (event: Event) => void;
    connectedCallback(): void;
    render(): void;
}
export declare const colorInput: ElementCreator<ColorInput>;
export {};
