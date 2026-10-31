/** The child's exit code when it could not run at all (a missing package or browser). */
export declare const NOT_RUN_EXIT = 3;
/** axe-core's tags for WCAG 2.0, 2.1 and 2.2 at levels A and AA. */
export declare const AXE_TAGS: string[];
export interface AxeFinding {
    /** the page's path, as served */
    page: string;
    rule: string;
    impact: string | null;
    help: string;
    /** a CSS selector for each element that fails the rule */
    targets: string[];
}
/** A page the audit could not check fully: it never loaded, or never stopped being busy. */
export interface UnsettledPage {
    page: string;
    reason: string;
}
export type AxeAuditResult = {
    ran: true;
    violations: AxeFinding[];
    unsettled: UnsettledPage[];
} | {
    ran: false;
    reason: string;
};
export declare function auditBuiltSite(opts: {
    outputDir: string;
    basePath?: string;
    /** page paths to audit, e.g. `/`, `/lighting/` */
    pages: string[];
    /** the project Playwright and axe-core are resolved from (default: the working directory) */
    projectDir?: string;
    /** how long a page may take to load, or stay `aria-busy="true"` (default 30s) */
    slowPageMs?: number;
}): Promise<AxeAuditResult>;
/** The report: one line per rule per page, worst impact first. */
export declare function formatAxeFindings(violations: AxeFinding[]): string;
