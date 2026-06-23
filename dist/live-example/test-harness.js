import { rewriteImports, AsyncFunction } from './code-transform';
class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AssertionError';
    }
}
// Parse an Error.stack and return the first frame that isn't from inside
// the bundled harness itself — that's the user's test code. The harness is
// minified into a single bundle (index.js / module.js / iife.js), so we
// skip frames whose URL ends in those filenames and pick the next one.
// Stack-frame format varies across browsers (Chrome: " at fn (url:line:col)";
// Safari/FF: "fn@url:line:col") — the trailing "url:line:col" capture handles
// both.
const BUNDLE_FILES = /\/(index|module|iife|module\.debug|module\.safe)\.js$/;
function firstUserStackFrame(stack) {
    if (!stack)
        return null;
    for (const raw of stack.split('\n')) {
        const line = raw.trim();
        if (!line)
            continue;
        // Skip the "AssertionError: ..." header line.
        if (/^\w*Error[:\s]/.test(line))
            continue;
        const match = line.match(/[(@\s]([^()\s]+):(\d+):(\d+)\)?$/);
        if (!match)
            continue;
        const [, url, ln, col] = match;
        if (BUNDLE_FILES.test(url))
            continue;
        return { url, line: Number(ln), col: Number(col) };
    }
    return null;
}
// Source of the currently-running test block, set by runTests so matchers
// can lift the failing line out of it for inclusion in the error message.
let currentTestSource = null;
function getSourceLine(lineNum) {
    if (!currentTestSource || lineNum < 1)
        return null;
    const lines = currentTestSource.split('\n');
    return lines[lineNum - 1]?.trim() || null;
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
            const err = new AssertionError(negated ? `not: ${message}` : message);
            const frame = firstUserStackFrame(err.stack);
            if (frame) {
                const src = getSourceLine(frame.line);
                const loc = `line ${frame.line}`;
                err.message = src
                    ? `${err.message} | ${src} (${loc})`
                    : `${err.message} (${loc})`;
            }
            throw err;
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
        // Tag the AsyncFunction body with a sourceURL so stack traces report
        // line numbers relative to the test source (not a position inside the
        // bundled harness). `firstUserStackFrame` uses this to skip our own
        // frames and surface the assertion's actual location to the user.
        const taggedCode = `${transformedCode}\n//# sourceURL=inline-test`;
        // Capture the source so matchers can lift the failing line into the
        // error message. rewriteImports + tjs (dialect: 'js') leave plain JS
        // untouched, preserving line breaks so stack line numbers match this source.
        currentTestSource = transformedCode;
        // @ts-expect-error AsyncFunction constructor typing
        const func = new AsyncFunction(...contextKeys, taggedCode);
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
    currentTestSource = null;
    return {
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        tests: results,
    };
}
