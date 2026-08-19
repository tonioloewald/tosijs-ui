export type Tag = 'break' | 'new' | 'fix' | 'change' | 'note';
export interface Bullet {
    tag: Tag;
    text: string;
    sha: string;
    issues: number[];
}
export interface CommitRecord {
    sha: string;
    subject: string;
    bullets: Bullet[];
    /** files touched, for the claim-vs-diff check */
    files: string[];
}
export declare function parseBullets(message: string, sha?: string): Bullet[];
/** Does this diff plausibly support a code claim, or is it markdown only? */
export declare function isDocsOnly(files: string[]): boolean;
/** A tag like v1.2.3-rc.1 / 1.2.3-beta.2 — notes accumulate ACROSS these. */
export declare function isPrereleaseTag(tag: string): boolean;
/**
 * The last STABLE release tag.
 *
 * A bare `git describe --tags` returns the nearest tag including prereleases, so on a
 * prerelease line the baseline became the previous rc — and `release-check` reported
 * "0 annotations, all accounted for" over an empty range at exactly the boundary it
 * exists to guard. Release notes accumulate from the last thing users actually got.
 */
export declare function lastVersionTag(): Promise<string>;
export declare function collect(since: string): Promise<CommitRecord[]>;
export declare function renderSection(version: string, records: CommitRecord[]): string;
export declare function uncovered(records: CommitRecord[], changelog: string): Bullet[];
/** Commits asserting a code change whose diff is markdown only. */
export declare function unsupportedClaims(records: CommitRecord[]): CommitRecord[];
export type BumpKind = 'major' | 'minor' | 'patch' | 'prerelease' | 'unknown';
/** Which component moved, comparing the version being cut to the last released one. */
export declare function classifyBump(from: string, to: string): BumpKind;
export declare const SENSITIVE_PATHS: string[];
export interface BumpConcern {
    level: 'block' | 'warn';
    reason: string;
    evidence: string[];
}
/**
 * Is the version being cut big enough for what changed?
 *
 * The project's rule is that minors are for breaking changes and feature rollouts, and
 * additive non-breaking work ships as a patch. That rule is written down and was still
 * mis-applied two releases after it was written — by the person who wrote it — because
 * nothing checked it (#79). And the nine-lens review triggers on the version LETTER, so it
 * only fires when the letter is already right, which is exactly the judgement most in need
 * of review (#78).
 *
 * So this keys on what the diff and the annotations SAY, not on what the release was called.
 * Two mechanical signals, both chosen because a false positive is cheap (read a message) and
 * a false negative is what shipped last time:
 *
 * - a `[break]` bullet in a patch — the contract is "a patch never breaks you"
 * - a touched security path in a patch — a loosened default reaches people who never read
 *   the notes, and the ones who tightened their config deliberately are the ones harmed
 *
 * `[change]` only warns: widening a peer range is a `[change]` and is a perfectly good patch.
 */
export declare function bumpConcerns(opts: {
    bump: BumpKind;
    bullets: Bullet[];
    changedPaths: string[];
}): BumpConcern[];
