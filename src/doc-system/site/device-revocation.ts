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

import { DEVICE_ID_PATTERN } from './dev-auth.js'

/** How long a fetched list is used before the next request fetches it again. */
export const REVOCATION_FRESH_MS = 60 * 1000
/** How long the last good list is still trusted when a fetch fails. */
export const REVOCATION_STALE_MS = 10 * 60 * 1000
/** A fetch that takes longer than this has failed. */
export const REVOCATION_TIMEOUT_MS = 3000

/**
 * Where the list for `domain` is read. `template` (`{domain}` substituted) replaces the box's
 * URL; it exists so a test can serve its own list (`TOSIJS_REVOKED_URL`), and anyone able to
 * set a dev server's environment already controls it.
 */
export function revocationUrl(domain: string, template?: string): string {
  return template
    ? template.replaceAll('{domain}', encodeURIComponent(domain))
    : `https://${domain}/revoked.txt`
}

/** The ids in a revoked.txt body; anything that is not an id is ignored. */
export function parseRevoked(text: string): Set<string> {
  const ids = new Set<string>()
  for (const line of text.split('\n')) {
    const id = line.trim()
    if (DEVICE_ID_PATTERN.test(id)) ids.add(id)
  }
  return ids
}

interface Entry {
  ids: Set<string>
  at: number
}

export interface RevocationList {
  /** The list for `domain`: cached while fresh, else fetched; null when it cannot be trusted. */
  current(domain: string): Promise<ReadonlySet<string> | null>
  /** Every domain a pass has been checked for, so a sweep can refresh them. */
  domains(): string[]
}

export function revocationList(opts: {
  /** Presented as the `tosi_edit` cookie: Caddy's gate in front of the box's root. */
  editKey: string
  /** See revocationUrl. */
  url?: string
  fetch?: (url: string, init: RequestInit) => Promise<Response>
  now?: () => number
}): RevocationList {
  const get = opts.fetch ?? ((url, init) => fetch(url, init))
  const now = opts.now ?? Date.now
  const cache = new Map<string, Entry>()
  const inFlight = new Map<string, Promise<ReadonlySet<string> | null>>()

  const trusted = (domain: string): Set<string> | null => {
    const entry = cache.get(domain)
    return entry && now() - entry.at <= REVOCATION_STALE_MS ? entry.ids : null
  }

  const refresh = async (domain: string) => {
    try {
      const response = await get(revocationUrl(domain, opts.url), {
        headers: { cookie: `tosi_edit=${opts.editKey}` },
        redirect: 'manual',
        signal: AbortSignal.timeout(REVOCATION_TIMEOUT_MS),
      })
      const ids =
        response.status === 404
          ? new Set<string>()
          : response.status === 200
          ? parseRevoked(await response.text())
          : null
      if (ids) cache.set(domain, { ids, at: now() })
    } catch {
      // Unreachable or timed out: keep the last good copy while it is trusted.
    }
    return trusted(domain)
  }

  return {
    current(domain) {
      const entry = cache.get(domain)
      if (entry && now() - entry.at < REVOCATION_FRESH_MS)
        return Promise.resolve(entry.ids)
      let pending = inFlight.get(domain)
      if (!pending) {
        pending = refresh(domain).finally(() => inFlight.delete(domain))
        inFlight.set(domain, pending)
      }
      return pending
    },
    domains: () => [...cache.keys()],
  }
}
