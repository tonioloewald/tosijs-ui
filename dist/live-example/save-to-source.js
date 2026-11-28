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
/*
Which fences count toward grouping is NOT decided here — `isLiveFence` decides it, the same
predicate `insert-examples` filters with. This module used to carry its own flat six-language
set, and the two diverged the moment `:static` shipped: `insert-examples` skipped a
`js:static` fence while this counted it, so every ordinal after it pointed one group too far
and an edit was written into a DIFFERENT block than the one edited. Silently — the
"couldn't locate this example" guard only fires on an out-of-range ordinal, and here a group
existed at that index.

Ordinals are a shared coordinate system between two modules. They agree only if both ask the
same question, so ask the shared one.
*/
// `js`/`tjs`/`ts` and any registered dialect are interchangeable "source" blocks (the
// example's executable code) — `isDialectLanguage` is the list; html/css/test are the rest.
import { isDialectLanguage, isLiveFence } from '../doc-system/example-policy.js';
import { lexCodeTokens } from '../doc-system/code-fences.js';
const TJS_DOC_OPENER = /^[ \t]*\/#(?![^\n]*#\/)/m;
function docSlices(src, file) {
    if (!file || /\.(md|markdown|mdx)$/i.test(file))
        return [{ text: src, at: 0 }];
    /*
    A `.tjs`/`.ajs` file may also document itself in `/# … #/` comments, interleaved with the
    `/*#` blocks; finding those needs tjs-lang's scanner. Refuse rather than number the examples
    without them.
    */
    if (/\.(tjs|ajs)$/i.test(file) && TJS_DOC_OPENER.test(src))
        return null;
    const slices = [];
    for (const m of src.matchAll(/^[ \t]*(\/\*#[\s\S]+?\*\/)/gm)) {
        const inner = m[1].slice(3, -2);
        const lead = inner.length - inner.trimStart().length;
        slices.push({
            text: inner.trim(),
            at: m.index + m[0].length - m[1].length + 3 + lead,
        });
    }
    return slices;
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
export function findFencedBlocks(src, file) {
    const slices = docSlices(src, file);
    if (!slices)
        return [];
    const joined = slices.map((s) => s.text).join('\n\n');
    // Map a range of `joined` to `src`, or null if it crosses from one slice into the next.
    const starts = [];
    let offset = 0;
    for (const s of slices) {
        starts.push(offset);
        offset += s.text.length + 2;
    }
    const toSource = (from, to) => {
        for (let i = slices.length - 1; i >= 0; i -= 1) {
            if (from >= starts[i]) {
                return to <= starts[i] + slices[i].text.length
                    ? slices[i].at + (from - starts[i])
                    : null;
            }
        }
        return null;
    };
    const crlf = src.includes('\r');
    return lexCodeTokens(joined).map((t) => {
        const block = {
            lang: t.lang,
            mode: t.mode,
            followsCode: t.followsCode,
            writable: false,
            indent: '',
            start: -1,
            end: -1,
            codeStart: -1,
            codeEnd: -1,
        };
        const open = /^([ \t]*)(`{3,}|~{3,})[^\n]*\n/.exec(t.raw);
        if (crlf || t.at === null || !t.fenced || !open)
            return block;
        const [opener, indent, fence] = open;
        // A closing fence is indented at most three spaces; four makes it code (CommonMark).
        const close = new RegExp(`\\n {0,3}\\${fence[0]}{${fence.length},}[ \\t]*(?=\\n|$)`).exec(t.raw.slice(opener.length - 1));
        if (!close)
            return block; // unterminated: runs to the end of the doc
        const closeAt = opener.length - 1 + close.index;
        const at = toSource(t.at, t.at + closeAt + close[0].length);
        if (at === null)
            return block;
        const emptyBody = closeAt < opener.length;
        return {
            ...block,
            writable: true,
            indent,
            start: at,
            end: at + closeAt + close[0].length,
            codeStart: at + opener.length,
            codeEnd: at + (emptyBody ? opener.length : closeAt),
            emptyBody,
        };
    });
}
/** Re-indent each non-empty line of `text` by `indent` (inverse of dedentBy). */
function indentBy(text, indent) {
    if (!indent)
        return text;
    return text
        .split('\n')
        .map((line) => (line ? indent + line : line))
        .join('\n');
}
/** Strip a leading `indent` from each line that has it (best-effort dedent). */
function dedentBy(text, indent) {
    if (!indent)
        return text;
    return text
        .split('\n')
        .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
        .join('\n');
}
/** Group executable blocks into examples, mirroring insert-examples. */
export function groupExamples(_src, blocks, policy = 'auto') {
    const live = (b) => b !== undefined && isLiveFence(b.lang, b.mode, policy);
    const groups = [];
    let current = null;
    for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        if (!live(block)) {
            current = null; // a fence that is not a live example breaks the run
            continue;
        }
        const prev = blocks[i - 1];
        const adjacent = current !== null && block.followsCode && prev !== undefined && live(prev);
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
 * Return `src` with the `ordinal`-th example's edited blocks replaced, or `null` if that
 * example doesn't exist, none of its blocks changed, or a changed block can't be mapped back to
 * one place in the source (see `FencedBlock.writable`). `file` is the source's path, which says
 * whether it is markdown or a source file documented in `/*#` blocks.
 */
export function rewriteExampleBlocks(src, ordinal, edits, 
/* Which fences are live examples — MUST match what `insert-examples` used, or the
   ordinal means something different here than it did there. */
policy = 'auto', file) {
    /*
    The lexer reads `\n` text, so a CRLF file is rewritten as LF and converted back. A file that
    mixes line endings has no single answer for what the edit's newlines should be: refuse.
    */
    if (src.includes('\r')) {
        const rest = src.replace(/\r\n/g, '');
        if (rest.includes('\r') || rest.includes('\n'))
            return null;
        const out = rewriteExampleBlocks(src.replace(/\r\n/g, '\n'), ordinal, edits, policy, file);
        return out === null ? null : out.replace(/\n/g, '\r\n');
    }
    const group = groupExamples(src, findFencedBlocks(src, file), policy)[ordinal];
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
        ? group.find((b) => isDialectLanguage(b.lang))
        : group.find((b) => b.lang === lang);
    for (const lang of ['js', 'html', 'css', 'test']) {
        const next = edits[lang];
        if (next === undefined)
            continue;
        const block = blockFor(lang);
        if (!block)
            continue;
        // Never guess where an unmappable block lives: a wrong guess is a silent bad write.
        if (!block.writable)
            return null;
        // The source fence may be indented (inside an indented doc comment) while the
        // editor value is dedented — compare dedented, and re-indent when writing back
        // so the block keeps its place in the comment.
        const sourceCode = src.slice(block.codeStart, block.codeEnd);
        if (trimEnd(dedentBy(sourceCode, block.indent)) === trimEnd(next))
            continue;
        const text = indentBy(next, block.indent);
        replacements.push({
            start: block.codeStart,
            end: block.codeEnd,
            // A fence with no body line needs one, or the closing fence joins the code's last line.
            text: block.emptyBody ? text + '\n' : text,
        });
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
