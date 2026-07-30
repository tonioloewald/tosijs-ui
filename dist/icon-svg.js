/*
Raw SVG markup for icons, WITHOUT pulling in a DOM.

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
import iconData from './icon-data';
export function iconSvg(name) {
    const data = iconData;
    let key = name.endsWith('_') ? name.slice(0, -1) : name;
    for (let i = 0; i < 10; i++) {
        const value = data[key];
        if (value === undefined)
            return undefined;
        if (value.startsWith('<'))
            return value;
        key = value; // a redirect to another icon's name
    }
    return undefined; // redirect loop — treat as missing rather than hang
}
/** Every icon name currently registered, including any added via defineIcons. */
export function iconNames() {
    return Object.keys(iconData).sort();
}
