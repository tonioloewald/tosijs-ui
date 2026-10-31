import { test, expect, describe } from 'bun:test'
import {
  lintMetadata,
  metadataReport,
  pageDescription,
  type MetadataDoc,
} from './page-metadata.js'

const long = (n: number) => 'Word '.repeat(n).trim() + '.'
const good =
  'Pop a menu anywhere, including nested menus and drag-to-drop menus, from one array.'

describe('pageDescription: one rule for the head, llms.txt and the lint', () => {
  test("the page's own description wins, then its first paragraph, then the site's", () => {
    const doc = { filename: 'a.md', title: 'A', text: '# A\n\nFirst para.' }
    expect(pageDescription({ ...doc, description: 'Mine.' })).toEqual({
      text: 'Mine.',
      source: 'metadata',
      cut: false,
    })
    expect(pageDescription(doc).text).toBe('First para.')
    expect(pageDescription(doc).source).toBe('derived')
    expect(pageDescription({ ...doc, text: '# A' }, 'Site.').source).toBe(
      'site'
    )
    expect(pageDescription({ ...doc, text: '# A' }).source).toBe('none')
  })

  test('a derived description loses its inline markdown (Learn 3D leaked _emphasis_)', () => {
    const text =
      '# A\n\nThe _scene_ is __bold__, ~~gone~~, [[gear|linked]] and [[axle]][^1].'
    expect(pageDescription({ filename: 'a.md', title: 'A', text }).text).toBe(
      'The scene is bold, gone, linked and axle.'
    )
  })

  test('snake_case and a lone underscore survive', () => {
    const text = '# A\n\nSet max_count and min_count, or _ to skip.'
    expect(pageDescription({ filename: 'a.md', title: 'A', text }).text).toBe(
      'Set max_count and min_count, or _ to skip.'
    )
  })

  test('a paragraph cut mid-sentence is marked cut; one cut at a sentence end is not', () => {
    const cut = pageDescription({
      filename: 'a.md',
      title: 'A',
      text: long(60),
    })
    expect(cut.cut).toBe(true)
    expect(cut.text.endsWith('…')).toBe(true)
    expect(cut.text.length).toBeLessThanOrEqual(155)
    const clean = pageDescription({
      filename: 'a.md',
      title: 'A',
      text: `${long(20)} ${long(40)}`,
    })
    expect(clean.cut).toBe(false)
    expect(clean.text).toBe(long(20))
  })
})

describe('lintMetadata (#3563)', () => {
  const page = (filename: string, extra: Partial<MetadataDoc> = {}) => ({
    filename,
    title: `The ${filename} page, properly titled`,
    description: `${good} (${filename})`,
    text: '',
    ...extra,
  })
  const problems = (docs: MetadataDoc[], site = {}) =>
    lintMetadata(docs, site).map((f) => `${f.page}: ${f.problem}`)

  test('a page with a good title and description passes', () => {
    expect(problems([page('a.md'), page('b.md')])).toEqual([])
  })

  test('hidden and noindex pages are not linted', () => {
    expect(
      problems([
        page('a.md', { hidden: true, description: 'x' }),
        page('b.md', { noindex: true, title: 'x' }),
      ])
    ).toEqual([])
  })

  test('short, long and cut descriptions', () => {
    expect(
      problems([
        page('short.md', { description: 'A mapboxgl wrapper.' }),
        page('long.md', { description: long(40) }),
        page('cut.md', { description: '', text: long(60) }),
      ])
    ).toEqual([
      'short.md: description under 70 characters',
      'long.md: description over 155 characters (search results cut it)',
      'cut.md: description derived from a first paragraph that had to be cut at 155 characters',
    ])
  })

  test('no description of its own, whether or not the site has one', () => {
    expect(
      problems([page('a.md', { description: '' })], { description: 'Site.' })
    ).toEqual([
      'a.md: no description of its own (it gets the site description)',
    ])
    expect(problems([page('a.md', { description: '' })])).toEqual([
      'a.md: no description, and no first paragraph to derive one from',
    ])
  })

  test('titles: missing, short and long, counted with the project suffix', () => {
    expect(
      problems(
        [
          page('none.md', { title: '' }),
          page('map.md', { title: 'map' }),
          page('named.md', {
            title: 'map',
            headTitle: 'Mapbox GL map component',
          }),
          page('long.md', { title: long(12) }),
        ],
        { projectName: 'tosijs-ui' }
      )
    ).toEqual([
      'none.md: no title',
      'map.md: title under 20 characters (name what a reader searches for; `headTitle` sets only the <title>)',
      'long.md: title over 60 characters (search results cut it)',
    ])
  })

  test('a title or description shared between pages is reported on each', () => {
    expect(
      problems([
        page('a.md', { title: 'An example page, titled', description: good }),
        page('b.md', { title: 'an example page, titled', description: good }),
      ])
    ).toEqual([
      'a.md: title shared with another page',
      'b.md: title shared with another page',
      'a.md: description shared with another page',
      'b.md: description shared with another page',
    ])
  })

  test('findings name the source file when the doc has one', () => {
    expect(
      problems([
        page('menu.ts', { path: 'src/menu.ts', description: 'Short.' }),
      ])
    ).toEqual(['src/menu.ts: description under 70 characters'])
  })

  test('the report groups pages by problem, and is empty when there are none', () => {
    expect(metadataReport([], 3)).toBe('')
    const report = metadataReport(
      lintMetadata([
        page('a.md', { description: 'Short.' }),
        page('b.md', { description: 'Also short.' }),
      ]),
      2
    )
    expect(report).toContain('2 of 2 page(s)')
    expect(report).toContain(
      'description under 70 characters (2):\n      a.md, b.md'
    )
  })
})
