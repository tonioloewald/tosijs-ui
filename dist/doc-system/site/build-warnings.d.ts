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
 * Goes through `parseFenceInfo` and `isLiveFence` rather than a rule of its own: a second
 * copy of that rule is exactly what disagreed when `:static` shipped (see example-policy.ts),
 * and a third — a four-language regex in the bundle guard — is what the 1.16.7 review caught
 * deciding a `strict` build. Every build-side "does this corpus have live examples?" asks here.
 *
 * Fences are tracked the way CommonMark closes them, because the renderer does: a block opened
 * with N backticks (or tildes) closes only on a bare line of at least N of the same character.
 * Anything less would read a fence SHOWN inside a longer block as a fence of its own, or miss
 * the `~~~` and four-backtick blocks that render as live examples all the same.
 */
export declare function liveFenceLanguages(docs: Array<{
    text?: string;
}>, policy?: ExamplePolicy): Set<string>;
