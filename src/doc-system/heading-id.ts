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
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/gi, '') // an entity is not its name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s/g, '-')
}

/** The slug of a marked heading token, before any `-1` de-duplication. */
export const headingSlug = (token: any): string =>
  slugOfHeadingText(headingText(token))

/**
 * Hands out ids for one page, suffixing a repeat the way GitHub does.
 *
 * It knows about headings and nothing else. In particular it does NOT keep headings out of
 * `example-N`, the ids live examples get in the browser: a reservation here was tried for
 * 1.16.11 and made `next('example')` loop forever on its second call, because every suffix
 * of `example` is `example-N`. A heading "Example 2" is `example-2`, as on GitHub, and wins
 * `#example-2` over the page's second live example because it comes first in the document.
 */
export class HeadingIds {
  private seen = new Map<string, number>()
  /** The id for the next heading with this slug, or '' when the slug is empty. */
  next(slug: string): string {
    if (!slug) return ''
    let id = slug
    // A suffixed id can itself collide with an earlier literal heading ("Usage 1"). Each
    // pass raises the counter, and `seen` is finite, so this ends.
    while (this.seen.has(id)) {
      const n = (this.seen.get(slug) ?? 0) + 1
      this.seen.set(slug, n)
      id = `${slug}-${n}`
    }
    this.seen.set(id, this.seen.get(id) ?? 0)
    return id
  }
}
