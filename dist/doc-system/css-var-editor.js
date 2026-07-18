/*
`<tosi-css-var-editor>` — a doc-system affordance (NOT a general library component).
Reads the CSS custom properties a component defines in its shadow `<style>` and builds
a live form to tweak them, applying changes to the matching element(s) on the page. It
is registered as a side effect of loading the doc-system (see doc-system.ts) so doc pages
can drop `<tosi-css-var-editor element-selector="tosi-widget">` under an example; it is
deliberately not exported from `tosijs-ui`.
*/
import { Component as WebComponent, elements, Color, } from 'tosijs';
import { tosiForm, tosiField } from '../form';
const { h2, code } = elements;
// A value is a color if it's a hex literal or an rgb()/hsl() (with or without alpha)
// functional notation — the forms getComputedStyle / getPropertyValue return. The old
// regex (`[\d()a-fA-F]+`) rejected the commas and spaces in `rgb(255, 0, 0)`, so every
// functional color fell through to a plain text field.
const COLOR_RE = /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]*\))$/i;
class TosiCssVarEditor extends WebComponent {
    static preferredTagName = 'tosi-css-var-editor';
    static initAttributes = {
        elementSelector: '',
        targetSelector: '',
    };
    content = () => [
        h2({ part: 'title' }, 'CSS variables'),
        tosiForm({ part: 'variables', changeCallback: this.update }),
    ];
    // The example the editor targets can mount a frame or two after this element does;
    // retry a bounded number of times (≈10s) rather than polling forever, and cancel on
    // disconnect so a removed editor can't keep firing timers against a dead page.
    retryTimer;
    retries = 0;
    loadVars = () => {
        const { title, variables } = this.parts;
        variables.textContent = '';
        if (!this.elementSelector)
            return;
        title.textContent = `CSS variables for ${this.elementSelector}`;
        const element = document.querySelector(this.elementSelector);
        if (!element) {
            if (this.retries++ < 40)
                this.retryTimer = setTimeout(this.loadVars, 250);
            return;
        }
        const styleNode = element.shadowRoot
            ? element.shadowRoot.querySelector('style')
            : document.querySelector(`style#${this.elementSelector}-component`);
        if (!styleNode || !styleNode.textContent)
            return;
        const computedStyle = getComputedStyle(element);
        const cssVars = [
            ...new Set(styleNode.textContent.match(/--[\w-]+/g) ?? []),
        ];
        for (const cssVar of cssVars) {
            let value = computedStyle.getPropertyValue(cssVar).trim();
            const type = COLOR_RE.test(value) ? 'color' : 'string';
            if (type === 'color')
                value = Color.fromCss(value).html;
            variables.append(tosiField(code(cssVar), { key: cssVar, value, type }));
        }
    };
    update = () => {
        const selector = this.targetSelector || this.elementSelector;
        if (!selector)
            return;
        const targets = [...document.querySelectorAll(selector)];
        const { value } = this.parts.variables;
        for (const target of targets) {
            for (const key of Object.keys(value)) {
                target.style.setProperty(key, value[key]);
            }
        }
    };
    connectedCallback() {
        super.connectedCallback();
        this.retries = 0;
        this.loadVars();
        this.parts.variables.addEventListener('change', this.update);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.retryTimer)
            clearTimeout(this.retryTimer);
    }
}
export const tosiCssVarEditor = TosiCssVarEditor.elementCreator();
