export declare const FONT_ORIGINS: string[];
/** The families a font stylesheet URL asks for: `family=Open+Sans:wght@400` → `Open Sans`. */
export declare function fontFamilies(url: string): string[];
/** A font stylesheet URL from a URL allowed by FONT_ORIGINS, or null. */
export declare function allowedFontUrl(url: string): string | null;
/**
 * The stylesheet in what was pasted: a `<link href="…">`, an `@import url(…)`, or a bare URL,
 * as Google Fonts offers them. An error says why it was refused.
 */
export declare function parseFontImport(text: string): {
    url: string;
    families: string[];
} | {
    error: string;
};
