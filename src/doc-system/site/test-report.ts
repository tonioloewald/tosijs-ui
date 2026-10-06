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
  if (tested !== expected) {
    reasons.push(`only ${tested} of ${expected} pages with tests were run`)
  }
  if (recorded !== expected) {
    reasons.push(
      `results were recorded for ${recorded} of ${expected} pages with tests`
    )
  }
  return { ok: reasons.length === 0, reasons }
}
