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
 * Assemble the options handed to the ePub builder.
 *
 * Exported and separated from `buildSite` because the bug this prevents lived in the
 * ASSEMBLY, not in the date function: `modified` sat above a `...epubOpts` spread, so the
 * adopter's raw value overwrote the sanitised one and an unnormalised string reached the OPF.
 * `epub-date.test.ts` was green throughout, because it called the date function directly and
 * never crossed the wiring that threw its result away.
 */
export declare function epubOptionsFor(epubOpts: Record<string, unknown>, version: string, bookTarget?: unknown): Record<string, unknown>;
export declare function versionAnchoredDate(version: string, override?: string): string;
export declare function buildSite(config: SiteConfig, opts?: {
    skipAudit?: boolean;
    lock?: boolean;
}): Promise<boolean>;
