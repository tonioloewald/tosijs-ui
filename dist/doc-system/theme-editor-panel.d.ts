import type { ThemeData } from '../theme-data.js';
/** The id of the stylesheet the panel previews the theme through. */
export declare const THEME_PREVIEW_STYLE_ID = "tosi-theme-preview";
export interface ThemeEditorSite {
    /** the project-relative theme file (`SiteConfig.themeFile`) */
    file: string;
    /** the site's base colours (`SiteConfig.theme`) */
    theme?: Record<string, string>;
}
/** Whether this page may save the theme: asked once, then cached by sourceAccess. */
export declare const themeEditable: (file: string) => Promise<boolean>;
/** The saved theme, or an empty one if nothing has been saved yet (the server's 204). */
export declare function loadTheme(file: string, fetcher?: typeof fetch): Promise<ThemeData>;
/** Save the theme; resolves to an error message, or null when it saved. */
export declare function saveTheme(file: string, theme: ThemeData, fetcher?: typeof fetch): Promise<string | null>;
/** Open the panel, or bring it forward if it is already open. */
export declare function openThemeEditor(site: ThemeEditorSite): Promise<void>;
