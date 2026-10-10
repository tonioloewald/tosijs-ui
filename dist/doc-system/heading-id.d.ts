/** The text a reader sees in a heading: marked's inline tokens with the markup dropped. */
export declare function headingText(token: any): string;
/** GitHub-flavoured slug of some heading text. May be empty (a heading of punctuation). */
export declare function slugOfHeadingText(text: string): string;
/** The slug of a marked heading token, before any `-1` de-duplication. */
export declare const headingSlug: (token: any) => string;
/** Hands out ids for one page, suffixing a repeat the way GitHub does. */
export declare class HeadingIds {
    private seen;
    /** The id for the next heading with this slug, or '' when the slug is empty. */
    next(slug: string): string;
}
