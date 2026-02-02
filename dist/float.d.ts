import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class XinFloat extends WebComponent {
    static floats: Set<XinFloat>;
    static initAttributes: {
        drag: boolean;
        remainOnResize: "hide" | "remove" | "remain";
        remainOnScroll: "hide" | "remove" | "remain";
    };
    content: HTMLSlotElement;
    static styleSpec: {
        ':host': {
            position: string;
        };
    };
    reposition: (event: Event) => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const xinFloat: ElementCreator<XinFloat>;
