import { test, expect } from 'bun:test'
import { Color } from 'tosijs'
import {
  applyThemeFonts,
  componentThemeGenerator,
  highContrastBase,
  invertedColors,
  parseFontImport,
  deriveTheme,
  resolveTheme,
  ruleValues,
  THEME_MODE_SPECS,
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
    modes: {
      light: { 'tosi-accent-text': '#ffff00' },
      dark: { 'tosi-bg': '#101820' },
    },
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
    { base: {}, modes: { light: { 'tosi-bg': '#ffeedd' } } },
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
    { base: {}, modes: { light: { 'tosi-font-family': 'Georgia, serif' } } },
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
  // An id's weight, so the theme beats the page's own declarations wherever they sit.
  expect(sheet).toEqual({
    ':root:not(#tosi-theme-outrank)': { _tosiAccent: '#123456' },
    'body.night:not(#tosi-theme-outrank)': { _tosiBg: '#000000' },
  })
})

test('a theme can declare modes of its own, derived from the page CSS roots', () => {
  const page = {
    light: {
      tint: '#ffffff',
      accent: '#3355dd',
      surface: 'color-mix(in srgb, var(--tint) 20%, transparent)',
      backdrop: 'linear-gradient(160deg, #6087ba, #b7cdea)',
      radius: '16px',
    },
  }
  const modes = [
    THEME_MODE_SPECS[0],
    { name: 'mono', selector: '.mono', derive: ['monochrome' as const] },
    {
      name: 'tinted',
      selector: '.tinted',
      derive: [{ tint: '#ff0000', amount: 1 }],
    },
    { name: 'night', selector: '.night', derive: ['invert' as const] },
  ]
  const full = deriveTheme({}, null, { modes, page })
  // A grey stays grey; a gradient's stops are transformed; an expression is left to the browser.
  const { h, s } = Color.fromCss(full.mono.accent)._hsl
  expect(s).toBe(0)
  expect(full.mono.backdrop).not.toBe(page.light.backdrop)
  expect(full.mono.surface).toBe(page.light.surface)
  expect(full.mono.radius).toBe('16px')
  expect(Math.round(Color.fromCss(full.tinted.accent)._hsl.h)).toBe(0)
  expect(h).toBeDefined()
  expect(Color.fromCss(full.night.tint).brightness).toBeLessThan(0.1)

  // Written: only the roots that change, and the tuned values; light writes only what was tuned.
  const written = resolveTheme(
    { modes: { light: { radius: '8px' }, night: { accent: '#ffcc00' } } },
    null,
    { modes, page }
  )
  expect(written.light).toEqual({ radius: '8px' })
  expect(written.night.accent).toBe('#ffcc00')
  expect(written.night.surface).toBeUndefined()
  expect(Object.keys(written.mono).sort()).toEqual(
    ['accent', 'backdrop', 'tint'].sort()
  )
})

test("a mode the page's CSS declares is the page's own, not derived", () => {
  const page = {
    light: { primary: '#6750a4', shadow: '#000000' },
    dark: { primary: '#d0bcff' },
  }
  const written = resolveTheme({}, null, { page })
  // Dark writes only what the page itself shows there (since high contrast writes those).
  expect(written.dark).toEqual({ primary: '#d0bcff', shadow: '#000000' })
  // A mode it does not declare is derived.
  expect(written.highContrast.primary).toBeDefined()
})

test('a mode made from an undeclared mode is an error, not a silent light copy', () => {
  expect(() =>
    deriveTheme({}, componentThemeGenerator, {
      modes: [THEME_MODE_SPECS[0], { name: 'x', selector: '.x', from: 'nope' }],
    })
  ).toThrow('"nope"')
})

test('parseFontImport takes what Google Fonts offers to copy, and refuses other hosts', () => {
  const url =
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans&display=swap'
  for (const pasted of [
    url,
    `<link href="${url.replace(/&/g, '&amp;')}" rel="stylesheet">`,
    `@import url('${url}');`,
  ]) {
    const parsed = parseFontImport(pasted)
    expect(parsed).toEqual({ url, families: ['Roboto', 'Open Sans'] })
  }
  expect(
    'error' in parseFontImport('https://evil.example/x.css?family=A')
  ).toBe(true)
  expect('error' in parseFontImport('https://fonts.googleapis.com/css2')).toBe(
    true
  )
  expect('error' in parseFontImport('not a url')).toBe(true)
})

test('applyThemeFonts links the theme fonts and unlinks the ones it drops', () => {
  const a = 'https://fonts.googleapis.com/css2?family=Roboto'
  const b = 'https://fonts.bunny.net/css?family=lora'
  applyThemeFonts([a, b, 'https://evil.example/x.css?family=A'])
  const hrefs = () =>
    [...document.querySelectorAll('link[data-tosi-theme-font]')].map(
      (l) => (l as HTMLLinkElement).href
    )
  expect(hrefs()).toEqual([a, b])
  applyThemeFonts([b])
  expect(hrefs()).toEqual([b])
  applyThemeFonts([])
})
