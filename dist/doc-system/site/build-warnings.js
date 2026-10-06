/*
Things a site build can see are wrong and used to mention quietly, or not at all.

A build that exits 0 with a warning in scrollback is how tosijs-product's 0.8.0 blocker reached
a release candidate (#145, board #2543), and how tjs.tosijs.net ran every example against the
wrong tjs-lang for weeks without anyone being told (#210). Warning stays the default, because
each of these is a legitimate thing to do on purpose. `strict: true` in the site config is how a
project that never does them on purpose says so, and then the build fails.
*/
import { isLiveFence, parseFenceInfo, } from '../example-policy.js';
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
 * Goes through `parseFenceInfo` and `isLiveFence` rather than a regex of its own: a second
 * copy of that rule is exactly what disagreed when `:static` shipped (see example-policy.ts).
 */
export function liveFenceLanguages(docs, policy = 'auto') {
    const langs = new Set();
    for (const doc of docs) {
        let open = false;
        for (const line of (doc.text ?? '').split('\n')) {
            const fence = line.match(/^[ \t]*```(.*)$/);
            if (!fence)
                continue;
            // A closing fence is bare; anything after an opening one is its info string.
            if (open) {
                open = false;
                continue;
            }
            open = true;
            const { lang, mode } = parseFenceInfo(fence[1].trim());
            if (lang && isLiveFence(lang, mode, policy))
                langs.add(lang);
        }
    }
    return langs;
}
