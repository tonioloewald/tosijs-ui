import { test, expect } from 'bun:test'
import {
  buildSlugMap,
  pathForSlug,
  legacyQueryPath,
  rewriteDocLinks,
  filenameForPath,
} from './routing.js'

const docs = [
  { filename: 'README.md' },
  { filename: 'foo.ts' },
  { filename: 'bar.ts' },
  { filename: 'bar.css' }, // collides with bar.ts -> bar-ts / bar-css
]
const slugMap = buildSlugMap(docs)

test('pathForSlug: root and nested', () => {
  expect(pathForSlug('')).toBe('/')
  expect(pathForSlug('foo')).toBe('/foo/')
})

test('legacy ?foo.ts -> /foo/', () => {
  expect(legacyQueryPath('?foo.ts', slugMap)).toBe('/foo/')
})

test('legacy ?README.md -> / (root)', () => {
  expect(legacyQueryPath('?README.md', slugMap)).toBe('/')
})

test('legacy redirect resolves collisions via the slug map', () => {
  expect(legacyQueryPath('?bar.ts', slugMap)).toBe('/bar-ts/')
  expect(legacyQueryPath('?bar.css', slugMap)).toBe('/bar-css/')
})

test('url-encoded legacy filename', () => {
  expect(legacyQueryPath('?' + encodeURIComponent('foo.ts'), slugMap)).toBe(
    '/foo/'
  )
})

test('real query strings (key=value) are not treated as legacy', () => {
  expect(legacyQueryPath('?x=1', slugMap)).toBe(null)
  expect(legacyQueryPath('?foo.ts&utm=1', slugMap)).toBe(null)
})

test('unknown filename and empty search -> null', () => {
  expect(legacyQueryPath('?nope.ts', slugMap)).toBe(null)
  expect(legacyQueryPath('', slugMap)).toBe(null)
})

const hrefFor = (filename: string): string | null =>
  slugMap[filename] !== undefined ? pathForSlug(slugMap[filename]) : null

test('rewriteDocLinks: ?filename and /?filename -> /slug/', () => {
  expect(rewriteDocLinks('<a href="?foo.ts">foo</a>', hrefFor)).toBe(
    '<a href="/foo/">foo</a>'
  )
  expect(rewriteDocLinks('<a href="/?foo.ts">foo</a>', hrefFor)).toBe(
    '<a href="/foo/">foo</a>'
  )
})

test('rewriteDocLinks: collisions, README, and url-encoding resolve', () => {
  expect(rewriteDocLinks('<a href="?bar.css">x</a>', hrefFor)).toBe(
    '<a href="/bar-css/">x</a>'
  )
  expect(rewriteDocLinks('<a href="?README.md">home</a>', hrefFor)).toBe(
    '<a href="/">home</a>'
  )
  expect(
    rewriteDocLinks(
      '<a href="?' + encodeURIComponent('foo.ts') + '">f</a>',
      hrefFor
    )
  ).toBe('<a href="/foo/">f</a>')
})

test('rewriteDocLinks: leaves unknown, external, and real query links alone', () => {
  const unknown = '<a href="?nope.ts">x</a>'
  expect(rewriteDocLinks(unknown, hrefFor)).toBe(unknown)
  const external = '<a href="https://example.com/?foo.ts">x</a>'
  expect(rewriteDocLinks(external, hrefFor)).toBe(external) // host before ? — not href="?…"
  const realQuery = '<a href="?x=1&y=2">x</a>'
  expect(rewriteDocLinks(realQuery, hrefFor)).toBe(realQuery)
})

test('a doc marked home is the root and README moves to readme (#225)', () => {
  const map = buildSlugMap([
    { filename: 'README.md' },
    { filename: 'host.md', home: true },
    { filename: 'foo.ts' },
  ])
  expect(map['host.md']).toBe('')
  expect(map['README.md']).toBe('readme')
  expect(map['foo.ts']).toBe('foo')
})

test('two docs marked home leave README at the root rather than share it', () => {
  // The build refuses this corpus; the runtime must still not give two docs '/'.
  const map = buildSlugMap([
    { filename: 'README.md' },
    { filename: 'a.md', home: true },
    { filename: 'b.md', home: true },
  ])
  expect(map['README.md']).toBe('')
  expect(map['a.md']).toBe('a')
  expect(map['b.md']).toBe('b')
})

test('filenameForPath: an alias opens its page, and never takes a page’s own path (#3513)', () => {
  const slugMap = { 'README.md': '', 'guide.md': 'guide' }
  expect(filenameForPath('/readme/', slugMap, { readme: '' })).toBe('README.md')
  expect(filenameForPath('/readme/', slugMap)).toBe('')
  expect(filenameForPath('/guide/', slugMap, { guide: '' })).toBe('guide.md')
  expect(filenameForPath('/constructor/', slugMap, {})).toBe('')
})
