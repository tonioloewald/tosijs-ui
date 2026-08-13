/*
Row grouping for `<tosi-table>` — clustering, forced visibility, and non-repeating cells.

Kept here, pure and DOM-free, because the table is virtual-scrolled: only a screenful of
rows exists at any moment, so **nothing about a group can be derived from the DOM**. Row
parity is not `:nth-child(even)`, and "the first row of this group" is not `:first-child` —
both are facts about the DATA, computed once per render and looked up per stamped row.

That is also why these functions are separated from the component: they are the part worth
testing exhaustively, and they can be tested without a browser, a render, or a rAF.
*/
/**
 * Group by the concatenation of several properties — the inferred grouping when a table
 * sets `nonRepeatingGroupedRowCells` but no explicit `rowGroupId`.
 *
 * JSON rather than a join, because a delimiter is always wrong for somebody: joining
 * `['a', 'b|c']` and `['a|b', 'c']` on `'|'` makes two different rows the same group.
 * Encoding sidesteps the whole class of collision, and costs nothing a consumer can see.
 */
export function concatenatedGroupId(props) {
    return (row) => JSON.stringify(props.map((prop) => row?.[prop] ?? null));
}
/**
 * The grouping function actually in force, or `null` when the table is ungrouped.
 *
 * An explicit `rowGroupId` always wins; otherwise a non-empty `nonRepeatingGroupedRowCells`
 * implies grouping by exactly those values, since blanking a repeated cell is only
 * meaningful relative to some group.
 */
export function resolveRowGroupId(rowGroupId, nonRepeatingProps) {
    if (typeof rowGroupId === 'function')
        return rowGroupId;
    if (nonRepeatingProps && nonRepeatingProps.length > 0) {
        return concatenatedGroupId(nonRepeatingProps);
    }
    return null;
}
/**
 * Re-admit rows whose group is listed in `visibleGroupedRowIds`, regardless of the filter.
 *
 * Additive on purpose: the filter's own output is returned untouched and in its own order,
 * with forced rows appended. A filter is allowed to rank as well as select (relevance
 * search does), and rebuilding the result in source order would silently discard that.
 * Where the appended rows END UP is not this function's business anyway — clustering runs
 * afterwards and pulls each one back to its group.
 */
export function withForcedGroups(filtered, scope, groupId, forcedIds) {
    if (!forcedIds || forcedIds.length === 0)
        return filtered;
    const forced = new Set(forcedIds);
    const present = new Set(filtered);
    const out = filtered.slice();
    for (const row of scope) {
        if (present.has(row))
            continue;
        if (!forced.has(groupId(row)))
            continue;
        present.add(row);
        out.push(row);
    }
    return out;
}
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
export function clusterByGroup(rows, groupId) {
    const groups = new Map();
    for (const row of rows) {
        const id = groupId(row);
        const bucket = groups.get(id);
        if (bucket)
            bucket.push(row);
        else
            groups.set(id, [row]);
    }
    const out = [];
    for (const bucket of groups.values()) {
        for (const row of bucket)
            out.push(row);
    }
    return out;
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
export function groupCounts(scope, visible, groupId) {
    const counts = new Map();
    const entryFor = (id) => {
        let count = counts.get(id);
        if (!count) {
            count = { visible: 0, total: 0 };
            counts.set(id, count);
        }
        return count;
    };
    for (const row of scope)
        entryFor(groupId(row)).total++;
    for (const row of visible)
        entryFor(groupId(row)).visible++;
    return counts;
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
export function groupRenderMeta(rows, groupId) {
    const parity = new Map();
    const firstRows = new Set();
    for (const row of rows) {
        const id = groupId(row);
        if (parity.has(id))
            continue;
        parity.set(id, parity.size % 2 === 0 ? 'even' : 'odd');
        firstRows.add(row);
    }
    return { parity, firstRows };
}
