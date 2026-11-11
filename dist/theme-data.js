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
/*{ "parent": "Helper Libraries", "description": "A theme as plain JSON data: base colours generate light, dark and high-contrast modes, values tuned by hand win, and one stylesheet applies it." }*/
import { Color, invertLuminance } from 'tosijs';
import { createTheme, readableOn, replaceStyleSheet } from './theme.js';
import { allowedFontUrl } from './theme-fonts.js';
export { FONT_ORIGINS, allowedFontUrl, fontFamilies, parseFontImport, } from './theme-fonts.js';
export const THEME_MODES = [
    'light',
    'dark',
    'highContrast',
    'darkHighContrast',
];
export const THEME_MODE_SELECTORS = {
    light: ':root',
    dark: '.darkmode',
    // Not in dark mode, or its light values would show through wherever dark high contrast
    // writes nothing of its own.
    highContrast: '.high-contrast:not(.darkmode)',
    darkHighContrast: '.darkmode.high-contrast',
};
/** `_tosiAccent` (a XinStyleRule key) → `tosi-accent`. */
const variableName = (key) => key.slice(1).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
/** `tosi-accent` → `_tosiAccent`, the XinStyleRule spelling of `--tosi-accent`. */
const ruleKey = (name) => '_' + name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
/** The custom properties a XinStyleRule declares, by variable name, as strings. */
export function ruleValues(rule) {
    const values = {};
    for (const [key, value] of Object.entries(rule ?? {})) {
        if (key.startsWith('_') && !key.startsWith('__') && value != null) {
            values[variableName(key)] = String(value);
        }
    }
    return values;
}
/*
A colour literal, never a font name that happens to be a word: `serif` is not a colour, and
inverting it would write `#fff` into a font stack. Named colours count only where the browser
says so.
*/
const isColor = (value) => {
    const v = value.trim();
    if (/^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([^()]*\))$/i.test(v))
        return true;
    return (/^[a-z]+$/i.test(v) &&
        typeof CSS !== 'undefined' &&
        typeof CSS.supports === 'function' &&
        CSS.supports('color', v));
};
/** The colours among `values`, with their luminance inverted; everything else is dropped. */
export function invertedColors(values) {
    const rule = {};
    for (const [name, value] of Object.entries(values)) {
        if (isColor(value))
            rule[ruleKey(name)] = value;
    }
    return ruleValues(invertLuminance(rule));
}
/** White background, black text, and the accent darkened to 7:1 against it. */
export function highContrastBase(base) {
    const white = Color.fromCss('#ffffff');
    const out = { ...base };
    if ('background' in base)
        out.background = '#ffffff';
    if ('text' in base)
        out.text = '#000000';
    if (base.accent)
        out.accent = readableOn(Color.fromCss(base.accent), white, 7).html;
    return out;
}
const differences = (values, from) => Object.fromEntries(Object.entries(values).filter(([name, value]) => from[name] !== value));
/** Every mode's variables: generated, then the hand-tuned values on top. */
export function resolveTheme(data, generator) {
    const base = { ...generator.defaults, ...data.base };
    const generatedLight = generator.light(base);
    const light = { ...generatedLight, ...data.light };
    const dark = { ...generator.dark(base, light), ...data.dark };
    /*
    High contrast writes only what its base CHANGES, measured against the generated values, not
    the tuned ones: a font tuned in light differs from the generated font, and carrying the
    generated one into high contrast would undo the tuning there.
    */
    const contrastBase = highContrastBase(base);
    const contrastLight = generator.light(contrastBase);
    const highContrast = {
        ...differences(contrastLight, generatedLight),
        ...data.highContrast,
    };
    const contrastDark = generator.dark(contrastBase, contrastLight);
    const darkHighContrast = {
        ...differences(contrastDark, generator.dark(base, generatedLight)),
        ...data.darkHighContrast,
    };
    return { light, dark, highContrast, darkHighContrast };
}
/** The stylesheet for a theme: each mode's variables under its selector. */
export function themeStyleSheet(resolved, selectors = {}) {
    const sheet = {};
    for (const mode of THEME_MODES) {
        const selector = selectors[mode] ?? THEME_MODE_SELECTORS[mode];
        const rule = {};
        for (const [name, value] of Object.entries(resolved[mode])) {
            rule[ruleKey(name)] = value;
        }
        if (Object.keys(rule).length)
            sheet[selector] = rule;
    }
    return sheet;
}
/**
 * Apply a theme to the page, as one stylesheet (`id`, updated in place on every call), and return
 * what it resolved to.
 */
export function applyThemeData(data, generator, { id = 'tosi-theme-data', selectors = {}, } = {}) {
    const resolved = resolveTheme(data, generator);
    replaceStyleSheet(id, themeStyleSheet(resolved, selectors));
    applyThemeFonts(data.fonts);
    return resolved;
}
/** The tosijs-ui component theme (`createTheme`), driven by accent, background and text. */
export const componentThemeGenerator = {
    base: [
        { name: 'accent', kind: 'color', label: 'Accent' },
        { name: 'background', kind: 'color', label: 'Background' },
        { name: 'text', kind: 'color', label: 'Text' },
    ],
    defaults: { accent: '#d92270', background: '#fafafa', text: '#222222' },
    light: (base) => ruleValues(createTheme({
        accent: Color.fromCss(base.accent),
        background: Color.fromCss(base.background),
        text: Color.fromCss(base.text),
    })[':root']),
    dark: (_base, light) => invertedColors(light),
};
/** Link the theme's font stylesheets, and unlink ones it no longer uses. */
export function applyThemeFonts(urls = []) {
    const wanted = new Set(urls.map(allowedFontUrl).filter((url) => url !== null));
    for (const link of document.querySelectorAll('link[data-tosi-theme-font]')) {
        if (wanted.has(link.href))
            wanted.delete(link.href);
        else
            link.remove();
    }
    for (const href of wanted) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-tosi-theme-font', '');
        document.head.append(link);
    }
}
