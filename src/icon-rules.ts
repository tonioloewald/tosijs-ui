/*
Composition rules (`spinNLoader`, `unLock`, `checkFile`, …) and how a name is matched to
one, in ONE place. `icons.ts` (the DOM renderer) draws through them; `icon-svg.ts` (markup
without a DOM) asks the same question, "would the renderer draw this name?", so it can tell
a rule it cannot render from a name nothing would draw. It once guessed rules from the shape
of a name instead, and threw for `redLock`. DOM-free, so `icon-svg.ts` can import it.

Rules an app adds with `iconRules.push()` are seen by both, as long as they are pushed
before the name is asked for.
*/

import type { ElementPart } from 'tosijs'
import iconData from './icon-data.js'
import { splitSuffixes } from './icon-suffixes.js'

// Compositional icon rules — when an icon isn't found, try to compose it
export interface IconRule {
  prefix: string | RegExp
  apply: (
    baseName: string,
    match: RegExpMatchArray | string,
    parts: ElementPart[]
  ) => Element | string | null
}

/**
 * Style suffixes on a registered icon (`checkCircle90r`), split, or null. Such a name is
 * that icon styled, and it wins over a composition rule (#3295): `checkCircle90r` is
 * `checkCircle` turned, not the `check` rule over `circle90r`. Both the DOM renderer and
 * `iconSvg` resolve in that order by asking this.
 */
export function suffixedIcon(
  name: string
): { baseName: string; tokens: string[] } | null {
  const split = splitSuffixes(name)
  return split != null && (iconData as Record<string, string>)[split.baseName]
    ? split
    : null
}

/** A registered icon, or style suffixes on one (`chevronRight50o`). */
export function canResolve(name: string): boolean {
  return (
    !!(iconData as Record<string, string>)[name] || suffixedIcon(name) != null
  )
}

/**
 * `spinN<Icon>` animates, so it is drawn by the DOM renderer, which installs `apply` when
 * it loads. Its prefix is here so that every module knows the rule exists.
 */
export const spinRule: IconRule = {
  prefix: /^spin(_?\d+)/,
  apply() {
    throw new Error(
      'spin icons are drawn by the icon renderer (tosijs-ui/icons)'
    )
  },
}

export const iconRules: IconRule[] = [
  spinRule,
  {
    prefix: 'un',
    apply: (baseName) => `slash25o$${baseName}75s75o`,
  },
  {
    prefix: 'check',
    apply: (baseName) => `check75o_00aa00S$${baseName}75s50o`,
  },
  {
    prefix: 'cancel',
    apply: (baseName) => `x75o_cc0000S$${baseName}75s50o`,
  },
  {
    prefix: 'search',
    apply: (baseName) => `search80s30x30y$${baseName}50o`,
  },
]

/**
 * The icon a rule would apply to in `name`, or null if the rule does not match it.
 *
 * A `:` makes the boundary explicit: `check:box` is the `check` rule applied to `box`, with
 * no camelCase guess, so it never reads as an icon called `checkBox`. Everything before the
 * first `:` must be the whole prefix (`spin90:loader`, `un:lock`).
 */
export function matchRule(
  rule: IconRule,
  name: string
): { baseName: string; match: RegExpMatchArray | string } | null {
  const colon = name.indexOf(':')
  if (colon !== -1) {
    const head = name.slice(0, colon)
    const tail = name.slice(colon + 1)
    if (!tail) return null
    const baseName = tail[0].toLowerCase() + tail.slice(1)
    if (rule.prefix instanceof RegExp) {
      const m = head.match(new RegExp(rule.prefix.source + '$'))
      return m && m.index === 0 ? { baseName, match: m } : null
    }
    return head === rule.prefix ? { baseName, match: rule.prefix } : null
  }
  if (rule.prefix instanceof RegExp) {
    const m = name.match(new RegExp(rule.prefix.source + '(.+)$'))
    if (!m) return null
    const tail = m[m.length - 1]
    return { baseName: tail[0].toLowerCase() + tail.slice(1), match: m }
  }
  if (!name.startsWith(rule.prefix) || name.length <= rule.prefix.length) {
    return null
  }
  return {
    baseName:
      name[rule.prefix.length].toLowerCase() +
      name.slice(rule.prefix.length + 1),
    match: rule.prefix,
  }
}

/**
 * Whether some rule would draw `name`: it matches, and what it applies to draws, which may be
 * another rule (`un:check:square`, `unCheckLock`). Each step strips a prefix, so it ends.
 */
export const ruleDraws = (name: string): boolean =>
  iconRules.some((rule) => {
    const matched = matchRule(rule, name)
    return matched != null && drawable(matched.baseName)
  })

/** A registered icon, suffixes on one, or a rule that draws (so rules chain). */
export const drawable = (name: string): boolean =>
  canResolve(name) || ruleDraws(name)
