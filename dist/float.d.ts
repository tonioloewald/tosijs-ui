import { ElementCreator } from 'tosijs';
declare const TosiFloat_base: import("tosijs").WithAttributes<{
    drag: boolean;
    remainOnResize: "hide" | "remove" | "remain";
    remainOnScroll: "hide" | "remove" | "remain";
}>;
export declare class TosiFloat extends TosiFloat_base {
    static preferredTagName: string;
    static floats: Set<TosiFloat>;
    /**
     * The element this float was popped from (set by `popFloat`). Only a scroll that moves it
     * (the page, or a scroller containing it) triggers `remainOnScroll`. `null`: any scroll does.
     */
    anchor: Element | null;
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
