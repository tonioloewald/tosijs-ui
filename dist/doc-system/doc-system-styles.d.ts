import { XinStyleSheet, XinStyleRule } from 'tosijs';
export declare const SIDEBAR_WIDTH = 200;
export declare const SIDEBAR_BREAKPOINT = 600;
export interface DocSystemTheme {
    /** brand / accent color — most of the palette is derived from this */
    accent?: string;
    background?: string;
    text?: string;
    buttonBg?: string;
    inputBg?: string;
    /** code-editor surface (`--code-bg`); neutral off-white by default, not brand-tinted. */
    /**
     * Background behind code blocks. Default `#fdfdfd` (light) — dark mode inverts it.
     *
     * **The syntax-highlighting palette does not track this.** Those eleven token colours are
     * fixed literals, contrast-checked against the DEFAULT background in both modes; there is
     * no recomputation that keeps hand-chosen colours legible against an arbitrary one. Set a
     * dark `codeBg` for light mode and the worst token measures **1.71:1** against WCAG AA's
     * 4.5. Override it and you own the contrast — retheme the tokens too, via the
     * `--token-*` variables (each is a `varDefault`). Scoped by a test in
     * `doc-system-styles.test.ts`.
     */
    codeBg?: string;
}
export { contrastRatio, readableOn } from '../theme.js';
import { type ThemeGenerator, type ThemeVariable } from '../theme-data.js';
/** Compute the full set of `:root` color variables from a few base colors. */
export declare function docSystemColors(theme?: DocSystemTheme): XinStyleRule;
/**
 * Build the full doc-system stylesheet for a given base theme.
 *
 * `fontImport: false` leaves out the web fonts' `@import`. The static site does that and links
 * the fonts from `<head>` instead: an `@import` cannot start until the stylesheet holding it
 * has arrived, so it chained a second blocking request behind the first (#3631).
 */
export declare function docSystemStyleSpec(theme?: DocSystemTheme, { fontImport }?: {
    fontImport?: boolean;
}): XinStyleSheet;
export declare const docSystemThemeGenerator: ThemeGenerator;
/** The doc site's variables a theme editor offers, beyond the base colours. */
export declare const DOC_SYSTEM_THEME_VARIABLES: ThemeVariable[];
