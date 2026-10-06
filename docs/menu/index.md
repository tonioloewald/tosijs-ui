# menu

Being able to pop a menu up anywhere is just so nice, and `tosijs-ui` allows menus
to be generated on-the-fly, and even supports hierarchical menus.

## popMenu and `<tosi-menu>`

`popMenu({target, menuItems, …})` will spawn a menu from a target.

The `<tosi-menu>` component places creates a trigger button, hosts
menuItems, and (because it persists in the DOM) supports keyboard
shortcuts.

```js
import { popMenu, localize, tosiMenu, postNotification, tosiLocalized, icons } from 'tosijs-ui'
import { elements } from 'tosijs'

let picked = ''
let testingEnabled = false

const menuItems = [
  {
    icon: 'thumbsUp',
    caption: 'Like',
    shortcut: '^L',
    action() {
      postNotification({
        message: 'I like it!',
        icon: 'thumbsUp',
        duration: 1
      })
    }
  },
  {
    icon: 'heart',
    caption: 'Love',
    shortcut: '⌘⇧L',
    action() {
      postNotification({
        type: 'success',
        message: 'I LOVE it!',
        icon: 'heart',
        duration: 1
      })
    }
  },
  {
    icon: 'thumbsDown',
    caption: 'dislike',
    shortcut: '⌘D',
    action() {
      postNotification({
        type: 'error',
        message: 'Awwwwwww…',
        icon: 'thumbsDown',
        duration: 1
      })
    }
  },
  null, // separator
  {
    caption: localize('Localized placeholder'),
    action() {
      alert(localize('Localized placeholder'))
    }
  },
  {
    icon: elements.span('🥹'),
    caption: 'Also see…',
    menuItems: [
      {
        icon: elements.span('😳'),
        caption: 'And that’s not all…',
        menuItems: [
          {
            icon: 'externalLink',
            caption: 'timezones',
            action: 'https://timezones.tosijs.net/'
          },
          {
            icon: 'externalLink',
            caption: 'b8rjs',
            action: 'https://b8rjs.com'
          },
          {
            caption: 'deep shortcut',
            shortcut: '⌘⇧D',
            action() {
              postNotification({
                message: 'Deep shortcut fired!',
                duration: 1
              })
            }
          },
        ]
      },
      {
        icon: 'tosi',
        caption: 'tosi',
        action: 'https://xinjs.net'
      },
      {
        icon: 'tosiPlatform',
        caption: 'tosi-platform',
        action: 'https://xinie.net'
      },
    ]
  },
  {
    icon: testingEnabled ? 'check' : '',
    caption: 'Testing Enabled',
    action() {
      testingEnabled = !testingEnabled
    }
  },
  {
    caption: 'Testing…',
    enabled() {
      return testingEnabled
    },
    menuItems: [
      {
        caption: 'one',
        shortcut: '⌘1',
        checked: () => picked === 'one',
        action () {
          picked = 'one'
        }
      },
      {
        caption: 'two',
        shortcut: '⌘2',
        checked: () => picked === 'two',
        action () {
          picked = 'two'
        }
      },
      {
        caption: 'three',
        shortcut: '⌘3',
        checked: () => picked === 'three',
        action () {
          picked = 'three'
        }
      }
    ]
  }
]

preview.addEventListener('click', (event) => {
  if (!event.target.closest('button')) {
    return
  }
  popMenu({
    target: event.target,
    menuItems
  })
})

preview.append(
  tosiMenu(
    {
      menuItems,
      localized: true,
    },
    tosiLocalized('Menu'),
    icons.chevronDown()
  )
)
```
```html
<button title="menu test">
  <tosi-icon icon="moreVertical"></tosi-icon>
</button>
<button title="menu test from bottom-right" style="position: absolute; bottom: 0; right: 0">
  <tosi-icon icon="moreVertical"></tosi-icon>
</button>
```
```css
.preview button {
  min-width: 44px;
  text-align: center;
  height: 44px;
  margin: 5px;
}
```

## Overflow test

```js
import { popMenu, icons, postNotification } from 'tosijs-ui'
import { elements } from 'tosijs'

preview.querySelector('button').addEventListener('click', (event) => {
  popMenu({
    target: event.target,
    menuItems:  Object.keys(icons).map(icon => ({
      icon,
      caption: icon,
      action() {
        postNotification({
          icon: icon,
          message: icon,
          duration: 1
        })
      }
    }))
  })
})
```
```html
<button title="big menu test" style="position: absolute; top: 0; left: 0">
  Big Menu Test
</button>
```

## popMenu({target, width, menuItems…})

```
export interface PopMenuOptions {
  target: HTMLElement
  menuItems: MenuItem[]
  width?: string | number
  position?: FloatPosition
  submenuDepth?: number   // don't set this, it's set internally by popMenu
  submenuOffset?: { x: number; y: number }
  localized?: boolean,
  showChecked?: boolean,  // if true, scroll checked item(s) into view
  hideDisabled?: boolean, // if true, non-applicable items are hidden (default: shown disabled)
  menuClass?: string,     // extra class(es) on the popup — see "Theming ONE component's menus"
}
```

`popMenu` will spawn a menu on a target element. A menu is just a `MenuItem[]`.

## MenuItem

A `MenuItem` can be one of four things:

- `null` denotes a separator
- `MenuAction` denotes a labeled button or `<a>` tag based on whether the `action` provided
  is a url (string) or an event handler (function).
- `SubMenu` is a submenu.
- A `() => HTMLElement` function returns a custom element to embed inline in
  the menu (see `MenuElement` below).

### MenuAction

Note that popMenu does not implement shortcuts for you (yet!).

```
interface MenuAction {
  caption: string
  shortcut?: string
  checked?: () => boolean
  enabled?: () => boolean
  action: ActionCallback | string
  icon?: string | Element
  tooltip?: string
  properties?: ElementProps
}
```

### SubMenu

```
interface SubMenu {
  caption: string
  enabled?: () => boolean
  menuItems: MenuItem[]
  icon?: string | Element
  tooltip?: string
  properties?: ElementProps
}
```

### MenuElement

For embedding a custom widget inline in a menu — e.g. a `<tosi-segmented>` for
quick option-picking — pass a function that returns an `HTMLElement`:

```
type MenuElement = () => HTMLElement
```

The returned element is added as-is and tagged with the `tosi-menu-element`
class, which sets `min-height` to match standard menu items so the row
aligns visually. The widget is responsible for its own click/focus behaviour.

```js
import { popMenu, tosiSegmented } from 'tosijs-ui'
import { elements } from 'tosijs'

const { button } = elements

let view = 'list'

const btn = button('View options')
btn.addEventListener('click', () => {
  popMenu({
    target: btn,
    menuItems: [
      { caption: 'Refresh', icon: 'refreshCcw', action() {} },
      null,
      () => tosiSegmented({
        choices: 'list,grid,table',
        value: view,
        style: { margin: '0 1em' },
        onChange(event) {
          view = event.target.value
        },
        // stop the menu's outer onClick from closing it when the user
        // picks a segment
        onClick(event) { event.stopPropagation() },
      }),
      null,
      { caption: 'Settings…', icon: 'settings', action() {} },
    ]
  })
})

preview.append(btn)
```

### Keyboard Shortcuts

If a menu is embodied in a `<tosi-menu>` it is supported by keyboard
shortcuts. Both text and symbolic shortcut descriptions are supported,
e.g.

- `⌘C` or `meta-C`
- `⇧P` for `shift-P`
- `^F` or `ctrl-f`
- `⌥x`, `⎇x`, `alt-x` or `option-x`

## Theming ONE component's menus

Menu metrics are all theme variables — `--menu-item-height`, `--menu-item-padding`,
`--menu-bg`, `--menu-inset`, `--menu-separator-margin`, `--menu-item-gap`. Setting them on
your component **does not work**, and it is worth knowing why rather than concluding they are
broken: the popup is built per-invocation and mounted in a body-level `<tosi-float>`, so it is
not a descendant of whatever opened it. Custom properties inherit down the DOM, so there is
nothing for them to inherit from.

The only selector that reaches it is `:root` — which restyles **every** menu on the page,
including the doc system's own if your component is documented on a `tosijs-ui/site` site. A
component reaching out to re-theme the page around it is the wrong direction.

So pass a class:

```typescript
popMenu({ target, menuItems, menuClass: 'my-editor-menu' })
```

```xml
<tosi-menu menu-class="my-editor-menu" icon="menu"></tosi-menu>
```

```scss
.my-editor-menu {
  --menu-item-height: 30px;
  --menu-item-padding: 0 16px;
}
```

The class lands on the popup beside `xin-menu tosi-menu`, takes a space-separated list, and
**propagates to submenus** — which are separate popups, so without that the theming would
apply at the top level and silently revert one level down.

`<tosi-select>` takes the same `menu-class` attribute for its listbox, which mounts the same
way.

## Localization

If you set `localized: true` in `PopMenuOptions` then menu captions will be be
passed through `localize`. You'll need to provide the appropriate localized strings,
of course.

> `<tosi-menu>` supports the `localized` attribute but it doesn't localize
> its trigger button.

To see this in action, see the example below, or look at the
[table example](?data-table.ts). It uses a `localized` menu
to render column names when you show hidden columns.

```js
import { elements } from 'tosijs'
import { tosiLocalized, localize, icons, popMenu, postNotification } from 'tosijs-ui'
const { button } = elements
const makeItem = s => ({
  caption: s,
  action() {
    postNotification({
      message: localize(s),
      duration: 1
    })
  }
})
const target = button(
  {
    onClick(event) {
      popMenu({
        target: event.target.closest('button'),
        localized: true,
        menuItems: [
          makeItem('New'),
          makeItem('Open...'),
          makeItem('Save'),
          makeItem('Close'),
        ]
      })
    }
  },
  tosiLocalized(
    { style: { marginRight: '5px' }},
    'menu'
  ),
  icons.chevronDown()
)
preview.append(target)
```

## Why another menu library?!

Support for menus is sadly lacking in HTML, and unfortunately there's a huge conceptual problem
with menus implemented the way React and React-influenced libraries work, i.e. you need
to have an instance of a menu "wrapped around" the DOM element that triggers it, whereas
a better approach (and one dating back at least as far as the original Mac UI) is to treat
a menu as a separate resource that can be instantiated on demand.

A simple example where this becomes really obvious is if you want to associate a "more options"
menu with every row of a large table. Either you end up having an enormous DOM (virtual or otherwise)
or you have to painfully swap out components on-the-fly.

And, finally, submenus are darn useful for any serious app.

For this reason, `tosijs-ui` has its own menu implementation.

## Drop Menus

`popDropMenu` extends the menu system to support drag-and-drop. A single `menuItems`
array can serve both click navigation (via `popMenu`) and drag-to-drop (via `popDropMenu`).

Items with `acceptsDrop` (array of MIME types) participate in drop mode.
Items with `dropAction` are valid drop targets. Submenus auto-disclose when
a matching drag hovers over them.

### DropMenu Interfaces

`MenuAction` and `SubMenu` gain two optional fields:

```
acceptsDrop?: string[]    // MIME types this item accepts
dropAction?: (dataTransfer: DataTransfer) => void
```

- A **SubMenu** with `acceptsDrop` auto-discloses on drag hover
- A **SubMenu** with `dropAction` can also receive drops directly
- A **MenuAction** with `dropAction` is a drop target
- Items without `acceptsDrop` are shown disabled in drop mode (or hidden if `hideDisabled` is set)

### popDropMenu({target, menuItems, dataTypes, …})

```
export interface PopDropMenuOptions extends PopMenuOptions {
  dataTypes: readonly string[]  // MIME types from the current drag
}
```

`popDropMenu` filters menuItems to only those matching `dataTypes`,
then opens the menu in drop mode. Non-matching items are shown
disabled by default; set `hideDisabled: true` to remove them entirely.

`disclosureDelay` (ms, default 200) controls how long a drag must hover
over a submenu before it auto-discloses.

### hideDisabled

By default (`hideDisabled: false`), non-matching items remain visible but disabled.
This preserves spatial stability — items don't jump around as you drag different
types. Set `hideDisabled: true` to hide them entirely for a cleaner menu.

Applies symmetrically to both `filterForDrop` and `filterForClick`.

### filterForDrop / filterForClick

```
filterForDrop(items: MenuItem[], dataTypes: readonly string[], hideDisabled?: boolean): MenuItem[]
filterForClick(items: MenuItem[], hideDisabled?: boolean): MenuItem[]
```

Utility functions to filter a single menu definition for each mode.
When `hideDisabled` is false (default), non-matching items are kept but disabled.

### TosiMenu accepts-drop

Set `accepts-drop` (semicolon-delimited MIME types) on `<tosi-menu>` to auto-open
in drop mode when a matching drag enters. Set `dropAction` to accept drops
directly on the trigger (e.g. saving to the root folder). Set `disclosure-delay`
(ms) to control submenu auto-disclosure speed.

    <tosi-menu accepts-drop="text/plain;text/html" disclosure-delay="150">Files</tosi-menu>

    menuElement.dropAction = (data) => saveToRoot(data)

### Drop Menu Example

```js
import { popMenu, popDropMenu, tosiMenu, dragAndDrop, icons, postNotification } from 'tosijs-ui'
import { elements } from 'tosijs'

dragAndDrop.init()

const { button, div, span } = elements

const adjectives = ['Important', 'Old', 'Shared', 'Archive', 'Draft', 'Final', 'Review', 'Backup']
const randomFolders = (type) => () => {
  const count = 2 + Math.floor(Math.random() * 3)
  const picked = []
  const pool = [...adjectives]
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked.map(name => ({
    caption: name,
    icon: 'folder',
    acceptsDrop: [type],
    dropAction(data) {
      postNotification({
        type: 'success',
        message: 'Saved to ' + name + ': ' + (data.getData(type) || 'file'),
        duration: 2
      })
    },
    action() {
      postNotification({ message: 'Opened ' + name, duration: 1 })
    },
  }))
}

const menuItems = [
  {
    caption: 'Documents',
    icon: 'folder',
    acceptsDrop: ['text/*'],
    dropAction(data) {
      postNotification({
        type: 'success',
        message: 'Saved to Documents: ' + (data.getData('text/plain') || data.getData('text/html')),
        duration: 2
      })
    },
    action() {
      postNotification({ message: 'Navigated to Documents', duration: 1 })
    },
    menuItems: [
      {
        caption: 'Text Files',
        icon: 'folder',
        acceptsDrop: ['text/plain'],
        dropAction(data) {
          postNotification({
            type: 'success',
            message: 'Saved to Text Files: ' + data.getData('text/plain'),
            duration: 2
          })
        },
        action() {
          postNotification({ message: 'Navigated to Text Files', duration: 1 })
        },
        menuItems: randomFolders('text/plain'),
      },
      {
        caption: 'HTML Files',
        icon: 'folder',
        acceptsDrop: ['text/html'],
        dropAction(data) {
          postNotification({
            type: 'success',
            message: 'Saved to HTML Files: ' + data.getData('text/html'),
            duration: 2
          })
        },
        action() {
          postNotification({ message: 'Navigated to HTML Files', duration: 1 })
        },
        menuItems: randomFolders('text/html'),
      },
      {
        caption: 'readme.txt',
        icon: 'file',
        action() {
          postNotification({ message: 'Opened readme.txt', duration: 1 })
        },
      },
    ]
  },
  null,
  {
    caption: 'Trash',
    icon: 'trash',
    acceptsDrop: ['special/any'],
    dropAction(data) {
      postNotification({
        type: 'error',
        message: 'Trashed: ' + (data.getData('text/plain') || 'item'),
        duration: 2
      })
    },
    action() {
      postNotification({ message: 'Opened Trash', duration: 1 })
    },
  },
]

const clickBtn = button('Click: Browse Files', {
  onClick(event) {
    popMenu({ target: event.target.closest('button'), menuItems })
  }
})

const dropMenu = tosiMenu(
  {
    menuItems,
    acceptsDrop: 'text/plain;text/html',
    dropAction(data) {
      postNotification({
        type: 'success',
        message: 'Saved to root: ' + (data.getData('text/plain') || data.getData('text/html')),
        duration: 2
      })
    },
  },
  icons.folder(),
  span(' Drop (show all)')
)

const dropMenuHidden = tosiMenu(
  {
    menuItems,
    acceptsDrop: 'text/plain;text/html',
    hideDisabled: true,
    dropAction(data) {
      postNotification({
        type: 'success',
        message: 'Saved to root: ' + (data.getData('text/plain') || data.getData('text/html')),
        duration: 2
      })
    },
  },
  icons.folder(),
  span(' Drop (hide disabled)')
)

preview.append(
  div(
    { style: { display: 'flex', gap: '10px', alignItems: 'flex-start' } },
    div(
      { draggable: 'true', dataDrag: 'text/plain', dataDragContent: 'quarterly-report.txt', style: { padding: '8px', border: '1px dashed #888', borderRadius: '4px', cursor: 'grab' } },
      'quarterly-report.txt'
    ),
    div(
      { draggable: 'true', dataDrag: 'text/html', dataDragContent: '<b>notes</b>', style: { padding: '8px', border: '1px dashed #888', borderRadius: '4px', cursor: 'grab' } },
      'notes.html'
    ),
  ),
  div(
    { style: { display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' } },
    clickBtn,
    dropMenu,
    dropMenuHidden,
  )
)
```
```css
.preview {
  padding: 10px;
}
```

> **Try it:** Click "Browse Files" to navigate the menu normally.
> Drag a file over "Drop (show all)" — non-matching items appear
> disabled. Drag over "Drop (hide disabled)" — non-matching items
> are hidden entirely. "Text Files" only accepts .txt, "HTML Files"
> only accepts .html. Subfolders are randomly generated each time
> a folder is disclosed (dynamic `menuItems`).

## Shadow DOM

Menus work when triggered from inside a shadow DOM. Clicking outside
the menu dismisses it; clicking the shadow DOM target toggles it.

```js
import { popMenu, removeLastMenu } from 'tosijs-ui'

class ShadowMenuHost extends HTMLElement {
  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'padding: 20px; background: #d0dce8; border-radius: 8px; display: inline-block'
    const btn = document.createElement('button')
    btn.textContent = 'Shadow Menu'
    btn.id = 'shadow-btn'
    btn.style.cssText = 'padding: 8px 16px; cursor: pointer'
    btn.addEventListener('click', () => {
      popMenu({
        target: btn,
        menuItems: [
          { caption: 'Alpha', action() {} },
          { caption: 'Bravo', action() {} },
          { caption: 'Charlie', action() {} },
        ]
      })
    })
    wrapper.appendChild(btn)
    shadow.appendChild(wrapper)
  }
}
if (!customElements.get('shadow-menu-host')) {
  customElements.define('shadow-menu-host', ShadowMenuHost)
}

const host = document.createElement('shadow-menu-host')
const outside = document.createElement('button')
outside.textContent = 'Click to dismiss'
outside.id = 'outside-btn'
outside.style.cssText = 'padding: 8px 16px; margin-left: 10px'
preview.append(host, outside)
```
```test
import { removeLastMenu } from 'tosijs-ui'

test('shadow DOM menu: open and dismiss', async () => {
  const host = preview.querySelector('shadow-menu-host')
  const btn = host.shadowRoot.querySelector('#shadow-btn')
  const countFloats = () => document.querySelectorAll('tosi-float').length

  // opens from shadow DOM button click
  const before = countFloats()
  btn.click()
  await waitMs(100)
  expect(countFloats()).toBe(before + 1)

  // removeLastMenu dismisses it
  removeLastMenu(0)
  expect(countFloats()).toBe(before)

  // re-open and verify target mousedown keeps it open
  btn.click()
  await waitMs(100)
  expect(countFloats()).toBe(before + 1)
  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }))
  await waitMs(100)
  expect(countFloats()).toBe(before + 1)
  removeLastMenu(0)
})
```

## Menu Item Tooltips

Add `tooltip` to any menu item to show a tooltip on hover (requires
`initTooltips()`).

```js
import { elements } from 'tosijs'
import { popMenu, initTooltips, icons } from 'tosijs-ui'

initTooltips()

const { button } = elements
const btn = button('Tooltipped Menu')

btn.addEventListener('click', () => {
  popMenu({
    target: btn,
    menuItems: [
      { caption: 'Copy', icon: 'copy', tooltip: 'Copy to **clipboard**', shortcut: '⌘C', action() {} },
      { caption: 'Paste', icon: 'clipboard', tooltip: 'Paste from clipboard', shortcut: '⌘V', action() {} },
      null,
      { caption: 'Export', icon: 'download', tooltip: 'Export as `JSON` or `CSV`', menuItems: [
        { caption: 'JSON', action() {} },
        { caption: 'CSV', action() {} },
      ]},
    ]
  })
})

preview.append(btn)
```
