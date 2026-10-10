/** The text a reader sees in a heading: marked's inline tokens with the markup dropped. */
export declare function headingText(token: any): string;
/** GitHub-flavoured slug of some heading text. May be empty (a heading of punctuation). */
export declare function slugOfHeadingText(text: string): string;
/** The slug of a marked heading token, before any `-1` de-duplication. */
export declare const headingSlug: (token: any) => string;
/**
 * Hands out ids for one page, suffixing a repeat the way GitHub does.
 *
 * It knows about headings and nothing else. In particular it does NOT keep headings out of
 * `example-N`, the ids live examples get in the browser: a reservation here was tried for
 * 1.16.11 and made `next('example')` loop forever on its second call, because every suffix
 * of `example` is `example-N`. A heading "Example 2" is `example-2`, as on GitHub, and wins
 * `#example-2` over the page's second live example because it comes first in the document.
 */
export declare class HeadingIds {
    private seen;
    /** The id for the next heading with this slug, or '' when the slug is empty. */
    next(slug: string): string;
}
