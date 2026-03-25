import { rewriteImports, AsyncFunction } from './code-transform';
class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AssertionError';
    }
}
function deepEqual(a, b) {
    if (a === b)
        return true;
    if (typeof a !== typeof b)
        return false;
    if (a === null || b === null)
        return a === b;
    if (typeof a !== 'object')
        return false;
    const aObj = a;
    const bObj = b;
    if (Array.isArray(aObj) !== Array.isArray(bObj))
        return false;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length)
        return false;
    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}
/** Default timeout for individual tests (ms) */
export const TEST_TIMEOUT = 5000;
// Safe JSON that handles DOM elements and circular references
const safeJSON = {
    stringify(val) {
        if (typeof val === 'undefined')
            return 'undefined';
        if (val === null)
            return 'null';
        if (typeof Element !== 'undefined' && val instanceof Element) {
            return `<${val.tagName.toLowerCase()}>`;
        }
        if (typeof Node !== 'undefined' && val instanceof Node) {
            return `[${val.nodeName}]`;
        }
        try {
            return JSON.stringify(val);
        }
        catch {
            return String(val);
        }
    },
};
const { stringify } = safeJSON;
function createMatchers(value, negated = false) {
    const assert = (condition, message) => {
        const result = negated ? !condition : condition;
        if (!result) {
            throw new AssertionError(negated ? `not: ${message}` : message);
        }
    };
    const matchers = {
        toBe(expected) {
            assert(value === expected, `Expected ${stringify(value)} to be ${stringify(expected)}`);
        },
        toEqual(expected) {
            assert(deepEqual(value, expected), `Expected ${stringify(value)} to equal ${stringify(expected)}`);
        },
        toBeTruthy() {
            assert(!!value, `Expected ${stringify(value)} to be truthy`);
        },
        toBeFalsy() {
            assert(!value, `Expected ${stringify(value)} to be falsy`);
        },
        toBeNull() {
            assert(value === null, `Expected ${stringify(value)} to be null`);
        },
        toBeUndefined() {
            assert(value === undefined, `Expected ${stringify(value)} to be undefined`);
        },
        toBeDefined() {
            assert(value !== undefined, `Expected ${stringify(value)} to be defined`);
        },
        toContain(item) {
            if (typeof value === 'string') {
                assert(value.includes(item), `Expected "${value}" to contain "${item}"`);
            }
            else if (Array.isArray(value)) {
                assert(value.includes(item), `Expected array to contain ${stringify(item)}`);
            }
            else {
                throw new AssertionError('toContain requires string or array');
            }
        },
        toHaveLength(length) {
            const actual = value.length;
            assert(actual === length, `Expected length ${actual} to be ${length}`);
        },
        toMatch(pattern) {
            assert(pattern.test(value), `Expected "${value}" to match ${pattern}`);
        },
        toBeGreaterThan(n) {
            assert(value > n, `Expected ${value} to be greater than ${n}`);
        },
        toBeLessThan(n) {
            assert(value < n, `Expected ${value} to be less than ${n}`);
        },
        toBeInstanceOf(cls) {
            assert(value instanceof cls, `Expected value to be instance of ${cls.name}`);
        },
        get not() {
            return createMatchers(value, !negated);
        },
    };
    return matchers;
}
export function expect(value) {
    return createMatchers(value);
}
/**
 * Wait for a specified number of milliseconds
 */
export function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Wait for an element matching the selector to appear in the preview
 * @param preview - The preview element to search within
 * @param selector - CSS selector to find
 * @param timeout - Maximum time to wait in ms (default: 1000)
 */
export function waitFor(preview, selector, timeout = 1000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
            const element = preview.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            if (Date.now() - startTime >= timeout) {
                reject(new Error(`Timeout waiting for "${selector}" after ${timeout}ms`));
                return;
            }
            requestAnimationFrame(check);
        };
        check();
    });
}
function withTimeout(promise, ms, name) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Test "${name}" timed out after ${ms}ms`)), ms)),
    ]);
}
/**
 * Create a test context that collects results.
 * Returns the context and a `pending` promise array that must be awaited
 * to capture async test results.
 */
export function createTestContext(results, timeout = TEST_TIMEOUT) {
    let currentDescribe = '';
    const pending = [];
    return {
        pending,
        expect,
        test(name, fn) {
            const fullName = currentDescribe ? `${currentDescribe} > ${name}` : name;
            try {
                const result = fn();
                if (result instanceof Promise) {
                    const wrapped = withTimeout(result, timeout, fullName)
                        .then(() => {
                        results.push({ name: fullName, passed: true });
                    })
                        .catch((err) => {
                        results.push({
                            name: fullName,
                            passed: false,
                            error: err.message,
                        });
                    });
                    pending.push(wrapped);
                }
                else {
                    results.push({ name: fullName, passed: true });
                }
            }
            catch (err) {
                results.push({
                    name: fullName,
                    passed: false,
                    error: err.message,
                });
            }
        },
        describe(name, fn) {
            const previousDescribe = currentDescribe;
            currentDescribe = currentDescribe ? `${currentDescribe} > ${name}` : name;
            fn();
            currentDescribe = previousDescribe;
        },
    };
}
/**
 * Run test code and collect results
 */
export async function runTests(testCode, preview, context, transform) {
    const results = [];
    const testContext = createTestContext(results);
    const fullContext = {
        preview,
        ...context,
        expect: testContext.expect,
        test: testContext.test,
        describe: testContext.describe,
        waitMs,
        waitFor: (selector, timeout) => waitFor(preview, selector, timeout),
    };
    try {
        const code = rewriteImports(testCode, Object.keys(context));
        const transformedCode = transform(code, { transforms: ['typescript'] }).code;
        const contextKeys = Object.keys(fullContext).map((key) => key.replace(/-/g, ''));
        const contextValues = Object.values(fullContext);
        // @ts-expect-error AsyncFunction constructor typing
        const func = new AsyncFunction(...contextKeys, transformedCode);
        await func(...contextValues);
    }
    catch (err) {
        // If the test code itself throws (not an assertion), add it as a failed test
        results.push({
            name: 'Test execution',
            passed: false,
            error: err.message,
        });
    }
    // Wait for any async tests to settle
    if (testContext.pending.length > 0) {
        await Promise.all(testContext.pending);
    }
    return {
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        tests: results,
    };
}
