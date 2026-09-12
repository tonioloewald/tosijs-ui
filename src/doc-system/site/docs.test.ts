import { test, expect, describe } from 'bun:test'
import {
  parseFrontmatter,
  extractDocs,
  SCRAPED_SOURCE_EXTENSIONS,
  titleFromMarkdown,
  DEFAULT_DOC_IGNORES,
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

test('#100: a leading metadata comment is not the title', () => {
  /*
  The title came from line one, literally. A file opening with its metadata block — the
  documented way to set `order` or `parent` — published under the title
  `<!--{ "order": 2 }-->`, while `order` itself parsed correctly. So the metadata visibly worked
  and the title visibly did not, which is a confusing pair to be handed. Hit while adding
  CHANGELOG.md and Migration.md to a doc site, exactly where a leading metadata comment is most
  natural.
  */
  expect(titleFromMarkdown('<!--{ "order": 2 }-->\n\n# Migration\n')).toBe(
    'Migration'
  )
})

test('#100: a metadata block that wraps across lines is still skipped', () => {
  // Prettier or a human will wrap a long block; the title must not depend on it fitting.
  expect(
    titleFromMarkdown(
      '<!--{\n  "order": 2,\n  "parent": "Guides"\n}-->\n\n# Wrapped\n'
    )
  ).toBe('Wrapped')
})

test('#100: several leading comments are all skipped', () => {
  expect(
    titleFromMarkdown('<!-- a note -->\n<!--{ "pin": "top" }-->\n\n# Two\n')
  ).toBe('Two')
})

test('#100: ordinary files are unaffected', () => {
  // The regression risk: every page that has no leading comment must keep its title.
  expect(titleFromMarkdown('# Plain\n\nbody')).toBe('Plain')
  expect(titleFromMarkdown('\n\n# After blanks\n')).toBe('After blanks')
  expect(titleFromMarkdown('Just prose\n')).toBe('Just prose')
  expect(titleFromMarkdown('# With `code`\n')).toBe('With code')
})

test('#100: an unterminated comment yields no title rather than a fake one', () => {
  /*
  The rest of the file is commented out, so there is no title to find. Reading one from INSIDE
  the comment would be worse than an empty string — it would publish text the author had
  deliberately hidden.
  */
  expect(titleFromMarkdown('<!-- oops\n# Not a title\n')).toBe('')
})

describe('#153: reviews are not published by default', () => {
  test('DEFAULT_DOC_IGNORES excludes reviews', () => {
    /*
    A `docPaths: ['docs']` took the directory wholesale and published 13 internal pre-release
    review reports — including BLOCK verdicts naming an adopter. Nothing failed; the way the
    reporter found out was reading the output file list after a successful build. The
    practices doc that tells you to write those reports is the same one warning that
    publishing them is the bad outcome, so the safe thing is now the default.
    */
    expect(DEFAULT_DOC_IGNORES).toContain('reviews')
  })

  test('a reviews/ directory is skipped when scanning a parent', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docignore-'))
    try {
      fs.mkdirSync(path.join(dir, 'reviews'), { recursive: true })
      fs.writeFileSync(path.join(dir, 'public.md'), '# Public\n\ntext\n')
      fs.writeFileSync(
        path.join(dir, 'reviews', 'secret.md'),
        '# Verdict: BLOCK\n\nnames an adopter\n'
      )
      const docs = extractDocs({
        paths: [dir],
        ignore: [...DEFAULT_DOC_IGNORES],
      })
      const titles = docs.map((d) => d.title)
      expect(titles).toContain('Public')
      expect(titles.join(' ')).not.toContain('BLOCK')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('#156: a doc that DOCUMENTS the metadata format', () => {
  const write = (body: string) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meta156-'))
    fs.writeFileSync(path.join(dir, 'guide.md'), body)
    return {
      dir,
      cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    }
  }

  test('an example INSIDE a fence is prose, not the document’s own directive', () => {
    /*
    tjs-lang's CLAUDE.md teaches how to author a playground example and shows the format.
    The matcher read the illustration as frontmatter and published the file classified by it.
    Nothing failed — found by diffing the corpus field by field.
    */
    const { dir, cleanup } = write(
      '# Authoring Guide\n\nPut this at the top:\n\n```\n<!--{"order":16,"title":"Not This"}-->\n```\n\nThat is all.\n'
    )
    try {
      const [doc] = extractDocs({ paths: [dir] })
      expect(doc.title).toBe('Authoring Guide')
      expect(doc.order).toBeUndefined()
    } finally {
      cleanup()
    }
  })

  test('a REAL directive at the start of a line still works', () => {
    const { dir, cleanup } = write('# Real Doc\n\n<!--{"order":3}-->\n\nbody\n')
    try {
      const [doc] = extractDocs({ paths: [dir] })
      expect(doc.order).toBe(3)
    } finally {
      cleanup()
    }
  })

  test('an INLINE mention mid-sentence is prose', () => {
    const { dir, cleanup } = write(
      '# Inline\n\nWrite <!--{"order":9}--> to set the order.\n'
    )
    try {
      const [doc] = extractDocs({ paths: [dir] })
      expect(doc.order).toBeUndefined()
    } finally {
      cleanup()
    }
  })
})

describe('#B3: the reviews/ exclusion has a working escape, and is accountable', () => {
  const build = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b3-'))
    fs.mkdirSync(path.join(dir, 'reviews'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'public.md'), '# Public\n\ntext\n')
    fs.writeFileSync(path.join(dir, 'reviews', 'r1.md'), '# R1\n\nverdict\n')
    fs.writeFileSync(path.join(dir, 'reviews', 'r2.md'), '# R2\n\nverdict\n')
    return {
      dir,
      cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    }
  }

  test('naming the directory in docPaths PUBLISHES it — the documented escape', () => {
    /*
    The basename test ran on the roots too, so `docPaths: ['docs/reviews']` produced nothing,
    silently, while three shipped places claimed it worked — including an orchestrator comment
    naming basename matching as the REASON it would work, when that is why it did not.
    */
    const { dir, cleanup } = build()
    try {
      const docs = extractDocs({
        paths: [path.join(dir, 'reviews')],
        ignore: [...DEFAULT_DOC_IGNORES],
      })
      expect(docs.map((d) => d.title).sort()).toEqual(['R1', 'R2'])
    } finally {
      cleanup()
    }
  })

  test.each([
    ['trailing slash', '/'],
    ['dot suffix', '/.'],
  ])('the escape works with a %s spelling too', (_label, suffix) => {
    const { dir, cleanup } = build()
    try {
      const docs = extractDocs({
        paths: [path.join(dir, 'reviews') + suffix],
        ignore: [...DEFAULT_DOC_IGNORES],
      })
      expect(docs.length).toBe(2)
    } finally {
      cleanup()
    }
  })

  test('scanning a PARENT still excludes it — the default is intact', () => {
    const { dir, cleanup } = build()
    try {
      const titles = extractDocs({
        paths: [dir],
        ignore: [...DEFAULT_DOC_IGNORES],
      }).map((d) => d.title)
      expect(titles).toContain('Public')
      expect(titles).not.toContain('R1')
    } finally {
      cleanup()
    }
  })

  test('and it SAYS what it withheld — a silent drop is the defect class, not the fix', () => {
    const { dir, cleanup } = build()
    const warnings: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => warnings.push(a.join(' '))
    try {
      extractDocs({ paths: [dir], ignore: [...DEFAULT_DOC_IGNORES] })
    } finally {
      console.warn = real
      cleanup()
    }
    const line = warnings.find((w) => w.includes('NOT published'))
    expect(
      line,
      'a default exclusion must report what it withheld'
    ).toBeTruthy()
    expect(line).toContain('2 doc file(s)')
    expect(line).toContain('docPaths')
  })

  test('a path-exact ignore still applies at the root — that names THIS directory', () => {
    // Basename defaults lose to an explicit docPaths entry; a path-exact ignore does not,
    // because it is not a name pattern.
    const { dir, cleanup } = build()
    try {
      const docs = extractDocs({
        paths: [path.join(dir, 'reviews')],
        ignore: [path.join(dir, 'reviews')],
      })
      expect(docs).toEqual([])
    } finally {
      cleanup()
    }
  })
})
