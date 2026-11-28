import { expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { EPUB_CONFIG_FIELDS } from './orchestrator.js'

/*
#4376: `buildSite` runs the ePub in a child and sends it only `EPUB_CONFIG_FIELDS`. A hand-written
payload left out `liveExamples`, so books from opt-in sites shipped dead "Run this example live"
links while `bun book` (which calls `buildEpub` directly) was fine. Every field `epub.ts` reads
must be on the list.
*/
test('the ePub child is sent every config field epub.ts reads', () => {
  const source = readFileSync(new URL('./epub.ts', import.meta.url), 'utf8')
  const read = new Set(
    [...source.matchAll(/(?<![\w.-])config\.(\w+)/g)].map((m) => m[1])
  )
  expect(read.size).toBeGreaterThan(5)
  const sent = new Set<string>(EPUB_CONFIG_FIELDS)
  expect([...read].filter((field) => !sent.has(field))).toEqual([])
})
