# tosijs-ui

<!--{ "pin": "top", "layout": "full-width", "headTitle": "tosijs-ui — robust, standards-based web components", "description": "A small, fast library of standards-based web components (data tables, dialogs, forms, rich text, carousels, and more) built on tosijs — smaller and faster than a React app, with no virtual DOM.", "keywords": "web components, custom elements, tosijs, data table, dialog, form, rich text, no virtual dom" }-->

[ui.tosijs.net live demo](https://ui.tosijs.net) | [tosijs](https://tosijs.net) | [discord](https://discord.gg/ramJ9rgky5) | [github](https://github.com/tonioloewald/tosijs-ui#readme) | [npm](https://www.npmjs.com/package/tosijs-ui)

[![tosijs is on NPM](https://badge.fury.io/js/tosijs-ui.svg)](https://www.npmjs.com/package/tosijs-ui)
[![tosijs on jsdelivr](https://data.jsdelivr.com/v1/package/npm/tosijs-ui/badge)](https://www.jsdelivr.com/package/npm/tosijs-ui)

<center>
  <tosi-lottie
    style="width: 280px; height: 280px; background: #da1167; border-radius: 40px;"
    src="/tosi-ui.json"
  ></tosi-lottie>
</center>

Copyright ©2023-2025 Tonio Loewald

> **Upgrading from an older version?** `<tosi-code>` changed editors in 1.7.0, and
> 1.3.0 renamed everything from `xinjs-ui`. Both are covered in
> [Migrating from older versions](https://ui.tosijs.net/migrating/) — new projects can skip it.

## the tosijs-ui library

A set of [web-components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
created with [tosijs](https://tosijs.net), designed to augment what the browser gives you
for free rather than replace it.

It works beautifully with other web-component libraries, such as [shoelace.style](https://shoelace.style/).

## Quick Start

### Using npm and a bundler

Add tosijs-ui to your project, e.g.

```bash
npm add tosijs-ui
```

Then import the component `elementCreator` and create elements. A `tosijs`
`elementCreator` is syntax sugar around `document.createElement()`.

```typescript
import { tosiTable } from 'tosijs-ui'

document.body.append(tosiTable())
```

### Using the iife via cdn

The `tosijs-ui` iife build bundles `tosijs`, `tosijs-ui`, `marked` and — as of 1.7 —
**CodeMirror** into a single minified javascript source file. You can access `xinjs` and
`xinjsui` as globals which contain all the things exported by `tosijs` and `tosijs-ui`.

> **Size (1.7):** ~385KB gzip, up from ~120KB in 1.6. `bun build --format iife` cannot
> code-split, so `<tosi-code>`'s lazy CodeMirror import is flattened into this bundle
> whether or not the page uses an editor. **If you don't need `<tosi-code>`, use the ESM
> build** (`import 'tosijs-ui'` via a bundler), where CodeMirror stays a separate lazy
> chunk and a page with no editor never downloads it.

```
<script src="https://ui.tosijs.net/iife.js"></script>
<button id="menu">Menu <tosi-icon icon="chevronDown"></tosi-icon></button>
<script>
  const { elements } = xinjs
  const { popMenu, icons } = xinjsui
  const { button } = elements

  const showMenu = (target) => {
    popMenu({
      target,
      menuItems: [
        {
          caption: 'Say hello',
          action() {
            alert('hello')
          }
        },
        null,
        {
          caption: 'Version',
          action() {
            alert(`tosijs ${xinjs.version}\ntosijs-ui ${xinjsui.version}`)
          }
        }
      ]
    })
  }

  document.body.append(
    button(
      {
        onClick(event) {
          showMenu(event.target)
        }
      },
      'Menu',
      icons.chevronDown()
    )
  )
</script>
```

The entire [live documentation site](https://ui.tosijs.net) is built with the iife
bundle — every page is static HTML that loads `iife.js` and hydrates, so it doubles
as a working iife example (view source on any page).

## custom-elements

The simplest way to use these elements is to simply import the element and then either
use HTML or the `ElementCreator` function exported.

E.g. to use the markdown viewer:

```
import { tosiMd } from 'tosijs-ui'
document.body.append(tosiMd('# hello world\nthis is a test'))
```

```js
import { tosiMd } from 'tosijs-ui'

preview.append(
  tosiMd(`
## hello world
here is some markdown
`)
)
```

Assuming you import the module somewhere, the HTML will work as well.

```
<tosi-md>
## hello world
here is some markdown
</tosi-md>
```

The big difference with using the `tosiMd()` function is that the `tosijs` `Component`
class will automatically pick a new tag if the expected tag is taken (e.g. by a previously
defined custom-element from another library). `tosiMd()` will create an element of
the correct type.

The other thing is that `tosijs` `ElementCreator` functions are convenient and composable,
allowing you to build DOM elements with less code than pretty much any other option, including
JSX, TSX, or HTML.

## Philosophy

In general, `tosijs` strives to work _with_ the browser rather than trying to _replace_ it.

In a similar vein, `tosijs-ui` comprises a collection of [web-components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
with the goal of augmenting what _already_ works well, and the components are intended to be
as similar as possible to things that you already use, such as `<input>` or `<select>` elements.
E.g. where appropriate, the `value` of an element is its malleable `state`, and when this changes,
the element emits a `change` event.

Similarly, the tosijs base `Component` class and the components in this collection strive to
be as similar in operation as possible to DOM elements as makes sense. E.g. binary attributes
work as expected. Adding the `hidden` attribute makes them disappear. If a component subclass
has a `value` property then it will be rendered if the value changes (similarly it will be
rendered if an initialized attribute is changed). Intrinsic properties of components will
default to `null` rather than `undefined`.

Similarly, because web-components are highly interoperable, there's no reason to reinvent
wheels. In particular, this library won't try to replace existing, excellent libraries
such as [shoelace.style](https://shoelace.style/) or wrap perfectly functional HTML
elements, like the venerable `<input>` or `<form>` elements that are already capable
and accessible.

The goal here is to provide useful components and other utilities that add to what's built
into HTML5 and CSS3 and to make custom-elements work as much as possible like drop-in replacements
for an `<input>` or `<textarea>` (while mitigating the historical pathologies of things like
`<select>` and `<input type="radio">`). E.g. the `<tosi-select>` does not suffer from a
race-condition between having its value set and being given an `<option>` with the intended value
and you can differentiate between the user picking a value (`action`) and the value changing (`change`).

## Credits

`tosijs-ui` is being developed using [bun](https://bun.sh/).
`bun` is crazy fast (based on Webkit's JS engine, vs. V8), does a lot of stuff
natively, and runs TypeScript (with import and require) directly.

Logo animations by [@anicoremotion](https://pro.fiverr.com/freelancers/anicoremotion).
