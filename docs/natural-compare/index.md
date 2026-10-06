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
