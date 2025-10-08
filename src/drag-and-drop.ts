/*#
# drag & drop

> **Note** this library is a modernized version of the [b8rjs](https://b8rjs.com) drag-and-drop.js library.
> It removes all usage of b8rjs and has no dependencies.

A lightweight library building on top of HTML5 drag and drop behavior.

To use it, simply call `dragAndDrop.init()` (it only needs to be called once,
but calling it again is harmless).

```
import { dragAndDrop } from 'xinjs-ui'

dragAndDrop.init()
```

The library just sets up some event listeners.

You can use `dragAndDrop.draggedElement()` to get the element being dragged (if it's
actually from the page you're in).

> ### Important Note
>
> The nice thing about HTML5 drag-and-drop is that it leverages the OS's drag and
> drop support. This means you can drag from one window to another, from the desktop
> to your app and vice versa. It's all a matter of configuring the DOM elements.

This module sets up some global event handlers and *just works*&trade; (arguably, it merely does things
that the browser should do, such as add a CSS selector for drop zones that are compatible
with what's being dragged).

This module uses but *does not define* the following class selectors:

- `.drag-source` an element being dragged
- `.drag-target` an element on which the dragged object may be dropped
- `.drag-over` a `.drag-target` which the object is currently over

You may also wish to create style rules for:

- `[draggable="true"]` anything other than a `<a>` (and perhaps an `<img>`) that can be dragged
- `[data-drag]` indicates *types* of draggable things that can be dropped on them.
- `[data-drop]` indicates potential *drop zones*.

> **Note** `draggable` is has to be set to "true", [see documentation on draggable](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/draggable).

## Draggable Objects

To create a draggable element, add `draggable="true"`.

    <div draggable="true">Drag Me</div>

To specify the type(s) of content that will be dragged, use the `data-drag` attribute:

    <div draggable="true" data-drag="text/plain">Drag Me</div>

To specify the content dragged, use a `data-drag-content` attribute.

    <div
      draggable="true"
      data-drag="text/plain"
      data-drag-content="Surprise!"
    >Drag Me</div>

## Drop Zones

To create a drop zone, use the data-drop attribute set to a semicolon-delimited list
of mime types:

    <div data-drop="text/plain">
      Drop plain text here
    </div>
    <div data-drop="text/plain;text/html">
      Drop html or plain text here
    </div>

Finally, you can override default drop behavior (which is to copy the dragged node into
the drop zone node) simply using data-event="drop:path.to.drop_handler" as usual.

    <div
      data-drop="custom"
      data-event="drop:path.to.drop_handler"
    >
      Drop some custom thing here
    </div>

### Typed Drop Zones Example

```html
<div style="display: grid; grid-template-columns: 50% 50%">
  <div>
    <h4>Draggable</h4>
    <a class="drag" href="javascript: alert('I don't do anything)">Links are draggable by default</a>
    <p draggable="true">
      Just adding the <code>draggable="true"</code>
      makes this paragraph draggable (as text/html by default)
    </p>
    <p draggable="true" data-drag="text/html">
      Draggable as <i>text/html</i>
    </p>
    <p draggable="true" data-drag="text/plain" data-drag-content="Surprise!">
      Draggable as <i>text/plain</i>, with <b>custom content</b>
    </p>
    <p draggable="true" data-drag="text/html;text/plain">
      Draggable as <i>text/html</i> or <i>text/plain</i>
    </p>
    <p draggable="true" data-drag="text/plain">
      Draggable as <i>text/plain</i>
    </p>
  </div>
  <div>
    <h4>Drop Targets</h4>
    <div data-drop="text/html">
      You can drop stuff here
    </div>
    <div data-drop="text/html">
      You can drop HTML here
    </div>
    <div data-drop="text/*">
      You can drop any text
    </div>
    <div data-drop="text/html;url">
      You can drop HTML or urls here
    </div>
    <div
      data-drop="special/any"
      data-event="drop:_component_.drop"
    >
      I accept anything and have special drop handling
    </div>
  </div>
</div>
```
```css
.drag-source {
  box-shadow: 0 0 2px 2px orange;
  opacity: 0.5;
}
.drag-target {
  min-height: 10px;
  background: rgba(0,0,255,0.25);
}
.drag-target.drag-over {
  background: rgba(0,0,255,0.5);
}
:not([data-drop]) > .drag,
[draggable="true"] {
  border: 1px solid rgba(255,192,0,0.5);
  cursor: pointer;
  display: block;
}

:not([data-drop]) > .drag,
[data-drop],
[draggable="true"] {
  padding: 4px;
  margin: 4px;
  border-radius: 5px;
}
```
```js
import { dragAndDrop } from 'xinjs-ui'

dragAndDrop.init()
```

> Note that you can drag between two browser tabs containing this
> example (or between two different browsers) and it will work.

### Reorderable List Example

```js
import { elements, tosi, getListItem } from 'xinjs'
import { dragAndDrop } from 'xinjs-ui'

dragAndDrop.init()

const shuffle = (deck) => {
  var shuffled = [];
  for( const card of deck ){
    shuffled.splice( Math.floor( Math.random() * (1 + shuffled.length) ), 0, card );
  }
  return shuffled;
}

const colors = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'indigo',
  'violet',
]
const { spectrum } = tosi({
  spectrum: shuffle(colors).map(color => ({color}))
})

const { div, template } = elements

let dragged = null

const dropColor = (event) => {
  const dropped = getListItem(event.target)
  const draggedIndex = spectrum.indexOf(dragged)
  const droppedIndex = spectrum.indexOf(dropped)
  spectrum.splice(draggedIndex, 1)
  spectrum.splice(droppedIndex, 0, dragged)

  console.log({dragged, draggedIndex, dropped, droppedIndex})

  event.preventDefault()
  event.stopPropagation()
}

const dragId = 'spectrum/' + Math.floor(Math.random() * 1e9)

preview.append(
  div(
    {
      bindList: { value: spectrum, idPath: 'color' }
    },
    template(
      div({
        class: 'spectrum',
        bindText: '^.color',
        draggable: 'true',
        dataDrag: dragId,
        dataDrop: dragId,
        onDrop: dropColor,
        bind: {
          value: '^.color',
          binding(element, value) {
            element.style.backgroundColor = value
          }
        },
        onDragstart(event) {
          dragged = getListItem(event.target)
        }
      })
    )
  ),
)
```
```css
.spectrum {
  height: 36px;
  color: white;
  font-weight: 700;
  text-shadow: 1px 2px 0 black;
  padding-left: 10px;
}

.spectrum.drag-over {
  box-shadow: 0 0 0 4px blue;
}
```

> To prevent this example from allowing drags between windows (which
> wouldn't make sense) a random dragId is assigned to `data-drag` and
> `data-drop` in this example.
)
*/

const dragInProgress = () => !!document.querySelector('.drag-source')

const isTypeAllowed = (
  allowedTypes: readonly string[] | undefined,
  type: string
) => {
  if (!allowedTypes) {
    return false
  }
  for (const allowedType of allowedTypes) {
    if (allowedType === 'special/any') {
      return true
    } else if (allowedType.indexOf('*') > -1) {
      const [A, B] = allowedType.split('/')
      const [a, b] = type.split('/')
      if ((A === '*' || A === a) && (B === '*' || B === b)) {
        return true
      }
    } else {
      if (allowedType === type) {
        return true
      }
    }
  }
}

const removeClass = (className: string) => {
  for (const elt of [...document.querySelectorAll(`.${className}`)]) {
    elt.classList.remove(className)
  }
}
const end = () => {
  removeClass('drag-over')
  removeClass('drag-source')
  removeClass('drag-target')
}

const stringToTypes = (s: string | undefined, delimiter = ';'): string[] => {
  return (s || '')
    .split(delimiter)
    .map((t) => t.trim())
    .filter((i) => i !== '')
}

const markDroppable = (types: readonly string[] | undefined) => {
  if (!types) types = []
  const elements = [
    ...document.querySelectorAll('[data-drop]'),
  ] as HTMLElement[]
  for (const element of elements) {
    const dropTypes = stringToTypes(element.dataset.drop)
    if (types.find((type) => isTypeAllowed(dropTypes, type))) {
      element.classList.add('drag-target')
    } else {
      element.classList.remove('drag-target')
    }
  }
}

function start(evt: DragEvent) {
  const target = (evt.target as HTMLElement)?.closest(
    '[draggable="true"],a[href]'
  ) as HTMLElement | null
  if (!target) {
    return
  }
  target.classList.add('drag-source')
  const types = target.matches('[draggable="true"]')
    ? stringToTypes(target.dataset.drag || 'text/html')
    : stringToTypes(target.dataset.drag || 'url')
  for (const type of types) {
    const content =
      target.dataset.dragContent ||
      (type === 'text/html' ? target.innerHTML : target.textContent)
    evt.dataTransfer?.setData(type, content || '')
  }
  markDroppable(evt.dataTransfer?.types)
  evt.stopPropagation()
}

function drag(evt: DragEvent) {
  if (!dragInProgress()) {
    markDroppable(evt.dataTransfer?.types)
  }
  const target = (evt.target as HTMLElement).closest('.drag-target')
  if (target && evt.dataTransfer) {
    target.classList.add('drag-over')
    evt.dataTransfer.dropEffect = 'copy'
  } else {
    evt.preventDefault()
    evt.stopPropagation()
  }
}

function leave() {
  removeClass('drag-over')
}

function drop(evt: DragEvent) {
  const target = (evt.target as HTMLElement).closest(
    '.drag-target'
  ) as HTMLElement | null
  if (target) {
    const dropTypes = (target.dataset?.drop || '').split(';')
    for (const type of dropTypes) {
      if (isTypeAllowed(evt.dataTransfer?.types, type)) {
        if (type === 'text/html') {
          target.innerHTML = evt.dataTransfer?.getData(type) || ''
        } else {
          target.textContent = evt.dataTransfer?.getData(type) || ''
        }
      }
    }
  }
  end()
}

export const draggedElement = () => document.querySelector('.drag-source')

let isInitialized = false

export const init = () => {
  if (isInitialized) {
    return
  }

  document.body.addEventListener('dragstart', start)
  document.body.addEventListener('dragenter', drag)
  document.body.addEventListener('dragover', drag)
  document.body.addEventListener('drop', drop)
  document.body.addEventListener('dragleave', leave)
  document.body.addEventListener('dragend', end)

  // stop dragged items from reloading the window
  window.addEventListener('dragover', (evt) => evt.preventDefault())
  window.addEventListener('drop', (evt) => evt.preventDefault())

  isInitialized = true
}
