/*#
# css value

`<tosi-css-value>` edits one CSS value of a given `kind` (`color`, `length`, `number`, `text`)
as what it IS rather than only what it comes to: a colour typed in, another variable, that
variable lightened or turned, a mix of two, the text colour that reads on it, a length scaled
from another, or any expression. Each form is written as plain CSS (`var()`, `calc()`,
`color-mix()`, relative colour syntax), so the browser keeps computing it: change the colour
it was made from and it follows.

**Auto** (an empty value) means "not set": the element shows what the value `computed` to, and
editing anything picks a form. Set `no-auto` where a value must be given.

```js
import { tosiCssValue } from 'tosijs-ui'

const variables = [
  { name: 'brand-color', label: 'Brand', kind: 'color' },
  { name: 'background', label: 'Background', kind: 'color' },
  { name: 'tosi-radius', label: 'Corners', kind: 'length' },
]
const output = document.createElement('code')
const show = (event) => (output.textContent = event.target.value || '(auto)')
preview.append(
  tosiCssValue({
    kind: 'color',
    value: 'oklch(from var(--brand-color) calc(l + 0.1) c h)',
    variables,
    onChange: show,
  }),
  tosiCssValue({
    kind: 'length',
    value: 'calc(var(--tosi-radius) * 2)',
    variables,
    onChange: show,
  }),
  output
)
```
```css
.preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
}
.preview tosi-css-value {
  width: 280px;
}
```
```test
test('a form round-trips, and changing it writes CSS', async () => {
  const [color, length] = preview.querySelectorAll('tosi-css-value')
  while (!color.shadowRoot?.querySelector('[data-key="lightness"]')) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  const form = color.shadowRoot.querySelector('[part="form"]')
  expect(form.value).toBe('adjust')
  const lightness = color.shadowRoot.querySelector('[data-key="lightness"]')
  expect(lightness.value).toBe('10')
  lightness.value = '-20'
  lightness.dispatchEvent(new Event('change', { bubbles: true }))
  expect(color.value).toBe('oklch(from var(--brand-color) calc(l - 0.2) c h)')
  expect(length.shadowRoot.querySelector('[data-key="factor"]').value).toBe('2')
})
```

Its value is a string, its `change` event says the value changed, and `variables` lists what a
form may refer to (`{ name, label?, kind }`, names without the dashes). The relative-colour
forms (Adjust, Text on) appear only where the browser supports relative colour syntax.
*/
/*{ "parent": "Helper Libraries", "description": "<tosi-css-value> edits a CSS value as what it is: a colour, another variable, that variable lightened or mixed, a contrast colour, a scaled length or any expression — written as live CSS." }*/
import { elements, varDefault, withAttributes, } from 'tosijs';
import { COLOR_KEYWORDS, CSS_VALUE_FORMS, formatCssValue, operandName, parseCssValue, startForm, } from './css-value-forms.js';
const { div, select, option, input, span } = elements;
const FORM_LABELS = {
    auto: 'Auto',
    literal: 'Value',
    ref: 'Same as',
    current: 'Text colour',
    contrast: 'Text on',
    mix: 'Mix',
    adjust: 'Adjust',
    scale: 'Scale',
    expression: 'Expression',
};
const LITERAL_LABELS = {
    color: 'Colour',
    length: 'Length',
    number: 'Number',
    text: 'Text',
};
const LENGTH_UNITS = ['px', 'rem', 'em', '%', 'vw', 'vh', 'ch', 'pt'];
const relativeColors = () => typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('color', 'oklch(from red l c h)');
const splitLength = (value) => {
    const match = /^(-?\d*\.?\d+)([a-z%]*)$/i.exec(value.trim());
    if (!match)
        return null;
    const unit = match[2].toLowerCase() || 'px';
    return LENGTH_UNITS.includes(unit) ? { amount: match[1], unit } : null;
};
// Fixed defaults, overridable: an editor's controls must stay readable whatever it edits.
const border = varDefault.cssValueBorder('#bbb');
const control = {
    flex: '0 0 auto',
    minWidth: '0',
    padding: '3px 5px',
    border: `1px solid ${border}`,
    borderRadius: '4px',
    lineHeight: '1.3',
    background: varDefault.cssValueBg('#fff'),
    color: varDefault.cssValueColor('#222'),
    font: 'inherit',
};
export class TosiCssValue extends withAttributes({
    /** what the value is: `color`, `length`, `number` or `text` */
    kind: 'color',
    /** no Auto: a value must be given */
    noAuto: false,
}) {
    static preferredTagName = 'tosi-css-value';
    static shadowStyleSpec = {
        ':host': {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '4px',
            maxWidth: '100%',
            fontSize: varDefault.cssValueFontSize('13px'),
            lineHeight: '1.4',
            color: varDefault.cssValueColor('#222'),
        },
        ':host *': { boxSizing: 'border-box' },
        ':host [hidden]': { display: 'none !important' },
        ':host select, :host input': control,
        ':host [part="form"]': { width: '6em' },
        ':host .swatch': {
            flex: '0 0 auto',
            width: '18px',
            height: '18px',
            borderRadius: '4px',
            boxShadow: `inset 0 0 0 1px ${border}`,
            // A checkerboard under the colour, so translucency shows.
            backgroundImage: 'linear-gradient(var(--swatch), var(--swatch)), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%)',
            backgroundSize: '100%, 8px 8px',
        },
        ':host [part="computed"]': {
            color: varDefault.cssValueMuted('#6a6a6a'),
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '9em',
        },
        ':host [part="controls"]': {
            flex: '0 1 auto',
            marginLeft: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '4px',
        },
        ':host [part="controls"]:empty': { display: 'none' },
        ':host input[type="color"]': {
            width: '26px',
            height: '22px',
            padding: '1px',
            cursor: 'pointer',
        },
        ':host input[type="number"]': { width: '4.5em' },
        ':host .pair': { display: 'inline-flex', alignItems: 'center', gap: '2px' },
        ':host .pair input[type="number"]': { width: '3.75em' },
        ':host [part="controls"].-wide .operand': { flex: '1 1 100%' },
        ':host [part="controls"].-wide': {
            flexBasis: '100%',
            justifyContent: 'space-between',
        },
        ':host [data-key="unit"]': { width: '4em' },
        ':host input[type="text"]': { width: '6.5em' },
        ':host [data-key="value"].-expression': { width: '100%' },
        ':host .operand': { width: '8em' },
        ':host .unit': { color: varDefault.cssValueMuted('#6a6a6a') },
        ':host :focus-visible': {
            outline: `2px solid ${varDefault.cssValueFocus('#0064d2')}`,
            outlineOffset: '1px',
        },
    };
    _value = '';
    _variables = [];
    /** the value, as CSS; `''` is Auto */
    get value() {
        return this._value;
    }
    set value(value) {
        const next = String(value ?? '').trim();
        if (next === this._value)
            return;
        this._value = next;
        this.queueRender();
    }
    /** what Auto comes to, shown while the value is not set */
    _computed = '';
    get computed() {
        return this._computed;
    }
    set computed(computed) {
        this._computed = String(computed ?? '');
        this.queueRender();
    }
    /** what a form may refer to */
    get variables() {
        return this._variables;
    }
    set variables(variables) {
        this._variables = Array.isArray(variables) ? variables : [];
        this.builtFor = '';
        this.queueRender();
    }
    /**
     * where values resolve, for the swatch and what a length comes to: a theme scoped to an
     * element (`.glass-demo`) means nothing outside it. The element itself by default.
     */
    scope = null;
    /** the form the value has, read from the value */
    get form() {
        return parseCssValue(this._value, this.kind);
    }
    content = () => [
        select({ part: 'form', ariaLabel: 'Form' }),
        span({ class: 'swatch', part: 'swatch', hidden: true }),
        span({ part: 'computed' }),
        div({ part: 'controls' }),
    ];
    /** The forms this element offers. */
    forms() {
        return CSS_VALUE_FORMS[this.kind].filter((form) => !(form === 'auto' && this.noAuto) &&
            !((form === 'adjust' || form === 'contrast') && !relativeColors()));
    }
    /** The variables a form of this kind may refer to: same kind (lengths and numbers mix). */
    operands(includeKeywords) {
        const kinds = this.kind === 'color'
            ? ['color']
            : this.kind === 'text'
                ? [this.kind]
                : ['length', 'number'];
        return [
            ...(includeKeywords && this.kind === 'color' ? COLOR_KEYWORDS : []),
            ...this._variables
                .filter((v) => kinds.includes(v.kind))
                .map((v) => `var(--${v.name})`),
        ];
    }
    operandSelect(key, current, label, keywords = false) {
        const choices = this.operands(keywords);
        if (current && !choices.includes(current))
            choices.unshift(current);
        const labelOf = (operand) => {
            const name = operandName(operand);
            if (!name)
                return operand;
            return this._variables.find((v) => v.name === name)?.label ?? name;
        };
        return select({ class: 'operand', dataKey: key, ariaLabel: label }, ...choices.map((operand) => option({ value: operand, title: operand }, labelOf(operand))));
    }
    /** A number with a short caption before it (`L+`) and its full name as the label. */
    numberInput(key, label, step, caption) {
        return elements.label({ class: 'pair', title: label }, span({ class: 'unit' }, caption), input({ type: 'number', dataKey: key, ariaLabel: label, step }));
    }
    /** The controls for a form, built when the form (not its numbers) changes. */
    controlsFor(form) {
        switch (form.form) {
            case 'literal':
                if (this.kind === 'color')
                    return [
                        input({
                            type: 'color',
                            dataRole: 'well',
                            ariaLabel: 'Colour',
                            tabIndex: -1,
                        }),
                        input({
                            type: 'text',
                            dataKey: 'value',
                            ariaLabel: 'Colour',
                            spellcheck: false,
                        }),
                    ];
                if (this.kind === 'length' && splitLength(form.value))
                    return [
                        input({ type: 'number', dataKey: 'amount', ariaLabel: 'Amount' }),
                        select({ dataKey: 'unit', ariaLabel: 'Unit' }, ...LENGTH_UNITS.map((unit) => option({ value: unit }, unit))),
                    ];
                return [
                    input({
                        type: this.kind === 'number' ? 'number' : 'text',
                        dataKey: 'value',
                        ariaLabel: 'Value',
                        step: 0.05,
                        spellcheck: false,
                    }),
                ];
            case 'ref':
                return [this.operandSelect('of', form.of, 'Variable')];
            case 'contrast':
                return [this.operandSelect('of', form.of, 'Background colour')];
            case 'mix':
                return [
                    this.operandSelect('a', form.a, 'First colour', true),
                    this.numberInput('amount', 'Percent of the first', 5, '%'),
                    this.operandSelect('b', form.b, 'Second colour', true),
                ];
            case 'adjust':
                return [
                    this.operandSelect('of', form.of, 'Colour'),
                    this.numberInput('lightness', 'Lightness: points added', 1, 'L+'),
                    this.numberInput('chroma', 'Chroma: times', 0.1, 'C×'),
                    this.numberInput('hue', 'Hue: degrees turned', 5, 'H+'),
                    this.numberInput('alpha', 'Alpha: times', 0.05, 'α×'),
                ];
            case 'scale':
                return [
                    this.operandSelect('of', form.of, 'Variable'),
                    this.numberInput('factor', 'Times', 0.1, '×'),
                ];
            case 'expression':
                return [
                    input({
                        type: 'text',
                        dataKey: 'value',
                        class: '-expression',
                        ariaLabel: 'Expression',
                        spellcheck: false,
                    }),
                ];
            default:
                return [];
        }
    }
    /** The form the controls describe. */
    readControls(name) {
        const read = (key) => this.shadowRoot.querySelector(`[data-key="${key}"]`)
            ?.value ?? '';
        const number = (key, fallback) => {
            const n = parseFloat(read(key));
            return Number.isFinite(n) ? n : fallback;
        };
        switch (name) {
            case 'literal': {
                const amount = read('amount');
                return {
                    form: 'literal',
                    value: amount !== '' ? amount + read('unit') : read('value'),
                };
            }
            case 'ref':
            case 'contrast':
                return { form: name, of: read('of') };
            case 'mix':
                return {
                    form: 'mix',
                    a: read('a'),
                    b: read('b'),
                    amount: number('amount', 50),
                    space: this.form.space ?? 'oklab',
                };
            case 'adjust':
                return {
                    form: 'adjust',
                    of: read('of'),
                    lightness: number('lightness', 0),
                    chroma: number('chroma', 1),
                    hue: number('hue', 0),
                    alpha: number('alpha', 1),
                };
            case 'scale':
                return { form: 'scale', of: read('of'), factor: number('factor', 1) };
            case 'expression':
                return { form: 'expression', value: read('value') };
            default:
                return startForm(name, this.form, this.seed());
        }
    }
    /** What a newly picked form starts from. */
    seed() {
        const shown = this._value || this._computed;
        return {
            literal: this.kind === 'color'
                ? (this.resolveColor(shown) ?? '#000000')
                : this.kind === 'length'
                    ? (this.resolveLength(shown) ?? '0px')
                    : shown,
            operand: this.operands(false)[0] ?? (this.kind === 'color' ? 'black' : '1'),
        };
    }
    commit(value, change) {
        if (value !== this._value) {
            this._value = value;
            this.queueRender();
        }
        if (change)
            this.dispatchEvent(new Event('change', { bubbles: true }));
    }
    handleChange = (event) => {
        event.stopPropagation();
        const target = event.target;
        const formSelect = this.parts.form;
        if (target === formSelect) {
            const next = startForm(formSelect.value, this.form, this.seed());
            this.commit(formatCssValue(next), true);
            return;
        }
        this.syncFrom(target);
        this.commit(formatCssValue(this.readControls(formSelect.value)), true);
    };
    // A colour well dragged or a number nudged applies at once; typing waits for `change`.
    handleInput = (event) => {
        const target = event.target;
        if (target.type !== 'color' && target.type !== 'number')
            return;
        this.syncFrom(target);
        const formSelect = this.parts.form;
        this.commit(formatCssValue(this.readControls(formSelect.value)), false);
    };
    // A colour well drives the text beside it, keeping the alpha the value had.
    syncFrom(target) {
        if (target.dataset.role !== 'well')
            return;
        const text = this.shadowRoot.querySelector('[data-key="value"]');
        const current = this.resolveColor(text.value) ?? '';
        text.value = target.value + (current.length === 9 ? current.slice(7) : '');
    }
    probe(property, value) {
        if (!value)
            return null;
        const probe = span({ hidden: true });
        probe.style[property] = value;
        if (!probe.style[property])
            return null;
        (this.scope ?? this.shadowRoot).append(probe);
        const computed = getComputedStyle(probe)[property];
        probe.remove();
        return computed || null;
    }
    /** What a colour comes to here, as `#rrggbb` or `#rrggbbaa`. */
    resolveColor(value) {
        const computed = this.probe('color', value);
        if (!computed)
            return null;
        const canvas = document.createElement('canvas').getContext?.('2d');
        if (!canvas)
            return null;
        canvas.fillStyle = computed;
        canvas.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = canvas.getImageData(0, 0, 1, 1).data;
        const hex = (n) => n.toString(16).padStart(2, '0');
        return `#${hex(r)}${hex(g)}${hex(b)}${a < 255 ? hex(a) : ''}`;
    }
    resolveLength(value) {
        return this.probe('width', value);
    }
    builtFor = '';
    listening = false;
    render() {
        super.render();
        if (!this.hydrated)
            return;
        const root = this.shadowRoot;
        if (!this.listening) {
            this.listening = true;
            root.addEventListener('change', this.handleChange);
            root.addEventListener('input', this.handleInput);
        }
        const form = this.form;
        const forms = this.forms();
        const formSelect = this.parts.form;
        const key = `${this.kind}|${forms.join()}|${form.form}|${form.form === 'literal' && this.kind === 'length'
            ? String(!!splitLength(form.value))
            : ''}|${this._variables.map((v) => v.name).join()}`;
        const controls = this.parts.controls;
        if (key !== this.builtFor) {
            this.builtFor = key;
            const shownForms = forms.includes(form.form)
                ? forms
                : [...forms, form.form];
            formSelect.replaceChildren(...shownForms.map((name) => option({ value: name }, name === 'literal' ? LITERAL_LABELS[this.kind] : FORM_LABELS[name])));
            controls.replaceChildren(...this.controlsFor(form));
            controls.classList.toggle('-wide', form.form === 'adjust' ||
                form.form === 'mix' ||
                form.form === 'expression');
        }
        formSelect.value = form.form;
        this.showValues(form);
        const shown = this._value || this._computed;
        const swatch = this.parts.swatch;
        // A colour typed in has its well; the swatch shows what the other forms come to.
        swatch.hidden = this.kind !== 'color' || !shown || form.form === 'literal';
        swatch.style.setProperty('--swatch', (shown && this.resolveColor(shown)) || 'transparent');
        const computed = this.parts.computed;
        computed.textContent =
            form.form === 'auto'
                ? this._computed
                : this.kind === 'length' && form.form !== 'literal'
                    ? `= ${this.resolveLength(this._value) ?? '?'}`
                    : '';
        computed.title = form.form === 'auto' ? this._computed : this._value;
    }
    /** Put the form's numbers and choices in its controls, leaving the focused one alone. */
    showValues(form) {
        const root = this.shadowRoot;
        const focused = root.activeElement;
        const set = (key, value) => {
            const element = root.querySelector(`[data-key="${key}"]`);
            if (element && element !== focused)
                element.value = String(value);
        };
        if (form.form === 'literal') {
            const length = this.kind === 'length' ? splitLength(form.value) : null;
            if (length) {
                set('amount', length.amount);
                set('unit', length.unit);
            }
            else
                set('value', form.value);
            const well = root.querySelector('[data-role="well"]');
            if (well && well !== focused)
                well.value = (this.resolveColor(form.value) ?? '#000000').slice(0, 7);
            return;
        }
        for (const [key, value] of Object.entries(form)) {
            if (key !== 'form')
                set(key, value);
        }
    }
}
export const tosiCssValue = TosiCssValue.elementCreator();
