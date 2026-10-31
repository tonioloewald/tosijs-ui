import { test, expect, describe } from 'bun:test'
import {
  entriesFromCorpus,
  generateLlmsFullTxt,
  generateLlmsTxt,
} from './make-llms-txt.js'
import { buildSlugMap, pathForSlug, withBase } from '../routing.js'
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const corpus = [
  { filename: 'README.md', title: 'Home', text: 'Welcome to the project.\n' },
  {
    filename: 'button.ts',
    title: 'button',
    text: '# button\n\nA nice button.\n',
    description: '',
  },
  {
    filename: 'guide.md',
    title: 'Guide',
    description: 'How to use it.',
    text: '',
  },
  { filename: 'secret.md', title: 'Secret', text: 'hidden', hidden: true },
  { filename: 'untitled.md', title: '', text: 'no title here' },
  { filename: 'demo.md', title: 'Demo', text: 'a fixture', noindex: true },
]

test('indexes every titled, non-hidden, indexable doc — .md AND .ts', () => {
  const entries = entriesFromCorpus(corpus, { baseUrl: 'https://x.dev' })
  // hidden, noindex and untitled excluded; .md docs included (the old src/*.ts scan missed these)
  expect(entries.map((e) => e.title)).toEqual(['button', 'Guide', 'Home'])
})

test('links to rendered URLs (README -> root), absolute under baseUrl', () => {
  const entries = entriesFromCorpus(corpus, { baseUrl: 'https://x.dev/' })
  expect(entries.find((e) => e.title === 'Home')!.link).toBe('https://x.dev/')
  expect(entries.find((e) => e.title === 'button')!.link).toBe(
    'https://x.dev/button/'
  )
})

test('links are root-relative when no baseUrl is set', () => {
  const entries = entriesFromCorpus(corpus, {})
  expect(entries.find((e) => e.title === 'button')!.link).toBe('/button/')
})

test('description prefers metadata, else first prose line of the doc', () => {
  const entries = entriesFromCorpus(corpus, {})
  expect(entries.find((e) => e.title === 'Guide')!.description).toBe(
    'How to use it.'
  )
  expect(entries.find((e) => e.title === 'button')!.description).toBe(
    'A nice button.'
  )
})

// ── the agent-affordance note (tosijs-ui#18) ─────────────────────────────────

function written(meta: Record<string, unknown>): string {
  const out = join(mkdtempSync(join(tmpdir(), 'llms-')), 'llms.txt')
  generateLlmsTxt(out, meta, corpus)
  return readFileSync(out, 'utf8')
}

test('the index says nothing about developing the site, whatever the config', () => {
  // llms.txt is read by whoever CONSUMES the library. How to run and drive the project's
  // own dev server belongs in the project's agent instructions, not here.
  const text = written({ name: 'x', haltijaDev: true })
  expect(text).not.toContain('bun start')
  expect(text).not.toContain('hj ')
})

/*
`baseUrl` meant two different things (#144).

`generate-site` emitted `baseUrl + withBase(basePath, path)` — origin only — while this module
emitted `baseUrl + path` with no basePath at all. On a GitHub project page NO configuration
satisfied both: an origin-only `baseUrl` dropped `/repo` from every llms.txt link, and an
origin+path `baseUrl` doubled it in every canonical URL and sitemap entry. The reporter's site
shipped to Pages before anyone noticed, because `basePath` affects metadata only — the site
itself works, with assets resolving relative.

There were also TWO copies of `withBase` (generate-site, epub — the latter commented "mirrors
generate-site's withBase") and this third consumer with none. One rule, three implementations,
one of them the empty one.
*/
describe('#144: llms.txt links respect basePath', () => {
  const corpus = [
    { filename: 'README.md', title: 'Home', text: 'x' },
    { filename: 'widget.ts', title: 'Widget', text: 'y' },
  ] as Parameters<typeof entriesFromCorpus>[0]

  test('a project page gets the mount path, exactly once', () => {
    const links = entriesFromCorpus(corpus, {
      baseUrl: 'https://tonioloewald.github.io',
      basePath: '/tosijs-editor/',
    }).map((e) => e.link)
    for (const link of links) {
      expect(
        link.startsWith('https://tonioloewald.github.io/tosijs-editor')
      ).toBe(true)
      // The doubling this was reported for, from the other side.
      expect(link).not.toContain('/tosijs-editor/tosijs-editor')
    }
  })

  test('these are the SAME URLs generate-site emits as canonical', () => {
    // The whole defect was these two disagreeing, so assert the agreement directly.
    const meta = { baseUrl: 'https://x.dev', basePath: '/repo/' }
    const slugMap = buildSlugMap(corpus)
    for (const entry of entriesFromCorpus(corpus, meta)) {
      const doc = corpus.find((d) => d.title === entry.title)!
      const canonical =
        meta.baseUrl +
        withBase(meta.basePath, pathForSlug(slugMap[doc.filename]))
      expect(entry.link).toBe(canonical)
    }
  })

  test('no basePath is unchanged — the common case must not move', () => {
    const [home] = entriesFromCorpus(corpus, {
      baseUrl: 'https://ui.tosijs.net',
    })
    expect(home.link).toBe('https://ui.tosijs.net/')
  })
})

test("the index links each page's markdown copy", () => {
  expect(written({ name: 'x' })).toContain('- [button](/button/index.md)')
})

test('…and does not when the site ships HTML only', () => {
  // Pointing a reader at a file that is not there costs more than not mentioning it.
  expect(written({ name: 'x', markdownPages: false })).not.toContain('index.md')
})

/*
#3564: llms.txt in the llmstxt.org shape. It was a bare-URL list sorted by title, which reads a
book's chapters out of order, and linked the HTML when every page has a markdown copy.
*/
describe('#3564: the llmstxt.org shape', () => {
  const book = [
    {
      filename: 'intro.md',
      title: 'Introduction',
      text: '# Introduction\n\nWhere it starts.',
      order: 1,
    },
    {
      filename: 'zebra.md',
      title: 'A zebra',
      text: '# A zebra\n\nStriped.',
      order: 2,
    },
    {
      filename: 'parts.md',
      title: 'Parts',
      text: '# Parts\n\nThe parts.',
      order: 3,
    },
    {
      filename: 'gear.md',
      title: 'Gear',
      text: '# Gear\n\nTeeth.',
      parent: 'Parts',
    },
    {
      filename: 'axle.md',
      title: 'Axle',
      text: '# Axle\n\nTurns.',
      parent: 'Parts',
    },
    { filename: 'quiet.md', title: 'Quiet', text: 'x', noindex: true },
  ]

  test('entries are in nav order, not by title', () => {
    expect(entriesFromCorpus(book, {}).map((e) => e.title)).toEqual([
      'Introduction',
      'A zebra',
      'Parts',
      'Axle',
      'Gear',
    ])
  })

  test('H1, summary blockquote, then sections of [title](markdown url): description', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'llms-')), 'llms.txt')
    generateLlmsTxt(
      out,
      { name: 'Book', description: 'A book.', baseUrl: 'https://b.dev' },
      book
    )
    const text = readFileSync(out, 'utf8')
    expect(text.startsWith('# Book\n\n> A book.\n')).toBe(true)
    // top-level pages are Docs; a nav section is its own section, the section page first
    expect(text).toContain(
      '## Docs\n\n' +
        '- [Introduction](https://b.dev/intro/index.md): Where it starts.\n' +
        '- [A zebra](https://b.dev/zebra/index.md): Striped.\n\n' +
        '## Parts\n\n' +
        '- [Parts](https://b.dev/parts/index.md): The parts.\n' +
        '- [Axle](https://b.dev/axle/index.md): Turns.\n' +
        '- [Gear](https://b.dev/gear/index.md): Teeth.\n'
    )
    expect(text).toContain('https://b.dev/llms-full.txt')
    expect(text).not.toContain('quiet')
  })

  test('links are the HTML pages when the site writes no markdown copies', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'llms-')), 'llms.txt')
    generateLlmsTxt(out, { name: 'Book', markdownPages: false }, book)
    const text = readFileSync(out, 'utf8')
    expect(text).toContain('- [Gear](/gear/): Teeth.')
    expect(text).not.toContain('index.md')
  })

  test('a description is one line, with the inline markdown taken out', () => {
    const [entry] = entriesFromCorpus(
      [
        {
          filename: 'a.md',
          title: 'A',
          text: '# A\n\nAn _emphatic_\n**bold** [[gear|link]].',
        },
      ],
      {}
    )
    expect(entry.description).toBe('An emphatic bold link.')
  })

  test('llms-full.txt is every indexed page, in nav order, each with its URL', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'llms-')), 'llms-full.txt')
    generateLlmsFullTxt(out, { name: 'Book', baseUrl: 'https://b.dev' }, [
      ...book,
      // a page with no heading of its own gets its title
      {
        filename: 'notes.md',
        title: 'Notes',
        text: '<!--{"order":9}-->\nJust notes.',
        order: 9,
      },
    ])
    const text = readFileSync(out, 'utf8')
    const order = [...text.matchAll(/^# (.+)$/gm)].map((m) => m[1])
    expect(order).toEqual([
      'Book',
      'Introduction',
      'A zebra',
      'Parts',
      'Axle',
      'Gear',
      'Notes',
    ])
    expect(text).toContain('Source: https://b.dev/gear/')
    expect(text).toContain('# Notes\n\nJust notes.')
    expect(text).not.toContain('<!--{')
    expect(text).not.toContain('Quiet')
  })
})
