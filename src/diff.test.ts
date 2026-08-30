import { expect, test, describe } from 'bun:test'
import {
  diffLines,
  diffBlocks,
  resolveDiff,
  tosiDiff,
  DiffResolution,
} from './diff.js'

const ops = (before: string, after: string) =>
  diffLines(before, after).map((l) => `${l.op[0]} ${l.text}`)

describe('diffLines', () => {
  test('identical text is all context', () => {
    expect(
      diffLines('a\nb\nc', 'a\nb\nc').every((l) => l.op === 'context')
    ).toBe(true)
  })

  test('a changed line is a remove + add around context', () => {
    expect(ops('one\ntwo\nthree', 'one\nTWO\nthree')).toEqual([
      'c one',
      'r two',
      'a TWO',
      'c three',
    ])
  })

  test('pure insertion', () => {
    expect(ops('a\nc', 'a\nb\nc')).toEqual(['c a', 'a b', 'c c'])
  })

  test('pure deletion', () => {
    expect(ops('a\nb\nc', 'a\nc')).toEqual(['c a', 'r b', 'c c'])
  })

  test('append at end', () => {
    expect(ops('a\nb', 'a\nb\nc\nd')).toEqual(['c a', 'c b', 'a c', 'a d'])
  })

  test('everything replaced', () => {
    expect(ops('x\ny', 'p\nq')).toEqual(['r x', 'r y', 'a p', 'a q'])
  })

  test('empty before = all adds; empty after = all removes', () => {
    expect(diffLines('', 'a\nb').filter((l) => l.op === 'add').length).toBe(2)
    expect(diffLines('a\nb', '').filter((l) => l.op === 'remove').length).toBe(
      2
    )
  })

  test('preserves unchanged lines as context, not churn', () => {
    const d = diffLines('1\n2\n3\n4\n5', '1\n2\nX\n4\n5')
    expect(d.filter((l) => l.op === 'context').map((l) => l.text)).toEqual([
      '1',
      '2',
      '4',
      '5',
    ])
    expect(d.filter((l) => l.op !== 'context')).toEqual([
      { op: 'remove', text: '3' },
      { op: 'add', text: 'X' },
    ])
  })
})

describe('diffBlocks', () => {
  const blocks = (a: string, b: string) => diffBlocks(diffLines(a, b))

  test('consecutive removes and adds become ONE change', () => {
    // The unit of decision. Four lines of churn is still a single "do I want this?".
    expect(blocks('x\ny', 'p\nq')).toEqual([
      { kind: 'change', removed: ['x', 'y'], added: ['p', 'q'] },
    ])
  })

  test('an interleaved edit still groups into one change', () => {
    /*
    The case that motivates blocks at all: the LCS walk can emit remove/add/remove/add for a
    multi-line edit, and offering four independent choices there would let a reviewer accept
    half an edit — a state nobody asked for and that produces text neither side wrote.
    */
    const b = blocks('a\nb\nc\nd', 'A\nB\nC\nD')
    expect(b.length).toBe(1)
    expect(b[0]).toMatchObject({ kind: 'change' })
  })

  test('context runs are preserved between changes', () => {
    expect(blocks('1\n2\n3', '1\nX\n3')).toEqual([
      { kind: 'context', lines: ['1'] },
      { kind: 'change', removed: ['2'], added: ['X'] },
      { kind: 'context', lines: ['3'] },
    ])
  })

  test('identical text has no changes to resolve', () => {
    expect(blocks('a\nb', 'a\nb')).toEqual([
      { kind: 'context', lines: ['a', 'b'] },
    ])
  })
})

describe('resolveDiff round-trips its own endpoints', () => {
  /*
  The load-bearing property: a resolver you cannot trust at the extremes is one you cannot
  trust in the middle. Rejecting everything must reproduce the original BYTE FOR BYTE, and
  accepting everything the modified — not "close enough", not "modulo whitespace".
  */
  const cases: Array<[string, string]> = [
    ['one\ntwo\nthree', 'one\nTWO\nthree'],
    ['x\ny', 'p\nq'],
    ['a\nc', 'a\nb\nc'],
    ['a\nb\nc', 'a\nc'],
    ['', 'a\nb'],
    ['a\nb', ''],
    ['same', 'same'],
    ['a\nb\nc\nd', 'A\nB\nC\nD'],
  ]

  for (const [before, after] of cases) {
    test(`${JSON.stringify(before)} → ${JSON.stringify(after)}`, () => {
      const b = diffBlocks(diffLines(before, after))
      const n = b.filter((x) => x.kind === 'change').length
      const all = (c: DiffResolution) => new Array(n).fill(c)
      expect(resolveDiff(b, all('original'))).toBe(before)
      expect(resolveDiff(b, all('modified'))).toBe(after)
    })
  }

  test('a mixed resolution takes each side independently', () => {
    // Two separate changes, accept the first and reject the second.
    const b = diffBlocks(
      diffLines('a\nKEEP\nc\nDROP\ne', 'a\nNEW1\nc\nNEW2\ne')
    )
    expect(resolveDiff(b, ['modified', 'original'])).toBe('a\nNEW1\nc\nDROP\ne')
    expect(resolveDiff(b, ['original', 'modified'])).toBe('a\nKEEP\nc\nNEW2\ne')
  })

  test('missing choices default to accepting', () => {
    // A host that never wired the controls still gets the proposed text, not a truncation.
    const b = diffBlocks(diffLines('a\nb', 'a\nB'))
    expect(resolveDiff(b, [])).toBe('a\nB')
  })
})

describe('<tosi-diff> resolution', () => {
  const mount = (props: Record<string, unknown>) => {
    const el = tosiDiff(props as any) as any
    document.body.append(el)
    return el
  }

  test('value defaults to the modified text, and rejectAll returns the original', () => {
    const el = mount({
      original: 'one\ntwo\nthree',
      modified: 'one\nTWO\nthree',
      resolvable: true,
    })
    expect(el.changeCount).toBe(1)
    expect(el.value).toBe('one\nTWO\nthree')
    el.rejectAll()
    expect(el.value).toBe('one\ntwo\nthree')
    el.acceptAll()
    expect(el.value).toBe('one\nTWO\nthree')
    el.remove()
  })

  test('choosing fires exactly one change event and moves the value', () => {
    const el = mount({
      original: 'a\nKEEP\nc\nDROP\ne',
      modified: 'a\nNEW1\nc\nNEW2\ne',
      resolvable: true,
    })
    let events = 0
    el.addEventListener('change', () => (events += 1))
    el.rejectAll()
    expect(events).toBe(1)
    expect(el.value).toBe('a\nKEEP\nc\nDROP\ne')
    el.remove()
  })

  test('decisions reset when the diff itself changes', () => {
    /*
    Choice #2 of the old diff is not choice #2 of the new one. Keeping decisions across an
    input change would silently apply them to different text — worst when the change count
    happens to match, which is why the guard is a signature and not a count.
    */
    const el = mount({ original: 'a\nb', modified: 'a\nB', resolvable: true })
    el.rejectAll()
    expect(el.value).toBe('a\nb')
    el.modified = 'a\nC'
    expect(el.value).toBe('a\nC')
    el.remove()
  })

  test('a non-resolvable diff still reports a usable value', () => {
    const el = mount({ original: 'a\nb', modified: 'a\nB' })
    expect(el.value).toBe('a\nB')
    el.remove()
  })
})
