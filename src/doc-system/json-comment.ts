/*
THE grammar of a JSON comment block, `<!--{ … }-->`: a page's metadata and the single-sourcing
directives (`inset`, `only`, `end`) are both spelled this way. It is the whole of a top-level
HTML token, as marked's lexer reads the page, and it may wrap across lines.

Asking the lexer is what keeps a directive that is only being SHOWN, in a fence or a
blockquote, from acting on the page. The metadata reader had its own regex that closed a fence
on the first inner ``` and so read an illustrated `<!--{"hidden":true}-->` as the page's own,
and unpublished it; its single-line pattern also ignored a wrapped block (#4344).
*/
export const JSON_COMMENT = /^\s*<!--\s*(\{[\s\S]*\})\s*-->\s*$/

/** The JSON text a lexer token spells as a JSON comment block, or null. */
export function jsonCommentText(token: {
  type?: string
  raw?: string
}): string | null {
  if (token?.type !== 'html' || typeof token.raw !== 'string') return null
  return JSON_COMMENT.exec(token.raw)?.[1] ?? null
}
