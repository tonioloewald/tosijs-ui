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
(`chevronDown` is `chevronRight90r`), and a rotation or flip written inline works too
(`iconSvg('chevronRight90r')`). A name the icon renderer would draw but that cannot be one
SVG string **throws**, saying why: a stack (`a$b`), a rule (`spin90Loader`, `unLock`), any
other style suffix (`check50o`), a redirect to a name that is not an icon, or a redirect
cycle. Render those with `icons.<name>()` where there is a DOM; the suffixes and rules are
described on the [[icons]] page. Only a name that nothing would draw returns `undefined`.

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
import { splitSuffixes, suffixNumber } from './icon-suffixes.js';
import { canResolve, ruleDraws } from './icon-rules.js';
const data = iconData;
// Rotation and flip, the only suffixes the built-in redirects use (`chevronDown` is
// `chevronRight90r`). Anything else needs the DOM renderer.
const isGeometry = (token) => /^(_?\d+r|[01]f)$/.test(token);
const stripEscape = (name) => name.endsWith('_') ? name.slice(0, -1) : name;
// Whether the icon renderer would draw something for a name: a registered icon, suffixes on
// one (`chevronRight50o`), a stack (`a$b`), or a rule applied to one (`spin90Loader`,
// `unLock`). The rules and suffixes are the renderer's own (icon-rules, icon-suffixes).
const isComposition = (name) => name.includes('$') || canResolve(name) || ruleDraws(name);
/**
 * Raw SVG markup for an icon, or `undefined` when nothing by that name would draw.
 *
 * Throws when the name would draw but cannot be one SVG string: a stack (`a$b`), a rule
 * (`spin…`, `un…`), a style suffix other than rotation or flip, a redirect to a name that
 * is not an icon, or a redirect cycle. Those need `icons.<name>()` where there is a DOM.
 */
export function iconSvg(name) {
    const key = stripEscape(name);
    if (!isComposition(key))
        return undefined;
    return resolve(name, key, new Set());
}
function resolve(asked, name, seen) {
    const key = stripEscape(name);
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
    const split = splitSuffixes(key);
    if (split &&
        data[split.baseName] !== undefined &&
        split.tokens.every(isGeometry)) {
        return transformed(asked, resolve(asked, split.baseName, seen), split.tokens);
    }
    const what = key === stripEscape(asked) ? `"${key}"` : `it resolves to "${key}", which`;
    if (isComposition(key)) {
        throw new Error(`iconSvg("${asked}"): ${what} is not a single SVG (a stack, a rule, or a style ` +
            `suffix other than rotation or flip). Render it with icons.${stripEscape(asked)}() ` +
            `where there is a DOM.`);
    }
    throw new Error(`iconSvg("${asked}"): it redirects to "${key}", which is not a registered icon`);
}
// Apply rotate/flip suffixes about the centre of the viewBox, as the DOM renderer does
// with `transform-origin: 50% 50%`.
function transformed(asked, svg, tokens) {
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
    const ops = tokens.map((token) => token.endsWith('r')
        ? `rotate(${suffixNumber(token)})`
        : token === '0f'
            ? 'scale(-1 1)'
            : 'scale(1 -1)');
    const transform = `translate(${cx} ${cy}) ${ops.join(' ')} translate(${-cx} ${-cy})`;
    return `${parts[1]}<g transform="${transform}">${parts[2]}</g>${parts[3]}`;
}
/** Every icon name currently registered, including any added via defineIcons. */
export function iconNames() {
    return Object.keys(iconData).sort();
}
