/*#
# menu

Being able to pop a menu up anywhere is just so nice, and `tosijs-ui` allows menus
to be generated on-the-fly, and even supports hierarchical menus.

## popMenu and `<xin-menu>`

`popMenu({target, menuItems, …})` will spawn a menu from a target.

The `<xin-menu>` component places creates a trigger button, hosts
menuItems, and (because it persists in the DOM) supports keyboard
shortcuts.

```js
import { popMenu, localize, xinMenu, postNotification, xinLocalized, icons } from 'tosijs-ui'
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
        checked: () => picked === 'one',
        action () {
          picked = 'one'
        }
      },
      {
        caption: 'two',
        checked: () => picked === 'two',
        action () {
          picked = 'two'
        }
      },
      {
        caption: 'three',
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
  xinMenu(
    {
      menuItems,
      localized: true,
    },
    xinLocalized('Menu'),
    icons.chevronDown()
  )
)
```
```html
<button title="menu test">
  <xin-icon icon="moreVertical"></xin-icon>
</button>
<button title="menu test from bottom-right" style="position: absolute; bottom: 0; right: 0">
  <xin-icon icon="moreVertical"></xin-icon>
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
}
```

### SubMenu

```
interface SubMenu {
  caption: string
  enabled?: () => boolean
  menuItems: MenuItem[]
  icon?: string | Element
}
```

### Keyboard Shortcuts

If a menu is embodied in a `<xin-menu>` it is supported by keyboard
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

> `<xin-menu>` supports the `localized` attribute but it doesn't localize
> its trigger button.

To see this in action, see the example below, or look at the
[table example](?data-table.ts). It uses a `localized` menu
to render column names when you show hidden columns.

```js
import { elements } from 'tosijs'
import { xinLocalized, localize, icons, popMenu, postNotification } from 'tosijs-ui'
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
  xinLocalized(
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
*/

import {
  elements,
  varDefault,
  vars,
  StyleSheet,
  Component,
  PartsMap,
} from 'tosijs'
import { popFloat, FloatPosition } from './pop-float'
import { icons, svgIcon, SvgIcon } from './icons'
import { localize, xinLocalized } from './localize'
import { matchShortcut } from './match-shortcut'

export type ActionCallback = () => void | Promise<void>

export interface MenuAction {
  caption: string
  shortcut?: string
  checked?: () => boolean
  enabled?: () => boolean
  action: ActionCallback | string
  icon?: string | Element
}

export interface SubMenu {
  caption: string
  checked?: () => boolean
  enabled?: () => boolean
  menuItems: MenuItem[]
  icon?: string | Element
}

export type MenuSeparator = null

export type MenuItem = MenuAction | SubMenu | MenuSeparator

const { div, button, span, a, xinSlot } = elements

StyleSheet('xin-menu-helper', {
  '.xin-menu': {
    overflow: 'hidden auto',
    maxHeight: `calc(${vars.maxHeight} - ${varDefault.menuInset('8px')})`,
    borderRadius: vars.spacing50,
    background: varDefault.menuBg('#fafafa'),
    boxShadow: varDefault.menuShadow(
      `${vars.spacing13} ${vars.spacing50} ${vars.spacing} #0004`
    ),
  },
  '.xin-menu > div': {
    width: varDefault.menuWidth('auto'),
  },
  '.xin-menu-trigger': {
    paddingLeft: 0,
    paddingRight: 0,
    minWidth: varDefault.touchSize('48px'),
  },
  '.xin-menu-separator': {
    display: 'inline-block',
    content: ' ',
    height: '1px',
    width: '100%',
    background: varDefault.menuSeparatorColor('#2224'),
    margin: varDefault.menuSeparatorMargin('8px 0'),
  },
  '.xin-menu-item': {
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
    padding: varDefault.menuItemPadding('0 16px'),
    height: varDefault.menuItemHeight('48px'),
    lineHeight: varDefault.menuItemHeight('48px'),
    textAlign: 'left',
  },
  '.xin-menu-item, .xin-menu-item > span': {
    color: varDefault.menuItemColor('#222'),
  },
  '.xin-menu-with-icons .xin-menu-item': {
    gridTemplateColumns: '30px 1fr 30px',
  },
  '.xin-menu-item svg': {
    stroke: varDefault.menuItemIconColor('#222'),
  },
  '.xin-menu-item.xin-menu-item-checked': {
    background: varDefault.menuItemHoverBg('#eee'),
  },
  '.xin-menu-item > span:nth-child(2)': {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'left',
  },
  '.xin-menu-item:hover': {
    // chrome rendering bug
    boxShadow: 'none !important',
    background: varDefault.menuItemHoverBg('#eee'),
  },
  '.xin-menu-item:active': {
    // chrome rendering bug
    boxShadow: 'none !important',
    background: varDefault.menuItemActiveBg('#aaa'),
    color: varDefault.menuItemActiveColor('#000'),
  },
  '.xin-menu-item:active svg': {
    stroke: varDefault.menuItemIconActiveColor('#000'),
  },
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
  let menuItem: HTMLElement
  if (typeof item?.action === 'string') {
    menuItem = a(
      {
        class: 'xin-menu-item',
        href: item.action,
      },
      icon,
      options.localized ? span(localize(item.caption)) : span(item.caption),
      span(item.shortcut || ' ')
    )
  } else {
    menuItem = button(
      {
        class: 'xin-menu-item',
        onClick: item.action,
      },
      icon,
      options.localized ? span(localize(item.caption)) : span(item.caption),
      span(item.shortcut || ' ')
    )
  }
  menuItem.classList.toggle('xin-menu-item-checked', checked !== false)
  if (item?.enabled && !item.enabled()) {
    menuItem.setAttribute('disabled', '')
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
  const submenuItem = button(
    {
      class: 'xin-menu-item',
      disabled: !(!item.enabled || item.enabled()),
      onClick(event: Event) {
        popMenu(
          Object.assign({}, options, {
            menuItems: item.menuItems,
            target: submenuItem,
            submenuDepth: (options.submenuDepth || 0) + 1,
            position: 'side',
          })
        )
        event.stopPropagation()
        event.preventDefault()
      },
    },
    icon,
    options.localized ? span(localize(item.caption)) : span(item.caption),
    icons.chevronRight({ style: { justifySelf: 'flex-end' } })
  )
  return submenuItem
}

export const createMenuItem = (
  item: MenuItem,
  options: PopMenuOptions
): HTMLElement => {
  if (item === null) {
    return span({ class: 'xin-menu-separator' })
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
  const { target, width, menuItems } = options
  const hasIcons = menuItems.find(
    (item) => item?.icon || (item as MenuAction)?.checked
  )
  return div(
    {
      class: hasIcons ? 'xin-menu xin-menu-with-icons' : 'xin-menu',
      onClick() {
        removeLastMenu(0)
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
}

interface PoppedMenu {
  target: HTMLElement
  menu: HTMLElement
}
let lastPopped: PoppedMenu | undefined
const poppedMenus: PoppedMenu[] = []

export const removeLastMenu = (depth = 0): PoppedMenu | undefined => {
  const toBeRemoved = poppedMenus.splice(depth)
  for (const popped of toBeRemoved) {
    popped.menu.remove()
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
}

document.body.addEventListener('mousedown', (event: Event) => {
  if (
    event.target &&
    !poppedMenus.find((popped) => popped.target.contains(event.target as Node))
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
  if (submenuDepth === 0 && lastPopped?.target === target) return
  const popped = removeLastMenu(submenuDepth)
  if (lastPopped?.target === target) return
  if (popped && popped.target === target) {
    removeLastMenu()
    return
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
  float.remainOnScroll = 'remove'
  poppedMenus.push({
    target,
    menu: float,
  })
}

function findShortcutAction(
  items: MenuItem[],
  event: KeyboardEvent
): MenuAction | undefined {
  for (const item of items) {
    if (!item) continue
    const { shortcut } = item as MenuAction
    const { menuItems } = item as SubMenu

    if (shortcut) {
      if (matchShortcut(event, shortcut)) {
        return item as MenuAction
      }
    } else if (menuItems) {
      const foundAction = findShortcutAction(menuItems, event)
      if (foundAction) {
        return foundAction
      }
    }
  }
  return undefined
}

interface XinMenuParts extends PartsMap {
  trigger: HTMLButtonElement
  icon: SvgIcon
}

export class XinMenu extends Component<XinMenuParts> {
  menuItems: MenuItem[] = []
  menuWidth = 'auto'
  localized = false

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

  content = () =>
    button({ tabindex: 0, part: 'trigger', onClick: this.showMenu }, xinSlot())

  handleShortcut = async (event: KeyboardEvent) => {
    const menuAction = findShortcutAction(this.menuItems, event)
    if (menuAction) {
      if (menuAction.action instanceof Function) {
        menuAction.action()
      }
    }
  }

  constructor() {
    super()

    this.initAttributes('menuWidth', 'localized', 'icon')

    this.addEventListener('keydown', this.showMenu)
  }

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('keydown', this.handleShortcut, true)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    document.removeEventListener('keydown', this.handleShortcut)
  }
}

export const xinMenu = XinMenu.elementCreator({
  tag: 'xin-menu',
  styleSpec: {
    ':host': {
      display: 'inline-block',
    },
    ':host button > xin-slot': {
      display: 'flex',
      alignItems: 'center',
      gap: varDefault.xinMenuTriggerGap('10px'),
    },
  },
})
