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
