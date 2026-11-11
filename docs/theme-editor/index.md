# theme editor

`<tosi-theme-editor>` edits a theme as data (see [theme data](/theme-data/)): the base colours
at the top, then each variable you declare, for one mode at a time. What you change applies to
the page as you change it, and `value` is the theme, ready to save as JSON.

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
test('editing a base colour or a variable applies it, and a tuned value can be reset', async () => {
  const editor = preview.querySelector('tosi-theme-editor')
  // The fields exist once the editor has rendered, and so do their listeners.
  while (!editor.shadowRoot?.querySelector('[data-name="accent"]')) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  const sample = preview.querySelector('.theme-editor-demo button')
  const field = (name) => editor.shadowRoot.querySelector(`[data-name="${name}"] input[type="text"]`)
  const edit = (name, value) => {
    const input = field(name)
    input.value = value
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
  edit('accent', '#0064d2')
  // The variable, not the button's colour, which is mid-transition at this instant.
  expect(getComputedStyle(sample).getPropertyValue('--tosi-accent')).toBe('#0064d2')
  const radius = () => getComputedStyle(sample).getPropertyValue('--tosi-border-radius')
  edit('tosi-border-radius', '12px')
  expect(radius()).toBe('12px')
  expect(editor.value.modes.light['tosi-border-radius']).toBe('12px')
  editor.shadowRoot.querySelector('[data-name="tosi-border-radius"] .reset').click()
  expect(editor.value.modes.light['tosi-border-radius']).toBe(undefined)
  expect(radius()).toBe('4px')
})
```

## Modes

The mode buttons choose which mode you are editing: by default light, dark, high contrast, and
dark high contrast. Pass `modes` (a `ThemeModeSpec[]`, see [theme data](/theme-data/)) for a
theme's own, such as a tinted or monochrome mode; with only `selectors`, the editor offers the
modes those name. Every mode but the first starts out generated or derived; a value you change there is tuned for that
mode only, marked with a dot, and stays put when the base colours change. The ↺ button puts it
back to the generated value.

Editing a mode previews it: the editor shows the page in that mode while you work, by setting
the mode's `classes` on `<html>` and `<body>` (the doc system's `darkmode` and `high-contrast`
for the default modes), and puts them back when it is removed.
Set `previewModes` to `false` to leave the page alone.

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
- A `change` event fires on every edit.

The editor is styled with fixed colours in its shadow DOM, so no theme you make can make it
unreadable.
