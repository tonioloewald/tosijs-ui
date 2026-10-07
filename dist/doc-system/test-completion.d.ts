/** The only things this rule needs to know about a live example. */
export interface ExampleTestState {
    /** the example's `test` block source; falsy when it has none */
    test?: string | null;
    /** the `-has-tests` class: set only AFTER the example's `js` block has run */
    hasTests: boolean;
    /** the `-test-running` class */
    testRunning: boolean;
}
/** An example has settled when it has run its tests and is no longer running them. */
export declare function isSettled(example: ExampleTestState): boolean;
/**
 * The examples a page is still waiting on — empty means the page is done.
 *
 * Counts every example with `test` source that has not settled, INCLUDING ones that have
 * not started yet. Those are precisely the ones the old rule missed: an example still
 * awaiting a slow `js` block (a `fetch`) carries neither `-has-tests` nor `-test-running`,
 * so a check phrased as "some example has tests and none is running" reported the page
 * complete while that example had yet to run a single assertion.
 */
export declare function unsettledExamples<T extends ExampleTestState>(examples: T[]): T[];
interface ExampleResults {
    passed: number;
    failed: number;
    tests: Array<{
        name: string;
        passed: boolean;
        error?: string;
    }>;
}
/** A page's results, as the doc-browser records and reports them (`PageTestResults`). */
export interface PageTally {
    passed: boolean;
    tests: ExampleResults['tests'];
    totalPassed: number;
    totalFailed: number;
}
/**
 * Add up a page from its examples' results, one entry per example.
 *
 * Per EXAMPLE, because `testcomplete` fires once for each. The page the reader is on used to
 * REPLACE its entry on every event, so the last example to finish was the whole page: a
 * failing first example followed by a passing second one reported green.
 */
export declare function tallyExamples(results: Iterable<ExampleResults>): PageTally;
/** How waiting for a page ended. */
export interface PageOutcome {
    /** the deadline passed before the page said it was done */
    timedOut: boolean;
    /** the deadline, for the message */
    deadlineMs: number;
    /** examples with tests that never settled (see `unsettledExamples`) */
    stalled?: number;
}
/**
 * Close a page's entry once waiting for it is over. Returns what to record.
 *
 * A page that timed out FAILS, whether or not some of its examples had reported: results for
 * one example say nothing about the ones still hung behind it, and "0 failed so far" was
 * being read as a pass. A page that finished with no results at all fails too — it has test
 * blocks, and none of them ran.
 */
export declare function closePage(existing: PageTally | undefined, outcome: PageOutcome): PageTally;
export {};
