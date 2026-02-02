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
export declare function expect(value: unknown): Matchers;
export interface TestContext {
    expect: typeof expect;
    test: (name: string, fn: () => void | Promise<void>) => void;
    describe: (name: string, fn: () => void) => void;
}
/**
 * Create a test context that collects results
 */
export declare function createTestContext(results: TestResult[]): TestContext;
/**
 * Run test code and collect results
 */
export declare function runTests(testCode: string, preview: HTMLElement, context: ExampleContext, transform: TransformFn): Promise<TestResults>;
export {};
