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
 */
export declare function enableLiveTheme(): void;
/**
 * Stop applying the live theme.
 */
export declare function disableLiveTheme(): void;
export { 
/** @deprecated import it from `tosijs-ui/theme-editor` */
TosiThemeEditor, 
/** @deprecated import it from `tosijs-ui/theme-editor` */
tosiThemeEditor, } from './theme-editor.js';
