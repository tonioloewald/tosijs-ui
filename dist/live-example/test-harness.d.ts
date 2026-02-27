import { ExampleContext, TransformFn } from './types';
export interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}
export interface TestResults {
    passed: number;
    failed: number;
    tests: TestResult[];
}
interface Matchers {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeTruthy: () => void;
    toBeFalsy: () => void;
    toBeNull: () => void;
    toBeUndefined: () => void;
    toBeDefined: () => void;
    toContain: (item: unknown) => void;
    toHaveLength: (length: number) => void;
    toMatch: (pattern: RegExp) => void;
    toBeGreaterThan: (n: number) => void;
    toBeLessThan: (n: number) => void;
    toBeInstanceOf: (cls: new (...args: unknown[]) => unknown) => void;
    not: Matchers;
}
/** Default timeout for individual tests (ms) */
export declare const TEST_TIMEOUT = 5000;
export declare function expect(value: unknown): Matchers;
/**
 * Wait for a specified number of milliseconds
 */
export declare function waitMs(ms: number): Promise<void>;
/**
 * Wait for an element matching the selector to appear in the preview
 * @param preview - The preview element to search within
 * @param selector - CSS selector to find
 * @param timeout - Maximum time to wait in ms (default: 1000)
 */
export declare function waitFor(preview: HTMLElement, selector: string, timeout?: number): Promise<Element>;
export interface TestContext {
    expect: typeof expect;
    test: (name: string, fn: () => void | Promise<void>) => void;
    describe: (name: string, fn: () => void) => void;
}
/**
 * Create a test context that collects results.
 * Returns the context and a `pending` promise array that must be awaited
 * to capture async test results.
 */
export declare function createTestContext(results: TestResult[], timeout?: number): TestContext & {
    pending: Promise<void>[];
};
/**
 * Run test code and collect results
 */
export declare function runTests(testCode: string, preview: HTMLElement, context: ExampleContext, transform: TransformFn): Promise<TestResults>;
export {};
