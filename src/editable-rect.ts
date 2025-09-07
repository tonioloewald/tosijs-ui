/*#
# editable-rect

`<xin-editable>` (`editableRect` is the `ElementCreator` and `EditableRect` is the class) is an element
for allowing the adjustment of another element's position and size. Simply insert it in a `position: absolute`
or `position: fixed` element and you can directly adjust its CSS positioning, including rotation.

Click on an element to adjust its position, dimensions, and rotation.

```js
import { editableRect, icons } from 'tosijs-ui'
import { elements } from 'tosijs'
const { button } = elements

function showTools(event) {
  event.stopPropagation()
  event.preventDefault()
}

const editable = editableRect(button({class: 'more-popup', onClick: showTools}, icons.moreVertical()))
preview.addEventListener('click', (event) => {
  const target = event.target
  if (['absolute', 'fixed'].includes(getComputedStyle(target).position)) {
    target.append(editable)
  } else {
    editable.remove()
  }
})
preview.addEventListener('change', event => console.log(event))
```
```html
<div class="editable" style="top: 20px; left: 20px; width: auto; height: auto; right: 20px; bottom: 20px;">
  <div class="editable" style="top: 20px; left: 20px; width: 200px; height: 150px;">
  </div>
  <div class="editable" style="bottom: 20px; top: 20px; width: 300px; height: auto; right: 20px;">
  </div>
</div>
```
```css
.preview .editable {
  position: absolute;
  box-shadow: inset 0 0 0 1px #0ccc;
  background: #0cc1;
}

.preview button.more-popup {
  position: absolute;
  width: 44px;
  height: 44px;
  top: 2px;
  right: 2px;
  --text-color: black;
  background: transparent;
  box-shadow: none;
}

.previw button
```

## Snapping

When `EditableRect.snapToGrid === true` or the shift-key is depresseed, position will snap to `EditableRect.gridSize` pixels (default = 8).

Similarly `EditableRect.snapAngle === true` or the shift-key will snap rotation to increments of `EditableRect.angleSize` degrees (default = 15).

## Events

After an element's position, size, or rotation are adjusted a `change` event is triggered on the element.
*/

import { Component, elements, vars } from 'tosijs'
import { icons } from './icons'
import { trackDrag } from './track-drag'

const { div, slot } = elements

interface Locks {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

type Side = keyof Locks

export class EditableRect extends Component {
  static angleSize = 15
  static gridSize = 8
  static snapAngle = false
  static snapToGrid = false

  static styleSpec = {
    ':host': {
      '--handle-bg': '#fff4',
      '--handle-color': '#2228',
      '--handle-hover-bg': '#8ff8',
      '--handle-hover-color': '#222',
      '--handle-size': '20px',
      '--handle-padding': '2px',
    },
    ':host ::slotted(*)': {
      position: 'absolute',
    },
    ':host > :not(style,slot)': {
      boxSizing: 'border-box',
      content: '" "',
      position: 'absolute',
      display: 'flex',
      height: vars.handleSize,
      width: vars.handleSize,
      padding: vars.handlePadding,
      '--text-color': vars.handleColor,
      background: vars.handleBg,
    },
    ':host > .drag-size': {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      height: 'auto',
      width: 'auto',
      background: 'transparent',
      cursor: 'ew-resize',
    },
    ':host > [part="rotate"]': {
      transform: `translateY(${vars.handleSize_50})`,
    },
    ':host > [locked] > svg:first-child, :host > :not([locked]) > svg+svg': {
      display: 'none',
    },
    ':host .icon-unlock': {
      opacity: 0.5,
    },
    ':host svg': {
      pointerEvents: 'none',
    },
    ':host > *:hover': {
      '--text-color': vars.handleHoverColor,
      background: vars.handleHoverBg,
    },
  }

  static snappedCoords(event: PointerEvent, coords: number[]): number[] {
    const { gridSize } = EditableRect
    return EditableRect.snapToGrid || event.shiftKey
      ? coords.map((v) => Math.round(v / gridSize) * gridSize)
      : coords
  }

  static snappedAngle(event: PointerEvent, a: number): number {
    const { angleSize } = EditableRect
    return EditableRect.snapAngle || event.shiftKey
      ? Math.round(a / angleSize) * angleSize
      : a
  }

  get locked(): Locks {
    const element = this.parentElement!
    if (element.style.inset) {
      return { left: true, top: true, bottom: true, right: true }
    }
    const right = element.style.right.match(/\d/) !== null
    const left = !right || element.style.left.match(/\d/) !== null
    const bottom = element.style.bottom.match(/\d/) !== null
    const top = !bottom || element.style.top.match(/\d/) !== null
    return { left, top, bottom, right }
  }

  set locked(locks: Locks) {
    const { bottom, right } = locks
    let { left, top } = locks
    const element = this.parentElement!
    const l = element.offsetLeft
    const t = element.offsetTop
    const w = element.offsetWidth
    const h = element.offsetHeight
    const r = (element.offsetParent as HTMLElement).offsetWidth - l - w
    const b = (element.offsetParent as HTMLElement).offsetHeight - t - h
    Object.assign(element.style, {
      left: '',
      right: '',
      top: '',
      bottom: '',
      width: '',
      height: '',
    })
    if (!right) left = true
    if (!bottom) top = true
    if (left) element.style.left = l + 'px'
    if (right) element.style.right = r + 'px'
    if (left && right) {
      element.style.width = 'auto'
    } else {
      element.style.width = w + 'px'
    }
    if (top) element.style.top = t + 'px'
    if (bottom) element.style.bottom = b + 'px'
    if (top && bottom) {
      element.style.height = 'auto'
    } else {
      element.style.height = h + 'px'
    }
    this.queueRender()
  }

  get coords(): { top: number; left: number; bottom: number; right: number } {
    const { top, left, right, bottom } = this.parentElement!.style
    return {
      top: parseFloat(top),
      left: parseFloat(left),
      right: parseFloat(right),
      bottom: parseFloat(bottom),
    }
  }

  get left(): number {
    return this.parentElement!.offsetLeft
  }

  get width(): number {
    return this.parentElement!.offsetWidth
  }

  get right(): number {
    return (
      (this.parentElement!.offsetParent as HTMLElement).offsetWidth -
      (this.left + this.width)
    )
  }

  get top(): number {
    return this.parentElement!.offsetTop
  }

  get height(): number {
    return this.parentElement!.offsetHeight
  }

  get bottom(): number {
    return (
      (this.parentElement!.offsetParent as HTMLElement).offsetHeight -
      (this.top + this.height)
    )
  }

  triggerChange = () => {
    this.parentElement!.dispatchEvent(
      new Event('change', {
        bubbles: true,
        composed: true,
      })
    )
  }

  adjustPosition = (event: Event) => {
    // this means there will be some positioning coordinate set!
    const { locked } = this
    this.locked = locked
    const target = this.parentElement!
    const { top, left, bottom, right } = this.coords
    trackDrag(event as PointerEvent, (dx, dy, dragEvent) => {
      ;[dx, dy] = EditableRect.snappedCoords(dragEvent, [dx, dy])
      if (!isNaN(top)) {
        target.style.top = top + dy + 'px'
      }
      if (!isNaN(bottom)) {
        target.style.bottom = bottom - dy + 'px'
      }
      if (!isNaN(left)) {
        target.style.left = left + dx + 'px'
      }
      if (!isNaN(right)) {
        target.style.right = right - dx + 'px'
      }
      if (dragEvent.type === 'mouseup') {
        this.triggerChange()
        return true
      }
    })
  }

  resize = (event: Event) => {
    const target = this.parentElement!
    const { locked } = this
    this.locked = Object.assign({
      left: true,
      top: true,
      right: true,
      bottom: true,
    })
    const [right, bottom] = [this.right, this.bottom]

    trackDrag(event as PointerEvent, (dx, dy, dragEvent) => {
      let r = right - dx
      let b = bottom - dy
      ;[r, b] = EditableRect.snappedCoords(dragEvent as PointerEvent, [r, b])
      target.style.right = r + 'px'
      target.style.bottom = b + 'px'
      if (dragEvent.type === 'mouseup') {
        this.locked = locked
        this.triggerChange()
        return true
      }
    })
  }

  adjustSize = (event: Event) => {
    const target = this.parentElement!
    const { locked } = this
    const dimension = (event.target as HTMLElement).getAttribute('part') as Side
    this.locked = Object.assign({
      left: true,
      right: true,
      top: true,
      bottom: true,
    })
    const original = this[dimension]

    trackDrag(event as PointerEvent, (dx, dy, dragEvent) => {
      const [adjusted] = EditableRect.snappedCoords(dragEvent, [
        original +
          (['left', 'right'].includes(dimension) ? dx : dy) *
            (['right', 'bottom'].includes(dimension) ? -1 : 1),
      ])
      target.style[dimension] = adjusted + 'px'
      if (dragEvent.type === 'mouseup') {
        this.locked = locked
        this.triggerChange()
        return true
      }
    })
  }

  get rect(): DOMRect {
    return this.parentElement!.getBoundingClientRect()
  }

  get center(): { x: number; y: number } {
    const rect = this.parentElement!.getBoundingClientRect()
    return {
      x: rect.x + rect.width * 0.5,
      y: rect.y + rect.height * 0.5,
    }
  }

  get element(): HTMLElement {
    return this.parentElement as HTMLElement
  }

  adjustRotation = (event: Event) => {
    const { center } = this
    const { transformOrigin } = this.element.style
    if (!transformOrigin) {
      this.element.style.transformOrigin = '50% 50%'
    }
    trackDrag(event as PointerEvent, (_dx, _dy, dragEvent: PointerEvent) => {
      const { clientX, clientY } = dragEvent
      const x = clientX - center.x
      const y = clientY - center.y
      let alpha = y > 0 ? 90 : -90
      if (x !== 0) {
        alpha = (Math.atan2(y, x) * 180) / Math.PI
      }
      alpha = EditableRect.snappedAngle(dragEvent, alpha)
      if (alpha === 0) {
        this.element.style.transformOrigin = ''
        this.element.style.transform = ''
      } else {
        this.element.style.transform = `rotate(${alpha}deg)`
      }
      this.triggerChange()
      return dragEvent.type === 'mouseup'
    })
  }

  toggleLock = (event: Event) => {
    const { locked } = this
    const which = (event.target as HTMLElement).title.split(' ')[1] as Side
    locked[which] = !locked[which]
    this.locked = locked
    this.queueRender()
    event.stopPropagation()
    event.preventDefault()
  }

  content = () => [
    div(
      {
        part: 'move',
        style: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
      },
      icons.move()
    ),
    div({
      part: 'left',
      title: 'resize left',
      class: 'drag-size',
      style: { left: '-6px', width: '8px' },
    }),
    div({
      part: 'right',
      title: 'resize right',
      class: 'drag-size',
      style: { left: 'calc(100% - 2px)', width: '8px' },
    }),
    div({
      part: 'top',
      title: 'resize top',
      class: 'drag-size',
      style: { top: '-6px', height: '8px', cursor: 'ns-resize' },
    }),
    div({
      part: 'bottom',
      title: 'resize bottom',
      class: 'drag-size',
      style: { top: 'calc(100% - 2px)', height: '8px', cursor: 'ns-resize' },
    }),
    div(
      {
        part: 'resize',
        style: { top: '100%', left: '100%' },
      },
      icons.resize()
    ),
    div(
      {
        part: 'rotate',
        style: { top: '50%', right: '0' },
      },
      icons.refreshCw()
    ),
    div(
      {
        part: 'lockLeft',
        title: 'lock left',
        style: { top: '50%', left: 0, transform: 'translate(-100%, -50%)' },
      },
      icons.unlock(),
      icons.lock()
    ),
    div(
      {
        part: 'lockRight',
        title: 'lock right',
        style: { top: '50%', left: '100%', transform: 'translate(0%, -50%)' },
      },
      icons.unlock(),
      icons.lock()
    ),
    div(
      {
        part: 'lockTop',
        title: 'lock top',
        style: { top: 0, left: '50%', transform: 'translate(-50%, -100%)' },
      },
      icons.unlock(),
      icons.lock()
    ),
    div(
      {
        part: 'lockBottom',
        title: 'lock bottom',
        style: { top: '100%', left: '50%', transform: 'translate(-50%, 0%)' },
      },
      icons.unlock(),
      icons.lock()
    ),
    slot(),
  ]

  constructor() {
    super()

    this.initAttributes('rotationSnap', 'positionSnap')
  }

  connectedCallback(): void {
    super.connectedCallback()

    const {
      left,
      right,
      top,
      bottom,
      lockLeft,
      lockRight,
      lockTop,
      lockBottom,
      move,
      resize,
      rotate,
    } = this.parts

    const PASSIVE = { passive: true }
    ;[left, right, top, bottom].forEach((elt) => {
      elt.addEventListener('mousedown', this.adjustSize, PASSIVE)
      elt.addEventListener('touchstart', this.adjustSize, PASSIVE)
    })
    ;[lockLeft, lockRight, lockTop, lockBottom].forEach((elt) => {
      elt.addEventListener('click', this.toggleLock)
    })
    resize.addEventListener('mousedown', this.resize, PASSIVE)
    move.addEventListener('mousedown', this.adjustPosition, PASSIVE)
    rotate.addEventListener('mousedown', this.adjustRotation, PASSIVE)
    resize.addEventListener('touchstart', this.resize, PASSIVE)
    move.addEventListener('touchstart', this.adjustPosition, PASSIVE)
    rotate.addEventListener('touchstart', this.adjustRotation, PASSIVE)
  }

  render() {
    super.render()

    if (!this.parentElement) {
      return
    }

    const { lockLeft, lockRight, lockTop, lockBottom } = this.parts
    const { left, right, top, bottom } = this.locked

    lockLeft.toggleAttribute('locked', left)
    lockRight.toggleAttribute('locked', right)
    lockTop.toggleAttribute('locked', top)
    lockBottom.toggleAttribute('locked', bottom)
  }
}

export const editableRect = EditableRect.elementCreator({
  tag: 'xin-editable',
})
