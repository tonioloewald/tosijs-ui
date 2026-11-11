import { test, expect } from 'bun:test'
import { splitLimits } from './splitter.js'

const open = { min: 44, max: Infinity }

test('splitLimits keeps both neighbours at or above their minimums', () => {
  expect(splitLimits(200, 400, open, open)).toEqual({
    total: 400,
    min: 44,
    max: 356,
  })
  expect(splitLimits(200, 400, { min: 120, max: Infinity }, open).min).toBe(120)
})

test("splitLimits honours each side's maximum", () => {
  // the first may not exceed 250; the second may not exceed 300, so the first is at least 100
  expect(
    splitLimits(200, 400, { min: 44, max: 250 }, { min: 44, max: 300 })
  ).toEqual({ total: 400, min: 100, max: 250 })
})

test('splitLimits pins the current size when no split satisfies both', () => {
  expect(
    splitLimits(50, 80, { min: 44, max: Infinity }, { min: 44, max: Infinity })
  ).toEqual({ total: 80, min: 50, max: 50 })
})
