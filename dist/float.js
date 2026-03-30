/*#
# float

A floating, potentially draggable user interface element.

```html
<tosi-float class="float" remain-on-resize="remain" remain-on-scroll="remain" drag>
  <h4>Drag Me</h4>
  <div class="no-drag balloon">🎈</div>
  <div class="behavior">I ignore resizing and scrolling</div>
  <footer style="font-size: 75%">neunundneunzig pixel-ballon</footer>
</tosi-float>

<tosi-float class="float" remain-on-scroll="remain" style="top: 50px; right: 20px;" drag>
  <h4>Drag Me</h4>
  <div class="no-drag balloon">🎈</div>
  <div class="behavior">I disappear on resize</div>
  <footer style="font-size: 75%">neunundneunzig pixel-ballon</footer>
</tosi-float>

<tosi-float class="float" remain-on-resize="remain" remain-on-scroll="remove" style="bottom: 20px; left: 50px;" drag>
  <h4>Drag Me</h4>
  <div class="no-drag balloon">🎈</div>
  <div class="behavior">I disappear on scroll</div>
  <footer style="font-size: 75%">neunundneunzig pixel-ballon</footer>
</tosi-float>
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

Note that the `<tosi-float>` element has absolutely minimal styling. It's up to you to provide a drop
shadow and background and so on.

## Attributes

- `drag` false | true — to make a `<tosi-float>` element draggable, simply set its `drag` attribute.
- `remain-on-resize` 'remove' | 'hide' | 'remain' — by default, floats will hide if the window is resized
- `remain-on-scroll` 'remain' | 'remove' | 'hide' — by default, floats will remain if the document is scrolled

Note that `remain-on-scroll` behavior applies to any scrolling in the document (including within the float) so
if you want finer-grained disappearing behavior triggered by scrolling, you might want to implement it yourself.

To prevent dragging for an interior element (e.g. if you want a floating palette with buttons or input fields)
just add the `no-drag` class to an element or its container.
*/
import { Component as WebComponent, elements } from 'tosijs';
import { trackDrag, bringToFront } from './track-drag';
const { slot } = elements;
export class TosiFloat extends WebComponent {
    static preferredTagName = 'tosi-float';
    static floats = new Set();
    static initAttributes = {
        drag: false,
        remainOnResize: 'remove',
        remainOnScroll: 'remain',
    };
    content = slot();
    static shadowStyleSpec = {
        ':host': {
            position: 'fixed',
        },
    };
    reposition = (event) => {
        if (event instanceof MouseEvent && event.button !== 0) {
            return;
        }
        const target = event.target;
        if (target?.closest('.no-drag')) {
            return;
        }
        if (this.drag) {
            bringToFront(this);
            const x = this.offsetLeft;
            const y = this.offsetTop;
            trackDrag(event, (dx, dy, pointerEvent) => {
                this.style.left = `${x + dx}px`;
                this.style.top = `${y + dy}px`;
                this.style.right = 'auto';
                this.style.bottom = 'auto';
                if (pointerEvent.type === 'mouseup') {
                    return true;
                }
            });
        }
    };
    connectedCallback() {
        super.connectedCallback();
        TosiFloat.floats.add(this);
        const PASSIVE = { passive: true };
        this.addEventListener('touchstart', this.reposition, PASSIVE);
        this.addEventListener('mousedown', this.reposition, PASSIVE);
        bringToFront(this);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        TosiFloat.floats.delete(this);
    }
}
/** @deprecated Use TosiFloat instead */
export const XinFloat = TosiFloat;
export const tosiFloat = TosiFloat.elementCreator();
/** @deprecated Use tosiFloat instead */
export const xinFloat = tosiFloat;
window.addEventListener('resize', () => {
    Array.from(TosiFloat.floats).forEach((float) => {
        if (float.remainOnResize === 'hide') {
            float.hidden = true;
        }
        else if (float.remainOnResize === 'remove') {
            float.remove();
        }
    });
}, { passive: true });
document.addEventListener('scroll', (event) => {
    if (event.target instanceof HTMLElement &&
        event.target.closest(TosiFloat.tagName)) {
        return;
    }
    Array.from(TosiFloat.floats).forEach((float) => {
        if (float.remainOnScroll === 'hide') {
            float.hidden = true;
        }
        else if (float.remainOnScroll === 'remove') {
            float.remove();
        }
    });
}, { passive: true, capture: true });
