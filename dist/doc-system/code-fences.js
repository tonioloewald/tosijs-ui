/*
THE way to enumerate the code blocks in a doc, build and client alike: marked's own lexer.

`check-examples` had this function; `build-warnings` then grew a hand-written line scanner for
the same job, and the 1.16.7 re-review found the scanner disagreeing with marked on CRLF files,
blockquoted fences and fences inside HTML blocks. A scanner can only ever approximate the
parser the pages are rendered with, so nothing here scans: every caller asks marked. The
doc-browser's test runner asks here too (`hasTestBlock`), and so does save-to-source, which
had the last regex scanner and wrote edits into the wrong example with it (#4343).
*/
import { marked } from 'marked';
import { parseFenceInfo } from './example-policy.js';
// Tokens that render no element, so they don't separate two blocks on the page.
const rendersNoElement = (t) => t.type === 'space' ||
    t.type === 'def' ||
    (t.type === 'html' && /^\s*<!--[\s\S]*?-->\s*$/.test(t.raw));
/** Every code block in `text`, in document order, with its place. */
export function lexCodeTokens(text) {
    const out = [];
    /*
    Lexing normalises line endings, so offsets are only meaningful in `\n` text; a caller that
    needs them (save-to-source) normalises first.
    */
    const lexed = text.replace(/\r\n|\r/g, '\n');
    const walk = (tokens, from) => {
        let cursor = from;
        let followsCode = false;
        for (const t of tokens) {
            let at = null;
            if (cursor !== null && typeof t.raw === 'string') {
                const found = lexed.startsWith(t.raw, cursor)
                    ? cursor
                    : lexed.indexOf(t.raw, cursor);
                if (found !== -1) {
                    at = found;
                    cursor = found + t.raw.length;
                }
            }
            if (rendersNoElement(t))
                continue;
            if (t.type === 'code') {
                /*
                Keep the MODE. `dialectOf` reduced `js:static` to `js`, so the checker could not tell a
                block that will never run from one that will — and hard-failed a build over the syntax
                of illustrative code, advising the author to retag it as `typescript`, which is exactly
                the mislabelling this release exists to abolish (review major M2).
                */
                const info = parseFenceInfo(t.lang ?? '');
                out.push({
                    lang: info.lang,
                    text: t.text,
                    mode: info.mode,
                    raw: t.raw,
                    fenced: t.codeBlockStyle !== 'indented',
                    at,
                    followsCode,
                });
                followsCode = true;
                continue;
            }
            followsCode = false;
            if (Array.isArray(t.tokens))
                walk(t.tokens, null);
            if (Array.isArray(t.items))
                walk(t.items, null); // list items
        }
    };
    walk(marked.lexer(lexed), 0);
    return out;
}
/*
Fence info is parsed by `parseFenceInfo`, the one copy of that grammar. This file had its own
`dialectOf`/`modeOf` pair; once fences could carry JSON options (#184) `modeOf` would have read
`{"debug":true}` as the mode `true`.
*/
export function collectCodeTokens(text) {
    return lexCodeTokens(text).map((t) => ({
        lang: t.lang,
        text: t.text,
        mode: t.mode,
    }));
}
