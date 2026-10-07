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

/*
ONE way to CLOSE a page's entry (`closePage`), shared by every path that collects results:
the background iframes, the page the reader is on, and a deployed (non-localhost) page. They
used to be three pieces of code with three rules, and the 1.16.8 review found the two that had
not been fixed each still able to pass over a failure.

Adding up is shared less than that, and the difference is deliberate: the page the reader is
on adds its examples with `tallyExamples`, keyed by element because examples there re-run;
an iframe's parent appends each message as it arrives, because a frame loads once and every
example in it reports once.
*/

interface ExampleResults {
  passed: number
  failed: number
  tests: Array<{ name: string; passed: boolean; error?: string }>
}

/** A page's results, as the doc-browser records and reports them (`PageTestResults`). */
export interface PageTally {
  passed: boolean
  tests: ExampleResults['tests']
  totalPassed: number
  totalFailed: number
}

/**
 * Add up a page from its examples' results, one entry per example.
 *
 * Per EXAMPLE, because `testcomplete` fires once for each. The page the reader is on used to
 * REPLACE its entry on every event, so the last example to finish was the whole page: a
 * failing first example followed by a passing second one reported green.
 */
export function tallyExamples(results: Iterable<ExampleResults>): PageTally {
  const tally: PageTally = {
    passed: true,
    tests: [],
    totalPassed: 0,
    totalFailed: 0,
  }
  for (const r of results) {
    tally.tests.push(...r.tests)
    tally.totalPassed += r.passed
    tally.totalFailed += r.failed
  }
  tally.passed = tally.totalFailed === 0
  return tally
}

/** How waiting for a page ended. */
export interface PageOutcome {
  /** the deadline passed before the page said it was done */
  timedOut: boolean
  /** the deadline, for the message */
  deadlineMs: number
  /** examples with tests that never settled (see `unsettledExamples`) */
  stalled?: number
}

/**
 * Close a page's entry once waiting for it is over. Returns what to record.
 *
 * A page that timed out FAILS, whether or not some of its examples had reported: results for
 * one example say nothing about the ones still hung behind it, and "0 failed so far" was
 * being read as a pass. A page that finished with no results at all fails too — it has test
 * blocks, and none of them ran.
 */
export function closePage(
  existing: PageTally | undefined,
  outcome: PageOutcome
): PageTally {
  const seconds = outcome.deadlineMs / 1000
  const fail = (name: string, error: string): PageTally => {
    const base = existing ?? tallyExamples([])
    return {
      passed: false,
      tests: [...base.tests, { name, passed: false, error }],
      totalPassed: base.totalPassed,
      totalFailed: base.totalFailed + 1,
    }
  }
  if (outcome.stalled) {
    return fail(
      'every example with tests finished',
      `${outcome.stalled} example(s) with test blocks had not finished after ${seconds}s, so their tests did not run.`
    )
  }
  if (outcome.timedOut) {
    return fail(
      'page finished its tests in time',
      existing
        ? `The page did not finish within ${seconds}s. Some tests reported; the rest did not run.`
        : `The page did not finish within ${seconds}s and reported no tests, so its test blocks did not run.`
    )
  }
  if (!existing) {
    return fail(
      'page reported test results',
      'The page finished but reported no tests, though it has test blocks.'
    )
  }
  return existing
}
