/*
The gate that keeps unpublished work unpublished.

`extractDocs` filtering hidden docs is the ONLY thing standing between a working note and
a public page — and it had no test at any tier. Verified by mutation: remove the
`withoutHidden` call and every existing lane stays green while a `draft: true` document
gets its full text written into docs.json and a pre-rendered page at its own URL. That is
the regression this release fixed, and nothing was watching it.

These tests exercise the real `extractDocs` against files on disk, because the bug was
never in the pure resolver — it was in whether anything called it.
*/

import { test, expect, afterAll } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import { extractDocs } from './docs'

const work = mkdtempSync(path.join(tmpdir(), 'tosi-hidden-'))
afterAll(() => rmSync(work, { recursive: true, force: true }))

function corpus(name: string, files: Record<string, string>): string {
  const dir = path.join(work, name)
  mkdirSync(dir, { recursive: true })
  for (const [file, body] of Object.entries(files)) {
    writeFileSync(path.join(dir, file), body)
  }
  return dir
}

test('a draft never reaches the corpus', () => {
  const dir = corpus('draft', {
    'public.md': '# Public\n\nvisible\n',
    'note.md': '---\ntitle: Note\ndraft: true\n---\n\n# Note\n\nSECRET\n',
  })
  const docs = extractDocs({ paths: [dir] })
  const names = docs.map((d) => d.filename)
  expect(names).toContain('public.md')
  expect(names).not.toContain('note.md')
  // The text is the thing that ships — assert on it, not just the entry.
  expect(JSON.stringify(docs)).not.toContain('SECRET')
})

test('hidden: true in a JSON metadata block is equally withheld', () => {
  const dir = corpus('json-hidden', {
    'shown.md': '# Shown\n\nvisible\n',
    'wip.md': '<!--{ "hidden": true }-->\n# WIP\n\nSECRET\n',
  })
  const docs = extractDocs({ paths: [dir] })
  expect(docs.map((d) => d.filename)).toEqual(['shown.md'])
  expect(JSON.stringify(docs)).not.toContain('SECRET')
})

test('REGRESSION: descendants of a hidden doc go with it — including via a SLUG parent', () => {
  /*
  The slug case is the one a pure-resolver test cannot reach. `book-target.test.ts` calls
  withoutHidden() with filename parents, so it passes even if extractDocs forgets to build
  a slug map — and a child whose `parent` is written as a slug would then be published
  under a withheld section.
  */
  const dir = corpus('nested', {
    'part-one.md': '<!--{ "hidden": true }-->\n# Part One\n\nSECRET-PARENT\n',
    'by-filename.md':
      '<!--{ "parent": "part-one.md" }-->\n# By Filename\n\nSECRET-CHILD-A\n',
    'by-slug.md':
      '<!--{ "parent": "part-one" }-->\n# By Slug\n\nSECRET-CHILD-B\n',
    'grandchild.md':
      '<!--{ "parent": "by-slug.md" }-->\n# Grandchild\n\nSECRET-CHILD-C\n',
    'unrelated.md': '# Unrelated\n\nvisible\n',
  })
  const docs = extractDocs({ paths: [dir] })
  expect(docs.map((d) => d.filename)).toEqual(['unrelated.md'])
  const dumped = JSON.stringify(docs)
  for (const secret of [
    'SECRET-PARENT',
    'SECRET-CHILD-A',
    'SECRET-CHILD-B',
    'SECRET-CHILD-C',
  ]) {
    expect(dumped).not.toContain(secret)
  }
})

test('the written docs.json contains no withheld text either', () => {
  // extractDocs writes the file itself when given `output` — the corpus on disk is what
  // actually ships, so assert against that rather than the return value.
  const dir = corpus('written', {
    'ok.md': '# Ok\n\nvisible\n',
    'hidden.md': '<!--{ "hidden": true }-->\n# Hidden\n\nSECRET\n',
  })
  const out = path.join(work, 'written-docs.json')
  extractDocs({ paths: [dir], output: out })
  const written = readFileSync(out, 'utf8')
  expect(written).not.toContain('SECRET')
  expect(written).toContain('visible')
})

test('nothing is withheld when nothing asks to be', () => {
  // The gate must not be enthusiastic: a corpus with no hidden docs loses none.
  const dir = corpus('none-hidden', {
    'a.md': '# A\n\nalpha\n',
    'b.md': '<!--{ "parent": "a.md" }-->\n# B\n\nbravo\n',
  })
  expect(extractDocs({ paths: [dir] })).toHaveLength(2)
})
