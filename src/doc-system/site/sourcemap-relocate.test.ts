import { test, expect } from 'bun:test'
import { relocateSources } from './sourcemap-relocate.js'

test('a source keeps pointing at the same file after its map moves', () => {
  // built at /p/node_modules/.cache/h/_chunks, served from /p/docs/_chunks
  expect(
    relocateSources(
      ['../../../tosijs/dist/module.js', '../../../../src/code-editor-cm.ts'],
      '/p/node_modules/.cache/h/_chunks',
      '/p/docs/_chunks'
    )
  ).toEqual([
    '../../node_modules/tosijs/dist/module.js',
    '../../src/code-editor-cm.ts',
  ])
})

test('virtual sources are left alone', () => {
  expect(relocateSources(['bun:wrap', 'data:x'], '/a', '/b')).toEqual([
    'bun:wrap',
    'data:x',
  ])
})
