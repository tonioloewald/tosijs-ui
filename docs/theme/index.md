# theme

The theme system provides consistent CSS variables across all tosijs-ui components,
with support for automatic dark mode via tosijs's `Color` class and `invertLuminance`.

## Base Variables

All components use these foundational CSS variables with the `--tosi-` prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `--tosi-spacing-xs` | 4px | Extra small spacing |
| `--tosi-spacing-sm` | 8px | Small spacing |
| `--tosi-spacing` | 12px | Default spacing |
| `--tosi-spacing-lg` | 16px | Large spacing |
| `--tosi-spacing-xl` | 24px | Extra large spacing |
| `--tosi-bg` | #fafafa | Background color |
| `--tosi-bg-inset` | derived | Inset/recessed background |
| `--tosi-text` | #222 | Text color |
| `--tosi-accent` | #d92270 | Accent/brand color (9% darker than the original #EE257B, from 1.9.2. The brand pink sat at 4.05:1 against white and 4.3:1 against the `#fafafa` page background — both under WCAG AA's 4.5:1 for normal text. This value clears AA in BOTH directions: as text on the page, and as a fill carrying white text.) |
| `--tosi-accent-text` | derived | Text on accent background |
| `--tosi-font-family` | system-ui | Font family |
| `--tosi-font-size` | 16px | Base font size |
| `--tosi-line-height` | 1.5 | Line height |
| `--tosi-touch-size` | 44px | Minimum touch target |
| `--tosi-focus-ring` | derived | Focus outline style |

## Creating Themes

```typescript
import { Color } from 'tosijs'
import { createTheme, applyTheme } from 'tosijs-ui'

const myTheme = createTheme({
  accent: Color.fromCss('#0064d2'),
  background: Color.fromCss('#ffffff'),
  text: Color.fromCss('#1a1a1a'),
})

applyTheme(myTheme, 'my-theme')
```

## Dark Mode

Toggle between light and dark themes. `createTheme` and `createDarkTheme` return
`XinStyleSheet` objects — ordinary CSS variable maps you can apply however you like:

```html
<label><input type="checkbox" class="dark-toggle"> Dark mode</label>
<div class="theme-sample">
  <span>Sample text</span>
  <button>Button</button>
</div>
```
```css
.preview .theme-sample {
  padding: 12px;
  background: var(--sample-bg);
  color: var(--sample-text);
  border-radius: 8px;
  display: flex;
  gap: 12px;
  align-items: center;
  transition: all 0.3s;
}
.preview .theme-sample button {
  background: var(--sample-accent);
  color: var(--sample-accent-text);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
```
```js
import { Color } from 'tosijs'
import { createTheme, createDarkTheme } from 'tosijs-ui'

const colors = {
  accent: Color.fromCss('#0064d2'),
  background: Color.fromCss('#ffffff'),
  text: Color.fromCss('#1a1a1a'),
}

function applyToPreview(theme) {
  const vars = theme[':root']
  const sample = preview.querySelector('.theme-sample')
  sample.style.setProperty('--sample-bg', String(vars._tosiBg))
  sample.style.setProperty('--sample-text', String(vars._tosiText))
  sample.style.setProperty('--sample-accent', String(vars._tosiAccent))
  sample.style.setProperty('--sample-accent-text', String(vars._tosiAccentText))
}

applyToPreview(createTheme(colors))

preview.querySelector('.dark-toggle').addEventListener('change', (e) => {
  applyToPreview(e.target.checked ? createDarkTheme(colors) : createTheme(colors))
})
```

## Component Variables

Each component defines its own variables that derive from base variables.
For example, tosi-select derives from base:

    --tosi-select-gap: var(--tosi-spacing-sm, 8px);
    --tosi-select-touch-size: var(--tosi-touch-size, 44px);

This allows fine-grained customization while maintaining consistency.
