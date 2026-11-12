import { test, expect, describe } from 'bun:test'
import {
  formatCssValue,
  parseCssValue,
  startForm,
  type CssValueForm,
  type CssValueKind,
} from './css-value-forms'

const roundTrips: [CssValueKind, CssValueForm, string][] = [
  ['color', { form: 'auto' }, ''],
  ['color', { form: 'literal', value: '#3355dd' }, '#3355dd'],
  ['color', { form: 'ref', of: 'var(--brand-color)' }, 'var(--brand-color)'],
  ['color', { form: 'current' }, 'currentColor'],
  [
    'color',
    { form: 'contrast', of: 'var(--brand-color)' },
    'oklch(from var(--brand-color) clamp(0, (0.62 - l) * 1000, 1) 0 0)',
  ],
  [
    'color',
    {
      form: 'mix',
      a: 'var(--brand-color)',
      b: 'transparent',
      amount: 12,
      space: 'srgb',
    },
    'color-mix(in srgb, var(--brand-color) 12%, transparent)',
  ],
  [
    'color',
    {
      form: 'adjust',
      of: 'var(--background)',
      lightness: -8,
      chroma: 1.2,
      hue: 30,
      alpha: 0.5,
    },
    'oklch(from var(--background) calc(l - 0.08) calc(c * 1.2) calc(h + 30) / calc(alpha * 0.5))',
  ],
  [
    'color',
    {
      form: 'adjust',
      of: 'var(--background)',
      lightness: 10,
      chroma: 1,
      hue: 0,
      alpha: 1,
    },
    'oklch(from var(--background) calc(l + 0.1) c h)',
  ],
  [
    'length',
    { form: 'scale', of: 'var(--tosi-radius)', factor: 1.6 },
    'calc(var(--tosi-radius) * 1.6)',
  ],
  ['length', { form: 'literal', value: '12px' }, '12px'],
  ['number', { form: 'literal', value: '1.5' }, '1.5'],
  [
    'length',
    { form: 'expression', value: 'calc(var(--a) + 2px)' },
    'calc(var(--a) + 2px)',
  ],
]

describe('css value forms', () => {
  for (const [kind, form, css] of roundTrips) {
    test(`${kind} ${form.form}: ${css || '(auto)'}`, () => {
      expect(formatCssValue(form)).toBe(css)
      expect(parseCssValue(css, kind)).toEqual(form)
    })
  }

  test('an identity adjustment or scale is just the operand', () => {
    expect(
      formatCssValue({
        form: 'adjust',
        of: 'var(--x)',
        lightness: 0,
        chroma: 1,
        hue: 0,
        alpha: 1,
      })
    ).toBe('var(--x)')
    expect(formatCssValue({ form: 'scale', of: 'var(--x)', factor: 1 })).toBe(
      'var(--x)'
    )
  })

  test('a division reads as a scale', () => {
    expect(parseCssValue('calc(var(--h) / 2)', 'length')).toEqual({
      form: 'scale',
      of: 'var(--h)',
      factor: 0.5,
    })
  })

  test('what it does not recognise is kept as an expression', () => {
    const css = 'color-mix(in srgb, red, blue 30%)'
    expect(parseCssValue(css, 'color')).toEqual({
      form: 'expression',
      value: css,
    })
  })

  test('picking a form keeps the colour it was made from', () => {
    const was = parseCssValue('var(--brand-color)', 'color')
    expect(
      startForm('adjust', was, { literal: '#000000', operand: 'var(--x)' })
    ).toEqual({
      form: 'adjust',
      of: 'var(--brand-color)',
      lightness: 0,
      chroma: 1,
      hue: 0,
      alpha: 1,
    })
    expect(
      startForm('literal', was, { literal: '#d92270', operand: 'var(--x)' })
    ).toEqual({ form: 'literal', value: '#d92270' })
  })
})
