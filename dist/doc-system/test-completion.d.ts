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
