import { test, expect } from 'bun:test'
import { ENFORCED_KEYWORDS } from 'tosijs-schema'
import { ENFORCED, unenforcedKeywords, unenforcedNote } from './unenforced'

test('the local keyword list still matches tosijs-schema', () => {
  /*
  The list is COPIED rather than imported because `tosijs-schema` is an optional peer and the
  warning matters most when it is absent. This test is what stops the copy drifting: when
  upstream enforces `oneOf` (their #8), this fails, and the note stops being emitted for it.
  */
  expect([...ENFORCED].sort()).toEqual([...ENFORCED_KEYWORDS].sort())
})

test('reports only keywords that constrain, and only the ones ignored', () => {
  expect(unenforcedKeywords({ type: 'number', minimum: 0 } as any)).toEqual([])
  // Annotations describe, they do not constrain — never a validation gap.
  expect(
    unenforcedKeywords({
      type: 'string',
      title: 'X',
      description: 'y',
      $inferred: true,
      'x-custom': 1,
    } as any)
  ).toEqual([])
  expect(
    unenforcedKeywords({
      type: 'number',
      exclusiveMinimum: 0,
      oneOf: [],
    } as any)
  ).toEqual(['exclusiveMinimum', 'oneOf'])
})

test('shallow, so a nested gap is reported against the field that owns it', () => {
  expect(
    unenforcedKeywords({
      type: 'object',
      properties: { n: { type: 'number', exclusiveMinimum: 0 } },
    } as any)
  ).toEqual([])
})

test('the note reads as a sentence', () => {
  expect(unenforcedNote([])).toBe('')
  expect(unenforcedNote(['oneOf'])).toBe('oneOf is not validated')
  expect(unenforcedNote(['allOf', 'not', 'oneOf'])).toBe(
    'allOf, not and oneOf are not validated'
  )
})
