import { test, expect } from 'bun:test'
import { testReportVerdict } from './test-report.js'

const pages = (n: number) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`p${i}.ts`, {}]))

test('a full, failure-free report passes', () => {
  expect(
    testReportVerdict({
      passed: 76,
      failed: 0,
      pages: pages(19),
      pagesWithTests: 19,
      pagesTested: 19,
    })
  ).toEqual({ ok: true, reasons: [] })
})

test('REGRESSION #2874: results for 7 of 19 pages is not a pass, whatever `failed` says', () => {
  const verdict = testReportVerdict({
    passed: 41,
    failed: 0,
    pages: pages(7),
    pagesWithTests: 19,
    pagesTested: 19,
  })
  expect(verdict.ok).toBe(false)
  expect(verdict.reasons.join(' ')).toContain('7 of 19')
})

test('a failed test, an unrun page and an empty run each fail, with their own reason', () => {
  expect(
    testReportVerdict({
      passed: 1,
      failed: 2,
      pages: pages(1),
      pagesWithTests: 1,
      pagesTested: 1,
    }).reasons
  ).toEqual(['2 test(s) failed'])
  expect(
    testReportVerdict({
      passed: 5,
      failed: 0,
      pages: pages(3),
      pagesWithTests: 3,
      pagesTested: 2,
    }).ok
  ).toBe(false)
  expect(testReportVerdict({}).reasons).toContain('no tests ran')
})
