import { test, expect } from 'bun:test'
import { ENFORCED_KEYWORDS } from 'tosijs-schema'
import { ENFORCED, unenforcedKeywords, unenforcedNote } from './unenforced'

test('the local FALLBACK list never claims more than upstream enforces', () => {
  /*
  Subset, not equality — and the direction matters.

  Upstream GROWING this set is good news: 1.8.0 added `oneOf`, `exclusiveMinimum` and
  `exclusiveMaximum`, which is exactly what tosijs-ui#8 asked for. An equality assertion
  turned that into a red build, and it framed progress as breakage.

  What must never happen is upstream SHRINKING below our list, because then the fallback
  claims a keyword is checked when it is not — a green form over a forbidden value, which is
  the failure this whole file exists to prevent. That is what the subset check catches.

  The list is a FALLBACK now, not the answer: `unenforcedKeywords()` asks the registered
  validator first, and only a validator that cannot answer falls through to this.
  */
  const upstream = new Set(ENFORCED_KEYWORDS)
  const overclaimed = [...ENFORCED].filter((k) => !upstream.has(k))
  expect(overclaimed).toEqual([])
})

test('upstream 1.8.0 enforces what our floor promises', () => {
  // The floor is ^1.8.0 precisely because these three landed; if a future version drops one,
  // the note stops being emitted for it and the subset check above would not notice.
  for (const keyword of ['oneOf', 'exclusiveMinimum', 'exclusiveMaximum']) {
    expect(ENFORCED_KEYWORDS.has(keyword)).toBe(true)
  }
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
