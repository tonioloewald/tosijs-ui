interface FencedBlock {
    lang: string;
    indent: string;
    start: number;
    end: number;
    codeStart: number;
    codeEnd: number;
}
/**
 * Find every ```lang …``` fenced block in document order, with positions.
 *
 * `^([ \t]*)` captures the fence's indentation: a doc comment is often itself
 * indented (some code styles indent block-comment bodies), so its fences —
 * and their code lines — are indented in the raw source. The doc extractor dedents
 * them, so examples render with the right ordinals, but a raw scan must match them
 * where they actually sit (and re-indent on write-back). The old anchor-free regex
 * required the closing ``` immediately after a newline, so an indented file yielded
 * ZERO blocks → save-to-source always failed with "no matching block".
 */
export declare function findFencedBlocks(src: string): FencedBlock[];
/** Group executable blocks into examples, mirroring insert-examples. */
export declare function groupExamples(src: string, blocks: FencedBlock[]): FencedBlock[][];
export type ExampleEdits = {
    js?: string;
    html?: string;
    css?: string;
    test?: string;
};
/**
 * Return `src` with the `ordinal`-th example's edited blocks replaced, or `null`
 * if that example or none of the edited blocks exist in the source.
 */
export declare function rewriteExampleBlocks(src: string, ordinal: number, edits: ExampleEdits): string | null;
export {};
