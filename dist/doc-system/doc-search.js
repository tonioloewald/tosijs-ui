/*
Rough relevance search over a doc corpus, for the doc browser's palette (board #3454).

The nav filter it replaces was a substring test over each page's title and text: it hid
non-matching pages and ranked nothing, so a query for a component's name listed every page
that mentioned it, in nav order. This scores instead, field by field:

  title        a word that IS the token 100, starts with it 60, contains it 25
  heading      starts with it 30, contains it 12 (and the best heading becomes a deep link)
  keywords     starts with it 20
  description  contains it 10
  body         contains it 3

Every token must match somewhere (AND), so adding a word narrows. The whole query appearing in
the title earns a bonus, and nav order breaks ties. It is deliberately rough: the point is
that the page whose title is the thing you typed comes first.

Headings are lexed with marked and given ids by `HeadingIds`, THE rule the renderer uses, so a
section result's anchor is the id the page actually carries.
*/
import { marked } from 'marked';
import { headingText, slugOfHeadingText, HeadingIds } from './heading-id.js';
const words = (text) => text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
/** The headings of a markdown text, with the ids the rendered page gives them. */
export function docHeadings(text) {
    const ids = new HeadingIds();
    const found = [];
    const walk = (tokens) => {
        for (const token of tokens) {
            if (token.type === 'heading') {
                const text = headingText(token).trim();
                const id = ids.next(slugOfHeadingText(text));
                if (text && id)
                    found.push({ text, id, depth: token.depth });
            }
        }
    };
    try {
        walk(marked.lexer(text));
    }
    catch {
        // A page marked cannot lex has no headings to offer; it is still searchable by text.
    }
    return found;
}
/** Prepare a corpus for searching. Hidden pages are left out. */
export function buildDocIndex(docs) {
    return docs
        .filter((doc) => !doc.hidden)
        .map((doc, order) => {
        const keywords = Array.isArray(doc.keywords)
            ? doc.keywords
            : String(doc.keywords ?? '').split(',');
        return {
            doc,
            order,
            title: String(doc.title).toLowerCase(),
            titleWords: words(String(doc.title)),
            headings: docHeadings(String(doc.text)).map((h) => ({
                ...h,
                lower: h.text.toLowerCase(),
                words: words(h.text),
            })),
            keywords: keywords.flatMap((k) => words(k)),
            description: String(doc.description ?? '').toLowerCase(),
            body: String(doc.text).toLowerCase(),
        };
    });
}
/** The text around the first place `token` appears in `text`, on one line. */
function snippetOf(source, tokens) {
    // Headings are the title and the section rows already; a snippet is body text.
    const text = source.replace(/^[ \t]*#{1,6}[ \t].*$/gm, '');
    const lower = text.toLowerCase();
    let at = -1;
    for (const token of tokens) {
        at = lower.indexOf(token);
        if (at >= 0)
            break;
    }
    const plain = (s) => s
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#*_`>[\]()|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (at < 0)
        return plain(text.slice(0, 200)).slice(0, 140);
    const start = Math.max(0, text.lastIndexOf('\n', at) + 1);
    return plain(text.slice(start, start + 240)).slice(0, 160);
}
/** Score every page against `query`; best first, at most `limit`. */
export function searchDocs(index, query, limit = 20) {
    const tokens = words(query);
    if (!tokens.length)
        return [];
    const phrase = query.trim().toLowerCase();
    const hits = [];
    for (const entry of index) {
        let score = 0;
        let heading;
        let headingScore = 0;
        let all = true;
        for (const token of tokens) {
            let best = 0;
            if (entry.titleWords.includes(token))
                best = 100;
            else if (entry.titleWords.some((w) => w.startsWith(token)))
                best = 60;
            else if (entry.title.includes(token))
                best = 25;
            for (const h of entry.headings) {
                const s = h.words.some((w) => w.startsWith(token))
                    ? 30
                    : h.lower.includes(token)
                        ? 12
                        : 0;
                if (s > headingScore)
                    [heading, headingScore] = [h, s];
                best = Math.max(best, s);
            }
            if (entry.keywords.some((k) => k.startsWith(token)))
                best = Math.max(best, 20);
            if (entry.description.includes(token))
                best = Math.max(best, 10);
            if (!best && entry.body.includes(token))
                best = 3;
            if (!best) {
                all = false;
                break;
            }
            score += best;
        }
        if (!all)
            continue;
        if (phrase.includes(' ') && entry.title.includes(phrase))
            score += 50;
        if (entry.title === phrase)
            score += 100;
        hits.push({
            doc: entry.doc,
            order: entry.order,
            score,
            // A heading is worth linking to only when it, not the title, is what matched.
            heading: heading && headingScore >= 30 && !entry.title.includes(tokens[0])
                ? { text: heading.text, id: heading.id, depth: heading.depth }
                : undefined,
            snippet: entry.doc.description
                ? String(entry.doc.description)
                : snippetOf(String(entry.doc.text), tokens),
        });
    }
    hits.sort((a, b) => b.score - a.score || a.order - b.order);
    return hits.slice(0, limit).map(({ order: _order, ...hit }) => hit);
}
