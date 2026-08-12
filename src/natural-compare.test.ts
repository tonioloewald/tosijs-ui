import { test, expect } from 'bun:test'
import { naturalCompare, naturalSorter, isBlank } from './natural-compare'

const sorted = (values: unknown[]) => values.slice().sort(naturalCompare)

test('REGRESSION: numeric strings sort numerically, not by first digit', () => {
  // The shipped comparator used a raw `>`, so '9' > '399' is true and a column of numeric
  // strings sorted by leading character. CSV/TSV imports, BigQuery exports and JSON with
  // stringified numbers are all full of these. (tosijs-ui#62)
  expect(sorted(['9', '399', '1200', '3.5', '40'])).toEqual([
    '3.5',
    '9',
    '40',
    '399',
    '1200',
  ])
})

test('decimals and negatives order correctly', () => {
  // A collator alone gets both of these wrong: it would put 3.45 before 3.5, and order
  // negatives by magnitude.
  expect(sorted(['3.5', '3.45', '3.05'])).toEqual(['3.05', '3.45', '3.5'])
  expect(sorted(['-50', '-1200', '0', '-1'])).toEqual([
    '-1200',
    '-50',
    '-1',
    '0',
  ])
})

test('REGRESSION: equal values compare as 0', () => {
  /*
  The shipped comparator was `a > b ? 1 : -1` — it never returned 0, so two equal values
  EACH claimed to be greater than the other. That is not merely wrong, it is an
  inconsistent comparator, and `Array.sort` is entitled to produce arbitrary output from
  one rather than a predictably wrong order.
  */
  expect(naturalCompare('5', '5')).toBe(0)
  expect(naturalCompare(5, 5)).toBe(0)
  expect(naturalCompare('abc', 'abc')).toBe(0)
  expect(naturalCompare(null, undefined)).toBe(0)
})

test('long integers stay exact past MAX_SAFE_INTEGER', () => {
  // Number() rounds both of these to the same double; the text tie-break is what saves it.
  const a = '10000000000000000001'
  const b = '10000000000000000002'
  expect(Number(a) === Number(b)).toBe(true) // the trap
  expect(naturalCompare(a, b)).toBeLessThan(0) // …handled anyway
  expect(sorted([b, a])).toEqual([a, b])
})

test('a numeric-looking substring does not make the value numeric', () => {
  // '12 kpl' is text. Treating it as 12 would sort it among the numbers.
  expect(sorted(['12 kpl', '9 kpl', '100 kpl'])).toEqual([
    '9 kpl',
    '12 kpl',
    '100 kpl',
  ])
  expect(naturalCompare('12 kpl', 12)).not.toBe(0)
})

test('blanks sort last, whichever way you sort', () => {
  // A descending sort that opens on a screenful of empty cells is never what was clicked.
  const rows = [{ v: 'b' }, { v: '' }, { v: 'a' }, { v: null }]
  expect(
    rows
      .slice()
      .sort(naturalSorter((r: any) => r.v, true))
      .map((r: any) => r.v)
  ).toEqual(['a', 'b', '', null])
  expect(
    rows
      .slice()
      .sort(naturalSorter((r: any) => r.v, false))
      .map((r: any) => r.v)
  ).toEqual(['b', 'a', '', null])
})

test('descending is the exact reverse of ascending, for non-blanks', () => {
  const values = ['9', '399', '3.5', '40']
  const asc = values.slice().sort(naturalSorter((v) => v, true))
  const desc = values.slice().sort(naturalSorter((v) => v, false))
  expect(desc).toEqual(asc.slice().reverse())
})

test('mixed numbers and text do not throw or invent an ordering between kinds', () => {
  const out = sorted(['10', 'apple', '2', 'Banana'])
  expect(out).toHaveLength(4)
  expect(out.indexOf('2')).toBeLessThan(out.indexOf('10')) // numbers still numeric
})

test('digit-suffixed labels sort naturally', () => {
  // The nav-sorting case (#24) and anything chapter-shaped.
  expect(sorted(['Chapter 10', 'Chapter 9', 'Chapter 1'])).toEqual([
    'Chapter 1',
    'Chapter 9',
    'Chapter 10',
  ])
})

test('numbers and numeric strings interleave correctly', () => {
  expect(sorted([9, '399', 1200, '3.5'])).toEqual(['3.5', 9, '399', 1200])
})

test('isBlank is exactly null/undefined/empty-string', () => {
  for (const v of [null, undefined, '']) expect(isBlank(v)).toBe(true)
  // 0 and false are VALUES — pinning them last would hide real data.
  for (const v of [0, false, ' ', 'x', NaN]) expect(isBlank(v)).toBe(false)
})

test('the comparator is antisymmetric — the property the old one violated', () => {
  /*
  `a > b ? 1 : -1` claims BOTH that a > b and that b > a when they are equal, which makes
  the comparator inconsistent rather than merely wrong. `Array.sort` may then produce
  arbitrary output. This asserts the invariant directly rather than through a sort, since
  sorting a list and its reverse legitimately differs for elements that compare equal —
  that is stability, not inconsistency.
  */
  const values = ['9', '399', '', '3.5', null, '40', 'apple', 9, 0, false]
  for (const a of values) {
    for (const b of values) {
      // Summing avoids Object.is(-0, 0) being false, which is a quirk of the assertion
      // rather than of the comparator.
      const ab = Math.sign(naturalCompare(a, b))
      const ba = Math.sign(naturalCompare(b, a))
      expect(ab + ba).toBe(0)
    }
  }
})

test('sorting is deterministic for distinct values', () => {
  const values = ['9', '399', '3.5', '40', 'apple']
  const a = values.slice().sort(naturalCompare)
  const b = values.slice().reverse().sort(naturalCompare)
  expect(a).toEqual(b)
})

// ── the table's own comparator (tosijs-ui#62) ────────────────────────────────

import { TosiTable } from './data-table'

function tableWith(columns: any[], rows: any[]): any {
  const t = new TosiTable()
  t.columns = columns
  t.array = rows
  return t
}

test("REGRESSION: a column's numeric strings sort numerically", () => {
  const rows = [{ n: '9' }, { n: '399' }, { n: '1200' }, { n: '3.5' }]
  const t = tableWith([{ prop: 'n', width: 80, sort: 'ascending' }], rows)
  expect(
    rows
      .slice()
      .sort(t.sort)
      .map((r) => r.n)
  ).toEqual(['3.5', '9', '399', '1200'])
})

test('REGRESSION: sortValue sorts by what the cell shows, not by prop', () => {
  /*
  The reported case: a column whose `prop` is an internal id but whose `dataCell` renders a
  customer-facing number. Sorting produced the hidden ids in order, which reads as broken.
  */
  const rows = [
    { id: 'C-3', shown: '1177' },
    { id: 'C-1', shown: '9' },
    { id: 'C-2', shown: '399' },
  ]
  const t = tableWith(
    [
      {
        prop: 'id',
        width: 80,
        sort: 'ascending',
        sortValue: (row: any) => row.shown,
      },
    ],
    rows
  )
  expect(
    rows
      .slice()
      .sort(t.sort)
      .map((r) => r.shown)
  ).toEqual(['9', '399', '1177'])
})

test('without sortValue the column still sorts by prop', () => {
  const rows = [{ n: 'b' }, { n: 'a' }]
  const t = tableWith([{ prop: 'n', width: 80, sort: 'descending' }], rows)
  expect(
    rows
      .slice()
      .sort(t.sort)
      .map((r) => r.n)
  ).toEqual(['b', 'a'])
})

test('an explicit table.sort still overrides the column comparator', () => {
  const rows = [{ n: '1' }, { n: '2' }]
  const t = tableWith([{ prop: 'n', width: 80, sort: 'ascending' }], rows)
  const mine = (a: any, b: any) => (a.n < b.n ? 1 : -1)
  t.sort = mine
  expect(t.sort).toBe(mine)
})
