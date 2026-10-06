# popFloat

There are so many cases in user-interfaces where it's useful to pop-up a floating
user interface element that a simple and reliable way of doing this seems like
a good idea.

The problem with many such approaches is that they assume a highly specific
use-case (e.g. popup menu or combo box) and while meeting the creator's intended
purpose admirably, turn out to have some annoying limitation that prevents them
handling the specific case at hand.

```js
import { popFloat, positionFloat } from 'tosijs-ui'
import { button } from 'tosijs'.elements
const grid = preview.querySelector('.grid')

grid.addEventListener('click', (event) => {
  const { target } = event
  if (!target.closest('button')) {
    return
  }
  const float = document.querySelector('.popped-float')
  if (float === null) {
    // create and position a float
    popFloat({
      class: 'popped-float',
      content: [
        'hello, I am a float',
        button('close me', {
          onClick(event){
            event.target.closest('tosi-float').remove()
          }
        })
      ],
      target,
      position: target.dataset.float,
      remainOnScroll: 'remove',
      remainOnResize: 'remove'
    })
  } else {
    // position an existing float
    positionFloat(float, target, target.dataset.float, 'remove', 'remove')
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

.popped-float {
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  padding: 10px 15px;
  background: var(--inset-bg);
  box-shadow:
    inset 0 0 0 1px var(--brand-color),
    2px 10px 5px #0004;
}
```

## popFloat

```
export interface PopFloatOptions {
  class?: string
  content: HTMLElement | ElementPart[]
  target: HTMLElement
  position?: FloatPosition
  remainOnResize?: 'hide' | 'remove' | 'remain' // default is 'remove',
  remainOnScroll?: 'hide' | 'remove' | 'remain' // default is 'remain',
  draggable?: boolean
}

export const popFloat = (options: PopFloatOptions): TosiFloat
```

Create a `<tosi-float>` with the content provided, positioned as specified (or automatically).

## positionFloat

```
export const positionFloat = (
  element: HTMLElement,
  target: HTMLElement,
  position?: FloatPosition,
  remainOnScroll: 'hide' | 'remove' | 'remain' = 'remain',
  remainOnResize: 'hide' | 'remove' | 'remain' = 'remove',
  draggable = false
): void
```

This allows you to, for example, provide a global menu that can be used on any element
instead of needing to have a whole instance of the menu wrapped around every instance
of the thing you want the menu to affect (a common anti-pattern of front-end frameworks).

### Handling Overflow

`positionFloat` automatically sets two css-variables `--max-height` and `--max-width` on
the floating element to help you deal with overflow (e.g. in menus): the room between the
float's anchored edge and the edge of what is **visible** (`window.visualViewport`). E.g. a
float positioned with `top: 125px` on a screen showing 700px gets `--max-height: 575px`.

An open float is re-fitted when the visible viewport changes (Mobile Safari's toolbars
appearing or disappearing, an on-screen keyboard, pinch-zoom), so its room stays true;
a draggable float is left where it is.

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

## Draggable

Sometimes it's nice to have popup palettes and modeless dialogs the user can drag away.
`popFloat()` makes this really easy to do.

```js
import { elements } from 'tosijs'
import { popFloat, icons } from 'tosijs-ui'

const { button, h4, p } = elements

preview.append(button(
  'Draggable Popup',
  {
    class: 'spawn-draggable',
    onClick(event) {
      popFloat({
        class: 'tearoff',
        content: [
          h4('Move me!'),
          p('I’m delicious!'),
          button(
            icons.x(),
            {
              class: 'no-drag close-tearoff',
              onClick(event) {
                event.target.closest('tosi-float').remove()
              }
            }
          )
        ],
        target: event.target,
        remainOnScroll: 'remain',
        remainOnResize: 'remain',
        draggable: true,
      })
    }
  },
))
```
```css
.tearoff {
  --tearoff-bg: #fff6;
  --tearoff-button-bg: #fff2;
  --tearoff-color: #222;
  --tearoff-hilite: #fff8;
  --tearoff-shadow: #0002;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  padding: 10px 15px;
  background: var(--tearoff-bg);
  backdrop-filter: blur(6px);
  box-shadow:
    inset 1px 1px 0 1px var(--tearoff-hilite),
    inset -1px -1px 0 1px var(--tearoff-shadow),
    2px 5px 10px var(--tearoff-shadow);
  width: 200px;
  color: var(--tearoff-color);
  --text-color: var(--tearoff-color);
}

.darkmode .tearoff {
  --tearoff-bg: #0004;
  --tearoff-button-bg: #0001;
  --tearoff-color: #fff;
}

.tearoff > :first-child {
  margin-top: 0;
}

.tearoff > :last-child {
  margin-bottom: 0;
}

.spawn-draggable {
  margin: 10px;
}

.close-tearoff {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 32px;
  height: 32px;
  text-align: center;
  padding: 0;
  line-height: 32px;
  background: var(--tearoff-button-bg);
  border-radius: 100px;
  box-shadow:
    inset 1px 1px 0 1px var(--tearoff-hilite),
    inset -1px -1px 0 1px var(--tearoff-shadow);
}
```
