/*#
# icons

<div class="center" style="display: flex; gap: 10px; padding: 10px">
  <tosi-icon title="tosijs" icon="tosiFavicon" style="--tosi-icon-size: 128px"></tosi-icon>
  <tosi-icon title="tosijs-ui" icon="tosiUi" style="--tosi-icon-size: 128px"></tosi-icon>
  <tosi-icon title="tosi-platform" icon="tosiPlatform" style="--tosi-icon-size: 128px"></tosi-icon>
</div>

A library that provides `ElementCreator` functions that produce SVG icons. It leverages `tosijs`'s
`svgElements` proxy and is intended to address all the key use-cases for SVG icons in web
applications along with being very easy to extend and maintain.

> ### Supported Use Cases
> - inline SVGs that can be styled by CSS (for buttons, etc.)
> - allows both stroked and filled icons (unlike font-based systems)
> - support for color icons (without requiring multiple glyphs perfectly aligned)
> - icons can be rendered  as data urls, e.g. to insert into CSS… (the little `owl` logo rendered under blockquotes is an example)

### Nice Features
> - no build process magic needed (your icons are "just javascript", no special CSS files needed, no magic glyph mappings). Adding new, or overriding existing, icons is trivial.
> - icons are just regular SVG, not a specialized subset.
> - highly optimized and compressible (the code is comparable in size to what you get with a compressed font built from the same icons, except icon fonts don't support strokes, gradients, etc.)

## icons

`icons` is a proxy that generates an `ElementCreator` for a given icon on demand,
e.g. `icons.chevronDown()` produces an `<svg>` element containing a downward-pointing chevron
icon with the class `icon-chevron-down`.

```js
const  { tosi, elements } = tosijs
import { icons, svgIcon, postNotification } from 'tosijs-ui'

const { div, input } = elements

const { iconDemo } = tosi({
  iconDemo: {
    icon: ''
  }
})

preview.append(
  input({
    placeholder: 'filter icons by name',
    type: 'search',
    onInput(event) {
      const needle = event.target.value.toLocaleLowerCase()
      const tiles = Array.from(preview.querySelectorAll('.tile'))
      tiles.forEach(tile => {
        const xinIcon = tile.children[0]
        tile.style.display = xinIcon.icon.toLocaleLowerCase().includes(needle) ? '' : 'none'
      })
    }
  }),
  div(
    {
      class: 'scroller'
    },
    ...Object.keys(icons).sort().map(iconName => div(
      {
        class: 'tile',
        onClick() {
          iconDemo.icon = iconDemo.icon != iconName ? iconName : ''
          postNotification({
            icon: iconName,
            message: `${iconName} clicked`,
            duration: 2,
            color: 'hotpink'
          })
        },
        onMouseleave() {
          iconDemo.icon = ''
        }
      },
      svgIcon({icon: iconName, size: 24}),
      div(iconName)
    )),
  ),
  svgIcon({
    class: 'icon-detail',
    size: 256,
    bind: {
      binding: {
        toDOM(element, value) {
          element.style.opacity = value ? 1 : 0
          if (value) element.icon = value
        }
      },
      value: iconDemo.icon
    }
  })
)
```
```css
.preview .scroller {
  display: grid;
  grid-template-columns: calc(33% - 5px) calc(33% - 5px) calc(33% - 5px);
  grid-auto-rows: 44px;
  flex-wrap: wrap;
  padding: var(--spacing);
  gap: var(--spacing);
  overflow: hidden scroll !important;
  height: 100%;
}

.preview input[type=search] {
  margin: 10px 10px 0;
  width: calc(100% - 20px);
}

.preview .tile {
  display: flex;
  text-align: center;
  cursor: pointer;
  background: #8882;
  padding: 10px;
  gap: 10px;
  border-radius: 5px;
}

.preview .tile:hover {
  background: #8884;
  color: var(--brand-color);
}

.preview .tile > div {
  font-family: Menlo, Monaco, monospace;
  whitespace: no-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 1.5;
}

.preview .tile tosi-icon {
  font-size: 24px;
}

.preview .icon-detail {
  position: absolute;
  display: block;
  height: 296px;
  opacity: 0;
  transition: 0.5s ease-out;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px;
  background: #8886;
  border-radius: 20px;
  pointer-events: none;
}
```
```test
const tiles = preview.querySelectorAll('.tile')
test('icons are rendered', () => {
  expect(tiles.length).toBeGreaterThan(100)
})
test('icon tiles have svg icons', () => {
  const firstIcon = tiles[0].querySelector('tosi-icon')
  expect(firstIcon).toBeTruthy()
})
test('filter input exists', () => {
  const input = preview.querySelector('input[type="search"]')
  expect(input).toBeTruthy()
})
```

These icons are completely unstyled and can be colored using the css `fill` property. This will
probably be broken out as a standalone library to allow the use of whatever icons you like
(its source data is currently generated from an [icomoon](https://icomoon.com/app)
`selection.json` file, but could just as easily be generated from a directory full of SVGs).

## Adding and redefining icons

Simply pass a map of icon names to svg source strings…

```
defineIcons({
  someIcon: '<svg ....',
  otherIcon: '<svg ...',
})
```

### Icon Classes

Icons will be generated with the class `tosi-icon`.

You can also assign the classes `filled`, `stroked`, and `color` to icons to set default
icon styling.

## `<tosi-icon>`

`<tosi-icon>` is a simple component that lets you embed icons as HTML. Check the CSS tab to see
how it's styled.

`<tosi-icon>` supports four attributes:

- `size` (defaults to 0) if non-zero sets the height of the icon in pixels
- `icon` is the name of the icon
- `color` is the fill color (if you don't want to style it using CSS)
- `stroke` is the stroke color
- `stroke-width` (defaults to 1) is the width of the stroke assuming the icon's viewBox is 1024 units tall but the
  icon is rendered at 32px (so it's multiplied by 32).

> **Aside**: the tool used to build the icon library scales up the viewBox to 1024 tall and then rounds
> all coordinates to nearest integer on the assumption that this is plenty precise enough for icons and
> makes everything smaller and easier to compress.

## SVGs as data-urls

```js
import { elements } from 'tosijs'
import { icons, svg2DataUrl } from 'tosijs-ui'

preview.append(
  elements.span({
    style: {
      display: 'inline-block',
      width: '120px',
      height: '24px',
      content: '" "',
      background: svg2DataUrl(icons.search(), 'none', '#bbb', 3)
    }
  }),
  elements.span({
    style: {
      display: 'inline-block',
      width: '120px',
      height: '24px',
      content: '" "',
      background: svg2DataUrl(icons.star(), 'gold', 'orange', 4)
    }
  }),
  // Note that this is a color icon whose fill and stroke are "baked in"
  elements.span({
    style: {
      display: 'inline-block',
      width: '100px',
      height: '200px',
      content: '" "',
      background: svg2DataUrl(icons.tosi(), undefined, undefined, 2)
    }
  }),
)
```

`svg2DataUrl(svg: SVGElement, fill?: string, stroke?: string, strokeWidth?: number): string` is provided as a
utility for converting SVG elements into data-urls (e.g. for incorporation into
CSS properties. (It's used by the `<tosi-3d>` component to render the XR widget.)

If you're using `SVGElement`s created using the `icons` proxy, you'll want to provide `fill` and/or
`stroke` values, because images loaded via css properties cannot be styled.

## Color Icons

```html
<tosi-icon icon="tosiFavicon" class="demo-icon"></tosi-icon>
<tosi-icon icon="tosiPlatform" class="demo-icon recolored"></tosi-icon>
<tosi-icon icon="tosiXr" class="demo-icon animated"></tosi-icon>
```
```css
.demo-icon {
  --tosi-icon-size: 160px
}

.recolored > svg {
  pointer-events: all;
  transition: 0.25s ease-out;
  transform: scale(1);
  filter: grayscale(0.5)
}

.recolored:hover > svg {
  opacity: 1;
  transform: scale(1.1);
  filter: grayscale(0);
}

.animated > svg {
  animation: 2s linear 0s infinite rainbow;
}

@keyframes rainbow {
  0% {
    filter: hue-rotate(0deg);
  }
  100% {
    filter: hue-rotate(360deg);
  }
}
```

Colored icons have the `color` class added to them, so you can easily create css rules
that, for example, treat all colored icons inside buttons the same way.

> Earlier versions of this library replaced color specifications with CSS-variables in a
> very convoluted way, but in practice this isn't terribly useful as SVG properties can't
> be animated by CSS, so this functionality has been stripped out.

## Icon Composition & Math

If you request an icon that doesn't exist, the system tries to compose one
from a base icon and a prefix:

### Transforms

- `rot<angle><Icon>` — rotate by any angle, e.g. `rot90ChevronRight`, `rot45Arrow`
- `rot_<angle><Icon>` — negative rotation, e.g. `rot_30Arrow` → -30°
- `flipH<Icon>` — mirror horizontally, e.g. `flipHSidebar`
- `flipV<Icon>` — mirror vertically

### Modifier overlays

- `un<Icon>` — red slash overlay (e.g. `unPin`, `unLock`)
- `check<Icon>` — green check overlay
- `cancel<Icon>` — red x overlay
- `search<Icon>` — magnifier overlay

Modifier overlays render the base icon at reduced opacity/scale with the
overlay icon centered on top. **Overlay icons should have a square viewBox** —
a non-square overlay on a non-square base will produce unexpected results.

### Icon redirects

Icon definitions that don't start with `<svg` are treated as redirects
to another icon name (which can include composition prefixes):

    defineIcons({
      chevronDown: 'rot90ChevronRight',
      sidebarRight: 'flipHSidebar',
    })

### Custom rules

Add your own modifier prefixes via `iconRules.push(...)`:

    iconRules.push({
      prefix: 'add',
      overlay: 'plus',
      overlayStyle: { color: 'blue', opacity: '0.75' },
      baseStyle: { opacity: '0.5', transform: 'scale(0.75)', transformOrigin: '50% 50%' },
    })

### Composites and `svg2DataUrl`

Composed icons (modifiers) are wrapped in a `<span>` container, not a
single SVG. `svg2DataUrl()` will render only the base icon and log a
console error. Transforms (`rot`, `flip`) and plain icons work normally
with `svg2DataUrl`.

```js
import { icons, iconRules } from 'tosijs-ui'
import { elements, tosi } from 'tosijs'

const { div, span, label, select, option, input } = elements

const prefixes = [
  '', 'un', 'check', 'cancel', 'search',
  'rot90', 'rot180', 'rot270', 'flipH', 'flipV',
]

const iconNames = Object.keys(icons).sort()

const { iconMath } = tosi({
  iconMath: { base: 'pin', prefix: 'un', size: 64 }
})

const iconEl = div({ class: 'composition-icon' })
const nameEl = span({ class: 'composition-name' })

function renderResult() {
  const name = iconMath.prefix.value + (
    iconMath.prefix.value
      ? iconMath.base.value[0].toUpperCase() + iconMath.base.value.slice(1)
      : iconMath.base.value
  )
  const size = iconMath.size.value + 'px'
  iconEl.style.setProperty('--tosi-icon-size', size)
  iconEl.textContent = ''
  iconEl.append(icons[name]())
  nameEl.textContent = name
}

iconMath.base.observe(renderResult)
iconMath.prefix.observe(renderResult)
iconMath.size.observe(renderResult)

preview.append(
  div(
    { class: 'composition-demo' },
    iconEl,
    div(
      { class: 'composition-controls' },
      select(
        { bindValue: iconMath.prefix },
        ...prefixes.map(p => option({ value: p }, p || '(none)'))
      ),
      span({ class: 'composition-op' }, '+'),
      select(
        { bindValue: iconMath.base },
        ...iconNames.map(name => option(name))
      ),
      span({ class: 'composition-op' }, '='),
      nameEl,
    ),
    label(
      { class: 'composition-size' },
      input({
        type: 'range',
        min: 16,
        max: 128,
        bindValue: iconMath.size,
      }),
      span({ bindText: iconMath.size }, '64'),
      'px',
    ),
  ),
)

renderResult()
```
```css
.preview .composition-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
}
.preview .composition-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}
.preview .composition-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.preview .composition-op {
  font-size: 20px;
  font-weight: bold;
  opacity: 0.5;
}
.preview .composition-name {
  font-family: Menlo, Monaco, monospace;
  font-size: 14px;
}
.preview .composition-size {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}
```

## Missing Icons

If you ask for an icon that isn't defined, the `icons` proxy will print a warning to console
and render a `square` (in fact, `icons.square()`) as a fallback.

## Why?

My evolution has been:

1. Using Icomoon.io, which I still think is a solid choice for managing custom icon fonts
2. Processing Icomoon selection.json files into icon-data and then generating SVGs dynamically
   from the data
3. Ingesting SVGs directly, with a little cleanup

The goal is always to have a single source of truth for icons, no magic or convoluted tooling, and
be able to quickly and easily add and replace icons, distribute them with components, and
have no mess or fuss.

1. Works well, but…
   - color icons are flaky,
   - doesn't play well with others,
   - can't really distribute the icons with your components.
   - difficult to use icons in CSS `content`
   - impossible to use icons in CSS backgrounds
2. This is `icons.ts` until just now! Solves all the above, but…
   - no fancy SVG effects, like gradients (goodness knows I experimented with converting CSS gradients to SVG gradients) and, most
   - **strokes** need to be converted to outlines
   - outlined strokes can't be styled the way strokes can
   - blocks use of popular icon libraries
3. This is how everyone else works, except…
   - no build magic needed: `defineIcons({ myIcon: '<svg....>', ... })`
   - if you want build magic, `icons.js` has no dependencies, finds icons and creates an `icon-data.ts` file.
   - smaller icon files, even though I'm now including more icons (including *all the current* feathericons)

## Icon Sources

Many of these icons are sourced from [Feather Icons](https://github.com/feathericons/feather), but
all the icons have been processed to have integer coordinates in a `viewBox` typically scaled to 1024  &times; 1024.

The corporate logos (Google, etc.) are from a variety of sources, in many cases ultimately from the
organizations themselves. It's up to you to use them correctly.

The remaining icons I have created myself using the excellent but sometimes flawed
[Amadine](https://apps.apple.com/us/app/amadine-vector-design-art/id1339198386?mt=12)
and generally reliable [Graphic](https://apps.apple.com/us/app/graphic/id404705039?mt=12).

### Feather Icons Copyright Notice

The MIT License (MIT)

Copyright (c) 2013-2023 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
*/

import {
  elements,
  svgElements,
  ElementCreator,
  ElementPart,
  Component as WebComponent,
  XinStyleRule,
  Color,
  varDefault,
} from 'tosijs'
import { SVGIconMap } from './icon-types'
import iconData from './icon-data'

export const defineIcons = (newIcons: { [key: string]: string }): void => {
  Object.assign(iconData, newIcons)
}

export const svg2DataUrl = (
  icon: Element,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): string => {
  // Handle composite icons (span wrappers) by finding the inner SVG(s)
  const svgs =
    icon instanceof SVGElement
      ? [icon]
      : Array.from(icon.querySelectorAll('svg'))

  if (svgs.length > 1) {
    const name = (icon as HTMLElement).dataset?.icon || 'unknown'
    console.error(
      `svg2DataUrl: composite icon "${name}" cannot be serialized as a data URL, rendering base icon only`
    )
  }

  const svg = svgs[0]
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  for (const path of svg.querySelectorAll(
    'path, polygon, line, circle, rect, ellipse, polyline'
  )) {
    if (fill !== undefined) path.setAttribute('fill', fill)
    if (stroke !== undefined) path.setAttribute('stroke', stroke)
    if (strokeWidth !== undefined)
      path.setAttribute('stroke-width', String(strokeWidth))
  }

  const styled = svg.querySelectorAll('[style]')
  svg.removeAttribute('style')
  for (const item of [...styled] as HTMLElement[]) {
    const s = item.style
    if (s.fill) item.setAttribute('fill', Color.fromCss(s.fill).html)
    if (s.stroke) item.setAttribute('stroke', Color.fromCss(s.stroke).html)
    if (s.strokeWidth) item.setAttribute('strokeWidth', s.strokeWidth)
    if (s.strokeLinecap) item.setAttribute('strokeLinecap', s.strokeLinecap)
    if (s.strokeLinejoin) item.setAttribute('strokeLinejoin', s.strokeLinejoin)
    item.removeAttribute('style')
  }

  const text = encodeURIComponent(svg.outerHTML)
  return `url(data:image/svg+xml;charset=UTF-8,${text})`
}

// Compositional icon rules — when an icon isn't found, try to compose it
export interface IconRule {
  prefix: string
  overlay: string // icon name to overlay
  overlayStyle: Partial<CSSStyleDeclaration>
  baseStyle: Partial<CSSStyleDeclaration>
}

export const iconRules: IconRule[] = [
  {
    prefix: 'un',
    overlay: 'slash',
    overlayStyle: { color: 'red', opacity: '0.75' },
    baseStyle: { opacity: '0.5', transform: 'scale(0.75)', transformOrigin: '50% 50%' },
  },
  {
    prefix: 'check',
    overlay: 'check',
    overlayStyle: { color: 'green', opacity: '0.75' },
    baseStyle: { opacity: '0.5', transform: 'scale(0.75)', transformOrigin: '50% 50%' },
  },
  {
    prefix: 'cancel',
    overlay: 'x',
    overlayStyle: { color: 'red', opacity: '0.75' },
    baseStyle: { opacity: '0.5', transform: 'scale(0.75)', transformOrigin: '50% 50%' },
  },
  {
    prefix: 'search',
    overlay: 'search',
    overlayStyle: {
      transform: 'scale(0.8) translate(30%, 30%)',
      transformOrigin: '50% 50%',
    },
    baseStyle: { opacity: '0.5' },
  },
]

const ROTATION_RE = /^rot(_?\d+)(.+)$/
const FLIP_RE = /^flip(H|V)(.+)$/

function makeIcon(spec: string, parts: ElementPart[]): SVGElement {
  const div = elements.div()
  div.innerHTML = spec
  const sourceSvg = div.querySelector('svg') as SVGElement
  const classes = new Set(sourceSvg.classList)
  classes.add('tosi-icon')
  const svg = svgElements.svg(
    {
      class: Array.from(classes).join(' '),
      viewBox: sourceSvg.getAttribute('viewBox'),
    },
    ...parts,
    ...sourceSvg.children
  )
  svg.style.strokeWidth = varDefault.tosiIconStrokeWidth('2px')
  if (classes.has('filled')) {
    svg.style.stroke = 'none'
    svg.style.fill = 'currentColor'
  } else if (classes.has('stroked')) {
    svg.style.stroke = varDefault.tosiIconStroke('currentColor')
    svg.style.fill = 'none'
  } else {
    svg.style.stroke = varDefault.tosiIconStroke('currentColor')
    svg.style.fill = varDefault.tosiIconFill('currentColor')
  }
  svg.style.height = varDefault.tosiIconSize('16px')
  return svg
}

function wrapIcon(
  prop: string,
  parts: ElementPart[],
  ...children: Element[]
): HTMLSpanElement {
  return elements.span(
    {
      class: 'tosi-icon-composite',
      dataIcon: prop,
      style: {
        display: 'inline-block',
        position: 'relative',
        height: varDefault.tosiIconSize('16px'),
      },
    },
    ...parts,
    ...children
  )
}

function composeIcon(prop: string, parts: ElementPart[]): Element | null {
  const data = iconData as Record<string, string>

  // Rotation: rot90ChevronRight → chevronRight rotated 90°
  const rotMatch = prop.match(ROTATION_RE)
  if (rotMatch) {
    const angle = rotMatch[1].replace('_', '-')
    const baseName = rotMatch[2][0].toLowerCase() + rotMatch[2].slice(1)
    if (data[baseName]) {
      const svg = makeIcon(data[baseName], [])
      svg.style.transform = `rotate(${angle}deg)`
      return wrapIcon(prop, parts, svg)
    }
  }

  // Flip: flipHSidebar → sidebar flipped horizontally
  const flipMatch = prop.match(FLIP_RE)
  if (flipMatch) {
    const axis = flipMatch[1]
    const baseName = flipMatch[2][0].toLowerCase() + flipMatch[2].slice(1)
    if (data[baseName]) {
      const svg = makeIcon(data[baseName], [])
      svg.style.transform = axis === 'H' ? 'scaleX(-1)' : 'scaleY(-1)'
      return wrapIcon(prop, parts, svg)
    }
  }

  // Modifier prefixes: unPin → pin with slash overlay
  for (const rule of iconRules) {
    if (prop.startsWith(rule.prefix) && prop.length > rule.prefix.length) {
      const baseName =
        prop[rule.prefix.length].toLowerCase() +
        prop.slice(rule.prefix.length + 1)
      if (data[baseName] && data[rule.overlay]) {
        const base = makeIcon(data[baseName], [])
        Object.assign(base.style, rule.baseStyle)
        const overlay = makeIcon(data[rule.overlay], [])
        Object.assign(overlay.style, {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          ...rule.overlayStyle,
        })
        return wrapIcon(prop, parts, base, overlay)
      }
    }
  }

  return null
}

const MAX_REDIRECTS = 10

function resolveIcon(prop: string, parts: ElementPart[]): Element {
  const data = iconData as Record<string, string>
  let name = prop
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const spec = data[name]
    if (!spec) break
    if (spec.startsWith('<')) return makeIcon(spec, parts)
    name = spec
  }
  if (name !== prop) {
    // Redirected but final target not found — try composition on final name
    const composed = composeIcon(name, parts)
    if (composed) return composed
  }
  const composed = composeIcon(prop, parts)
  if (composed) return composed
  if (prop) {
    console.warn(`icon ${prop} does not exist`)
  }
  return makeIcon(iconData.square, parts)
}

export const icons = new Proxy(iconData, {
  get(target, prop: string): ElementCreator {
    return (...parts: ElementPart[]) => resolveIcon(prop, parts)
  },
}) as unknown as SVGIconMap

export class SvgIcon extends WebComponent {
  static preferredTagName = 'tosi-icon'
  static lightStyleSpec = {
    ':host': {
      // New --tosi-icon-* variables with legacy fallbacks
      '--tosi-icon-size': 'var(--xin-icon-size, 16px)',
      '--tosi-icon-stroke-width':
        'var(--xin-icon-stroke-width, var(--icon-stroke-width, 2px))',
      '--tosi-icon-stroke-linejoin': 'var(--icon-stroke-linejoin, round)',
      '--tosi-icon-stroke-linecap': 'var(--icon-stroke-linecap, round)',
      '--tosi-icon-fill': 'var(--xin-icon-fill, var(--icon-fill, none))',
      display: 'inline-flex',
      stroke: 'currentColor',
      strokeWidth: varDefault.tosiIconStrokeWidth('2px'),
      strokeLinejoin: varDefault.tosiIconStrokeLinejoin('round'),
      strokeLinecap: varDefault.tosiIconStrokeLinecap('round'),
      fill: varDefault.tosiIconFill('none'),
    },
    ':host, :host svg': {
      height: varDefault.tosiIconSize('16px'),
    },
  }

  static initAttributes = {
    icon: '',
    size: 0,
    fill: '',
    stroke: '',
    strokeWidth: 1,
  }

  render(): void {
    super.render()
    this.textContent = ''
    const style: XinStyleRule = {}
    if (this.size) {
      style.height = this.size + 'px'
      this.style.setProperty('--tosi-icon-size', `${this.size}px`)
      // Legacy alias
      this.style.setProperty('--xin-icon-size', `${this.size}px`)
    }
    if (this.stroke) {
      style.stroke = this.stroke
      style.strokeWidth = this.strokeWidth
    }
    if (this.fill) {
      style.fill = this.fill
    }
    this.append(icons[this.icon]({ style }))
  }
}

export const svgIcon = SvgIcon.elementCreator()
