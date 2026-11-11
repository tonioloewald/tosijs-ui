import { XinStyleRule, XinStyleSheet } from 'tosijs';
export { FONT_ORIGINS, allowedFontUrl, fontFamilies, parseFontImport, } from './theme-fonts.js';
/** The kinds of value a theme variable can hold; each gets its own control in the editor. */
export type ThemeKind = 'color' | 'length' | 'number' | 'font-family' | 'image' | 'enum' | 'shadow' | 'text';
export interface ThemeVariable {
    /** the CSS custom property without its leading dashes, e.g. `tosi-accent` */
    name: string;
    kind: ThemeKind;
    /** what the editor calls it; defaults to the name */
    label?: string;
    /** a heading the editor groups it under */
    group?: string;
    /** the choices, for `enum` */
    options?: string[];
}
export type ThemeMode = 'light' | 'dark' | 'highContrast' | 'darkHighContrast';
export declare const THEME_MODES: ThemeMode[];
/** Variable name → CSS value. */
export type ThemeValues = Record<string, string>;
export interface ThemeData {
    /** the generator's inputs, e.g. `{ accent: '#d92270' }`; a theme with no generator has none */
    base?: Record<string, string>;
    /** values tuned by hand, per mode; these win over the generated ones */
    light?: ThemeValues;
    dark?: ThemeValues;
    highContrast?: ThemeValues;
    darkHighContrast?: ThemeValues;
    /** web-font stylesheets the theme uses (Google Fonts or Bunny Fonts URLs) */
    fonts?: string[];
}
export interface ThemeGenerator {
    /** the base values it reads, as colour variables named by their key in `base` */
    base: ThemeVariable[];
    /** the base value used when a theme leaves one out */
    defaults: Record<string, string>;
    /** every light-mode variable, from the base */
    light(base: Record<string, string>): ThemeValues;
    /** what dark mode changes, from the base and the resolved light values */
    dark(base: Record<string, string>, light: ThemeValues): ThemeValues;
}
export declare const THEME_MODE_SELECTORS: Record<ThemeMode, string>;
/** The custom properties a XinStyleRule declares, by variable name, as strings. */
export declare function ruleValues(rule: XinStyleRule | undefined): ThemeValues;
/** The colours among `values`, with their luminance inverted; everything else is dropped. */
export declare function invertedColors(values: ThemeValues): ThemeValues;
/** White background, black text, and the accent darkened to 7:1 against it. */
export declare function highContrastBase(base: Record<string, string>): Record<string, string>;
/**
 * Every mode's variables: generated, then the hand-tuned values on top. With no generator the
 * page's own CSS does the deriving (its variables refer to each other), and a theme is only
 * the values it overrides.
 */
export declare function resolveTheme(data: ThemeData, generator: ThemeGenerator | null): Record<ThemeMode, ThemeValues>;
/** The stylesheet for a theme: each mode's variables under its selector. */
export declare function themeStyleSheet(resolved: Record<ThemeMode, ThemeValues>, selectors?: Partial<Record<ThemeMode, string>>): XinStyleSheet;
/**
 * Apply a theme to the page, as one stylesheet (`id`, updated in place on every call), and return
 * what it resolved to.
 */
export declare function applyThemeData(data: ThemeData, generator: ThemeGenerator | null, { id, selectors, }?: {
    id?: string;
    selectors?: Partial<Record<ThemeMode, string>>;
}): Record<ThemeMode, ThemeValues>;
/** The tosijs-ui component theme (`createTheme`), driven by accent, background and text. */
export declare const componentThemeGenerator: ThemeGenerator;
/** Link the theme's font stylesheets, and unlink ones it no longer uses. */
export declare function applyThemeFonts(urls?: string[]): void;
