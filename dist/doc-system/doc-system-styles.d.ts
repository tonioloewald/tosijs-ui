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
}
/** Compute the full set of `:root` color variables from a few base colors. */
export declare function docSystemColors(theme?: DocSystemTheme): XinStyleRule;
/** Build the full doc-system stylesheet for a given base theme. */
export declare function docSystemStyleSpec(theme?: DocSystemTheme): XinStyleSheet;
