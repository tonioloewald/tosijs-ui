export declare const iconData: Record<string, string>;
/** Register built-in icons. An icon the app defined keeps its definition. */
export declare function registerIcons(icons: Record<string, string>): void;
/** Register the whole built-in set: every name is now answerable without loading. */
export declare function registerAllIcons(icons: Record<string, string>): void;
/** An app's own icons (`defineIcons`), which win over built-ins of the same name. */
export declare function defineUserIcons(icons: Record<string, string>): void;
export declare const allIconsRegistered: () => boolean;
/** Load and register the whole built-in set, once. */
export declare function loadAllIcons(): Promise<void>;
