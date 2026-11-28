import type { ExamplePolicy } from '../doc-system/example-policy.js';
interface FencedBlock {
    lang: string;
    /** the `:<mode>` suffix (`inline` | `iframe` | `ide` | `static`), if the fence carried one */
    mode?: string;
    /**
     * The page puts this block right after the previous one, with no element between: the rule
     * `insert-examples` groups by.
     */
    followsCode: boolean;
    /**
     * The block maps to one contiguous range of the source, so it can be rewritten. A block in a
     * blockquote or a list, an unterminated fence, or an indented code block still counts toward
     * ordinals and grouping, but is never written.
     */
    writable: boolean;
    indent: string;
    start: number;
    end: number;
    codeStart: number;
    codeEnd: number;
    /** the fence has no body line at all (```` ```js ```` then the closing fence) */
    emptyBody?: boolean;
}
/**
 * Every code block of the doc in `src`, in document order, with positions in `src`.
 *
 * Read with marked's lexer (`lexCodeTokens`), the parser the page is rendered with, so the
 * blocks and their order are the page's. This used to be a line regex, and the page and the
 * regex disagreed about a four-space-indented illustration of a fence, a blockquoted fence,
 * ```` ``` js ```` and `~~~js`: saving one example wrote into another (#4343).
 *
 * `file` says how to read `src`: a markdown file (the default) or a source file whose doc is
 * its `/*#` blocks. Positions assume `\n` line endings; `rewriteExampleBlocks` normalises.
 *
 * `indent` is the fence's indentation: a doc comment is often itself indented, so its fence
 * and code lines are too. The body is compared dedented and written back re-indented.
 */
export declare function findFencedBlocks(src: string, file?: string): FencedBlock[];
/** Group executable blocks into examples, mirroring insert-examples. */
export declare function groupExamples(_src: string, blocks: FencedBlock[], policy?: ExamplePolicy): FencedBlock[][];
export type ExampleEdits = {
    js?: string;
    html?: string;
    css?: string;
    test?: string;
};
/**
 * Return `src` with the `ordinal`-th example's edited blocks replaced, or `null` if that
 * example doesn't exist, none of its blocks changed, or a changed block can't be mapped back to
 * one place in the source (see `FencedBlock.writable`). `file` is the source's path, which says
 * whether it is markdown or a source file documented in `/*#` blocks.
 */
export declare function rewriteExampleBlocks(src: string, ordinal: number, edits: ExampleEdits, policy?: ExamplePolicy, file?: string): string | null;
export {};
