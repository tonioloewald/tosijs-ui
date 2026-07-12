import { describe, expect, test } from 'bun:test'
import { selectBookDocs } from './book-manifest'

interface D {
  filename: string
  path: string
  title: string
  order?: number
}

const corpus: D[] = [
  { filename: 'README.md', path: 'README.md', title: 'Home' },
  { filename: '02-chapter-two.md', path: 'chapters/02-chapter-two.md', title: 'Two' },
  { filename: '10-chapter-ten.md', path: 'chapters/10-chapter-ten.md', title: 'Ten' },
  { filename: '01-chapter-one.md', path: 'chapters/01-chapter-one.md', title: 'One' },
  { filename: 'draft.md', path: 'drafts/draft.md', title: 'Draft' },
  { filename: 'about.md', path: 'about.md', title: 'About' },
]

// Order matters after buildNavTree sorts by `order`; here we just check the
// overlaid `order` field, which is what selectBookDocs is responsible for.
const orderOf = (docs: D[], filename: string) =>
  docs.find((d) => d.filename === filename)?.order

describe('selectBookDocs', () => {
  test('no manifest returns a copy of the whole corpus, untouched', () => {
    const out = selectBookDocs(corpus)
    expect(out).toHaveLength(corpus.length)
    expect(out).not.toBe(corpus)
    expect(out[0]).toEqual(corpus[0])
  })

  test('include globs select by path or filename', () => {
    const out = selectBookDocs(corpus, { include: ['chapters/**'] })
    expect(out.map((d) => d.filename).sort()).toEqual([
      '01-chapter-one.md',
      '02-chapter-two.md',
      '10-chapter-ten.md',
    ])
  })

  test('exclude runs after include', () => {
    const out = selectBookDocs(corpus, { exclude: ['drafts/**'] })
    expect(out.some((d) => d.filename === 'draft.md')).toBe(false)
    expect(out.some((d) => d.filename === 'about.md')).toBe(true)
  })

  test("sort: 'filename' natural-sorts (10 after 2), only filling unset order", () => {
    const out = selectBookDocs(corpus, {
      include: ['chapters/**'],
      sort: 'filename',
    })
    const one = orderOf(out, '01-chapter-one.md')!
    const two = orderOf(out, '02-chapter-two.md')!
    const ten = orderOf(out, '10-chapter-ten.md')!
    expect(one).toBeLessThan(two)
    expect(two).toBeLessThan(ten) // numeric, not lexicographic ("10" < "2")
  })

  test("sort: 'filename' does not clobber an explicit metadata order", () => {
    const withOrder = corpus.map((d) =>
      d.filename === '10-chapter-ten.md' ? { ...d, order: -5 } : d
    )
    const out = selectBookDocs(withOrder, {
      include: ['chapters/**'],
      sort: 'filename',
    })
    expect(orderOf(out, '10-chapter-ten.md')).toBe(-5)
  })

  test('order list leads in sequence and matches by filename/basename/title', () => {
    const out = selectBookDocs(corpus, {
      order: ['about', 'One', 'README.md'],
    })
    const about = orderOf(out, 'about.md')!
    const one = orderOf(out, '01-chapter-one.md')! // matched by title "One"
    const home = orderOf(out, 'README.md')!
    expect(about).toBeLessThan(one)
    expect(one).toBeLessThan(home)
    // all lead ahead of an unlisted doc (undefined => treated as 500 downstream)
    expect(home).toBeLessThan(0)
    expect(orderOf(out, '02-chapter-two.md')).toBeUndefined()
  })

  test('is pure: input docs keep their original order value', () => {
    const input = corpus.map((d) => ({ ...d }))
    selectBookDocs(input, { sort: 'filename', order: ['about'] })
    expect(input.every((d) => d.order === undefined)).toBe(true)
  })

  test('unmatched order keys are ignored', () => {
    const out = selectBookDocs(corpus, { order: ['does-not-exist'] })
    expect(out.every((d) => d.order === undefined)).toBe(true)
  })
})
