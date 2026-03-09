export interface KeyboardEventLike {
  key: string
  code?: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

const isMacOS =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || '')

export const modifierKeys: Record<string, string> = isMacOS
  ? { meta: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧', escape: '⎋' }
  : { meta: 'Meta', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', escape: 'Esc' }

export const keycode = (evt: KeyboardEventLike): string => {
  if (evt.code) {
    return evt.code.replace(/^Key|^Digit/, '')
  }
  return evt.key
}

export const keystroke = (evt: KeyboardEventLike): string => {
  const parts: string[] = []
  if (evt.altKey) parts.push('alt')
  if (evt.ctrlKey) parts.push('ctrl')
  if (evt.metaKey) parts.push('meta')
  if (evt.shiftKey) parts.push('shift')
  parts.push(keycode(evt))
  return parts.join('-')
}

interface ParsedShortcut {
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  key: string
}

const MODIFIER_PATTERNS: [RegExp, keyof ParsedShortcut][] = [
  [/\^|ctrl-?/i, 'ctrlKey'],
  [/⌘|meta-?/i, 'metaKey'],
  [/⌥|⎇|alt-?|option-?/i, 'altKey'],
  [/⇧|shift-?/i, 'shiftKey'],
]

export const parseShortcut = (shortcut: string): ParsedShortcut => {
  let remaining = shortcut.trim()
  const result: ParsedShortcut = {
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    key: '',
  }

  for (const [pattern, prop] of MODIFIER_PATTERNS) {
    if (pattern.test(remaining)) {
      ;(result as any)[prop] = true
      remaining = remaining.replace(pattern, '')
    }
  }

  // Strip any remaining hyphens from between modifiers and key
  remaining = remaining.replace(/^-+/, '')
  result.key = remaining.toLowerCase()

  return result
}

export const matchShortcut = (
  event: KeyboardEventLike,
  shortcut: string,
): boolean => {
  const parsed = parseShortcut(shortcut)

  return (
    event.key.toLowerCase() === parsed.key &&
    event.metaKey === parsed.metaKey &&
    event.ctrlKey === parsed.ctrlKey &&
    event.altKey === parsed.altKey &&
    event.shiftKey === parsed.shiftKey
  )
}

export const canonicalShortcut = (shortcut: string): string => {
  const parsed = parseShortcut(shortcut)
  const parts: string[] = []
  if (parsed.altKey) parts.push('alt')
  if (parsed.ctrlKey) parts.push('ctrl')
  if (parsed.metaKey) parts.push('meta')
  if (parsed.shiftKey) parts.push('shift')
  parts.push(parsed.key)
  return parts.join('-')
}

export const displayShortcut = (shortcut: string): string => {
  const parsed = parseShortcut(shortcut)
  if (isMacOS) {
    const parts: string[] = []
    if (parsed.ctrlKey) parts.push('⌃')
    if (parsed.altKey) parts.push('⌥')
    if (parsed.shiftKey) parts.push('⇧')
    if (parsed.metaKey) parts.push('⌘')
    parts.push(parsed.key.toUpperCase())
    return parts.join('')
  }
  const parts: string[] = []
  if (parsed.ctrlKey) parts.push('Ctrl')
  if (parsed.altKey) parts.push('Alt')
  if (parsed.shiftKey) parts.push('Shift')
  if (parsed.metaKey) parts.push('Meta')
  parts.push(parsed.key.toUpperCase())
  return parts.join('+')
}
