import { ElementCreator } from 'tosijs';
declare const TosiFloat_base: import("tosijs").WithAttributes<{
    drag: boolean;
    remainOnResize: "hide" | "remove" | "remain";
    remainOnScroll: "hide" | "remove" | "remain";
}>;
export declare class TosiFloat extends TosiFloat_base {
    static preferredTagName: string;
    static floats: Set<TosiFloat>;
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
export type XinFloat = TosiFloat;
/** @deprecated Use TosiFloat instead */
export declare const XinFloat: typeof TosiFloat;
export declare const tosiFloat: ElementCreator<TosiFloat>;
/** @deprecated Use tosiFloat instead */
export declare const xinFloat: ElementCreator<TosiFloat>;
export {};
