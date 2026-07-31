/*{"parent":"Appendices","order":600}*/
/*#
# `iconSvg` — icon markup without a DOM

```js
import { iconSvg, iconNames } from 'tosijs-ui'

const markup = iconSvg('tosi') // '<svg …>…</svg>' | undefined
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

Deliberately a separate module from `icons.ts`: that one imports tosijs to build
elements, so importing it drags in code that needs `HTMLElement` and throws in a build
script — the exact context that wanted the markup in the first place. This module
imports nothing but the data.

Background: `defineIcons()` could write to the icon map but nothing could read it, and
`icons.foo()` returns a DOM `SVGElement`. So a static-page generator, an ePub pass or a
server-rendered template had no way to get markup except by parsing
`src/icons/data/*.ts` out of the installed package — which is exactly what this project
resorted to when putting its own logo on a generated page. There is nothing to protect:
the map ships in the bundle either way.
*/

import iconData from './icon-data'

export function iconSvg(name: string): string | undefined {
  const data = iconData as Record<string, string>
  let key = name.endsWith('_') ? name.slice(0, -1) : name
  for (let i = 0; i < 10; i++) {
    const value = data[key]
    if (value === undefined) return undefined
    if (value.startsWith('<')) return value
    key = value // a redirect to another icon's name
  }
  return undefined // redirect loop — treat as missing rather than hang
}

/** Every icon name currently registered, including any added via defineIcons. */
export function iconNames(): string[] {
  return Object.keys(iconData as Record<string, string>).sort()
}
