/** Given a row, the id of the cluster it belongs to. */
export type RowGroupIdFn = (row: any) => string;
/**
 * Group by the concatenation of several properties — the inferred grouping when a table
 * sets `nonRepeatingGroupedRowCells` but no explicit `rowGroupId`.
 *
 * JSON rather than a join, because a delimiter is always wrong for somebody: joining
 * `['a', 'b|c']` and `['a|b', 'c']` on `'|'` makes two different rows the same group.
 * Encoding sidesteps the whole class of collision, and costs nothing a consumer can see.
 */
export declare function concatenatedGroupId(props: string[]): RowGroupIdFn;
/**
 * The grouping function actually in force, or `null` when the table is ungrouped.
 *
 * An explicit `rowGroupId` always wins; otherwise a non-empty `nonRepeatingGroupedRowCells`
 * implies grouping by exactly those values, since blanking a repeated cell is only
 * meaningful relative to some group.
 */
export declare function resolveRowGroupId(rowGroupId?: RowGroupIdFn | null, nonRepeatingProps?: string[] | null): RowGroupIdFn | null;
/**
 * Re-admit rows whose group is listed in `visibleGroupedRowIds`, regardless of the filter.
 *
 * Additive on purpose: the filter's own output is returned untouched and in its own order,
 * with forced rows appended. A filter is allowed to rank as well as select (relevance
 * search does), and rebuilding the result in source order would silently discard that.
 * Where the appended rows END UP is not this function's business anyway — clustering runs
 * afterwards and pulls each one back to its group.
 */
export declare function withForcedGroups<T>(filtered: T[], scope: T[], groupId: RowGroupIdFn, forcedIds?: string[] | null): T[];
/**
 * Bring rows of the same group together, in **first-appearance** order.
 *
 * Deliberately not "sort by the group id": that would order the groups alphabetically and
 * throw away the sort the user actually asked for. Sort a table of invoice lines by date
 * and you expect the earliest invoice first — not the one whose id happens to start with a
 * digit. Clustering by first appearance keeps the active sort meaningful at group level
 * (the group goes where its best-sorted row went) and falls back to source order when no
 * sort is set. Within a group, the incoming relative order is preserved.
 */
export declare function clusterByGroup<T>(rows: T[], groupId: RowGroupIdFn): T[];
export interface GroupCount {
    /** rows of this group currently rendered */
    visible: number;
    /** rows of this group in the table's data, before filtering */
    total: number;
}
/**
 * How many rows each group has, and how many of them survived the filter.
 *
 * The table is the only thing that sees both sides of the filter at once — a consumer has
 * the rendered rows and nothing to compare them against — so a cell that wants to say
 * "showing 2 of 7" or offer a "show all" toggle cannot work this out for itself without
 * re-running the filter. Computing it here costs two passes over data already in hand.
 *
 * Groups filtered out entirely are still present, with `visible: 0`, so the map describes
 * the whole dataset rather than just what happens to be on screen.
 */
export declare function groupCounts<T>(scope: T[], visible: T[], groupId: RowGroupIdFn): Map<string, GroupCount>;
export interface GroupRenderMeta<T> {
    /** group id → `'even'` or `'odd'`, alternating in group order */
    parity: Map<string, 'even' | 'odd'>;
    /** the first row of each group — the only one that shows non-repeating cells */
    firstRows: Set<T>;
}
/**
 * Everything a stamped row needs to know about its group, keyed so it can be looked up
 * without knowing the row's position.
 *
 * Parity is per GROUP, not per row, so a lookup needs only the group id — which any row can
 * recompute for itself. First-ness genuinely needs identity, hence the set.
 *
 * Does not require its input to be clustered: parity alternates over distinct ids in
 * first-appearance order, and the first occurrence of an id is its first row either way.
 */
export declare function groupRenderMeta<T>(rows: T[], groupId: RowGroupIdFn): GroupRenderMeta<T>;
