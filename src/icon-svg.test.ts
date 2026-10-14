import { test, expect } from 'bun:test'
import { iconSvg, iconNames } from './icon-svg.js'
import { defineIcons } from './icons.js'

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

test('every registered built-in icon resolves to markup', () => {
  // Some entries are aliases: the value is another icon's NAME, and 28 of those rotate or
  // flip it (`chevronDown` is `chevronRight90r`). All of them used to return undefined.
  const names = iconNames()
  expect(names.length).toBeGreaterThan(100)
  const unresolved = names.filter((n) => !iconSvg(n)?.startsWith('<svg'))
  expect(unresolved).toEqual([])
})

test('a rotated or flipped redirect is its target, transformed about the centre', () => {
  const right = iconSvg('chevronRight')!
  const down = iconSvg('chevronDown')!
  expect(down).toContain(
    '<g transform="translate(12 12) rotate(90) translate(-12 -12)">'
  )
  // The drawing inside the group is the target's, untouched.
  expect(down.replace(/<g transform="[^"]*">|<\/g>(?=<\/svg>)/g, '')).toBe(
    right
  )
  expect(iconSvg('cornerDownLeft')).toContain('scale(-1 1)')
  expect(iconSvg('thumbsDown')).toContain('scale(1 -1)')
})

test('a name that exists but is not one SVG throws, saying what it resolved to', () => {
  defineIcons({
    testSvgStack: 'spin120Loader40s_30x$cloud',
    testSvgRule: 'unLock',
    testSvgFaded: 'check50o',
    testSvgPingA: 'testSvgPingB',
    testSvgPingB: 'testSvgPingA',
  })
  expect(() => iconSvg('testSvgStack')).toThrow(
    'iconSvg("testSvgStack"): it resolves to "spin120Loader40s_30x$cloud"'
  )
  expect(() => iconSvg('testSvgRule')).toThrow('icons.testSvgRule()')
  expect(() => iconSvg('testSvgFaded')).toThrow('"check50o"')
  expect(() => iconSvg('testSvgPingA')).toThrow('redirects in a cycle')
})

test('tolerates the trailing-underscore escape used by the icon proxy', () => {
  expect(iconSvg('tosiPlatform_')).toBe(iconSvg('tosiPlatform'))
})

test('iconNames is sorted and includes well-known icons', () => {
  const names = iconNames()
  expect([...names].sort()).toEqual(names)
  expect(names).toContain('tosiPlatform')
})
