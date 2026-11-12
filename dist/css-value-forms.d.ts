export type CssValueKind = 'color' | 'length' | 'number' | 'text';
/** A colour or length a form refers to: `var(--brand-color)`, or a keyword (`white`). */
export type CssOperand = string;
export type CssValueForm = 
/** not set: whatever the theme computes */
{
    form: 'auto';
} | {
    form: 'literal';
    value: string;
}
/** another variable, as is */
 | {
    form: 'ref';
    of: CssOperand;
} | {
    form: 'current';
}
/** black or white, whichever reads on `of` */
 | {
    form: 'contrast';
    of: CssOperand;
}
/** `amount`% of `a`, the rest `b`, mixed in `space` (`oklab`, `srgb`, …) */
 | {
    form: 'mix';
    a: CssOperand;
    b: CssOperand;
    amount: number;
    space: string;
}
/**
 * `of`, adjusted in oklch: `lightness` added (in points of 100), chroma times `chroma`, hue
 * turned by `hue` degrees, alpha times `alpha`
 */
 | {
    form: 'adjust';
    of: CssOperand;
    lightness: number;
    chroma: number;
    hue: number;
    alpha: number;
}
/** `of` times `factor` */
 | {
    form: 'scale';
    of: CssOperand;
    factor: number;
} | {
    form: 'expression';
    value: string;
};
export type CssFormName = CssValueForm['form'];
/** The forms each kind offers, in menu order. */
export declare const CSS_VALUE_FORMS: Record<CssValueKind, CssFormName[]>;
/** Keywords a colour operand may be besides a variable. */
export declare const COLOR_KEYWORDS: string[];
/** What a value is, for a kind. `''` is `auto`; anything unrecognised is an `expression`. */
export declare function parseCssValue(raw: string, kind: CssValueKind): CssValueForm;
/** The CSS for a form; `''` for `auto`. */
export declare function formatCssValue(form: CssValueForm): string;
/** A form's starting values when it is picked, from what the value was. */
export declare function startForm(name: CssFormName, previous: CssValueForm, { literal, operand }: {
    literal: string;
    operand: CssOperand;
}): CssValueForm;
/** `var(--brand-color)` → `brand-color`; null for a keyword or literal. */
export declare const operandName: (operand: CssOperand) => string | null;
