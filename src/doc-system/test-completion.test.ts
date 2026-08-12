import { test, expect } from 'bun:test'
import { isSettled, unsettledExamples } from './test-completion'

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
