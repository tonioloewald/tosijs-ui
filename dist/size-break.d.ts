import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class SizeBreak extends WebComponent {
    static initAttributes: {
        minWidth: number;
        minHeight: number;
    };
    value: 'normal' | 'small';
    content: HTMLSlotElement[];
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
        };
    };
    onResize: () => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const sizeBreak: ElementCreator<SizeBreak>;
