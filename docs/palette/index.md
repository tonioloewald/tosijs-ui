# palette

`<tosi-palette>` looks like a small search field. Click it (or press its shortcut) and it
opens a centred modal: a query field on top, ranked results below, and the keys to drive it
along the bottom. It is the "command palette" pattern, for search, navigation, or anything else
you can turn a query into a list of things to pick.

Results come from **sources**: functions from the query to a list of results, or a promise of
one. A slow source shows a spinner and never holds up the fast ones; one that takes longer than
`timeout` milliseconds (10 seconds by default) is abandoned and says so. Each keystroke aborts
the previous search's sources through the `signal` they are given.

Rows can be different kinds of thing: a result's `kind` picks a **renderer** for it, and any
kind without one gets the default row (an icon, the title with the query highlighted, a
one-line description and a path). Results are ranked by `score` and grouped by `group`; set
`rank` to order them yourself. With nothing typed, `quickLinks` are listed instead.

Choosing a result fires `action` (with the result as `event.detail`) and calls the result's own
`action`, then closes the palette, unless that `action` returns `false`.

```js
import { tosiPalette, postNotification } from 'tosijs-ui'

const fruit = ['Apple', 'Apricot', 'Banana', 'Blackberry', 'Cherry', 'Grape', 'Mango', 'Orange']

const palette = tosiPalette({
  placeholder: 'Search fruit and colours',
  shortcut: 'mod+k',
  quickLinks: [
    { title: 'Apple', description: 'A quick link, shown before you type', icon: 'star' },
    { title: 'Cherry', icon: 'star' },
  ],
  sources: [
    // a plain function: answers at once
    (query) =>
      fruit
        .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
        .map((name) => ({
          title: name,
          description: `${name} is a fruit`,
          path: `fruit/${name.toLowerCase()}`,
          icon: 'heart',
          group: 'Fruit',
          score: name.toLowerCase().startsWith(query.toLowerCase()) ? 2 : 1,
        })),
    // an async function: the palette shows a spinner until it answers
    async (query, { signal }) => {
      await new Promise((resolve) => setTimeout(resolve, 600))
      if (signal.aborted) return []
      return ['red', 'green', 'blue']
        .filter((colour) => colour.includes(query.toLowerCase()))
        .map((colour) => ({
          title: colour,
          kind: 'colour',
          group: 'Colours (slow source)',
          colour,
        }))
    },
  ],
  // a renderer for one kind of row
  renderers: {
    colour: (result) => {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;align-items:center;gap:8px'
      const swatch = document.createElement('span')
      swatch.style.cssText = `width:16px;height:16px;border-radius:4px;background:${result.colour}`
      row.append(swatch, result.title)
      return row
    },
  },
})
palette.addEventListener('action', (event) => {
  postNotification({ message: `You chose ${event.detail.title}`, duration: 2 })
})
preview.append(palette)
```
```test
test('opens a centred modal, ranks results and closes on a choice', async () => {
  const palette = preview.querySelector('tosi-palette')
  palette.open()
  const dialog = palette.querySelector('dialog')
  expect(dialog.open).toBe(true)
  palette.search('ap')
  const titles = [...palette.querySelectorAll('[role="option"]')].map((o) => o.textContent)
  expect(titles[0]).toContain('Apple')
  expect(titles.some((t) => t.includes('Grape'))).toBe(true)
  palette.close()
  expect(dialog.open).toBe(false)
})
```

## Properties

- `placeholder` — the hint in the field, and in the trigger.
- `shortcut` — a key that opens it from anywhere on the page, such as `mod+k` (`mod` is ⌘ on a
  Mac and Ctrl elsewhere). Empty by default: a page decides whether it wants a global shortcut.
- `multiline` — the query is a growing text box: Enter chooses, Shift+Enter starts a new line,
  and ↑/↓ move through results only from the first or last line. For a prompt rather than a
  search.
- `timeout` — milliseconds before a slow source is abandoned (default 10000).
- `sources`, `renderers`, `rank`, `quickLinks` — described above.
- `value` — the query.

`open()`, `close()` and `search(query)` drive it from code. Pressing Enter with no result
chosen fires `action` with `{ query }` as its detail, so a multiline prompt can be submitted.

```typescript
interface PaletteResult {
  title: string
  description?: string
  path?: string
  icon?: string | Element // an icon name, or an element
  kind?: string           // picks a renderer
  group?: string
  score?: number          // higher first
  action?: (result: PaletteResult, palette: TosiPalette) => void | boolean
}
```
