/*
The revoked-device list, as a workspace reads it from the preview box (board #3416).

`tosijs-tunnel --revoke <id>` appends the id to `/srv/preview/_index/revoked.txt` on the box,
which Caddy serves at `https://<preview domain>/revoked.txt` behind the same cookie gate as the
box's root list. A workspace fetches it, presenting the edit key it already holds, before it
honours a device pass (dev-auth.ts), and at most once a minute per domain.

FAILS CLOSED. When the list cannot be read and the last good copy is more than ten minutes old,
`current` answers null, and a null list honours no pass. Requests over the tunnel come through
the same box, so a box that cannot answer this is rarely one that can deliver a request; the
cost of refusing is small and the alternative is honouring a pass that may be revoked.

A 404 is an empty list: a box that has never revoked anything has no file.
*/
import { DEVICE_ID_PATTERN, revokeDeviceSessions, } from './dev-auth.js';
/** How long a fetched list is used before the next request fetches it again. */
export const REVOCATION_FRESH_MS = 60 * 1000;
/** How long the last good list is still trusted when a fetch fails. */
export const REVOCATION_STALE_MS = 10 * 60 * 1000;
/** A fetch that takes longer than this has failed. */
export const REVOCATION_TIMEOUT_MS = 3000;
/**
 * Where the list for `domain` is read. `template` (`{domain}` substituted) replaces the box's
 * URL; it exists so a test can serve its own list (`TOSIJS_REVOKED_URL`), and anyone able to
 * set a dev server's environment already controls it.
 */
export function revocationUrl(domain, template) {
    return template
        ? template.replaceAll('{domain}', encodeURIComponent(domain))
        : `https://${domain}/revoked.txt`;
}
/** The ids in a revoked.txt body; anything that is not an id is ignored. */
export function parseRevoked(text) {
    const ids = new Set();
    for (const line of text.split('\n')) {
        const id = line.trim();
        if (DEVICE_ID_PATTERN.test(id))
            ids.add(id);
    }
    return ids;
}
export function revocationList(opts) {
    const get = opts.fetch ?? ((url, init) => fetch(url, init));
    const now = opts.now ?? Date.now;
    const cache = new Map();
    const inFlight = new Map();
    /** When each domain last FAILED, so a broken box is asked at most once per FRESH window. */
    const failedAt = new Map();
    const problems = new Map();
    const trusted = (domain) => {
        const entry = cache.get(domain);
        return entry && now() - entry.at <= REVOCATION_STALE_MS ? entry.ids : null;
    };
    const report = (domain, problem) => {
        if ((problems.get(domain) ?? null) === problem)
            return;
        problems.set(domain, problem);
        opts.onChange?.(domain, problem);
    };
    const fetchList = async (domain) => {
        const url = revocationUrl(domain, opts.url);
        try {
            const response = await get(url, {
                headers: { cookie: `tosi_edit=${opts.editKey}` },
                redirect: 'manual',
                signal: AbortSignal.timeout(REVOCATION_TIMEOUT_MS),
            });
            const ids = response.status === 404
                ? new Set()
                : response.status === 200
                    ? parseRevoked(await response.text())
                    : null;
            if (ids) {
                cache.set(domain, { ids, at: now() });
                failedAt.delete(domain);
            }
            else {
                failedAt.set(domain, now());
                // 401/403: the box does not accept this workspace's edit key (a half-done rotation).
                if (!trusted(domain))
                    report(domain, `${url} answered ${response.status}`);
            }
        }
        catch (error) {
            failedAt.set(domain, now());
            if (!trusted(domain))
                report(domain, `${url} could not be read (${error.message})`);
        }
        const ids = trusted(domain);
        if (ids)
            report(domain, null);
        return ids;
    };
    const refresh = (domain) => {
        let pending = inFlight.get(domain);
        if (!pending) {
            pending = fetchList(domain).finally(() => inFlight.delete(domain));
            inFlight.set(domain, pending);
        }
        return pending;
    };
    return {
        current(domain) {
            const entry = cache.get(domain);
            const age = entry ? now() - entry.at : Infinity;
            const failed = failedAt.get(domain);
            const recentlyFailed = failed !== undefined && now() - failed < REVOCATION_FRESH_MS;
            if (age < REVOCATION_FRESH_MS)
                return Promise.resolve(entry.ids);
            if (age <= REVOCATION_STALE_MS) {
                // Stale but trusted: answer now, refresh behind.
                if (!recentlyFailed)
                    void refresh(domain);
                return Promise.resolve(entry.ids);
            }
            if (recentlyFailed)
                return Promise.resolve(null);
            return refresh(domain);
        },
        refresh,
        domains: () => [...new Set([...cache.keys(), ...failedAt.keys()])],
    };
}
/*
THE SWEEP is the only thing that ends a writing session a revoked device already holds. A request
carrying a live writing session never consults the list (the dev server's `withKeySession`
short-circuits it, because a key adds nothing to a session that can already write), so without
this a revoked device would keep writing until its session expired or the server restarted.
*/
/**
 * One sweep: refresh the list for every domain a pass has been checked for, and end the sessions
 * of every device on a list that could be read. Resolves to how many sessions it ended.
 */
export async function sweepRevocations(list, auth) {
    let ended = 0;
    for (const revoked of await Promise.all(list.domains().map((domain) => list.refresh(domain)))) {
        if (revoked)
            ended += revokeDeviceSessions(auth, revoked);
    }
    return ended;
}
/**
 * Sweep every `REVOCATION_FRESH_MS`. `every` is `setInterval` unless a test passes its own; the
 * timer is unref'd so it never holds a process open.
 */
export function startRevocationSweep(opts) {
    const every = opts.every ?? setInterval;
    const timer = every(() => {
        sweepRevocations(opts.list, opts.auth).then((ended) => {
            if (ended)
                opts.onEnded?.(ended);
        });
    }, REVOCATION_FRESH_MS);
    if (timer && typeof timer.unref === 'function')
        timer.unref();
}
