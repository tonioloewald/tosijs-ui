import { test, expect } from 'bun:test'
import { findOutputDirOverlap } from './output-guard.js'

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

// ── where the hydration bundle is built (tosijs-ui#69) ───────────────────────

import { resolveBundleDir } from './output-guard'

test('REGRESSION: the bundle defaults to the SITE output, not the library tree', () => {
  /*
  It was built into `dist` unconditionally — the directory `emitLibrary` writes the library
  to — and only the `.js` was copied across, so the sourcemap stayed behind in a tree the
  project publishes to npm and commits to git, never served and unreachable by any consumer.
  One adopter carried `iife.js.map` at 65 MiB over 216 packed blobs, ~35% of their whole
  packed blob store, for a file nothing could ever load.
  */
  const { dir } = resolveBundleDir(undefined, '/proj/docs', '/proj')
  expect(dir).toBe('/proj/docs')
  expect(dir).not.toContain('dist')
})

test('no copy when the bundle is already in the site output', () => {
  // `cp x x` TRUNCATES, so a copy-onto-itself would ship an empty bundle — the failure
  // would be a blank site, not an error.
  expect(resolveBundleDir(undefined, '/proj/docs', '/proj').copyToPublic).toBe(
    false
  )
})

test('bundleOutDir opts a published bundle back into its own directory', () => {
  // tosijs-ui itself: `dist/iife.js` is the CDN <script> target on unpkg/jsdelivr.
  const { dir, copyToPublic } = resolveBundleDir('dist', '/proj/docs', '/proj')
  expect(dir).toBe('/proj/dist')
  expect(copyToPublic).toBe(true)
})

test('bundleOutDir is resolved against the project root, not the cwd', () => {
  expect(resolveBundleDir('build/cdn', '/proj/docs', '/proj').dir).toBe(
    '/proj/build/cdn'
  )
})

test('an absolute bundleOutDir is honoured as given', () => {
  expect(resolveBundleDir('/elsewhere', '/proj/docs', '/proj').dir).toBe(
    '/elsewhere'
  )
})

test('naming the site output explicitly still avoids the self-copy', () => {
  // A config that spells out what the default already does must not truncate its bundle.
  expect(resolveBundleDir('docs', '/proj/docs', '/proj').copyToPublic).toBe(
    false
  )
})
