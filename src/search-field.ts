/*#
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
*/

/*{ "parent": "Form Components" }*/

import {
  elements,
  vars,
  varDefault,
  ElementCreator,
  StyleSheet,
  XinStyleSheet,
  withAttributes,
} from 'tosijs'
import { popFloat } from './pop-float.js'
import type { TosiFloat } from './float.js'
import { tosiTag, TosiTag } from './tag.js'
import { icons } from './icons.js'
import { tagColors } from './tag-colors.js'

const { div, input, button } = elements

export interface SearchTag {
  caption: string
  background?: string
  color?: string
  /** What this tag means, as a predicate: used by the field's `filter`. */
  test?: (item: any) => boolean
  [key: string]: unknown
}

export interface SearchHint {
  caption: string
  tag: SearchTag
}

export type SearchHintRule = (
  text: string,
  tags: SearchTag[]
) => SearchHint | SearchHint[] | null | undefined

export interface SearchQuery {
  tags: SearchTag[]
  text: string
}

/*
The hint list floats in <body> (so an overflow:hidden ancestor cannot clip it), which puts it
outside the component and its style sheet. So its styles are a global sheet, injected on first
use — the same arrangement as the tag list's pick menu. The variables are the menu's, so a
theme that restyles menus restyles this too.
*/
let hintStylesInjected = false
function ensureHintStyles(): void {
  if (hintStylesInjected) return
  hintStylesInjected = true
  StyleSheet('tosi-search-hints', {
    '.tosi-search-hints': {
      overflow: 'hidden auto',
      // Scrolling past the end of the list must not scroll the page (and close the list).
      overscrollBehavior: 'contain',
      maxHeight: `calc(${vars.maxHeight} - ${varDefault.menuInset('8px')})`,
      borderRadius: vars.spacing50,
      background: varDefault.menuBg('#fafafa'),
      boxShadow: varDefault.menuShadow(
        `${vars.spacing13} ${vars.spacing50} ${vars.spacing} #0004`
      ),
    },
    '.tosi-search-hints [role="option"]': {
      padding: varDefault.menuItemPadding('0 8px'),
      height: varDefault.menuItemHeight('48px'),
      lineHeight: varDefault.menuItemHeight('48px'),
      color: varDefault.menuItemColor('#222'),
      cursor: 'default',
      whiteSpace: 'nowrap',
    },
    '.tosi-search-hints [role="option"]:hover': {
      background: varDefault.menuItemHoverBg('#eee'),
    },
    '.tosi-search-hints [role="option"][aria-selected="true"]': {
      background: varDefault.menuItemActiveBg('#aaa'),
    },
  })
}

let instanceCount = 0
const SCROLL_OPTIONS = { capture: true, passive: true }

const sameTag = (a: SearchTag, b: SearchTag): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

export class TosiSearchField extends withAttributes({
  placeholder: 'search',
  disabled: false,
}) {
  static preferredTagName = 'tosi-search-field'

  static lightStyleSpec: XinStyleSheet = {
    ':host': {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: vars.spacing25,
      padding: vars.spacing25,
      background: varDefault.inputBg('#fff'),
      borderRadius: varDefault.searchFieldRadius(vars.spacing50),
      boxShadow: varDefault.inputBorderShadow('inset 0 0 2px #0006'),
      cursor: 'text',
    },
    // The inner <input> has no outline of its own, so the FIELD shows focus.
    ':host:focus-within': {
      boxShadow: varDefault.tosiFocusRing(
        `0 0 0 2px ${varDefault.focusColor('#0064d280')}`
      ),
    },
    ':host [part="tags"]': {
      display: 'contents',
    },
    ':host [part="input"]': {
      flex: '1 1 8em',
      minWidth: '4em',
      border: 'none',
      boxShadow: 'none',
      outline: 'none',
      background: 'transparent',
      padding: `0 ${vars.spacing25}`,
    },
    // The field has its own clear button, which clears tags AND text; the browser's ✕ on a
    // search input would clear only the text, and two ✕s that differ is worse than one.
    ':host [part="input"]::-webkit-search-cancel-button': {
      display: 'none',
    },
    ':host [part="clear"]': {
      flex: '0 0 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: vars.spacing25,
      border: 'none',
      boxShadow: 'none',
      background: 'transparent',
      color: 'inherit',
      opacity: varDefault.searchFieldClearOpacity('0.5'),
      cursor: 'default',
    },
    ':host [part="clear"]:hover, :host [part="clear"]:focus-visible': {
      opacity: 1,
    },
    ':host [part="clear"][hidden]': {
      display: 'none',
    },
  }

  hints: SearchHintRule[] = []

  /** How the text left in the field matches an item, for `filter`. Without it, text is ignored. */
  // `null`, not `undefined`: tosijs's element creator sets a prop as a PROPERTY only when the
  // instance's current value is not `undefined`, and otherwise as an attribute — which made
  // `tosiSearchField({ textTest })` store a stringified function and filter nothing.
  textTest: ((item: any, text: string) => boolean) | null = null

  /**
   * The query as an array filter: an item passes if every tag's `test` passes and, when there
   * is text and a `textTest`, the text matches too. Tags without a `test` do not filter.
   * A new function each time the query changes, so hand it to a `<tosi-table>` as it is.
   */
  get filter(): <T>(items: T[]) => T[] {
    // Memoized on the query, so reading `filter` twice without a change hands a table the SAME
    // function and its filter memo holds (#147); a changed query gives a new one.
    const text = this.textValue.trim()
    const memo = this.filterMemo
    if (
      memo &&
      memo.tags === this.tagList &&
      memo.text === text &&
      memo.textTest === this.textTest
    )
      return memo.filter
    const tests = this.tagList
      .map((tag) => tag.test)
      .filter((test): test is (item: any) => boolean => test !== undefined)
    const textTest = text !== '' ? this.textTest : null
    const filter = <T>(items: T[]): T[] =>
      items.filter(
        (item) =>
          tests.every((test) => test(item)) &&
          (textTest === null || textTest(item, text))
      )
    this.filterMemo = {
      tags: this.tagList,
      text,
      textTest: this.textTest,
      filter,
    }
    return filter
  }

  private filterMemo?: {
    tags: SearchTag[]
    text: string
    textTest: TosiSearchField['textTest']
    filter: <T>(items: T[]) => T[]
  }

  // The float can be removed without us (a resize: rotation, the iOS URL bar), so "open" is
  // "our float is still on the page", never merely "we have a reference to one".
  private get hintsOpen(): boolean {
    return this.float?.isConnected === true
  }

  private tagList: SearchTag[] = []
  private textValue = ''
  private listed: SearchHint[] = []
  private active = -1
  private float?: TosiFloat
  private readonly listId = `tosi-search-hints-${++instanceCount}`
  private readonly hintList = div({
    id: this.listId,
    role: 'listbox',
    class: 'tosi-search-hints',
  })

  get value(): SearchQuery {
    return { tags: [...this.tagList], text: this.textValue }
  }
  set value(query: SearchQuery) {
    this.tagList = [...(query?.tags ?? [])]
    this.textValue = query?.text ?? ''
    this.closeHints()
    this.queueRender()
  }

  get hintCount(): number {
    return this.hintsOpen ? this.listed.length : 0
  }

  typeText = (text: string): void => {
    const field = this.parts.input as HTMLInputElement
    field.value = text
    this.textValue = text
    this.updateHints()
    this.syncClear()
  }

  /** Remove every tag and the text. Fires `change` if there was anything to remove. */
  clear = (): void => {
    const hadAnything = this.tagList.length > 0 || this.textValue !== ''
    this.tagList = []
    this.textValue = ''
    if (this.hydrated) this.input().value = ''
    this.closeHints()
    if (hadAnything) this.tagsChanged()
  }

  private input = (): HTMLInputElement => this.parts.input as HTMLInputElement

  private handleInput = (): void => {
    this.textValue = this.input().value
    this.updateHints()
    this.syncClear()
  }

  private handleClear = (): void => {
    this.clear()
    this.input().focus()
  }

  // Shown only when there is something to clear. Called on every text change as well as from
  // render(), because typing does not re-render the component.
  private syncClear(): void {
    if (!this.hydrated) return
    ;(this.parts.clear as HTMLButtonElement).hidden =
      this.disabled || (this.tagList.length === 0 && this.textValue === '')
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    const open = this.hintsOpen
    switch (event.key) {
      case 'ArrowDown':
        if (!open) this.updateHints()
        if (this.listed.length === 0) return
        this.setActive(Math.min(this.active + 1, this.listed.length - 1))
        break
      case 'ArrowUp':
        if (!open) return
        this.setActive(Math.max(this.active - 1, -1))
        break
      case 'Enter':
        if (open && this.active >= 0) {
          this.pick(this.active)
        } else {
          this.closeHints()
          this.dispatchEvent(new Event('action', { bubbles: true }))
        }
        break
      case 'Escape':
        if (open) {
          this.closeHints()
        } else if (this.textValue !== '') {
          this.typeText('')
        } else {
          return
        }
        break
      case 'Backspace': {
        const field = this.input()
        const atStart = field.selectionStart === 0 && field.selectionEnd === 0
        if (!atStart || this.tagList.length === 0) return
        this.tagList = this.tagList.slice(0, -1)
        this.tagsChanged()
        break
      }
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
  }

  private handleBlur = (): void => {
    this.closeHints()
  }

  // Keep focus in the field when a hint is pressed; the click then picks it.
  private handleHintMousedown = (event: Event): void => {
    event.preventDefault()
  }

  private handleHintClick = (event: Event): void => {
    const option = (event.target as HTMLElement).closest('[role="option"]')
    if (option) this.pick(Number(option.getAttribute('data-index')))
  }

  private removeTag = (event: Event): void => {
    event.stopPropagation()
    event.preventDefault()
    if (this.disabled) return
    const chip = (event.target as HTMLElement).closest(TosiTag.tagName!)
    const index = [...(this.parts.tags as HTMLElement).children].indexOf(
      chip as Element
    )
    if (index < 0) return
    this.tagList = this.tagList.filter((_, i) => i !== index)
    this.tagsChanged()
  }

  private focusInput = (event: Event): void => {
    if (event.target === this) this.input().focus()
  }

  content = () => [
    div({ part: 'tags', role: 'list', ariaLabel: 'Search tags' }),
    input({
      part: 'input',
      type: 'search',
      role: 'combobox',
      autocomplete: 'off',
      ariaAutocomplete: 'list',
      ariaExpanded: 'false',
      ariaControls: this.listId,
      onInput: this.handleInput,
      onKeydown: this.handleKeydown,
      onBlur: this.handleBlur,
    }),
    button(
      {
        part: 'clear',
        type: 'button',
        title: 'Clear search',
        ariaLabel: 'Clear search',
        hidden: true,
        onClick: this.handleClear,
      },
      icons.x()
    ),
  ]

  constructor() {
    super()
    this.hintList.addEventListener('mousedown', this.handleHintMousedown)
    this.hintList.addEventListener('click', this.handleHintClick)
    this.addEventListener('click', this.focusInput)
  }

  /*
  `change` is dispatched here, synchronously, not via `queueRender(true)`, which defers it to
  the next animation frame: a listener reading `value` in response to a pick should not depend
  on the page painting (a background tab may never get the frame).
  */
  private tagsChanged(): void {
    this.queueRender()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  private updateHints(): void {
    const text = this.textValue.trim()
    this.listed =
      text === ''
        ? []
        : this.hints.flatMap((rule) => {
            const result = rule(text, [...this.tagList])
            return result == null
              ? []
              : Array.isArray(result)
              ? result
              : [result]
          })
    this.active = -1
    this.hintList.replaceChildren(
      ...this.listed.map((hint, index) =>
        div(
          {
            id: `${this.listId}-${index}`,
            role: 'option',
            ariaSelected: 'false',
            dataIndex: String(index),
          },
          hint.caption
        )
      )
    )
    if (this.listed.length === 0) {
      this.closeHints()
    } else {
      this.openHints()
    }
    this.syncActive()
  }

  private openHints(): void {
    ensureHintStyles()
    this.hintList.style.minWidth = `${this.offsetWidth}px`
    if (!this.hintsOpen) {
      this.float = popFloat({
        content: this.hintList,
        target: this,
        position: 's',
        remainOnScroll: 'remain',
        remainOnResize: 'remove',
      })
      document.addEventListener('scroll', this.handleScroll, SCROLL_OPTIONS)
    }
    this.input().setAttribute('aria-expanded', 'true')
  }

  /*
  Close for a scroll that MOVES the field (the page, or an ancestor), not for any scroll at
  all. A float's own `remainOnScroll: 'remove'` reacts to every scroll in the document, and in
  the obvious use of this component — filtering a table — every keystroke re-filters the table,
  which scrolls it, which closed the hints the moment they opened.
  */
  private handleScroll = (event: Event): void => {
    const target = event.target
    if (
      target === document ||
      (target instanceof Node && target.contains(this))
    )
      this.closeHints()
  }

  private closeHints(): void {
    document.removeEventListener('scroll', this.handleScroll, SCROLL_OPTIONS)
    this.float?.remove()
    this.float = undefined
    this.active = -1
    if (this.hydrated) {
      this.input().setAttribute('aria-expanded', 'false')
      this.input().removeAttribute('aria-activedescendant')
    }
  }

  private setActive(index: number): void {
    this.active = index
    this.syncActive()
  }

  private syncActive(): void {
    const options = [...this.hintList.children] as HTMLElement[]
    options.forEach((option, index) =>
      option.setAttribute('aria-selected', String(index === this.active))
    )
    const current = options[this.active]
    if (current) {
      this.input().setAttribute('aria-activedescendant', current.id)
      current.scrollIntoView({ block: 'nearest' })
    } else {
      this.input().removeAttribute('aria-activedescendant')
    }
  }

  private pick(index: number): void {
    const hint = this.listed[index]
    if (!hint) return
    if (!this.tagList.some((tag) => sameTag(tag, hint.tag))) {
      this.tagList = [...this.tagList, hint.tag]
    }
    this.textValue = ''
    this.input().value = ''
    this.closeHints()
    this.input().focus()
    this.tagsChanged()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.closeHints()
  }

  render(): void {
    super.render()
    const field = this.input()
    if (field.value !== this.textValue) field.value = this.textValue
    field.placeholder = this.tagList.length ? '' : this.placeholder
    field.disabled = this.disabled
    this.syncClear()
    ;(this.parts.tags as HTMLElement).replaceChildren(
      ...this.tagList.map((tag) => {
        const chip = tosiTag({
          caption: tag.caption,
          role: 'listitem',
          removeable: !this.disabled,
          removeCallback: this.removeTag,
        })
        const colors = tagColors(tag)
        if (colors?.background)
          chip.style.setProperty('--tag-bg', colors.background)
        if (colors?.color)
          chip.style.setProperty('--tag-text-color', colors.color)
        return chip
      })
    )
  }
}

export const tosiSearchField =
  TosiSearchField.elementCreator() as ElementCreator<TosiSearchField>
