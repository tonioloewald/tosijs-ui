import type { XinStyleSheet } from 'tosijs';
import { type ThemeData } from '../theme-data.js';
import { type DocSystemTheme } from './doc-system-styles.js';
export interface ThemePreset {
    /** what it is stored under, and its class: `glass` → `tosi-style-glass` */
    name: string;
    /** what the menu calls it */
    label: string;
    /** the overrides; null for the theme as it stands */
    theme: ThemeData | null;
}
/** The presets the doc site offers. */
export declare const DOC_THEME_PRESETS: ThemePreset[];
/** The class that selects a preset, on `<html>` and `<body>`. */
export declare const presetClass: (name: string) => string;
/**
 * Every preset's CSS, each scoped to its class. A preset's base colours start from the site's
 * `theme`, as an edited theme's do.
 */
export declare function presetStyleSheet(presets?: ThemePreset[], base?: DocSystemTheme): XinStyleSheet;
