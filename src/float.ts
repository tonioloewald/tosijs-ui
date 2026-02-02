/*#
# float

A floating, potentially draggable user interface element.

```html
<xin-float class="float" remain-on-resize="remain" remain-on-scroll="remain" drag>
  <h4>Drag Me</h4>
  <div class="no-drag balloon">🎈</div>
  <div class="behavior">I ignore resizing and scrolling</div>
  <footer style="font-size: 75%">neunundneunzig pixel-ballon</footer>
</xin-float>

<xin-float class="float" remain-on-scroll="remain" style="top: 50px; right: 20px;" drag>
  <h4>Drag Me</h4>
  <div class="no-drag balloon">🎈</div>
  <div class="behavior">I disappear on resize</div>
  <footer style="font-size: 75%">neunundneunzig pixel-ballon</footer>
</xin-float>

<xin-float class="float" remain-on-resize="remain" remain-on-scroll="remove" style="bottom: 20px; left: 50px;" drag>
  <h4>Drag Me</h4>
  <div class="no-drag balloon">🎈</div>
  <div class="behavior">I disappear on scroll</div>
  <footer style="font-size: 75%">neunundneunzig pixel-ballon</footer>
</xin-float>
```
```css
.preview .float {
  width: 220px;
  height: 180px;
  padding: 0;
  gap: 5px;
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  background: #fff8;
  box-shadow: 2px 10px 20px #0004;
  overflow: hidden;
  cursor: move;
}

.preview h4 {
  margin: 0;
  padding: 5px 10px;
  color: white;
  background: red;
}

.preview .balloon {
  cursor: default;
  flex: 1 1 auto;
  font-size: 99px;
  line-height: 120px;
  text-align: center;
  height: auto;
  overflow: hidden;
}

.preview .behavior {
  position: absolute;
  bottom: 16px;
  left: 8px;
  right: 8px;
  background: #fffc;
}

.preview footer {
  text-align: center;
  background: #f008;
  color: white;
```

## Styling

Note that the `<xin-float>` element has absolutely minimal styling. It's up to you to provide a drop
shadow and background and so on.

## Attributes

- `drag` false | true — to make a `<xin-float>` element draggable, simply set its `drag` attribute.
- `remain-on-resize` 'remove' | 'hide' | 'remain' — by default, floats will hide if the window is resized
- `remain-on-scroll` 'remain' | 'remove' | 'hide' — by default, floats will remain if the document is scrolled

Note that `remain-on-scroll` behavior applies to any scrolling in the document (including within the float) so
if you want finer-grained disappearing behavior triggered by scrolling, you might want to implement it yourself.

To prevent dragging for an interior element (e.g. if you want a floating palette with buttons or input fields)
just add the `no-drag` class to an element or its container.
*/

import { Component as WebComponent, elements, ElementCreator } from 'tosijs'
import { trackDrag, bringToFront } from './track-drag'

const { slot } = elements

export class XinFloat extends WebComponent {
  static floats: Set<XinFloat> = new Set()

  static initAttributes = {
    drag: false,
    remainOnResize: 'remove' as 'hide' | 'remove' | 'remain',
    remainOnScroll: 'remain' as 'hide' | 'remove' | 'remain',
  }

  content = slot()

  static styleSpec = {
    ':host': {
      position: 'fixed',
    },
  }

  reposition = (event: Event) => {
    const target = event.target as HTMLElement | null
    if (target?.closest('.no-drag')) {
      return
    }
    if (this.drag) {
      bringToFront(this)
      const x = this.offsetLeft
      const y = this.offsetTop

      trackDrag(
        event as PointerEvent,
        (
          dx: number,
          dy: number,
          pointerEvent: PointerEvent
        ): true | undefined => {
          this.style.left = `${x + dx}px`
          this.style.top = `${y + dy}px`
          this.style.right = 'auto'
          this.style.bottom = 'auto'
          if (pointerEvent.type === 'mouseup') {
            return true
          }
        }
      )
    }
  }

  connectedCallback(): void {
    super.connectedCallback()

    XinFloat.floats.add(this)
    const PASSIVE = { passive: true }
    this.addEventListener('touchstart', this.reposition, PASSIVE)
    this.addEventListener('mousedown', this.reposition, PASSIVE)
    bringToFront(this)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    XinFloat.floats.delete(this)
  }
}

export const xinFloat = XinFloat.elementCreator({
  tag: 'xin-float',
}) as ElementCreator<XinFloat>

window.addEventListener(
  'resize',
  () => {
    Array.from(XinFloat.floats).forEach((float: XinFloat) => {
      if (float.remainOnResize === 'hide') {
        float.hidden = true
      } else if (float.remainOnResize === 'remove') {
        float.remove()
      }
    })
  },
  { passive: true }
)

document.addEventListener(
  'scroll',
  (event: Event) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest(XinFloat.tagName as string)
    ) {
      return
    }
    Array.from(XinFloat.floats).forEach((float: XinFloat) => {
      if (float.remainOnScroll === 'hide') {
        float.hidden = true
      } else if (float.remainOnScroll === 'remove') {
        float.remove()
      }
    })
  },
  { passive: true, capture: true }
)
