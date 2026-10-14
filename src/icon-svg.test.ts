import { test, expect, afterEach } from 'bun:test'
import { iconSvg, iconNames } from './icon-svg.js'
import iconData from './icon-data.js'
import { iconRules } from './icon-rules.js'

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

// Stand-in icons go straight into the data (no DOM needed) and are removed after each test,
// so a later test that walks iconNames() never meets a deliberate cycle.
const data = iconData as Record<string, string>
const added: string[] = []
function define(icons: Record<string, string>): void {
  Object.assign(data, icons)
  added.push(...Object.keys(icons))
}
afterEach(() => {
  for (const name of added.splice(0)) delete data[name]
})

test('every registered built-in icon resolves to markup', () => {
  const names = iconNames()
  expect(names.length).toBeGreaterThan(100)
  const unresolved = names.filter((n) => !iconSvg(n)?.startsWith('<svg'))
  expect(unresolved).toEqual([])
  // Every built-in redirect that rotates or flips (they all returned undefined before).
  const transformed = names.filter((n) => iconSvg(n)!.includes('<g transform='))
  expect(transformed).toContain('chevronDown')
  expect(transformed.length).toBe(27)
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

test('suffixes read the same as the DOM renderer: `_` after a digit is a separator', () => {
  define({ testSvgEdit: 'edit2_90r', testSvgEditBack: 'edit2__90r' })
  expect(iconSvg('testSvgEdit')).toContain(' rotate(90) ')
  expect(iconSvg('testSvgEditBack')).toContain(' rotate(-90) ')
  // `edit20f` is not edit2 flipped: the renderer needs `edit2_0f` for that.
  expect(iconSvg('edit20f')).toBeUndefined()
  expect(iconSvg('edit2_0f')).toContain('scale(-1 1)')
})

test('a rotation or flip written inline resolves like the redirect that spells it', () => {
  expect(iconSvg('chevronRight90r')).toBe(iconSvg('chevronDown'))
})

test('what the renderer would draw but iconSvg cannot, throws, saying why', () => {
  define({
    testSvgStack: 'spin120Loader40s_30x$cloud',
    testSvgRule: 'unLock',
    testSvgFaded: 'check50o',
    testSvgTypo: 'chevronDwon',
    testSvgPingA: 'testSvgPingB',
    testSvgPingB: 'testSvgPingA',
  })
  expect(() => iconSvg('testSvgStack')).toThrow(
    'iconSvg("testSvgStack"): it resolves to "spin120Loader40s_30x$cloud"'
  )
  expect(() => iconSvg('testSvgRule')).toThrow('icons.testSvgRule()')
  expect(() => iconSvg('testSvgFaded')).toThrow('"check50o"')
  expect(() => iconSvg('testSvgTypo')).toThrow(
    'redirects to "chevronDwon", which is not a registered icon'
  )
  expect(() => iconSvg('testSvgPingA')).toThrow('redirects in a cycle')
  // Written inline, not just behind a name.
  for (const inline of [
    'tosi$hat',
    'spin90Loader',
    'unLock',
    'chevronRight50o',
  ]) {
    expect(() => iconSvg(inline)).toThrow(`icons.${inline}()`)
  }
  // Nothing would draw these.
  expect(iconSvg('nonsense')).toBeUndefined()
  expect(iconSvg('notAnIcon')).toBeUndefined()
})

test('a name that only looks like a rule is unknown, not an error', () => {
  // A capital letter followed by an icon's name is not a rule: the renderer draws these
  // as the placeholder, so iconSvg answers undefined, as it does for any unknown name.
  for (const lookalike of [
    'redLock',
    'fooCheck',
    'chevronDownX',
    'myCloud',
    'spinLoader',
  ]) {
    expect(iconSvg(lookalike)).toBeUndefined()
  }
})

test('a rule an app adds is a rule to iconSvg too', () => {
  iconRules.push({ prefix: 'testRule', apply: (base) => `${base}$check` })
  try {
    expect(() => iconSvg('testRuleLock')).toThrow('icons.testRuleLock()')
  } finally {
    iconRules.pop()
  }
  expect(iconSvg('testRuleLock')).toBeUndefined()
})

test('a redirect to a name with the trailing-underscore escape resolves', () => {
  define({ testSvgEscaped: 'edit2_' })
  expect(iconSvg('testSvgEscaped')).toBe(iconSvg('edit2'))
})

test('tolerates the trailing-underscore escape used by the icon proxy', () => {
  expect(iconSvg('tosiPlatform_')).toBe(iconSvg('tosiPlatform'))
})

test('iconNames is sorted and includes well-known icons', () => {
  const names = iconNames()
  expect([...names].sort()).toEqual(names)
  expect(names).toContain('tosiPlatform')
})
