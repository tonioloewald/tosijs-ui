/*#
# icons

<div class="center">
  <xin-icon icon="settings" style="--xin-icon-size: 128px"></xin-icon>
  <xin-icon icon="xrColor" style="--xin-icon-size: 96px"></xin-icon>
  <xin-icon icon="rgb" style="--xin-icon-size: 128px"></xin-icon>
</div>

A library that provides `ElementCreator` functions that produce SVG icons. It leverages `tosijs`'s
`svgElements` proxy and is intended to address all the key use-cases for SVG icons in web
applications along with being very easy to extend and maintain.

> ### Supported Use Cases
> - inline SVGs that can be styled by CSS (for buttons, etc.)
> - allows both stroked and filled icons (unlike font-based systems)
> - No build process magic needed (it's "just javascript")
> - highly optimized and compressible
> - support for color icons (without requiring multiple glyphs perfectly aligned)
> - icons can be rendered  as data urls, e.g. to insert into CSS…

## icons

`icons` is a proxy that generates an `ElementCreator` for a given icon on demand,
e.g. `icons.chevronDown()` produces an `<svg>` element containing a downward-pointing chevron
icon with the class `icon-chevron-down`.

```js
const  { tosi } = tosijs
const { icons, svgIcon, postNotification } = tosijsui
const { div } = tosijs.elements

const { iconDemo } = tosi({
  iconDemo: {
    icon: ''
  }
})

preview.append(
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
  background: #fff8;
  padding: 10px;
  gap: 10px;
  border-radius: 5px;
}

.preview .tile:hover {
  background: white;
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

.preview .tile xin-icon {
  font-size: 24px;
}

.preview .icon-detail {
  position: absolute;
  display: block;
  height: 256px;
  opacity: 0;
  transition: 0.5s ease-out;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fffc;
  padding: 10px;
  borderRadius: 10px;
  pointerEvents: none;
}
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

Icons will be generated with the class `xin-icon`.

You can also assign the classes `filled`, `stroked`, and `color` to icons to set default
icon styling.

## `<xin-icon>`

`<xin-icon>` is a simple component that lets you embed icons as HTML. Check the CSS tab to see
how it's styled.

`<xin-icon>` supports four attributes:

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
const { elements } = tosijs
const { icons, svg2DataUrl } = tosijsui

preview.append(
  elements.span({
    style: {
      display: 'inline-block',
      width: '120px',
      height: '24px',
      content: '" "',
      background: svg2DataUrl(icons.star(), 'none', '#bbb', 3)
    }
  }),
  elements.span({
    style: {
      display: 'inline-block',
      width: '120px',
      height: '24px',
      content: '" "',
      background: svg2DataUrl(icons.star(), 'gold', 'orange', 2)
    }
  }),
  elements.span({
    style: {
      display: 'inline-block',
      width: '100px',
      height: '200px',
      content: '" "',
      background: svg2DataUrl(icons.tosi())
    }
  }),
)
```

`svg2DataUrl(svg: SVGElement, fill?: string, stroke?: string): string` is provided as a
utility for converting SVG elements into data-urls (e.g. for incorporation into
CSS properties. (It's used by the `<xin-3d>` component to render the XR widget.)

If you're using `SVGElement`s created using the `icons` proxy, you'll want to provide `fill` and/or
`stroke` values, because images loaded via css properties cannot be styled.

## Color Icons

```html
<xin-icon icon="tosiFavicon" class="demo-icon"></xin-icon>
<xin-icon icon="tosiPlatform" class="demo-icon recolored"></xin-icon>
<xin-icon icon="tosiXr" class="demo-icon animated"></xin-icon>
```
```css
.demo-icon {
  --xin-icon-size: 160px
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
  ElementProps,
  Component as WebComponent,
  XinStyleRule,
  Color,
  varDefault,
  StyleSheet,
} from 'tosijs'
import { SVGIconMap } from './icon-types'
import iconData from './icon-data'

const { svg, path } = svgElements

export const defineIcons = (newIcons: { [key: string]: string }): void => {
  Object.assign(iconData, newIcons)
}

export const svg2DataUrl = (
  svg: SVGElement,
  fill?: string | false,
  stroke?: string | false,
  strokeWidth: number | string = 1
): string => {
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (fill || stroke) {
    for (const path of [...svg.querySelectorAll('path, polygon')]) {
      if (fill) {
        path.setAttribute('fill', fill)
      }
      if (stroke) {
        path.setAttribute('stroke', stroke)
        path.setAttribute('stroke-width', String(strokeWidth))
      }
    }
  }

  const styled = svg.querySelectorAll('[style]')
  svg.removeAttribute('style')
  for (const item of [...styled] as HTMLElement[]) {
    const { fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin } =
      item.style
    if (fill) item.setAttribute('fill', Color.fromCss(fill).html)
    if (stroke) item.setAttribute('stroke', Color.fromCss(stroke).html)
    if (strokeWidth) item.setAttribute('strokeWidth', strokeWidth)
    if (strokeLinecap) item.setAttribute('strokeLinecap', strokeLinecap)
    if (strokeLinejoin) item.setAttribute('strokeLinejoin', strokeLinejoin)
    item.removeAttribute('style')
  }

  const text = encodeURIComponent(svg.outerHTML)
  return `url(data:image/svg+xml;charset=UTF-8,${text})`
}

export const icons = new Proxy(iconData, {
  get(
    target,
    prop: string
  ): ElementCreator {
    let iconSpec = iconData[prop as keyof typeof iconData] as string
    if (prop && !iconSpec) {
      console.warn(`icon ${prop} does not exist`)
    }
    if (!iconSpec) {
      iconSpec = iconData.square
    }
    return (...parts: ElementPart[]) => {
      const div = elements.div()
      div.innerHTML = iconSpec
      const sourceSvg = div.querySelector('svg') as SVGElement
      const classes = new Set(sourceSvg.classList)
      classes.add('xin-icon')
      const svg = svgElements.svg(
        {
          class: Array.from(classes).join(' '),
          viewBox: sourceSvg.getAttribute('viewBox'),
        },
        ...parts,
        ...sourceSvg.children
      )
      svg.style.strokeWidth = varDefault.xinIconStrokeWidth('2px')
      svg.style.stroke = varDefault.xinIconStroke(
        classes.has('filled') ? 'none' : 'currentColor'
      )
      svg.style.fill = varDefault.xinIconFill(
        classes.has('stroked') ? 'none' : 'currentColor'
      )
      svg.style.height = varDefault.xinIconSize('16px')
      return svg
    }
  },
}) as unknown as SVGIconMap

export class SvgIcon extends WebComponent {
  icon = ''
  size = 0
  fill = ''
  stroke = ''
  strokeWidth = 1

  constructor() {
    super()

    this.initAttributes('icon', 'size', 'fill', 'stroke', 'strokeWidth')
  }

  render(): void {
    this.textContent = ''
    const style: XinStyleRule = {}
    if (this.size) {
      style.height = this.size
      this.style.setProperty('--xin-icon-size', `${this.size}px`)
    }
    if (this.stroke) {
      style.stroke = this.stroke
      style.strokeWidth = this.strokeWidth
    }
    style.fill = this.fill
    this.append(icons[this.icon]({ style }))
  }
}

export const svgIcon = SvgIcon.elementCreator({
  tag: 'xin-icon',
  styleSpec: {
    ':host': {
      display: 'inline-flex',
      stroke: 'currentColor',
      strokeWidth: varDefault.iconStrokeWidth('2px'),
      strokeLinejoin: varDefault.iconStrokeLinejoin('round'),
      strokeLinecap: varDefault.iconStrokeLinecap('round'),
      fill: varDefault.iconFill('none'),
    },
    ':host, :host svg': {
      height: varDefault.xinIconSize('16px'),
    },
  },
})
