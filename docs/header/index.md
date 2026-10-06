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
