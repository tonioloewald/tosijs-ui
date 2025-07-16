/*#
# sizer

This is a super-simple component that you can put in a fixed size element allowing it to be resized
from the bottom-right.

```html
<div>
  <xin-sizer></xin-sizer>
</div>
```
```css
.preview div {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 200px;
  height: 100px;
  background: #ff02;
  border: 1px solid #555;
}
```

<xin-css-var-editor element-selector="xin-sizer"></xin-css-var-editor>
*/

import { Component as XinComponent, ElementCreator, vars } from 'tosijs'
import { icons } from './icons'
import { trackDrag } from './track-drag'

export class XinSizer extends XinComponent {
  target?: HTMLElement | null = null

  static styleSpec = {
    ':host': {
      _resizeIconFill: '#222',
      display: 'block',
      position: 'absolute',
      bottom: -7,
      right: -7,
      padding: 14,
      width: 44,
      height: 44,
      opacity: 0.25,
      transition: 'opacity 0.25s ease-out',
    },
    ':host(:hover)': {
      opacity: 0.5,
    },
    ':host svg': {
      width: 16,
      height: 16,
      stroke: vars.resizeIconFill,
    },
  }

  content = icons.resize()

  get minSize(): { width: number; height: number } {
    const { minWidth, minHeight } = getComputedStyle(this.target!)
    return {
      width: parseFloat(minWidth) || 32,
      height: parseFloat(minHeight) || 32,
    }
  }

  resizeTarget = (event: Event): void => {
    const { target } = this
    if (!target) return
    const w = target.offsetWidth
    const h = target.offsetHeight
    target.style.left = target.offsetLeft + 'px'
    target.style.top = target.offsetTop + 'px'
    target.style.bottom = ''
    target.style.right = ''
    const { minSize } = this

    trackDrag(
      event as PointerEvent,
      (dx: number, dy: number, event: any): true | undefined => {
        target.style.width = Math.max(minSize.width, w + dx) + 'px'
        target.style.height = Math.max(minSize.height, h + dy) + 'px'
        if (event.type === 'mouseup') {
          return true
        }
      },
      'nwse-resize'
    )
  }

  connectedCallback(): void {
    super.connectedCallback()

    if (!this.target) {
      this.target = this.parentElement
    }

    const PASSIVE = { passive: true }
    this.addEventListener('mousedown', this.resizeTarget, PASSIVE)
    this.addEventListener('touchstart', this.resizeTarget, PASSIVE)
  }
}

export const xinSizer = XinSizer.elementCreator({
  tag: 'xin-sizer',
}) as ElementCreator<XinSizer>
