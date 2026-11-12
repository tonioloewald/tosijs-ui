/*
What a CSS value IS, as opposed to what it comes to: a colour typed in, another variable, that
variable lightened, a mix of two, the text colour that reads on it, a length scaled from
another… Each form is written as plain CSS the browser computes (`var()`, `calc()`,
`color-mix()`, relative colour syntax), so a theme stays live: change a root and everything
made from it follows, with no script.

`parseCssValue` reads a value back into its form, so an editor can show the controls for what
was written; anything it does not recognise is an `expression`, kept exactly as written.
DOM-free, so it runs at build time and in tests.
*/
/** The forms each kind offers, in menu order. */
export const CSS_VALUE_FORMS = {
    color: [
        'auto',
        'literal',
        'ref',
        'adjust',
        'mix',
        'contrast',
        'current',
        'expression',
    ],
    length: ['auto', 'literal', 'ref', 'scale', 'expression'],
    number: ['auto', 'literal', 'ref', 'scale', 'expression'],
    text: ['auto', 'literal', 'ref'],
};
/** Keywords a colour operand may be besides a variable. */
export const COLOR_KEYWORDS = ['white', 'black', 'transparent', 'currentColor'];
// Below this oklch lightness a colour gets white text, above it black.
const CONTRAST_THRESHOLD = 0.62;
const OPERAND = String.raw `(var\(--[\w-]+\)|[a-zA-Z]+|#[0-9a-fA-F]{3,8})`;
const NUMBER = String.raw `(-?\d*\.?\d+)`;
const round = (n, places = 4) => {
    const scale = 10 ** places;
    return Math.round(n * scale) / scale;
};
const patterns = {
    ref: /^var\(--([\w-]+)\)$/,
    contrast: new RegExp(String.raw `^oklch\(from ${OPERAND} clamp\(0, \(${NUMBER} - l\) \* 1000, 1\) 0 0\)$`),
    mix: new RegExp(String.raw `^color-mix\(in ([\w-]+), ${OPERAND} ${NUMBER}%, ${OPERAND}\)$`),
    adjust: new RegExp(String.raw `^oklch\(from ${OPERAND} (l|calc\(l [+-] \d*\.?\d+\)) (c|calc\(c \* \d*\.?\d+\)) (h|calc\(h [+-] \d*\.?\d+\))(?: / calc\(alpha \* (\d*\.?\d+)\))?\)$`),
    scale: new RegExp(String.raw `^calc\(${OPERAND} ([*/]) ${NUMBER}\)$`),
    number: /^-?\d*\.?\d+$/,
    length: /^-?\d*\.?\d+(px|rem|em|%|vw|vh|ch|pt)?$/i,
    hexOrName: /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl|oklch|oklab|lab|lch|hwb)a?\([^()]*\))$/i,
};
// `calc(l + 0.1)` → 0.1; `l` → 0
const delta = (term) => {
    const match = /([+-]) (\d*\.?\d+)/.exec(term);
    return match ? Number(match[2]) * (match[1] === '-' ? -1 : 1) : 0;
};
const factor = (term) => {
    const match = /\* (\d*\.?\d+)/.exec(term);
    return match ? Number(match[1]) : 1;
};
/** What a value is, for a kind. `''` is `auto`; anything unrecognised is an `expression`. */
export function parseCssValue(raw, kind) {
    const value = raw.trim();
    if (!value)
        return { form: 'auto' };
    const forms = CSS_VALUE_FORMS[kind];
    if (patterns.ref.test(value))
        return { form: 'ref', of: value };
    if (kind === 'color') {
        if (/^currentcolor$/i.test(value))
            return { form: 'current' };
        let match = patterns.contrast.exec(value);
        if (match)
            return { form: 'contrast', of: match[1] };
        match = patterns.mix.exec(value);
        if (match)
            return {
                form: 'mix',
                space: match[1],
                a: match[2],
                amount: Number(match[3]),
                b: match[4],
            };
        match = patterns.adjust.exec(value);
        if (match)
            return {
                form: 'adjust',
                of: match[1],
                lightness: round(delta(match[2]) * 100, 2),
                chroma: factor(match[3]),
                hue: delta(match[4]),
                alpha: match[5] === undefined ? 1 : Number(match[5]),
            };
        if (patterns.hexOrName.test(value))
            return { form: 'literal', value };
    }
    if (forms.includes('scale')) {
        const match = patterns.scale.exec(value);
        // `/ 2` reads as `× 0.5`, and is written that way once edited.
        if (match && Number(match[3]) !== 0)
            return {
                form: 'scale',
                of: match[1],
                factor: match[2] === '/' ? round(1 / Number(match[3])) : Number(match[3]),
            };
    }
    if (kind === 'length' && patterns.length.test(value))
        return { form: 'literal', value };
    if (kind === 'number' && patterns.number.test(value))
        return { form: 'literal', value };
    if (kind === 'text' && !/var\(/.test(value))
        return { form: 'literal', value };
    return { form: 'expression', value };
}
const signed = (channel, n) => n ? `calc(${channel} ${n < 0 ? '-' : '+'} ${round(Math.abs(n))})` : channel;
/** The CSS for a form; `''` for `auto`. */
export function formatCssValue(form) {
    switch (form.form) {
        case 'auto':
            return '';
        case 'literal':
        case 'expression':
            return form.value.trim();
        case 'ref':
            return form.of;
        case 'current':
            return 'currentColor';
        case 'contrast':
            return `oklch(from ${form.of} clamp(0, (${CONTRAST_THRESHOLD} - l) * 1000, 1) 0 0)`;
        case 'mix':
            return `color-mix(in ${form.space}, ${form.a} ${round(form.amount, 2)}%, ${form.b})`;
        case 'adjust': {
            const { of, lightness, chroma, hue, alpha } = form;
            if (!lightness && chroma === 1 && !hue && alpha === 1)
                return of;
            const c = chroma === 1 ? 'c' : `calc(c * ${round(chroma)})`;
            const a = alpha === 1 ? '' : ` / calc(alpha * ${round(alpha)})`;
            return `oklch(from ${of} ${signed('l', lightness / 100)} ${c} ${signed('h', hue)}${a})`;
        }
        case 'scale':
            return form.factor === 1
                ? form.of
                : `calc(${form.of} * ${round(form.factor)})`;
    }
}
/** A form's starting values when it is picked, from what the value was. */
export function startForm(name, previous, { literal, operand }) {
    const of = 'of' in previous ? previous.of : 'a' in previous ? previous.a : operand;
    switch (name) {
        case 'auto':
            return { form: 'auto' };
        case 'literal':
            return { form: 'literal', value: literal };
        case 'ref':
            return { form: 'ref', of };
        case 'current':
            return { form: 'current' };
        case 'contrast':
            return { form: 'contrast', of };
        case 'mix':
            return { form: 'mix', a: of, b: 'white', amount: 50, space: 'oklab' };
        case 'adjust':
            return { form: 'adjust', of, lightness: 0, chroma: 1, hue: 0, alpha: 1 };
        case 'scale':
            return { form: 'scale', of, factor: 1 };
        case 'expression':
            return {
                form: 'expression',
                value: formatCssValue(previous) || literal,
            };
    }
}
/** `var(--brand-color)` → `brand-color`; null for a keyword or literal. */
export const operandName = (operand) => /^var\(--([\w-]+)\)$/.exec(operand)?.[1] ?? null;
