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
    /**
     * The list for `domain`, or null when it cannot be trusted. Never waits on the box while a
     * copy less than `REVOCATION_STALE_MS` old exists: a copy older than `REVOCATION_FRESH_MS` is
     * returned at once and refreshed in the background.
     */
    current(domain: string): Promise<ReadonlySet<string> | null>;
    /** Fetch now, whatever the cache holds (the once-a-minute sweep). */
    refresh(domain: string): Promise<ReadonlySet<string> | null>;
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
    /**
     * Told when the list for a domain stops or starts being readable: `problem` says why, or is
     * null when it is readable again. While it is unreadable no device pass is honoured, which
     * looks to a key holder like "this workspace needs an invite link", so say it.
     */
    onChange?: (domain: string, problem: string | null) => void;
}): RevocationList;
