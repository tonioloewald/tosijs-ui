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

export type CssValueKind = 'color' | 'length' | 'number' | 'text'

/** A colour or length a form refers to: `var(--brand-color)`, or a keyword (`white`). */
export type CssOperand = string

export type CssValueForm =
  /** not set: whatever the theme computes */
  | { form: 'auto' }
  | { form: 'literal'; value: string }
  /** another variable, as is */
  | { form: 'ref'; of: CssOperand }
  | { form: 'current' }
  /** black or white, whichever reads on `of` */
  | { form: 'contrast'; of: CssOperand }
  /** `amount`% of `a`, the rest `b`, mixed in `space` (`oklab`, `srgb`, …) */
  | { form: 'mix'; a: CssOperand; b: CssOperand; amount: number; space: string }
  /**
   * `of`, adjusted in oklch: `lightness` added (in points of 100), chroma times `chroma`, hue
   * turned by `hue` degrees, alpha times `alpha`
   */
  | {
      form: 'adjust'
      of: CssOperand
      lightness: number
      chroma: number
      hue: number
      alpha: number
    }
  /** `of` times `factor` */
  | { form: 'scale'; of: CssOperand; factor: number }
  | { form: 'expression'; value: string }

export type CssFormName = CssValueForm['form']

/** The forms each kind offers, in menu order. */
export const CSS_VALUE_FORMS: Record<CssValueKind, CssFormName[]> = {
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
}

/** Keywords a colour operand may be besides a variable. */
export const COLOR_KEYWORDS = ['white', 'black', 'transparent', 'currentColor']

/*
Black or white by luminance (the `y` of xyz), which is what WCAG's contrast ratio is made of:
below 0.1791 white has the better contrast, above it black. Lightness in oklch is not a stand-in
for it: a saturated pink at luminance 0.17 has oklch lightness 0.6 and reads better in white.
White is written as D65's, so it comes out as #fff.
*/
const LUMINANCE_SWITCH = 'clamp(0, (0.1791 - y) * 1000, 1)'
const textOn = (of: CssOperand) =>
  `color(from ${of} xyz-d65 calc(0.9505 * ${LUMINANCE_SWITCH}) ${LUMINANCE_SWITCH} calc(1.0888 * ${LUMINANCE_SWITCH}))`
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const OPERAND = String.raw`(var\(--[\w-]+\)|[a-zA-Z]+|#[0-9a-fA-F]{3,8})`
const NUMBER = String.raw`(-?\d*\.?\d+)`
const round = (n: number, places = 4) => {
  const scale = 10 ** places
  return Math.round(n * scale) / scale
}

const patterns = {
  ref: /^var\(--([\w-]+)\)$/,
  contrast: new RegExp(`^${escaped(textOn('@of')).replace('@of', OPERAND)}$`),
  mix: new RegExp(
    String.raw`^color-mix\(in ([\w-]+), ${OPERAND} ${NUMBER}%, ${OPERAND}\)$`
  ),
  adjust: new RegExp(
    String.raw`^oklch\(from ${OPERAND} (l|calc\(l [+-] \d*\.?\d+\)) (c|calc\(c \* \d*\.?\d+\)) (h|calc\(h [+-] \d*\.?\d+\))(?: / calc\(alpha \* (\d*\.?\d+)\))?\)$`
  ),
  scale: new RegExp(String.raw`^calc\(${OPERAND} ([*/]) ${NUMBER}\)$`),
  number: /^-?\d*\.?\d+$/,
  length: /^-?\d*\.?\d+(px|rem|em|%|vw|vh|ch|pt)?$/i,
  hexOrName:
    /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl|oklch|oklab|lab|lch|hwb)a?\([^()]*\))$/i,
}

// `calc(l + 0.1)` → 0.1; `l` → 0
const delta = (term: string): number => {
  const match = /([+-]) (\d*\.?\d+)/.exec(term)
  return match ? Number(match[2]) * (match[1] === '-' ? -1 : 1) : 0
}
const factor = (term: string): number => {
  const match = /\* (\d*\.?\d+)/.exec(term)
  return match ? Number(match[1]) : 1
}

/** What a value is, for a kind. `''` is `auto`; anything unrecognised is an `expression`. */
export function parseCssValue(raw: string, kind: CssValueKind): CssValueForm {
  const value = raw.trim()
  if (!value) return { form: 'auto' }
  const forms = CSS_VALUE_FORMS[kind]
  if (patterns.ref.test(value)) return { form: 'ref', of: value }
  if (kind === 'color') {
    if (/^currentcolor$/i.test(value)) return { form: 'current' }
    let match = patterns.contrast.exec(value)
    if (match) return { form: 'contrast', of: match[1] }
    match = patterns.mix.exec(value)
    if (match)
      return {
        form: 'mix',
        space: match[1],
        a: match[2],
        amount: Number(match[3]),
        b: match[4],
      }
    match = patterns.adjust.exec(value)
    if (match)
      return {
        form: 'adjust',
        of: match[1],
        lightness: round(delta(match[2]) * 100, 2),
        chroma: factor(match[3]),
        hue: delta(match[4]),
        alpha: match[5] === undefined ? 1 : Number(match[5]),
      }
    if (patterns.hexOrName.test(value)) return { form: 'literal', value }
  }
  if (forms.includes('scale')) {
    const match = patterns.scale.exec(value)
    // `/ 2` reads as `× 0.5`, and is written that way once edited.
    if (match && Number(match[3]) !== 0)
      return {
        form: 'scale',
        of: match[1],
        factor:
          match[2] === '/' ? round(1 / Number(match[3])) : Number(match[3]),
      }
  }
  if (kind === 'length' && patterns.length.test(value))
    return { form: 'literal', value }
  if (kind === 'number' && patterns.number.test(value))
    return { form: 'literal', value }
  if (kind === 'text' && !/var\(/.test(value)) return { form: 'literal', value }
  return { form: 'expression', value }
}

const signed = (channel: string, n: number) =>
  n ? `calc(${channel} ${n < 0 ? '-' : '+'} ${round(Math.abs(n))})` : channel

/** The CSS for a form; `''` for `auto`. */
export function formatCssValue(form: CssValueForm): string {
  switch (form.form) {
    case 'auto':
      return ''
    case 'literal':
    case 'expression':
      return form.value.trim()
    case 'ref':
      return form.of
    case 'current':
      return 'currentColor'
    case 'contrast':
      return textOn(form.of)
    case 'mix':
      return `color-mix(in ${form.space}, ${form.a} ${round(form.amount, 2)}%, ${form.b})`
    case 'adjust': {
      const { of, lightness, chroma, hue, alpha } = form
      if (!lightness && chroma === 1 && !hue && alpha === 1) return of
      const c = chroma === 1 ? 'c' : `calc(c * ${round(chroma)})`
      const a = alpha === 1 ? '' : ` / calc(alpha * ${round(alpha)})`
      return `oklch(from ${of} ${signed('l', lightness / 100)} ${c} ${signed('h', hue)}${a})`
    }
    case 'scale':
      return form.factor === 1
        ? form.of
        : `calc(${form.of} * ${round(form.factor)})`
  }
}

/** A form's starting values when it is picked, from what the value was. */
export function startForm(
  name: CssFormName,
  previous: CssValueForm,
  { literal, operand }: { literal: string; operand: CssOperand }
): CssValueForm {
  const of =
    'of' in previous ? previous.of : 'a' in previous ? previous.a : operand
  switch (name) {
    case 'auto':
      return { form: 'auto' }
    case 'literal':
      return { form: 'literal', value: literal }
    case 'ref':
      return { form: 'ref', of }
    case 'current':
      return { form: 'current' }
    case 'contrast':
      return { form: 'contrast', of }
    case 'mix':
      return { form: 'mix', a: of, b: 'white', amount: 50, space: 'oklab' }
    case 'adjust':
      return { form: 'adjust', of, lightness: 0, chroma: 1, hue: 0, alpha: 1 }
    case 'scale':
      return { form: 'scale', of, factor: 1 }
    case 'expression':
      return {
        form: 'expression',
        value: formatCssValue(previous) || literal,
      }
  }
}

/** `var(--brand-color)` → `brand-color`; null for a keyword or literal. */
export const operandName = (operand: CssOperand): string | null =>
  /^var\(--([\w-]+)\)$/.exec(operand)?.[1] ?? null
