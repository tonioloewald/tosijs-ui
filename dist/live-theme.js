/*#
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
// liveTheme.accent.value   // '#EE257B'
// liveTheme.dark.value     // false

// Set values programmatically (triggers immediate theme update)
// liveTheme.accent.value = '#007AFF'
```
*/
import { Color, Component, elements, tosi, } from 'tosijs';
import { createTheme, createDarkTheme, applyTheme, defaultColors, } from './theme';
const { div, label, input, span, button } = elements;
// ============================================================================
// Live Theme Observable
// ============================================================================
export const { liveTheme } = tosi({
    liveTheme: {
        accent: String(defaultColors.accent),
        background: String(defaultColors.background),
        text: String(defaultColors.text),
        dark: false,
    },
});
let liveThemeActive = false;
function applyLiveTheme() {
    if (!liveThemeActive)
        return;
    const colors = {
        accent: Color.fromCss(liveTheme.accent.value),
        background: Color.fromCss(liveTheme.background.value),
        text: Color.fromCss(liveTheme.text.value),
    };
    const theme = liveTheme.dark.value
        ? createDarkTheme(colors)
        : createTheme(colors);
    applyTheme(theme, 'tosi-live-theme');
}
/**
 * Start applying the live theme to the document.
 * Called automatically when a TosiThemeEditor is connected.
 */
export function enableLiveTheme() {
    if (liveThemeActive)
        return;
    liveThemeActive = true;
    liveTheme.accent.observe(applyLiveTheme);
    liveTheme.background.observe(applyLiveTheme);
    liveTheme.text.observe(applyLiveTheme);
    liveTheme.dark.observe(applyLiveTheme);
    applyLiveTheme();
}
/**
 * Stop applying the live theme.
 */
export function disableLiveTheme() {
    liveThemeActive = false;
}
export class TosiThemeEditor extends Component {
    static preferredTagName = 'tosi-theme-editor';
    // Hardcoded styles — immune to theme changes because shadow DOM
    // boundary prevents :root CSS variables from cascading in
    static shadowStyleSpec = {
        ':host': {
            display: 'block',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            background: '#ffffff',
            color: '#222222',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            maxWidth: '320px',
        },
        ':host .field': {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
        },
        ':host label': {
            flex: '1',
            fontWeight: '500',
        },
        ':host input[type="color"]': {
            width: '48px',
            height: '32px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            padding: '2px',
        },
        ':host input[type="checkbox"]': {
            width: '18px',
            height: '18px',
            cursor: 'pointer',
        },
        ':host .preview': {
            marginTop: '12px',
            padding: '12px',
            borderRadius: '4px',
            transition: 'all 0.15s ease-out',
        },
        ':host .preview-button': {
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '13px',
        },
        ':host .actions': {
            marginTop: '8px',
            display: 'flex',
            gap: '8px',
        },
        ':host .actions button': {
            flex: '1',
            padding: '6px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#f5f5f5',
            color: '#222',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '13px',
        },
        ':host .actions button:hover': {
            background: '#e8e8e8',
        },
    };
    content = () => [
        div({ class: 'field' }, label('Accent'), input({ type: 'color', part: 'accent' })),
        div({ class: 'field' }, label('Background'), input({ type: 'color', part: 'background' })),
        div({ class: 'field' }, label('Text'), input({ type: 'color', part: 'text' })),
        div({ class: 'field' }, label('Dark mode'), input({ type: 'checkbox', part: 'dark' })),
        div({
            class: 'preview',
            part: 'preview',
            style: {
                background: 'var(--tosi-bg, #fafafa)',
                color: 'var(--tosi-text, #222)',
            },
        }, span('Preview '), button({
            class: 'preview-button',
            style: {
                background: 'var(--tosi-accent, #EE257B)',
                color: 'var(--tosi-accent-text, white)',
            },
        }, 'Button')),
        div({ class: 'actions' }, button({ part: 'reset' }, 'Reset')),
    ];
    connectedCallback() {
        super.connectedCallback();
        enableLiveTheme();
        // Sync inputs from observable
        const syncFromTheme = () => {
            this.parts.accent.value = liveTheme.accent.value;
            this.parts.background.value = liveTheme.background.value;
            this.parts.text.value = liveTheme.text.value;
            this.parts.dark.checked = liveTheme.dark.value;
        };
        syncFromTheme();
        // Observe theme changes (e.g. from programmatic updates)
        liveTheme.accent.observe(syncFromTheme);
        liveTheme.background.observe(syncFromTheme);
        liveTheme.text.observe(syncFromTheme);
        liveTheme.dark.observe(syncFromTheme);
        // Wire inputs to observable
        this.parts.accent.addEventListener('input', () => {
            liveTheme.accent.value = this.parts.accent.value;
        });
        this.parts.background.addEventListener('input', () => {
            liveTheme.background.value = this.parts.background.value;
        });
        this.parts.text.addEventListener('input', () => {
            liveTheme.text.value = this.parts.text.value;
        });
        this.parts.dark.addEventListener('change', () => {
            liveTheme.dark.value = this.parts.dark.checked;
        });
        // Reset button
        this.parts.reset.addEventListener('click', () => {
            liveTheme.accent.value = String(defaultColors.accent);
            liveTheme.background.value = String(defaultColors.background);
            liveTheme.text.value = String(defaultColors.text);
            liveTheme.dark.value = false;
        });
    }
}
export const tosiThemeEditor = TosiThemeEditor.elementCreator();
