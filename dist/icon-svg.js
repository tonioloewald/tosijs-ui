/*{"parent":"Appendices","order":600}*/
/*#
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
(`chevronDown` is `chevronRight90r`). A name that exists but cannot be one SVG string —
a stack (`a$b`), a rule (`spin…`, `un…`), any other style suffix, or a redirect cycle —
**throws**, naming what it resolved to: render those with `icons.<name>()` where there is
a DOM. Only a name with no icon at all returns `undefined`.

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
import iconData from './icon-data.js';
// Rotation and flip, the only suffixes the built-in redirects use (`chevronDown` is
// `chevronRight90r`). Anything else needs the DOM renderer.
const GEOMETRY_SUFFIXES = /((?:_?\d+r|[01]f)+)$/;
/**
 * Raw SVG markup for an icon, or `undefined` when no icon has that name.
 *
 * Throws when the name exists but cannot be one SVG string: a stack (`a$b`), a rule
 * (`spin…`, `un…`), a suffix other than rotation or flip, or a redirect cycle. Those need
 * `icons.<name>()` where there is a DOM.
 */
export function iconSvg(name) {
    const key = name.endsWith('_') ? name.slice(0, -1) : name;
    const data = iconData;
    if (data[key] === undefined)
        return undefined;
    return resolve(name, key, new Set());
}
function resolve(asked, key, seen) {
    const data = iconData;
    const value = data[key];
    if (value !== undefined) {
        if (value.startsWith('<'))
            return value;
        if (seen.has(key)) {
            throw new Error(`iconSvg("${asked}"): the icon redirects in a cycle`);
        }
        seen.add(key);
        return resolve(asked, value, seen);
    }
    const suffixes = key.match(GEOMETRY_SUFFIXES);
    let base = suffixes ? key.slice(0, suffixes.index) : '';
    if (base.endsWith('_'))
        base = base.slice(0, -1);
    if (!suffixes || data[base] === undefined) {
        throw new Error(`iconSvg("${asked}"): it resolves to "${key}", which is not a single SVG (a stack, ` +
            `a rule, or a style suffix). Render it with icons.${asked}() where there is a DOM.`);
    }
    return transformed(asked, resolve(asked, base, seen), suffixes[1]);
}
// Apply rotate/flip suffixes about the centre of the viewBox, as the DOM renderer does
// with `transform-origin: 50% 50%`.
function transformed(asked, svg, suffixes) {
    const parts = svg.match(/^(\s*<svg\b[^>]*>)([\s\S]*)(<\/svg>\s*)$/);
    const viewBox = parts?.[1]
        .match(/viewBox="([^"]+)"/)?.[1]
        .split(/[\s,]+/)
        .map(Number);
    if (!parts || !viewBox || viewBox.length !== 4 || viewBox.some(isNaN)) {
        throw new Error(`iconSvg("${asked}"): cannot transform an icon without a viewBox`);
    }
    const [x, y, width, height] = viewBox;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const ops = suffixes
        .match(/_?\d+r|[01]f/g)
        .map((op) => op.endsWith('r')
        ? `rotate(${parseInt(op.replace('_', '-'))})`
        : op === '0f'
            ? 'scale(-1 1)'
            : 'scale(1 -1)');
    const transform = `translate(${cx} ${cy}) ${ops.join(' ')} translate(${-cx} ${-cy})`;
    return `${parts[1]}<g transform="${transform}">${parts[2]}</g>${parts[3]}`;
}
/** Every icon name currently registered, including any added via defineIcons. */
export function iconNames() {
    return Object.keys(iconData).sort();
}
