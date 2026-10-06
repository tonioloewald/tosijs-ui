# live-theme

> **Work in progress** — this component is under active development and its API may change.

A live theme editor that lets you tweak theme colors in real time.
Changes apply instantly to the page. The editor itself is immune to
theme changes (it uses hardcoded styles in shadow DOM).

## Theme Editor

```html
<tosi-theme-editor></tosi-theme-editor>
```
```js
import { tosiThemeEditor, liveTheme } from 'tosijs-ui'

preview.append(tosiThemeEditor())
```

## Programmatic Control

The `liveTheme` observable lets you read and write theme values from code:

```js
import { liveTheme } from 'tosijs-ui'

// Read current values
// liveTheme.accent.value   // '#d92270'
// liveTheme.dark.value     // false

// Set values programmatically (triggers immediate theme update)
// liveTheme.accent.value = '#0064d2'
```

## CSS canary

A smoke test for the whole styling chain — `StyleSheet()` injection → the `vars`
proxy → scaled-var math → `createTheme`/`applyTheme` → the cascade → real
`getComputedStyle`. Each link is **silent when it breaks** (no throw, no unit-test
failure — happy-dom can't resolve `var()` or the cascade), so it needs a real
browser, which is exactly where this inline test runs. Green here means "styling is
fundamentally working"; a red means a **system-level** CSS break, not a component
quirk — the signal that keeps a debugging session out of a blind alley.

```test
import { StyleSheet, vars, Color } from 'tosijs'
import { createTheme, createDarkTheme } from 'tosijs-ui'

// Let the style/layout system apply an injected StyleSheet before we measure.
const raf = () => new Promise((r) => requestAnimationFrame(() => r(null)))

test('css canary: StyleSheet injects and vars (incl. scaled) resolve to computed px', async () => {
  // Define our OWN var so the check is deterministic, not hostage to the page theme.
  StyleSheet('css-canary-vars', {
    '.css-canary-vars': {
      _canarySpace: '20px', // → --canary-space: 20px
      padding: vars.canarySpace, // var(--canary-space) → 20px
      marginLeft: vars.canarySpace50, // calc(var(--canary-space) * 0.5) → 10px
    },
  })
  const box = document.createElement('div')
  box.className = 'css-canary-vars'
  preview.append(box)
  await raf()
  const cs = getComputedStyle(box)
  expect(cs.paddingTop).toBe('20px') // StyleSheet injected + vars proxy resolved
  expect(cs.marginLeft).toBe('10px') // scaled-var calc() machinery works
})

test('css canary: a theme color change reaches computed style', async () => {
  const scope = document.createElement('div')
  scope.className = 'css-canary-scope'
  const swatch = document.createElement('div')
  swatch.className = 'css-canary-swatch'
  scope.append(swatch)
  preview.append(scope)
  StyleSheet('css-canary-swatch', {
    '.css-canary-swatch': { color: vars.tosiAccent }, // var(--tosi-accent)
  })
  // Scope each theme's :root vars onto our container (not the whole page); the later
  // sheet wins by cascade order, so this is robust to StyleSheet's dedup behavior.
  const applyAccent = (hex, id) => {
    const theme = createTheme({
      accent: Color.fromCss(hex),
      background: Color.fromCss('#ffffff'),
      text: Color.fromCss('#000000'),
    })
    StyleSheet(id, { '.css-canary-scope': theme[':root'] })
  }
  applyAccent('#ff0000', 'css-canary-theme-1')
  await raf()
  const red = getComputedStyle(swatch).color
  applyAccent('#0000ff', 'css-canary-theme-2')
  await raf()
  const blue = getComputedStyle(swatch).color
  expect(red).toMatch(/^rgb/) // resolved to a real color, not an unresolved var()
  expect(red).not.toBe(blue) // the bound color change propagated to computed style
})

test('css canary: dark mode recomputes the background', async () => {
  const el = document.createElement('div')
  el.className = 'css-canary-dark'
  preview.append(el)
  StyleSheet('css-canary-dark-bg', {
    '.css-canary-dark': { background: vars.tosiBg }, // var(--tosi-bg)
  })
  const colors = {
    accent: Color.fromCss('#d92270'),
    background: Color.fromCss('#ffffff'),
    text: Color.fromCss('#111111'),
  }
  StyleSheet('css-canary-light-theme', {
    '.css-canary-dark': createTheme(colors)[':root'],
  })
  await raf()
  const light = getComputedStyle(el).backgroundColor
  StyleSheet('css-canary-dark-theme', {
    '.css-canary-dark': createDarkTheme(colors)[':root'],
  })
  await raf()
  const dark = getComputedStyle(el).backgroundColor
  expect(light).not.toBe(dark) // luminance inversion actually recomputed the value
})

test('css canary: Color math (inverseLuminance) yields a distinct valid color', () => {
  const white = Color.fromCss('#ffffff')
  const inv = white.inverseLuminance
  expect(inv).toBeInstanceOf(Color)
  expect(String(inv)).not.toBe(String(white)) // the color polyfill computed something
})
```
