import { test, expect, describe } from 'bun:test'
import { docSystemStyleSpec } from './doc-system-styles.js'

describe('#150: no rule POISONS a global palette token', () => {
  test('`--text-color` is redefined only by rules that own a background', () => {
    /*
    `button, select, .clickable { --text-color: var(--brand-color) }` redefined the token the
    whole palette derives from (`--tosi-text: var(--text-color)`), so from any button downward
    it meant the brand colour. An embedded editor deriving its chrome from the page got
    unreadable toolbar icons — oklab L≈0.27 on an L 0.16 bar — with correct body text beside
    them. `pre, code` did the same, which put every syntax-token span in a poisoned palette.

    The distinction is not "which selectors are allowed" but WHY:

      - a rule that sets its own `background` establishes a palette SCOPE. `header` is brand
        coloured, so its contents genuinely need the matching text colour and should inherit
        it. That is correct and must keep working.
      - a rule that only wants to colour ITSELF should set `color`. Redefining an inherited
        token there poisons the subtree for every consumer of it, while looking like an
        ordinary style rule.

    Encoded as the rule rather than an allowlist, so a new inverted region passes on its
    merits and a new `button`-shaped mistake does not.
    */
    const spec = docSystemStyleSpec()
    const offenders: string[] = []
    for (const [selector, rules] of Object.entries(spec)) {
      if (typeof rules !== 'object' || rules === null) continue
      const r = rules as Record<string, unknown>
      if (!('_textColor' in r)) continue
      // Palette scopes: the document root, the host, and the dark-mode recomputation.
      if (/^(:root|:host|html|body|@|\.darkmode)/.test(selector)) continue
      // A rule that owns a background is establishing a scope, not poisoning one.
      if ('background' in r || 'backgroundColor' in r) continue
      offenders.push(selector)
    }
    expect(
      offenders,
      'these redefine --text-color without owning a background, so they poison the subtree ' +
        'for every consumer of the token. Set `color` instead.'
    ).toEqual([])
  })
})

/*
Token colours must actually be READABLE, in BOTH modes (blocker B2 of the 1.15.0 review).

VSCode Dark+ literals were applied unconditionally to a site whose default `--code-bg` is
`#fdfdfd`. Every token type failed AA on the page most readers see — function at 1.39:1,
operator 1.46:1, property 1.47:1, four effectively invisible.

The failure was not the colour choice, it was the method: the BOOK palette was contrast-checked
against its background, and for the site a sentence ("the site's code sits on a dark code
background") stood in for the measurement. It was false and it shipped in four places.

So this measures. A justification cannot pass it.
*/
const relLuminance = (hex: string): number => {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lin = ch.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('#B2: syntax-highlighting contrast', () => {
  // The two backgrounds `--code-bg` actually takes. Light is the DEFAULT.
  const LIGHT_BG = '#fdfdfd'
  const DARK_BG = '#020202'
  const AA = 4.5

  const colourOf = (rule: unknown): string | null => {
    const v = (rule as Record<string, string>)?.color
    const m = typeof v === 'string' ? v.match(/#[0-9a-fA-F]{3,8}/) : null
    return m ? m[0] : null
  }

  const spec = docSystemStyleSpec() as Record<string, unknown>
  const tokenRules = Object.entries(spec).filter(([sel]) =>
    sel.includes('.token.')
  )

  test('every LIGHT-mode token colour clears WCAG AA on #fdfdfd', () => {
    const fails: string[] = []
    for (const [sel, rule] of tokenRules) {
      if (sel.includes('.darkmode')) continue
      const c = colourOf(rule)
      if (!c) continue
      const r = contrast(c, LIGHT_BG)
      if (r < AA) fails.push(`${sel} ${c} = ${r.toFixed(2)}:1`)
    }
    expect(
      fails,
      `below AA on the DEFAULT background:\n${fails.join('\n')}`
    ).toEqual([])
  })

  test('every DARK-mode token colour clears WCAG AA on #020202', () => {
    const fails: string[] = []
    for (const [sel, rule] of tokenRules) {
      if (!sel.includes('.darkmode')) continue
      const c = colourOf(rule)
      if (!c) continue
      const r = contrast(c, DARK_BG)
      if (r < AA) fails.push(`${sel} ${c} = ${r.toFixed(2)}:1`)
    }
    expect(fails, `below AA in dark mode:\n${fails.join('\n')}`).toEqual([])
  })

  test('both modes are actually covered — neither list is empty', () => {
    // A rename that emptied either list would make the assertions above pass vacuously,
    // which is precisely how the original defect survived its own test suite.
    const light = tokenRules.filter(
      ([s]) => !s.includes('.darkmode') && colourOf(spec[s])
    )
    const dark = tokenRules.filter(
      ([s]) => s.includes('.darkmode') && colourOf(spec[s])
    )
    expect(light.length).toBeGreaterThan(8)
    expect(dark.length).toBeGreaterThan(8)
  })
})
