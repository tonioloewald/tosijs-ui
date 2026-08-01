/*
Shared, pure nav-tree model for the doc system.

Like routing.ts, this is imported by BOTH the build-time generator
(src/doc-system/site/generate-site.ts) and the runtime component
(src/doc-browser.ts), so static and hydrated navigation always agree. Every
function here is a pure, order-independent function of the docs array.

A doc may declare a `parent` (a name or slug) in its metadata; docs sharing a
parent form a nav section, nested arbitrarily deep. Parents are expected to
exist as real docs by the time the tree is built (the build auto-creates any
missing section docs first), so this module never synthesizes.
*/
import { resolveParent } from './routing.js';
/** Pin buckets sort top < none < bottom. */
function pinRank(doc) {
    return doc.pin === 'top' ? 0 : doc.pin === 'bottom' ? 2 : 1;
}
/**
 * Total order: pin bucket (top<none<bottom), then `order` (NUMERIC, default 500),
 * then title, then filename. The filename tiebreak guarantees a stable total order
 * even for equal titles — required so the generated TOC blocks are idempotent (no
 * build-to-build churn).
 *
 * This is a multi-key COMPARATOR, not a concatenated string key, and that is the
 * whole point (issue #24, reported by a consumer). The old version built
 * `bucket + String(order).padStart(4,'0') + title + filename` and compared it
 * lexically, so `order` sorted as TEXT:
 *
 *   order 1   -> "0001"
 *   order 2   -> "0002"
 *   order 1.5 -> String(1.5) = "1.5" -> padStart(4,'0') = "01.5"
 *
 * and lexically "01.5" > "0002" (at index 1, '1' > '0'), so a doc at 1.5 sorted
 * AFTER 2, 3, ... — last in its section. "Insert a page at N.5" reads like a
 * supported idiom and silently did the opposite, with no warning. The same padding
 * also capped `order` at 4 digits (10000+ overflowed the width) and mis-sorted
 * negatives. Comparing numbers as numbers fixes all three.
 *
 * The old key also joined title and filename with a raw NUL byte, which made this
 * file BINARY: macOS grep then silently matches nothing in it (exit 1, no message),
 * so searching this file for any symbol came back empty and the padStart bug was
 * effectively unfindable. A comparator needs no delimiter, so the NUL is gone.
 */
export function pinnedSort(a, b) {
    return (pinRank(a) - pinRank(b) ||
        (a.order ?? 500) - (b.order ?? 500) ||
        (a.title || '')
            .toLocaleLowerCase()
            .localeCompare((b.title || '').toLocaleLowerCase()) ||
        a.filename.localeCompare(b.filename));
}
/**
 * Build the forest of top-level nav nodes. Children are grouped under their
 * resolved parent and each sibling group is sorted by pinnedSort. A doc whose
 * parent can't be resolved (or which would be its own ancestor) becomes a root.
 */
export function buildNavTree(docs, slugMap) {
    const nodes = new Map();
    for (const doc of docs) {
        nodes.set(doc.filename, {
            doc,
            slug: slugMap[doc.filename] ?? '',
            children: [],
            depth: 0,
        });
    }
    // Resolve parents, guarding against missing parents and parent cycles.
    const parentOf = new Map();
    for (const doc of docs) {
        let pf = doc.parent ? resolveParent(doc.parent, docs, slugMap) : '';
        if (pf &&
            (pf === doc.filename ||
                !nodes.has(pf) ||
                createsCycle(doc.filename, pf, docs, slugMap))) {
            pf = '';
        }
        parentOf.set(doc.filename, pf);
    }
    const roots = [];
    for (const doc of docs) {
        const pf = parentOf.get(doc.filename) || '';
        const node = nodes.get(doc.filename);
        if (pf)
            nodes.get(pf).children.push(node);
        else
            roots.push(node);
    }
    const sortNodes = (arr, depth) => {
        arr.sort((x, y) => pinnedSort(x.doc, y.doc));
        for (const n of arr) {
            n.depth = depth;
            sortNodes(n.children, depth + 1);
        }
    };
    sortNodes(roots, 0);
    return roots;
}
/** Walk parent links from `start` to detect whether linking child->parent loops. */
function createsCycle(child, parent, docs, slugMap) {
    const byFilename = new Map(docs.map((d) => [d.filename, d]));
    let cursor = parent;
    const seen = new Set([child]);
    while (cursor) {
        if (seen.has(cursor))
            return true;
        seen.add(cursor);
        const doc = byFilename.get(cursor);
        cursor = doc?.parent ? resolveParent(doc.parent, docs, slugMap) : '';
    }
    return false;
}
/**
 * Filenames of the nodes whose <details> should be open: every node that has
 * children and whose subtree contains `currentFilename`.
 */
export function navOpenPath(roots, currentFilename) {
    const open = new Set();
    const containsCurrent = (node) => {
        let found = node.doc.filename === currentFilename;
        for (const child of node.children) {
            if (containsCurrent(child))
                found = true;
        }
        if (found && node.children.length > 0)
            open.add(node.doc.filename);
        return found;
    };
    for (const root of roots)
        containsCurrent(root);
    return open;
}
