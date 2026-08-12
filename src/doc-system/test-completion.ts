/*
When has a doc page finished running its inline tests?

Extracted from the doc-browser's test-iframe signal because getting it wrong is invisible:
the failure mode is not a red suite, it is a GREEN one that quietly ran fewer tests than the
page contains. Pure and DOM-free so the rule can be tested directly.

The rule: what a page owes is decided by which examples HAVE test source — a fact about the
document, true before anything executes — and never by which examples have started running,
which is a fact about progress.
*/

/** The only things this rule needs to know about a live example. */
export interface ExampleTestState {
  /** the example's `test` block source; falsy when it has none */
  test?: string | null
  /** the `-has-tests` class: set only AFTER the example's `js` block has run */
  hasTests: boolean
  /** the `-test-running` class */
  testRunning: boolean
}

/** An example has settled when it has run its tests and is no longer running them. */
export function isSettled(example: ExampleTestState): boolean {
  return example.hasTests && !example.testRunning
}

/**
 * The examples a page is still waiting on — empty means the page is done.
 *
 * Counts every example with `test` source that has not settled, INCLUDING ones that have
 * not started yet. Those are precisely the ones the old rule missed: an example still
 * awaiting a slow `js` block (a `fetch`) carries neither `-has-tests` nor `-test-running`,
 * so a check phrased as "some example has tests and none is running" reported the page
 * complete while that example had yet to run a single assertion.
 */
export function unsettledExamples<T extends ExampleTestState>(
  examples: T[]
): T[] {
  return examples.filter((example) => example.test && !isSettled(example))
}
