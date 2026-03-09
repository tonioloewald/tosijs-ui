import { test, expect, describe } from 'bun:test'
import {
  matchShortcut,
  keycode,
  keystroke,
  parseShortcut,
  canonicalShortcut,
  displayShortcut,
} from './match-shortcut'

const evt = (
  key: string,
  mods: {
    ctrl?: boolean
    meta?: boolean
    alt?: boolean
    shift?: boolean
    code?: string
  } = {},
) => ({
  key,
  code: mods.code,
  ctrlKey: mods.ctrl ?? false,
  metaKey: mods.meta ?? false,
  altKey: mods.alt ?? false,
  shiftKey: mods.shift ?? false,
})

describe('matchShortcut', () => {
  test('simple shortcuts', () => {
    expect(matchShortcut(evt('x'), 'X')).toBe(true)
    expect(matchShortcut(evt('x'), 'x')).toBe(true)
    expect(matchShortcut(evt('x'), 'y')).toBe(false)
  })

  test('ctrl keys', () => {
    expect(matchShortcut(evt('x', { ctrl: true }), 'ctrl-x')).toBe(true)
    expect(matchShortcut(evt('x', { ctrl: true }), '^X')).toBe(true)
    expect(matchShortcut(evt('x', { ctrl: true }), 'x')).toBe(false)
    expect(matchShortcut(evt('x'), '^X')).toBe(false)
    expect(matchShortcut(evt('x', { meta: true }), 'ctrl-x')).toBe(false)
  })

  test('meta keys', () => {
    expect(matchShortcut(evt('x', { meta: true }), 'meta-x')).toBe(true)
    expect(matchShortcut(evt('x', { meta: true }), '⌘-X')).toBe(true)
    expect(matchShortcut(evt('x', { meta: true }), 'x')).toBe(false)
    expect(matchShortcut(evt('x'), '⌘-X')).toBe(false)
    expect(matchShortcut(evt('x', { ctrl: true }), 'meta-x')).toBe(false)
  })

  test('alt keys', () => {
    expect(matchShortcut(evt('x', { alt: true }), '⌥x')).toBe(true)
    expect(matchShortcut(evt('x', { alt: true }), 'alt-X')).toBe(true)
    expect(matchShortcut(evt('x', { alt: true }), '⎇-x')).toBe(true)
    expect(matchShortcut(evt('x', { alt: true }), 'option-X')).toBe(true)
    expect(matchShortcut(evt('x', { alt: true }), 'x')).toBe(false)
    expect(matchShortcut(evt('x'), 'option-X')).toBe(false)
    expect(matchShortcut(evt('x', { ctrl: true }), '⎇x')).toBe(false)
  })

  test('shift keys', () => {
    expect(matchShortcut(evt('x', { shift: true }), '⇧x')).toBe(true)
    expect(matchShortcut(evt('x', { shift: true }), 'shift-X')).toBe(true)
    expect(matchShortcut(evt('x', { shift: true }), 'x')).toBe(false)
  })

  test('chorded modifiers', () => {
    expect(
      matchShortcut(evt('x', { meta: true, alt: true }), '⌘⌥x'),
    ).toBe(true)
    expect(matchShortcut(evt('x', { meta: true }), '⌘⌥x')).toBe(false)
    expect(matchShortcut(evt('x', { meta: true }), 'alt-meta-x')).toBe(false)
    expect(matchShortcut(evt('x', { alt: true }), '⌘⌥x')).toBe(false)
    expect(
      matchShortcut(evt('x', { shift: true, alt: true }), '⌘⌥x'),
    ).toBe(false)
  })

  test('multi-character key names', () => {
    expect(
      matchShortcut(
        { key: 'Escape', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false },
        'Escape',
      ),
    ).toBe(true)
    expect(
      matchShortcut(
        { key: 'Enter', ctrlKey: false, metaKey: true, altKey: false, shiftKey: false },
        '⌘Enter',
      ),
    ).toBe(true)
  })
})

describe('keycode', () => {
  test('strips Key prefix from event.code', () => {
    expect(keycode(evt('a', { code: 'KeyA' }))).toBe('A')
    expect(keycode(evt('z', { code: 'KeyZ' }))).toBe('Z')
  })

  test('strips Digit prefix from event.code', () => {
    expect(keycode(evt('5', { code: 'Digit5' }))).toBe('5')
  })

  test('passes through other codes', () => {
    expect(keycode(evt(' ', { code: 'Space' }))).toBe('Space')
    expect(keycode(evt('Enter', { code: 'Enter' }))).toBe('Enter')
    expect(keycode(evt('Escape', { code: 'Escape' }))).toBe('Escape')
  })

  test('falls back to event.key when no code', () => {
    expect(keycode(evt('a'))).toBe('a')
    expect(keycode(evt('Enter'))).toBe('Enter')
  })
})

describe('keystroke', () => {
  test('simple key', () => {
    expect(keystroke(evt('a', { code: 'KeyA' }))).toBe('A')
  })

  test('modifiers in alphabetical order', () => {
    expect(keystroke(evt('a', { code: 'KeyA', alt: true, ctrl: true }))).toBe(
      'alt-ctrl-A',
    )
    expect(
      keystroke(evt('a', { code: 'KeyA', meta: true, shift: true })),
    ).toBe('meta-shift-A')
    expect(
      keystroke(
        evt('a', { code: 'KeyA', alt: true, ctrl: true, meta: true, shift: true }),
      ),
    ).toBe('alt-ctrl-meta-shift-A')
  })
})

describe('parseShortcut', () => {
  test('parses symbol modifiers', () => {
    const parsed = parseShortcut('⌘⇧L')
    expect(parsed.metaKey).toBe(true)
    expect(parsed.shiftKey).toBe(true)
    expect(parsed.key).toBe('l')
  })

  test('parses text modifiers', () => {
    const parsed = parseShortcut('ctrl-alt-x')
    expect(parsed.ctrlKey).toBe(true)
    expect(parsed.altKey).toBe(true)
    expect(parsed.key).toBe('x')
  })

  test('parses caret for ctrl', () => {
    const parsed = parseShortcut('^F')
    expect(parsed.ctrlKey).toBe(true)
    expect(parsed.key).toBe('f')
  })
})

describe('canonicalShortcut', () => {
  test('normalizes to alphabetical modifier order', () => {
    expect(canonicalShortcut('⌘⌥x')).toBe('alt-meta-x')
    expect(canonicalShortcut('ctrl-shift-a')).toBe('ctrl-shift-a')
    expect(canonicalShortcut('^L')).toBe('ctrl-l')
  })
})

describe('displayShortcut', () => {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '')

  test('display format', () => {
    if (isMac) {
      expect(displayShortcut('⌘X')).toBe('⌘X')
      expect(displayShortcut('ctrl-shift-a')).toBe('⌃⇧A')
      expect(displayShortcut('^L')).toBe('⌃L')
      expect(displayShortcut('⌘⇧L')).toBe('⇧⌘L')
    } else {
      expect(displayShortcut('⌘X')).toBe('Meta+X')
      expect(displayShortcut('ctrl-shift-a')).toBe('Ctrl+Shift+A')
      expect(displayShortcut('^L')).toBe('Ctrl+L')
      expect(displayShortcut('⌘⇧L')).toBe('Shift+Meta+L')
    }
  })
})
