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
