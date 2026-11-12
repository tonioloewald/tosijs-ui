import { test, expect } from 'bun:test'
import { css } from 'tosijs'
import { themeFileCss } from './generate-css.js'
import { DOC_THEME_PRESETS, presetStyleSheet } from '../theme-presets.js'

test('a saved theme becomes CSS after the stock sheet, starting from the site theme', () => {
  const output = themeFileCss(
    { base: { accent: '#0b7a5c' }, modes: { light: { spacing: '12px' } } },
    { background: '#ffffee' }
  )
  expect(output).toContain('--brand-color: #0b7a5c')
  expect(output).toContain('--background: #ffffee')
  expect(output).toContain('--spacing: 12px')
  expect(output).toContain('.darkmode:not(#tosi-theme-outrank) {')
})

test('each preset is scoped to its class, in every mode, and Original writes nothing', () => {
  const output = css(presetStyleSheet(DOC_THEME_PRESETS, { accent: '#0b7a5c' }))
  for (const name of ['glass', 'material']) {
    expect(output).toContain(`.tosi-style-${name}:not(#tosi-theme-outrank) {`)
    expect(output).toContain(
      `.darkmode.tosi-style-${name}:not(#tosi-theme-outrank) {`
    )
    expect(output).toContain(
      `.darkmode.high-contrast.tosi-style-${name}:not(#tosi-theme-outrank) {`
    )
  }
  expect(output).not.toContain('tosi-style-original')
  // A preset's own base wins over the site's.
  expect(output).toContain('--brand-color: #6750a4')
  expect(output).toContain('--tosi-surface-filter: blur(16px) saturate(1.4)')
})
