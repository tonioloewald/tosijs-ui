/** A code block as marked reads it, with where it sits. */
export interface CodeToken {
    lang: string;
    text: string;
    mode?: string;
    /** The block's markdown as written, fence lines included. */
    raw: string;
    /** False for an indented (four-space) code block, which has no fence and no language. */
    fenced: boolean;
    /**
     * Offset of `raw` in the text that was lexed, or `null` when the block sits inside a
     * blockquote or a list, where marked's `raw` is the text with the `> ` or the item's
     * indentation removed, so it is not a slice of the source.
     */
    at: number | null;
    /**
     * The previous element the rendered page puts beside this block is a code block: nothing
     * between them but blank lines or an HTML comment. This is what `insert-examples` reads as
     * `nextElementSibling` when it groups consecutive blocks into one example.
     */
    followsCode: boolean;
}
/** Every code block in `text`, in document order, with its place. */
export declare function lexCodeTokens(text: string): CodeToken[];
export declare function collectCodeTokens(text: string): Array<{
    lang: string;
    text: string;
    mode?: string;
}>;
