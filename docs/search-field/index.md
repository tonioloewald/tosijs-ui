# search-field

`<tosi-search-field>` is a search box that suggests **refinements** as you type, in the
spirit of Finder's search field and a search engine's power-search operators. Type `doc`
and it offers *the text "doc"* or *Word documents*; pick one and it becomes a **tag** in the
query, consuming what you typed. You can keep typing, so a query is a list of tags plus
whatever text is left in the field.

What gets suggested is up to you: `hints` is a list of **rules**, each a function from the
typed text (and the tags already chosen) to zero or more hints. Every rule runs on each
keystroke and their hints are listed in rule order.

```js
import { tosiSearchField } from 'tosijs-ui'

const kinds = [
  { caption: 'Word documents', match: 'documents', ext: 'docx', background: '#1565c0' },
  { caption: 'Images', match: 'images pictures photos', ext: 'png', background: '#2e7d32' },
  { caption: 'PDFs', match: 'pdf portable', ext: 'pdf', background: '#c62828' },
]

const field = tosiSearchField({
  placeholder: 'Search files',
  hints: [
    // always offer the text itself
    (text) => ({
      caption: `Name contains “${text}”`,
      tag: { caption: `“${text}”`, kind: 'text', value: text },
    }),
    // offer a kind when the text starts one of its words
    (text) =>
      kinds
        .filter((k) => k.match.split(' ').some((w) => w.startsWith(text.toLowerCase())))
        .map((k) => ({
          caption: `Kind is ${k.caption}`,
          tag: { caption: k.caption, kind: 'type', value: k.ext, background: k.background },
        })),
    // "today" / "yesterday" become a date tag
    (text) =>
      ['today', 'yesterday']
        .filter((d) => d.startsWith(text.toLowerCase()))
        .map((d) => ({
          caption: `Modified ${d}`,
          tag: { caption: `Modified ${d}`, kind: 'date', value: d, background: '#6a1b9a' },
        })),
  ],
})

const output = document.createElement('pre')
const show = () => {
  output.textContent = JSON.stringify(field.value, null, 2)
}
field.addEventListener('change', show)
field.addEventListener('input', show)
field.addEventListener('action', () => {
  output.textContent = 'search! ' + JSON.stringify(field.value)
})
show()
preview.append(field, output)
```
```css
.preview tosi-search-field {
  margin-right: var(--touch-size, 44px);
}
```
```test
test('typing discloses hints; picking one makes a tag and consumes the text', async () => {
  const field = preview.querySelector('tosi-search-field')
  await field.whenHydrated
  let changes = 0
  field.addEventListener('change', () => (changes += 1))
  field.typeText('doc')
  expect(field.hintCount).toBe(2)
  const input = field.querySelector('input')
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(field.value.tags.map((t) => t.value)).toEqual(['docx'])
  expect(field.value.text).toBe('')
  expect(field.hintCount).toBe(0)
  expect(changes).toBe(1)

  field.typeText('tod')
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(field.value.tags.map((t) => t.kind)).toEqual(['type', 'date'])

  // Backspace in an empty field removes the last tag
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
  expect(field.value.tags.length).toBe(1)
  expect(changes).toBe(3)
  field.value = { tags: [], text: '' }
})
test('the clear button clears tags and text', async () => {
  const field = preview.querySelector('tosi-search-field')
  await field.whenHydrated
  field.value = { tags: [{ caption: 'PDFs', kind: 'type', value: 'pdf' }], text: 'q' }
  field.render()
  const clear = field.querySelector('[part="clear"]')
  expect(clear.hidden).toBe(false)
  clear.click()
  expect(field.value).toEqual({ tags: [], text: '' })
})
test('Enter with no hint highlighted is an action, not a tag', async () => {
  const field = preview.querySelector('tosi-search-field')
  await field.whenHydrated
  let actions = 0
  field.addEventListener('action', () => (actions += 1))
  field.typeText('report')
  field
    .querySelector('input')
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(actions).toBe(1)
  expect(field.value).toEqual({ tags: [], text: 'report' })
  field.value = { tags: [], text: '' }
})
```

## As a filter

Give each tag a `test(item)`, and a `textTest` for the text left in the field, and the
field's `filter` is ready to hand to a `<tosi-table>`. Here it filters 3,655 emoji: type
`food`, `flag` or `cat`, and pick a category or subcategory, or just keep typing to match
names.

(Both examples leave room at the field's right end, where the example's own toolbar floats;
otherwise it covers the clear button.)

```js
import { tosiSearchField, tosiTable } from 'tosijs-ui'
import { div } from 'tosijs'.elements

const emojiRequest = await fetch('https://raw.githubusercontent.com/tonioloewald/emoji-metadata/master/emoji-metadata.json')
const emojiData = await emojiRequest.json()

const unique = (prop) => [...new Set(emojiData.map((emoji) => emoji[prop]))]
const categories = unique('category')
const subcategories = unique('subcategory')
// does `text` start any word of `label`? ("dri" matches "Food & Drink")
const startsAWord = (label, text) =>
  label.toLowerCase().split(/[^a-z0-9]+/).some((word) => word.startsWith(text.toLowerCase()))

const field = tosiSearchField({
  placeholder: 'Filter emoji',
  textTest: (emoji, text) => emoji.name.includes(text.toLowerCase()),
  hints: [
    (text) => ({
      caption: `Name contains “${text}”`,
      tag: { caption: `“${text}”`, test: (emoji) => emoji.name.includes(text.toLowerCase()) },
    }),
    (text) =>
      categories
        .filter((category) => startsAWord(category, text))
        .map((category) => ({
          caption: `Category: ${category}`,
          tag: { caption: category, background: '#1565c0', test: (emoji) => emoji.category === category },
        })),
    (text) =>
      subcategories
        .filter((subcategory) => startsAWord(subcategory, text))
        .slice(0, 6)
        .map((subcategory) => ({
          caption: `Subcategory: ${subcategory}`,
          tag: { caption: subcategory, background: '#2e7d32', test: (emoji) => emoji.subcategory === subcategory },
        })),
  ],
})

const table = tosiTable({
  array: emojiData,
  rowHeight: 40,
  columns: [
    { prop: 'chars', name: 'emoji', width: 80, align: 'center', sort: false },
    { prop: 'name', width: 300 },
    { prop: 'category', width: 150 },
    { prop: 'subcategory', width: 150 },
  ],
})

const applyFilter = () => {
  table.filter = field.filter
}
field.addEventListener('change', applyFilter)
field.addEventListener('input', applyFilter)

preview.append(div({ class: 'emoji-search' }, field, table))
```
```css
.preview .emoji-search {
  display: flex;
  flex-direction: column;
  gap: var(--spacing, 8px);
  height: 100%;
}

.preview .emoji-search tosi-search-field {
  margin-right: var(--touch-size, 44px);
}

.preview .emoji-search tosi-table {
  flex: 1 1 auto;
  min-height: 0;
}
```
```test
test('the field filters the table', async () => {
  const field = preview.querySelector('tosi-search-field')
  const table = preview.querySelector('.emoji-search tosi-table')
  await field.whenHydrated
  const all = table.array.length
  field.typeText('food')
  const input = field.querySelector('input')
  const key = (k) => input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
  key('ArrowDown')
  key('ArrowDown')
  key('Enter')
  expect(field.value.tags.map((t) => t.caption)).toEqual(['Food & Drink'])
  const food = field.filter(table.array)
  expect(food.length).toBeGreaterThan(0)
  expect(food.length).toBeLessThan(all)
  expect(food.every((emoji) => emoji.category === 'Food & Drink')).toBe(true)
  field.typeText('apple')
  const apples = field.filter(table.array)
  expect(apples.length).toBeGreaterThan(0)
  expect(apples.every((emoji) => emoji.name.includes('apple'))).toBe(true)
  field.clear()
  expect(field.filter(table.array).length).toBe(all)
})
```

## Properties

### `hints`: SearchHintRule[]

The rules. A rule is `(text, tags) => SearchHint | SearchHint[] | null | undefined`, called
with the trimmed text whenever it changes (rules are not called for empty text). A
`SearchHint` is `{ caption, tag }`: `caption` is the row in the list, `tag` is what picking
it adds to the query.

### `value`: `{ tags: SearchTag[], text: string }`

The query. A `SearchTag` is `{ caption, background?, color?, …anything }`: the chip shows
`caption`, coloured like `<tosi-tag-list>` chips (given only a `background`, the text is
black or white, whichever contrasts more), and everything else is yours to interpret —
`kind`, `value`, a field name, an operator. A tag may carry a `test(item)` predicate, which
is what `filter` uses.

### `filter`: `(items) => items`

The query as an array filter, for filtering a list or a `<tosi-table>`: an item passes when
every tag's `test` passes and, if there is text left in the field, `textTest(item, text)`.
Tags without a `test`, and text without a `textTest`, don't filter anything.

### `textTest`: `(item, text) => boolean`

How the typed text matches an item, for `filter`.

### `placeholder`: string = 'search'

Shown while the field has no tags and no text.

### `disabled`: boolean

## Events

- `change` — the tags changed (a hint was picked, a tag removed, or the field cleared).
- `input` — the text changed (the native event from the inner `<input>`).
- `action` — Enter was pressed with no hint highlighted: "search now".

## Keyboard

Focus stays in the text field throughout; the hints are a listbox it controls.

| key | does |
|---|---|
| ↓ / ↑ | highlight the next / previous hint (↑ from the first returns to the text) |
| Enter | pick the highlighted hint, or fire `action` if none is highlighted |
| Escape | close the hints; pressed again, clear the text |
| Backspace | in an empty field, remove the last tag |

## Methods

### `clear()`

Remove every tag and the text, as the field's ✕ button does. The button appears whenever
there is something to clear.

### `typeText(text: string)`

Put `text` in the field as if it had been typed, and update the hints. For tests and
scripted demos.

### `hintCount`: number

How many hints are currently listed (0 when the list is closed).
