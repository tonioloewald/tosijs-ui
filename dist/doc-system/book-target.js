/*
Which book does a doc belong to, and is it published at all?

Two pieces of doc metadata, both **inherited down the `parent` chain**, because a corpus
is organized as sections and you want to mark the section, not every leaf:

  `book`     — undefined: the default book · a name: that book · "none": no book
  `hidden`   — true: not published at all

`book` gets you past a single-volume corpus: one source tree can emit a main book, a
separate appendix volume, and a set of pages that are on the site but in no book at all.
`hidden` gets you the drawer — incomplete chapters and working notes that should not be
readable by anyone, which is stronger than "absent from the nav".

Both resolve through `resolveParent`, the same matcher the nav uses, so "parent" means
exactly what it means everywhere else (filename, slug, or slugified title).

Cycles are survivable by construction: `parent` is author-written and nav-tree already
guards against loops, so this walks with a seen-set rather than trusting the data.
*/
import { resolveParent } from './routing';
/** The main book — what a doc with no `book` (and no ancestor with one) lands in. */
export const DEFAULT_BOOK = '';
/** `book: "none"` — on the site, in no book. */
export const NO_BOOK = 'none';
/**
 * The doc itself, then each ancestor nearest-first. Stops at an unresolvable parent and
 * at a cycle, so a self-parented doc yields just itself rather than hanging.
 */
export function chain(doc, docs, slugMap = {}) {
    const byFilename = new Map(docs.map((d) => [d.filename, d]));
    const out = [];
    const seen = new Set();
    let cur = doc;
    while (cur && !seen.has(cur.filename)) {
        seen.add(cur.filename);
        out.push(cur);
        if (!cur.parent)
            break;
        const pf = resolveParent(cur.parent, docs, slugMap);
        cur = pf ? byFilename.get(pf) : undefined;
    }
    return out;
}
/**
 * The book this doc belongs to, or `null` when it belongs to none.
 *
 * The NEAREST declaration wins, so a child can opt out of a section's book (`"none"`) or
 * divert into another one, which is the behaviour you want when one chapter of an
 * otherwise-published section isn't ready to bind.
 */
export function resolveBook(doc, docs, slugMap = {}) {
    for (const d of chain(doc, docs, slugMap)) {
        if (d.book === undefined || d.book === '')
            continue;
        return d.book.toLowerCase() === NO_BOOK ? null : d.book;
    }
    return DEFAULT_BOOK;
}
/**
 * Hidden here or anywhere above.
 *
 * Hiding a section must hide what is inside it — otherwise "hide this unfinished part"
 * silently publishes every chapter of it, which is the opposite of what was asked for.
 */
export function isHidden(doc, docs, slugMap = {}) {
    return chain(doc, docs, slugMap).some((d) => d.hidden === true);
}
/** Drop every hidden doc (and every descendant of one). */
export function withoutHidden(docs, slugMap = {}) {
    return docs.filter((d) => !isHidden(d, docs, slugMap));
}
/**
 * Group docs by book. Key `DEFAULT_BOOK` ('') is the main volume; `book: "none"` docs
 * appear in no group at all. Hidden docs are excluded — they are not published anywhere.
 *
 * Insertion order is preserved within each book, so whatever ordering the caller already
 * applied survives.
 */
export function partitionByBook(docs, slugMap = {}) {
    const out = new Map();
    for (const doc of withoutHidden(docs, slugMap)) {
        const book = resolveBook(doc, docs, slugMap);
        if (book === null)
            continue;
        const list = out.get(book);
        if (list)
            list.push(doc);
        else
            out.set(book, [doc]);
    }
    return out;
}
/** Named books only, in stable order — the extra volumes beside the default one. */
export function namedBooks(docs, slugMap = {}) {
    return [...partitionByBook(docs, slugMap).keys()]
        .filter((k) => k !== DEFAULT_BOOK)
        .sort();
}
