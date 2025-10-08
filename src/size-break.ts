import { Component as WebComponent, ElementCreator, elements } from 'xinjs'

const { slot } = elements

/*#
# size-break

While we wait for enough browsers to implement [container-queries](https://www.w3.org/TR/css-contain-3/),
and in any event when you simply want to do different things at different sizes (e.g. in the project I'm
working on right now, a row of buttons turns into a menu at narrow widths) there's `<xin-sizebreak>`.

Note that the sizes referred to are of the `<xin-sizebreak>`'s `.offsetParent`, and it watches for
the window's `resize` events and its own (via `ResizeObserver`).

```html
<div class="container">
  <xin-sizebreak min-width="300" min-height="150">
    <h1>BIG!</h1>
    <i slot="small">little</i>
  </xin-sizebreak>
  <xin-sizer></xin-sizer>
</div>
```
```css
.preview {
  touch-action: none;
}

.preview xin-sizebreak {
  width: 100%;
  height: 100%;
  background: #fff8;
  border: 1px solid #aaa;
}

.preview xin-sizebreak * {
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

`<xin-sizebreak>` supports both `min-width` and/or `min-height`, and you can of course target only one
of the slots if you like. The demo site uses them to hide the [bundlejs](https://bundlejs.com/) badge when
space is tight.
*/

export class SizeBreak extends WebComponent {
  minWidth = 0
  minHeight = 0
  value: 'normal' | 'small' = 'normal'

  content = [slot({ part: 'normal' }), slot({ part: 'small', name: 'small' })]

  static styleSpec = {
    ':host': {
      display: 'inline-block',
      position: 'relative',
    },
  }

  constructor() {
    super()
    this.initAttributes('minWidth', 'minHeight')
  }

  onResize = () => {
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
    globalThis.addEventListener('resize', this.onResize)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    globalThis.removeEventListener('resize', this.onResize)
  }
}

export const sizeBreak = SizeBreak.elementCreator({
  tag: 'xin-sizebreak',
}) as ElementCreator<SizeBreak>
