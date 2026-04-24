/*#
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
}
```

`popMenu` will spawn a menu on a target element. A menu is just a `MenuItem[]`.

## MenuItem

A `MenuItem` can be one of three things:

- `null` denotes a separator
- `MenuAction` denotes a labeled button or `<a>` tag based on whether the `action` provided
  is a url (string) or an event handler (function).
- `SubMenu` is a submenu.

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

### Keyboard Shortcuts

If a menu is embodied in a `<tosi-menu>` it is supported by keyboard
shortcuts. Both text and symbolic shortcut descriptions are supported,
e.g.

- `⌘C` or `meta-C`
- `⇧P` for `shift-P`
- `^F` or `ctrl-f`
- `⌥x`, `⎇x`, `alt-x` or `option-x`

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

*/

import {
  elements,
  ElementProps,
  varDefault,
  vars,
  StyleSheet,
  Component,
  PartsMap,
} from 'tosijs'
import { popFloat, FloatPosition } from './pop-float'
import { icons, SvgIcon } from './icons'
import { localize } from './localize'
import { matchShortcut, displayShortcut } from './match-shortcut'
import { isTypeAllowed, stringToTypes } from './drag-and-drop'

export type ActionCallback = () => void | Promise<void>

export interface MenuAction {
  caption: string
  shortcut?: string
  checked?: () => boolean
  enabled?: () => boolean
  action: ActionCallback | string
  icon?: string | Element
  tooltip?: string
  properties?: ElementProps
  acceptsDrop?: string[]
  dropAction?: (dataTransfer: DataTransfer) => void
}

export type MenuItemsProvider = MenuItem[] | (() => MenuItem[])

export interface SubMenu {
  caption: string
  checked?: () => boolean
  enabled?: () => boolean
  menuItems: MenuItemsProvider
  icon?: string | Element
  tooltip?: string
  properties?: ElementProps
  acceptsDrop?: string[]
  dropAction?: (dataTransfer: DataTransfer) => void
}

export type MenuSeparator = null

export type MenuItem = MenuAction | SubMenu | MenuSeparator

export const resolveMenuItems = (provider: MenuItemsProvider): MenuItem[] =>
  typeof provider === 'function' ? provider() : provider

const { div, button, span, a, tosiSlot } = elements

const cleanSeparators = (items: MenuItem[]): MenuItem[] => {
  const result: MenuItem[] = []
  for (const item of items) {
    if (item === null) {
      if (result.length > 0 && result[result.length - 1] !== null) {
        result.push(item)
      }
    } else {
      result.push(item)
    }
  }
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop()
  }
  return result
}

export const filterForDrop = (
  items: MenuItem[],
  dataTypes: readonly string[],
  hideDisabled = false
): MenuItem[] => {
  const filtered: MenuItem[] = []
  for (const item of items) {
    if (item === null) {
      filtered.push(item)
      continue
    }
    const { acceptsDrop } = item
    if (!acceptsDrop) {
      if (!hideDisabled) {
        filtered.push({ ...item, enabled: () => false } as MenuItem)
      }
      continue
    }
    const matches = dataTypes.some((t) => isTypeAllowed(acceptsDrop, t))
    if (!matches) {
      if (!hideDisabled) {
        filtered.push({ ...item, enabled: () => false } as MenuItem)
      }
      continue
    }
    const subMenu = item as SubMenu
    if (subMenu.menuItems) {
      // Always check with hideDisabled=true to see if there are valid children
      const validChildren = filterForDrop(
        resolveMenuItems(subMenu.menuItems),
        dataTypes,
        true
      )
      if (validChildren.length > 0 || subMenu.dropAction) {
        const childItems = hideDisabled
          ? validChildren
          : filterForDrop(resolveMenuItems(subMenu.menuItems), dataTypes, false)
        filtered.push({ ...subMenu, menuItems: childItems })
      } else if (!hideDisabled) {
        filtered.push({ ...subMenu, enabled: () => false } as MenuItem)
      }
    } else {
      filtered.push(item)
    }
  }
  return cleanSeparators(filtered)
}

export const filterForClick = (
  items: MenuItem[],
  hideDisabled = false
): MenuItem[] => {
  const filtered: MenuItem[] = []
  for (const item of items) {
    if (item === null) {
      filtered.push(item)
      continue
    }
    const action = (item as MenuAction).action
    const menuItemsProvider = (item as SubMenu).menuItems
    if (action || menuItemsProvider) {
      if (menuItemsProvider) {
        // Always check with hideDisabled=true to see if there are valid children
        const validChildren = filterForClick(
          resolveMenuItems(menuItemsProvider),
          true
        )
        if (validChildren.length > 0) {
          const childItems = hideDisabled
            ? validChildren
            : filterForClick(resolveMenuItems(menuItemsProvider), false)
          filtered.push({ ...item, menuItems: childItems } as SubMenu)
        } else if (!hideDisabled) {
          filtered.push({ ...item, enabled: () => false } as MenuItem)
        }
      } else {
        filtered.push(item)
      }
    } else if (!hideDisabled) {
      filtered.push({ ...item, enabled: () => false } as MenuItem)
    }
  }
  return cleanSeparators(filtered)
}

// @deprecated xin-menu-* classes — use tosi-menu-* instead; remove in next major
const menuStyles = {
  overflow: 'hidden auto',
  maxHeight: `calc(${vars.maxHeight} - ${varDefault.menuInset('8px')})`,
  borderRadius: vars.spacing50,
  background: varDefault.menuBg('#fafafa'),
  boxShadow: varDefault.menuShadow(
    `${vars.spacing13} ${vars.spacing50} ${vars.spacing} #0004`
  ),
}
const menuItemStyles = {
  boxShadow: 'none',
  border: 'none !important',
  display: 'grid',
  alignItems: 'center',
  justifyContent: 'flex-start',
  textDecoration: 'none',
  gridTemplateColumns: '0px 1fr 30px',
  width: '100%',
  gap: 0,
  background: 'transparent',
  padding: varDefault.menuItemPadding('0 8px'),
  height: varDefault.menuItemHeight('48px'),
  lineHeight: varDefault.menuItemHeight('48px'),
  textAlign: 'left',
}
const menuItemColorStyles = {
  color: varDefault.menuItemColor('#222'),
}
const menuItemHoverStyles = {
  boxShadow: 'none !important',
  background: varDefault.menuItemHoverBg('#eee'),
}
const menuItemActiveStyles = {
  boxShadow: 'none !important',
  background: varDefault.menuItemActiveBg('#aaa'),
  color: varDefault.menuItemActiveColor('#000'),
}
const dropOverStyles = {
  background: `${varDefault.menuDropOverBg('#2196F3')} !important`,
  color: `${varDefault.menuDropOverColor('#fff')} !important`,
}
const dropOverSpanStyles = {
  color: `${varDefault.menuDropOverColor('#fff')} !important`,
}
const dropOverSvgStyles = {
  stroke: `${varDefault.menuDropOverColor('#fff')} !important`,
}
const dragTargetHoverStyles = {
  boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${varDefault.menuDropOverBg(
    '#2196F3'
  )} 50%, transparent) !important`,
}

StyleSheet('xin-menu-helper', {
  '.xin-menu, .tosi-menu': menuStyles,
  '.xin-menu > div, .tosi-menu > div': {
    width: varDefault.menuWidth('auto'),
  },
  '.xin-menu-trigger, .tosi-menu-trigger': {
    paddingLeft: 0,
    paddingRight: 0,
    minWidth: varDefault.touchSize('48px'),
  },
  '.xin-menu-separator, .tosi-menu-separator': {
    display: 'inline-block',
    content: ' ',
    height: '1px',
    width: '100%',
    background: varDefault.menuSeparatorColor('#2224'),
    margin: varDefault.menuSeparatorMargin('8px 0'),
  },
  '.xin-menu-item, .tosi-menu-item': menuItemStyles,
  '.xin-menu-item, .xin-menu-item > span, .tosi-menu-item, .tosi-menu-item > span':
    menuItemColorStyles,
  '.xin-menu-with-icons .xin-menu-item, .tosi-menu-with-icons .tosi-menu-item':
    {
      gridTemplateColumns: '24px 1fr 30px',
      gap: varDefault.menuItemGap('4px'),
    },
  '.xin-menu-item > :first-child, .tosi-menu-item > :first-child': {
    justifySelf: 'center',
    alignSelf: 'center',
  },
  '.xin-menu-item svg, .tosi-menu-item svg': {
    stroke: varDefault.menuItemIconColor('#222'),
  },
  '.xin-menu-item.xin-menu-item-checked, .tosi-menu-item.tosi-menu-item-checked':
    {
      background: varDefault.menuItemHoverBg('#eee'),
    },
  '.xin-menu-item > span:nth-child(2), .tosi-menu-item > span:nth-child(2)': {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'left',
  },
  '.xin-menu-item:hover, .tosi-menu-item:hover': menuItemHoverStyles,
  '.xin-menu-item.drag-target:hover, .tosi-menu-item.drag-target:hover':
    dragTargetHoverStyles,
  '.xin-menu-item:active, .tosi-menu-item:active': menuItemActiveStyles,
  '.xin-menu-item:active svg, .tosi-menu-item:active svg': {
    stroke: varDefault.menuItemIconActiveColor('#000'),
  },
  '.xin-menu-item-highlight, .tosi-menu-item-highlight': menuItemActiveStyles,
  '.xin-menu-item-highlight svg, .tosi-menu-item-highlight svg': {
    stroke: varDefault.menuItemIconActiveColor('#000'),
  },
  '.xin-drop-over, .tosi-drop-over': dropOverStyles,
  '.xin-drop-over > span, .tosi-drop-over > span': dropOverSpanStyles,
  '.xin-drop-over svg, .tosi-drop-over svg': dropOverSvgStyles,
  '.drag-target': dragTargetHoverStyles,
})

export const createMenuAction = (
  item: MenuAction,
  options: PopMenuOptions
): HTMLElement => {
  const checked = (item.checked && item.checked() && 'check') || false
  let icon = item?.icon || checked || span(' ')
  if (typeof icon === 'string') {
    icon = icons[icon]()
  }
  const itemRole = options.role === 'listbox' ? 'option' : 'menuitem'
  let menuItem: HTMLElement
  const props = item.properties || {}
  if (typeof item?.action === 'string') {
    menuItem = a(
      {
        class: 'xin-menu-item tosi-menu-item',
        role: itemRole,
        href: item.action,
      },
      props,
      icon,
      options.localized ? span(localize(item.caption)) : span(item.caption),
      span(item.shortcut ? displayShortcut(item.shortcut) : ' ')
    )
  } else {
    menuItem = button(
      {
        class: 'xin-menu-item tosi-menu-item',
        role: itemRole,
        onClick: item.action,
      },
      props,
      icon,
      options.localized ? span(localize(item.caption)) : span(item.caption),
      span(item.shortcut ? displayShortcut(item.shortcut) : ' ')
    )
  }
  menuItem.classList.toggle('xin-menu-item-checked', checked !== false)
  menuItem.classList.toggle('tosi-menu-item-checked', checked !== false)
  if (item.tooltip) {
    menuItem.dataset.tooltip = item.tooltip
  }
  if (options.role === 'listbox' && checked) {
    menuItem.setAttribute('aria-selected', 'true')
  }
  if (item?.enabled && !item.enabled()) {
    menuItem.setAttribute('disabled', '')
    menuItem.setAttribute('aria-disabled', 'true')
  }
  return menuItem
}

export const createDropMenuItem = (
  item: MenuAction,
  options: PopMenuOptions
): HTMLElement => {
  let icon = item?.icon || span(' ')
  if (typeof icon === 'string') {
    icon = icons[icon]()
  }
  const props = item.properties || {}
  const menuItem = button(
    {
      class: 'xin-menu-item tosi-menu-item',
      onDragenter(event: DragEvent) {
        clearDropGraceTimer()
        menuItem.classList.add('xin-drop-over', 'tosi-drop-over')
        event.preventDefault()
      },
      onDragover(event: DragEvent) {
        event.preventDefault()
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'copy'
        }
      },
      onDragleave(event: DragEvent) {
        const related = event.relatedTarget as Node | null
        if (related && menuItem.contains(related)) return
        menuItem.classList.remove('xin-drop-over', 'tosi-drop-over')
      },
      onDrop(event: DragEvent) {
        event.preventDefault()
        event.stopPropagation()
        menuItem.classList.remove('xin-drop-over', 'tosi-drop-over')
        if (item.dropAction && event.dataTransfer) {
          item.dropAction(event.dataTransfer)
        }
        removeLastMenu(0)
      },
    },
    props,
    icon,
    options.localized ? span(localize(item.caption)) : span(item.caption),
    span(' ')
  )
  if (item.tooltip) {
    menuItem.dataset.tooltip = item.tooltip
  }
  if (item.dropAction && item.acceptsDrop) {
    menuItem.dataset.drop = item.acceptsDrop.join(';')
  }
  if (item?.enabled && !item.enabled()) {
    menuItem.setAttribute('disabled', '')
    menuItem.setAttribute('aria-disabled', 'true')
  }
  return menuItem
}

export const createSubMenu = (
  item: SubMenu,
  options: PopMenuOptions
): HTMLElement => {
  const checked = (item.checked && item.checked() && 'check') || false
  let icon = item?.icon || checked || span(' ')
  if (typeof icon === 'string') {
    icon = icons[icon]()
  }

  let disclosureTimer: ReturnType<typeof setTimeout> | null = null
  let disclosed = false

  const props = item.properties || {}
  const submenuItem = button(
    {
      class: 'xin-menu-item tosi-menu-item',
      disabled: !(!item.enabled || item.enabled()),
      onClick(event: Event) {
        if (options._dropMode) return
        popMenu(
          Object.assign({}, options, {
            menuItems: resolveMenuItems(item.menuItems),
            target: submenuItem,
            submenuDepth: (options.submenuDepth || 0) + 1,
            position: 'side',
          })
        )
        event.stopPropagation()
        event.preventDefault()
      },
      onDragenter(event: DragEvent) {
        if (!options._dropMode) return
        clearDropGraceTimer()
        event.preventDefault()
        event.stopPropagation()
        const from = event.relatedTarget as Node | null
        // Ignore dragenter from own child elements (icon, text, chevron)
        if (from && submenuItem.contains(from)) return
        submenuItem.classList.add('xin-drop-over', 'tosi-drop-over')
        if (disclosed) {
          // Dragged back to this item — close child menus, don't re-disclose
          removeLastMenu((options.submenuDepth || 0) + 1)
          disclosed = false
          if (disclosureTimer) clearTimeout(disclosureTimer)
          disclosureTimer = null
          return
        }
        if (disclosureTimer) clearTimeout(disclosureTimer)
        disclosureTimer = setTimeout(() => {
          disclosed = true
          const resolved = resolveMenuItems(item.menuItems)
          const filteredItems = options._dataTypes
            ? filterForDrop(resolved, options._dataTypes, options.hideDisabled)
            : resolved
          if (filteredItems.length > 0) {
            popMenu(
              Object.assign({}, options, {
                menuItems: filteredItems,
                target: submenuItem,
                submenuDepth: (options.submenuDepth || 0) + 1,
                position: 'side',
                _dropMode: true,
                _dataTypes: options._dataTypes,
              })
            )
          }
        }, options.disclosureDelay ?? 200)
      },
      onDragover(event: DragEvent) {
        if (!options._dropMode) return
        event.preventDefault()
        event.stopPropagation()
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = item.dropAction ? 'copy' : 'link'
        }
      },
      onDragleave(event: DragEvent) {
        if (!options._dropMode) return
        const related = event.relatedTarget as Node | null
        if (related && submenuItem.contains(related)) return
        // Keep highlight if cursor moved into the disclosed child menu
        if (
          disclosed &&
          related &&
          poppedMenus.some(
            (p) => p.menu.contains(related) || p.target.contains(related)
          )
        ) {
          return
        }
        submenuItem.classList.remove('xin-drop-over', 'tosi-drop-over')
        if (disclosureTimer) {
          clearTimeout(disclosureTimer)
          disclosureTimer = null
        }
      },
      onDrop(event: DragEvent) {
        if (!options._dropMode || !item.dropAction) return
        event.preventDefault()
        event.stopPropagation()
        submenuItem.classList.remove('xin-drop-over', 'tosi-drop-over')
        if (event.dataTransfer) {
          item.dropAction(event.dataTransfer)
        }
        removeLastMenu(0)
      },
    },
    props,
    icon,
    options.localized ? span(localize(item.caption)) : span(item.caption),
    icons.chevronRight({ style: { justifySelf: 'flex-end' } })
  )
  if (item.tooltip) {
    submenuItem.dataset.tooltip = item.tooltip
  }
  if (options._dropMode && item.dropAction && item.acceptsDrop) {
    submenuItem.dataset.drop = item.acceptsDrop.join(';')
  }
  return submenuItem
}

export const createMenuItem = (
  item: MenuItem,
  options: PopMenuOptions
): HTMLElement => {
  if (item === null) {
    return span({ class: 'xin-menu-separator tosi-menu-separator' })
  } else if (options._dropMode) {
    const sub = item as SubMenu
    const hasChildren =
      sub.menuItems && resolveMenuItems(sub.menuItems).length > 0
    if (hasChildren) {
      return createSubMenu(sub, options)
    } else if ((item as MenuAction).dropAction) {
      return createDropMenuItem(item as MenuAction, options)
    } else {
      // Drop mode item with acceptsDrop but no dropAction and no children
      // Render as non-interactive label
      let icon = item?.icon || span(' ')
      if (typeof icon === 'string') {
        icon = icons[icon]()
      }
      return button(
        {
          class: 'xin-menu-item tosi-menu-item',
          disabled: true,
        },
        icon,
        options.localized ? span(localize(item.caption)) : span(item.caption),
        span(' ')
      )
    }
  } else {
    const createdItem = (item as MenuAction)?.action
      ? createMenuAction(item as MenuAction, options)
      : createSubMenu(item as SubMenu, options)
    if (options.showChecked && item.checked && item.checked()) {
      requestAnimationFrame(() => {
        createdItem.scrollIntoView({ block: 'center' })
      })
    }
    return createdItem
  }
}

export const menu = (options: PopMenuOptions): HTMLDivElement => {
  const { target, width, menuItems, role = 'menu' } = options
  const hasIcons = menuItems.find(
    (item) => item?.icon || (item as MenuAction)?.checked
  )

  const menuDepth = options.submenuDepth || 0

  const menuDiv = div(
    {
      class: hasIcons
        ? 'xin-menu tosi-menu xin-menu-with-icons tosi-menu-with-icons'
        : 'xin-menu tosi-menu',
      role,
      onClick() {
        if (!options._dropMode) {
          removeLastMenu(0)
        }
      },
      onDragover(event: DragEvent) {
        if (!options._dropMode) return
        event.preventDefault()
      },
      onDragenter() {
        if (!options._dropMode) return
        clearDropGraceTimer()
      },
      onDragleave(event: DragEvent) {
        if (!options._dropMode) return
        const related = event.relatedTarget as Node | null
        if (related && menuDiv.contains(related)) return
        // Check if we moved into a child submenu float
        if (
          related &&
          poppedMenus.some(
            (p) => p.menu.contains(related) || p.target.contains(related)
          )
        ) {
          return
        }
        startDropGraceTimer(menuDepth)
      },
    },
    div(
      {
        style: {
          minWidth: target.offsetWidth + 'px',
          width: typeof width === 'number' ? `${width}px` : width,
        },
        onMousedown(event: Event) {
          event.preventDefault()
          event.stopPropagation()
        },
      },
      ...menuItems.map((item) => createMenuItem(item, options))
    )
  )
  return menuDiv
}

interface PoppedMenu {
  target: HTMLElement
  menu: HTMLElement
  onClose?: () => void
}
let lastPopped: PoppedMenu | undefined
const poppedMenus: PoppedMenu[] = []
let dropGraceTimer: ReturnType<typeof setTimeout> | null = null

const clearDropGraceTimer = () => {
  if (dropGraceTimer) {
    clearTimeout(dropGraceTimer)
    dropGraceTimer = null
  }
}

const startDropGraceTimer = (depth: number) => {
  clearDropGraceTimer()
  dropGraceTimer = setTimeout(() => {
    dropGraceTimer = null
    removeLastMenu(depth)
  }, 500)
}

export const removeLastMenu = (depth = 0): PoppedMenu | undefined => {
  clearDropGraceTimer()
  if (depth === 0) {
    document
      .querySelectorAll('tosi-menu.xin-drop-over, tosi-menu.tosi-drop-over')
      .forEach((el) =>
        el.classList.remove('xin-drop-over', 'tosi-drop-over')
      )
  }
  const toBeRemoved = poppedMenus.splice(depth)
  for (const popped of toBeRemoved) {
    popped.menu.remove()
    if (popped.onClose) {
      popped.onClose()
    }
  }
  lastPopped = toBeRemoved[0]
  return depth > 0 ? poppedMenus[depth - 1] : undefined
}

export interface PopMenuOptions {
  target: HTMLElement
  menuItems: MenuItem[]
  width?: string | number
  position?: FloatPosition
  submenuDepth?: number
  submenuOffset?: { x: number; y: number }
  localized?: boolean
  showChecked?: boolean
  hideDisabled?: boolean
  onClose?: () => void
  role?: 'menu' | 'listbox'
  _dropMode?: boolean
  _dataTypes?: readonly string[]
  disclosureDelay?: number
}

export interface PopDropMenuOptions
  extends Omit<PopMenuOptions, '_dropMode' | '_dataTypes'> {
  dataTypes: readonly string[]
}

document.addEventListener('mousedown', (event: Event) => {
  if (poppedMenus.length === 0) return
  const path = event.composedPath()
  if (
    !poppedMenus.find(
      (popped) => path.includes(popped.target) || path.includes(popped.menu)
    )
  ) {
    removeLastMenu(0)
  }
})
document.body.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    removeLastMenu(0)
  }
})

export const popMenu = (options: PopMenuOptions): void => {
  options = Object.assign({ submenuDepth: 0 }, options)
  const { target, position, submenuDepth } = options
  if (lastPopped && !document.body.contains(lastPopped?.menu)) {
    lastPopped = undefined
  }
  if (poppedMenus.length && !document.body.contains(poppedMenus[0].menu)) {
    poppedMenus.splice(0)
  }
  if (options._dropMode) {
    // In drop mode, don't toggle — just ensure the right depth is open
    // If this exact submenu is already open at this depth, leave it
    if (
      poppedMenus.length > submenuDepth! &&
      poppedMenus[submenuDepth!]?.target === target
    ) {
      return
    }
    removeLastMenu(submenuDepth)
  } else {
    if (submenuDepth === 0 && lastPopped?.target === target) return
    const popped = removeLastMenu(submenuDepth)
    if (lastPopped?.target === target) return
    if (popped && popped.target === target) {
      removeLastMenu()
      return
    }
  }

  if (!options.menuItems?.length) {
    return
  }
  const content = menu(options)
  const float = popFloat({
    content,
    target,
    position,
  })
  float.remainOnScroll = options._dropMode ? 'remain' : 'remove'
  poppedMenus.push({
    target,
    menu: float,
    onClose: options.onClose,
  })
}

export const popDropMenu = (options: PopDropMenuOptions): void => {
  const { dataTypes, ...rest } = options
  const filtered = filterForDrop(
    options.menuItems,
    dataTypes,
    options.hideDisabled
  )
  if (!filtered.length) return
  popMenu({
    ...rest,
    menuItems: filtered,
    _dropMode: true,
    _dataTypes: dataTypes,
  })
}

interface ShortcutMatch {
  action: MenuAction
  path: SubMenu[]
}

export function findShortcutAction(
  items: MenuItem[],
  event: KeyboardEvent,
  path: SubMenu[] = []
): ShortcutMatch | undefined {
  for (const item of items) {
    if (!item) continue
    const { shortcut } = item as MenuAction
    const { menuItems } = item as SubMenu

    if (shortcut) {
      if (matchShortcut(event, shortcut)) {
        const menuAction = item as MenuAction
        // Check if the action itself is disabled
        if (menuAction.enabled && !menuAction.enabled()) return undefined
        // Check if any parent submenu is disabled
        if (path.some((sub) => sub.enabled && !sub.enabled())) return undefined
        return { action: menuAction, path }
      }
    } else if (menuItems) {
      const found = findShortcutAction(resolveMenuItems(menuItems), event, [
        ...path,
        item as SubMenu,
      ])
      if (found) return found
    }
  }
  return undefined
}

interface TosiMenuParts extends PartsMap {
  trigger: HTMLButtonElement
  icon: SvgIcon
}

export class TosiMenu extends Component<TosiMenuParts> {
  static preferredTagName = 'tosi-menu'
  static lightStyleSpec = {
    ':host': {
      display: 'inline-flex',
      minWidth: vars.touchSize,
      minHeight: vars.touchSize,
    },
    ':host button': {
      margin: 0,
      padding: 0,
      alignSelf: 'stretch',
      flex: '1',
      textAlign: 'center',
    },
    ':host button > tosi-slot': {
      display: 'flex',
      alignItems: 'center',
      gap: varDefault.tosiMenuTriggerGap('10px'),
    },
  }

  static initAttributes = {
    menuWidth: 'auto',
    localized: false,
    icon: '',
    acceptsDrop: '',
    disclosureDelay: 0,
    hideDisabled: false,
  }

  menuItems: MenuItem[] = []
  dropAction: ((dataTransfer: DataTransfer) => void) | null = null

  private _dragMatches = false

  private _matchesDrag(event: DragEvent): boolean {
    if (!this.acceptsDrop) return false
    const accepted = stringToTypes(this.acceptsDrop)
    const dragTypes = [...(event.dataTransfer?.types || [])]
    return dragTypes.some((t) => accepted.some((a) => isTypeAllowed([a], t)))
  }

  showMenu = (event: Event) => {
    if (event.type === 'click' || (event as KeyboardEvent).code === 'Space') {
      popMenu({
        target: this.parts.trigger,
        width: this.menuWidth,
        localized: this.localized,
        menuItems: this.menuItems,
      })
      event.stopPropagation()
      event.preventDefault()
    }
  }

  handleDragEnter = (event: DragEvent) => {
    this._dragMatches = this._matchesDrag(event)
    if (!this._dragMatches) return
    clearDropGraceTimer()
    this.classList.add('xin-drop-over', 'tosi-drop-over')
    const dragTypes = [...(event.dataTransfer?.types || [])]
    if (this.menuItems.length) {
      popDropMenu({
        target: this.parts.trigger,
        menuItems: this.menuItems,
        dataTypes: dragTypes,
        width: this.menuWidth,
        localized: this.localized,
        disclosureDelay: this.disclosureDelay || undefined,
        hideDisabled: this.hideDisabled,
      })
    }
    event.preventDefault()
  }

  handleDragOver = (event: DragEvent) => {
    if (!this._dragMatches) return
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = this.dropAction ? 'copy' : 'link'
    }
  }

  handleDragLeave = (event: DragEvent) => {
    if (!this._dragMatches) return
    const related = event.relatedTarget as Node | null
    if (related && this.contains(related)) return
    // Check if moved into an open drop menu
    if (
      related &&
      poppedMenus.some(
        (p) => p.menu.contains(related) || p.target.contains(related)
      )
    ) {
      this.classList.remove('xin-drop-over', 'tosi-drop-over')
      return
    }
    this.classList.remove('xin-drop-over', 'tosi-drop-over')
    startDropGraceTimer(0)
  }

  handleDrop = (event: DragEvent) => {
    if (!this._dragMatches || !this.dropAction) return
    event.preventDefault()
    event.stopPropagation()
    this.classList.remove('xin-drop-over', 'tosi-drop-over')
    if (event.dataTransfer) {
      this.dropAction(event.dataTransfer)
    }
    removeLastMenu(0)
  }

  content = () =>
    button({ tabindex: 0, part: 'trigger', onClick: this.showMenu }, tosiSlot())

  handleShortcut = async (event: KeyboardEvent) => {
    const match = findShortcutAction(this.menuItems, event)
    if (!match) return

    event.preventDefault()
    event.stopImmediatePropagation()

    const { action: menuAction, path } = match

    // Animate: disclose menu path, highlight item, then execute
    if (this.isConnected && document.body.contains(this)) {
      await this.animateShortcut(path, menuAction)
    }

    if (menuAction.action instanceof Function) {
      menuAction.action()
    }
  }

  private findMenuItemByCaption(
    container: Element,
    caption: string
  ): HTMLElement | null {
    for (const el of container.querySelectorAll('.xin-menu-item')) {
      // Menu items are: icon (svg or span), span(caption), span(shortcut/chevron)
      // Caption is always children[1]
      const captionEl = el.children[1]
      if (captionEl && captionEl.textContent === caption) {
        return el as HTMLElement
      }
    }
    return null
  }

  private async animateShortcut(
    path: SubMenu[],
    action: MenuAction
  ): Promise<void> {
    // Ensure any existing menus are closed first
    removeLastMenu(0)

    // Open root menu
    popMenu({
      target: this.parts.trigger,
      width: this.menuWidth,
      localized: this.localized,
      menuItems: this.menuItems,
    })
    await new Promise((r) => setTimeout(r, 80))

    // Disclose each submenu in the path
    for (let i = 0; i < path.length; i++) {
      const depth = i + 1
      const parentFloat = poppedMenus[i]?.menu
      if (!parentFloat) break

      const submenuEl = this.findMenuItemByCaption(parentFloat, path[i].caption)
      if (!submenuEl) break

      popMenu({
        target: submenuEl,
        width: this.menuWidth,
        localized: this.localized,
        menuItems: resolveMenuItems(path[i].menuItems),
        submenuDepth: depth,
        position: 'side' as FloatPosition,
      })
      await new Promise((r) => setTimeout(r, 80))
    }

    // Highlight the matching action item
    const lastFloat = poppedMenus[poppedMenus.length - 1]?.menu
    if (lastFloat) {
      const itemEl = this.findMenuItemByCaption(lastFloat, action.caption)
      if (itemEl) {
        itemEl.classList.add('xin-menu-item-highlight', 'tosi-menu-item-highlight')
      }
    }

    // Brief pause so user can see the highlight
    await new Promise((r) => setTimeout(r, 300))

    // Close everything
    removeLastMenu(0)
  }

  constructor() {
    super()
    this.addEventListener('keydown', this.showMenu)
    this.addEventListener('dragenter', this.handleDragEnter)
    this.addEventListener('dragover', this.handleDragOver)
    this.addEventListener('dragleave', this.handleDragLeave)
    this.addEventListener('drop', this.handleDrop)
  }

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('keydown', this.handleShortcut, true)
    if (this.acceptsDrop) {
      this.dataset.drop = this.acceptsDrop
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    document.removeEventListener('keydown', this.handleShortcut)
  }
}

export const tosiMenu = TosiMenu.elementCreator()

/** @deprecated Use tosiMenu instead */
export const xinMenu = tosiMenu
/** @deprecated Use TosiMenu instead */
export type XinMenu = TosiMenu
/** @deprecated Use TosiMenu instead */
export const XinMenu: typeof TosiMenu = TosiMenu
