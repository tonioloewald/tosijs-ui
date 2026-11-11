# Theme stress tests

<!--{ "parent": "Helper Libraries", "description": "Two themes the theme editor must handle without knowing about them: Material 3 design tokens and a faux-glass look, each discovered from its own CSS by a variable pattern." }-->

`<tosi-theme-editor>` is not tied to tosijs-ui's own variables. Given a pattern, it finds the
matching custom properties in the page's stylesheets, reads which variables each one is
derived from, and offers the right control for each. These two themes are its stress tests:
neither was written for it.

Each theme builds out from one colour, and every link of the chain can be overridden. Change
the root colour and everything derived from it follows; override a link and what hangs from
it follows the override instead.

## Material 3 tokens

Material's own token names (`--md-sys-color-primary`, `--md-sys-shape-corner-*`,
`--md-sys-elevation-level*`, the type scale), with the containers and surfaces mixed from the
primary colour.

```css
.md-demo {
  --md-sys-color-primary: #6750a4;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: color-mix(in oklab, var(--md-sys-color-primary) 18%, white);
  --md-sys-color-on-primary-container: color-mix(in oklab, var(--md-sys-color-primary) 55%, black);
  --md-sys-color-surface: #fef7ff;
  --md-sys-color-surface-container: color-mix(in oklab, var(--md-sys-color-primary) 7%, var(--md-sys-color-surface));
  --md-sys-color-on-surface: #1d1b20;
  --md-sys-color-outline: color-mix(in oklab, var(--md-sys-color-on-surface) 45%, var(--md-sys-color-surface));
  --md-sys-color-shadow: #000000;
  --md-sys-shape-corner-small: 8px;
  --md-sys-shape-corner-large: 16px;
  --md-sys-shape-corner-full: 999px;
  --md-sys-elevation-level1: 0 1px 2px color-mix(in srgb, var(--md-sys-color-shadow) 30%, transparent), 0 1px 3px 1px color-mix(in srgb, var(--md-sys-color-shadow) 15%, transparent);
  --md-sys-state-hover-opacity: 0.08;
  --md-sys-typescale-body-size: 14px;
  --md-sys-typescale-label-weight: 500;
  --md-ref-typeface-plain: Roboto, system-ui, sans-serif;

  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  font-family: var(--md-ref-typeface-plain);
  font-size: var(--md-sys-typescale-body-size);
}
.darkmode .md-demo {
  --md-sys-color-primary: #d0bcff;
  --md-sys-color-on-primary: #381e72;
  --md-sys-color-primary-container: color-mix(in oklab, var(--md-sys-color-primary) 30%, black);
  --md-sys-color-on-primary-container: color-mix(in oklab, var(--md-sys-color-primary) 40%, white);
  --md-sys-color-surface: #141218;
  --md-sys-color-on-surface: #e6e0e9;
}
.md-demo .md-card {
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-level1);
}
.md-demo .md-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.md-demo button {
  border: none;
  padding: 0 20px;
  height: 36px;
  border-radius: var(--md-sys-shape-corner-full);
  font: inherit;
  font-weight: var(--md-sys-typescale-label-weight);
  cursor: pointer;
}
.md-demo .md-filled { background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
.md-demo .md-filled:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-primary) calc(var(--md-sys-state-hover-opacity) * 100%), var(--md-sys-color-primary));
}
.md-demo .md-tonal { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); }
.md-demo .md-outlined {
  background: transparent;
  color: var(--md-sys-color-primary);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
}
.md-demo input {
  padding: 8px 12px;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-small);
  background: transparent;
  color: inherit;
  font: inherit;
}
.md-demo input::placeholder { color: var(--md-sys-color-outline); }
```
```html
<div class="md-stage" style="display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start">
  <div class="md-demo">
    <div class="md-card">
      <strong>Material card</strong>
      <div class="md-row">
        <button class="md-filled">Filled</button>
        <button class="md-tonal">Tonal</button>
        <button class="md-outlined">Outlined</button>
      </div>
    </div>
    <input placeholder="Outlined field" />
  </div>
</div>
```
```js
import { tosiThemeEditor } from 'tosijs-ui'

preview.querySelector('.md-stage').prepend(
  tosiThemeEditor({
    variables: 'md-*',
    selectors: { light: '.md-demo', dark: '.darkmode .md-demo' },
    applyId: 'md-demo-theme',
  })
)
```
```test
test('the Material tokens are found, with their kinds and their chain', async () => {
  const editor = preview.querySelector('tosi-theme-editor')
  while (!editor.shadowRoot?.querySelector('[data-name="md-sys-color-primary"]')) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  const field = (name) => editor.shadowRoot.querySelector(`[data-name="${name}"]`)
  expect(field('md-sys-color-primary').dataset.kind).toBe('color')
  expect(field('md-sys-shape-corner-large').dataset.kind).toBe('length')
  expect(field('md-sys-elevation-level1').dataset.kind).toBe('shadow')
  expect(field('md-sys-state-hover-opacity').dataset.kind).toBe('number')
  expect(field('md-ref-typeface-plain').dataset.kind).toBe('font-family')
  expect(field('md-sys-color-primary-container').querySelector('.chain').textContent).toBe(
    '← primary'
  )
})
```

## Faux glass

The look of the [react-tosijs](https://react.tosijs.net) and ngx-tosijs demos: translucent
surfaces over a backdrop, blurred and saturated, with a light rim and pill-shaped controls.
The surfaces are the tint at an opacity, so a translucent colour must survive editing.

```css
.glass-demo {
  --glass-accent: #3355dd;
  --glass-tint: #ffffff;
  --glass-surface: color-mix(in srgb, var(--glass-tint) 20%, transparent);
  --glass-field: color-mix(in srgb, var(--glass-tint) 40%, transparent);
  --glass-rim: color-mix(in srgb, var(--glass-tint) 80%, transparent);
  --glass-shadow-color: #00000040;
  --glass-shadow: 0 4px 8px var(--glass-shadow-color);
  --glass-blur: 8px;
  --glass-saturation: 1.4;
  --glass-radius: 16px;
  --glass-control-height: 32px;
  --glass-control-radius: calc(var(--glass-control-height) / 2);
  --glass-backdrop: linear-gradient(160deg, #6087ba, #b7cdea);

  flex: 1 1 220px;
  padding: 24px;
  background: var(--glass-backdrop);
  color: #1d1d1f;
  font-family: system-ui, sans-serif;
}
.glass-demo .glass-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: var(--glass-radius);
  background: var(--glass-surface);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  box-shadow: inset 0 0 4px 1px var(--glass-rim), var(--glass-shadow);
}
.glass-demo .glass-row { display: flex; gap: 8px; }
.glass-demo button {
  height: var(--glass-control-height);
  padding: 0 16px;
  border: none;
  border-radius: var(--glass-control-radius);
  background: transparent;
  backdrop-filter: brightness(90%) blur(2px);
  color: inherit;
  box-shadow: inset 1px 1.5px 1px 0 var(--glass-rim), inset -1px -1.5px 1px 0 var(--glass-rim), var(--glass-shadow);
  font: inherit;
  cursor: pointer;
}
.glass-demo button:hover { box-shadow: inset 0 0 0 2px var(--glass-accent), var(--glass-shadow); }
.glass-demo input {
  height: var(--glass-control-height);
  padding: 0 12px;
  border: none;
  border-radius: calc(var(--glass-radius) / 4);
  background: var(--glass-field);
  color: inherit;
  font: inherit;
}
.glass-demo input::placeholder { color: color-mix(in srgb, currentColor 60%, transparent); }
```
```html
<div class="glass-stage" style="display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start">
  <div class="glass-demo">
    <div class="glass-panel">
      <strong>Glass panel</strong>
      <input placeholder="Glass field" />
      <div class="glass-row">
        <button>Cancel</button>
        <button>Save</button>
      </div>
    </div>
  </div>
</div>
```
```js
import { tosiThemeEditor } from 'tosijs-ui'

preview.querySelector('.glass-stage').prepend(
  tosiThemeEditor({
    variables: 'glass-*',
    selectors: { light: '.glass-demo' },
    applyId: 'glass-demo-theme',
  })
)
```
```test
test('the glass variables are found; a translucent link keeps its alpha', async () => {
  const editor = preview.querySelector('tosi-theme-editor')
  while (!editor.shadowRoot?.querySelector('[data-name="glass-accent"]')) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  const field = (name) => editor.shadowRoot.querySelector(`[data-name="${name}"]`)
  expect(field('glass-surface').dataset.kind).toBe('color')
  expect(field('glass-blur').dataset.kind).toBe('length')
  expect(field('glass-saturation').dataset.kind).toBe('number')
  expect(field('glass-shadow').dataset.kind).toBe('shadow')
  expect(field('glass-backdrop').dataset.kind).toBe('image')
  expect(field('glass-control-radius').querySelector('.chain').textContent).toBe(
    '← height'
  )
})
```
