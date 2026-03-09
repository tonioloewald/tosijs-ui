export interface KeyboardEventLike {
    key: string;
    code?: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
}
export declare const modifierKeys: Record<string, string>;
export declare const keycode: (evt: KeyboardEventLike) => string;
export declare const keystroke: (evt: KeyboardEventLike) => string;
interface ParsedShortcut {
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    key: string;
}
export declare const parseShortcut: (shortcut: string) => ParsedShortcut;
export declare const matchShortcut: (event: KeyboardEventLike, shortcut: string) => boolean;
export declare const canonicalShortcut: (shortcut: string) => string;
export declare const displayShortcut: (shortcut: string) => string;
export {};
