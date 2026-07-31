/*
Which book does a doc belong to, and is it published at all?

Two pieces of doc metadata, both **inherited down the `parent` chain**, because a corpus
is organized as sections and you want to mark the section, not every leaf:

  `book`     — undefined: the default book · a name (or list of names): those books
               · "default": the main volume, usable inside a list · "none": no book
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
/** The main book's internal key — what a doc with no `book` lands in. */
export const DEFAULT_BOOK = '';
/** `book: "none"` — on the site, in no book. */
export const NO_BOOK = 'none';
/**
 * The writable name for the default volume, so an array can include it:
 * `book: ["default", "field-guide"]` binds the doc into both.
 */
export const DEFAULT_BOOK_NAME = 'default';
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
/*
Normalize one `book` declaration into a list of book keys.

Returns `null` for "no declaration here, keep looking up the chain" and `[]` for an
explicit `none`. The distinction matters: an absent declaration inherits, an explicit
exclusion does not.
*/
function normalizeDeclaration(value) {
    const raw = (Array.isArray(value) ? value : [value])
        .map((v) => String(v).trim())
        .filter(Boolean);
    if (!raw.length)
        return null; // `""` or `[]` — nothing said
    /*
    `none` anywhere wins, even mixed with real names.
  
    `["default", "none"]` is a contradiction someone typed; the conservative reading is the
    one that withholds. Binding a doc its author tried to exclude is the worse error, and it
    is the same principle as hidden-as-a-floor.
    */
    if (raw.some((v) => v.toLowerCase() === NO_BOOK))
        return [];
    const out = [];
    for (const v of raw) {
        const key = v.toLowerCase() === DEFAULT_BOOK_NAME ? DEFAULT_BOOK : v;
        if (!out.includes(key))
            out.push(key);
    }
    return out;
}
/**
 * Every book this doc belongs to. Empty means none.
 *
 * The NEAREST declaration wins outright — an array replaces an inherited value rather
 * than adding to it, so a child can opt out of a section's book (`"none"`), divert into
 * another, or bind into several (`["default", "appendices"]`).
 */
export function resolveBooks(doc, docs, slugMap = {}) {
    for (const d of chain(doc, docs, slugMap)) {
        if (d.book === undefined)
            continue;
        const declared = normalizeDeclaration(d.book);
        if (declared !== null)
            return declared;
    }
    return [DEFAULT_BOOK];
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
        for (const book of resolveBooks(doc, docs, slugMap)) {
            const list = out.get(book);
            if (list)
                list.push(doc);
            else
                out.set(book, [doc]);
        }
    }
    return out;
}
/** Named books only, in stable order — the extra volumes beside the default one. */
export function namedBooks(docs, slugMap = {}) {
    return [...partitionByBook(docs, slugMap).keys()]
        .filter((k) => k !== DEFAULT_BOOK)
        .sort();
}
