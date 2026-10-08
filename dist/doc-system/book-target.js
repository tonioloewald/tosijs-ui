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
import { resolveParent } from './routing.js';
/** The main book's internal key — what a doc with no `book` lands in. */
export const DEFAULT_BOOK = '';
/** `book: "none"` — on the site, in no book. */
export const NO_BOOK = 'none';
/**
 * The writable name for the default volume, so an array can include it:
 * `book: ["default", "field-guide"]` binds the doc into both.
 */
export const DEFAULT_BOOK_NAME = 'default';
const placementKey = (book) => book === DEFAULT_BOOK ? DEFAULT_BOOK_NAME : book;
/** Volumes a doc's `placement` names, as book keys. */
function placedBooks(doc) {
    return Object.keys(doc.placement ?? {}).map((k) => k.trim().toLowerCase() === DEFAULT_BOOK_NAME ? DEFAULT_BOOK : k.trim());
}
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
    const placed = placedBooks(doc);
    const withPlaced = (books) => [
        ...books,
        ...placed.filter((b) => !books.includes(b)),
    ];
    for (const d of chain(doc, docs, slugMap)) {
        if (d.book === undefined)
            continue;
        const declared = normalizeDeclaration(d.book);
        /*
        An explicit `none` on the doc ITSELF still wins over its own placement: withholding is
        the conservative reading of a contradiction, as it is for `["default", "none"]`. An
        inherited `none` does not, or a chapter could never be placed into a book from a section
        that is otherwise site-only.
        */
        if (declared !== null) {
            if (!declared.length && d === doc)
                return [];
            return withPlaced(declared);
        }
    }
    return withPlaced([DEFAULT_BOOK]);
}
/**
 * The docs of one volume, arranged for it: each doc's `placement` for this book overlaid on
 * its site `parent` / `order` / `pin` / `title`. Returns shallow copies; the site's
 * arrangement is untouched.
 */
export function placeInBook(docs, book) {
    const key = placementKey(book);
    return docs.map((doc) => {
        const entry = Object.entries(doc.placement ?? {}).find(([k]) => k.trim() === key ||
            (book === DEFAULT_BOOK && k.trim().toLowerCase() === DEFAULT_BOOK_NAME));
        if (!entry)
            return doc;
        // Only what a placement is documented to set: an entry is author-written JSON, and
        // copying whatever it holds would let `"hidden": false` or `"text"` through.
        const out = { ...doc };
        for (const field of ['parent', 'order', 'pin', 'title']) {
            const value = entry[1][field];
            if (value !== undefined)
                out[field] = value;
        }
        return out;
    });
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
/*
The text a book binds for this doc.

`bookText` exists only where conditional text made the book differ from the site
(`site/single-source.ts`). Every book output asks here, so there are exactly two readers to
get right (the ePub and print) and every other consumer keeps reading `text`.
*/
export const bookTextOf = (doc) => doc.bookText ?? doc.text;
/*
Might this source use an inset or conditional text?

Deliberately loose: it also matches a directive that is only being SHOWN in a code fence.
Its two callers want exactly that bias. The build uses it to skip docs that certainly have
none before asking the parser, and the example editor uses it to refuse a save, where a
false positive costs a refusal and a false negative writes an edit into the wrong block.
*/
export const mayHaveSingleSourceDirective = (text) => /<!--\s*\{[^\n]*"(inset|only|end)"/.test(text);
