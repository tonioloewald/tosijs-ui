import { test, expect } from 'bun:test'
import {
  concatenatedGroupId,
  resolveRowGroupId,
  withForcedGroups,
  clusterByGroup,
  groupRenderMeta,
  groupCounts,
} from './row-grouping'

// The worked example from the feature request: invoice lines grouped by invoice + buyer.
const line = (invoice: string, buyer: string, sku: string, amount: number) => ({
  invoice,
  buyer,
  sku,
  amount,
})
const byInvoice = (row: any) => `${row.invoice}/${row.buyer}`

// ── resolving which grouping is in force ─────────────────────────────────────

test('a table with neither option is ungrouped', () => {
  expect(resolveRowGroupId(null, null)).toBe(null)
  expect(resolveRowGroupId(undefined, undefined)).toBe(null)
  // An EMPTY non-repeating list is not a grouping — it names no columns to blank.
  expect(resolveRowGroupId(null, [])).toBe(null)
})

test('an explicit rowGroupId is used as given', () => {
  expect(resolveRowGroupId(byInvoice, ['invoice'])).toBe(byInvoice)
})

test('nonRepeatingGroupedRowCells alone infers grouping by those values', () => {
  const fn = resolveRowGroupId(null, ['invoice', 'buyer'])!
  expect(fn).not.toBe(null)
  expect(fn(line('A', 'acme', 'x', 1))).toBe(fn(line('A', 'acme', 'y', 2)))
  expect(fn(line('A', 'acme', 'x', 1))).not.toBe(fn(line('A', 'other', 'x', 1)))
})

test('an inferred group id cannot be confused by a delimiter in the data', () => {
  /*
  The reason this encodes rather than joins. With a `|` join, ['a', 'b|c'] and ['a|b', 'c']
  both make "a|b|c" and two unrelated invoices merge into one cluster — silently, and only
  for the customers whose ids contain the delimiter.
  */
  const fn = concatenatedGroupId(['invoice', 'buyer'])
  expect(fn({ invoice: 'a', buyer: 'b|c' })).not.toBe(
    fn({ invoice: 'a|b', buyer: 'c' })
  )
})

test('missing and null properties group together, and not with the empty string', () => {
  const fn = concatenatedGroupId(['invoice'])
  expect(fn({ invoice: null })).toBe(fn({}))
  expect(fn({ invoice: '' })).not.toBe(fn({}))
})

// ── clustering ───────────────────────────────────────────────────────────────

test('rows of a group are brought together', () => {
  const rows = [
    line('A', 'acme', 'x', 1),
    line('B', 'acme', 'y', 2),
    line('A', 'acme', 'z', 3),
  ]
  expect(clusterByGroup(rows, byInvoice).map((r) => r.sku)).toEqual([
    'x',
    'z',
    'y',
  ])
})

test('groups appear in first-appearance order, NOT in id order', () => {
  /*
  The load-bearing choice. "Sort by the group id" would order these clusters alphabetically
  and throw away the sort the user actually applied — sort invoice lines by amount and the
  biggest invoice must still come first, not the one whose id starts with 'A'.
  */
  const rows = [
    line('Z', 'acme', 'big', 900),
    line('A', 'acme', 'small', 1),
    line('Z', 'acme', 'also-big', 800),
  ]
  expect(clusterByGroup(rows, byInvoice).map((r) => r.invoice)).toEqual([
    'Z',
    'Z',
    'A',
  ])
})

test('the incoming order is preserved WITHIN each group', () => {
  // i.e. clustering composes with the active sort instead of replacing it.
  const rows = [
    line('A', 'acme', 'a3', 3),
    line('B', 'acme', 'b1', 4),
    line('A', 'acme', 'a1', 1),
    line('A', 'acme', 'a2', 2),
  ]
  const sorted = rows.slice().sort((a, b) => a.amount - b.amount)
  expect(clusterByGroup(sorted, byInvoice).map((r) => r.sku)).toEqual([
    'a1',
    'a2',
    'a3',
    'b1',
  ])
})

test('clustering neither adds nor drops rows', () => {
  const rows = [
    line('A', 'x', 's1', 1),
    line('B', 'y', 's2', 2),
    line('A', 'y', 's3', 3),
    line('A', 'x', 's4', 4),
  ]
  const out = clusterByGroup(rows, byInvoice)
  expect(out).toHaveLength(rows.length)
  expect(new Set(out)).toEqual(new Set(rows))
})

test('clustering is idempotent and does not mutate its input', () => {
  const rows = [
    line('A', 'x', 's1', 1),
    line('B', 'x', 's2', 2),
    line('A', 'x', 's3', 3),
  ]
  const snapshot = rows.slice()
  const once = clusterByGroup(rows, byInvoice)
  expect(clusterByGroup(once, byInvoice)).toEqual(once)
  expect(rows).toEqual(snapshot)
})

test('an empty table clusters to nothing', () => {
  expect(clusterByGroup([], byInvoice)).toEqual([])
})

// ── parity and first-of-group ────────────────────────────────────────────────

test('parity alternates per GROUP, not per row', () => {
  // The bug this pins: parity taken from the row index would stripe every other ROW, so a
  // three-line invoice would be striped in the middle of itself.
  const rows = clusterByGroup(
    [
      line('A', 'x', 'a1', 1),
      line('A', 'x', 'a2', 2),
      line('A', 'x', 'a3', 3),
      line('B', 'x', 'b1', 1),
    ],
    byInvoice
  )
  const { parity } = groupRenderMeta(rows, byInvoice)
  expect(rows.map((r) => parity.get(byInvoice(r)))).toEqual([
    'even',
    'even',
    'even',
    'odd',
  ])
})

test('parity keeps alternating past two groups', () => {
  const rows = ['A', 'B', 'C', 'D'].map((i) => line(i, 'x', 's', 1))
  const { parity } = groupRenderMeta(rows, byInvoice)
  expect(rows.map((r) => parity.get(byInvoice(r)))).toEqual([
    'even',
    'odd',
    'even',
    'odd',
  ])
})

test('exactly the first row of each group is a first row', () => {
  const rows = clusterByGroup(
    [
      line('A', 'x', 'a1', 1),
      line('B', 'x', 'b1', 1),
      line('A', 'x', 'a2', 2),
      line('B', 'x', 'b2', 2),
    ],
    byInvoice
  )
  const { firstRows } = groupRenderMeta(rows, byInvoice)
  expect(rows.filter((r) => firstRows.has(r)).map((r) => r.sku)).toEqual([
    'a1',
    'b1',
  ])
})

test('two rows that are equal by value are still distinct rows', () => {
  /*
  Identity, not equality — the set is keyed by object. Two identical invoice lines (same
  sku ordered twice) must not BOTH count as the first row of the group, or the repeated
  cell shows up twice.
  */
  const a = line('A', 'x', 'dup', 1)
  const b = line('A', 'x', 'dup', 1)
  const { firstRows } = groupRenderMeta([a, b], byInvoice)
  expect(firstRows.has(a)).toBe(true)
  expect(firstRows.has(b)).toBe(false)
})

test('metadata does not require its input to be clustered', () => {
  // Interleaved input: the first OCCURRENCE of each id still wins, and parity still
  // alternates by group. Grouping must not be a silent precondition.
  const rows = [
    line('A', 'x', 'a1', 1),
    line('B', 'x', 'b1', 1),
    line('A', 'x', 'a2', 2),
  ]
  const { parity, firstRows } = groupRenderMeta(rows, byInvoice)
  expect(parity.get('A/x')).toBe('even')
  expect(parity.get('B/x')).toBe('odd')
  expect(rows.filter((r) => firstRows.has(r))).toEqual([rows[0], rows[1]])
})

// ── forced visibility ────────────────────────────────────────────────────────

const scope = [
  line('A', 'x', 'a1', 1),
  line('A', 'x', 'a2', 2),
  line('B', 'x', 'b1', 1),
  line('C', 'x', 'c1', 1),
]

test('a listed group survives a filter that rejected all of it', () => {
  const filtered = scope.filter((r) => r.invoice === 'C')
  const out = withForcedGroups(filtered, scope, byInvoice, ['A/x'])
  expect(out.map((r) => r.sku).sort()).toEqual(['a1', 'a2', 'c1'])
})

test('a forced row already passing the filter is not duplicated', () => {
  const filtered = scope.filter((r) => r.sku === 'a1')
  const out = withForcedGroups(filtered, scope, byInvoice, ['A/x'])
  expect(out.map((r) => r.sku)).toEqual(['a1', 'a2'])
})

test("the filter's own output and its ORDER are left untouched", () => {
  /*
  Forcing is additive because a filter is allowed to rank as well as select — a relevance
  search does. Rebuilding the result in source order would silently discard that ranking.
  */
  const ranked = [scope[3], scope[1]] // deliberately not in source order
  const out = withForcedGroups(ranked, scope, byInvoice, ['B/x'])
  expect(out.slice(0, 2)).toEqual(ranked)
  expect(out[2].sku).toBe('b1')
})

test('no forced ids is a pass-through', () => {
  const filtered = scope.slice(0, 1)
  expect(withForcedGroups(filtered, scope, byInvoice, null)).toBe(filtered)
  expect(withForcedGroups(filtered, scope, byInvoice, [])).toBe(filtered)
})

test('an unmatched forced id adds nothing rather than throwing', () => {
  const filtered = scope.slice(0, 1)
  expect(
    withForcedGroups(filtered, scope, byInvoice, ['no-such-group'])
  ).toEqual(filtered)
})

test('forcing several groups at once', () => {
  const out = withForcedGroups([], scope, byInvoice, ['A/x', 'C/x'])
  expect(out.map((r) => r.sku)).toEqual(['a1', 'a2', 'c1'])
})

// ── per-group counts ─────────────────────────────────────────────────────────

test('counts report rendered rows against rows before filtering', () => {
  // The "showing 2 of 7" case: this is the number a cell cannot work out for itself,
  // because a consumer only ever sees the rows that survived.
  const visible = scope.filter((r) => r.sku === 'a1' || r.sku === 'b1')
  const counts = groupCounts(scope, visible, byInvoice)
  expect(counts.get('A/x')).toEqual({ visible: 1, total: 2 })
  expect(counts.get('B/x')).toEqual({ visible: 1, total: 1 })
})

test('a group filtered away entirely is still reported, with visible 0', () => {
  // Dropping it would make "no rows matched in this group" indistinguishable from "this
  // group does not exist" — and the first is exactly when a show-all toggle is wanted.
  const counts = groupCounts(scope, [], byInvoice)
  expect(counts.get('A/x')).toEqual({ visible: 0, total: 2 })
  expect([...counts.keys()].sort()).toEqual(['A/x', 'B/x', 'C/x'])
})

test('with no filtering at all, visible equals total everywhere', () => {
  for (const count of groupCounts(scope, scope, byInvoice).values()) {
    expect(count.visible).toBe(count.total)
  }
})

test('counts follow forced groups, so a re-admitted group reads as fully visible', () => {
  // Composed the way the table composes it: filter, then force, then count.
  const filtered = scope.filter((r) => r.sku === 'c1')
  const forced = withForcedGroups(filtered, scope, byInvoice, ['A/x'])
  const counts = groupCounts(scope, forced, byInvoice)
  expect(counts.get('A/x')).toEqual({ visible: 2, total: 2 })
  expect(counts.get('B/x')).toEqual({ visible: 0, total: 1 })
})

test('each group gets its own count object, not a shared one', () => {
  // A single mutable object reused across keys would make every group report the last
  // group's numbers — and would look right for a one-group fixture.
  const counts = groupCounts(scope, scope, byInvoice)
  expect(counts.get('A/x')).not.toBe(counts.get('B/x'))
  expect(counts.get('A/x')!.total).toBe(2)
  expect(counts.get('B/x')!.total).toBe(1)
})

test('an empty table produces an empty map rather than throwing', () => {
  expect(groupCounts([], [], byInvoice).size).toBe(0)
})

// ── the pipeline, composed the way the table composes it ─────────────────────

test('filter → force → sort → cluster produces the invoice view from the request', () => {
  /*
  End to end over the pure half of the feature: a search that only matched one line of
  invoice A, with A pinned open, sorted by amount descending, grouped by invoice+buyer.
  The whole of A must be present, A must stay in one block, and the block must sit where
  its best-sorted row put it.
  */
  const rows = [
    line('A', 'acme', 'widget', 10),
    line('A', 'acme', 'gasket', 5),
    line('B', 'acme', 'anvil', 900),
    line('C', 'acme', 'rope', 7),
  ]
  const filtered = rows.filter((r) => r.sku === 'widget' || r.sku === 'anvil')
  const forced = withForcedGroups(filtered, rows, byInvoice, ['A/acme'])
  forced.sort((a, b) => b.amount - a.amount)
  const clustered = clusterByGroup(forced, byInvoice)

  expect(clustered.map((r) => r.sku)).toEqual(['anvil', 'widget', 'gasket'])

  const { parity, firstRows } = groupRenderMeta(clustered, byInvoice)
  expect(clustered.map((r) => parity.get(byInvoice(r)))).toEqual([
    'even',
    'odd',
    'odd',
  ])
  // Only 'anvil' and 'widget' show the repeated invoice/buyer cells.
  expect(clustered.filter((r) => firstRows.has(r)).map((r) => r.sku)).toEqual([
    'anvil',
    'widget',
  ])
})
