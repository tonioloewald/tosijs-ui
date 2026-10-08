import { test, expect, describe } from 'bun:test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { extractDocs } from './docs'
import {
  resolveInsets,
  splitConditions,
  assembleCorpus,
  isSingleSourceDirective,
  SingleSourceError,
} from './single-source'
import { partitionByBook, placeInBook, bookTextOf } from '../book-target'
import { buildSlugMap } from '../routing'

const doc = (filename: string, text: string, extra: object = {}) => ({
  filename,
  title: filename.replace(/\.md$/, ''),
  path: `docs/${filename}`,
  text,
  ...extra,
})

describe('insets', () => {
  test('a whole doc is inset without its title or metadata block', () => {
    const docs = [
      doc(
        'install.md',
        '<!--{ "order": 3 }-->\n# Install\n\nRun `bun add x`.\n'
      ),
      doc('intro.md', '# Intro\n\n<!--{ "inset": "install.md" }-->\n\nDone.\n'),
    ]
    expect(resolveInsets(docs)).toBe(1)
    expect(docs[1].text).toContain('Run `bun add x`.')
    expect(docs[1].text).not.toContain('# Install')
    expect(docs[1].text).not.toContain('"order"')
    expect(docs[1].text).not.toContain('inset')
    expect(docs[1].text).toContain('Done.')
    // The source page is untouched.
    expect(docs[0].text).toContain('# Install')
  })

  test('one heading section: its body, up to the next heading of that level or higher', () => {
    const docs = [
      doc(
        'install.md',
        '# Install\n\n## With bun\n\nbun add x\n\n### Notes\n\nnested\n\n## With npm\n\nnpm i x\n'
      ),
      doc('a.md', '<!--{ "inset": "install.md#with-bun" }-->\n'),
    ]
    resolveInsets(docs)
    expect(docs[1].text).toContain('bun add x')
    expect(docs[1].text).toContain('### Notes')
    expect(docs[1].text).not.toContain('## With bun')
    expect(docs[1].text).not.toContain('npm i x')
  })

  test("the inset page's live examples arrive as fences, so they run where inset", () => {
    const docs = [
      doc(
        'eg.md',
        '# Eg\n\n```js\nconsole.log(1)\n```\n\n```test\ntest("x", () => {})\n```\n'
      ),
      doc('host.md', '# Host\n\n<!--{ "inset": "eg" }-->\n'),
    ]
    resolveInsets(docs)
    expect(docs[1].text).toContain('```js\nconsole.log(1)\n```')
    expect(docs[1].text).toContain('```test')
  })

  test('a directive shown inside a code fence is an illustration, not an inset', () => {
    const text = '# How\n\n```html\n<!--{ "inset": "nowhere.md" }-->\n```\n'
    const docs = [doc('how.md', text)]
    expect(resolveInsets(docs)).toBe(0)
    expect(docs[0].text).toBe(text)
  })

  test('insets nest, and a cycle is an error naming the loop', () => {
    const nested = [
      doc('c.md', '# C\n\ndeep\n'),
      doc('b.md', '# B\n\n<!--{ "inset": "c.md" }-->\n'),
      doc('a.md', '# A\n\n<!--{ "inset": "b.md" }-->\n'),
    ]
    resolveInsets(nested)
    expect(nested[2].text).toContain('deep')

    const loop = [
      doc('a.md', '# A\n\n<!--{ "inset": "b.md" }-->\n'),
      doc('b.md', '# B\n\n<!--{ "inset": "a.md" }-->\n'),
    ]
    expect(() => resolveInsets(loop)).toThrow(
      /inset cycle: a\.md → b\.md → a\.md/
    )
  })

  test('an inset that resolves nowhere fails, saying what was tried', () => {
    const docs = [
      doc('a.md', '<!--{ "inset": "_missing.md" }-->\n', {
        path: '/proj/docs/a.md',
      }),
    ]
    const options = {
      fragmentDirs: new Set(['/proj/docs']),
      realPath: (p: string) => p,
      readFile: () => undefined,
    }
    expect(() => resolveInsets(docs, options)).toThrow(SingleSourceError)
    expect(() => resolveInsets(docs, options)).toThrow(/docs\/_missing\.md/)
  })

  test('a missing heading fails and lists the headings that exist', () => {
    const docs = [
      doc('install.md', '# Install\n\n## With bun\n\nx\n'),
      doc('a.md', '<!--{ "inset": "install.md#with-yarn" }-->\n'),
    ]
    expect(() => resolveInsets(docs)).toThrow(/#with-bun/)
  })

  test('a fragment file that is not a page resolves relative to the including doc', () => {
    const seen: string[] = []
    const docs = [
      doc('a.md', '# A\n\n<!--{ "inset": "_steps.md" }-->\n', {
        path: '/proj/docs/a.md',
      }),
    ]
    resolveInsets(docs, {
      fragmentDirs: new Set(['/proj/docs']),
      realPath: (p) => p,
      readFile: (p) => {
        seen.push(p)
        return '---\ntitle: x\n---\n# Steps\n\nstep one\n'
      },
    })
    expect(seen).toEqual(['/proj/docs/_steps.md'])
    expect(docs[0].text).toContain('step one')
    expect(docs[0].text).not.toContain('title: x')
  })

  test('a directive inside a list, a quote or a paragraph is an error, not a comment', () => {
    for (const text of [
      '- item\n  <!--{ "inset": "nowhere.md" }-->\n',
      '> <!--{ "only": "book" }-->\n',
      'Some text <!--{ "inset": "x.md" }--> more text.\n',
      // shapes the first version of this guard walked past (re-review F4)
      '| a |\n| - |\n| <!--{ "inset": "x.md" }--> |\n',
      '<div>\n<!--{ "inset": "x.md" }-->\n</div>\n',
      '<!--{ "only": "book" }--> <!--{ "end": "only" }-->\n',
    ]) {
      expect(() => assembleCorpus([doc('a.md', text)] as any)).toThrow(
        /on its own line at the top level/
      )
    }
  })

  test('an inset that names no document is an error', () => {
    expect(() =>
      resolveInsets([doc('a.md', '<!--{ "inset": "#with-bun" }-->\n')])
    ).toThrow(/names no document/)
  })
})

/*
What a file inset may read, against a REAL directory: the first cut read anything under the
project root, and published it (1.16.9 review, B1 and B2). Every case here built green then.
*/
describe('a file inset reads fragments and nothing else', () => {
  const site = (files: Record<string, string>) => {
    const root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'inset-guard-'))
    )
    for (const [name, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true })
      fs.writeFileSync(path.join(root, name), text)
    }
    return root
  }
  // The ignore list a site build passes: its own, plus the default `reviews` exclusion.
  const build = (root: string) =>
    extractDocs({
      paths: [path.join(root, 'docs')],
      ignore: ['node_modules', 'dist', 'build', 'reviews'],
    }) as any[]
  const host = (ref: string) => `# Host\n\n<!--{ "inset": "${ref}" }-->\n`

  test('not a secrets file beside the docs', () => {
    const root = site({
      '.env': 'API_KEY=abc',
      'docs/page.md': host('../.env'),
    })
    expect(() => build(root)).toThrow(/must name a fragment/)
    fs.rmSync(root, { recursive: true, force: true })
  })

  test('not a file that is not markdown, even with the prefix', () => {
    const root = site({
      'docs/_key.pem': 'PRIVATE',
      'docs/page.md': host('_key.pem'),
    })
    expect(() => build(root)).toThrow(/must name a fragment/)
    fs.rmSync(root, { recursive: true, force: true })
  })

  test('not a draft, a hidden doc, or a child of a hidden section', () => {
    const cases: Record<string, string>[] = [
      { 'docs/secret.md': '---\ndraft: true\n---\n# Secret\n\nwithheld\n' },
      { 'docs/secret.md': '<!--{ "hidden": true }-->\n# Secret\n\nwithheld\n' },
      {
        'docs/section.md': '<!--{ "hidden": true }-->\n# Section\n',
        'docs/secret.md':
          '<!--{ "parent": "section" }-->\n# Secret\n\nwithheld\n',
      },
    ]
    for (const files of cases) {
      const root = site({ ...files, 'docs/page.md': host('secret.md') })
      expect(() => build(root)).toThrow(/a hidden one cannot be/)
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  test('not a fragment outside the doc paths, or under an ignored directory', () => {
    for (const [file, ref] of [
      ['notes/_x.md', '../notes/_x.md'],
      ['docs/reviews/_x.md', 'reviews/_x.md'],
      ['docs/node_modules/_x.md', 'node_modules/_x.md'],
    ] as const) {
      const root = site({ [file]: 'withheld', 'docs/page.md': host(ref) })
      try {
        expect(() => build(root)).toThrow(
          /not in a directory the docs are extracted from/
        )
      } finally {
        fs.rmSync(root, { recursive: true, force: true })
      }
    }
  })

  // Re-review F1: `README.md` as a doc path made the whole project a place to read from.
  test('a FILE in the doc paths does not open its directory', () => {
    const root = site({
      'README.md': '# Readme\n',
      'notes/_x.md': 'withheld',
      'docs/page.md': host('../notes/_x.md'),
    })
    try {
      expect(() =>
        extractDocs({
          paths: [path.join(root, 'docs'), path.join(root, 'README.md')],
        })
      ).toThrow(/not in a directory the docs are extracted from/)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  // Re-review F2: an ignore written as a path was honoured by extraction and not here.
  test('an ignore written as a path withholds fragments as it withholds pages', () => {
    const root = site({
      'docs/private/_x.md': 'withheld',
      'docs/private/p.md': '# P\n',
      'docs/page.md': host('private/_x.md'),
    })
    try {
      expect(() =>
        extractDocs({
          paths: [path.join(root, 'docs')],
          ignore: [path.join(root, 'docs/private')],
        })
      ).toThrow(/not in a directory the docs are extracted from/)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  test("not through a symlink: the name and the place that count are the target's", () => {
    for (const [target, text] of [
      ['outside/_x.md', 'withheld'], // a fragment, in the wrong place
      ['docs/secret.md', '---\ndraft: true\n---\n# S\n\nwithheld\n'], // a draft page
      ['docs/.env', 'API_KEY=abc'],
    ] as const) {
      const root = site({ [target]: text, 'docs/page.md': host('_link.md') })
      fs.symlinkSync(path.join(root, target), path.join(root, 'docs/_link.md'))
      try {
        expect(() => build(root)).toThrow(
          /must name a fragment|not in a directory the docs are extracted from/
        )
      } finally {
        fs.rmSync(root, { recursive: true, force: true })
      }
    }
  })

  test('a real fragment in a subdirectory of the docs is read', () => {
    const root = site({
      'docs/parts/_x.md': '# X\n\nshared words\n',
      'docs/page.md': host('parts/_x.md'),
    })
    const page = build(root).find((d) => d.filename === 'page.md')
    expect(page.text).toContain('shared words')
    fs.rmSync(root, { recursive: true, force: true })
  })
})

describe('conditional text', () => {
  const text =
    'Both.\n\n<!--{ "only": "book" }-->\n\nNext chapter.\n\n<!--{ "end": "only" }-->\n\n' +
    '<!--{ "only": "site" }-->\n\nNext page.\n\n<!--{ "end": "only" }-->\n\nTail.\n'

  test('each variant keeps its own text and neither keeps a directive', () => {
    const { site, book } = splitConditions(text)
    expect(site).toContain('Next page.')
    expect(site).not.toContain('Next chapter.')
    expect(book).toContain('Next chapter.')
    expect(book).not.toContain('Next page.')
    for (const v of [site, book]) {
      expect(v).toContain('Both.')
      expect(v).toContain('Tail.')
      expect(v).not.toContain('only')
    }
  })

  test('a doc without conditions comes back byte-identical', () => {
    const plain = 'A\r\n\r\n<!--{ "order": 1 }-->\r\nB\r\n'
    expect(splitConditions(plain)).toEqual({ site: plain, book: plain })
  })

  test('unbalanced or unknown conditions are errors', () => {
    expect(() => splitConditions('<!--{ "only": "book" }-->\n\nx\n')).toThrow(
      /never closed/
    )
    expect(() => splitConditions('x\n\n<!--{ "end": "only" }-->\n')).toThrow(
      /no "only" block open/
    )
    expect(() =>
      splitConditions(
        '<!--{ "only": "book" }-->\n\n<!--{ "only": "site" }-->\n\n<!--{ "end": "only" }-->\n'
      )
    ).toThrow(/opens inside another/)
    expect(() =>
      splitConditions(
        '<!--{ "only": "print" }-->\n\nx\n\n<!--{ "end": "only" }-->\n'
      )
    ).toThrow(/"site" or "book"/)
  })

  test('assembleCorpus: text is the site, bookText only where a book differs', () => {
    const docs: any[] = [doc('a.md', text), doc('b.md', 'plain\n')]
    assembleCorpus(docs)
    expect(docs[0].text).toContain('Next page.')
    expect(bookTextOf(docs[0])).toContain('Next chapter.')
    expect(docs[1].bookText).toBeUndefined()
    expect(bookTextOf(docs[1])).toBe('plain\n')
  })

  test('a condition inside an inset passage travels with it', () => {
    const docs: any[] = [
      doc(
        'frag.md',
        '# F\n\n<!--{ "only": "book" }-->\n\nbook line\n\n<!--{ "end": "only" }-->\n'
      ),
      doc('host.md', '# H\n\n<!--{ "inset": "frag.md" }-->\n'),
    ]
    assembleCorpus(docs)
    expect(docs[1].text).not.toContain('book line')
    expect(docs[1].bookText).toContain('book line')
  })
})

test('single-sourcing directives are told apart from doc metadata', () => {
  expect(isSingleSourceDirective('{ "inset": "a.md" }')).toBe(true)
  expect(isSingleSourceDirective('{ "only": "book" }')).toBe(true)
  expect(isSingleSourceDirective('{ "end": "only" }')).toBe(true)
  expect(isSingleSourceDirective('{ "order": 2 }')).toBe(false)
  expect(isSingleSourceDirective('{ not json')).toBe(false)
})

describe('per-volume placement', () => {
  const corpus: any[] = [
    { filename: 'part-2.md', title: 'For programmers', book: 'language' },
    {
      filename: 'for-ts.md',
      title: 'TJS for TS',
      order: 5,
      placement: { language: { parent: 'for-programmers', order: 20 } },
    },
    { filename: 'other.md', title: 'Other' },
  ]
  const slugs = buildSlugMap(corpus)

  test('naming a volume in placement binds the doc into it, beside its own books', () => {
    const parts = partitionByBook(corpus, slugs)
    expect(parts.get('language')!.map((d) => d.filename)).toEqual([
      'part-2.md',
      'for-ts.md',
    ])
    expect(parts.get('')!.map((d) => d.filename)).toEqual([
      'for-ts.md',
      'other.md',
    ])
  })

  test('the overlay applies in that volume only, and never mutates the corpus', () => {
    const inLanguage = placeInBook(corpus, 'language').find(
      (d) => d.filename === 'for-ts.md'
    )!
    expect(inLanguage.parent).toBe('for-programmers')
    expect(inLanguage.order).toBe(20)
    const inDefault = placeInBook(corpus, '').find(
      (d) => d.filename === 'for-ts.md'
    )!
    expect(inDefault.parent).toBeUndefined()
    expect(inDefault.order).toBe(5)
    expect(corpus[1].order).toBe(5)
  })

  test('a placement sets its four fields and nothing else', () => {
    const docs: any[] = [
      {
        filename: 'a.md',
        title: 'A',
        text: 'real',
        placement: {
          language: { title: 'B', text: 'smuggled', hidden: false },
        },
      },
    ]
    const placed: any = placeInBook(docs, 'language')[0]
    expect(placed.title).toBe('B')
    expect(placed.text).toBe('real')
    expect(placed.hidden).toBeUndefined()
  })

  test('"default" places a doc in the main volume', () => {
    const docs: any[] = [
      { filename: 'a.md', title: 'A', placement: { default: { order: 9 } } },
    ]
    expect(placeInBook(docs, '')[0].order).toBe(9)
  })

  test("a doc's own book: none still withholds it", () => {
    const docs = [
      {
        filename: 'a.md',
        title: 'A',
        book: 'none',
        placement: { language: { order: 1 } },
      },
    ]
    expect(partitionByBook(docs, buildSlugMap(docs)).size).toBe(0)
  })
})

test('extraction assembles the corpus: fragment file, section inset, condition, metadata', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'single-source-'))
  try {
    // Opens with an inset and has no metadata of its own.
    fs.writeFileSync(
      path.join(dir, 'intro.md'),
      '<!--{ "inset": "_how.md" }-->\n\n# Intro\n\n<!--{ "inset": "install.md#with-bun" }-->\n\n' +
        '<!--{ "only": "book" }-->\n\nRuns in the online edition.\n\n<!--{ "end": "only" }-->\n'
    )
    fs.writeFileSync(
      path.join(dir, 'install.md'),
      '<!--{ "order": 2 }-->\n# Install\n\n## With bun\n\n```js\nconsole.log("bun")\n```\n'
    )
    // Not a page (leading underscore), still a source.
    fs.writeFileSync(
      path.join(dir, '_how.md'),
      '# How\n\nExamples run in the page.\n'
    )
    const docs = extractDocs({ paths: [dir] }) as any[]
    expect(docs.map((d) => d.filename).sort()).toEqual([
      'install.md',
      'intro.md',
    ])
    const intro = docs.find((d) => d.filename === 'intro.md')
    expect(intro.title).toBe('Intro')
    expect(intro.inset).toBeUndefined()
    expect(intro.text).toContain('Examples run in the page.')
    expect(intro.text).toContain('```js\nconsole.log("bun")\n```')
    expect(intro.text).not.toContain('online edition')
    expect(intro.bookText).toContain('Runs in the online edition.')
    // The source page keeps its own metadata.
    expect(docs.find((d) => d.filename === 'install.md').order).toBe(2)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
