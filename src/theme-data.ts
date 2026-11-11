/*#
# theme data

A theme as plain data: a few **base** values (the brand colours) that a generator turns into
every variable a page needs, plus values tuned **by hand** for each mode. It serialises to
JSON, so a project or a customer can save one and load it back, and applying it is one
stylesheet: no editor code, which lives apart on `tosijs-ui/theme-editor`.

```js
import { applyThemeData, componentThemeGenerator } from 'tosijs-ui'

const theme = {
  base: { accent: '#0b7a5c', background: '#fbfaf7', text: '#1d1d1b' },
  light: { 'tosi-border-radius': '12px' },
  dark: {},
  highContrast: {},
  darkHighContrast: {},
}
// Scoped to the demo; a page's own theme would leave out `selectors`.
const resolved = applyThemeData(theme, componentThemeGenerator, {
  id: 'theme-data-demo',
  selectors: {
    light: '.theme-data-demo',
    dark: '.darkmode .theme-data-demo',
    highContrast: '.high-contrast:not(.darkmode) .theme-data-demo',
    darkHighContrast: '.darkmode.high-contrast .theme-data-demo',
  },
})

preview.append(
  Object.assign(document.createElement('div'), {
    className: 'theme-data-demo',
    textContent: `accent ${resolved.light['tosi-accent']}, radius ${resolved.light['tosi-border-radius']}`,
  })
)
```
```css
.theme-data-demo {
  padding: var(--tosi-spacing);
  border-radius: var(--tosi-border-radius);
  background: var(--tosi-accent);
  color: var(--tosi-accent-text);
}
```
```test
test('base values generate the palette, and a hand-tuned value wins', () => {
  const box = preview.querySelector('.theme-data-demo')
  const style = getComputedStyle(box)
  expect(style.borderRadius).toBe('12px')
  expect(style.backgroundColor).toBe('rgb(11, 122, 92)')
})
```

## Modes

There are four: `light`, `dark`, `highContrast` and `darkHighContrast`. Every mode but light is
**generated**:

- **dark** from the light values, with their luminance inverted (a value you tuned in light is
  carried over, inverted), then the generator's own dark adjustments;
- **high contrast** from the base, with the background pushed to white, the text to black and
  the accent darkened until it reaches 7:1, the WCAG AAA ratio, against that background;
- **dark high contrast** the same way, inverted.

A value tuned by hand in a mode wins over the generated one, and survives regeneration: change
the accent, and every generated value follows while your tuned ones stay put.

Each mode is written under its own selector (`THEME_MODE_SELECTORS`): `:root`, `.darkmode`,
`.high-contrast:not(.darkmode)` and `.darkmode.high-contrast`, which are the classes the doc system puts on
`<html>` and `<body>`. Pass `selectors` to use your own. A mode other than light only writes
what differs from light, so a font or a size you set once applies in every mode unless a mode
tunes it.

## Generators

A generator says which base values there are, and turns them into each mode's variables:

- `componentThemeGenerator` is the tosijs-ui component theme (`createTheme`), with base values
  `accent`, `background` and `text`;
- the doc system has its own, `docSystemThemeGenerator`, which its theme editor uses.

Variable names are CSS custom properties without the leading dashes: `tosi-accent`, not
`--tosi-accent` or `tosiAccent`.
*/

/*{ "parent": "Helper Libraries", "description": "A theme as plain JSON data: base colours generate light, dark and high-contrast modes, values tuned by hand win, and one stylesheet applies it." }*/

import {
  Color,
  StyleSheet,
  XinStyleRule,
  XinStyleSheet,
  invertLuminance,
} from 'tosijs'
import { createTheme, readableOn } from './theme.js'

/** The kinds of value a theme variable can hold; each gets its own control in the editor. */
export type ThemeKind =
  'color' | 'length' | 'number' | 'font-family' | 'image' | 'enum' | 'text'

export interface ThemeVariable {
  /** the CSS custom property without its leading dashes, e.g. `tosi-accent` */
  name: string
  kind: ThemeKind
  /** what the editor calls it; defaults to the name */
  label?: string
  /** a heading the editor groups it under */
  group?: string
  /** the choices, for `enum` */
  options?: string[]
}

export type ThemeMode = 'light' | 'dark' | 'highContrast' | 'darkHighContrast'

export const THEME_MODES: ThemeMode[] = [
  'light',
  'dark',
  'highContrast',
  'darkHighContrast',
]

/** Variable name → CSS value. */
export type ThemeValues = Record<string, string>

export interface ThemeData {
  /** the generator's inputs, e.g. `{ accent: '#d92270' }` */
  base: Record<string, string>
  /** values tuned by hand, per mode; these win over the generated ones */
  light?: ThemeValues
  dark?: ThemeValues
  highContrast?: ThemeValues
  darkHighContrast?: ThemeValues
}

export interface ThemeGenerator {
  /** the base values it reads, as colour variables named by their key in `base` */
  base: ThemeVariable[]
  /** the base value used when a theme leaves one out */
  defaults: Record<string, string>
  /** every light-mode variable, from the base */
  light(base: Record<string, string>): ThemeValues
  /** what dark mode changes, from the base and the resolved light values */
  dark(base: Record<string, string>, light: ThemeValues): ThemeValues
}

export const THEME_MODE_SELECTORS: Record<ThemeMode, string> = {
  light: ':root',
  dark: '.darkmode',
  // Not in dark mode, or its light values would show through wherever dark high contrast
  // writes nothing of its own.
  highContrast: '.high-contrast:not(.darkmode)',
  darkHighContrast: '.darkmode.high-contrast',
}

/** `_tosiAccent` (a XinStyleRule key) → `tosi-accent`. */
const variableName = (key: string): string =>
  key.slice(1).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/** `tosi-accent` → `_tosiAccent`, the XinStyleRule spelling of `--tosi-accent`. */
const ruleKey = (name: string): string =>
  '_' + name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())

/** The custom properties a XinStyleRule declares, by variable name, as strings. */
export function ruleValues(rule: XinStyleRule | undefined): ThemeValues {
  const values: ThemeValues = {}
  for (const [key, value] of Object.entries(rule ?? {})) {
    if (key.startsWith('_') && !key.startsWith('__') && value != null) {
      values[variableName(key)] = String(value)
    }
  }
  return values
}

/*
A colour literal, never a font name that happens to be a word: `serif` is not a colour, and
inverting it would write `#fff` into a font stack. Named colours count only where the browser
says so.
*/
const isColor = (value: string): boolean => {
  const v = value.trim()
  if (/^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([^()]*\))$/i.test(v)) return true
  return (
    /^[a-z]+$/i.test(v) &&
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('color', v)
  )
}

/** The colours among `values`, with their luminance inverted; everything else is dropped. */
export function invertedColors(values: ThemeValues): ThemeValues {
  const rule: XinStyleRule = {}
  for (const [name, value] of Object.entries(values)) {
    if (isColor(value)) rule[ruleKey(name)] = value
  }
  return ruleValues(invertLuminance(rule))
}

/** White background, black text, and the accent darkened to 7:1 against it. */
export function highContrastBase(
  base: Record<string, string>
): Record<string, string> {
  const white = Color.fromCss('#ffffff')
  const out: Record<string, string> = { ...base }
  if ('background' in base) out.background = '#ffffff'
  if ('text' in base) out.text = '#000000'
  if (base.accent)
    out.accent = readableOn(Color.fromCss(base.accent), white, 7).html
  return out
}

const differences = (values: ThemeValues, from: ThemeValues): ThemeValues =>
  Object.fromEntries(
    Object.entries(values).filter(([name, value]) => from[name] !== value)
  )

/** Every mode's variables: generated, then the hand-tuned values on top. */
export function resolveTheme(
  data: ThemeData,
  generator: ThemeGenerator
): Record<ThemeMode, ThemeValues> {
  const base = { ...generator.defaults, ...data.base }
  const generatedLight = generator.light(base)
  const light = { ...generatedLight, ...data.light }
  const dark = { ...generator.dark(base, light), ...data.dark }

  /*
  High contrast writes only what its base CHANGES, measured against the generated values, not
  the tuned ones: a font tuned in light differs from the generated font, and carrying the
  generated one into high contrast would undo the tuning there.
  */
  const contrastBase = highContrastBase(base)
  const contrastLight = generator.light(contrastBase)
  const highContrast = {
    ...differences(contrastLight, generatedLight),
    ...data.highContrast,
  }
  const contrastDark = generator.dark(contrastBase, contrastLight)
  const darkHighContrast = {
    ...differences(contrastDark, generator.dark(base, generatedLight)),
    ...data.darkHighContrast,
  }
  return { light, dark, highContrast, darkHighContrast }
}

/** The stylesheet for a theme: each mode's variables under its selector. */
export function themeStyleSheet(
  resolved: Record<ThemeMode, ThemeValues>,
  selectors: Partial<Record<ThemeMode, string>> = {}
): XinStyleSheet {
  const sheet: XinStyleSheet = {}
  for (const mode of THEME_MODES) {
    const selector = selectors[mode] ?? THEME_MODE_SELECTORS[mode]
    const rule: XinStyleRule = {}
    for (const [name, value] of Object.entries(resolved[mode])) {
      rule[ruleKey(name)] = value
    }
    if (Object.keys(rule).length) sheet[selector] = rule
  }
  return sheet
}

/**
 * Apply a theme to the page, as one stylesheet (`id`, replaced on every call), and return
 * what it resolved to.
 */
export function applyThemeData(
  data: ThemeData,
  generator: ThemeGenerator,
  {
    id = 'tosi-theme-data',
    selectors = {},
  }: { id?: string; selectors?: Partial<Record<ThemeMode, string>> } = {}
): Record<ThemeMode, ThemeValues> {
  const resolved = resolveTheme(data, generator)
  StyleSheet(id, themeStyleSheet(resolved, selectors))
  return resolved
}

/** The tosijs-ui component theme (`createTheme`), driven by accent, background and text. */
export const componentThemeGenerator: ThemeGenerator = {
  base: [
    { name: 'accent', kind: 'color', label: 'Accent' },
    { name: 'background', kind: 'color', label: 'Background' },
    { name: 'text', kind: 'color', label: 'Text' },
  ],
  defaults: { accent: '#d92270', background: '#fafafa', text: '#222222' },
  light: (base) =>
    ruleValues(
      createTheme({
        accent: Color.fromCss(base.accent),
        background: Color.fromCss(base.background),
        text: Color.fromCss(base.text),
      })[':root'] as XinStyleRule
    ),
  dark: (_base, light) => invertedColors(light),
}
