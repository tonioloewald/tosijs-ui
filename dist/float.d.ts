import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class TosiFloat extends WebComponent {
    static preferredTagName: string;
    static floats: Set<TosiFloat>;
    static initAttributes: {
        drag: boolean;
        remainOnResize: "hide" | "remove" | "remain";
        remainOnScroll: "hide" | "remove" | "remain";
    };
    content: HTMLSlotElement;
    static shadowStyleSpec: {
        ':host': {
            position: string;
        };
    };
    reposition: (event: Event) => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
/** @deprecated Use TosiFloat instead */
export declare const XinFloat: typeof TosiFloat;
export declare const tosiFloat: ElementCreator<TosiFloat>;
/** @deprecated Use tosiFloat instead */
export declare const xinFloat: ElementCreator<TosiFloat>;
