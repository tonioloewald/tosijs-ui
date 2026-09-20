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
/** Compute the full set of `:root` color variables from a few base colors. */
export declare function docSystemColors(theme?: DocSystemTheme): XinStyleRule;
/** Build the full doc-system stylesheet for a given base theme. */
export declare function docSystemStyleSpec(theme?: DocSystemTheme): XinStyleSheet;
