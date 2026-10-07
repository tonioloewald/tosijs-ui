/*
Whether a browser-test report is a PASS — decided here, by one function, for every lane.

The lane used to pass on `failed === 0`. That is the verdict for the tests that reported; it
says nothing about the ones that did not, and a run once passed with results for 7 of 19
pages (board #2874). The report already carried the numbers to notice — nobody compared them.
*/

export interface TestReportLike {
  passed?: number
  failed?: number
  pages?: Record<string, unknown>
  pagesWithTests?: number
  pagesTested?: number
}

export interface TestReportVerdict {
  ok: boolean
  /** One sentence per reason the report is not a pass; empty when `ok`. */
  reasons: string[]
}

export function testReportVerdict(report: TestReportLike): TestReportVerdict {
  const reasons: string[] = []
  const failed = report.failed ?? 0
  const passed = report.passed ?? 0
  const expected = report.pagesWithTests ?? 0
  const tested = report.pagesTested ?? 0
  const recorded = Object.keys(report.pages ?? {}).length

  if (failed > 0) reasons.push(`${failed} test(s) failed`)
  if (passed + failed === 0) reasons.push('no tests ran')
  // A report that ran tests but cannot say over how many pages is not evidence of coverage.
  // (Missing fields read as 0, so without this `{ passed: 5 }` alone would be a pass.)
  if (passed + failed > 0 && expected === 0) {
    reasons.push('the report does not say how many pages have tests')
  }
  if (tested < expected) {
    reasons.push(`only ${tested} of ${expected} pages with tests were run`)
  }
  // FEWER, not "different": a page with no test blocks whose example threw also records an
  // entry (that failure is counted above), and must not read as "20 of 19".
  if (recorded < expected) {
    reasons.push(
      `results were recorded for ${recorded} of ${expected} pages with tests`
    )
  }
  return { ok: reasons.length === 0, reasons }
}
