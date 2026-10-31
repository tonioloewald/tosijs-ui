export interface ExampleBake {
    dialect: string;
    js: string;
}
export type ExampleBakes = Map<string, ExampleBake>;
/** `SiteConfig.accessibility`. One level for now; the name says which standard it targets. */
export type AccessibilityMode = 'wcag22-aa';
/**
 * The accessibility mode's token rewrites (#3521), exported so the build's report reads exactly
 * the structure the page renders.
 */
export declare function accessibleTokens(tokens: any[], title?: string): any[];
export declare function unwrapLoneCustomElements(html: string): string;
export declare function renderDocMarkdown(text: string, opts?: {
    bakes?: ExampleBakes;
    /** the corpus's `wikilinkTargets`; without it a `[[target]]` is slugified as written */
    wikilinks?: Map<string, string>;
    /**
     * The accessibility mode (#3521): figures with captions, and exactly one `<h1>`. `title` is
     * the page title, rendered as that `<h1>` when the markdown has none.
     */
    accessible?: boolean;
    title?: string;
}): string;
/**
 * A doc's tokens as the accessibility mode renders them, for the build's report: the same
 * lexer and the same rewrites as `renderDocMarkdown`, so the report and the page cannot
 * disagree about what is a figure or which heading is the `<h1>`.
 */
export declare function accessibleDocTokens(text: string, title?: string): any[];
/**
 * Where search engines cut a description (#3563). A derived one is cut to fit, on a sentence
 * boundary where it can be, and the metadata lint flags a written one that is longer.
 */
export declare const DESCRIPTION_MAX = 155;
/**
 * Derive a clean <meta name="description"> from a doc's first prose paragraph.
 * Skips the title heading, code fences, tables, quotes, html and image/link-only
 * lines; strips inline markdown; drops low-value "This is a…" leads; and truncates
 * on a sentence boundary where possible (never mid-clause ending in a comma).
 * Pages can override this entirely via their JSON metadata `description`.
 */
export declare function docDescription(text: string, maxLength?: number): string;
/**
 * `docDescription`, saying whether the paragraph had to be cut mid-sentence (it then ends in
 * "…"), which the metadata lint reports: the useful half of a cut description is usually the
 * half that was cut.
 */
export declare function derivedDescription(text: string, maxLength?: number): {
    text: string;
    cut: boolean;
};
