import { test, expect } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'fs'
import * as path from 'path'

/*
Every URL the built site uses for the ESM entry must be the SAME URL (#191).

The page loaded `hydrate.js?v=<hash>` while code-split chunks imported the entry back as
`../hydrate.js`. Different URLs, so the browser created two module instances of the entry: it all
evaluated twice, and a module patching a prototype in a shared chunk (Babylon's engine) threw on
the second pass, which also broke shader compilation. tosijs-3d-ensemble measured it: 10 errors
and 2 shader failures with the stamp, 0 and 0 without.

This reads the COMMITTED site, resolving every reference to an absolute path the way a browser
would, so it checks what deploys.
*/

const DOCS = path.resolve(import.meta.dir, '../../../docs')

function filesUnder(dir: string, ext: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) out.push(...filesUnder(full, ext))
    else if (name.endsWith(ext)) out.push(full)
  }
  return out
}

/** The site-absolute URL a reference resolves to, from the file that contains it. */
const resolveFrom = (file: string, ref: string) =>
  new URL(ref, 'https://site' + '/' + path.relative(DOCS, file)).pathname +
  new URL(ref, 'https://site/').search

test('the page and every chunk import the ESM entry by one identical URL', () => {
  const entries = readdirSync(DOCS).filter((f) =>
    /^hydrate-[a-z0-9]+\.js$/.test(f)
  )
  expect(entries.length).toBe(1)
  const entryUrl = '/' + entries[0]

  const pageRefs = new Set<string>()
  for (const page of filesUnder(DOCS, '.html')) {
    for (const m of readFileSync(page, 'utf8').matchAll(
      /<script type="module" src="([^"]+)"/g
    )) {
      pageRefs.add(resolveFrom(page, m[1]))
    }
  }
  const chunkRefs = new Set<string>()
  for (const chunk of filesUnder(path.join(DOCS, '_chunks'), '.js')) {
    for (const m of readFileSync(chunk, 'utf8').matchAll(
      /from ?["'](\.\.?\/hydrate[^"']*)["']/g
    )) {
      chunkRefs.add(resolveFrom(chunk, m[1]))
    }
  }

  expect(pageRefs.size).toBeGreaterThan(0)
  // chunks DO import the entry back; if none did, this test would check nothing on that side
  expect(chunkRefs.size).toBeGreaterThan(0)
  expect([...pageRefs]).toEqual([entryUrl]) // no query string, no second spelling
  // chunks that import the entry at all must use exactly the page's URL
  expect([...chunkRefs].filter((u) => u !== entryUrl)).toEqual([])
})
