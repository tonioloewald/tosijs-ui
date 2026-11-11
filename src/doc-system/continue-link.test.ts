import { test, expect, describe } from 'bun:test'
import { buildSlugMap } from './routing.js'
import { buildNavTree, NavDoc } from './nav-tree.js'
import { continueLinkHtml, continueTarget } from './continue-link.js'

/*
#255: a section read in order ends each page with a link to the next one.
*/
const docs: NavDoc[] = [
  { filename: 'README.md', title: 'Home', pin: 'top' },
  { filename: 'learn.md', title: 'Learn', order: 1, continue: true },
  { filename: 'values.md', title: 'Values', parent: 'Learn', order: 1 },
  { filename: 'functions.md', title: 'Functions', parent: 'Learn', order: 2 },
  // a chapter that is itself a sequence: the outer one still decides
  {
    filename: 'loops.md',
    title: 'Loops',
    parent: 'Learn',
    order: 3,
    continue: true,
  },
  { filename: 'while.md', title: 'While', parent: 'Loops' },
  { filename: 'objects.md', title: 'Objects', parent: 'Learn', order: 4 },
  { filename: 'reference.md', title: 'Reference', order: 2 },
  { filename: 'api.md', title: 'API', parent: 'Reference' },
]
const roots = buildNavTree(docs, buildSlugMap(docs))
const next = (filename: string) => continueTarget(roots, filename)?.doc.filename

describe('continueTarget', () => {
  test('the section page continues to its first page, each page to the next', () => {
    expect(next('learn.md')).toBe('values.md')
    expect(next('values.md')).toBe('functions.md')
    expect(next('functions.md')).toBe('loops.md')
  })

  test('a nested section reads straight through to the next chapter', () => {
    expect(next('loops.md')).toBe('while.md')
    expect(next('while.md')).toBe('objects.md')
  })

  test('the last page, and pages outside a sequence, get nothing', () => {
    expect(next('objects.md')).toBeUndefined()
    expect(next('README.md')).toBeUndefined()
    expect(next('reference.md')).toBeUndefined()
    expect(next('api.md')).toBeUndefined()
    expect(next('missing.md')).toBeUndefined()
  })
})

test('continueLinkHtml escapes the title and href', () => {
  expect(continueLinkHtml('../a"b/', 'Fish & <Chips>')).toBe(
    '<p class="doc-continue"><a href="../a&quot;b/" rel="next">' +
      '<tosi-localized>Continue</tosi-localized>: Fish &amp; &lt;Chips&gt;' +
      ' <span aria-hidden="true">→</span></a></p>'
  )
})
