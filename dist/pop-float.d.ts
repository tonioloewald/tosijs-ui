import { ElementPart } from 'tosijs';
import { TosiFloat } from './float.js';
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
export declare const positionFloat: (element: HTMLElement, target: HTMLElement, position?: FloatPosition, remainOnScroll?: "hide" | "remove" | "remain", remainOnResize?: "hide" | "remove" | "remain", draggable?: boolean) => void;
/**
 * @internal Exported for tests; not supported API.
 *
 * How far a positioned float can extend before it leaves the visible area: the same geometry
 * as before 1.16.3 (`100vh - top`, `100vw - left`, …), with the VISIBLE area in place of
 * `100vh`/`100vw`. Deliberately not "fit a centred float on both sides": that would narrow
 * every centred tooltip near a screen edge, which is not what #2460 was about. Exported for
 * tests.
 */
export declare function roomOnScreen(element: HTMLElement, w: number, h: number): {
    maxWidth: number;
    maxHeight: number;
};
