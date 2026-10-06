import { test, expect, describe } from 'bun:test'
import { entriesFromCorpus, generateLlmsTxt } from './make-llms-txt.js'
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

test('the index says pages are also available as markdown', () => {
  expect(written({ name: 'x' })).toContain('append `index.md`')
})

test('…and does not when the site ships HTML only', () => {
  // Pointing a reader at a file that is not there costs more than not mentioning it.
  expect(written({ name: 'x', markdownPages: false })).not.toContain('index.md')
})
