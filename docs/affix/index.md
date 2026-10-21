# affix

`<tosi-affix>` fixes a **fixture** — a toolbar, a badge, a caption — to one edge of its
**content**. Put the content in the default slot and the fixture in `slot="fixture"`:

```html
<div class="affix-demo">
  <tosi-affix position="en">
    <div class="affix-content">Content</div>
    <button slot="fixture" title="Edit"><tosi-icon icon="edit"></tosi-icon></button>
    <button slot="fixture" title="Copy"><tosi-icon icon="copy"></tosi-icon></button>
    <button slot="fixture" title="Delete"><tosi-icon icon="trash"></tosi-icon></button>
  </tosi-affix>

  <tosi-affix position="s">
    <div class="affix-content">Content</div>
    <span slot="fixture">a caption, centred below</span>
  </tosi-affix>

  <tosi-affix position="ne" inside>
    <div class="affix-content">Content</div>
    <button slot="fixture" title="Close"><tosi-icon icon="x"></tosi-icon></button>
  </tosi-affix>
</div>
```
```css
.preview .affix-demo {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  align-items: flex-start;
}
.preview .affix-content {
  display: grid;
  place-items: center;
  width: 160px;
  height: 120px;
  background: #8882;
}
.preview .affix-demo button {
  border: 0;
  padding: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
```

An **outside** fixture (the default) is laid out, not floated: the affix is a three-by-three
grid with the content in the middle, and the fixture takes the cell on its edge. So it can
never cover the content, and an ancestor's `overflow: hidden` cannot clip it. An **inside**
fixture shares the content's cell and sits over it.

## Position

`position` uses the [`FloatPosition`](/pop-float/) vocabulary: the first letter is the
**edge**, the second the **alignment** along it.

| position | edge | aligned |
|---|---|---|
| `n` `s` `e` `w` | that edge | centred |
| `nw` `ne` | top | left / right |
| `sw` `se` | bottom | left / right |
| `en` `es` | right | top / bottom |
| `wn` `ws` | left | top / bottom |

The default is `nw`. Add `inside` to put the fixture inside the content's bounds.

## Fallback

A fixture that is longer than the edge it sits on does not fit there: a column of five
buttons beside a preview forty pixels tall. `fallback` names where it goes instead, with
`inside` if it should go inside (`fallback="s inside"`). It goes back as soon as it fits.

## Where it actually is

**Setting `position` or `inside` sets where you WANT the fixture; reading them tells you where
it IS** — the fallback, when the wanted place does not fit. Whenever that changes the affix
fires a `reposition` event, whose `detail` is `{ position, inside }`, and it reflects the
placement as the `placed` attribute (`placed="s inside"`) for styling.

```html
<tosi-affix class="affix-resizable" position="en" fallback="s inside">
  <div class="affix-content">Drag the corner to shrink me</div>
  <button slot="fixture" title="Edit"><tosi-icon icon="edit"></tosi-icon></button>
  <button slot="fixture" title="Copy"><tosi-icon icon="copy"></tosi-icon></button>
  <button slot="fixture" title="Cut"><tosi-icon icon="scissors"></tosi-icon></button>
  <button slot="fixture" title="Delete"><tosi-icon icon="trash"></tosi-icon></button>
</tosi-affix>
<p class="affix-readout"></p>
```
```css
.preview .affix-resizable .affix-content {
  display: grid;
  place-items: center;
  width: 240px;
  height: 160px;
  min-height: 40px;
  resize: vertical;
  overflow: hidden;
  background: #8882;
}
.preview .affix-resizable button {
  border: 0;
  padding: 4px;
  background: transparent;
  color: inherit;
}
```
```js
const affix = preview.querySelector('.affix-resizable')
const readout = preview.querySelector('.affix-readout')
const show = () => {
  readout.textContent = `position: ${affix.position}, inside: ${affix.inside}`
}
affix.addEventListener('reposition', show)
show()
```

## Styling

The fixture slot is a flex box — a column on a side edge, a row on the top or bottom — with
the theme's inset background, spacing, and its outer corners rounded, so a few buttons look
right with no work. Override it with these variables:

- `--tosi-affix-bg` (default `--tosi-bg-inset`)
- `--tosi-affix-gap` and `--tosi-affix-padding` (default `--tosi-spacing-xs`)
- `--tosi-affix-radius` (default `--tosi-border-radius`)

or restyle it entirely with `tosi-affix::part(fixture)`; the content's cell is
`::part(content)`. A fixture that is a single wrapper element can follow the axis with
`flex-direction: var(--tosi-affix-direction)`, which the affix sets to `column` or `row`.
