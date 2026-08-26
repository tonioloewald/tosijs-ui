import { test, expect, describe } from 'bun:test'
import {
  parseFrontmatter,
  extractDocs,
  SCRAPED_SOURCE_EXTENSIONS,
} from './docs.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('parseFrontmatter', () => {
  test('parses & strips YAML frontmatter, maps keys, body starts at the H1', () => {
    const src = [
      '---',
      'title: The Silent Coast',
      'order: 20',
      'author: Jane Roe',
      'draft: true',
      '---',
      '',
      '# Chapter One',
      '',
      'Prose.',
    ].join('\n')
    const { data, body } = parseFrontmatter(src)
    expect(data.title).toBe('The Silent Coast')
    expect(data.order).toBe(20)
    expect(data.author).toBe('Jane Roe')
    expect(data.hidden).toBe(true) // draft: true → hidden
    expect(body.split('\n')[0]).toBe('# Chapter One') // leading blank line stripped
  })

  test('a bare leading --- (horizontal rule) is left as content', () => {
    const src = '---\n\nJust a rule, not frontmatter.'
    const { data, body } = parseFrontmatter(src)
    expect(data).toEqual({})
    expect(body).toBe(src)
  })

  test('empty title is dropped (falls back to the H1); other keys keep', () => {
    const { data } = parseFrontmatter('---\ntitle:\norder: 3\n---\n# Real')
    expect(data.title).toBeUndefined()
    expect(data.order).toBe(3)
  })

  test('a doc with no frontmatter is returned untouched', () => {
    const src = '# Heading\n\nBody.'
    const { data, body } = parseFrontmatter(src)
    expect(data).toEqual({})
    expect(body).toBe(src)
  })
})

describe('which source extensions are scraped (#108)', () => {
  /*
  Converting `more-math.ts` to `more-math.tjs` in tosijs SILENTLY deleted its documentation page.
  The build exited 0 and the internal-link check passed — a page that was never generated is
  linked from nowhere, so "41 slugs, no 404s" is a pass. The only signal was a slug count nothing
  asserts on, and a project mid-port loses one page per converted module.

  The doc-block syntax is identical in every one of these languages, because a doc block is just
  a comment. There is nothing to support per language; the list IS the feature, which is why an
  omission from it is invisible.
  */
  const withTree = (
    files: Record<string, string>,
    run: (dir: string) => void
  ) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-ext-'))
    try {
      for (const [name, body] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, name), body)
      }
      run(dir)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }

  const DOC = [
    '/*#',
    '# Thing',
    'documented',
    '*' + '/',
    'export const a = 1',
  ].join('\n')

  test('a .tjs file is scraped, exactly like the .ts it was converted from', () => {
    withTree({ 'thing.tjs': DOC, 'other.ts': DOC }, (dir) => {
      const found = extractDocs({ paths: [dir], ignore: [] }).map(
        (d) => d.filename
      )
      expect(found).toContain('thing.tjs')
      expect(found).toContain('other.ts')
    })
  })

  test('.tjs is in the scraped list, and so are the originals', () => {
    // A blunt assertion on the list itself: it is small, it is the whole feature, and every
    // entry removed from it silently deletes pages.
    for (const ext of ['.ts', '.js', '.tjs', '.css']) {
      expect(SCRAPED_SOURCE_EXTENSIONS).toContain(ext)
    }
  })

  test('a documented file we do NOT scrape is reported, not silently dropped', () => {
    /*
    The guard for the whole class rather than for `.tjs` specifically. Whatever the next
    extension turns out to be, its absence must not be invisible — that silence is the actual
    defect in #108, more than the missing page was.
    */
    const warnings: string[] = []
    const realWarn = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.join(' '))
    try {
      withTree({ 'thing.vue': DOC }, (dir) => {
        const found = extractDocs({ paths: [dir], ignore: [] })
        expect(
          found.length,
          'still not scraped — this is a warning, not a feature'
        ).toBe(0)
      })
    } finally {
      console.warn = realWarn
    }
    const said = warnings.join('\n')
    expect(said, `expected a warning naming the file, got: ${said}`).toContain(
      'thing.vue'
    )
    expect(said).toContain('not scraped')
  })

  test('a scraped file does not trigger the warning', () => {
    // The guard must stay quiet on the happy path, or it becomes noise and gets ignored —
    // which would put us back where we started.
    const warnings: string[] = []
    const realWarn = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.join(' '))
    try {
      withTree({ 'thing.tjs': DOC }, (dir) => {
        expect(extractDocs({ paths: [dir], ignore: [] }).length).toBe(1)
      })
    } finally {
      console.warn = realWarn
    }
    expect(warnings.join('\n')).not.toContain('not scraped')
  })
})
