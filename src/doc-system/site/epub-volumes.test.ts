import { test, expect } from 'bun:test'
import {
  epubVolumeIdentity,
  listEpubVolumes,
  renderEpubDownloads,
} from './epub-volumes'

const cfg = { name: 'foresight-rpg' }

test('the default volume is named after the project', () => {
  const v = epubVolumeIdentity(cfg)
  expect(v).toMatchObject({
    book: '',
    title: 'foresight-rpg',
    filename: 'foresight-rpg.epub',
    url: '/foresight-rpg.epub',
  })
})

test('a named volume derives its own filename', () => {
  // This derivation is the thing consumers had to reverse-engineer and re-do by hand
  // whenever a volume was renamed.
  const v = epubVolumeIdentity(cfg, 'foresight-1986')
  expect(v.filename).toBe('foresight-rpg-foresight-1986.epub')
  expect(v.title).toBe('foresight-rpg — foresight-1986')
})

test('volumeTitles overrides the derived title but not the filename', () => {
  // The filename is an identifier; the title is for humans. Renaming the display title
  // must not move the file a published link points at.
  const v = epubVolumeIdentity(
    { ...cfg, epub: { volumeTitles: { 'foresight-1986': 'The 1986 Restoration' } } },
    'foresight-1986'
  )
  expect(v.title).toBe('The 1986 Restoration')
  expect(v.filename).toBe('foresight-rpg-foresight-1986.epub')
})

test('epub.title replaces the base for both title and filename', () => {
  const v = epubVolumeIdentity({ ...cfg, epub: { title: 'Foresight' } }, 'appendices')
  expect(v.title).toBe('Foresight — appendices')
  expect(v.filename).toBe('foresight-appendices.epub')
})

test('basePath is honoured in the URL', () => {
  expect(epubVolumeIdentity({ ...cfg, basePath: '/docs' }).url).toBe(
    '/docs/foresight-rpg.epub'
  )
  expect(epubVolumeIdentity({ ...cfg, basePath: '/' }).url).toBe(
    '/foresight-rpg.epub'
  )
})

// ── listing what a corpus will produce ───────────────────────────────────────

const doc = (filename: string, extra = {}) => ({ filename, ...extra })

test('a plain corpus produces exactly the default volume', () => {
  expect(listEpubVolumes([doc('a.md'), doc('b.md')], cfg).map((v) => v.book)).toEqual([''])
})

test('named volumes are listed after the default, and inherit through parents', () => {
  const corpus = [
    doc('intro.md'),
    doc('guide.md', { book: 'field-guide' }),
    doc('ch1.md', { parent: 'guide.md' }),
  ]
  expect(listEpubVolumes(corpus, cfg).map((v) => v.book)).toEqual([
    '',
    'field-guide',
  ])
})

test('a corpus where every doc names a volume has NO default volume', () => {
  // Building one anyway is how an empty book ships — and it would appear in the download
  // list as a link to a book with no chapters.
  const corpus = [doc('a.md', { book: 'one' }), doc('b.md', { book: 'two' })]
  expect(listEpubVolumes(corpus, cfg).map((v) => v.book)).toEqual(['one', 'two'])
})

test('a corpus with nothing publishable produces no volumes at all', () => {
  const corpus = [doc('a.md', { hidden: true }), doc('b.md', { book: 'none' })]
  expect(listEpubVolumes(corpus, cfg)).toEqual([])
})

// ── the download marker ──────────────────────────────────────────────────────

test('the marker becomes a list of every volume', () => {
  const volumes = listEpubVolumes(
    [doc('a.md'), doc('g.md', { book: 'field-guide' })],
    cfg
  )
  const out = renderEpubDownloads('Grab a book:\n\n<!-- epub-downloads -->\n', volumes)
  expect(out).toContain('[foresight-rpg](/foresight-rpg.epub)')
  expect(out).toContain(
    '[foresight-rpg — field-guide](/foresight-rpg-field-guide.epub)'
  )
  expect(out).not.toContain('epub-downloads')
})

test('whitespace inside the marker is tolerated', () => {
  const v = listEpubVolumes([doc('a.md')], cfg)
  expect(renderEpubDownloads('<!--epub-downloads-->', v)).toContain('.epub')
  expect(renderEpubDownloads('<!--   epub-downloads   -->', v)).toContain('.epub')
})

test('text without the marker is returned untouched', () => {
  const v = listEpubVolumes([doc('a.md')], cfg)
  const text = '# Page\n\nNo marker here.\n'
  expect(renderEpubDownloads(text, v)).toBe(text)
})

test('substitution is stateless across repeated calls', () => {
  /*
  Not a regression test — there was no regression. This pins the PROPERTY that repeated
  calls behave identically, since the module holds a `/g` regex whose `lastIndex` is
  shared mutable state and a future guard could genuinely make it stateful.

  Worth recording how this was established: a first version of this test claimed to catch
  a `.test()`-guard bug, and mutation testing showed it caught nothing — because
  `String.replace` with `/g` resets `lastIndex`, so the bug never existed. The test stays
  for the property; the claim about what it detects was removed.
  */
  const v = listEpubVolumes([doc('a.md')], cfg)
  const long = '<!-- epub-downloads -->\n\nmiddle\n\n<!-- epub-downloads -->'
  const short = '<!-- epub-downloads -->'
  for (let i = 0; i < 12; i++) {
    expect(renderEpubDownloads(short, v)).toContain('.epub')
    expect(renderEpubDownloads(long, v).match(/foresight-rpg\.epub/g)).toHaveLength(2)
  }
})
