/*
save-to-source

Rewrites the fenced code blocks of a single live example back into the doc source
string, so an in-place example edit can be persisted to the file it came from.

Operates on the *raw source* (the `.md`, or a `.ts`/`.js`/`.css` whose doc
comments contain the markdown), located by the example's ordinal — the same
grouping `insert-examples` uses: consecutive executable fenced blocks
(`js`/`html`/`css`/`test`), separated only by whitespace, form one example; any
other content (prose, a heading, or a non-executable block) starts a new one.

Limitations (v1): only blocks already present in the source are updated — adding a
new block type to an example isn't persisted. Replaces by block position, so it
never depends on the rendered/entity-decoded text matching the source.
*/
// `js`/`tjs`/`ts` are interchangeable "source" blocks (the example's executable
// code); html/css/test are the rest. All count toward grouping so example
// ordinals stay aligned with insert-examples.
const SOURCE_LANGS = new Set(['js', 'tjs', 'ts']);
const EXECUTABLE = new Set(['js', 'tjs', 'ts', 'html', 'css', 'test']);
/** Find every ```lang …``` fenced block in document order, with positions. */
export function findFencedBlocks(src) {
    const re = /```([\w-]*)[^\n]*\n([\s\S]*?)\n```/g;
    const blocks = [];
    let m;
    while ((m = re.exec(src)) !== null) {
        const codeStart = m.index + m[0].indexOf('\n') + 1;
        blocks.push({
            lang: m[1] || '',
            start: m.index,
            end: m.index + m[0].length,
            codeStart,
            codeEnd: codeStart + m[2].length,
        });
    }
    return blocks;
}
/** Group executable blocks into examples, mirroring insert-examples. */
export function groupExamples(src, blocks) {
    const groups = [];
    let current = null;
    for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        if (!EXECUTABLE.has(block.lang)) {
            current = null; // a non-executable block breaks the run
            continue;
        }
        const prev = blocks[i - 1];
        const adjacent = current !== null &&
            prev !== undefined &&
            EXECUTABLE.has(prev.lang) &&
            src.slice(prev.end, block.start).trim() === '';
        if (adjacent && current) {
            current.push(block);
        }
        else {
            current = [block];
            groups.push(current);
        }
    }
    return groups;
}
/**
 * Return `src` with the `ordinal`-th example's edited blocks replaced, or `null`
 * if that example or none of the edited blocks exist in the source.
 */
export function rewriteExampleBlocks(src, ordinal, edits) {
    const group = groupExamples(src, findFencedBlocks(src))[ordinal];
    if (!group)
        return null;
    // Code editors normalize trailing whitespace (e.g. add a trailing newline), so
    // an *untouched* block's editor value rarely byte-matches the source. Compare
    // with trailing whitespace trimmed so we only rewrite blocks the user actually
    // changed — otherwise saving one block churns its unedited siblings.
    const trimEnd = (s) => s.replace(/\s+$/, '');
    const replacements = [];
    // `edits.js` is the example's source code regardless of its dialect, so it maps
    // to whichever js/tjs/ts block the group actually has.
    const blockFor = (lang) => lang === 'js'
        ? group.find((b) => SOURCE_LANGS.has(b.lang))
        : group.find((b) => b.lang === lang);
    for (const lang of ['js', 'html', 'css', 'test']) {
        const next = edits[lang];
        if (next === undefined)
            continue;
        const block = blockFor(lang);
        if (!block)
            continue;
        const sourceCode = src.slice(block.codeStart, block.codeEnd);
        if (trimEnd(sourceCode) === trimEnd(next))
            continue; // unchanged (mod trailing ws)
        replacements.push({ start: block.codeStart, end: block.codeEnd, text: next });
    }
    if (replacements.length === 0)
        return null;
    // Apply right-to-left so earlier positions stay valid.
    replacements.sort((a, b) => b.start - a.start);
    let out = src;
    for (const r of replacements) {
        out = out.slice(0, r.start) + r.text + out.slice(r.end);
    }
    return out;
}
