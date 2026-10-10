/*
THE rule for a heading's id, build and client alike.

Headings rendered with no `id`, so `[text](#some-heading)` was a live-looking link that did
nothing, with no error anywhere (board #3178). The slug is the GitHub-flavoured one, because
that is what an author writing an in-page link expects and what the same file gets when it is
read on GitHub: lowercase, every character that is not a letter, a number, a space, `-` or
`_` dropped, spaces to `-`. A repeat on one page gets `-1`, `-2`, ….

The renderer stamps ids with it and an inset's `#anchor` (single-source.ts) is matched with
it. Do not write a second copy: an anchor that the build accepts and the page does not carry
is exactly the silent failure this exists to end.
*/

/** The text a reader sees in a heading: marked's inline tokens with the markup dropped. */
export function headingText(token: any): string {
  if (Array.isArray(token.tokens) && token.type !== 'codespan')
    return token.tokens.map(headingText).join('')
  if (token.type === 'html') return ''
  if (token.type === 'br') return ' '
  return String(token.text ?? '')
}

/** GitHub-flavoured slug of some heading text. May be empty (a heading of punctuation). */
export function slugOfHeadingText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s/g, '-')
}

/** The slug of a marked heading token, before any `-1` de-duplication. */
export const headingSlug = (token: any): string =>
  slugOfHeadingText(headingText(token))

/** Hands out ids for one page, suffixing a repeat the way GitHub does. */
export class HeadingIds {
  private seen = new Map<string, number>()
  /** The id for the next heading with this slug, or '' when the slug is empty. */
  next(slug: string): string {
    if (!slug) return ''
    let id = slug
    // A suffixed id can itself collide with a later literal heading ("Usage 1").
    while (this.seen.has(id)) {
      const n = (this.seen.get(slug) ?? 0) + 1
      this.seen.set(slug, n)
      id = `${slug}-${n}`
    }
    this.seen.set(id, this.seen.get(id) ?? 0)
    return id
  }
}
