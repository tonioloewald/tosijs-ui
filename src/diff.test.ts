import { expect, test, describe } from 'bun:test'
import { diffLines } from './diff'

const ops = (before: string, after: string) =>
  diffLines(before, after).map((l) => `${l.op[0]} ${l.text}`)

describe('diffLines', () => {
  test('identical text is all context', () => {
    expect(diffLines('a\nb\nc', 'a\nb\nc').every((l) => l.op === 'context')).toBe(
      true
    )
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
    expect(
      diffLines('a\nb', '').filter((l) => l.op === 'remove').length
    ).toBe(2)
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
