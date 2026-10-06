# tag-list

Building a tag-list from standard HTML elements is a bit of a nightmare.

`<tosi-tag-list>` allows you to display an editable or read-only tag list (represented either
as a comma-delimited string or an array of strings).

```html
<label style="position: absolute; right: 10px; top: 10px; display: block">
  <input type="checkbox" class="disable-toggle">
  <b>Disable All</b>
</label>
<label>
  <b>Display Only</b>
  <tosi-tag-list
    value="this,that,,the-other"
  ></tosi-tag-list>
</label>
<tosi-tag-list
  class="compact"
  value="this,that,,the-other"
></tosi-tag-list>
<br>
<label>
  <b>Editable</b>
  <tosi-tag-list
    class="editable-tag-list"
    value="belongs,also belongs,has\, comma,custom"
    editable
    available-tags="belongs,also belongs,has\, comma,not initially chosen"
  ></tosi-tag-list>
</label>
<br>
<b>Text-Entry</b>
<tosi-tag-list
  value="this,that,the-other,not,enough,space"
  editable
  text-entry
  available-tags="tomasina,dick,,harriet"
></tosi-tag-list>
```
```css
.preview .compact {
  --spacing: 8px;
  --font-size: 12px;
  --line-height: 18px;
}
.preview label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
```
```js
preview.addEventListener('change', (event) => {
  if (event.target.matches('tosi-tag-list')) {
    console.log(event.target, event.target.value)
  }
}, true)
preview.querySelector('.disable-toggle').addEventListener('change', (event) => {
  const tagLists = Array.from(preview.querySelectorAll('tosi-tag-list'))
  for(const tagList of tagLists) {
    tagList.disabled = event.target.checked
  }
})
```
```test
const tagLists = preview.querySelectorAll('tosi-tag-list')
test('tag-lists render', () => {
  expect(tagLists.length).toBe(4)
})
test('first tag-list has correct tags', () => {
  expect(tagLists[0].tags.length).toBe(3)
  expect(tagLists[0].tags).toContain('this')
})
test('editable tag-list has editable attribute', () => {
  expect(tagLists[2].editable).toBe(true)
})
test('a comma inside a tag survives the value round-trip', () => {
  const tl = document.createElement('tosi-tag-list')
  tl.tags = ['New York, NY', 'Boston']
  // the literal comma is escaped in `value` so it is not a delimiter
  expect(tl.value).toBe('New York\\, NY,Boston')
  expect(tl.tags.length).toBe(2)
  expect(tl.tags).toContain('New York, NY')
})
test('an escaped comma in a value string parses as one tag', () => {
  const tl = document.createElement('tosi-tag-list')
  tl.value = 'New York\\, NY,Boston'
  expect(tl.tags.length).toBe(2)
  expect(tl.tags).toContain('New York, NY')
})
```

## Properties

### `value`: string | string[]

A comma-delimited list of tags. A tag that itself contains a comma must
escape it as `\,` — e.g. `value="New York\, NY,Boston"` is two tags. The
`tags` accessor handles this escaping for you in both directions.

### `tags`: string[]

A read-only property giving the value as an array.

## `popSelectMenu`: () => void

This is the method called when the user clicks the menu button. By default it displays a
pick list of tags, but if you wish to customize the behavior, just replace this method — at
any time, including after the element is on the page.

### `available-tags`: string | string[]

A list of tags that will be displayed in the popup menu by default. The popup menu
will always display custom tags (allowing their removal). As with `value`, a
comma inside a tag must be escaped as `\,` when set via the attribute string.

Set as a property, entries may also be **Tag objects**: `{ value, caption?, background?, color? }`.
A tag with a `background` gets it on its chip and as a lozenge behind its caption in the pick
menu (the checkmark keeps its own place). Without a `color`, the text is black or white,
whichever contrasts more with the background.

```js
import { tosiTagList } from 'tosijs-ui'

preview.append(
  tosiTagList({
    editable: true,
    value: ['bug', 'docs'],
    availableTags: [
      { value: 'bug', background: '#d32f2f' },
      { value: 'feature', background: '#2e7d32' },
      { value: 'docs', background: '#1565c0', color: '#ffeb3b' },
      'question',
    ],
  })
)
```
```test
test('coloured tags colour their chips', () => {
  // render now rather than wait for a frame: a background test tab may never paint
  preview.querySelector('tosi-tag-list').render()
  const chips = [...preview.querySelectorAll('tosi-tag-list tosi-tag')]
  expect(chips.length).toBe(2)
  expect(chips[0].style.getPropertyValue('--tag-bg')).toBe('#d32f2f')
  expect(getComputedStyle(chips[1]).color).toBe('rgb(255, 235, 59)')
})
```

### `editable`: boolean

Allows the tag list to be modified via menu and removing tags.

### `text-entry`: boolean

If `editable`, an input field is provided for entering tags directly.

### `placeholder`: string = 'enter tags'

Placeholder shown on input field.
