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
  modes: { light: { 'tosi-border-radius': '12px' } },
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

A theme's modes are a list (`ThemeModeSpec[]`), and `THEME_MODE_SPECS` is the one used unless
you pass `modes`: `light`, `dark`, `highContrast` and `darkHighContrast`. Each mode names the
selector its values are written under, the classes that put a page in it (for the editor's
preview), the mode it is made `from` (light unless it says otherwise) and how it is made from
it (`derive`):

- `'invert'` inverts luminance; with a generator, its own dark adjustments follow. Dark is
  light inverted, and a value you tuned in light is carried over, inverted.
- `'contrast'` pushes values apart; with a generator, the base background goes to white, the
  text to black, and the accent darkens until it reaches 7:1 (WCAG AAA) against it. Dark high
  contrast is high contrast, inverted.
- `'monochrome'` takes the colour out, and `{ tint: '#3355dd', amount }` takes it out and
  tints toward a hue.
- A function of the values does anything else.

Only colour **literals** are transformed. A value derived from others (`color-mix(in oklab,
var(--accent) 20%, white)`) is left as written, and the browser derives it again from the
transformed roots. So a mode needs to change only the few colours everything else hangs from.

A theme declares modes of its own by passing a list, such as a tinted mode under `.tinted`:

```typescript
const modes = [
  ...THEME_MODE_SPECS,
  {
    name: 'tinted',
    label: 'Tinted',
    selector: '.tinted',
    classes: ['tinted'],
    derive: [{ tint: '#3355dd' }],
  },
]
applyThemeData(theme, null, { modes, page })
```

A value tuned by hand in a mode (`theme.modes.dark`) wins over the derived one, and survives
regeneration: change the accent, and every generated value follows while your tuned ones stay
put.

A mode other than the first writes only what differs from what the page would show anyway (so
a font or a size you set once applies in every mode unless a mode tunes it), plus whatever
another mode writes, since mode selectors can match together. Pass `selectors` to write a mode
somewhere else, such as a scoped part of the page.

**No generator.** A design system whose CSS derives its own variables (most do) needs no
generator: pass `null`, and pass `page`, what its CSS declares in each mode
(`discoverThemeVariables` finds it), so a derived mode has roots to transform. A mode with no
`derive`, or one the page's CSS declares itself, is then just what the page declares, plus
what you tune: the page's own dark mode is not second-guessed.

## Web fonts

`fonts` lists stylesheets to link, such as a Google Fonts URL; `applyThemeData` links them
(and unlinks ones the theme no longer names), and the doc site's build links them from each
page's `<head>`. Only `fonts.googleapis.com` and `fonts.bunny.net` are accepted, since linking a
stylesheet injects CSS. `parseFontImport` takes whatever Google Fonts offers you to copy (a
`<link>`, an `@import` line, or the URL) and returns the URL and its families.

## Generators

A generator says which base values there are, and turns them into each mode's variables:

- `componentThemeGenerator` is the tosijs-ui component theme (`createTheme`), with base values
  `accent`, `background` and `text`;
- the doc system has its own, `docSystemThemeGenerator`, which its theme editor uses.

Variable names are CSS custom properties without the leading dashes: `tosi-accent`, not
`--tosi-accent` or `tosiAccent`.
*/

/*{ "parent": "Helper Libraries", "description": "A theme as plain JSON data: base colours generate light, dark, high-contrast and any declared modes, values tuned by hand win, and one stylesheet applies it." }*/

import { Color, XinStyleRule, XinStyleSheet, invertLuminance } from 'tosijs'
import { createTheme, readableOn, replaceStyleSheet } from './theme.js'
import { allowedFontUrl } from './theme-fonts.js'

export {
  FONT_ORIGINS,
  allowedFontUrl,
  fontFamilies,
  parseFontImport,
} from './theme-fonts.js'

/** The kinds of value a theme variable can hold; each gets its own control in the editor. */
export type ThemeKind =
  | 'color'
  | 'length'
  | 'number'
  | 'font-family'
  | 'image'
  | 'enum'
  | 'shadow'
  | 'text'

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

/** A mode's name: `light`, `dark`, or one a theme declares (`tinted`). */
export type ThemeMode = string

/**
 * How a mode is made from another: `invert` (luminance, for dark), `contrast` (pushed apart;
 * with a generator, the base is pushed to white, black and a 7:1 accent), `monochrome`
 * (desaturated), `{ tint }` (monochrome, toward a colour's hue), or a function of the values.
 * Only colour literals are transformed: a value derived from others (`color-mix(…var(--x)…)`)
 * follows its parents in the browser.
 */
export type ThemeTransform =
  | 'invert'
  | 'contrast'
  | 'monochrome'
  | { tint: string; amount?: number }
  | ((values: ThemeValues) => ThemeValues)

export interface ThemeModeSpec {
  /** what a theme stores the mode's tuned values under, e.g. `dark` */
  name: ThemeMode
  /** what the editor calls it */
  label?: string
  /** the rule the mode's values are written under */
  selector: string
  /** the classes (on `<html>` and `<body>`) that put the page in this mode, for previewing */
  classes?: string[]
  /** the mode it is made from (light by default) */
  from?: ThemeMode
  /** how it is made from that mode; a mode with none is only what the page and the theme say */
  derive?: ThemeTransform[]
}

/** The modes a theme has unless it declares its own. */
export const THEME_MODE_SPECS: ThemeModeSpec[] = [
  { name: 'light', label: 'Light', selector: ':root', classes: [] },
  {
    name: 'dark',
    label: 'Dark',
    selector: '.darkmode',
    classes: ['darkmode'],
    derive: ['invert'],
  },
  {
    name: 'highContrast',
    label: 'High contrast',
    // Not in dark mode, or its values would show through wherever dark high contrast writes
    // nothing of its own.
    selector: '.high-contrast:not(.darkmode)',
    classes: ['high-contrast'],
    derive: ['contrast'],
  },
  {
    name: 'darkHighContrast',
    label: 'Dark high contrast',
    selector: '.darkmode.high-contrast',
    classes: ['darkmode', 'high-contrast'],
    from: 'highContrast',
    derive: ['invert'],
  },
]

export const THEME_MODES: ThemeMode[] = THEME_MODE_SPECS.map((m) => m.name)

/** Variable name → CSS value. */
export type ThemeValues = Record<string, string>

export interface ThemeData {
  /** the generator's inputs, e.g. `{ accent: '#d92270' }`; a theme with no generator has none */
  base?: Record<string, string>
  /** values tuned by hand, by mode name; these win over the generated ones */
  modes?: Record<ThemeMode, ThemeValues>
  /** web-font stylesheets the theme uses (Google Fonts or Bunny Fonts URLs) */
  fonts?: string[]
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

export const THEME_MODE_SELECTORS: Record<ThemeMode, string> =
  Object.fromEntries(THEME_MODE_SPECS.map((m) => [m.name, m.selector]))

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

/*
The colours written literally in `values`, each passed through `change`: a whole value that is
a colour, and the hex and rgb()/hsl() colours inside one (a gradient's stops). A colour inside an
expression changes too, which is what a mode wants: a mix toward `#fff` in light is a mix toward
black in dark. A `url(…)` is left alone, since `#abc` there is a fragment.
*/
const COLOR_TOKEN = /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\([^()]*\)/gi
const mapColors = (
  values: ThemeValues,
  change: (color: Color) => Color
): ThemeValues => {
  const out: ThemeValues = {}
  for (const [name, value] of Object.entries(values)) {
    const next = isColor(value)
      ? change(Color.fromCss(value)).html
      : /url\(/i.test(value)
        ? value
        : value.replace(
            COLOR_TOKEN,
            (token) => change(Color.fromCss(token)).html
          )
    if (next !== value) out[name] = next
  }
  return out
}

const pushedApart = (l: number): number => (l < 0.5 ? l / 2 : 1 - (1 - l) / 2)

interface ModeState {
  base: Record<string, string>
  values: ThemeValues
}

function transformed(
  { base, values }: ModeState,
  transform: ThemeTransform,
  generator: ThemeGenerator | null
): ModeState {
  if (typeof transform === 'function') {
    return { base, values: { ...values, ...transform(values) } }
  }
  if (transform === 'invert') {
    const inverted = generator
      ? generator.dark(base, values)
      : mapColors(values, (color) => color.inverseLuminance)
    return { base, values: { ...values, ...inverted } }
  }
  if (transform === 'contrast') {
    if (generator) {
      /*
      Regenerate from a high-contrast base and keep only what that CHANGES: a font tuned by
      hand is not something the base generates, and must not be put back to the generated one.
      */
      const contrastBase = highContrastBase(base)
      const changed = differences(
        generator.light(contrastBase),
        generator.light(base)
      )
      return { base: contrastBase, values: { ...values, ...changed } }
    }
    return {
      base,
      values: {
        ...values,
        ...mapColors(values, (color) => {
          const { h, s, l } = color._hsl
          return Color.fromHsl(h, s, pushedApart(l), color.a)
        }),
      },
    }
  }
  if (transform === 'monochrome') {
    return {
      base,
      values: {
        ...values,
        ...mapColors(values, (color) => {
          const { h, l } = color._hsl
          return Color.fromHsl(h, 0, l, color.a)
        }),
      },
    }
  }
  const tint = Color.fromCss(transform.tint)._hsl
  const amount = transform.amount ?? 0.35
  return {
    base,
    values: {
      ...values,
      ...mapColors(values, (color) =>
        Color.fromHsl(tint.h, tint.s * amount, color._hsl.l, color.a)
      ),
    },
  }
}

export interface ThemeModeOptions {
  /** the modes, the first being the one every other is made from (`THEME_MODE_SPECS`) */
  modes?: ThemeModeSpec[]
  /**
   * what the page's own CSS declares in each mode, for a theme with no generator: the first
   * mode's colours are what the others are derived from (`discoverThemeVariables` finds them)
   */
  page?: Record<ThemeMode, ThemeValues>
}

/**
 * Every mode's values, in full: generated or derived, then what the page declares for the mode,
 * then the hand-tuned values on top.
 */
export function deriveTheme(
  data: ThemeData,
  generator: ThemeGenerator | null,
  { modes = THEME_MODE_SPECS, page = {} }: ThemeModeOptions = {}
): Record<ThemeMode, ThemeValues> {
  const tuned = data.modes ?? {}
  const [root, ...rest] = modes
  const base = generator ? { ...generator.defaults, ...data.base } : {}
  const states = new Map<ThemeMode, ModeState>([
    [
      root.name,
      {
        base,
        values: {
          ...(generator ? generator.light(base) : page[root.name]),
          ...tuned[root.name],
        },
      },
    ],
  ])
  for (const spec of rest) {
    const fromName = spec.from ?? root.name
    const from = states.get(fromName)
    if (!from) {
      throw new Error(
        `theme mode "${spec.name}" is made from "${fromName}", which is not declared before it`
      )
    }
    // Without a generator, a mode the page's CSS declares is the page's own, and not derived.
    const own = !generator && Object.keys(page[spec.name] ?? {}).length > 0
    const made = (own ? [] : (spec.derive ?? [])).reduce(
      (state, transform) => transformed(state, transform, generator),
      from
    )
    states.set(spec.name, {
      base: made.base,
      values: { ...made.values, ...page[spec.name], ...tuned[spec.name] },
    })
  }
  return Object.fromEntries(
    [...states].map(([name, { values }]) => [name, values])
  )
}

/**
 * Every mode's variables as written to the stylesheet. The first mode is written in full with a
 * generator, and only as its tuned values without one (the page's CSS declares the rest). Every
 * other mode writes what makes it differ from what the page would show anyway, and also each
 * variable another mode writes: mode selectors can match together (`.darkmode` matches in dark
 * high contrast too), so one mode's value must never show through in another.
 */
export function resolveTheme(
  data: ThemeData,
  generator: ThemeGenerator | null,
  options: ThemeModeOptions = {}
): Record<ThemeMode, ThemeValues> {
  const { modes = THEME_MODE_SPECS, page = {} } = options
  const full = deriveTheme(data, generator, options)
  const [root, ...rest] = modes
  const rootValues = full[root.name]
  const written: Record<ThemeMode, ThemeValues> = {
    [root.name]: generator ? rootValues : { ...data.modes?.[root.name] },
  }
  const changed = new Set<string>()
  for (const { name } of rest) {
    for (const [variable, value] of Object.entries(full[name])) {
      const shown = generator
        ? rootValues[variable]
        : (page[name]?.[variable] ?? rootValues[variable])
      if (value !== shown || variable in (data.modes?.[name] ?? {})) {
        changed.add(variable)
      }
    }
  }
  for (const { name } of rest) {
    written[name] = Object.fromEntries(
      [...changed]
        .filter((variable) => full[name][variable] !== undefined)
        .map((variable) => [variable, full[name][variable]])
    )
  }
  return written
}

/*
A theme's rules carry an id's weight (`:not(#…)` matches every element but raises specificity),
so they win over the page's own declarations of the same variables wherever those appear: a
stylesheet later in the document (a live example's) would otherwise win on order alone.
*/
const OUTRANK = ':not(#tosi-theme-outrank)'
const outranking = (selector: string): string =>
  selector
    .split(',')
    .map((part) => `${part.trim()}${OUTRANK}`)
    .join(', ')

/** The stylesheet for a theme: each mode's variables under its selector. */
export function themeStyleSheet(
  resolved: Record<ThemeMode, ThemeValues>,
  selectors: Partial<Record<ThemeMode, string>> = {},
  modes: ThemeModeSpec[] = THEME_MODE_SPECS
): XinStyleSheet {
  const sheet: XinStyleSheet = {}
  for (const [mode, values] of Object.entries(resolved)) {
    const selector =
      selectors[mode] ?? modes.find((spec) => spec.name === mode)?.selector
    if (!selector) throw new Error(`theme mode "${mode}" has no selector`)
    const rule: XinStyleRule = {}
    for (const [name, value] of Object.entries(values)) {
      rule[ruleKey(name)] = value
    }
    if (Object.keys(rule).length) sheet[outranking(selector)] = rule
  }
  return sheet
}

export interface ApplyThemeOptions extends ThemeModeOptions {
  /** the stylesheet's id; one theme per id, updated in place */
  id?: string
  /** a selector per mode, in place of the mode's own (to scope a theme to part of a page) */
  selectors?: Partial<Record<ThemeMode, string>>
}

/**
 * Apply a theme to the page, as one stylesheet (`id`, updated in place on every call), and return
 * what it wrote.
 */
export function applyThemeData(
  data: ThemeData,
  generator: ThemeGenerator | null,
  { id = 'tosi-theme-data', selectors = {}, ...options }: ApplyThemeOptions = {}
): Record<ThemeMode, ThemeValues> {
  const resolved = resolveTheme(data, generator, options)
  replaceStyleSheet(
    id,
    themeStyleSheet(resolved, selectors, options.modes ?? THEME_MODE_SPECS)
  )
  applyThemeFonts(data.fonts)
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

/** Link the theme's font stylesheets, and unlink ones it no longer uses. */
export function applyThemeFonts(urls: string[] = []): void {
  const wanted = new Set(
    urls.map(allowedFontUrl).filter((url): url is string => url !== null)
  )
  for (const link of document.querySelectorAll<HTMLLinkElement>(
    'link[data-tosi-theme-font]'
  )) {
    if (wanted.has(link.href)) wanted.delete(link.href)
    else link.remove()
  }
  for (const href of wanted) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute('data-tosi-theme-font', '')
    document.head.append(link)
  }
}
