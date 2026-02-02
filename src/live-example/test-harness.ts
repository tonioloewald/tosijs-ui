import { ExampleContext, TransformFn } from './types'
import { rewriteImports, AsyncFunction } from './code-transform'

export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

export interface TestResults {
  passed: number
  failed: number
  tests: TestResult[]
}

class AssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssertionError'
  }
}

interface Matchers {
  toBe: (expected: unknown) => void
  toEqual: (expected: unknown) => void
  toBeTruthy: () => void
  toBeFalsy: () => void
  toBeNull: () => void
  toBeUndefined: () => void
  toBeDefined: () => void
  toContain: (item: unknown) => void
  toHaveLength: (length: number) => void
  toMatch: (pattern: RegExp) => void
  toBeGreaterThan: (n: number) => void
  toBeLessThan: (n: number) => void
  toBeInstanceOf: (cls: new (...args: unknown[]) => unknown) => void
  not: Matchers
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (typeof a !== 'object') return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>

  if (Array.isArray(aObj) !== Array.isArray(bObj)) return false

  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)
  if (aKeys.length !== bKeys.length) return false

  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]))
}

function createMatchers(value: unknown, negated = false): Matchers {
  const assert = (condition: boolean, message: string) => {
    const result = negated ? !condition : condition
    if (!result) {
      throw new AssertionError(negated ? `not: ${message}` : message)
    }
  }

  const matchers: Matchers = {
    toBe(expected: unknown) {
      assert(
        value === expected,
        `Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`
      )
    },
    toEqual(expected: unknown) {
      assert(
        deepEqual(value, expected),
        `Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`
      )
    },
    toBeTruthy() {
      assert(!!value, `Expected ${JSON.stringify(value)} to be truthy`)
    },
    toBeFalsy() {
      assert(!value, `Expected ${JSON.stringify(value)} to be falsy`)
    },
    toBeNull() {
      assert(value === null, `Expected ${JSON.stringify(value)} to be null`)
    },
    toBeUndefined() {
      assert(
        value === undefined,
        `Expected ${JSON.stringify(value)} to be undefined`
      )
    },
    toBeDefined() {
      assert(
        value !== undefined,
        `Expected ${JSON.stringify(value)} to be defined`
      )
    },
    toContain(item: unknown) {
      if (typeof value === 'string') {
        assert(
          value.includes(item as string),
          `Expected "${value}" to contain "${item}"`
        )
      } else if (Array.isArray(value)) {
        assert(
          value.includes(item),
          `Expected array to contain ${JSON.stringify(item)}`
        )
      } else {
        throw new AssertionError('toContain requires string or array')
      }
    },
    toHaveLength(length: number) {
      const actual = (value as { length: number }).length
      assert(
        actual === length,
        `Expected length ${actual} to be ${length}`
      )
    },
    toMatch(pattern: RegExp) {
      assert(
        pattern.test(value as string),
        `Expected "${value}" to match ${pattern}`
      )
    },
    toBeGreaterThan(n: number) {
      assert(
        (value as number) > n,
        `Expected ${value} to be greater than ${n}`
      )
    },
    toBeLessThan(n: number) {
      assert((value as number) < n, `Expected ${value} to be less than ${n}`)
    },
    toBeInstanceOf(cls: new (...args: unknown[]) => unknown) {
      assert(
        value instanceof cls,
        `Expected value to be instance of ${cls.name}`
      )
    },
    get not() {
      return createMatchers(value, !negated)
    },
  }

  return matchers
}

export function expect(value: unknown): Matchers {
  return createMatchers(value)
}

export interface TestContext {
  expect: typeof expect
  test: (name: string, fn: () => void | Promise<void>) => void
  describe: (name: string, fn: () => void) => void
}

/**
 * Create a test context that collects results
 */
export function createTestContext(results: TestResult[]): TestContext {
  let currentDescribe = ''

  return {
    expect,
    test(name: string, fn: () => void | Promise<void>) {
      const fullName = currentDescribe ? `${currentDescribe} > ${name}` : name
      try {
        const result = fn()
        if (result instanceof Promise) {
          result
            .then(() => {
              results.push({ name: fullName, passed: true })
            })
            .catch((err: Error) => {
              results.push({
                name: fullName,
                passed: false,
                error: err.message,
              })
            })
        } else {
          results.push({ name: fullName, passed: true })
        }
      } catch (err) {
        results.push({
          name: fullName,
          passed: false,
          error: (err as Error).message,
        })
      }
    },
    describe(name: string, fn: () => void) {
      const previousDescribe = currentDescribe
      currentDescribe = currentDescribe ? `${currentDescribe} > ${name}` : name
      fn()
      currentDescribe = previousDescribe
    },
  }
}

/**
 * Run test code and collect results
 */
export async function runTests(
  testCode: string,
  preview: HTMLElement,
  context: ExampleContext,
  transform: TransformFn
): Promise<TestResults> {
  const results: TestResult[] = []
  const testContext = createTestContext(results)

  const fullContext = {
    preview,
    ...context,
    expect: testContext.expect,
    test: testContext.test,
    describe: testContext.describe,
  }

  try {
    const code = rewriteImports(testCode, Object.keys(context))
    const transformedCode = transform(code, { transforms: ['typescript'] }).code

    const contextKeys = Object.keys(fullContext).map((key) =>
      key.replace(/-/g, '')
    )
    const contextValues = Object.values(fullContext)

    // @ts-expect-error AsyncFunction constructor typing
    const func = new AsyncFunction(...contextKeys, transformedCode)
    await func(...contextValues)
  } catch (err) {
    // If the test code itself throws (not an assertion), add it as a failed test
    results.push({
      name: 'Test execution',
      passed: false,
      error: (err as Error).message,
    })
  }

  // Wait a tick for any async tests to complete
  await new Promise((resolve) => setTimeout(resolve, 0))

  return {
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    tests: results,
  }
}
