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

/** Default timeout for individual tests (ms) */
export const TEST_TIMEOUT = 5000

// Safe JSON that handles DOM elements and circular references
const safeJSON = {
  stringify(val: unknown): string {
    if (typeof val === 'undefined') return 'undefined'
    if (val === null) return 'null'
    if (typeof Element !== 'undefined' && val instanceof Element) {
      return `<${val.tagName.toLowerCase()}>`
    }
    if (typeof Node !== 'undefined' && val instanceof Node) {
      return `[${val.nodeName}]`
    }
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  },
}

const { stringify } = safeJSON

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
        `Expected ${stringify(value)} to be ${stringify(expected)}`
      )
    },
    toEqual(expected: unknown) {
      assert(
        deepEqual(value, expected),
        `Expected ${stringify(value)} to equal ${stringify(expected)}`
      )
    },
    toBeTruthy() {
      assert(!!value, `Expected ${stringify(value)} to be truthy`)
    },
    toBeFalsy() {
      assert(!value, `Expected ${stringify(value)} to be falsy`)
    },
    toBeNull() {
      assert(value === null, `Expected ${stringify(value)} to be null`)
    },
    toBeUndefined() {
      assert(
        value === undefined,
        `Expected ${stringify(value)} to be undefined`
      )
    },
    toBeDefined() {
      assert(value !== undefined, `Expected ${stringify(value)} to be defined`)
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
          `Expected array to contain ${stringify(item)}`
        )
      } else {
        throw new AssertionError('toContain requires string or array')
      }
    },
    toHaveLength(length: number) {
      const actual = (value as { length: number }).length
      assert(actual === length, `Expected length ${actual} to be ${length}`)
    },
    toMatch(pattern: RegExp) {
      assert(
        pattern.test(value as string),
        `Expected "${value}" to match ${pattern}`
      )
    },
    toBeGreaterThan(n: number) {
      assert((value as number) > n, `Expected ${value} to be greater than ${n}`)
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

/**
 * Wait for a specified number of milliseconds
 */
export function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for an element matching the selector to appear in the preview
 * @param preview - The preview element to search within
 * @param selector - CSS selector to find
 * @param timeout - Maximum time to wait in ms (default: 1000)
 */
export function waitFor(
  preview: HTMLElement,
  selector: string,
  timeout = 1000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    const check = () => {
      const element = preview.querySelector(selector)
      if (element) {
        resolve(element)
        return
      }

      if (Date.now() - startTime >= timeout) {
        reject(
          new Error(`Timeout waiting for "${selector}" after ${timeout}ms`)
        )
        return
      }

      requestAnimationFrame(check)
    }

    check()
  })
}

export interface TestContext {
  expect: typeof expect
  test: (name: string, fn: () => void | Promise<void>) => void
  describe: (name: string, fn: () => void) => void
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  name: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Test "${name}" timed out after ${ms}ms`)),
        ms
      )
    ),
  ])
}

/**
 * Create a test context that collects results.
 * Returns the context and a `pending` promise array that must be awaited
 * to capture async test results.
 */
export function createTestContext(
  results: TestResult[],
  timeout = TEST_TIMEOUT
): TestContext & { pending: Promise<void>[] } {
  let currentDescribe = ''
  const pending: Promise<void>[] = []

  return {
    pending,
    expect,
    test(name: string, fn: () => void | Promise<void>) {
      const fullName = currentDescribe ? `${currentDescribe} > ${name}` : name
      try {
        const result = fn()
        if (result instanceof Promise) {
          const wrapped = withTimeout(result, timeout, fullName)
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
          pending.push(wrapped)
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
    waitMs,
    waitFor: (selector: string, timeout?: number) =>
      waitFor(preview, selector, timeout),
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

  // Wait for any async tests to settle
  if (testContext.pending.length > 0) {
    await Promise.all(testContext.pending)
  }

  return {
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    tests: results,
  }
}
