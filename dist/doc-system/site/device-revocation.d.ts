/** How long a fetched list is used before the next request fetches it again. */
export declare const REVOCATION_FRESH_MS: number;
/** How long the last good list is still trusted when a fetch fails. */
export declare const REVOCATION_STALE_MS: number;
/** A fetch that takes longer than this has failed. */
export declare const REVOCATION_TIMEOUT_MS = 3000;
/**
 * Where the list for `domain` is read. `template` (`{domain}` substituted) replaces the box's
 * URL; it exists so a test can serve its own list (`TOSIJS_REVOKED_URL`), and anyone able to
 * set a dev server's environment already controls it.
 */
export declare function revocationUrl(domain: string, template?: string): string;
/** The ids in a revoked.txt body; anything that is not an id is ignored. */
export declare function parseRevoked(text: string): Set<string>;
export interface RevocationList {
    /** The list for `domain`: cached while fresh, else fetched; null when it cannot be trusted. */
    current(domain: string): Promise<ReadonlySet<string> | null>;
    /** Every domain a pass has been checked for, so a sweep can refresh them. */
    domains(): string[];
}
export declare function revocationList(opts: {
    /** Presented as the `tosi_edit` cookie: Caddy's gate in front of the box's root. */
    editKey: string;
    /** See revocationUrl. */
    url?: string;
    fetch?: (url: string, init: RequestInit) => Promise<Response>;
    now?: () => number;
}): RevocationList;
