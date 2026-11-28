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
import { extractDocs } from './docs.js'

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

/*
#4344: metadata is read with marked's lexer. The fence-stripping regex it replaced closed a
four-backtick fence on its first inner ```, so a page that ILLUSTRATED a hidden block read it as
its own and vanished; its single-line pattern also ignored a wrapped block.
*/
test('a hidden block a page only illustrates does not unpublish it (#4344)', () => {
  const dir = corpus('illustrated-hidden', {
    'guide.md':
      '# Guide\n\nA page with an example and a hidden block:\n\n````md\n```js\nexample()\n```\n<!--{"hidden": true}-->\n````\n\nstays out of the site.\n',
    'quoted.md': '# Quoted\n\n> <!--{"hidden": true}-->\n\nvisible\n',
  })
  const names = extractDocs({ paths: [dir] }).map((d) => d.filename)
  expect(names).toContain('guide.md')
  expect(names).toContain('quoted.md')
})

test('a metadata block may wrap across lines (#4344)', () => {
  const dir = corpus('wrapped-meta', {
    'wrapped.md':
      '<!--{\n  "order": 7,\n  "description": "wrapped"\n}-->\n# Wrapped\n\ntext\n',
    'ts-wrapped.ts':
      '/*{\n  "order": 3\n}*/\n/*#\n# Code\n\ntext\n*/\nexport const x = 1\n',
  })
  const docs = extractDocs({ paths: [dir] })
  const wrapped = docs.find((d) => d.filename === 'wrapped.md')!
  expect(wrapped.order).toBe(7)
  expect(wrapped.description).toBe('wrapped')
  expect(docs.find((d) => d.filename === 'ts-wrapped.ts')!.order).toBe(3)
})
