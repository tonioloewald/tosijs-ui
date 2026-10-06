# trackDrag

Sometimes you want to track a mouse-drag or touch-drag operation without messing around.
This is how the resizeable columns in `<tosi-table>` work.

Just call `trackDrag(event, (dx, dy, event) => { ... })` and you'll get updates on corresponding events until
you return `true` from the event-handler (or, in the case of `touch` events, the last `touch` ends).
For mouse events, a "tracker" element is thrown up in front of everything for the event.

```html
<p>
  Try dragging the squares…<br>
  (You can drag them separately with multi-touch!)
</p>
<div class="draggable" style="top: 20px; left: 40px; background: #f008"></div>
<div class="draggable" style="left: 40%; bottom: 30%; background: #0f08"></div>
<div class="draggable" style="bottom: 30px; right: 10px; background: #00f8"></div>
```
```css
.preview {
  touch-action: none;
}

.draggable {
  content: ' ';
  position: absolute;
  width: 50px;
  height: 50px;
  cursor: move;
}

.preview p {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
}
```
```js
import { trackDrag } from 'tosijs-ui'

function dragItem(event) {
  const draggable = event.target
  if (draggable.classList.contains('draggable')) {
    const x = draggable.offsetLeft
    const y = draggable.offsetTop
    trackDrag(event, (dx, dy, event) => {
      draggable.style.left = (x + dx) + 'px'
      draggable.style.top = (y + dy) + 'px'
      draggable.style.bottom = 'auto'
      draggable.style.right = 'auto'
      return event.type === 'mouseup'
    })
  }
}

preview.addEventListener('mousedown', dragItem )
preview.addEventListener('touchstart', dragItem, { passive: true } )
```

For `touch` events, `dx` and `dy` are based on tracking `event.changedTouches[0]` which
is almost certainly what you want.

To handle multi-touch gestures you will need to track the touches yourself.

## Do not register your `mousedown` listener as `passive`

Note the example above: `mousedown` is added **without** options, `touchstart` **with**
`{ passive: true }`. That asymmetry is load-bearing, not an oversight.

`trackDrag` calls `preventDefault()` on the mousedown that starts a drag, and **a passive
listener makes that a silent no-op** — no error, no warning, it simply does nothing. Without it,
Firefox treats the first drag on a freshly-loaded page as a text selection: what you grabbed
stays put, text highlights instead, and it only behaves after you have clicked somewhere to
settle Firefox's selection state. Landing on a page and immediately dragging something is an
entirely ordinary thing to do, so in practice the first attempt fails.

This bit every draggable in this library — `<tosi-sizer>`, `<tosi-float>`,
`<tosi-editable-rect>` and `<tosi-table>`'s column resize — from v0.5.1 until 1.12.2. Three of
them had passive `mousedown` listeners, so fixing `trackDrag` alone changed nothing for them;
`<tosi-table>`, whose listener was never passive, was fixed by the same change. If you use
`trackDrag` in your own component and dragging misbehaves on Firefox, this is the first thing
to check.

Nothing is lost by dropping `passive` on `mousedown`. Its practical value is silencing the
console warning about handlers that delay scrolling, and that warning only ever applied to
`touch` and `wheel` — keep it on `touchstart`, where `trackDrag` handles the equivalent on
`touchmove`.

## bringToFront

`bringToFront(element: HTMLElement, selector = 'body *')`  gives the element the highest
`z-index` of any element matching the selector (which is passed to findHighestZ).

## findHighestZ

`findHighestZ(selector = 'body *'): number` returns the the highest `z-index` of any element
matching `selector`.
