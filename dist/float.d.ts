import { Component as WebComponent, ElementCreator } from 'xinjs';
export declare class XinFloat extends WebComponent {
    static floats: Set<XinFloat>;
    drag: boolean;
    remainOnResize: 'hide' | 'remove' | 'remain';
    remainOnScroll: 'hide' | 'remove' | 'remain';
    content: HTMLSlotElement;
    static styleSpec: {
        ':host': {
            position: string;
        };
    };
    constructor();
    reposition: (event: Event) => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const xinFloat: ElementCreator<XinFloat>;
