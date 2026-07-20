import { test, expect } from 'bun:test'
import { entriesFromCorpus } from './make-llms-txt'

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
]

test('indexes every titled, non-hidden doc — .md AND .ts — sorted by title', () => {
  const entries = entriesFromCorpus(corpus, { baseUrl: 'https://x.dev' })
  // hidden + untitled excluded; .md docs included (the old src/*.ts scan missed these)
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
