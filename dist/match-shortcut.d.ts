interface KeyboardEventLike {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
}
export declare const matchShortcut: (keystroke: KeyboardEventLike, shortcut: string) => boolean;
export {};
