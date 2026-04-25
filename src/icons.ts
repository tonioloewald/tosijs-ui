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
> - icon composition: stack, transform, and style icons via naming conventions (e.g. `lock50s75o$shield`)
> - extensible rules system for custom prefixes and overlays (e.g. `unLock`, `checkFile`)
> - icon redirects eliminate redundant SVG data (e.g. `chevronDown` → `chevronRight90r`)

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

const { div, span, input, select, option } = elements

const prefixes = ['', 'un', 'check', 'cancel', 'search', 'spin120', 'spin360']
const suffixes = [
  '', '90r', '180r', '_90r', '0f', '1f',
  '50o', '75s', '_ff0000F', '_00fS', '4W',
]

const iconNames = Object.keys(icons).sort()

const { iconDemo } = tosi({
  iconDemo: {
    icon: '',
    prefix: '',
    suffix: '',
  }
})

function composeName(prefix, suffix, base) {
  let name = base
  if (prefix) name = prefix + name[0].toUpperCase() + name.slice(1)
  if (suffix) name = name + suffix
  return name
}

const scroller = div({ class: 'scroller' })

function rebuildGrid() {
  const prefix = iconDemo.prefix.value
  const suffix = iconDemo.suffix.value
  scroller.textContent = ''
  for (const iconName of iconNames) {
    const composed = composeName(prefix, suffix, iconName)
    scroller.append(div(
      {
        class: 'tile',
        onClick() {
          iconDemo.icon = iconDemo.icon != composed ? composed : ''
          postNotification({
            icon: iconName,
            message: `${composed} clicked`,
            duration: 2,
            color: 'hotpink'
          })
        },
        onMouseleave() {
          iconDemo.icon = ''
        }
      },
      svgIcon({ icon: composed, size: 24 }),
      div((prefix || suffix) ? composed : iconName)
    ))
  }
}

iconDemo.prefix.observe(rebuildGrid)
iconDemo.suffix.observe(rebuildGrid)
rebuildGrid()

const detailIcon = svgIcon({
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

preview.append(
  div(
    { class: 'toolbar' },
    input({
      placeholder: 'filter icons by name',
      type: 'search',
      onInput(event) {
        const needle = event.target.value.toLocaleLowerCase()
        const tiles = Array.from(scroller.querySelectorAll('.tile'))
        tiles.forEach(tile => {
          tile.style.display = tile.textContent.toLocaleLowerCase().includes(needle) ? '' : 'none'
        })
      }
    }),
    select(
      { bindValue: iconDemo.prefix },
      ...prefixes.map(p => option({ value: p }, p || 'prefix'))
    ),
    select(
      { bindValue: iconDemo.suffix },
      ...suffixes.map(s => option({ value: s }, s || 'suffix'))
    ),
  ),
  scroller,
  detailIcon
)
```
```css
.preview .toolbar {
  display: flex;
  gap: 10px;
  padding: 10px;
  align-items: center;
}

.preview .toolbar input[type=search] {
  flex: 1;
}

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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 1.5;
}

.preview .icon-detail {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
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
test('filter input and prefix select exist', () => {
  expect(preview.querySelector('input[type="search"]')).toBeTruthy()
  expect(preview.querySelector('select')).toBeTruthy()
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

<tosi-icon icon="tosi$map50o" size=128></tosi-icon>
<tosi-icon icon="lock50s75o_10y$shield" size=128></tosi-icon>
<tosi-icon icon="unLock" size=128></tosi-icon>
<tosi-icon icon="checkFile" size=128></tosi-icon>
<tosi-icon icon="spin120Loader40s_30x$cloud" size=128></tosi-icon>

### Why?

I needed a pin icon for column pinning in the data table. The only pin
in the feather set is a map pin, so I created a push-pin icon
<tosi-icon icon="pin" size=24 style="stroke: var(--brand-color)"></tosi-icon>.
But immediately I also needed unpin, pin-left, and pin-right — a lot
of new icons for one feature. Of course I could flip the pin with CSS, but
this is a problem *everywhere, all the time*: every directional icon
needs 2–4 variants, every action needs a negation, every status needs
an overlay.

Why not fix it once and also eliminate the need to maintain trivial
variations on every icon?

<tosi-icon icon="pin" size=64></tosi-icon>
<tosi-icon icon="pin0f" size=64></tosi-icon>
<tosi-icon icon="unPin" size=64></tosi-icon>

### Icon modifier suffixes

The suffix system is inspired by tosijs's CSS variable math, where
`borderRadius50` becomes `calc(var(--border-radius) * 0.5)` and
`someColor50o` adjusts opacity to 50%. The same `value + letter`
convention works for icons:

- `NNo` — opacity N% (e.g. `lock50o` = 50% opacity)
- `NNs` — scale N% (e.g. `star75s` = 75% scale)
- `NNr` — rotate N° (e.g. `chevronRight90r` = chevron pointing down)
- `_NNr` — rotate -N° (e.g. `arrow_45r`)
- `0f` — flip horizontally (e.g. `sidebar0f`)
- `1f` — flip vertically
- `NNx` — translateX N% (e.g. `plus20x` = shift right 20%)
- `NNy` — translateY N% (e.g. `plus_20y` = shift up 20%)
- `_<hex>F` — fill color (e.g. `star_ff0000F` = red fill, `star_f00F` = shorthand)
- `_<hex>S` — stroke color (e.g. `lock_00fS` = blue stroke)
- `NW` — stroke width (e.g. `lock4W` = stroke-width 4)

Suffixes combine freely: `plus50o60s25x25y_f00F` = plus at 50% opacity,
60% scale, shifted 25% right and down, filled red.

### Stacking icons

Use `$` to stack icons: `overlay$base`, or `top$middle$bottom` for
multiple layers. The last segment is the base (sets the size), everything
before it is overlaid on top. Each segment is resolved independently —
suffixes, redirects, and rules all work:

    icons['tosi$map50o']()                // tosi logo on a 50% opacity map
    icons['star45r$circle']()              // rotated star on a circle
    icons['lock50s75o_10y$shield']()       // translucent lock on a shield
    icons['star25o$lock50o$shield']()      // three layers

### Icon redirects

Icon definitions that don't start with `<svg` are treated as redirects.
This is how we eliminate redundant SVG files — `chevronDown` doesn't
need its own SVG:

    defineIcons({
      chevronDown: 'chevronRight90r',
      chevronLeft: 'chevronRight180r',
      chevronUp: 'chevronRight270r',
      userAdd: 'plus50o60s25x25y$user',
    })

### Prefix rules

Rules apply named prefixes to icons. Built-in rules use string rewrites
that feed back into the resolution pipeline:

- `un<Icon>` — translucent slash overlay (e.g. `unPin`, `unLock`)
- `check<Icon>` — green check overlay
- `cancel<Icon>` — red x overlay
- `search<Icon>` — magnifier overlay
- `spin<dps><Icon>` — continuous rotation at N°/second (e.g. `spin360Loader`)
- `spin_<dps><Icon>` — counter-clockwise (e.g. `spin_180Star`)

The overlay rules are just string rewrites — for example, `unFoo`
becomes `slash25o$foo75s75o`. **Overlay icons should have a square
viewBox** for best results on non-square base icons.

### Custom rules

`iconRules` is a mutable array. Each rule has a `prefix` (string or
RegExp) and an `apply` function that returns a **string** (resolved
through the full pipeline), an **Element** (used directly), or **null**
(skip to next rule):

    // String rewrite: addFoo → plus75o_0000ffS$foo75s50o
    iconRules.push({
      prefix: 'add',
      apply: (baseName) => `plus75o_0000ffS$${baseName}75s50o`,
    })

    // Function rule with side effects (like spin)
    iconRules.push({
      prefix: /^glow(\d+)/,
      apply: (baseName, match, parts) => {
        const icon = resolveIcon(baseName, parts)
        icon.style.filter = `brightness(${match[1]}%)`
        return icon
      },
    })

### Composites and `svg2DataUrl`

Composed icons (stacked, overlay rules) are wrapped in a `<span>`, not
a single SVG. `svg2DataUrl()` will render only the base icon and log a
console error. Simple suffix transforms and plain icons work normally
with `svg2DataUrl`.


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
  vars,
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
  prefix: string | RegExp
  apply: (
    baseName: string,
    match: RegExpMatchArray | string,
    parts: ElementPart[]
  ) => Element | string | null
}

const spinKeyframesInjected = { done: false }

export const iconRules: IconRule[] = [
  {
    prefix: /^spin(_?\d+)/,
    apply(baseName, match, parts) {
      const dps = (match as RegExpMatchArray)[1].replace('_', '-')
      const duration = 360 / Math.abs(parseFloat(dps))
      const direction = dps.startsWith('-') ? 'reverse' : 'normal'
      if (!spinKeyframesInjected.done) {
        const style = document.createElement('style')
        style.textContent =
          '@keyframes tosi-spin { to { transform: rotate(360deg) } }'
        document.head.appendChild(style)
        spinKeyframesInjected.done = true
      }
      const icon = resolveIcon(baseName, [])
      ;(
        icon as HTMLElement
      ).style.animation = `tosi-spin ${duration}s linear infinite ${direction}`
      return wrapIcon(baseName, parts, icon)
    },
  },
  {
    prefix: 'un',
    apply: (baseName) => `slash25o$${baseName}75s75o`,
  },
  {
    prefix: 'check',
    apply: (baseName) => `check75o_00aa00S$${baseName}75s50o`,
  },
  {
    prefix: 'cancel',
    apply: (baseName) => `x75o_cc0000S$${baseName}75s50o`,
  },
  {
    prefix: 'search',
    apply: (baseName) => `search80s30x30y$${baseName}50o`,
  },
]

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
  const wrapper = elements.span(
    {
      class: 'tosi-icon-composite',
      dataIcon: prop,
      style: {
        display: 'inline-flex',
        position: 'relative',
        pointerEvents: 'none',
      },
    },
    ...children
  )
  // Merge any style parts without clobbering the wrapper's own styles
  for (const part of parts) {
    if (part && typeof part === 'object' && !('nodeType' in (part as any))) {
      const props = part as Record<string, any>
      if (props.style && typeof props.style === 'object') {
        Object.assign(wrapper.style, props.style)
      }
      if (props.class) {
        wrapper.classList.add(...String(props.class).split(' '))
      }
    }
  }
  return wrapper
}

function composeIcon(prop: string, parts: ElementPart[]): Element | null {
  for (const rule of iconRules) {
    let baseName: string
    let match: RegExpMatchArray | string

    if (rule.prefix instanceof RegExp) {
      const re = new RegExp(rule.prefix.source + '(.+)$')
      const m = prop.match(re)
      if (!m) continue
      baseName = m[m.length - 1]
      baseName = baseName[0].toLowerCase() + baseName.slice(1)
      match = m
    } else {
      if (!prop.startsWith(rule.prefix) || prop.length <= rule.prefix.length)
        continue
      baseName =
        prop[rule.prefix.length].toLowerCase() +
        prop.slice(rule.prefix.length + 1)
      match = rule.prefix
    }

    const result = rule.apply(baseName, match, parts)
    if (typeof result === 'string') return resolveIcon(result, parts)
    if (result) return result
  }

  return null
}

const MAX_REDIRECTS = 10

// Style suffixes — always value then letter code:
//   50o (opacity), 75s (scale), 20x (translateX%), _10y (translateY%)
//   90r (rotate 90°), _45r (rotate -45°), 0f (flipH), 1f (flipV)
//   _ff0000F (fill), _f00S (stroke), 3W (stroke-width)
const SUFFIX_RE = /(_?\d{2,3}[osxyr]|[01]f|_[0-9a-fA-F]{3,8}[FS]|\d{1,3}W)+$/

function parseStyleSuffixes(name: string): {
  baseName: string
  style: Partial<CSSStyleDeclaration>
} | null {
  const match = name.match(SUFFIX_RE)
  if (!match) return null
  const baseName = name.slice(0, match.index!)
  if (!baseName) return null

  const style: Partial<CSSStyleDeclaration> = {}
  const suffixes = match[0].match(
    /_?\d{2,3}[osxyr]|[01]f|_[0-9a-fA-F]{3,8}[FS]|\d{1,3}W/g
  )!
  let tx = ''
  let ty = ''
  let scale = ''
  let rotate = ''
  let flip = ''
  for (const s of suffixes) {
    const code = s[s.length - 1]
    if (code === 'F') {
      style.fill = '#' + s.slice(1, -1)
    } else if (code === 'S') {
      style.stroke = '#' + s.slice(1, -1)
    } else if (code === 'W') {
      style.strokeWidth = s.slice(0, -1)
    } else {
      const val = parseInt(s.replace('_', '-'))
      switch (code) {
        case 'o':
          style.opacity = String(val / 100)
          break
        case 's':
          scale = `scale(${val / 100})`
          break
        case 'x':
          tx = `translateX(${val}%)`
          break
        case 'y':
          ty = `translateY(${val}%)`
          break
        case 'r':
          rotate = `rotate(${val}deg)`
          break
        case 'f':
          flip = val === 0 ? 'scaleX(-1)' : 'scaleY(-1)'
          break
      }
    }
  }
  const transform = [rotate, flip, scale, tx, ty].filter(Boolean).join(' ')
  if (transform) {
    style.transform = transform
    style.transformOrigin = '50% 50%'
  }
  return { baseName, style }
}

function resolveIcon(prop: string, parts: ElementPart[]): Element {
  const data = iconData as Record<string, string>

  // Direct match or redirect chain
  let name = prop
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const spec = data[name]
    if (!spec) break
    if (spec.startsWith('<')) return makeIcon(spec, parts)
    name = spec
  }
  if (name !== prop) {
    const composed = composeIcon(name, parts)
    if (composed) return composed
    const parsed = parseStyleSuffixes(name)
    if (parsed) {
      const icon = resolveIcon(parsed.baseName, parts)
      Object.assign((icon as HTMLElement).style, parsed.style)
      return icon
    }
  }

  // Stack: foo$bar$baz → baz on bottom, bar on top, foo on top
  if (prop.includes('$')) {
    const segments = prop.split('$')
    // Last segment is the base (sets the size), rest are overlays
    const base = resolveIcon(segments[segments.length - 1], [])
    const overlays = segments.slice(0, -1).map((name) => {
      const icon = resolveIcon(name, [])
      Object.assign((icon as HTMLElement).style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
      })
      return icon
    })
    return wrapIcon(prop, parts, base as Element, ...(overlays as Element[]))
  }

  // Style suffixes first — strip them, resolve the base, apply after
  const parsed = parseStyleSuffixes(prop)
  if (parsed) {
    const icon = resolveIcon(parsed.baseName, parts)
    Object.assign((icon as HTMLElement).style, parsed.style)
    return icon
  }

  // Try composition (spin, un, check, etc.)
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
      verticalAlign: 'text-bottom',
      stroke: 'currentColor',
      strokeWidth: varDefault.tosiIconStrokeWidth('2px'),
      strokeLinejoin: varDefault.tosiIconStrokeLinejoin('round'),
      strokeLinecap: varDefault.tosiIconStrokeLinecap('round'),
      fill: varDefault.tosiIconFill('none'),
      height: vars.tosiIconSize,
    },
    ':host svg, :host .tosi-icon-composite': {
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
