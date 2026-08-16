export interface TruncationWarning {
    filename: string;
    reason: string;
    hint: string;
}
/**
 * ONE signal: an ODD number of ``` fences. A doc whose code fence never closes was cut
 * mid-example, and fences are balanced in any doc that ended where it meant to.
 *
 * A second heuristic — "the block contains a nested comment opener" — was written, tried
 * against this repo's own 62 docs, and REMOVED. It flagged five healthy files: a glob
 * (`src/icons/data/*.ts`), a MIME pattern (`['text/*']`), and pages that document this very
 * syntax with an indented `/*#` example. Tightening it to openers preceded by whitespace
 * left the last two, and those are structurally identical to a real truncation — an opener
 * with no close of its own, in a block that ends normally. There is no way to tell them
 * apart, so the check was dropped rather than shipped noisy.
 *
 * That loses nothing against the reported case. A block comment inside a fenced demo ends
 * the doc AT that close, which leaves the fence unclosed — so fence parity already catches
 * it, and catches it without guessing.
 *
 * Deliberately NOT flagged: a block that merely looks short, or whose prose trails off.
 * Both are normal, and guessing at them is how a checker earns its way into the ignore pile.
 */
export declare function truncationWarnings(filename: string, block: string): TruncationWarning[];
/** One message for all of them — printed once, not per block. */
export declare function formatTruncationWarnings(warnings: TruncationWarning[]): string;
