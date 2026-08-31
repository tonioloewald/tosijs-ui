import { rewriteImports, AsyncFunction, contextParamNames, } from './code-transform.js';
import { firstUserStackFrame, authorLine, sourceLineAt, describeError, diagnoseConstruction, TEST_SOURCE_URL, } from './error-location.js';
class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AssertionError';
    }
}
// Source of the currently-running test block, set by runTests so matchers
// can lift the failing line out of it for inclusion in the error message.
let currentTestSource = null;
function getSourceLine(lineNum) {
    return sourceLineAt(currentTestSource, lineNum);
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
            /*
            `authorLine`, not `frame.line`. The Function constructor's synthesized header offsets
            every reported line, so this path had been naming the line TWO BELOW the failing
            assertion — and quoting that line's source with it — since it was written. A confidently
            wrong location is worse than none, and it is the kind of error that reads as correct
            because the quoted text is real code from the same file.
            */
            const line = authorLine(firstUserStackFrame(err.stack));
            if (line !== null) {
                const src = getSourceLine(line);
                err.message = src
                    ? `${err.message} | ${src} (line ${line})`
                    : `${err.message} (line ${line})`;
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
        const transformedCode = (await transform(code, { transforms: ['typescript'] })).code;
        /*
        THE SHARED sanitiser. This used to be `key.replace(/-/g, '')` — its own copy of the rule,
        which stripped hyphens and left slashes and `@`, so `'tosijs-3d/demo-utils'` became the
        parameter name `tosijs3d/demoutils` and every test in the file died before any of them ran
        (#111/#112). The examples on the same page were fine, because they went through the real
        one. A second copy of a rule is a rule that will be maintained once.
        */
        const contextKeys = contextParamNames(Object.keys(fullContext));
        const contextValues = Object.values(fullContext);
        // Tag the AsyncFunction body with a sourceURL so stack traces report
        // line numbers relative to the test source (not a position inside the
        // bundled harness). `firstUserStackFrame` uses this to skip our own
        // frames and surface the assertion's actual location to the user.
        const taggedCode = `${transformedCode}\n//# sourceURL=${TEST_SOURCE_URL}`;
        // Capture the source so matchers can lift the failing line into the
        // error message. rewriteImports + tjs (dialect: 'js') leave plain JS
        // untouched, preserving line breaks so stack line numbers match this source.
        currentTestSource = transformedCode;
        /*
        Construction and execution are caught SEPARATELY because they fail differently.
    
        A constructor failure happens before any user code runs, so there is no frame to point at
        and a stack cannot help — the useful information is which parameter list was rejected.
        An execution failure has a real stack, tagged above, and can name a line.
        */
        let func;
        try {
            // @ts-expect-error AsyncFunction constructor typing
            func = new AsyncFunction(...contextKeys, taggedCode);
        }
        catch (err) {
            results.push({
                name: 'Test execution',
                passed: false,
                error: diagnoseConstruction(err, contextKeys, taggedCode, 
                // @ts-expect-error AsyncFunction constructor typing
                (...args) => new AsyncFunction(...args)),
            });
            currentTestSource = null;
            return summarize(results);
        }
        await func(...contextValues);
    }
    catch (err) {
        /*
        Was `error: (err as Error).message`, which discarded the stack — and with it the only
        thing that made the failure findable. The sourceURL tag exists precisely so this stack
        carries usable line numbers; throwing it away meant a whole file's tests reported as one
        locationless line (#111).
        */
        results.push({
            name: 'Test execution',
            passed: false,
            error: describeError(err, currentTestSource),
        });
    }
    // Wait for any async tests to settle
    if (testContext.pending.length > 0) {
        await Promise.all(testContext.pending);
    }
    currentTestSource = null;
    return summarize(results);
}
/*
The one place that counts results. The construction-failure path returns early — nothing ran,
so there is nothing pending to await — and must still produce the same shape.
*/
function summarize(results) {
    return {
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        tests: results,
    };
}
