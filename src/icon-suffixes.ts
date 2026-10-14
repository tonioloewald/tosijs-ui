/*
The icon style-suffix grammar, in ONE place. `icons.ts` (the DOM renderer) and
`icon-svg.ts` (markup without a DOM) both read names through it. `icon-svg.ts` kept its own
copy for one release candidate, and the two disagreed within a day: it read the `_` in
`edit2_90r` as a minus sign and rotated the wrong way. DOM-free, so `icon-svg.ts` can
import it.

Suffixes are a value then a letter code:
  50o (opacity), 75s (scale), 20x (translateX%), _10y (translateY%)
  90r (rotate 90°), _45r (rotate -45°), 0f (flipH), 1f (flipV)
  _FF0000F (fill hex), _f00S (stroke hex), 3W (stroke-width)
  _brandColorF (fill var), _accentS (stroke var)
Icon names ending in digits need a _ separator: edit2_50o
*/

export const SUFFIX_RE =
  /(?:(?<=[a-zA-Z_])(?:_?\d+[osxyr]|[01]f|\d+W)|_[a-zA-Z0-9]+[FS])+$/

const SUFFIX_TOKEN_RE = /_?\d+[osxyr]|[01]f|_[a-zA-Z0-9]+[FS]|\d+W/g

/** A name split into its base and its suffix tokens, in order, or null if it has none. */
export function splitSuffixes(
  name: string
): { baseName: string; tokens: string[] } | null {
  const match = name.match(SUFFIX_RE)
  if (!match) return null
  let baseName = name.slice(0, match.index!)
  // Strip the trailing _ separator (for digit-ending names: edit2_50o)
  if (baseName.endsWith('_')) baseName = baseName.slice(0, -1)
  if (!baseName) return null
  return { baseName, tokens: match[0].match(SUFFIX_TOKEN_RE)! }
}

/** The signed number in a numeric token: `_45r` is -45. */
export const suffixNumber = (token: string): number =>
  parseInt(token.replace('_', '-'))
