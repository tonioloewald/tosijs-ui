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
