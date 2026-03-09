import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class SizeBreak extends WebComponent {
    static preferredTagName: string;
    static initAttributes: {
        minWidth: number;
        minHeight: number;
    };
    value: 'normal' | 'small';
    content: HTMLSlotElement[];
    static shadowStyleSpec: {
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
