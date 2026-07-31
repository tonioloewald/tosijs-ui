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
export declare function lastVersionTag(): Promise<string>;
export declare function collect(since: string): Promise<CommitRecord[]>;
export declare function renderSection(version: string, records: CommitRecord[]): string;
export declare function uncovered(records: CommitRecord[], changelog: string): Bullet[];
/** Commits asserting a code change whose diff is markdown only. */
export declare function unsupportedClaims(records: CommitRecord[]): CommitRecord[];
