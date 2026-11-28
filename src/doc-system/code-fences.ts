/*
THE way to enumerate the code blocks in a doc, build and client alike: the page's own lexer.

`check-examples` had this function; `build-warnings` then grew a hand-written line scanner for
the same job, and the 1.16.7 re-review found the scanner disagreeing with marked on CRLF files,
blockquoted fences and fences inside HTML blocks. A scanner can only ever approximate the
parser the pages are rendered with, so nothing here scans: every caller asks marked. The
doc-browser's test runner asks here too (`hasTestBlock`), and so does save-to-source, which
had the last regex scanner and wrote edits into the wrong example with it (#4343).
*/
import { parseFenceInfo } from './example-policy.js'
import { docTokens, rendersNoElement } from './render.js'

/** A code block as marked reads it, with where it sits. */
export interface CodeToken {
  lang: string
  text: string
  mode?: string
  /** The block's markdown as written, fence lines included. */
  raw: string
  /** False for an indented (four-space) code block, which has no fence and no language. */
  fenced: boolean
  /**
   * Offset of `raw` in the text that was lexed, or `null` when the block sits inside a
   * blockquote or a list, where marked's `raw` is the text with the `> ` or the item's
   * indentation removed, so it is not a slice of the source.
   */
  at: number | null
  /**
   * The previous element the rendered page puts beside this block is a code block: nothing
   * between them but blank lines or an HTML comment. This is what `insert-examples` reads as
   * `nextElementSibling` when it groups consecutive blocks into one example.
   */
  followsCode: boolean
}

/** Every code block in `text`, in document order, with its place. */
export function lexCodeTokens(text: string): CodeToken[] {
  const out: CodeToken[] = []
  /*
  Lexing normalises line endings, so offsets are only meaningful in `\n` text; a caller that
  needs them (save-to-source) normalises first.
  */
  const lexed = text.replace(/\r\n|\r/g, '\n')
  const walk = (tokens: any[], from: number | null): void => {
    let cursor = from
    let followsCode = false
    for (const t of tokens) {
      let at: number | null = null
      if (cursor !== null && typeof t.raw === 'string') {
        const found = lexed.startsWith(t.raw, cursor)
          ? cursor
          : lexed.indexOf(t.raw, cursor)
        if (found !== -1) {
          at = found
          cursor = found + t.raw.length
        }
      }
      // After a code block, a token that renders nothing keeps the next one beside it.
      if (followsCode && t.type !== 'code' && rendersNoElement(t)) continue
      if (t.type === 'code') {
        /*
        Keep the MODE. `dialectOf` reduced `js:static` to `js`, so the checker could not tell a
        block that will never run from one that will — and hard-failed a build over the syntax
        of illustrative code, advising the author to retag it as `typescript`, which is exactly
        the mislabelling this release exists to abolish (review major M2).
        */
        const info = parseFenceInfo(t.lang ?? '')
        out.push({
          lang: info.lang,
          text: t.text,
          mode: info.mode,
          raw: t.raw,
          fenced: t.codeBlockStyle !== 'indented',
          at,
          followsCode,
        })
        followsCode = true
        continue
      }
      followsCode = false
      if (Array.isArray(t.tokens)) walk(t.tokens, null)
      if (Array.isArray(t.items)) walk(t.items, null) // list items
    }
  }
  walk(docTokens(lexed), 0)
  return out
}

/*
Fence info is parsed by `parseFenceInfo`, the one copy of that grammar. This file had its own
`dialectOf`/`modeOf` pair; once fences could carry JSON options (#184) `modeOf` would have read
`{"debug":true}` as the mode `true`.
*/
export function collectCodeTokens(
  text: string
): Array<{ lang: string; text: string; mode?: string }> {
  return lexCodeTokens(text).map((t) => ({
    lang: t.lang,
    text: t.text,
    mode: t.mode,
  }))
}
