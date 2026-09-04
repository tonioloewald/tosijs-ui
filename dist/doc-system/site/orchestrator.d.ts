import type { SiteConfig } from './site-config.js';
declare global {
    var Bun: any;
}
/**
 * Is this lock holder something we can hand work to?
 *
 * Exported so the test can import the SHIPPED predicate. The previous test retyped this
 * condition inside the test file and asserted on the copy, which passed forever and stayed
 * green when the real one was broadened — the 1.13.0 review caught it by mutation.
 *
 * Only a live dev server with a port that can safely reach a URL: a second `bun run build` is
 * not something to hand work to, and an out-of-range or non-integer port is a value that has
 * no business being interpolated (`https://localhost:1@evil/` parses to another host).
 */
export declare function canDelegateTo(holder: {
    role?: string;
    port?: number;
}): boolean;
/**
 * May `buildSite` wipe `dist/` on this run? Only if this run regenerates all of it.
 *
 * See the long note at the call site (tosijs-ui#130). Pure and exported so the rule is
 * testable without running a build — the bug it prevents is a `rm -rf` of somebody's
 * published package output, which is not something to discover empirically.
 */
export declare function shouldCleanDist(config: {
    emitLibrary?: boolean;
    libraryTsconfig?: string;
    libraryBuild?: unknown;
}): boolean;
export declare function buildSite(config: SiteConfig, opts?: {
    skipAudit?: boolean;
    lock?: boolean;
}): Promise<boolean>;
