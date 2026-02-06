import { Color, XinStyleSheet, XinStyleRule } from 'tosijs';
export interface ThemeColors {
    accent: Color;
    background: Color;
    text: Color;
    accentText?: Color;
    backgroundInset?: Color;
    border?: Color;
    shadow?: Color;
    focus?: Color;
}
export declare const defaultColors: ThemeColors;
export declare const baseVariables: XinStyleRule;
/**
 * Creates a complete theme stylesheet from colors
 */
export declare function createTheme(colors: ThemeColors): XinStyleSheet;
/**
 * Creates a dark theme by inverting luminance of all color values
 */
export declare function createDarkTheme(colors: ThemeColors): XinStyleSheet;
/**
 * Applies a theme to the document
 * @param theme - The theme stylesheet to apply
 * @param id - Optional ID for the style element (default: 'tosi-theme')
 */
export declare function applyTheme(theme: XinStyleSheet, id?: string): void;
export declare const baseTheme: XinStyleSheet;
export declare const baseDarkTheme: XinStyleSheet;
/**
 * Creates CSS variable aliases for backward compatibility with --xin- prefix
 * Add this to your theme if migrating from older xinjs-ui versions
 */
export declare const legacyAliases: XinStyleRule;
/**
 * Creates a theme with legacy aliases included
 */
export declare function createThemeWithLegacy(colors: ThemeColors): XinStyleSheet;
/**
 * Helper to create component-specific variables that derive from base variables
 *
 * Example usage in a component:
 * ```typescript
 * const selectVars = componentVars('select', {
 *   gap: varDefault.tosiSpacingSm('8px'),
 *   touchSize: varDefault.tosiTouchSize('44px'),
 * })
 * ```
 */
export declare function componentVars<T extends Record<string, string>>(componentName: string, defaults: T): {
    [K in keyof T]: string;
};
