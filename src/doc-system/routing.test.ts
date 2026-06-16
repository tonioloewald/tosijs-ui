import { test, expect } from 'bun:test'
import { buildSlugMap, pathForSlug, legacyQueryPath } from './routing'

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
