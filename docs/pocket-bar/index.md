# pocket bar

A **pocket toolbar**: a single icon at rest that expands into a bar of your controls
on hover or tap, then tucks away again. It's translucent until you touch it, so it
stays out of the way when pinned over content.

Whatever you put inside is the toolbar — they're your light-DOM children, so *any*
control works: buttons, a checkbox, a segmented control. The component only supplies
the handle, the reveal, and the positioning.

Hover (or focus, or tap) peeks it open; **click the handle to keep it open**, and
click the handle again — or anywhere outside — to dismiss it.

```html
<div class="pocket-demo">
  <tosi-pocket-bar direction="e">
    <button title="Cut"><tosi-icon icon="scissors"></tosi-icon></button>
    <button title="Copy"><tosi-icon icon="copy"></tosi-icon></button>
    <button title="Paste"><tosi-icon icon="clipboard"></tosi-icon></button>
  </tosi-pocket-bar>

  <tosi-pocket-bar direction="s">
    <button title="Bold"><tosi-icon icon="bold"></tosi-icon></button>
    <button title="Italic"><tosi-icon icon="italic"></tosi-icon></button>
    <button title="Underline"><tosi-icon icon="underline"></tosi-icon></button>
  </tosi-pocket-bar>

  <tosi-pocket-bar direction="w">
    <button title="Zoom in"><tosi-icon icon="zoomIn"></tosi-icon></button>
    <button title="Zoom out"><tosi-icon icon="zoomOut"></tosi-icon></button>
  </tosi-pocket-bar>

  <tosi-pocket-bar direction="n" icon="settings">
    <label title="Snap to grid"><input type="checkbox" checked /><tosi-icon icon="grid"></tosi-icon></label>
    <button title="Undo"><tosi-icon icon="cornerUpLeft"></tosi-icon></button>
    <button title="Redo"><tosi-icon icon="cornerUpRight"></tosi-icon></button>
  </tosi-pocket-bar>
</div>
```
```css
.preview .pocket-demo {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 260px;
  padding: 60px 20px;
}
.preview .pocket-demo tosi-pocket-bar button,
.preview .pocket-demo tosi-pocket-bar label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.preview .pocket-demo tosi-pocket-bar button:hover,
.preview .pocket-demo tosi-pocket-bar label:hover {
  background: #8882;
}
```

Each handle above hints its axis — `⋯` for the horizontal bars (`e`, `w`), `⋮` for the
vertical ones (`n`, `s`) — and the fourth uses an explicit `settings` icon. Hover any of
them to see the bar grow in its `direction`.

## Attributes

- `icon` — the handle icon (any icon name or [composition](icon-composition)). By
  default it hints the growth axis: `moreHorizontal` (⋯) for a horizontal bar,
  `moreVertical` (⋮) for a vertical one.
- `direction` — where the bar grows, using the `FloatPosition` vocabulary
  (`n | e | s | w | ne | nw | se | sw | en | wn | es | ws | side | auto`). `auto`
  (the default) grows a **horizontal** bar toward the nearer edge of the screen.
  `e` / `w` (and `en` / `es` / `wn` / `ws`) grow a horizontal bar; `n` / `s` (and
  `ne` / `nw` / `se` / `sw`) grow a **vertical** one. The bar is placed
  edge-contiguous with the handle via [positionFloat](popFloat).
- `open` — reflects the open state. Hover / focus / tap peek it open; clicking the
  handle keeps it open until you click the handle again or click outside.

The handle is slightly translucent at rest (`--tosi-pocket-opacity`, default `0.75`)
and opaque while open; it keeps a blurred glass chip (`--tosi-pocket-bg`, a translucent
tint of `--tosi-bg`, so it follows the theme) so it stays legible over busy content.

### Styling hooks

- `--tosi-pocket-opacity` — resting opacity of the whole widget (default `0.75`).
- `--tosi-pocket-bg` — the glass background (a translucent tint of `--tosi-bg`).
- `--tosi-pocket-handle-color` — colour of just the collapsed handle icon, independent
  of the bar's controls (e.g. to flag status on the handle alone). Default `inherit`.
- `--tosi-pocket-handle-bg` — the handle's chip, independent of the bar's glass. Defaults
  to `--tosi-pocket-bg`, so setting nothing looks exactly as before.
- `--tosi-pocket-handle-radius` — default `--tosi-spacing`; `50%` for a badge.
- `--tosi-pocket-handle-size` — default `auto` (content-sized). Set it to square the
  handle, which is what a `50%` radius needs to read as a circle rather than an ellipse.

Slotted `<button>`s and `<label>`s get flat icon-button styling by default. A
checkbox-as-icon — a `<label>` wrapping an `<input type=checkbox>` and an icon — greys
and desaturates until checked, so a toggle needs no extra CSS.
