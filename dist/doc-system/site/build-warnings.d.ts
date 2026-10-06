import { type ExamplePolicy } from '../example-policy.js';
/** Thrown by `misconfigured` under `strict`, so a caller can tell it from a crash. */
export declare class SiteMisconfiguredError extends Error {
    name: string;
}
/**
 * Report a misconfiguration: a warning by default, a thrown `SiteMisconfiguredError` (which
 * fails `buildSite`) when the site config sets `strict: true`.
 */
export declare function misconfigured(strict: boolean | undefined, message: string): void;
/**
 * The languages of the corpus's LIVE fences, under the site's example policy.
 *
 * Goes through `parseFenceInfo` and `isLiveFence` rather than a regex of its own: a second
 * copy of that rule is exactly what disagreed when `:static` shipped (see example-policy.ts).
 */
export declare function liveFenceLanguages(docs: Array<{
    text?: string;
}>, policy?: ExamplePolicy): Set<string>;
