/*
WHICH files `editableSources` may touch (tosijs-ui#128).

Containment was `resolveInRepo` — anywhere under the project root. That is the whole repo,
including `.git/hooks/*`, `bunfig.toml` (preload), `package.json` scripts and `bin/`, every one
of which executes on the developer's next ordinary command.

With the CSRF hole closed (#90/#121) there is no known path to an unauthorised write, so this
is hardening rather than a live hole. It is worth doing anyway, because the gap between what a
feature NEEDS and what it CAN do is where the next authorisation slip becomes code execution
instead of a bad doc edit.

An ALLOW-list, not a deny-list, and derived rather than maintained: the endpoint exists to edit
the source of a page you are looking at, so the writable set is exactly the files the doc
extractor scraped — which the corpus already records as each doc's `path`. A deny-list of
dangerous names would need updating every time someone invents a new way to execute a file, and
would be wrong by default; this is right by default and needs no maintenance.

FAILS CLOSED. An unreadable or empty corpus permits nothing. A write endpoint that opens up
when it cannot see is the failure this is meant to prevent, not a convenience to preserve.
*/
import * as path from 'path';
/** Absolute paths the source editor may read or write, from the doc corpus. */
export function editableSourcePaths(corpus, projectRoot) {
    const allowed = new Set();
    if (!Array.isArray(corpus))
        return allowed;
    for (const doc of corpus) {
        if (!doc || typeof doc.path !== 'string' || doc.path === '')
            continue;
        const resolved = path.resolve(projectRoot, doc.path.replace(/^\/+/, ''));
        // A corpus entry escaping the root is not a reason to widen the set.
        if (resolved === projectRoot ||
            !resolved.startsWith(projectRoot + path.sep)) {
            continue;
        }
        allowed.add(resolved);
    }
    return allowed;
}
/**
 * May the editor touch this resolved path?
 *
 * Takes the already-root-confined path, so this is the SECOND gate rather than a replacement
 * for the first — `resolveInRepo` still runs, and a path that escapes the root never reaches
 * here.
 */
export function mayEditSource(resolved, allowed) {
    return resolved !== null && allowed.has(resolved);
}
