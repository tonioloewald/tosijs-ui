import { test, expect } from 'bun:test'
import {
  DEFAULT_BOOK,
  chain,
  resolveBook,
  isHidden,
  withoutHidden,
  partitionByBook,
  namedBooks,
} from './book-target'

type D = {
  filename: string
  title?: string
  parent?: string
  book?: string
  hidden?: boolean
}

const doc = (filename: string, extra: Partial<D> = {}): D => ({
  filename,
  ...extra,
})

// ── book targeting ───────────────────────────────────────────────────────────

test('no book anywhere means the default book', () => {
  const docs = [doc('a.md')]
  expect(resolveBook(docs[0], docs)).toBe(DEFAULT_BOOK)
})

test('a named book puts the doc in that book', () => {
  const docs = [doc('a.md', { book: 'appendices' })]
  expect(resolveBook(docs[0], docs)).toBe('appendices')
})

test('"none" excludes the doc from every book', () => {
  const docs = [doc('a.md', { book: 'none' })]
  expect(resolveBook(docs[0], docs)).toBe(null)
  // case-insensitive: "None" is the same intent
  const docs2 = [doc('a.md', { book: 'None' })]
  expect(resolveBook(docs2[0], docs2)).toBe(null)
})

test('a child inherits its parent’s book', () => {
  const docs = [
    doc('vol.md', { book: 'volume-two' }),
    doc('ch.md', { parent: 'vol.md' }),
  ]
  expect(resolveBook(docs[1], docs)).toBe('volume-two')
})

test('inheritance is recursive through grandparents', () => {
  const docs = [
    doc('vol.md', { book: 'volume-two' }),
    doc('part.md', { parent: 'vol.md' }),
    doc('ch.md', { parent: 'part.md' }),
  ]
  expect(resolveBook(docs[2], docs)).toBe('volume-two')
})

test('the NEAREST declaration wins — a child can divert or opt out', () => {
  const docs = [
    doc('vol.md', { book: 'volume-two' }),
    doc('moved.md', { parent: 'vol.md', book: 'volume-three' }),
    // the case that matters: one unfinished chapter of a published section
    doc('unbound.md', { parent: 'vol.md', book: 'none' }),
  ]
  expect(resolveBook(docs[1], docs)).toBe('volume-three')
  expect(resolveBook(docs[2], docs)).toBe(null)
})

test('a parent that cannot be resolved falls back to the default book', () => {
  const docs = [doc('orphan.md', { parent: 'does-not-exist' })]
  expect(resolveBook(docs[0], docs)).toBe(DEFAULT_BOOK)
})

test('parent may be given as a slug or a slugified title', () => {
  const docs = [
    doc('Volume Two.md', { title: 'Volume Two', book: 'vol2' }),
    doc('ch.md', { parent: 'volume-two' }),
  ]
  expect(resolveBook(docs[1], docs)).toBe('vol2')
})

// ── hidden ───────────────────────────────────────────────────────────────────

test('hidden hides the doc', () => {
  const docs = [doc('a.md', { hidden: true })]
  expect(isHidden(docs[0], docs)).toBe(true)
})

test('hiding a section hides everything inside it, recursively', () => {
  // The whole point: "hide this unfinished part" must not publish every chapter of it.
  const docs = [
    doc('part.md', { hidden: true }),
    doc('ch.md', { parent: 'part.md' }),
    doc('sub.md', { parent: 'ch.md' }),
    doc('elsewhere.md'),
  ]
  expect(withoutHidden(docs).map((d) => d.filename)).toEqual(['elsewhere.md'])
})

test('a child cannot un-hide itself from a hidden parent', () => {
  // hidden is a floor, not a nearest-wins value: publishing a chapter of a withheld
  // section by accident is the failure that matters.
  const docs = [
    doc('part.md', { hidden: true }),
    doc('ch.md', { parent: 'part.md', hidden: false }),
  ]
  expect(isHidden(docs[1], docs)).toBe(true)
})

test('hidden docs are in no book, whatever their book says', () => {
  const docs = [
    doc('a.md', { hidden: true, book: 'appendices' }),
    doc('b.md', { book: 'appendices' }),
  ]
  const parts = partitionByBook(docs)
  expect(parts.get('appendices')!.map((d) => d.filename)).toEqual(['b.md'])
})

// ── partitioning ─────────────────────────────────────────────────────────────

test('partition separates the default book, named books, and none', () => {
  const docs = [
    doc('intro.md'),
    doc('ch1.md'),
    doc('app.md', { book: 'appendices' }),
    doc('notes.md', { book: 'none' }),
  ]
  const parts = partitionByBook(docs)
  expect(parts.get(DEFAULT_BOOK)!.map((d) => d.filename)).toEqual([
    'intro.md',
    'ch1.md',
  ])
  expect(parts.get('appendices')!.map((d) => d.filename)).toEqual(['app.md'])
  expect([...parts.keys()]).not.toContain('none')
  expect(namedBooks(docs)).toEqual(['appendices'])
})

test('input order is preserved within each book', () => {
  const docs = [doc('c.md'), doc('a.md'), doc('b.md')]
  expect(partitionByBook(docs).get(DEFAULT_BOOK)!.map((d) => d.filename)).toEqual(
    ['c.md', 'a.md', 'b.md']
  )
})

// ── robustness ───────────────────────────────────────────────────────────────

test('a self-parented doc does not hang', () => {
  const docs = [doc('a.md', { parent: 'a.md' })]
  expect(chain(docs[0], docs).map((d) => d.filename)).toEqual(['a.md'])
  expect(resolveBook(docs[0], docs)).toBe(DEFAULT_BOOK)
})

test('a parent cycle does not hang', () => {
  const docs = [
    doc('a.md', { parent: 'b.md' }),
    doc('b.md', { parent: 'a.md', book: 'looped' }),
  ]
  expect(resolveBook(docs[0], docs)).toBe('looped')
  expect(chain(docs[0], docs)).toHaveLength(2)
})

test('an empty book string is treated as unset, not as a book named ""', () => {
  const docs = [doc('sec.md', { book: 'vol2' }), doc('a.md', { parent: 'sec.md', book: '' })]
  expect(resolveBook(docs[1], docs)).toBe('vol2')
})
