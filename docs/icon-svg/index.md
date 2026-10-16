# `iconSvg` — icon markup without a DOM

```js
import { iconSvg, iconNames } from 'tosijs-ui'

const markup = iconSvg('tosi') // '<svg …>…</svg>', or undefined for an unknown name
preview.innerHTML =
  `<p>${iconNames().length} icons registered.</p>` +
  `<div style="width:48px">${markup}</div>`
```

(The subpath `tosijs-ui/icon-svg` is the DOM-free entry point — import it that way in a
build script or server template. The example above uses the package root because that is
what the live-example runner can rewrite.)

`iconSvg(name)` returns an icon's raw SVG **markup** as a string; `iconNames()` lists what
is registered. Neither touches the DOM, so both work in a build script, a server-rendered
template, or an ePub pass.

Redirects are followed, including the built-in ones that rotate or flip another icon
(`chevronDown` is `chevronRight90r`), and a rotation or flip written inline works too
(`iconSvg('chevronRight90r')`). A name the icon renderer would draw but that cannot be one
SVG string **throws**, saying why: a stack (`a$b`), a rule (`spin90Loader`, `unLock`), any
other style suffix (`check50o`), a redirect to a name that is not an icon, or a redirect
cycle. Render those with `icons.<name>()` where there is a DOM; the suffixes and rules are
described on the [[icons]] page. Only a name that nothing would draw returns `undefined`.

It needs no DOM, so it works in a build script, a static-page generator, an ePub pass or a
server-rendered template, where `icons.<name>()` (which builds DOM elements) cannot run.
