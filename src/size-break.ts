import { ElementCreator, elements, withAttributes } from 'tosijs'

const { slot } = elements

/*#
# size-break

`<tosi-sizebreak>` shows different content at different sizes, for example a row of buttons
that becomes a menu when there is no room for it. [Container
queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_size_and_style_queries)
can restyle content by size; this swaps the content itself, without CSS.

Note that the sizes referred to are of the `<tosi-sizebreak>`'s `.offsetParent`, and it watches for
the window's `resize` events and its own (via `ResizeObserver`).

```html
<div class="container">
  <tosi-sizebreak min-width="300" min-height="150">
    <h1>BIG!</h1>
    <i slot="small">little</i>
  </tosi-sizebreak>
  <tosi-sizer></tosi-sizer>
</div>
```
```css
.preview {
  touch-action: none;
}

.preview tosi-sizebreak {
  width: 100%;
  height: 100%;
  background: #fff8;
  border: 1px solid #aaa;
}

.preview tosi-sizebreak * {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
}

.preview .container {
  position: relative;
  min-width: 100px;
  min-height: 40px;
  max-height: 100%;
  width: 400px;
  height: 100px;
}

.preview .sizer {
  position: absolute;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background: #0002;
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  opacity: 0.5;
}

.preview .sizer:hover {
  opacity: 1.0;
}
```

`<tosi-sizebreak>` supports both `min-width` and/or `min-height`, and you can of course target only one
of the slots if you like. The demo site uses them to hide the
[jsdelivr](https://www.jsdelivr.com/) badge when space is tight.
*/

/*{ "parent": "Components" }*/

export class SizeBreak extends withAttributes({
  minWidth: 0,
  minHeight: 0,
}) {
  static preferredTagName = 'tosi-sizebreak'

  value: 'normal' | 'small' = 'normal'

  content = [slot({ part: 'normal' }), slot({ part: 'small', name: 'small' })]

  static shadowStyleSpec = {
    ':host': {
      display: 'inline-block',
      position: 'relative',
    },
  }

  handleResize = () => {
    const { normal, small } = this.parts as { [key: string]: HTMLElement }
    const parent = this.offsetParent as HTMLElement | null
    if (!(parent instanceof HTMLElement)) {
      return
    } else if (
      parent.offsetWidth < this.minWidth ||
      parent.offsetHeight < this.minHeight
    ) {
      normal.hidden = true
      small.hidden = false
      this.value = 'small'
    } else {
      normal.hidden = false
      small.hidden = true
      this.value = 'normal'
    }
  }

  // TODO trigger a resize event when an ancestor element
  // is inserted or moved into the DOM.
  connectedCallback(): void {
    super.connectedCallback()
    globalThis.addEventListener('resize', this.handleResize)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    globalThis.removeEventListener('resize', this.handleResize)
  }
}

export const sizeBreak = SizeBreak.elementCreator() as ElementCreator<SizeBreak>
