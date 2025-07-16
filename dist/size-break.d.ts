import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class SizeBreak extends WebComponent {
    minWidth: number;
    minHeight: number;
    value: 'normal' | 'small';
    content: HTMLSlotElement[];
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
        };
    };
    constructor();
    onResize: () => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const sizeBreak: ElementCreator<SizeBreak>;
