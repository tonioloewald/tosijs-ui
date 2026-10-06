export interface TestReportLike {
    passed?: number;
    failed?: number;
    pages?: Record<string, unknown>;
    pagesWithTests?: number;
    pagesTested?: number;
}
export interface TestReportVerdict {
    ok: boolean;
    /** One sentence per reason the report is not a pass; empty when `ok`. */
    reasons: string[];
}
export declare function testReportVerdict(report: TestReportLike): TestReportVerdict;
