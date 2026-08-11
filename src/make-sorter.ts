export type SortValuator<T = object> = (f: T) => (string | number)[]

export type SortCallback<T = object> = (p: T, q: T) => number

/*#
# makeSorter

I'm always confusing myself when writing sort functions, so I wrote `makeSorter()`. It's
insanely simple and just works™. It makes writing an array sort callback for anything
other than an array of numbers or strings easier.

```js
import { select, option, div, span, ul, li } from 'tosijs'.elements
import { icons, makeSorter } from 'tosijs-ui'

const people = [
  { first: 'Frasier', last: 'Crane', age: 38 },
  { first: 'Lilith', last: 'Crane', age: 37 },
  { first: 'Rebecca', last: 'Howe', age: 35 },
  { first: 'Woody', last: 'Boyd', age: 25 },
  { first: 'Sam', last: 'Malone', age: 40 },
  { first: 'Norm', last: 'Peterson', age: 38 },
]

const sorters = {
  firstSort: makeSorter(person => [person.first]),
  firstDescSort: makeSorter(person => [person.first], false),
  nameSort: makeSorter(person => [person.last, person.first]),
  ageFirst: makeSorter(person => [-person.age, person.last]),
  ageLast: makeSorter(person => [person.age, person.first], [true, false]),
}

function person({first, last, age}) {
  return li(`${first} ${last}, ${age}`)
}

const list = ul()
sortPicker = select(
  option('Sort by first', {value: 'firstSort'}),
  option('Sort by first (desc)', {value: 'firstDescSort'}),
  option('Sort by last, first', {value: 'nameSort'}),
  option('Sort by age (desc), first', {value: 'ageFirst'}),
  option('Sort by age, last (desc)', {value: 'ageLast'}),
  {
    onChange: render,
    value: 'nameSort'
  },
)

function render () {
  list.textContent = ''
  list.append(...people.sort(sorters[sortPicker.value]).map(person))
}

preview.append(
  div(
    sortPicker,
    icons.chevronDown()
  ),
  list
)

render()
```
```css
.preview {
  padding: var(--spacing);
}

.preview div {
  position: absolute;
  top: var(--spacing);
  right: var(--spacing);
}
```

## Details

To create a sort callback that sorts by propA then propB (if propA is tied):

```
const sorter = makeSorter(
  obj => [obj.propA, obj.propB]
)
```

As above, but sort descending:
```
const sorter = makeSorter(
  obj => [obj.propA, obj.propB],
  false
)
```

As above but propA is sorted ascending, propB descending
```
const sorter = makeSorter(
  obj => [obj.propA, obj.propB],
  [true, false]
)
```
*/

/*{ "parent": "Helper Libraries" }*/

export function makeSorter<T>(
  sortValuator: SortValuator<T>,
  ascending: boolean | boolean[] = true
): SortCallback<T> {
  return (p: any, q: any) => {
    const pSort = sortValuator(p)
    const qSort = sortValuator(q)
    for (const i in pSort) {
      if (pSort[i] !== qSort[i]) {
        const isAscending = Array.isArray(ascending)
          ? ascending[i] !== false
          : ascending
        /*
        Deliberately still `>`, not `naturalCompare` — see tosijs-ui#62.

        This has the same lexical-compare defect as the table's comparator, so
        `makeSorter(p => [p.invoiceNumber])` on numeric STRINGS sorts by first digit. But
        swapping in a locale collator also changes CASE ordering: `>` puts 'Zed' before
        'alice' (code-unit order), a collator puts it after, and this module's own tests
        document the former — with a companion lowercase valuator provided precisely
        because callers were expected to opt in to case-insensitivity.

        That is a behaviour change nobody reported, in a general-purpose utility, so it
        wants its own decision rather than riding along with a table fix. Callers who want
        natural ordering today can pass values through `naturalCompare` themselves, or
        coerce numeric strings with `Number()` in the valuator.
        */
        return isAscending
          ? pSort[i] > qSort[i]
            ? 1
            : -1
          : pSort[i] > qSort[i]
          ? -1
          : 1
      }
    }
    return 0
  }
}
