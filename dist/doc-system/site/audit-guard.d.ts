export type AuditSeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical';
export type AuditMode = 'fail' | 'warn' | 'off';
/** One advisory as `bun audit --json` reports it, flattened with its package. */
export interface AuditAdvisory {
    package: string;
    id: number;
    url: string;
    title: string;
    severity: AuditSeverity;
    vulnerableVersions?: string;
    /** GHSA id parsed from `url`, e.g. 'GHSA-25h7-pfq9-p65f' (if present) */
    ghsa?: string;
    /** what KIND of harm this is — annotation only, never changes whether it blocks */
    risk?: Classification;
}
export type RiskNature = 
/** C or I impact — can leak or alter data / execute code */
'compromise'
/** availability-only — resource exhaustion, hang, crash */
 | 'dos'
/** no or unparseable vector, or an escalatable CWE — assume the worst */
 | 'unknown';
export interface Classification {
    nature: RiskNature;
    /** short label for the report line */
    label: string;
    /** what drove the call, so the reader can second-guess it */
    basis: string;
}
/** Classify one advisory's nature from its CVSS vector + CWEs. Fails CLOSED. */
export declare function classifyRisk(raw: {
    cvss?: {
        vectorString?: string;
    } | null;
    cwe?: string[] | null;
}): Classification;
/**
 * A time-boxed exception. A gate suppresses a matching advisory ONLY while it is
 * valid and unexpired — after `expires` it stops suppressing and the build fails
 * again, which is the point: an accepted risk gets re-evaluated on a deadline
 * rather than living forever in an allowlist nobody re-reads.
 */
export interface AuditGate {
    /** GHSA id, the numeric advisory id, or a package name (package match is broad) */
    advisory: string;
    /** why this is temporarily allowed — required, non-empty */
    reason: string;
    /** YYYY-MM-DD; on/after this date the gate no longer suppresses — required */
    expires: string;
}
export interface AuditConfig {
    /** 'fail' (default) blocks the build; 'warn' reports and proceeds; 'off' skips it */
    mode?: AuditMode;
    /** minimum severity that blocks, default 'high' */
    level?: AuditSeverity;
    /** time-boxed exceptions */
    allow?: AuditGate[];
    /**
     * What a finding must be to BLOCK. Default `'severity'` — today's behaviour, unchanged.
     *
     * `'runtime'` additionally requires the package to be reachable from a runtime edge
     * (tosijs-ui#56). A consumer running `buildSite` inside an app monorepo reported 18
     * high/critical advisories of which the runtime-reachable subset was a small fraction;
     * blocking on the rest would have bricked local dev over risk they do not carry.
     *
     * NOT the default, deliberately. Switching it silently would be weakening a security gate
     * on someone else's behalf, and `runtimeReachable` is conservative but still a heuristic.
     * Build-only findings are LABELLED either way, which is the cheap half of the ask and the
     * half that needs no policy decision.
     */
    blockOn?: 'severity' | 'runtime';
}
export interface GatedFinding {
    advisory: AuditAdvisory;
    reason: string;
    /** whole days until the gate expires (active gate) */
    daysLeft?: number;
    /** whole days since the gate expired (expired gate) */
    daysAgo?: number;
}
export interface AuditResult {
    /** did the audit actually run and parse? false => fail-open, treated as pass */
    ran: boolean;
    /** no blocking findings (or couldn't run) */
    ok: boolean;
    mode: AuditMode;
    level: AuditSeverity;
    /** at/above threshold and NOT suppressed — these fail the build */
    blocking: AuditAdvisory[];
    /** suppressed by a valid, unexpired gate */
    gated: GatedFinding[];
    /** matched a gate whose expiry has passed — NOT suppressed (also in `blocking`) */
    expired: GatedFinding[];
    /** gates that are structurally invalid (missing reason/expires) — ignored */
    invalid: Array<{
        gate: AuditGate;
        problem: string;
    }>;
    /** valid gates that matched no current advisory — safe to delete */
    stale: AuditGate[];
    /** findings below the blocking threshold (reported, never blocking) */
    belowThreshold: AuditAdvisory[];
}
/** Injectable subprocess seam for tests. */
export type AuditRunner = () => Promise<string>;
export declare const AUDIT_TIMEOUT_MS = 20000;
/**
 * Parse `bun audit --json` output — `{ "<pkg>": [advisory, …] }` — into a flat
 * advisory list. Returns null when the text is not a JSON object (offline, an
 * error dump, an incompatible bun): the caller reads null as "couldn't check".
 */
export declare function parseAuditJson(text: string): AuditAdvisory[] | null;
/** Resolve the effective mode from config + the TOSIJS_AUDIT env override. */
export declare function resolveAuditMode(config: boolean | AuditConfig | undefined): AuditMode;
/** Test-only: forget the per-process audit memo. */
export declare function resetAuditMemo(): void;
/**
 * Run `bun audit`, classify findings against the configured threshold and the
 * time-boxed allowlist, and return a structured verdict. Never exits.
 *
 * Memoized per process (see above) unless `opts.runAudit` is injected.
 */
export declare function auditDependencies(config: boolean | AuditConfig | undefined, opts?: {
    now?: Date;
    runAudit?: AuditRunner;
}): Promise<AuditResult>;
export interface GroupedAdvisory {
    advisory: AuditAdvisory;
    /** every vulnerable range this advisory matched for this package */
    ranges: string[];
}
export declare function groupAdvisories(advisories: AuditAdvisory[]): GroupedAdvisory[];
/**
 * Print the verdict. Blocking findings first (why the build is failing), then
 * active gates, expired/invalid gates, stale gates, and — when blocking — the
 * due-diligence footer. Returns nothing; the caller decides what to do with `ok`.
 */
export declare function reportAudit(result: AuditResult, label?: string): void;
