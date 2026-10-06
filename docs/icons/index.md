# icons

<div class="center" style="display: flex; gap: 10px; padding: 10px">
  <tosi-icon title="tosijs" icon="tosiFavicon" style="--tosi-icon-size: 128px"></tosi-icon>
  <tosi-icon title="tosijs-ui" icon="tosiUi" style="--tosi-icon-size: 128px"></tosi-icon>
  <tosi-icon title="tosi-platform" icon="tosiPlatform" style="--tosi-icon-size: 128px"></tosi-icon>
</div>

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

// Named distinctly from the re-exported `iconNames()` FUNCTION at the bottom of this
// file — same word, different thing, and the collision reads like a bug.
const sortedIconNames = Object.keys(icons).sort()

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
  for (const iconName of sortedIconNames) {
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

### Need More Icons?

[lucide](https://lucide.dev) is a fork of feather that maintains the style and adds a lot more
options. Obviously it's completely compatible with this icon system and generously licensed. A
good place to find more icons in a pinch.

Concretely: lucide emits the same geometry feather does — `24×24` viewBox, `fill="none"`,
`stroke="currentColor"`, `stroke-width="2"`, round caps and joins — so a downloaded SVG drops
straight into `defineIcons()` below and inherits colour and sizing like any built-in. It is
ISC licensed.

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

<tosi-icon icon="tosi$map50o_brandColorS" size=128></tosi-icon>
<tosi-icon icon="lock50s75o_10y$shield_brandColorS" size=128></tosi-icon>
<tosi-icon icon="unLock_brandColorS" size=128></tosi-icon>
<tosi-icon icon="checkFile" size=128></tosi-icon>
<tosi-icon icon="spin120Loader40s_30x_brandColorS$cloud" size=128></tosi-icon>

### Why?

I needed a pin icon for column pinning in the data table. The only pin
in the feather set is a map pin, so I created a push-pin icon
<tosi-icon icon="pin_brandColorS" size=24></tosi-icon>.
But immediately I also needed unpin, pin-left, and pin-right — a lot
of new icons for one feature. Of course I could flip the pin with CSS, but
this is a problem *everywhere, all the time*: every directional icon
needs 2–4 variants, every action needs a negation, every status needs
an overlay.

Why not fix it once and also eliminate the need to maintain trivial
variations on every icon?

<tosi-icon icon="pin_brandColorS" size=64></tosi-icon>
<tosi-icon icon="pin0f_brandColorS" size=64></tosi-icon>
<tosi-icon icon="unPin_brandColorS" size=64></tosi-icon>

And now we can just create icon languages…

<tosi-icon icon="checkUsers" size=64></tosi-icon>
<tosi-icon icon="searchMap" size=64></tosi-icon>
<tosi-icon icon="cancelHeart" size=64></tosi-icon>

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
- `_<HEX>F` — fill color (e.g. `star_FF0000F` = red fill; use uppercase hex)
- `_<HEX>S` — stroke color (e.g. `lock_00FS` = blue stroke)
- `_<camelCase>F` — fill CSS variable (e.g. `star_brandColorF` = `var(--brand-color)`)
- `_<camelCase>S` — stroke CSS variable (e.g. `lock_accentS` = `var(--accent)`)
- CSS color math works too: `star_brandColor40oF` = brand color at 40% opacity
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
(skip to next rule).

String rewrites are the simplest — just return a composition string:

    // String rewrite: addFoo → plus75o_0000ffS$foo75s50o
    iconRules.push({
      prefix: 'add',
      apply: (baseName) => `plus75o_0000ffS$${baseName}75s50o`,
    })

Function rules can use `resolveIcon()` and `wrapIcon()` (both exported)
for more control:

    // Function rule: glowNNFoo → foo with brightness filter
    iconRules.push({
      prefix: /^glow(\d+)/,
      apply: (baseName, match, parts) => {
        const icon = resolveIcon(baseName, parts)
        icon.style.filter = `brightness(${match[1]}%)`
        return wrapIcon(baseName, parts, icon)
      },
    })

- `resolveIcon(name, parts)` — resolve any icon name through the full
  pipeline (redirects, suffixes, rules, stacking)
- `wrapIcon(name, parts, ...children)` — wrap elements in a composite
  container with proper sizing, `pointer-events: none`, and `data-icon`

### Building an icon vocabulary

You don't need to spell out the DSL every time. The real power is in
defining named patterns that become your application's icon language.
For example, a `remove` prefix that overlays a trash icon:

    iconRules.push({
      prefix: 'remove',
      apply: (baseName) =>
        `trash75o_actionColorS$${baseName}50o`,
    })

Now `removeUser`, `removeFile`, `removeProject` all just work — and
they're consistent. If you redesign the trash icon or change
`--action-color`, every "remove" icon updates automatically.

You can also use `defineIcons` for one-off named compositions:

    defineIcons({
      cloudSync: 'spin120Loader40s_30x$cloud',
      secureShield: 'lock50s75o_10y$shield',
      newFile: 'plus75o60s25x25y$file',
    })

Then just use `icons.cloudSync()` or `<tosi-icon icon="cloudSync">` —
the composition is invisible to consumers of the icon.

### Composites and `svg2DataUrl`

Composed icons (stacked, overlay rules) are wrapped in a `<span>`, not
a single SVG. `svg2DataUrl()` will render only the base icon and log a
console error. Simple suffix transforms and plain icons work normally
with `svg2DataUrl`.

## Missing Icons

If you ask for an icon that isn't defined, the `icons` proxy will print a warning to console
and render a `square` (in fact, `icons.square()`) as a fallback.

## Icon Sources

Many of these icons are sourced from [Feather Icons](https://github.com/feathericons/feather), but
all the icons have been processed to have integer coordinates in a `viewBox` typically scaled to 1024  &times; 1024.

The corporate logos (Google, etc.) are from a variety of sources, in many cases ultimately from the
organizations themselves. It's up to you to use them correctly.

The remaining icons I have created myself using the excellent but sometimes flawed
[Amadine](https://apps.apple.com/us/app/amadine-vector-design-art/id1339198386?mt=12)
and before that [Graphic](https://apps.apple.com/us/app/graphic/id404705039?mt=12).

### Building icon data

Use [make-icon-data](/?make-icon-data.js) to generate icon data from SVG files.
It supports directional folder conventions to auto-generate rotated and flipped
variants, eliminating redundant SVGs.

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
