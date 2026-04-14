/*#
# header

A simple flex header. Compose it with `elastic()` and `spacer()` from
`layout` to arrange content however you like.

## Basic Header

```html
<tosi-header>
  <h2 class="header-part">My App</h2>
</tosi-header>
```
```css
.header-part {
  color: white;
  margin: 0;
  line-height: 32px;
}
```

## Header with Menu

Use `elastic()` to push the menu to the right:

```js
import { elements } from 'tosijs'
import { tosiHeader, tosiMenu, elastic, icons } from 'tosijs-ui'

const menu = tosiMenu({ class: 'menu-demo' }, icons.moreVertical())
menu.menuItems = [
  { caption: 'About', tooltip: 'Learn more about this app', action() { alert('About!') } },
  { caption: 'Settings', icon: 'settings', tooltip: 'Appearance options', menuItems: [
    { caption: 'Dark Mode' },
    { caption: 'High Contrast' },
  ]},
]

preview.append(
  tosiHeader(
    { class: 'menu-demo' },
    elements.h2({ class: 'menu-demo' }, 'Demo'),
    elastic(),
    menu,
  )
)
```
```css
.menu-demo * {
  color: white;
  margin: 0;
  --text-color: white;
  --button-bg: transparent;
}
.menu-demo button:hover {
  background: #fff4;
}
```

## Header with Links

Use `elastic()` to push `<tosi-header-links>` to the right:

```js
import { elements } from 'tosijs'
import { tosiHeader, tosiHeaderLinks, elastic } from 'tosijs-ui'

preview.append(
  tosiHeader(
    { class: 'links-demo' },
    elements.h2({ class: 'links-demo' }, 'My Project'),
    elastic(),
    tosiHeaderLinks({
      links: {
        github: 'https://github.com/example/project',
        npm: 'https://www.npmjs.com/package/example',
        discord: 'https://discord.gg/example',
      },
    })
  )
)
```
```css
.links-demo {
  color: white;
  margin: 0;
}
```
*/

import { Component, ElementCreator, elements, varDefault } from 'tosijs'

import { icons } from './icons'

const { a } = elements

// ============================================================================
// Header Component
// ============================================================================

export class TosiHeader extends Component {
  static preferredTagName = 'tosi-header'

  static shadowStyleSpec = {
    ':host': {
      display: 'flex',
      alignItems: 'center',
      padding: varDefault.tosiHeaderPadding('12px 24px'),
      background: varDefault.tosiHeaderBg('var(--tosi-accent, #EE257B)'),
      lineHeight: varDefault.tosiHeaderLineHeight('32px'),
      gap: varDefault.tosiHeaderGap('8px'),
    },
    '::slotted(*)': {
      display: 'inline-flex',
      alignItems: 'center',
    },
  }

  content = ({ slot }: typeof elements) => [slot()]
}

export const tosiHeader =
  TosiHeader.elementCreator() as ElementCreator<TosiHeader>

// ============================================================================
// Header Links Component
// ============================================================================

export interface HeaderLinks {
  github?: string
  npm?: string
  discord?: string
  blog?: string
  tosijs?: string
  [key: string]: string | undefined
}

const linkIcons: Record<string, () => Element> = {
  tosijs: () => icons.tosi(),
  discord: () => icons.discord(),
  blog: () => icons.blog(),
  github: () => icons.github(),
  npm: () => icons.npm(),
}

export class TosiHeaderLinks extends Component {
  static preferredTagName = 'tosi-header-links'

  static lightStyleSpec = {
    ':host': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    },
    ':host a': {
      color: 'inherit',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px',
      opacity: '0.8',
      cursor: 'pointer',
    },
    ':host a:hover': {
      opacity: '1',
    },
  }

  links: HeaderLinks = {}

  content = null

  render(): void {
    super.render()
    const fragment: HTMLElement[] = []
    for (const [key, url] of Object.entries(this.links)) {
      if (!url || !linkIcons[key]) continue
      fragment.push(
        a({ title: key, target: '_blank', href: url }, linkIcons[key]())
      )
    }
    this.replaceChildren(...fragment)
  }
}

export const tosiHeaderLinks =
  TosiHeaderLinks.elementCreator() as ElementCreator<TosiHeaderLinks>
