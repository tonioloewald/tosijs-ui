import { test, expect } from 'bun:test'
import {
  isSettled,
  unsettledExamples,
  tallyExamples,
  closePage,
} from './test-completion'

const example = (over = {}) => ({
  test: 'test("x", () => {})',
  hasTests: false,
  testRunning: false,
  ...over,
})

/** An example whose `js` block is still awaiting something — the case that broke the lane. */
const notYetRun = () => example({ hasTests: false, testRunning: false })
const running = () => example({ hasTests: true, testRunning: true })
const done = () => example({ hasTests: true, testRunning: false })

test('REGRESSION: a page is NOT done while an example has yet to start', () => {
  /*
  The defect this pins. An example still awaiting a `fetch` in its `js` block has neither
  `-has-tests` nor `-test-running`, so the old rule — "some example has tests and none is
  running" — reported the page complete the moment the FIRST example settled. The other
  examples' tests never ran, were never reported, and the suite stayed green: data-table.ts
  went from 8 tests to 1 when a second fetching example was added, and both runs said
  "passed".
  */
  expect(unsettledExamples([done(), notYetRun(), notYetRun()])).toHaveLength(2)
})

test('a page is done only when every example with tests has settled', () => {
  expect(unsettledExamples([done(), done()])).toEqual([])
})

test('a page is not done while an example is mid-test', () => {
  expect(unsettledExamples([done(), running()])).toHaveLength(1)
})

test('examples without test source are never waited on', () => {
  // A display-only example never reports results, so waiting on it would hang the page.
  const noTests = [
    example({ test: undefined }),
    example({ test: null }),
    example({ test: '' }),
  ]
  expect(unsettledExamples(noTests)).toEqual([])
  expect(unsettledExamples([...noTests, notYetRun()])).toHaveLength(1)
})

test('a page with no examples at all is done rather than hanging', () => {
  // The old rule required `withTests.length > 0`, so such a page polled forever.
  expect(unsettledExamples([])).toEqual([])
})

test('settling is having run tests and no longer running them', () => {
  expect(isSettled({ hasTests: true, testRunning: false })).toBe(true)
  expect(isSettled({ hasTests: true, testRunning: true })).toBe(false)
  expect(isSettled({ hasTests: false, testRunning: false })).toBe(false)
})

test('the unsettled examples are returned, so a stall can name them', () => {
  // They are reported as failures rather than dropped, which is the other half of the fix.
  const slow = example({ test: 'test("slow", () => {})' })
  const [stalled] = unsettledExamples([done(), slow])
  expect(stalled).toBe(slow)
})

// ── adding a page up, and closing it (the 1.16.8 review's two majors) ────────────────────

const failing = {
  passed: 0,
  failed: 1,
  tests: [{ name: 'a', passed: false, error: 'boom' }],
}
const passing = { passed: 2, failed: 0, tests: [{ name: 'b', passed: true }] }

test('REGRESSION: a page is the SUM of its examples, not the last one to finish', () => {
  // Replacing the entry per `testcomplete` let a passing second example erase a failing first.
  const page = tallyExamples([failing, passing])
  expect(page.passed).toBe(false)
  expect(page.totalFailed).toBe(1)
  expect(page.totalPassed).toBe(2)
  expect(page.tests.map((t) => t.name)).toEqual(['a', 'b'])
})

test('REGRESSION: a page that timed out after SOME results still fails', () => {
  // `timedOut` used to matter only when nothing had reported; "0 failed so far" was a pass.
  const closed = closePage(tallyExamples([passing]), {
    timedOut: true,
    deadlineMs: 45_000,
  })
  expect(closed.passed).toBe(false)
  expect(closed.totalFailed).toBe(1)
  expect(closed.totalPassed).toBe(2) // what did report is kept
  expect(closed.tests.at(-1)?.error).toContain('45s')
})

test('a page with no results fails, timed out or not, and says which', () => {
  const silent = closePage(undefined, { timedOut: false, deadlineMs: 45_000 })
  expect(silent.passed).toBe(false)
  expect(silent.tests[0].error).toContain('reported no tests')
  const late = closePage(undefined, { timedOut: true, deadlineMs: 45_000 })
  expect(late.tests[0].error).toContain('did not finish within 45s')
})

test('examples that never settled fail the page even when others passed', () => {
  const closed = closePage(tallyExamples([passing]), {
    timedOut: false,
    deadlineMs: 45_000,
    stalled: 2,
  })
  expect(closed.passed).toBe(false)
  expect(closed.tests.at(-1)?.error).toContain('2 example(s)')
})

test('a page that finished with results is left exactly as it is', () => {
  const page = tallyExamples([passing])
  expect(closePage(page, { timedOut: false, deadlineMs: 45_000 })).toBe(page)
})
