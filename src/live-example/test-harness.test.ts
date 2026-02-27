/* eslint-disable */
import { test, expect, describe } from 'bun:test'
import {
  expect as testExpect,
  createTestContext,
  waitMs,
  TEST_TIMEOUT,
  TestResult,
} from './test-harness'

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
