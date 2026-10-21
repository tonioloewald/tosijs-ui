/*
Rough relevance search over a doc corpus, for the doc browser's palette (board #3454).

The nav filter it replaces was a substring test over each page's title and text: it hid
non-matching pages and ranked nothing. This scores each query word field by field, taking the
best field and adding how often the body uses it:

               whole word   start of a word
  title           100            60
  heading          35            30   (the best heading becomes a deep link)
  keywords         25            10
  description      18             6
  lead             18             6   (the page's first prose paragraph)
  body         4 up to 24 by how often (a whole word counts double a prefix), +10 for any
               whole-word use, code included, so it beats a prefix anywhere but a title
               or heading

A word only ever matches the START of a word, camelCase split: "date" finds "dates" and
"tosiDate" but not "update". Substring matching made "Automatic Updates" a strong match for
"date" and ranked localize above month, and a page that uses "date" nineteen times scored the
same as one that mentions it once (the maintainer's report, 2026-10-21). A whole word beats a
prefix everywhere, in code too (also the maintainer's call): `date` in a code sample is a better
sign than "dates" in passing.

Every word must match somewhere (AND), so adding a word narrows. The whole query being the
title, or appearing in it, earns a bonus, and nav order breaks ties. It is deliberately rough:
the page whose title is the thing you typed comes first.

Headings are lexed with marked and given ids by `HeadingIds`, THE rule the renderer uses, so a
section result's anchor is the id the page actually carries.
*/
import { marked } from 'marked';
import { headingText, slugOfHeadingText, HeadingIds } from './heading-id.js';
/** Lowercase words, camelCase split: `tosiMonth` is `tosi`, `month`. */
const words = (text) => text
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
/** Is `word` the token itself, give or take a plural? "icon" and "icons" match each other. */
const same = (word, token) => word === token ||
    word === `${token}s` ||
    word === `${token}es` ||
    token === `${word}s` ||
    token === `${word}es`;
/** 2 when `token` (or its plural) is one of `list`, 1 when it starts one, 0 otherwise. */
const fit = (list, token) => list.some((w) => same(w, token))
    ? 2
    : list.some((w) => w.startsWith(token))
        ? 1
        : 0;
/** The first paragraph that is prose: not a heading, a fence, a list or a metadata block. */
function leadOf(text) {
    const prose = text.replace(/```[\s\S]*?```/g, '\n\n');
    for (const block of prose.split(/\n\s*\n/)) {
        const trimmed = block.trim();
        if (!trimmed || /^(#|<!--|\/\*|[-*+] |\d+\. |\||>)/.test(trimmed))
            continue;
        return trimmed;
    }
    return '';
}
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
        const body = new Map();
        for (const w of words(String(doc.text)))
            body.set(w, (body.get(w) ?? 0) + 1);
        return {
            doc,
            order,
            title: String(doc.title).toLowerCase(),
            titleWords: words(String(doc.title)),
            headings: docHeadings(String(doc.text)).map((h) => ({
                ...h,
                words: words(h.text),
            })),
            keywords: keywords.flatMap((k) => words(k)),
            description: words(String(doc.description ?? '')),
            lead: words(leadOf(String(doc.text))),
            body,
        };
    });
}
/** The line of prose around the first word starting with one of `tokens`. */
function snippetOf(source, tokens) {
    // Headings are the title and the section rows already; a snippet is body text.
    const text = source
        .replace(/```[\s\S]*?```/g, '\n')
        .replace(/^[ \t]*#{1,6}[ \t].*$/gm, '');
    const plain = (s) => s
        .replace(/[#*_`>[\]()|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const found = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped.join('|')})`, 'iu').exec(text);
    if (!found)
        return plain(text.slice(0, 200)).slice(0, 140);
    const start = Math.max(0, text.lastIndexOf('\n', found.index) + 1);
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
        let headingFit = 0;
        let all = true;
        for (const token of tokens) {
            const title = fit(entry.titleWords, token);
            let best = title === 2 ? 100 : title ? 60 : 0;
            // This word's best heading; the page's best heading over all words is the deep link.
            let wordHeadingFit = 0;
            for (const h of entry.headings) {
                const f = fit(h.words, token);
                if (f > wordHeadingFit)
                    wordHeadingFit = f;
                if (f > headingFit)
                    [heading, headingFit] = [h, f];
            }
            const field = (f, whole, prefix) => f === 2 ? whole : f ? prefix : 0;
            best = Math.max(best, field(wordHeadingFit, 35, 30), field(fit(entry.keywords, token), 25, 10), field(fit(entry.description, token), 18, 6), field(fit(entry.lead, token), 18, 6));
            let whole = 0;
            let prefixed = 0;
            for (const [w, n] of entry.body) {
                if (same(w, token))
                    whole += n;
                else if (w.startsWith(token))
                    prefixed += n;
            }
            const uses = whole + prefixed / 2;
            const body = uses
                ? Math.min(24, 4 + 4 * Math.log2(1 + uses)) + (whole ? 10 : 0)
                : 0;
            if (!best && !body) {
                all = false;
                break;
            }
            score += best + body;
        }
        if (!all)
            continue;
        if (entry.title === phrase)
            score += 100;
        else if (phrase.includes(' ') && entry.title.includes(phrase))
            score += 50;
        hits.push({
            doc: entry.doc,
            order: entry.order,
            score,
            // A heading is worth linking to only when it, not the title, is what matched.
            heading: heading && !fit(entry.titleWords, tokens[0])
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
