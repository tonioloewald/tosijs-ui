/*#
# naturalCompare

<!--{ "parent": "Helper Libraries" }-->

Comparing values the way a reader expects, for sorting tables, navs and lists.

```js
import { naturalCompare } from 'tosijs-ui'

const rows = ['9', '399', '1200', '3.5', '40']
preview.textContent = rows.slice().sort(naturalCompare).join(', ')
// 3.5, 9, 40, 399, 1200   — not 1200, 3.5, 399, 40, 9
```

A raw `>` compares strings **lexically**, so any column of numeric strings sorts by first
digit — and real data is full of them: CSV and TSV imports, BigQuery exports, JSON where
numbers arrived as strings, anything id-shaped. `'9' > '399'` is `true`.

`naturalCompare` handles three things a naive comparator gets wrong:

- **numeric strings** sort numerically, including decimals and negatives
- **very long integers** stay exact — two 20-digit ids differing in the last digit compare
  correctly, where `parseFloat` would round both to the same double
- **accented letters** follow the reader's locale, so Finnish and Swedish order them the way
  their readers expect rather than the way ASCII does

Blank values (`null`, `undefined`, `''`) sort **last in both directions** — a descending
sort that opens on a screenful of empty cells is never what was clicked for.
*/
/*
One collator, at module scope.

Constructing an `Intl.Collator` costs far more than using one, and a sort makes O(n log n)
comparisons — so a per-call constructor turns a linear cost into a dominant one.
*/
const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'variant',
});
/** The WHOLE trimmed string must be a number, so `'12 kpl'` is text, not 12. */
const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)$/;
function numericValue(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    return NUMERIC.test(trimmed) ? Number(trimmed) : null;
}
/** `null`, `undefined` and the empty string — pinned last however you sort. */
export function isBlank(value) {
    return value === null || value === undefined || value === '';
}
/**
 * Compare two values the way a reader expects. Suitable for `Array.prototype.sort`.
 *
 * Blanks sort last. Numeric values (including numeric strings) compare as numbers;
 * everything else compares with a locale collator.
 */
export function naturalCompare(a, b) {
    const aBlank = isBlank(a);
    const bBlank = isBlank(b);
    if (aBlank || bBlank)
        return aBlank && bBlank ? 0 : aBlank ? 1 : -1;
    const na = numericValue(a);
    const nb = numericValue(b);
    if (na !== null && nb !== null) {
        /*
        Float first, text as the tie-break.
    
        `Number` can round two distinct long integers to the SAME double, but never to doubles
        in the WRONG order — so "the numbers differ" is always trustworthy, while "the numbers
        are equal" needs re-checking as text. That is what makes two 20-digit ids differing in
        the last digit come out right, where a pure `parseFloat` comparison calls them equal.
        */
        if (na !== nb)
            return na < nb ? -1 : 1;
        return collator.compare(String(a), String(b));
    }
    // A number against a non-number: compare as text rather than inventing an ordering
    // between kinds. The collator's numeric mode still does the sensible thing for
    // digit-prefixed strings like 'Chapter 9' vs 'Chapter 10'.
    return collator.compare(String(a), String(b));
}
/**
 * A comparator for `sort`, given how to read the value and which way to sort.
 *
 * Blanks stay last in BOTH directions, which is why the direction sign cannot simply be
 * multiplied over `naturalCompare` by the caller.
 */
export function naturalSorter(key, ascending = true) {
    const sign = ascending ? 1 : -1;
    return (a, b) => {
        const av = key(a);
        const bv = key(b);
        const aBlank = isBlank(av);
        const bBlank = isBlank(bv);
        if (aBlank || bBlank)
            return aBlank && bBlank ? 0 : aBlank ? 1 : -1;
        return sign * naturalCompare(av, bv);
    };
}
