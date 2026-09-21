import { test, expect, describe } from 'bun:test'
import {
  expect as testExpect,
  createTestContext,
  waitMs,
  TEST_TIMEOUT,
  TestResult,
} from './test-harness.js'

describe('expect matchers', () => {
  test('toBe checks strict equality', () => {
    testExpect(1).toBe(1)
    testExpect('foo').toBe('foo')
    expect(() => testExpect(1).toBe(2)).toThrow()
  })

  test('toEqual checks deep equality', () => {
    testExpect({ a: 1 }).toEqual({ a: 1 })
    testExpect([1, 2]).toEqual([1, 2])
    expect(() => testExpect({ a: 1 }).toEqual({ a: 2 })).toThrow()
  })

  test('toBeTruthy / toBeFalsy', () => {
    testExpect(1).toBeTruthy()
    testExpect('hello').toBeTruthy()
    testExpect(0).toBeFalsy()
    testExpect('').toBeFalsy()
    testExpect(null).toBeFalsy()
  })

  test('toBeNull / toBeUndefined / toBeDefined', () => {
    testExpect(null).toBeNull()
    testExpect(undefined).toBeUndefined()
    testExpect(42).toBeDefined()
    expect(() => testExpect(42).toBeNull()).toThrow()
  })

  test('toContain works for strings and arrays', () => {
    testExpect('hello world').toContain('world')
    testExpect([1, 2, 3]).toContain(2)
    expect(() => testExpect([1, 2, 3]).toContain(4)).toThrow()
  })

  test('toHaveLength', () => {
    testExpect([1, 2]).toHaveLength(2)
    testExpect('abc').toHaveLength(3)
  })

  test('toMatch', () => {
    testExpect('hello world').toMatch(/world/)
    expect(() => testExpect('hello').toMatch(/xyz/)).toThrow()
  })

  test('toBeGreaterThan / toBeLessThan', () => {
    testExpect(5).toBeGreaterThan(3)
    testExpect(3).toBeLessThan(5)
  })

  test('not negates matchers', () => {
    testExpect(1).not.toBe(2)
    testExpect(null).not.toBeTruthy()
    testExpect(42).not.toBeNull()
    expect(() => testExpect(1).not.toBe(1)).toThrow()
  })
})

describe('createTestContext', () => {
  test('collects sync test results', () => {
    const results: TestResult[] = []
    const ctx = createTestContext(results)

    ctx.test('passing test', () => {
      ctx.expect(true).toBeTruthy()
    })

    ctx.test('failing test', () => {
      ctx.expect(false).toBeTruthy()
    })

    // Sync tests are collected immediately
    expect(results).toHaveLength(2)
    expect(results[0].passed).toBe(true)
    expect(results[0].name).toBe('passing test')
    expect(results[1].passed).toBe(false)
    expect(results[1].name).toBe('failing test')
  })

  test('describe nests test names', () => {
    const results: TestResult[] = []
    const ctx = createTestContext(results)

    ctx.describe('outer', () => {
      ctx.test('inner', () => {
        ctx.expect(1).toBe(1)
      })
    })

    expect(results[0].name).toBe('outer > inner')
  })

  test('async tests go to pending array', async () => {
    const results: TestResult[] = []
    const ctx = createTestContext(results)

    ctx.test('async passing', async () => {
      await new Promise((r) => setTimeout(r, 10))
      ctx.expect(true).toBeTruthy()
    })

    // Before awaiting pending, async result is not yet collected
    expect(results).toHaveLength(0)
    expect(ctx.pending).toHaveLength(1)

    await Promise.all(ctx.pending)

    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(true)
  })

  test('async test failure is captured', async () => {
    const results: TestResult[] = []
    const ctx = createTestContext(results)

    ctx.test('async fail', async () => {
      await new Promise((r) => setTimeout(r, 10))
      ctx.expect(false).toBeTruthy()
    })

    await Promise.all(ctx.pending)

    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(false)
    expect(results[0].error).toBeDefined()
  })

  test('async test timeout', async () => {
    const results: TestResult[] = []
    const ctx = createTestContext(results, 50) // 50ms timeout

    ctx.test('hangs', async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    await Promise.all(ctx.pending)

    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(false)
    expect(results[0].error).toContain('timed out')
  })
})

describe('waitMs', () => {
  test('delays by the specified amount', async () => {
    const start = Date.now()
    await waitMs(50)
    expect(Date.now() - start).toBeGreaterThanOrEqual(40)
  })
})

describe('TEST_TIMEOUT', () => {
  test('has a sensible default', () => {
    expect(TEST_TIMEOUT).toBe(5000)
  })
})

/*
Matchers requested by an adopter converting a WebGL project to test fences (#142 point 1).

Everything renderer-shaped is floats — intensities, densities, bounding boxes — and without
`toBeCloseTo` they were writing `Math.round(x * 1e6) / 1e6` at every assertion. Jest's
semantics deliberately, so the habit transfers: `digits` is DECIMAL PLACES, tolerance is half a
unit in the last one.
*/
describe('float and bound matchers (#142)', () => {
  /** Does this assertion throw? The harness signals failure by throwing AssertionError. */
  const fails = (fn: () => void): string | null => {
    try {
      fn()
      return null
    } catch (err) {
      return (err as Error).message
    }
  }

  test('toBeCloseTo passes within tolerance and fails outside it', () => {
    expect(fails(() => testExpect(0.1 + 0.2).toBeCloseTo(0.3))).toBe(null)
    expect(fails(() => testExpect(1.0).toBeCloseTo(1.5))).not.toBe(null)
  })

  test('digits is decimal places, as in jest', () => {
    // 0.01 apart: inside 1 digit (tolerance 0.05), outside 3 (tolerance 0.0005).
    expect(fails(() => testExpect(1.01).toBeCloseTo(1.0, 1))).toBe(null)
    expect(fails(() => testExpect(1.01).toBeCloseTo(1.0, 3))).not.toBe(null)
  })

  test('the tolerance is HALF a unit in the last digit, as jest defines it', () => {
    /*
    The boundary case, and the one that makes the others mean something. At `digits: 2` the
    tolerance is 0.005, not 0.01 — so a difference of 0.007 must FAIL. Without this, dropping
    the `/ 2` passes every test above, because none of them straddles the two values.
    */
    expect(fails(() => testExpect(1.007).toBeCloseTo(1.0, 2))).not.toBe(null)
    expect(fails(() => testExpect(1.004).toBeCloseTo(1.0, 2))).toBe(null)
  })

  test('the message names the actual difference, not just a failure', () => {
    const msg = fails(() => testExpect(2.5).toBeCloseTo(1.0)) ?? ''
    expect(msg).toContain('close to')
    expect(msg).toContain('differs by')
  })

  test('toBeGreaterThanOrEqual / toBeLessThanOrEqual include the boundary', () => {
    expect(fails(() => testExpect(5).toBeGreaterThanOrEqual(5))).toBe(null)
    expect(fails(() => testExpect(5).toBeLessThanOrEqual(5))).toBe(null)
    expect(fails(() => testExpect(5).toBeGreaterThanOrEqual(6))).not.toBe(null)
    expect(fails(() => testExpect(5).toBeLessThanOrEqual(4))).not.toBe(null)
  })

  test('they compose with .not, because they ride the shared assert', () => {
    expect(fails(() => testExpect(1.0).not.toBeCloseTo(9.9))).toBe(null)
    expect(fails(() => testExpect(4).not.toBeGreaterThanOrEqual(5))).toBe(null)
    // …and .not fails when the positive case would have passed.
    expect(fails(() => testExpect(5).not.toBeGreaterThanOrEqual(5))).not.toBe(
      null
    )
  })
})
