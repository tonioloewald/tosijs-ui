/*
Things a site build can see are wrong and used to mention quietly, or not at all.

A build that exits 0 with a warning in scrollback is how tosijs-product's 0.8.0 blocker reached
a release candidate (#145, board #2543), and how tjs.tosijs.net ran every example against the
wrong tjs-lang for weeks without anyone being told (#210). Warning stays the default, because
each of these is a legitimate thing to do on purpose. `strict: true` in the site config is how a
project that never does them on purpose says so, and then the build fails.
*/
import { isLiveFence } from '../example-policy.js';
import { collectCodeTokens } from '../code-fences.js';
/** Thrown by `misconfigured` under `strict`, so a caller can tell it from a crash. */
export class SiteMisconfiguredError extends Error {
    name = 'SiteMisconfiguredError';
}
/**
 * Report a misconfiguration: a warning by default, a thrown `SiteMisconfiguredError` (which
 * fails `buildSite`) when the site config sets `strict: true`.
 */
export function misconfigured(strict, message) {
    if (strict) {
        throw new SiteMisconfiguredError(`${message}\n    This fails the build because the site config sets \`strict: true\`.\n`);
    }
    console.warn(message);
}
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
export function liveFenceLanguages(docs, policy = 'auto') {
    const langs = new Set();
    for (const doc of docs) {
        for (const { lang, mode } of collectCodeTokens(doc.text ?? '')) {
            if (lang && isLiveFence(lang, mode, policy))
                langs.add(lang);
        }
    }
    return langs;
}
const unescapeAttr = (s) => s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
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
export function deadInPageAnchors(html) {
    const ids = new Set();
    for (const m of html.matchAll(/<[a-z][^<>]*?\s(?:id|name|data-example-id)="([^"]*)"/gi))
        ids.add(unescapeAttr(m[1]));
    const dead = new Set();
    for (const m of html.matchAll(/<a\b[^<>]*?\shref="#([^"]*)"/gi)) {
        let target = unescapeAttr(m[1]);
        try {
            target = decodeURIComponent(target);
        }
        catch {
            // a stray % — compare it as written
        }
        if (!target ||
            target === 'top' ||
            /^[/!]/.test(target) ||
            /^example-\d+$/.test(target) ||
            ids.has(target))
            continue;
        dead.add(target);
    }
    return [...dead];
}
