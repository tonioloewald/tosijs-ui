/** @deprecated Use `applyTheme(createTheme(colors))`; tosijs-ui 1.21.0 removes it (#4392). */
export declare const liveTheme: {
    accent: import("tosijs").BoxedScalar<string>;
    background: import("tosijs").BoxedScalar<string>;
    text: import("tosijs").BoxedScalar<string>;
    dark: import("tosijs").BoxedScalar<boolean>;
} & import("tosijs").TosiProps<{
    accent: string;
    background: string;
    text: string;
    dark: boolean;
}>;
/**
 * Start applying the live theme to the document.
 * @deprecated Use `applyTheme(createTheme(colors))`; tosijs-ui 1.21.0 removes it (#4392).
 */
export declare function enableLiveTheme(): void;
/**
 * Stop applying the live theme.
 * @deprecated tosijs-ui 1.21.0 removes it (#4392).
 */
export declare function disableLiveTheme(): void;
