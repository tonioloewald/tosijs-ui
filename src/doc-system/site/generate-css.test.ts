import { test, expect } from 'bun:test'
import { themeFileCss } from './generate-css.js'

test('a saved theme becomes CSS after the stock sheet, starting from the site theme', () => {
  const output = themeFileCss(
    { base: { accent: '#0b7a5c' }, light: { spacing: '12px' } },
    { background: '#ffffee' }
  )
  expect(output).toContain('--brand-color: #0b7a5c')
  expect(output).toContain('--background: #ffffee')
  expect(output).toContain('--spacing: 12px')
  expect(output).toContain('.darkmode {')
})
