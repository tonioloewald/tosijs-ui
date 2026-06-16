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
 * Total-order sort key: pin bucket (top<none<bottom), then `order` (default
 * 500), then title, then filename. The filename tiebreak guarantees a stable
 * total order even for equal titles — required so the generated TOC blocks are
 * idempotent (no build-to-build churn).
 */
export declare function navSortKey(doc: NavDoc): string;
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
