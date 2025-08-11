# tosijs-ui

> `xinjs-ui` has been renamed `tosijs-ui`. Updating the documentation and links is a
> work in progress. The goal is for the API to remain stable during the transition.

<!--{ "pin": "top" }-->

[ui.xinjs.net live demo](https://ui.xinjs.net) | [xinjs](https://xinjs.net) | [discord](https://discord.gg/ramJ9rgky5) | [github](https://github.com/tonioloewald/xinjs-ui#readme) | [npm](https://www.npmjs.com/package/xinjs-ui)

<center>
  <xin-icon class="logo" icon="tosiUi" size=300></xin-icon>
</center>

Copyright ©2023-2025 Tonio Loewald

## the tosijs ui library

A set of [web-components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
created with [xinjs](https://xinjs.net), designed to augment what the browser gives you
for free rather than replace it.

It works beautifully with other web-component libraries, such as [shoelace.style](https://shoelace.style/).

## Quick Start

### Using npm and a bundler

Add xinjs-ui to your project, e.g.

```
npm add xinjs-ui
```

Then you can import the component `elementCreator` and create the element any way you
like, the easiest way being to use the `elementCreator` itself. A `tosijs` `elementCreator`
is syntax sugar around `document.createElement()`.

```
import { dataTable } from 'xinjs-ui'

document.body.append(dataTable())
```

### Using the iife via cdn

The `tosijs-ui` iife build bundles `tosijs`, `tosijs-ui`, and `marked` into
a single minified javascript source file. You can access `tosijs` and `xinjsui`
as globals which contain all the things exported by `tosijs` and `tosijs-ui`.

> iife support is new so it may not have propagated to the cdn yet. This
> example loads the library from ui.xinjs.net for now.

```
<script src="https://ui.xinjs.net/iife.js"></script>
<button id="menu">Menu <xin-icon icon="chevronDown"></xin-icon></button>
<script>
  const { elements } = tosijs
  const { popMenu, icons } = tosijsui

  const button = { elements }

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
            alert(`xinjs ${xinjs.version}\nxinjs-ui ${xinjsui.version}`)
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

[Click here to see a simple iife demo](https://ui.xinjs.net/iife.html)

## custom-elements

The simplest way to use these elements is to simply import the element and then either
use HTML or the `ElementCreator` function exported.

E.g. to use the markdown viewer:

```
import { markdownViewer } from 'xinjs-ui'
document.body.append(markdownViewer('# hello world\nthis is a test'))
```

```js
const { markdownViewer } = tosijsui

preview.append(
  markdownViewer(`
## hello world
here is some markdown
`)
)
```

Assuming you import the module somewhere, the HTML will work as well.

```
<xin-md>
## hello world
here is some markdown
</xin-md>
```

The big difference with using the `markdownViewer()` function is that the `tosijs` `Component`
class will automatically pick a new tag if the expected tag is taken (e.g. by a previously
defined custom-element from another library). `markdownViewer()` will create an element of
the correct type.

The other thing is that `tosijs` `ElementCreator` functions are convenient and composable,
allowing you to build DOM elements with less code than pretty much any other option, including
JSX, TSX, or HTML.

## Philosophy

In general, `tosijs` strives to work _with_ the browser rather than trying to _replace_ it.

In a similar vein, `tosijs-ui` comprises a collection of [web-components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
with the goal of augmenting what _already_ works well, and the components are intended be interoperable as
similar as possible to things that you already use, such as `<input>` or `<select>` elements.
E.g. where appropriate, the `value` of an element is its malleable `state`, and when this changes,
the element emits a `change` event.

Similarly, the xinjs base `Component` class and the components in this collection strive to
be as similar in operation as possible to DOM elements as makes sense. E.g. binary attributes
work as expected. Adding the `hidden` attribute makes them disappear. If a component subclass
has a `value` property then it will be rendered if the value changes (similarly it will be
rendered if an initialized attribute is changed). Intinsic properties of components will
default to `null` rather than `undefined`.

Similarly, because web-components are highly interoperable, there's no reason to reinvent
wheels. In particular, this library won't try to replace existing, excellent libraries
such as [shoelace.style](https://shoelace.style/) or wrap perfectly functional HTML
elements, like the venerable `<input>` or `<form>` elements that are already capable
and accessible.

The goal here is to provide useful components and other utilities that add to what's built
into HTML5 and CSS3 and to make custom-elements work as much as possible like drop-in replacements
for an `<input>` or `<textarea>` (while mitigating the historical pathologies of things like
`<select>` and `<input type="radio">`). E.g. the `<xin-select>` does not suffer from a
race-condition between having its value set and being given an `<option>` with the intended value
and you can differentiate between the user picking a value (`action`) and the value changing (`change`).
