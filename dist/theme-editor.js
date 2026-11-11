/*#
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
*/
/*{ "parent": "Helper Libraries", "description": "<tosi-theme-editor> edits a theme as data: base colours, then each declared variable per mode (light, dark, high contrast), applied live and saved as JSON." }*/
import { Color, elements, withAttributes, } from 'tosijs';
import { THEME_MODE_SPECS, applyThemeData, componentThemeGenerator, deriveTheme, fontFamilies, parseFontImport, } from './theme-data.js';
import { declaredValues, discoverThemeVariables, groupVariables, isDerived, resolveColor, resolveLength, } from './theme-discovery.js';
const { div, h3, label, input, select, option, button, datalist, span } = elements;
/** `#rrggbb` for a colour well, which takes nothing else. */
const wellValue = (value) => {
    try {
        return Color.fromCss(value).html.slice(0, 7);
    }
    catch {
        return '#000000';
    }
};
/** The units a length field offers. */
export const LENGTH_UNITS = ['px', 'rem', 'em', '%', 'vw', 'vh', 'ch', 'pt'];
/** `16px` → `{ amount: 16, unit: 'px' }`; null for anything else (`calc(…)`, a `var()`). */
export function splitLength(value) {
    const match = /^(-?\d*\.?\d+)([a-z%]*)$/i.exec(value.trim());
    if (!match)
        return null;
    const unit = match[2].toLowerCase() || (Number(match[1]) === 0 ? 'px' : '');
    return LENGTH_UNITS.includes(unit) ? { amount: Number(match[1]), unit } : null;
}
/** How far one click of the arrows moves a length in `unit`. */
const lengthStep = (unit) => unit === 'rem' || unit === 'em'
    ? 0.125
    : unit === 'px' || unit === 'pt' || unit === '%'
        ? 1
        : 0.5;
export class TosiThemeEditor extends withAttributes({
    /** the mode being edited */
    mode: 'light',
    /** the id of the stylesheet the theme applies through; empty to apply nothing */
    applyId: 'tosi-live-theme',
}) {
    static preferredTagName = 'tosi-theme-editor';
    /** show the page in the mode being edited (a property: a boolean attribute cannot default to true) */
    previewModes = true;
    _value = { base: {} };
    // undefined: not chosen, so the component theme for a list and none for a pattern
    _generator = undefined;
    _variables = [];
    _selectors = {};
    _modes = null;
    /** the theme being edited */
    get value() {
        return this._value;
    }
    set value(theme) {
        this._value = theme && typeof theme === 'object' ? theme : { base: {} };
        this._value.base ??= {};
        this.queueRender();
    }
    /**
     * turns base values into each mode's variables; null when the page's CSS derives them (the
     * default for a pattern), `componentThemeGenerator` by default for a list
     */
    get generator() {
        if (this._generator !== undefined)
            return this._generator;
        return Array.isArray(this._variables) ? componentThemeGenerator : null;
    }
    set generator(generator) {
        this._generator = generator;
        this.queueRender();
    }
    /**
     * what to edit: a list of variables, or a pattern (`'sf-*'`, a RegExp) matched against the
     * custom properties the page's stylesheets declare
     */
    get variables() {
        return this._variables;
    }
    set variables(variables) {
        this._variables = variables ?? [];
        this.discoveredFor = '';
        this.queueRender();
    }
    discovered = new Map();
    // Short names for the chain hints (`← primary`, not `← md-sys-color-primary`).
    labels = new Map();
    discoveredFor = '';
    /** Look for the pattern's variables again (after the page's stylesheets change). */
    rediscover = () => {
        this.discoveredFor = '';
        this.update();
    };
    /**
     * the theme's modes, the first being what the rest are made from: `THEME_MODE_SPECS` unless
     * set, narrowed to the modes `selectors` names when it names any
     */
    get modes() {
        if (this._modes)
            return this._modes;
        const named = Object.keys(this.selectors);
        return named.length
            ? THEME_MODE_SPECS.filter((spec) => named.includes(spec.name))
            : THEME_MODE_SPECS;
    }
    set modes(modes) {
        this._modes = modes?.length ? modes : null;
        this.discoveredFor = '';
        this.queueRender();
    }
    /** Each mode's selector: the one in `selectors`, or the mode's own. */
    modeSelectors() {
        return Object.fromEntries(this.modes.map((spec) => [
            spec.name,
            this.selectors[spec.name] ?? spec.selector,
        ]));
    }
    /** The mode being edited, or the first when `mode` names none of the theme's. */
    currentMode() {
        const modes = this.modes;
        return modes.find((spec) => spec.name === this.mode) ?? modes[0];
    }
    /** The element values resolve in: the first mode's selector's, or the root. */
    scopeElement() {
        const first = this.modeSelectors()[this.modes[0].name];
        try {
            return document.querySelector(first) ?? document.documentElement;
        }
        catch {
            return document.documentElement;
        }
    }
    /** The variables being edited: the list, or what the pattern found, labelled and grouped. */
    editable() {
        const variables = this._variables;
        if (Array.isArray(variables))
            return variables;
        const key = `${String(variables)}|${JSON.stringify(this.modeSelectors())}`;
        if (key !== this.discoveredFor) {
            this.discoveredFor = key;
            const found = discoverThemeVariables(variables, {
                selectors: this.modeSelectors(),
                scope: this.scopeElement(),
                exclude: this.applyId ? document.getElementById(this.applyId) : null,
            });
            this.discovered = new Map(found.map((v) => [v.name, v]));
        }
        const groups = groupVariables([...this.discovered.keys()]);
        this.labels = new Map([...groups].map(([name, { label }]) => [name, label]));
        return [...this.discovered.values()].map((variable) => ({
            ...variable,
            ...groups.get(variable.name),
        }));
    }
    /** per-mode selectors for the applied stylesheet */
    get selectors() {
        return this._selectors;
    }
    set selectors(selectors) {
        this._selectors = selectors ?? {};
        this.discoveredFor = '';
        this.queueRender();
    }
    // Fixed colours: no theme being edited can make the editor itself unreadable.
    static shadowStyleSpec = {
        ':host': {
            display: 'block',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '13px',
            lineHeight: '1.4',
            background: '#ffffff',
            color: '#222222',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            width: '300px',
            maxWidth: '100%',
            boxSizing: 'border-box',
            colorScheme: 'light',
        },
        ':host *': { boxSizing: 'border-box' },
        ':host .modes': {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            marginBottom: '8px',
        },
        ':host .modes button': {
            flex: '1 1 auto',
            padding: '4px 6px',
            border: '1px solid #bbb',
            borderRadius: '4px',
            background: '#f5f5f5',
            color: '#222',
            font: 'inherit',
            cursor: 'pointer',
        },
        ':host .modes button[aria-pressed="true"]': {
            background: '#222',
            borderColor: '#222',
            color: '#fff',
        },
        ':host h3': {
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#555',
            margin: '10px 0 4px',
        },
        ':host .field': {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '30px',
        },
        ':host .field label': {
            flex: '1 1 auto',
            minWidth: '0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        ':host .chain': {
            display: 'block',
            fontSize: '11px',
            color: '#666',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        ':host .chain:empty, :host .field.-tuned .chain': { display: 'none' },
        ':host .field.-derived input:not([type="color"]), :host .field.-derived select': { color: '#6a6a6a', fontStyle: 'italic' },
        ':host .field[data-kind="shadow"] input, :host .field[data-kind="image"] input': { flex: '0 1 9.5em', width: '9.5em' },
        ':host .field.-tuned label::after': {
            content: '" •"',
            color: '#b0005a',
        },
        /*
        Each control is as wide as what it holds (a hex colour, a short number, a unit), and the
        label takes the rest; only free text (a font stack, a calc()) gets more room.
        */
        ':host input[type="text"], :host input[type="number"], :host select': {
            flex: '0 0 auto',
            width: '6em',
            minWidth: '0',
            padding: '3px 6px',
            border: '1px solid #bbb',
            borderRadius: '4px',
            background: '#fff',
            color: '#222',
            font: 'inherit',
        },
        ':host input[type="color"]': {
            flex: '0 0 28px',
            width: '28px',
            height: '24px',
            padding: '1px',
            border: '1px solid #bbb',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
        },
        ':host [hidden]': { display: 'none !important' },
        ':host .font-add, :host .font': {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '30px',
        },
        ':host .font span': {
            flex: '1',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        ':host .font-add input': { flex: '1' },
        ':host .font-add button, :host .font button': {
            padding: '3px 8px',
            border: '1px solid #bbb',
            borderRadius: '4px',
            background: '#f5f5f5',
            color: '#222',
            font: 'inherit',
            cursor: 'pointer',
        },
        ':host .font-error': { color: '#b00020' },
        ':host .font-error:empty': { display: 'none' },
        ':host input[type="number"]': { width: '4.5em' },
        ':host .length-unit': { width: '4.25em', padding: '3px 2px' },
        ':host .field[data-kind="font-family"] input, :host .field[data-kind="text"] input, :host .length-text': { flex: '0 1 9.5em', width: '9.5em' },
        ':host .reset': {
            flex: '0 0 24px',
            width: '24px',
            height: '24px',
            padding: '0',
            border: 'none',
            borderRadius: '4px',
            background: 'transparent',
            color: '#444',
            font: 'inherit',
            cursor: 'pointer',
        },
        ':host .reset:hover': { background: '#eee' },
        ':host .field:not(.-tuned) .reset': { visibility: 'hidden' },
        ':host :focus-visible': {
            outline: '2px solid #0064d2',
            outlineOffset: '1px',
        },
        ':host .actions': {
            display: 'flex',
            gap: '8px',
            marginTop: '10px',
        },
        ':host .actions button': {
            flex: '1',
            padding: '6px 12px',
            border: '1px solid #bbb',
            borderRadius: '4px',
            background: '#f5f5f5',
            color: '#222',
            font: 'inherit',
            cursor: 'pointer',
        },
    };
    /** Change one value, apply the theme, and say so. */
    set(scope, name, raw) {
        const value = raw?.trim() ?? '';
        const theme = { ...this.value, base: { ...this.value.base } };
        const values = {
            ...(scope === 'base' ? theme.base : theme.modes?.[scope]),
        };
        if (value)
            values[name] = value;
        else
            delete values[name];
        if (scope === 'base')
            theme.base = values;
        else
            theme.modes = { ...theme.modes, [scope]: values };
        this._value = theme;
        this.update();
        this.dispatchEvent(new Event('change', { bubbles: true }));
    }
    handleInput = (event) => {
        const target = event.target;
        const field = target.closest('.field');
        if (!field)
            return;
        const { name, scope } = field.dataset;
        if (target.type === 'color') {
            const text = field.querySelector('input[type="text"]');
            // A colour well knows nothing of alpha; keep the translucency the value had.
            const current = resolveColor(this.scopeElement(), text.value) ?? '';
            const alpha = current.length === 9 ? current.slice(7) : '';
            text.value = target.value + alpha;
            this.set(scope, name, text.value);
            return;
        }
        if (target.classList.contains('length-amount') ||
            target.classList.contains('length-unit')) {
            const amount = field.querySelector('.length-amount');
            const unit = field.querySelector('.length-unit');
            // An emptied number is a half-typed value, not a request to reset.
            if (amount.value === '')
                return;
            amount.step = String(lengthStep(unit.value));
            this.set(scope, name, amount.value + unit.value);
            return;
        }
        this.set(scope, name, target.value);
    };
    handleClick = (event) => {
        const target = event.target;
        const modeButton = target.closest('[data-mode]');
        if (modeButton) {
            this.previewing = true;
            this.mode = modeButton.dataset.mode;
            return;
        }
        if (target.closest('[part="fontAdd"]')) {
            this.addFont();
            return;
        }
        const remove = target.closest('[data-font]');
        if (remove) {
            this.setFonts((this.value.fonts ?? []).filter((url) => url !== remove.dataset.font));
            return;
        }
        const reset = target.closest('.reset');
        if (reset) {
            const field = reset.closest('.field');
            const { name, scope } = field.dataset;
            this.set(scope, name, null);
        }
    };
    setFonts(fonts) {
        const theme = { ...this.value, fonts };
        if (!fonts.length)
            delete theme.fonts;
        this._value = theme;
        this.update();
        this.dispatchEvent(new Event('change', { bubbles: true }));
    }
    /** Add the font pasted into the font field, or say why it was refused. */
    addFont = () => {
        const fontInput = this.parts.fontInput;
        const { fontError } = this.parts;
        const parsed = parseFontImport(fontInput.value);
        if ('error' in parsed) {
            fontError.textContent = parsed.error;
            return;
        }
        fontError.textContent = '';
        fontInput.value = '';
        const fonts = this.value.fonts ?? [];
        if (!fonts.includes(parsed.url))
            this.setFonts([...fonts, parsed.url]);
    };
    handleFontKey = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.addFont();
        }
    };
    /** Put every mode and every value back to what the base colours generate. */
    resetAll = () => {
        this._value = { base: {} };
        this.update();
        this.dispatchEvent(new Event('change', { bubbles: true }));
    };
    /*
    Follow a colour well while it is dragged, and a length while its arrows are clicked or its
    arrow keys held, without waiting for `change` (which comes on blur).
    */
    handleLiveInput = (event) => {
        const target = event.target;
        if (target.type === 'color' || target.classList.contains('length-amount'))
            this.handleInput(event);
    };
    content = () => [
        div({ part: 'fields', class: 'fields' }, div({ part: 'modes', class: 'modes', role: 'group', ariaLabel: 'Mode' }), div({ part: 'base' }), div({ part: 'fontsSection', hidden: true }, h3('Web fonts'), div({ part: 'fontList' }), div({ class: 'font-add' }, input({
            part: 'fontInput',
            type: 'text',
            placeholder: 'Paste a Google Fonts link',
            ariaLabel: 'Font link, @import line or URL',
            spellcheck: false,
        }), button({ part: 'fontAdd' }, 'Add')), div({ part: 'fontError', class: 'font-error', role: 'status' })), div({ part: 'variables' })),
        datalist({ part: 'fonts', id: 'theme-editor-fonts' }),
        div({ class: 'actions' }, button({ part: 'reset' }, 'Reset all')),
    ];
    field(variable, scope) {
        const id = `theme-${scope}-${variable.name}`;
        const caption = variable.label ?? variable.name;
        let controls;
        switch (variable.kind) {
            case 'color':
                controls = [
                    input({ type: 'color', ariaLabel: caption, tabIndex: -1 }),
                    input({ type: 'text', id, spellcheck: false }),
                ];
                break;
            case 'number':
                controls = [input({ type: 'number', id, step: 0.05 })];
                break;
            /*
            A number with arrows and a unit menu, so a size can be nudged rather than retyped. A
            value that is not a plain length (`calc(…)`, a `var()`) shows as text instead.
            */
            case 'length':
                controls = [
                    input({ type: 'number', id, class: 'length-amount' }),
                    select({ class: 'length-unit', ariaLabel: `${caption} unit` }, ...LENGTH_UNITS.map((unit) => option({ value: unit }, unit))),
                    input({
                        type: 'text',
                        class: 'length-text',
                        ariaLabel: caption,
                        spellcheck: false,
                        hidden: true,
                    }),
                ];
                break;
            case 'enum':
                controls = [
                    select({ id }, ...(variable.options ?? []).map((choice) => option({ value: choice }, choice))),
                ];
                break;
            case 'font-family':
                {
                    const text = input({ type: 'text', id, spellcheck: false });
                    // `list` is a read-only property; only the attribute sets it.
                    text.setAttribute('list', 'theme-editor-fonts');
                    controls = [text];
                }
                break;
            default:
                controls = [input({ type: 'text', id, spellcheck: false })];
        }
        return div({
            class: 'field',
            dataKind: variable.kind,
            dataName: variable.name,
            dataScope: scope,
            title: variable.name,
        }, label({ htmlFor: id }, caption, 
        // Where its value comes from, until an override cuts the link.
        span({ class: 'chain' }, (variable.parents ?? [])
            .map((parent) => `← ${this.labels.get(parent) ?? parent}`)
            .join(' '))), ...controls, button({
            class: 'reset',
            title: 'Remove the override',
            ariaLabel: `Reset ${caption}`,
        }, '↺'));
    }
    /** Families the page already uses, as suggestions. */
    fontSuggestions(full) {
        const families = new Set();
        const first = full[this.modes[0].name] ?? {};
        for (const variable of this.editable()) {
            if (variable.kind === 'font-family') {
                const value = first[variable.name];
                if (value)
                    families.add(value);
            }
        }
        for (const url of this.value.fonts ?? []) {
            for (const family of fontFamilies(url))
                families.add(`'${family}', sans-serif`);
        }
        for (const generic of [
            'system-ui, sans-serif',
            'Georgia, serif',
            'ui-monospace, monospace',
        ]) {
            families.add(generic);
        }
        return [...families];
    }
    // Set when the reader picks a mode, so mounting an editor never changes the page's mode.
    previewing = false;
    // The mode classes the page had before a preview, per element.
    savedClasses;
    /** Every class some mode sets: previewing a mode clears the others' first. */
    modeClasses() {
        return [...new Set(this.modes.flatMap((spec) => spec.classes ?? []))];
    }
    previewMode() {
        if (!this.previewModes || !this.previewing)
            return;
        const wanted = this.currentMode().classes ?? [];
        for (const element of [document.documentElement, document.body]) {
            for (const name of this.modeClasses()) {
                element.classList.toggle(name, wanted.includes(name));
            }
        }
    }
    restoreMode() {
        if (!this.previewing || !this.savedClasses)
            return;
        for (const [element, had] of this.savedClasses) {
            for (const name of this.modeClasses()) {
                element.classList.toggle(name, had.includes(name));
            }
        }
        this.previewing = false;
    }
    builtFor = '';
    /*
    The fields are rebuilt only when what they ARE changes (the mode, the variables, the base);
    an edit updates them in place. Rebuilding on every edit would destroy a colour well while it
    is being dragged, and take focus from the field being typed in.
    */
    build() {
        const current = this.currentMode();
        const mode = current.name;
        const modes = this.modes;
        this.parts.modes.hidden = modes.length < 2;
        this.parts.modes.replaceChildren(...modes.map((each) => button({ dataMode: each.name, ariaPressed: String(each.name === mode) }, each.label ?? each.name)));
        const generator = this.generator;
        this.parts.base.replaceChildren(...(generator
            ? [
                h3('Base colours'),
                ...generator.base.map((variable) => this.field(variable, 'base')),
            ]
            : []));
        const groups = new Map();
        for (const variable of this.editable()) {
            const group = variable.group ?? current.label ?? mode;
            groups.set(group, [...(groups.get(group) ?? []), variable]);
        }
        this.parts.variables.replaceChildren(...[...groups].flatMap(([group, variables]) => [
            h3(group),
            ...variables.map((variable) => this.field(variable, mode)),
        ]));
    }
    /** Show each field's current value, and whether it is tuned. */
    refresh(full) {
        const base = { ...this.generator?.defaults, ...this.value.base };
        const focused = this.shadowRoot.activeElement;
        const scopeElement = this.scopeElement();
        const page = getComputedStyle(scopeElement);
        for (const field of this.shadowRoot.querySelectorAll('.field')) {
            const { name, scope } = field.dataset;
            const tunedIn = (scope === 'base' ? this.value.base : this.value.modes?.[scope]) ?? {};
            const value = scope === 'base'
                ? (base[name] ?? '')
                : full[scope]?.[name] || page.getPropertyValue(`--${name}`).trim();
            field.classList.toggle('-tuned', name in tunedIn);
            /*
            A derived value (one that refers to other variables) shows what it comes to, muted, with
            its expression as the tooltip: `color-mix(in oklab, var(--md-sys-color-primary) 18%,
            white)` does not fit a field, and editing it is what cuts the link anyway.
            */
            const derived = !(name in tunedIn) && isDerived(value);
            field.classList.toggle('-derived', derived);
            field.title = derived ? `${name}: ${value}` : name;
            const kind = field.dataset.kind;
            const shown = !derived
                ? value
                : kind === 'color'
                    ? (resolveColor(scopeElement, value) ?? value)
                    : kind === 'length'
                        ? (resolveLength(scopeElement, value) ?? value)
                        : page.getPropertyValue(`--${name}`).trim() || value;
            if (kind === 'length') {
                this.showLength(field, shown, focused);
                continue;
            }
            for (const control of field.querySelectorAll('input, select')) {
                if (control === focused)
                    continue;
                control.value =
                    control.type === 'color'
                        ? (resolveColor(scopeElement, shown)?.slice(0, 7) ??
                            wellValue(shown))
                        : shown;
            }
        }
        ;
        this.parts.fontsSection.hidden = !this.editable().some((variable) => variable.kind === 'font-family');
        this.parts.fontList.replaceChildren(...(this.value.fonts ?? []).map((url) => div({ class: 'font' }, span({ title: url }, fontFamilies(url).join(', ')), button({
            dataFont: url,
            ariaLabel: `Remove ${fontFamilies(url).join(', ')}`,
        }, 'Remove'))));
        this.parts.fonts.replaceChildren(...this.fontSuggestions(full).map((family) => option({ value: family })));
    }
    showLength(field, value, focused) {
        const amount = field.querySelector('.length-amount');
        const unit = field.querySelector('.length-unit');
        const text = field.querySelector('.length-text');
        const length = splitLength(value);
        amount.hidden = unit.hidden = !length;
        text.hidden = !!length;
        if (length) {
            if (amount !== focused)
                amount.value = String(length.amount);
            unit.value = length.unit;
            amount.step = String(lengthStep(length.unit));
        }
        else if (text !== focused) {
            text.value = value;
        }
    }
    listening = false;
    /*
    Listeners go on the fields directly, not through the creator's `onChange` sugar: that is
    delegated from the document, and a `change` inside a shadow root never reaches it.
    */
    listen() {
        if (this.listening)
            return;
        this.listening = true;
        const { fields } = this.parts;
        fields.addEventListener('change', this.handleInput);
        fields.addEventListener('input', this.handleLiveInput);
        fields.addEventListener('click', this.handleClick);
        this.parts.reset.addEventListener('click', this.resetAll);
        this.parts.fontInput.addEventListener('keydown', this.handleFontKey);
    }
    /** Apply the theme and show it in the fields. */
    update() {
        if (!this.hydrated)
            return;
        this.listen();
        const variables = this.editable();
        const options = {
            modes: this.modes,
            // What the page's CSS declares: the roots a derived mode is made from, with no generator.
            page: this.generator ? {} : declaredValues([...this.discovered.values()]),
        };
        if (this.applyId) {
            applyThemeData(this.value, this.generator, {
                ...options,
                id: this.applyId,
                selectors: this.modeSelectors(),
            });
        }
        const full = deriveTheme(this.value, this.generator, options);
        const structure = [
            this.modes.map((spec) => spec.name).join(),
            this.currentMode().name,
            this.generator?.base.map((v) => v.name).join() ?? '',
            variables.map((v) => `${v.name}:${v.kind}`).join(),
        ].join('|');
        if (structure !== this.builtFor) {
            this.builtFor = structure;
            this.build();
        }
        this.refresh(full);
        this.previewMode();
    }
    connectedCallback() {
        super.connectedCallback();
        this.savedClasses = new Map([document.documentElement, document.body].map((element) => [
            element,
            this.modeClasses().filter((name) => element.classList.contains(name)),
        ]));
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.restoreMode();
        this.builtFor = '';
    }
    render() {
        super.render();
        this.update();
    }
}
export const tosiThemeEditor = TosiThemeEditor.elementCreator();
