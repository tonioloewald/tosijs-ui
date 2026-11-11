/*
A theme's web fonts, with no imports: the doc site's build reads these too, and its build
modules must not pull in tosijs (it needs a DOM at import).

A theme names stylesheets to link, and only from hosts that serve fonts and nothing else:
linking a stylesheet is injecting CSS, so an arbitrary URL is not acceptable here.
*/
export const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.bunny.net',
]

/** The families a font stylesheet URL asks for: `family=Open+Sans:wght@400` → `Open Sans`. */
export function fontFamilies(url: string): string[] {
  try {
    return new URL(url).searchParams
      .getAll('family')
      .flatMap((spec) => spec.split('|'))
      .map((spec) => spec.split(':')[0].trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

/** A font stylesheet URL from a URL allowed by FONT_ORIGINS, or null. */
export function allowedFontUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    return FONT_ORIGINS.includes(parsed.origin) && fontFamilies(url).length
      ? parsed.href
      : null
  } catch {
    return null
  }
}

/**
 * The stylesheet in what was pasted: a `<link href="…">`, an `@import url(…)`, or a bare URL,
 * as Google Fonts offers them. An error says why it was refused.
 */
export function parseFontImport(
  text: string
): { url: string; families: string[] } | { error: string } {
  const pasted = text.trim()
  const url =
    /href\s*=\s*["']([^"']+)["']/i.exec(pasted)?.[1] ??
    /@import\s+url\(\s*["']?([^"')]+)["']?\s*\)/i.exec(pasted)?.[1] ??
    /@import\s+["']([^"']+)["']/i.exec(pasted)?.[1] ??
    pasted
  const decoded = url.replace(/&amp;/g, '&')
  let origin: string
  try {
    origin = new URL(decoded).origin
  } catch {
    return { error: 'Paste a font link, an @import line, or its URL.' }
  }
  if (!FONT_ORIGINS.includes(origin)) {
    return {
      error: `Fonts can come from ${FONT_ORIGINS.map((o) => new URL(o).host).join(' or ')}.`,
    }
  }
  const allowed = allowedFontUrl(decoded)
  if (!allowed) return { error: 'That link names no font family.' }
  return { url: allowed, families: fontFamilies(allowed) }
}
