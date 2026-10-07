/*
When has a doc page finished running its inline tests?

Extracted from the doc-browser's test-iframe signal because getting it wrong is invisible:
the failure mode is not a red suite, it is a GREEN one that quietly ran fewer tests than the
page contains. Pure and DOM-free so the rule can be tested directly.

The rule: what a page owes is decided by which examples HAVE test source — a fact about the
document, true before anything executes — and never by which examples have started running,
which is a fact about progress.
*/
/** An example has settled when it has run its tests and is no longer running them. */
export function isSettled(example) {
    return example.hasTests && !example.testRunning;
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
export function unsettledExamples(examples) {
    return examples.filter((example) => example.test && !isSettled(example));
}
/**
 * Add up a page from its examples' results, one entry per example.
 *
 * Per EXAMPLE, because `testcomplete` fires once for each. The page the reader is on used to
 * REPLACE its entry on every event, so the last example to finish was the whole page: a
 * failing first example followed by a passing second one reported green.
 */
export function tallyExamples(results) {
    const tally = {
        passed: true,
        tests: [],
        totalPassed: 0,
        totalFailed: 0,
    };
    for (const r of results) {
        tally.tests.push(...r.tests);
        tally.totalPassed += r.passed;
        tally.totalFailed += r.failed;
    }
    tally.passed = tally.totalFailed === 0;
    return tally;
}
/**
 * Close a page's entry once waiting for it is over. Returns what to record.
 *
 * A page that timed out FAILS, whether or not some of its examples had reported: results for
 * one example say nothing about the ones still hung behind it, and "0 failed so far" was
 * being read as a pass. A page that finished with no results at all fails too — it has test
 * blocks, and none of them ran.
 */
export function closePage(existing, outcome) {
    const seconds = outcome.deadlineMs / 1000;
    const fail = (name, error) => {
        const base = existing ?? tallyExamples([]);
        return {
            passed: false,
            tests: [...base.tests, { name, passed: false, error }],
            totalPassed: base.totalPassed,
            totalFailed: base.totalFailed + 1,
        };
    };
    if (outcome.stalled) {
        return fail('every example with tests finished', `${outcome.stalled} example(s) with test blocks had not finished after ${seconds}s, so their tests did not run.`);
    }
    if (outcome.timedOut) {
        return fail('page finished its tests in time', existing
            ? `The page did not finish within ${seconds}s. Some tests reported; the rest did not run.`
            : `The page did not finish within ${seconds}s and reported no tests, so its test blocks did not run.`);
    }
    if (!existing) {
        return fail('page reported test results', 'The page finished but reported no tests, though it has test blocks.');
    }
    return existing;
}
