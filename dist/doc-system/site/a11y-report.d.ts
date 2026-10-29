export interface A11yFinding {
    /** what the problem is about: an image's description, the heading outline, a link's text */
    kind: 'image' | 'heading' | 'link';
    /** a short description of the problem, naming the offending markup */
    message: string;
    /** the block's markdown, for locating it in the source file */
    raw: string;
    /** for a markdown image with no alt and no caption: the one an `altText` hook could fill */
    image?: {
        href: string;
        title?: string | null;
        raw: string;
    };
}
/** Every problem the accessibility mode reports for one doc, in document order. */
export declare function accessibilityFindings(text: string, title?: string): A11yFinding[];
/**
 * The 1-based line in `source` where a finding's block starts, or undefined when it cannot be
 * found (a block the extractor reshaped). Matched on the block's first non-blank line, which
 * survives the extractor's handling of doc comments.
 */
export declare function findingLine(source: string, raw: string): number | undefined;
