# splitter

`<tosi-splitter>` goes between two items of a flex container and lets the reader divide the
space they share: drag it, or focus it and use the arrow keys. It works in a row or a column,
reads which from the container, and changes its cursor and orientation to match.

```html
<div class="split-row">
  <section>Left</section>
  <tosi-splitter aria-label="Resize the left pane"></tosi-splitter>
  <section>Right</section>
</div>
<div class="split-column">
  <section>Top</section>
  <tosi-splitter></tosi-splitter>
  <section>Bottom</section>
</div>
```
```css
.preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
}
.split-row, .split-column {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  box-shadow: inset 0 0 0 1px #8884;
}
.split-column {
  flex-direction: column;
}
.preview section {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  padding: 10px;
  overflow: auto;
}
```
```test
const { TosiSplitter } = tosijsui
const splitter = preview.querySelector('.split-row tosi-splitter')
test('a splitter in a row is a vertical separator', () => {
  expect(splitter instanceof TosiSplitter).toBe(true)
  expect(splitter.getAttribute('role')).toBe('separator')
  expect(splitter.getAttribute('aria-orientation')).toBe('vertical')
  expect(
    preview.querySelector('.split-column tosi-splitter').getAttribute('aria-orientation')
  ).toBe('horizontal')
})
test('the arrow keys move it, and it reports a value', () => {
  const left = splitter.previousElementSibling
  const before = left.getBoundingClientRect().width
  splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  const after = left.getBoundingClientRect().width
  expect(Math.round(after - before)).toBe(splitter.step)
  expect(splitter.value > 0.5).toBe(true)
})
```

## Behaviour

- **The space stays shared.** The splitter sets the two neighbours' `flex` to the ratio you
  chose (with a zero basis), not to fixed sizes, so when the container resizes they keep that
  ratio, and a container that switches between row and column keeps it too.
- **Neither side gets too small.** A neighbour never goes below `min-size` (44px by default, a
  comfortable touch target), or below its own `min-width` / `min-height` if that is larger, or
  above its `max-width` / `max-height`. That holds as the container resizes too: when it
  shrinks, the split gives way to keep both neighbours at their minimums, and when it grows
  again the split goes back to where you put it. (A container too small for both minimums
  cannot be helped; the splitter leaves it alone.)
- **Keyboard.** It is focusable (`role="separator"`, with `aria-valuenow` as the first
  neighbour's share in percent). The arrow keys move it by `step` pixels (16 by default; four
  times that with Shift), and Home and End move it as far as it goes each way. Up and Left move
  it towards the start, so Left moves it left even in a right-to-left row.
- **Double-click** puts the neighbours back to the sizes their own styles give them.
- **`value`** is the first neighbour's share of the space the two have, from 0 to 1. Set it to
  divide them in code. A `change` event fires when the reader finishes moving it.

Give it an `aria-label` that says what it resizes; it is "Resize" otherwise.

The neighbours are its previous and next element siblings, so it must sit directly between
them. If they hold content that cannot shrink, give them `min-width: 0` (or `min-height: 0`
in a column): a flex item's automatic minimum is its content's, and the browser will not go
below it whatever the splitter asks.

## Styling

| variable | default | |
| --- | --- | --- |
| `--tosi-splitter-size` | `6px` | the width of the handle (its height, in a column) |
| `--tosi-splitter-color` | `#8884` | the line drawn down its middle |
| `--tosi-splitter-active-color` | the accent | the line while hovered, focused or dragged |

<tosi-css-var-editor element-selector="tosi-splitter"></tosi-css-var-editor>
