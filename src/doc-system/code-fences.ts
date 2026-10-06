/*
THE way to enumerate the code blocks in a doc, build and client alike: marked's own lexer.

`check-examples` had this function; `build-warnings` then grew a hand-written line scanner for
the same job, and the 1.16.7 re-review found the scanner disagreeing with marked on CRLF files,
blockquoted fences and fences inside HTML blocks. A scanner can only ever approximate the
parser the pages are rendered with, so nothing here scans: every caller asks marked. The
doc-browser's test runner asks here too (`hasTestBlock`), for the same reason.
*/
import { marked } from 'marked'
import { parseFenceInfo } from './example-policy.js'

/*
Fence info is parsed by `parseFenceInfo`, the one copy of that grammar. This file had its own
`dialectOf`/`modeOf` pair; once fences could carry JSON options (#184) `modeOf` would have read
`{"debug":true}` as the mode `true`.
*/
export function collectCodeTokens(
  text: string
): Array<{ lang: string; text: string; mode?: string }> {
  const out: Array<{ lang: string; text: string; mode?: string }> = []
  const walk = (tokens: any[]): void => {
    for (const t of tokens) {
      /*
      Keep the MODE. `dialectOf` reduced `js:static` to `js`, so the checker could not tell a
      block that will never run from one that will — and hard-failed a build over the syntax
      of illustrative code, advising the author to retag it as `typescript`, which is exactly
      the mislabelling this release exists to abolish (review major M2).
      */
      if (t.type === 'code')
        out.push({
          lang: parseFenceInfo(t.lang ?? '').lang,
          text: t.text,
          mode: parseFenceInfo(t.lang ?? '').mode,
        })
      if (Array.isArray(t.tokens)) walk(t.tokens)
      if (Array.isArray(t.items)) walk(t.items) // list items
    }
  }
  walk(marked.lexer(text))
  return out
}
