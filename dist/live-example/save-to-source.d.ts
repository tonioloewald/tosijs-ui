interface FencedBlock {
    lang: string;
    start: number;
    end: number;
    codeStart: number;
    codeEnd: number;
}
/** Find every ```lang …``` fenced block in document order, with positions. */
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
