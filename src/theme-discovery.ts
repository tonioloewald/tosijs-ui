/*
Find the CSS custom properties a theme is made of, in the page's own stylesheets.

The editor is not tied to one design system: it edits the variables it is handed, as a list or
as a pattern (`'sf-*'`, `'md-sys-*'`, `'tosi-*'`), and a pattern is answered from the CSS the
page already has. Each match comes back with:

- the value declared for each mode, by matching each rule's selector against the mode
  selectors (`:root`, `.darkmode`, … or the caller's own);
- its PARENTS, the variables its value refers to (`var(--sf-accent)`), which is the chain an
  edit flows down: override a parent and everything derived from it follows, because the
  browser does the deriving;
- its kind, inferred from what the value resolves to, so it gets the right control.

What it cannot see: a stylesheet from another origin (the browser refuses to let script read
its rules) and styles inside a shadow root. Hand the editor a list for those.
*/

import type {
  ThemeKind,
  ThemeMode,
  ThemeValues,
  ThemeVariable,
} from './theme-data.js'

export interface DiscoveredVariable extends ThemeVariable {
  /** the declared value per mode, as written (`color-mix(in oklab, var(--x) 20%, white)`) */
  declared: Record<ThemeMode, string>
  /** the variables its value refers to, in any mode */
  parents: string[]
}

/** `'md-sys-*'` → a test for variable names (without dashes); a RegExp is used as is. */
export function namePattern(
  pattern: string | RegExp
): (name: string) => boolean {
  if (pattern instanceof RegExp) return (name) => pattern.test(name)
  const source = pattern
    .replace(/^--/, '')
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  const regex = new RegExp(`^${source}$`)
  return (name) => regex.test(name)
}

/** The variables a value refers to: `var(--a, var(--b))` → `['a', 'b']`. */
export function parentsOf(value: string): string[] {
  return [...value.matchAll(/var\(\s*--([\w-]+)/g)].map((match) => match[1])
}

const supports = (property: string, value: string): boolean =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports(property, value)

/**
 * The kind of control a value wants, from what it resolves to (variables substituted). The
 * name breaks ties a value cannot: `400` is a number, and a font stack is any text.
 */
export function inferKind(name: string, resolved: string): ThemeKind {
  const value = resolved.trim()
  if (/^-?\d*\.?\d+$/.test(value)) return 'number'
  if (supports('color', value)) return 'color'
  if (/font|typeface|family/.test(name) && !/size|weight|height/.test(name))
    return 'font-family'
  if (supports('width', value)) return 'length'
  if (/shadow|elevation/.test(name) && supports('box-shadow', value))
    return 'shadow'
  if (supports('background-image', value) && /gradient|url\(/.test(value))
    return 'image'
  return 'text'
}

const rulesOf = (sheet: CSSStyleSheet): CSSRule[] => {
  try {
    return [...sheet.cssRules]
  } catch {
    // Another origin's stylesheet: the browser will not let script read it.
    return []
  }
}

/** Every style rule, including those inside @media, @layer and @supports blocks. */
function* styleRules(rules: Iterable<CSSRule>): Generator<CSSStyleRule> {
  for (const rule of rules) {
    if ('selectorText' in rule) yield rule as CSSStyleRule
    if ('cssRules' in rule) {
      yield* styleRules((rule as CSSGroupingRule).cssRules)
    }
  }
}

const sameSelector = (a: string, b: string) =>
  a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim()

export interface DiscoverOptions {
  /** the mode selectors to read declarations under */
  selectors: Record<ThemeMode, string>
  /** the element whose computed style resolves values (for kinds) */
  scope?: Element
  /** a stylesheet owner to skip: the editor's own overrides are not the theme */
  exclude?: Node | null
  /** where to look; the document by default */
  root?: Document
}

/** The custom properties matching `pattern`, with their declarations, parents and kinds. */
export function discoverThemeVariables(
  pattern: string | RegExp,
  { selectors, scope, exclude, root = document }: DiscoverOptions
): DiscoveredVariable[] {
  const matches = namePattern(pattern)
  const found = new Map<string, DiscoveredVariable>()
  const modes = Object.entries(selectors) as [ThemeMode, string][]
  for (const sheet of root.styleSheets) {
    if (exclude && sheet.ownerNode === exclude) continue
    for (const rule of styleRules(rulesOf(sheet))) {
      const parts = rule.selectorText.split(',')
      const mode = modes.find(([, selector]) =>
        parts.some((part) => sameSelector(part, selector))
      )?.[0]
      if (!mode) continue
      for (const property of rule.style) {
        if (!property.startsWith('--')) continue
        const name = property.slice(2)
        if (!matches(name)) continue
        const value = rule.style.getPropertyValue(property).trim()
        const variable = found.get(name) ?? {
          name,
          kind: 'text' as ThemeKind,
          declared: {},
          parents: [],
        }
        variable.declared[mode] = value
        for (const parent of parentsOf(value)) {
          if (!variable.parents.includes(parent)) variable.parents.push(parent)
        }
        found.set(name, variable)
      }
    }
  }
  const element =
    scope ??
    root.querySelector(Object.values(selectors)[0] ?? ':root') ??
    root.documentElement
  const computed = getComputedStyle(element)
  for (const variable of found.values()) {
    const resolved =
      computed.getPropertyValue(`--${variable.name}`).trim() ||
      variable.declared.light ||
      Object.values(variable.declared)[0] ||
      ''
    variable.kind = inferKind(variable.name, resolved)
  }
  return [...found.values()]
}

/** What the page declares in each mode, by mode: the `page` a theme with no generator needs. */
export function declaredValues(
  variables: DiscoveredVariable[]
): Record<ThemeMode, ThemeValues> {
  const page: Record<ThemeMode, ThemeValues> = {}
  for (const { name, declared } of variables) {
    for (const [mode, value] of Object.entries(declared)) {
      ;(page[mode] ??= {})[name] = value
    }
  }
  return page
}

let canvas: CanvasRenderingContext2D | null | undefined

/**
 * What a colour value comes to inside `scope`, as `#rrggbb` (or `#rrggbbaa` when translucent):
 * variables substituted, `color-mix()` mixed, any colour space converted. Null where the
 * browser cannot tell (no canvas).
 */
export function resolveColor(scope: Element, value: string): string | null {
  const probe = document.createElement('span')
  probe.hidden = true
  probe.style.color = value
  scope.append(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  if (canvas === undefined) {
    canvas =
      typeof document.createElement('canvas').getContext === 'function'
        ? document.createElement('canvas').getContext('2d', {
            willReadFrequently: true,
          })
        : null
  }
  if (!canvas || !computed) return null
  // A canvas pixel converts whatever the browser computed (oklab, display-p3) to sRGB bytes.
  canvas.clearRect(0, 0, 1, 1)
  canvas.fillStyle = computed
  canvas.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = canvas.getImageData(0, 0, 1, 1).data
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 255 ? hex(a) : ''}`
}

/**
 * Headings and labels for discovered variables, from their names.
 *
 * The prefix (in words) that most of them share is dropped (`md-sys-` from Material's tokens,
 * `glass-`), then a variable is grouped under its next word when another shares it:
 * `md-sys-color-primary` → Color / primary. A variable alone in its family goes under General.
 */
export function groupVariables(
  names: string[]
): Map<string, { group: string; label: string }> {
  const split = names.map((name) => name.split('-'))
  // The longest shared prefix that most names have, leaving each at least one word.
  let prefix: string[] = []
  for (let depth = 1; ; depth++) {
    const counts = new Map<string, number>()
    for (const words of split) {
      if (words.length > depth) {
        const key = words.slice(0, depth).join('-')
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
    const [best, count] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
    if (!best || count < names.length * 0.75) break
    prefix = best.split('-')
  }
  const rest = (words: string[]) =>
    prefix.every((word, i) => words[i] === word)
      ? words.slice(prefix.length)
      : words
  const families = new Map<string, number>()
  for (const words of split) {
    const head = rest(words)[0]
    families.set(head, (families.get(head) ?? 0) + 1)
  }
  const result = new Map<string, { group: string; label: string }>()
  split.forEach((words, i) => {
    const tail = rest(words)
    const grouped = tail.length > 1 && (families.get(tail[0]) ?? 0) > 1
    result.set(names[i], {
      group: grouped ? tail[0][0].toUpperCase() + tail[0].slice(1) : 'General',
      label: (grouped ? tail.slice(1) : tail).join(' '),
    })
  })
  return result
}

/** What a length value comes to inside `scope` (`calc(var(--h) / 2)` → `16px`), or null. */
export function resolveLength(scope: Element, value: string): string | null {
  const probe = document.createElement('span')
  probe.hidden = true
  probe.style.width = value
  if (!probe.style.width) return null
  scope.append(probe)
  const computed = getComputedStyle(probe).width
  probe.remove()
  return computed || null
}

/** Whether a value is derived from others (refers to a variable), rather than a literal. */
export const isDerived = (value: string): boolean => /var\(\s*--/.test(value)
