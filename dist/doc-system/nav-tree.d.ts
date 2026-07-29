export interface NavDoc {
    filename: string;
    title: string;
    pin?: 'top' | 'bottom';
    /** sub-order within a pin bucket (lower first); sections use this for order */
    order?: number;
    /** parent doc name or slug; resolved via resolveParent */
    parent?: string;
}
export interface NavNode<T extends NavDoc = NavDoc> {
    doc: T;
    slug: string;
    children: NavNode<T>[];
    depth: number;
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
export declare function pinnedSort(a: NavDoc, b: NavDoc): number;
/**
 * Build the forest of top-level nav nodes. Children are grouped under their
 * resolved parent and each sibling group is sorted by pinnedSort. A doc whose
 * parent can't be resolved (or which would be its own ancestor) becomes a root.
 */
export declare function buildNavTree<T extends NavDoc>(docs: T[], slugMap: Record<string, string>): NavNode<T>[];
/**
 * Filenames of the nodes whose <details> should be open: every node that has
 * children and whose subtree contains `currentFilename`.
 */
export declare function navOpenPath<T extends NavDoc>(roots: NavNode<T>[], currentFilename: string): Set<string>;
