import { ElementPart } from 'tosijs';
import { TosiFloat } from './float';
export type FloatPosition = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'en' | 'wn' | 'es' | 'ws' | 'side' | 'auto';
export interface PopFloatOptions {
    class?: string;
    content: HTMLElement | ElementPart[];
    target: HTMLElement;
    position?: FloatPosition;
    remainOnScroll?: 'hide' | 'remove' | 'remain';
    remainOnResize?: 'hide' | 'remove' | 'remain';
    draggable?: boolean;
}
export declare const popFloat: (options: PopFloatOptions) => TosiFloat;
export declare const positionFloat: (element: TosiFloat, target: HTMLElement, position?: FloatPosition, remainOnScroll?: "hide" | "remove" | "remain", remainOnResize?: "hide" | "remove" | "remain", draggable?: boolean) => void;
