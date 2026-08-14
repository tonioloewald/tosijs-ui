export interface LockHolder {
    pid: number;
    role: 'dev-server' | 'build';
    /** epoch ms, for the message only — staleness is decided by liveness, never by age */
    startedAt: number;
    root: string;
    /** dev server only */
    port?: number;
}
/** A stable per-project lock path. Two checkouts of one project lock independently. */
export declare function lockPathFor(root: string, dir?: string): string;
export type LockDecision = {
    action: 'take';
} | {
    action: 'reenter';
} | {
    action: 'refuse';
    holder: LockHolder;
};
/**
 * Who gets to write, given who currently holds the lock.
 *
 * Kept separate from the filesystem because every interesting case is a rule, not an I/O
 * result: a dead holder's lock must not wedge the project (a crashed server would otherwise
 * lock the repo until someone found a file they do not know exists), and a dev server
 * running its OWN rebuild must not deadlock against the lock it is holding.
 */
export declare function lockDecision(existing: LockHolder | null, self: {
    pid: number;
}, isAlive: (pid: number) => boolean): LockDecision;
/** The message the refused build prints. Names the holder, and what to do about it. */
export declare function describeHolder(holder: LockHolder): string;
export declare function isProcessAlive(pid: number): boolean;
export interface AcquiredLock {
    ok: boolean;
    holder?: LockHolder;
    release: () => void;
}
/**
 * Claim the output tree, or report who has it.
 *
 * `release` is always safe to call — including after a re-entrant acquire, where it
 * deliberately does nothing so an inner build cannot release the dev server's lock.
 */
export declare function acquireBuildLock(root: string, role: LockHolder['role'], opts?: {
    port?: number;
    dir?: string;
    isAlive?: (pid: number) => boolean;
    pid?: number;
}): AcquiredLock;
