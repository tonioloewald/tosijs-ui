import { test, expect } from 'bun:test'
import { buildDocIndex, searchDocs, docHeadings } from './doc-search.js'

const docs = [
  {
    filename: 'README.md',
    title: 'tosijs-ui',
    text: '# tosijs-ui\n\nA library. The select component is mentioned here.',
  },
  {
    filename: 'menu.ts',
    title: 'menu',
    text: '# menu\n\nMenus. You can select an item.\n\n## Drop menus\n\nDrag onto it.',
  },
  {
    filename: 'select.ts',
    title: 'select',
    text: '# select\n\nA select field.\n\n## Options\n\nChoose one.',
  },
  {
    filename: 'theme.ts',
    title: 'theme',
    description: 'Colours and metrics',
    keywords: 'dark mode, palette',
    text: '# theme\n\n## Dark mode\n\nRecompute from brand colours.',
  },
  { filename: 'secret.md', title: 'select secrets', text: 'x', hidden: true },
]
const index = buildDocIndex(docs)
const titles = (q: string) => searchDocs(index, q).map((h) => h.doc.title)

test('the page whose title is the query comes first, ahead of pages that mention it', () => {
  expect(titles('select')[0]).toBe('select')
  expect(titles('select')).toContain('menu')
  expect(titles('select')).toContain('tosijs-ui')
})

test('a prefix of a title word ranks above a mention in the body', () => {
  expect(titles('sel')[0]).toBe('select')
})

test('every word must match somewhere', () => {
  expect(titles('select drag')).toEqual(['menu'])
  expect(titles('select zebra')).toEqual([])
})

test('keywords and description count, and hidden pages are never listed', () => {
  expect(titles('palette')).toEqual(['theme'])
  expect(titles('metrics')).toEqual(['theme'])
  expect(titles('secrets')).toEqual([])
})

test('a heading that matched, where the title did not, becomes a deep link with the rendered id', () => {
  const [hit] = searchDocs(index, 'drop')
  expect(hit.doc.title).toBe('menu')
  expect(hit.heading).toEqual({
    text: 'Drop menus',
    id: 'drop-menus',
    depth: 2,
  })
  // the title matched: no deep link needed
  expect(searchDocs(index, 'select')[0].heading).toBeUndefined()
})

test('a description is the snippet when a page has one; otherwise the line around the match', () => {
  expect(searchDocs(index, 'dark')[0].snippet).toBe('Colours and metrics')
  expect(searchDocs(index, 'drag')[0].snippet).toContain('Drag onto it')
})

test('heading ids repeat the way the renderer numbers them', () => {
  expect(docHeadings('# A\n\n## Usage\n\n## Usage').map((h) => h.id)).toEqual([
    'a',
    'usage',
    'usage-1',
  ])
})

test('an empty query finds nothing', () => {
  expect(searchDocs(index, '   ')).toEqual([])
})

test('a word matches the start of a word, never the middle ("date" is not in "update")', () => {
  const index = buildDocIndex([
    {
      filename: 'a',
      title: 'localize',
      text: '## Automatic Updates\n\nIt updates.',
    },
    { filename: 'b', title: 'month', text: 'Pick a date. The date is today.' },
  ])
  expect(searchDocs(index, 'date').map((h) => h.doc.title)).toEqual(['month'])
})

test('a page that uses a word often outranks one that mentions it once', () => {
  const index = buildDocIndex([
    { filename: 'a', title: 'aside', text: 'One date here.' },
    { filename: 'b', title: 'calendar', text: 'date '.repeat(20) },
  ])
  expect(searchDocs(index, 'date')[0].doc.title).toBe('calendar')
})

test('a whole word outranks a prefix, in code too', () => {
  const index = buildDocIndex([
    {
      filename: 'a',
      title: 'prose',
      text: 'Our datebook lists datelines and datestamps.',
    },
    { filename: 'b', title: 'code', text: '```js\nconst d = new Date()\n```' },
  ])
  expect(searchDocs(index, 'date')[0].doc.title).toBe('code')
})

test('a plural and its singular match each other as whole words, camelCase splits', () => {
  const index = buildDocIndex([
    { filename: 'a', title: 'icons', text: 'x' },
    { filename: 'b', title: 'trackDrag', text: 'x' },
  ])
  expect(searchDocs(index, 'icon')[0].score).toBeGreaterThanOrEqual(100)
  expect(searchDocs(index, 'drag').map((h) => h.doc.title)).toEqual([
    'trackDrag',
  ])
})
