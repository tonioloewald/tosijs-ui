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
  expect(editor.value.light['tosi-border-radius']).toBe('12px')
  editor.shadowRoot.querySelector('[data-name="tosi-border-radius"] .reset').click()
  expect(editor.value.light['tosi-border-radius']).toBe(undefined)
  expect(radius()).toBe('4px')
})
```

## Modes

The mode buttons choose which mode you are editing: light, dark, high contrast, or dark high
contrast. Every mode but light starts out generated; a value you change there is tuned for that
mode only, marked with a dot, and stays put when the base colours change. The ↺ button puts it
back to the generated value.

Editing a mode previews it: the editor shows the page in that mode while you work, by setting
the doc system's `darkmode` and `high-contrast` classes, and puts them back when it is removed.
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
- A `change` event fires on every edit.

The editor is styled with fixed colours in its shadow DOM, so no theme you make can make it
unreadable.
*/

/*{ "parent": "Helper Libraries", "description": "<tosi-theme-editor> edits a theme as data: base colours, then each declared variable per mode (light, dark, high contrast), applied live and saved as JSON." }*/

import {
  Color,
  ElementCreator,
  XinStyleSheet,
  elements,
  withAttributes,
} from 'tosijs'
import {
  THEME_MODES,
  ThemeData,
  ThemeGenerator,
  ThemeMode,
  ThemeValues,
  ThemeVariable,
  applyThemeData,
  componentThemeGenerator,
  fontFamilies,
  parseFontImport,
  resolveTheme,
} from './theme-data.js'

const { div, h3, label, input, select, option, button, datalist, span } =
  elements

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  highContrast: 'High contrast',
  darkHighContrast: 'Dark high contrast',
}

/** The mode's resolved value of a variable, falling back to light, whose values cascade. */
const effective = (
  resolved: Record<ThemeMode, ThemeValues>,
  mode: ThemeMode,
  name: string
): string =>
  resolved[mode][name] ??
  (mode === 'darkHighContrast' ? resolved.dark[name] : undefined) ??
  resolved.light[name] ??
  ''

/** `#rrggbb` for a colour well, which takes nothing else. */
const wellValue = (value: string): string => {
  try {
    return Color.fromCss(value).html.slice(0, 7)
  } catch {
    return '#000000'
  }
}

/** The units a length field offers. */
export const LENGTH_UNITS = ['px', 'rem', 'em', '%', 'vw', 'vh', 'ch', 'pt']

/** `16px` → `{ amount: 16, unit: 'px' }`; null for anything else (`calc(…)`, a `var()`). */
export function splitLength(
  value: string
): { amount: number; unit: string } | null {
  const match = /^(-?\d*\.?\d+)([a-z%]*)$/i.exec(value.trim())
  if (!match) return null
  const unit = match[2].toLowerCase() || (Number(match[1]) === 0 ? 'px' : '')
  return LENGTH_UNITS.includes(unit) ? { amount: Number(match[1]), unit } : null
}

/** How far one click of the arrows moves a length in `unit`. */
const lengthStep = (unit: string): number =>
  unit === 'rem' || unit === 'em'
    ? 0.125
    : unit === 'px' || unit === 'pt' || unit === '%'
      ? 1
      : 0.5

export class TosiThemeEditor extends withAttributes({
  /** the mode being edited */
  mode: 'light' as ThemeMode,
  /** the id of the stylesheet the theme applies through; empty to apply nothing */
  applyId: 'tosi-live-theme',
}) {
  static preferredTagName = 'tosi-theme-editor'

  /** show the page in the mode being edited (a property: a boolean attribute cannot default to true) */
  previewModes = true

  private _value: ThemeData = { base: {} }
  private _generator: ThemeGenerator = componentThemeGenerator
  private _variables: ThemeVariable[] = []
  private _selectors: Partial<Record<ThemeMode, string>> = {}

  /** the theme being edited */
  get value(): ThemeData {
    return this._value
  }
  set value(theme: ThemeData) {
    this._value = theme && typeof theme === 'object' ? theme : { base: {} }
    this._value.base ??= {}
    this.queueRender()
  }

  /** turns the base values into each mode's variables */
  get generator(): ThemeGenerator {
    return this._generator
  }
  set generator(generator: ThemeGenerator) {
    this._generator = generator ?? componentThemeGenerator
    this.queueRender()
  }

  /** the variables offered beyond the base colours */
  get variables(): ThemeVariable[] {
    return this._variables
  }
  set variables(variables: ThemeVariable[]) {
    this._variables = variables ?? []
    this.queueRender()
  }

  /** per-mode selectors for the applied stylesheet */
  get selectors(): Partial<Record<ThemeMode, string>> {
    return this._selectors
  }
  set selectors(selectors: Partial<Record<ThemeMode, string>>) {
    this._selectors = selectors ?? {}
    this.queueRender()
  }

  // Fixed colours: no theme being edited can make the editor itself unreadable.
  static shadowStyleSpec: XinStyleSheet = {
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
      width: '360px',
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
      flex: '1 1 40%',
      minWidth: '0',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    ':host .field.-tuned label::after': {
      content: '" •"',
      color: '#b0005a',
    },
    ':host input[type="text"], :host input[type="number"], :host select': {
      flex: '1 1 50%',
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
    ':host .length-unit': { flex: '0 0 64px' },
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
  }

  /** Change one value, apply the theme, and say so. */
  private set(scope: 'base' | ThemeMode, name: string, raw: string | null) {
    const value = raw?.trim() ?? ''
    const theme: ThemeData = { ...this.value, base: { ...this.value.base } }
    const values: Record<string, string> = { ...(theme[scope] ?? {}) }
    if (value) values[name] = value
    else delete values[name]
    ;(theme as any)[scope] = values
    this._value = theme
    this.update()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  private handleInput = (event: Event): void => {
    const target = event.target as HTMLInputElement | HTMLSelectElement
    const field = target.closest('.field') as HTMLElement | null
    if (!field) return
    const { name, scope } = field.dataset as { name: string; scope: string }
    if (target.type === 'color') {
      const text = field.querySelector('input[type="text"]') as HTMLInputElement
      text.value = target.value
    }
    if (
      target.classList.contains('length-amount') ||
      target.classList.contains('length-unit')
    ) {
      const amount = field.querySelector<HTMLInputElement>('.length-amount')!
      const unit = field.querySelector<HTMLSelectElement>('.length-unit')!
      // An emptied number is a half-typed value, not a request to reset.
      if (amount.value === '') return
      amount.step = String(lengthStep(unit.value))
      this.set(scope as 'base' | ThemeMode, name, amount.value + unit.value)
      return
    }
    this.set(scope as 'base' | ThemeMode, name, target.value)
  }

  private handleClick = (event: Event): void => {
    const target = event.target as HTMLElement
    const modeButton = target.closest('[data-mode]') as HTMLElement | null
    if (modeButton) {
      this.previewing = true
      this.mode = modeButton.dataset.mode as ThemeMode
      return
    }
    if (target.closest('[part="fontAdd"]')) {
      this.addFont()
      return
    }
    const remove = target.closest('[data-font]') as HTMLElement | null
    if (remove) {
      this.setFonts(
        (this.value.fonts ?? []).filter((url) => url !== remove.dataset.font)
      )
      return
    }
    const reset = target.closest('.reset')
    if (reset) {
      const field = reset.closest('.field') as HTMLElement
      const { name, scope } = field.dataset as { name: string; scope: string }
      this.set(scope as 'base' | ThemeMode, name, null)
    }
  }

  private setFonts(fonts: string[]): void {
    const theme: ThemeData = { ...this.value, fonts }
    if (!fonts.length) delete theme.fonts
    this._value = theme
    this.update()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /** Add the font pasted into the font field, or say why it was refused. */
  addFont = (): void => {
    const fontInput = this.parts.fontInput as HTMLInputElement
    const { fontError } = this.parts
    const parsed = parseFontImport(fontInput.value)
    if ('error' in parsed) {
      fontError.textContent = parsed.error
      return
    }
    fontError.textContent = ''
    fontInput.value = ''
    const fonts = this.value.fonts ?? []
    if (!fonts.includes(parsed.url)) this.setFonts([...fonts, parsed.url])
  }

  private handleFontKey = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      this.addFont()
    }
  }

  /** Put every mode and every value back to what the base colours generate. */
  resetAll = (): void => {
    this._value = { base: {} }
    this.update()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /*
  Follow a colour well while it is dragged, and a length while its arrows are clicked or its
  arrow keys held, without waiting for `change` (which comes on blur).
  */
  private handleLiveInput = (event: Event): void => {
    const target = event.target as HTMLInputElement
    if (target.type === 'color' || target.classList.contains('length-amount'))
      this.handleInput(event)
  }

  content = () => [
    div(
      { part: 'fields', class: 'fields' },
      div({ part: 'modes', class: 'modes', role: 'group', ariaLabel: 'Mode' }),
      div({ part: 'base' }),
      div(
        { part: 'fontsSection', hidden: true },
        h3('Web fonts'),
        div({ part: 'fontList' }),
        div(
          { class: 'font-add' },
          input({
            part: 'fontInput',
            type: 'text',
            placeholder: 'Paste a Google Fonts link',
            ariaLabel: 'Font link, @import line or URL',
            spellcheck: false,
          }),
          button({ part: 'fontAdd' }, 'Add')
        ),
        div({ part: 'fontError', class: 'font-error', role: 'status' })
      ),
      div({ part: 'variables' })
    ),
    datalist({ part: 'fonts', id: 'theme-editor-fonts' }),
    div({ class: 'actions' }, button({ part: 'reset' }, 'Reset all')),
  ]

  private field(
    variable: ThemeVariable,
    scope: 'base' | ThemeMode
  ): HTMLElement {
    const id = `theme-${scope}-${variable.name}`
    const caption = variable.label ?? variable.name
    let controls: HTMLElement[]
    switch (variable.kind) {
      case 'color':
        controls = [
          input({ type: 'color', ariaLabel: caption, tabIndex: -1 }),
          input({ type: 'text', id, spellcheck: false }),
        ]
        break
      case 'number':
        controls = [input({ type: 'number', id, step: 0.05 })]
        break
      /*
      A number with arrows and a unit menu, so a size can be nudged rather than retyped. A
      value that is not a plain length (`calc(…)`, a `var()`) shows as text instead.
      */
      case 'length':
        controls = [
          input({ type: 'number', id, class: 'length-amount' }),
          select(
            { class: 'length-unit', ariaLabel: `${caption} unit` },
            ...LENGTH_UNITS.map((unit) => option({ value: unit }, unit))
          ),
          input({
            type: 'text',
            class: 'length-text',
            ariaLabel: caption,
            spellcheck: false,
            hidden: true,
          }),
        ]
        break
      case 'enum':
        controls = [
          select(
            { id },
            ...(variable.options ?? []).map((choice) =>
              option({ value: choice }, choice)
            )
          ),
        ]
        break
      case 'font-family':
        {
          const text = input({ type: 'text', id, spellcheck: false })
          // `list` is a read-only property; only the attribute sets it.
          text.setAttribute('list', 'theme-editor-fonts')
          controls = [text]
        }
        break
      default:
        controls = [input({ type: 'text', id, spellcheck: false })]
    }
    return div(
      {
        class: 'field',
        dataKind: variable.kind,
        dataName: variable.name,
        dataScope: scope,
        title: variable.name,
      },
      label({ htmlFor: id }, caption),
      ...controls,
      button(
        {
          class: 'reset',
          title: 'Back to the generated value',
          ariaLabel: `Reset ${caption}`,
        },
        '↺'
      )
    )
  }

  /** Families the page already uses, as suggestions. */
  private fontSuggestions(resolved: Record<ThemeMode, ThemeValues>): string[] {
    const families = new Set<string>()
    for (const variable of this.variables) {
      if (variable.kind === 'font-family') {
        const value = resolved.light[variable.name]
        if (value) families.add(value)
      }
    }
    for (const url of this.value.fonts ?? []) {
      for (const family of fontFamilies(url))
        families.add(`'${family}', sans-serif`)
    }
    for (const generic of [
      'system-ui, sans-serif',
      'Georgia, serif',
      'ui-monospace, monospace',
    ]) {
      families.add(generic)
    }
    return [...families]
  }

  // Set when the reader picks a mode, so mounting an editor never changes the page's mode.
  private previewing = false
  private savedClasses?: { dark: boolean; contrast: boolean }

  private previewMode(): void {
    if (!this.previewModes || !this.previewing) return
    const dark = this.mode === 'dark' || this.mode === 'darkHighContrast'
    const contrast =
      this.mode === 'highContrast' || this.mode === 'darkHighContrast'
    for (const element of [document.documentElement, document.body]) {
      element.classList.toggle('darkmode', dark)
      element.classList.toggle('high-contrast', contrast)
    }
  }

  private restoreMode(): void {
    if (!this.previewing || !this.savedClasses) return
    const { dark, contrast } = this.savedClasses
    for (const element of [document.documentElement, document.body]) {
      element.classList.toggle('darkmode', dark)
      element.classList.toggle('high-contrast', contrast)
    }
    this.previewing = false
  }

  private builtFor = ''

  /*
  The fields are rebuilt only when what they ARE changes (the mode, the variables, the base);
  an edit updates them in place. Rebuilding on every edit would destroy a colour well while it
  is being dragged, and take focus from the field being typed in.
  */
  private build(): void {
    const mode = this.mode
    this.parts.modes.replaceChildren(
      ...THEME_MODES.map((each) =>
        button(
          { dataMode: each, ariaPressed: String(each === mode) },
          THEME_MODE_LABELS[each]
        )
      )
    )
    this.parts.base.replaceChildren(
      h3('Base colours'),
      ...this.generator.base.map((variable) => this.field(variable, 'base'))
    )
    const groups = new Map<string, ThemeVariable[]>()
    for (const variable of this.variables) {
      const group = variable.group ?? THEME_MODE_LABELS[mode]
      groups.set(group, [...(groups.get(group) ?? []), variable])
    }
    this.parts.variables.replaceChildren(
      ...[...groups].flatMap(([group, variables]) => [
        h3(group),
        ...variables.map((variable) => this.field(variable, mode)),
      ])
    )
  }

  /** Show each field's current value, and whether it is tuned. */
  private refresh(resolved: Record<ThemeMode, ThemeValues>): void {
    const base = { ...this.generator.defaults, ...this.value.base }
    const focused = this.shadowRoot!.activeElement
    for (const field of this.shadowRoot!.querySelectorAll<HTMLElement>(
      '.field'
    )) {
      const { name, scope } = field.dataset as { name: string; scope: string }
      const tunedIn =
        scope === 'base'
          ? this.value.base
          : (this.value[scope as ThemeMode] ?? {})
      const value =
        scope === 'base'
          ? (base[name] ?? '')
          : effective(resolved, scope as ThemeMode, name)
      field.classList.toggle('-tuned', name in tunedIn)
      if (field.dataset.kind === 'length') {
        this.showLength(field, value, focused)
        continue
      }
      for (const control of field.querySelectorAll<
        HTMLInputElement | HTMLSelectElement
      >('input, select')) {
        if (control === focused) continue
        control.value = control.type === 'color' ? wellValue(value) : value
      }
    }
    ;(this.parts.fontsSection as HTMLElement).hidden = !this.variables.some(
      (variable) => variable.kind === 'font-family'
    )
    this.parts.fontList.replaceChildren(
      ...(this.value.fonts ?? []).map((url) =>
        div(
          { class: 'font' },
          span({ title: url }, fontFamilies(url).join(', ')),
          button(
            {
              dataFont: url,
              ariaLabel: `Remove ${fontFamilies(url).join(', ')}`,
            },
            'Remove'
          )
        )
      )
    )
    this.parts.fonts.replaceChildren(
      ...this.fontSuggestions(resolved).map((family) =>
        option({ value: family })
      )
    )
  }

  private showLength(
    field: HTMLElement,
    value: string,
    focused: Element | null
  ): void {
    const amount = field.querySelector<HTMLInputElement>('.length-amount')!
    const unit = field.querySelector<HTMLSelectElement>('.length-unit')!
    const text = field.querySelector<HTMLInputElement>('.length-text')!
    const length = splitLength(value)
    amount.hidden = unit.hidden = !length
    text.hidden = !!length
    if (length) {
      if (amount !== focused) amount.value = String(length.amount)
      unit.value = length.unit
      amount.step = String(lengthStep(length.unit))
    } else if (text !== focused) {
      text.value = value
    }
  }

  private listening = false

  /*
  Listeners go on the fields directly, not through the creator's `onChange` sugar: that is
  delegated from the document, and a `change` inside a shadow root never reaches it.
  */
  private listen(): void {
    if (this.listening) return
    this.listening = true
    const { fields } = this.parts
    fields.addEventListener('change', this.handleInput)
    fields.addEventListener('input', this.handleLiveInput)
    fields.addEventListener('click', this.handleClick)
    this.parts.reset.addEventListener('click', this.resetAll)
    ;(this.parts.fontInput as HTMLInputElement).addEventListener(
      'keydown',
      this.handleFontKey
    )
  }

  /** Apply the theme and show it in the fields. */
  update(): void {
    if (!this.hydrated) return
    this.listen()
    const resolved = this.applyId
      ? applyThemeData(this.value, this.generator, {
          id: this.applyId,
          selectors: this.selectors,
        })
      : resolveTheme(this.value, this.generator)
    const structure = [
      this.mode,
      this.generator.base.map((v) => v.name).join(),
      this.variables.map((v) => `${v.name}:${v.kind}`).join(),
    ].join('|')
    if (structure !== this.builtFor) {
      this.builtFor = structure
      this.build()
    }
    this.refresh(resolved)
    this.previewMode()
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.savedClasses = {
      dark: document.body.classList.contains('darkmode'),
      contrast: document.body.classList.contains('high-contrast'),
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.restoreMode()
    this.builtFor = ''
  }

  render(): void {
    super.render()
    this.update()
  }
}

export const tosiThemeEditor =
  TosiThemeEditor.elementCreator() as ElementCreator<TosiThemeEditor>
