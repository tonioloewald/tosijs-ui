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
 * WCAG 2 contrast ratio between two opaque colors. Throws on a translucent one: its real
 * contrast depends on what is behind it, and ignoring alpha measured the old 40%-opacity
 * placeholder at 4.74:1 where axe, compositing it, measured 1.88:1.
 */
export declare function contrastRatio(a: Color, b: Color): number;
/**
 * Black or white, whichever has the higher WCAG contrast against `color`.
 *
 * tosijs's `Color.contrasting()` decides by BT.601 luma, which is not what contrast is measured
 * in: it put white on `#009688` at 3.67:1, where black gives 5.72:1 (#4367). `tag-colors.ts`
 * had already switched its chips to this rule for the same reason.
 */
export declare function contrastingText(color: Color): Color;
/**
 * `color`, darkened (on a light `bg`) or brightened (on a dark one) just far enough to reach
 * `min` contrast against `bg`, so it keeps as much of its hue as AA allows.
 */
export declare function readableOn(color: Color, bg: Color, min?: number): Color;
/**
 * Creates color variables from ThemeColors
 */
export declare function createColorVariables(colors: ThemeColors): XinStyleRule;
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
/**
 * Put `sheet` in the `<style id={id}>` element, creating it the first time.
 *
 * tosijs's `StyleSheet()` appends a new element on every call, whatever the id, so applying a
 * theme on every keystroke (or every frame of a colour-well drag) would pile up stylesheets.
 */
export declare function replaceStyleSheet(id: string, sheet: XinStyleSheet): HTMLStyleElement;
export declare const baseTheme: import("tosijs").TosiStyleSheet;
export declare const baseDarkTheme: import("tosijs").TosiStyleSheet;
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
