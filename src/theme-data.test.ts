import { test, expect } from 'bun:test'
import { Color } from 'tosijs'
import {
  componentThemeGenerator,
  highContrastBase,
  invertedColors,
  resolveTheme,
  ruleValues,
  themeStyleSheet,
} from './theme-data.js'
import { contrastRatio } from './theme.js'

test('ruleValues reads custom properties by variable name, as strings', () => {
  expect(
    ruleValues({
      _tosiAccent: Color.fromCss('#ff0000'),
      _h1Scale: '2',
      padding: '4px',
    } as any)
  ).toEqual({ 'tosi-accent': '#ff0000', 'h1-scale': '2' })
})

test('invertedColors inverts colours and leaves other values out', () => {
  const inverted = invertedColors({
    background: '#ffffff',
    'font-family': 'serif',
    spacing: '10px',
  })
  expect(Object.keys(inverted)).toEqual(['background'])
  expect(Color.fromCss(inverted.background).brightness).toBeLessThan(0.1)
})

test('the base generates every mode, and the defaults fill a partial base', () => {
  const resolved = resolveTheme(
    { base: { accent: '#0064d2' } },
    componentThemeGenerator
  )
  expect(resolved.light['tosi-accent']).toBe('#0064d2')
  expect(resolved.light['tosi-bg']).toBe('#fafafa')
  expect(Color.fromCss(resolved.dark['tosi-bg']).brightness).toBeLessThan(0.1)
})

test('a hand-tuned value wins, and survives a change to the base', () => {
  const data = {
    base: { accent: '#0064d2' },
    light: { 'tosi-accent-text': '#ffff00' },
    dark: { 'tosi-bg': '#101820' },
  }
  const before = resolveTheme(data, componentThemeGenerator)
  expect(before.light['tosi-accent-text']).toBe('#ffff00')
  expect(before.dark['tosi-bg']).toBe('#101820')

  const after = resolveTheme(
    { ...data, base: { accent: '#008000' } },
    componentThemeGenerator
  )
  expect(after.light['tosi-accent']).toBe('#008000')
  expect(after.light['tosi-accent-text']).toBe('#ffff00')
  expect(after.dark['tosi-bg']).toBe('#101820')
})

test('dark mode is generated from the light values, hand-tuned ones included', () => {
  const resolved = resolveTheme(
    { base: {}, light: { 'tosi-bg': '#ffeedd' } },
    componentThemeGenerator
  )
  const inverted = invertedColors({ bg: '#ffeedd' }).bg
  expect(resolved.dark['tosi-bg']).toBe(inverted)
})

test('high contrast reaches 7:1 for the accent on a white background', () => {
  const base = highContrastBase({
    accent: '#ff88cc',
    background: '#fafafa',
    text: '#444444',
  })
  expect(base.background).toBe('#ffffff')
  expect(base.text).toBe('#000000')
  expect(
    contrastRatio(Color.fromCss(base.accent), Color.fromCss('#ffffff'))
  ).toBeGreaterThanOrEqual(7)
})

test('modes other than light carry only what differs from light', () => {
  const resolved = resolveTheme(
    { base: {}, light: { 'tosi-font-family': 'Georgia, serif' } },
    componentThemeGenerator
  )
  expect(resolved.highContrast['tosi-font-family']).toBeUndefined()
  expect(resolved.highContrast['tosi-text']).toBe('#000000')
  expect(resolved.darkHighContrast['tosi-font-family']).toBeUndefined()
})

test('themeStyleSheet writes each mode under its selector, and skips empty modes', () => {
  const sheet = themeStyleSheet(
    {
      light: { 'tosi-accent': '#123456' },
      dark: { 'tosi-bg': '#000000' },
      highContrast: {},
      darkHighContrast: {},
    },
    { dark: 'body.night' }
  )
  expect(sheet).toEqual({
    ':root': { _tosiAccent: '#123456' },
    'body.night': { _tosiBg: '#000000' },
  })
})
