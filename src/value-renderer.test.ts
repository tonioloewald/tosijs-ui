import { describe, test, expect, beforeAll } from 'bun:test'
import { valueRenderer, parseValueType } from './value-renderer'
import { i18n } from './localize'

// Pin the locale so Intl output is deterministic across environments.
beforeAll(() => {
  i18n.locale.value = 'en-US'
})

const fmt = (type: string, value: unknown) =>
  valueRenderer(type).format(value) as string

describe('parseValueType', () => {
  test('bare, single-arg, and multi-arg forms', () => {
    expect(parseValueType('number')).toEqual({ base: 'number', args: [] })
    expect(parseValueType('fixed(2)')).toEqual({ base: 'fixed', args: ['2'] })
    expect(parseValueType('boolean(check, x)')).toEqual({
      base: 'boolean',
      args: ['check', 'x'],
    })
    expect(parseValueType('  Currency( EUR ) ')).toEqual({
      base: 'currency',
      args: ['EUR'],
    })
  })
})

describe('numeric formatters', () => {
  test('number groups by locale', () => {
    expect(fmt('number', 1234.5)).toBe('1,234.5')
  })
  test('currency defaults to USD; arg overrides', () => {
    expect(fmt('currency', 1234.5)).toContain('$')
    expect(fmt('currency', 1234.5)).toContain('1,234.50')
    expect(fmt('currency(EUR)', 1234.5)).toContain('1,234.50')
  })
  test('fixed defaults to 2 decimals; fixed(n) sets and rounds', () => {
    expect(fmt('fixed', 1.5)).toBe('1.50')
    expect(fmt('fixed(0)', 1.4)).toBe('1')
    expect(fmt('fixed(0)', 1.6)).toBe('2')
    expect(fmt('fixed(3)', 1.5)).toBe('1.500')
  })
  test('percent of a fraction; default 0 decimals, percent(n) sets precision', () => {
    expect(fmt('percent', 0.5)).toBe('50%')
    expect(fmt('percent', 0.1234)).toBe('12%')
    expect(fmt('percent(1)', 0.1234)).toBe('12.3%')
    expect(fmt('percent(2)', 0.5)).toBe('50.00%')
  })
  test('bytes(iec) uses binary units (÷1024)', () => {
    const nb = (s: string) => s.replace(/\u00a0/g, ' ')
    expect(nb(fmt('bytes(iec)', 1024))).toBe('1 KiB')
    expect(nb(fmt('bytes(iec)', 1048576))).toBe('1 MiB')
    expect(nb(fmt('bytes(iec)', 500))).toBe('500 B')
  })
  test('scientific and engineering notation', () => {
    expect(fmt('sci', 1234)).toContain('E3')
    // engineering keeps the exponent a multiple of 3
    expect(fmt('eng', 12345)).toContain('12.345')
    expect(fmt('eng', 12345)).toContain('E3')
  })
  test('bytes uses standardized SI units (÷1000)', () => {
    // The number↔unit gap is a non-breaking space (U+00A0) so the unit never wraps.
    const nb = (s: string) => s.replace(/\u00a0/g, ' ')
    expect(nb(fmt('bytes', 500))).toBe('500 B')
    expect(nb(fmt('bytes', 1500000))).toBe('1.5 MB')
    expect(nb(fmt('bytes', 0))).toBe('0 B')
    expect(nb(fmt('bytes', 2_000_000_000))).toBe('2 GB')
  })
  test('null / non-numeric render as empty string', () => {
    expect(fmt('currency', null)).toBe('')
    expect(fmt('number', undefined)).toBe('')
    expect(fmt('fixed', 'not a number')).toBe('')
  })
})

describe('numeric cells get -negative / -zero state classes', () => {
  const cell = () => document.createElement('span')
  test('toggles -negative below zero, -zero at zero, neither above', () => {
    const r = valueRenderer('currency(USD)')
    const neg = cell()
    r.toDOM(neg, -5)
    const zero = cell()
    r.toDOM(zero, 0)
    const pos = cell()
    r.toDOM(pos, 5)
    expect(neg.classList.contains('-negative')).toBe(true)
    expect(neg.classList.contains('-zero')).toBe(false)
    expect(zero.classList.contains('-zero')).toBe(true)
    expect(zero.classList.contains('-negative')).toBe(false)
    expect(pos.classList.contains('-negative')).toBe(false)
    expect(pos.classList.contains('-zero')).toBe(false)
  })
  test('bytes participates; re-render clears a stale class', () => {
    const r = valueRenderer('bytes')
    const el = cell()
    r.toDOM(el, -1024)
    expect(el.classList.contains('-negative')).toBe(true)
    r.toDOM(el, 2048) // now positive — the stale -negative must clear
    expect(el.classList.contains('-negative')).toBe(false)
  })
  test('non-numeric / null values carry no sign class', () => {
    const el = cell()
    valueRenderer('number').toDOM(el, null)
    expect(el.classList.contains('-negative')).toBe(false)
    expect(el.classList.contains('-zero')).toBe(false)
  })
})

describe('default alignment', () => {
  test('numerics right, boolean center, unknown undefined', () => {
    for (const t of ['number', 'currency', 'fixed', 'sci', 'eng', 'bytes'])
      expect(valueRenderer(t).align).toBe('right')
    expect(valueRenderer('boolean').align).toBe('center')
    expect(valueRenderer('whatever').align).toBeUndefined()
  })
})

describe('boolean renders icons via toDOM', () => {
  const cell = () => document.createElement('span')

  test('default shows an icon for both true and false', () => {
    const r = valueRenderer('boolean')
    const t = cell()
    r.toDOM(t, true)
    const f = cell()
    r.toDOM(f, false)
    expect(t.children.length).toBe(1) // checkSquare
    expect(f.children.length).toBe(1) // square
  })

  test('boolean(t) shows the icon only when true (blank when false)', () => {
    const r = valueRenderer('boolean(check)')
    const t = cell()
    r.toDOM(t, true)
    const f = cell()
    r.toDOM(f, false)
    expect(t.children.length).toBe(1)
    expect(f.children.length).toBe(0) // blank
  })

  test('toDOM replaces prior content (no accumulation across renders)', () => {
    const r = valueRenderer('boolean')
    const el = cell()
    r.toDOM(el, true)
    r.toDOM(el, false)
    r.toDOM(el, true)
    expect(el.children.length).toBe(1)
  })
})
