import { ElementPart } from 'tosijs';
import { XinFloat } from './float';
export type FloatPosition = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'en' | 'wn' | 'es' | 'ws' | 'side' | 'auto';
export interface PopFloatOptions {
    content: HTMLElement | ElementPart[];
    target: HTMLElement;
    position?: FloatPosition;
    remainOnScroll?: 'hide' | 'remove' | 'remain';
    remainOnResize?: 'hide' | 'remove' | 'remain';
}
export declare const popFloat: (options: PopFloatOptions) => XinFloat;
export declare const positionFloat: (element: XinFloat, target: HTMLElement, position?: FloatPosition, remainOnScroll?: "hide" | "remove" | "remain", remainOnResize?: "hide" | "remove" | "remain") => void;
