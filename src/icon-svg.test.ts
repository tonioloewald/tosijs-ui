import { test, expect } from 'bun:test'
import { iconSvg, iconNames } from './icon-svg'

// The point of this module is that it works with NO DOM — a build script, an ePub
// pass, a server-rendered template. `icons.ts` imports tosijs and throws on
// `HTMLElement` outside a browser, which is what sent this project to parsing
// src/icons/data/*.ts by hand to put its own logo on a generated page.

test('returns raw markup for a known icon', () => {
  const svg = iconSvg('tosiPlatform')
  expect(svg).toBeTruthy()
  expect(svg!.startsWith('<svg')).toBe(true)
})

test('returns undefined for an unknown icon rather than throwing', () => {
  expect(iconSvg('definitely-not-an-icon')).toBeUndefined()
})

test('follows redirect entries the way rendering does', () => {
  // Some entries are aliases: the value is another icon's NAME, not markup.
  const names = iconNames()
  expect(names.length).toBeGreaterThan(100)
  for (const n of names.slice(0, 200)) {
    const v = iconSvg(n)
    // Either resolvable to markup, or absent — never a bare alias string.
    if (v !== undefined) expect(v.startsWith('<')).toBe(true)
  }
})

test('tolerates the trailing-underscore escape used by the icon proxy', () => {
  expect(iconSvg('tosiPlatform_')).toBe(iconSvg('tosiPlatform'))
})

test('iconNames is sorted and includes well-known icons', () => {
  const names = iconNames()
  expect([...names].sort()).toEqual(names)
  expect(names).toContain('tosiPlatform')
})
