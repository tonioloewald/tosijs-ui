/*
Did a `/*#` doc block end where its author meant it to?

JS block comments cannot nest, so the LANGUAGE ends a doc comment at the first `*` `/` it
meets — no regex change fixes that, and none is attempted here. The problem this addresses is
the diagnostic. When it happened for real, the build emitted seven parse errors, every one
pointing at markdown PROSE inside the demo, and none at the delimiter that caused it. The
demo's object literal lost its later keys, so a slider silently read `undefined` and the
terrain rendered flat — which is how it was eventually noticed (tosijs-ui#70).

Two signals, both chosen for a low false-positive rate rather than for coverage. A warning
that cries wolf gets ignored, and an ignored warning is worse than none.
*/
/** Built at runtime, so this file does not contain the delimiter it is about. */
const CLOSE = '*' + '/';
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
export function truncationWarnings(filename, block) {
    const out = [];
    const fences = (block.match(/^\s*```/gm) ?? []).length;
    if (fences % 2 === 1) {
        out.push({
            filename,
            reason: `the doc block has ${fences} \`\`\` fences — an unclosed code fence means it was cut mid-example`,
            hint: `look for a \`${CLOSE}\` inside the fence (a glob like \`src/**\`+\`/x\` contains one) and rewrite it`,
        });
    }
    return out;
}
/** One message for all of them — printed once, not per block. */
export function formatTruncationWarnings(warnings) {
    const lines = warnings.map((w) => `   ${w.filename}\n      ${w.reason}\n      → ${w.hint}`);
    return (`⚠️  doc extraction: ${warnings.length} doc block(s) look TRUNCATED.\n\n` +
        lines.join('\n') +
        `\n\n   A truncated block silently drops the rest of your documentation, and any code\n` +
        `   after it becomes source again — which usually surfaces as parse errors pointing at\n` +
        `   prose, never at the delimiter that caused them.\n`);
}
