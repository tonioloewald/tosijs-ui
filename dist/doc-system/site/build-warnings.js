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
 * `#/route` and `#!…` (hash routers), a bare `#`, `#top`, and `#example-N` (live examples
 * are numbered when the page hydrates). A fence's own `#id` is on the rendered page and is
 * checked like any other id.
 *
 * Tags are read with their attributes in any order and any quoting. What it cannot see is
 * an id that only exists once a script has run; such a link is reported.
 */
// One HTML start tag, attributes and all. Quoted values may hold `>`, which is why this is
// not `<[^>]*>`.
const START_TAG = /<([a-z][a-z0-9-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/gi;
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
export function deadInPageAnchors(html) {
    const ids = new Set();
    const links = [];
    for (const tag of html.matchAll(START_TAG)) {
        const name = tag[1].toLowerCase();
        for (const attr of tag[2].matchAll(ATTRIBUTE)) {
            const key = attr[1].toLowerCase();
            const value = unescapeAttr(attr[2] ?? attr[3] ?? attr[4] ?? '');
            if (key === 'id' || key === 'data-example-id')
                ids.add(value);
            // `name` is an anchor target on <a> only; on a form field it is a field name.
            else if (key === 'name' && name === 'a')
                ids.add(value);
            else if (key === 'href' && name === 'a' && value.startsWith('#'))
                links.push(value.slice(1));
        }
    }
    const dead = new Set();
    for (let target of links) {
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
