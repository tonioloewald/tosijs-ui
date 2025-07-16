/*#
# popFloat

There are so many cases in user-interfaces where it's useful to pop-up a floating
user interface element that a simple and reliable way of doing this seems like
a good idea.

The problem with many such approaches is that they assume a highly specific
use-case (e.g. popup menu or combo box) and while meeting the creator's intended
purpose admirably, turn out to have some annoying limitation that prevents them
handling the specific case at hand.

```js
const { popFloat, positionFloat } = tosijsui
const { button } = tosijs.elements
const grid = preview.querySelector('.grid')

grid.addEventListener('click', (event) => {
  const { target } = event
  if (!target.closest('button')) {
    return
  }
  const float = preview.querySelector('xin-float')
  if (float === null) {
    // create and position a float
    preview.append(
      popFloat({
        content: [
          'hello, I am a float',
          button('close me', {
            onClick(event){
              event.target.closest('xin-float').remove()
            }
          })
        ],
        target,
        position: target.dataset.float
      })
    )
  } else {
    // position an existing float
    positionFloat(float, target, target.dataset.float)
  }
})
```
```html
<h2>Pop Float Demo</h2>
<div class="grid">
  <button data-float="nw">nw</button>
  <button data-float="n">n</button>
  <button data-float="ne">ne</button>
  <button data-float="wn">wn</button>
  <span>&nbsp;</span>
  <button data-float="en">en</button>
  <button data-float="w">w</button>
  <button data-float="auto">auto</button>
  <button data-float="e">e</button>
  <button data-float="ws">ws</button>
  <button data-float="side">side</button>
  <button data-float="es">es</button>
  <button data-float="sw">sw</button>
  <button data-float="s">s</button>
  <button data-float="se">se</button>
</div>
```
```css
.preview .grid {
  display: grid;
  grid-template-columns: 80px 80px 80px;
}

.preview xin-float {
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  padding: 10px;
  background: white;
  box-shadow: 2px 10px 5px #0004;
}
```

## popFloat

```
export interface PopFloatOptions {
  content: HTMLElement | ElementPart[]
  target: HTMLElement
  position?: FloatPosition
}

export const popFloat = (options: PopFloatOptions): XinFloat
```

Create a `<xin-float>` with the content provided, positioned as specified (or automatically).

## positionFloat

```
export const positionFloat = (
  element: HTMLElement,
  target: HTMLElement,
  position?: FloatPosition
  remainOnScroll?: 'hide' | 'remove' | boolean // default is 'remove'
  remainOnResize?: 'hide' | 'remove' | boolean // default is 'remove'
): void
```

This allows you to, for example, provide a global menu that can be used on any element
instead of needing to have a whole instance of the menu wrapped around every instance
of the thing you want the menu to affect (a common anti-pattern of front-end frameworks).

### Handling Overflow

`positionFloat` automatically sets two css-variables `--max-height` and `--max-width` on
the floating element to help you deal with overflow (e.g. in menus). E.g. if the float
is positioned with `top: 125px` then it will set `--max-height: calc(100vh - 125px)`.

## FloatPosition

```
export type FloatPosition =
| 'n'
| 's'
| 'e'
| 'w'
| 'ne'
| 'nw'
| 'se'
| 'sw'
| 'en'
| 'wn'
| 'es'
| 'ws'
| 'side'
| 'auto'
```

*/

import { ElementPart } from 'tosijs'
import { xinFloat, XinFloat } from './float'
import { bringToFront } from './track-drag'

export type FloatPosition =
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw'
  | 'en'
  | 'wn'
  | 'es'
  | 'ws'
  | 'side'
  | 'auto'

export interface PopFloatOptions {
  content: HTMLElement | ElementPart[]
  target: HTMLElement
  position?: FloatPosition
}

export const popFloat = (options: PopFloatOptions): XinFloat => {
  const { content, target, position } = options
  const float = Array.isArray(content)
    ? xinFloat(...content)
    : xinFloat(content)

  positionFloat(float, target, position)
  document.body.append(float)
  return float
}

export const positionFloat = (
  element: HTMLElement,
  target: HTMLElement,
  position?: FloatPosition
): void => {
  {
    const { position } = getComputedStyle(element)
    if (position !== 'fixed') {
      element.style.position = 'fixed'
    }
    bringToFront(element)
  }
  const { left, top, width, height } = target.getBoundingClientRect()
  const cx = left + width * 0.5
  const cy = top + height * 0.5
  const w = window.innerWidth
  const h = window.innerHeight
  if (position === 'side') {
    position = ((cx < w * 0.5 ? 'e' : 'w') +
      (cy < h * 0.5 ? 's' : 'n')) as FloatPosition
  } else if (position === 'auto' || position === undefined) {
    position = ((cy < h * 0.5 ? 's' : 'n') +
      (cx < w * 0.5 ? 'e' : 'w')) as FloatPosition
  }
  element.style.top =
    element.style.left =
    element.style.right =
    element.style.bottom =
    element.style.transform =
      ''
  if (position.length === 2) {
    const [first, second] = position
    switch (first) {
      case 'n':
        element.style.bottom = (h - top).toFixed(2) + 'px'
        break
      case 'e':
        element.style.left = (left + width).toFixed(2) + 'px'
        break
      case 's':
        element.style.top = (top + height).toFixed(2) + 'px'
        break
      case 'w':
        element.style.right = (w - left).toFixed(2) + 'px'
        break
    }

    switch (second) {
      case 'n':
        element.style.bottom = (h - top - height).toFixed(2) + 'px'
        break
      case 'e':
        element.style.left = left.toFixed(2) + 'px'
        break
      case 's':
        element.style.top = top.toFixed(2) + 'px'
        break
      case 'w':
        element.style.right = (w - left - width).toFixed(2) + 'px'
        break
    }
    element.style.transform = ''
  } else if (position === 'n') {
    element.style.bottom = (h - top).toFixed(2) + 'px'
    element.style.left = cx.toFixed(2) + 'px'
    element.style.transform = 'translateX(-50%)'
  } else if (position === 's') {
    element.style.top = (top + height).toFixed(2) + 'px'
    element.style.left = cx.toFixed(2) + 'px'
    element.style.transform = 'translateX(-50%)'
  } else if (position === 'e') {
    element.style.left = (left + width).toFixed(2) + 'px'
    element.style.top = cy.toFixed(2) + 'px'
    element.style.transform = 'translateY(-50%)'
  } else if (position === 'w') {
    element.style.right = (w - left).toFixed(2) + 'px'
    element.style.top = cy.toFixed(2) + 'px'
    element.style.transform = 'translateY(-50%)'
  }
  element.style.setProperty(
    '--max-height',
    `calc(100vh - ${element.style.top || element.style.bottom})`
  )
  element.style.setProperty(
    '--max-width',
    `calc(100vw - ${element.style.left || element.style.right})`
  )
}
