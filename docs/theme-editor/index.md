# theme editor

`<tosi-theme-editor>` edits a theme as data (see [theme data](/theme-data/)): the base colours
at the top, then each variable you declare, for one mode at a time. What you change applies to
the page as you change it, and `value` is the theme, ready to save as JSON.

In an app, import it from `tosijs-ui/theme-editor`: as of 1.19.0 it is not in the root barrel,
so an app that does not use it ships none of it. (The examples here import from `tosijs-ui`
because doc pages run against the full bundle.)

```js
import { tosiThemeEditor } from 'tosijs-ui'

const editor = tosiThemeEditor({
  applyId: 'theme-editor-demo',
  selectors: {
    light: '.theme-editor-demo',
    dark: '.darkmode .theme-editor-demo',
    highContrast: '.high-contrast:not(.darkmode) .theme-editor-demo',
    darkHighContrast: '.darkmode.high-contrast .theme-editor-demo',
  },
  variables: [
    { name: 'tosi-border-radius', kind: 'length', label: 'Corners', group: 'Shape' },
    { name: 'tosi-spacing', kind: 'length', label: 'Spacing', group: 'Shape' },
    { name: 'tosi-font-family', kind: 'font-family', label: 'Font', group: 'Type' },
    { name: 'tosi-font-size', kind: 'length', label: 'Size', group: 'Type' },
  ],
  presets: [
    { name: 'plain', label: 'Plain', theme: null },
    {
      name: 'rounded',
      label: 'Rounded',
      theme: {
        base: { accent: '#7a3cc4' },
        modes: { light: { 'tosi-border-radius': '16px', 'tosi-spacing': '16px' } },
      },
    },
  ],
})
const sample = document.createElement('div')
sample.className = 'theme-editor-demo'
sample.innerHTML = '<p>Themed sample</p><button>Accent button</button>'
editor.addEventListener('change', () => {
  console.log(JSON.stringify(editor.value))
})
preview.append(editor, sample)
```
```css
.preview {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.theme-editor-demo {
  flex: 1 1 160px;
  padding: var(--tosi-spacing);
  border-radius: var(--tosi-border-radius);
  background: var(--tosi-bg);
  color: var(--tosi-text);
  font-family: var(--tosi-font-family);
  font-size: var(--tosi-font-size);
}
.theme-editor-demo button {
  border: none;
  padding: var(--tosi-spacing-sm) var(--tosi-spacing);
  border-radius: var(--tosi-border-radius);
  background: var(--tosi-accent);
  color: var(--tosi-accent-text);
}
```
```test
import { deriveTheme } from 'tosijs-ui'

test('editing a base colour or a variable applies it, and a tuned value can be reset', async () => {
  const editor = preview.querySelector('tosi-theme-editor')
  // The fields exist once the editor has rendered, and so do their listeners.
  while (!editor.shadowRoot?.querySelector('[data-name="accent"]')) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  const sample = preview.querySelector('.theme-editor-demo button')
  // A base colour is a text field; a variable is a <tosi-css-value>, whose value is its CSS.
  const edit = (name, value) => {
    const control = editor.shadowRoot.querySelector(
      `[data-name="${name}"] :is(tosi-css-value, input[type="text"])`
    )
    control.value = value
    control.dispatchEvent(new Event('change', { bubbles: true }))
  }
  // The editor starts on the mode the page is in, so a dark page edits dark mode.
  const { mode } = editor
  edit('accent', '#0064d2')
  // The variable, not the button's colour, which is mid-transition at this instant.
  const accent = deriveTheme(editor.value, editor.generator, { modes: editor.modes })[mode]['tosi-accent']
  if (mode === 'light') expect(accent).toBe('#0064d2')
  expect(getComputedStyle(sample).getPropertyValue('--tosi-accent')).toBe(accent)
  const radius = () => getComputedStyle(sample).getPropertyValue('--tosi-border-radius')
  edit('tosi-border-radius', '12px')
  expect(radius()).toBe('12px')
  expect(editor.value.modes[mode]['tosi-border-radius']).toBe('12px')
  editor.shadowRoot.querySelector('[data-name="tosi-border-radius"] .reset').click()
  expect(editor.value.modes[mode]['tosi-border-radius']).toBe(undefined)
  expect(radius()).toBe('4px')
})
```

## Modes

The mode menu and the **High contrast** checkbox choose which mode you are editing. Light and
dark are the menu, and high contrast goes with either, so the four default modes (light, dark,
high contrast, dark high contrast) are two choices rather than four buttons. Each of the four
keeps its own tuned values.

Pass `modes` (a `ThemeModeSpec[]`, see [theme data](/theme-data/)) for a theme's own, such as a
tinted or monochrome mode: a mode joins the menu, unless its `variant` says it is a variation on
another mode, which makes it a checkbox. With only `selectors`, the editor offers the modes those
name. Every mode but the first starts out generated or derived; a value you change there is tuned for that
mode only, marked with a dot, and stays put when the base colours change. The ↺ button puts it
back to the generated value.

The editor starts on the mode the page is in, so a reader in dark mode edits dark mode, unless
you set `mode`. Choosing a mode previews it: the editor shows the page in that mode while you
work, by setting the mode's `classes` on `<html>` and `<body>` (the doc system's `darkmode` and
`high-contrast` for the default modes), and puts them back when it is removed.
Set `previewModes` to `false` to leave the page alone.

## Presets

Pass `presets` (`ThemePreset[]`: a `name`, a `label` and a `theme`) and a **Load preset…** menu
appears at the top, as in the example above. Loading one replaces the theme being edited with a copy of the
preset's, which you then tune like any other; a preset whose `theme` is null loads an empty
theme. The doc site's theme editor offers its Original, Glass and Material presets this way.

## Declaring variables

`variables` lists what may be edited, beyond the base colours, each with a `kind` that picks
its control:

| kind | control |
| --- | --- |
| `color` | a colour well and the value as text (any CSS colour) |
| `length`, `text` | text (`16px`, `1.5rem`, `calc(…)`) |
| `number` | a number |
| `font-family` | text, suggesting the families the page already uses |
| `enum` | a menu of `options` |

`group` puts variables under a heading. The base colours come from the `generator`
(`componentThemeGenerator` unless you pass another).

## Properties and events

- `value`: the theme (`ThemeData`), to save and to load back.
- `mode`: the mode being edited.
- `applyId`: the id of the stylesheet it applies the theme through (`tosi-live-theme`); empty
  to apply nothing.
- `selectors`: per-mode selectors for that stylesheet (see theme data).
- `modes`: the theme's modes (`THEME_MODE_SPECS` by default).
- `presets`: what the Load preset menu offers (none by default, and the menu is hidden).
- A `change` event fires on every edit.

The editor is styled with fixed colours in its shadow DOM, so no theme you make can make it
unreadable.
