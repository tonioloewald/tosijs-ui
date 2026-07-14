import { test, expect } from 'bun:test'
import { findOutputDirOverlap } from './output-guard'

test('the default config (src + README.md vs docs) does not overlap', () => {
  expect(findOutputDirOverlap(['src', 'README.md'], 'docs')).toBe(null)
})

test('exact match overlaps (docs source, docs output — the reported bug)', () => {
  expect(findOutputDirOverlap(['docs'], 'docs')).toBe('docs')
})

test('a source dir nested in the output dir overlaps', () => {
  expect(findOutputDirOverlap(['docs/api'], 'docs')).toBe('docs/api')
})

test('an output dir nested in a source dir overlaps', () => {
  expect(findOutputDirOverlap(['docs'], 'docs/site')).toBe('docs')
})

test('a shared name prefix is NOT an overlap (docs vs docs-site)', () => {
  expect(findOutputDirOverlap(['docs-site'], 'docs')).toBe(null)
  expect(findOutputDirOverlap(['docs'], 'docs-site')).toBe(null)
})

test('a file docPath never overlaps a directory', () => {
  expect(findOutputDirOverlap(['README.md'], 'docs')).toBe(null)
})

test('returns the first offending docPath', () => {
  expect(findOutputDirOverlap(['src', 'docs', 'README.md'], 'docs')).toBe(
    'docs'
  )
})
