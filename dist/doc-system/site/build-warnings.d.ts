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
/**
 * The in-page links (`href="#…"`) in a RENDERED page that point at no id on it.
 *
 * A dead in-page anchor is the one broken link a reader cannot tell from a working one: it
 * is styled as a link, it does nothing, and nothing reports it (board #3178). Asked of the
 * rendered HTML and not of the markdown, so the ids are the ones the page really carries
 * (`renderDocMarkdown`, THE renderer) and no second copy of the heading-id rule exists here.
 *
 * Not reported, because they are not in-page anchors or resolve only in the browser:
 * `#/route` and `#!…` (hash routers), a bare `#`, `#top`, and `#example-N` / a fence's own
 * `#id` (live examples get their ids when the page hydrates).
 */
export declare function deadInPageAnchors(html: string): string[];
