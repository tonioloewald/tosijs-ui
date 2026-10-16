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
 * Code blocks come from marked (`collectCodeTokens`), the parser the pages are rendered with,
 * and liveness from `isLiveFence`, THE predicate. Neither is re-derived here: a second copy of
 * the liveness rule is what disagreed when `:static` shipped, a regex of its own in the bundle
 * guard is what the 1.16.7 review caught deciding a `strict` build, and the line scanner that
 * first replaced it missed CRLF files and blockquoted fences. Every build-side "does this
 * corpus have live examples?" asks here.
 */
export declare function liveFenceLanguages(docs: Array<{
    text?: string;
}>, policy?: ExamplePolicy): Set<string>;
export declare function deadInPageAnchors(html: string): string[];
/**
 * Links in a RENDERED page written as a bare page name (`[valueRenderer](value-renderer)`).
 *
 * Every page is served at `/slug/`, so a relative `value-renderer` resolves to
 * `/this-page/value-renderer`, which is never a page: the link is broken with or without
 * script. It is the natural thing to write and reads correctly in the source, which is how
 * three of them shipped. Only a name with no `.` and no `/` is reported, so a relative asset
 * (`diagram.svg`, `img/x.png`) is left alone. The fix is the root-relative `/value-renderer/`.
 */
export declare function bareNameLinks(html: string): string[];
