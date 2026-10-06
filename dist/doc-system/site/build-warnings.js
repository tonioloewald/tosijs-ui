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
export function liveFenceLanguages(docs, policy = 'auto') {
    const langs = new Set();
    for (const doc of docs) {
        let open = null;
        for (const line of (doc.text ?? '').split('\n')) {
            const fence = line.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
            if (!fence)
                continue;
            const [, marker, rest] = fence;
            const info = rest.trim();
            if (open) {
                // Only a bare run of the SAME character, at least as long, closes the block.
                if (marker[0] === open.char && marker.length >= open.length && !info) {
                    open = null;
                }
                continue;
            }
            // An info string on a backtick fence cannot itself contain a backtick (CommonMark).
            if (marker[0] === '`' && info.includes('`'))
                continue;
            open = { char: marker[0], length: marker.length };
            const { lang, mode } = parseFenceInfo(info);
            if (lang && isLiveFence(lang, mode, policy))
                langs.add(lang);
        }
    }
    return langs;
}
