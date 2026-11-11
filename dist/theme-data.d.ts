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
/** A mode's name: `light`, `dark`, or one a theme declares (`tinted`). */
export type ThemeMode = string;
/**
 * How a mode is made from another: `invert` (luminance, for dark), `contrast` (pushed apart;
 * with a generator, the base is pushed to white, black and a 7:1 accent), `monochrome`
 * (desaturated), `{ tint }` (monochrome, toward a colour's hue), or a function of the values.
 * Only colour literals are transformed: a value derived from others (`color-mix(…var(--x)…)`)
 * follows its parents in the browser.
 */
export type ThemeTransform = 'invert' | 'contrast' | 'monochrome' | {
    tint: string;
    amount?: number;
} | ((values: ThemeValues) => ThemeValues);
export interface ThemeModeSpec {
    /** what a theme stores the mode's tuned values under, e.g. `dark` */
    name: ThemeMode;
    /** what the editor calls it */
    label?: string;
    /** the rule the mode's values are written under */
    selector: string;
    /** the classes (on `<html>` and `<body>`) that put the page in this mode, for previewing */
    classes?: string[];
    /** the mode it is made from (light by default) */
    from?: ThemeMode;
    /** how it is made from that mode; a mode with none is only what the page and the theme say */
    derive?: ThemeTransform[];
}
/** The modes a theme has unless it declares its own. */
export declare const THEME_MODE_SPECS: ThemeModeSpec[];
export declare const THEME_MODES: ThemeMode[];
/** Variable name → CSS value. */
export type ThemeValues = Record<string, string>;
export interface ThemeData {
    /** the generator's inputs, e.g. `{ accent: '#d92270' }`; a theme with no generator has none */
    base?: Record<string, string>;
    /** values tuned by hand, by mode name; these win over the generated ones */
    modes?: Record<ThemeMode, ThemeValues>;
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
export interface ThemeModeOptions {
    /** the modes, the first being the one every other is made from (`THEME_MODE_SPECS`) */
    modes?: ThemeModeSpec[];
    /**
     * what the page's own CSS declares in each mode, for a theme with no generator: the first
     * mode's colours are what the others are derived from (`discoverThemeVariables` finds them)
     */
    page?: Record<ThemeMode, ThemeValues>;
}
/**
 * Every mode's values, in full: generated or derived, then what the page declares for the mode,
 * then the hand-tuned values on top.
 */
export declare function deriveTheme(data: ThemeData, generator: ThemeGenerator | null, { modes, page }?: ThemeModeOptions): Record<ThemeMode, ThemeValues>;
/**
 * Every mode's variables as written to the stylesheet. The first mode is written in full with a
 * generator, and only as its tuned values without one (the page's CSS declares the rest). Every
 * other mode writes what makes it differ from what the page would show anyway, and also each
 * variable another mode writes: mode selectors can match together (`.darkmode` matches in dark
 * high contrast too), so one mode's value must never show through in another.
 */
export declare function resolveTheme(data: ThemeData, generator: ThemeGenerator | null, options?: ThemeModeOptions): Record<ThemeMode, ThemeValues>;
/** The stylesheet for a theme: each mode's variables under its selector. */
export declare function themeStyleSheet(resolved: Record<ThemeMode, ThemeValues>, selectors?: Partial<Record<ThemeMode, string>>, modes?: ThemeModeSpec[]): XinStyleSheet;
export interface ApplyThemeOptions extends ThemeModeOptions {
    /** the stylesheet's id; one theme per id, updated in place */
    id?: string;
    /** a selector per mode, in place of the mode's own (to scope a theme to part of a page) */
    selectors?: Partial<Record<ThemeMode, string>>;
}
/**
 * Apply a theme to the page, as one stylesheet (`id`, updated in place on every call), and return
 * what it wrote.
 */
export declare function applyThemeData(data: ThemeData, generator: ThemeGenerator | null, { id, selectors, ...options }?: ApplyThemeOptions): Record<ThemeMode, ThemeValues>;
/** The tosijs-ui component theme (`createTheme`), driven by accent, background and text. */
export declare const componentThemeGenerator: ThemeGenerator;
/** Link the theme's font stylesheets, and unlink ones it no longer uses. */
export declare function applyThemeFonts(urls?: string[]): void;
