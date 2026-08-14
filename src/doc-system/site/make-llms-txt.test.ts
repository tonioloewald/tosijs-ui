import { test, expect } from 'bun:test'
import { entriesFromCorpus, generateLlmsTxt } from './make-llms-txt.js'
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

// ── the agent-affordance note (tosijs-ui#18) ─────────────────────────────────

function written(meta: Record<string, unknown>): string {
  const out = join(mkdtempSync(join(tmpdir(), 'llms-')), 'llms.txt')
  generateLlmsTxt(out, meta, corpus)
  return readFileSync(out, 'utf8')
}

test('haltijaDev tells an agent it can drive the running page', () => {
  // The point of llms.txt is what an agent learns without reading everything. Browser
  // control was documented only inside the doc-site-system page, i.e. exactly where an
  // agent triaging some other component would never look.
  const text = written({ name: 'x', haltijaDev: true })
  expect(text).toContain('hj navigate')
  expect(text).toContain('DRIVE the live page')
})

test('REGRESSION: the note is absent when the project has NOT opted in', () => {
  // A wrong affordance costs more than a missing one — an agent told to drive a page with
  // no dev channel spends its time on a capability that will never answer.
  const text = written({ name: 'x' })
  expect(text).not.toContain('hj navigate')
  expect(text).not.toContain('DRIVE the live page')
})

test('the rAF caveat travels with the affordance, not separately', () => {
  // Without it an agent concludes "the component does not render" from an hj eval that was
  // never going to paint — the exact wrong conclusion this project has drawn before.
  const text = written({ name: 'x', haltijaDev: true })
  expect(text).toContain('requestAnimationFrame')
})
