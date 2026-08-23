/**
 * How long a link is redeemable. Overridable per project — see `LinkPolicy`.
 *
 * Five minutes, not fifteen: the window is what pays for the short token below. A link is
 * redeemed within seconds of being typed, so the extra ten minutes bought nothing and
 * widened the interval in which an observed URL is a live bearer token.
 */
export declare const LINK_TOKEN_TTL_MS: number;
/**
 * How a magic link may be redeemed.
 *
 * - `'window'` (default) — redeemable REPEATEDLY until it ages out.
 * - `'single-use'` — spent on first redemption, the strict form.
 *
 * The default was `'single-use'`, and it was wrong in practice. A link that dies on first
 * use means: glance at it and close the tab, you need a new link; open it on the laptop then
 * reach for your phone, dead link. The workspace is meant to be the thing you read on a
 * phone, so the mode collided with the feature's own purpose.
 *
 * What settled it was an adopter (manta) replacing it with a never-expiring link of their
 * own. Security that people route around is not security — it is friction plus a worse
 * system built next to it. A 15-minute window in which you can open the same link on both
 * your devices is a smaller concession than the homemade permanent token it was provoking,
 * and the durable credential was always the session cookie anyway: the link is only the
 * thing that hands one over.
 */
export type LinkPolicy = 'window' | 'single-use';
/** Sessions are the durable half — long enough that you are not re-linking daily. */
export declare const SESSION_TTL_MS: number;
export declare const SESSION_COOKIE = "tosi_dev_session";
/** 128 bits, base64url — long enough that guessing is not a threat model. */
export declare function mintToken(): string;
export declare function mintLinkToken(): string;
/**
 * Fold a typed token to canonical form: uppercase, and Crockford's alias mapping.
 *
 * Applied on REDEMPTION, not only when minting. Case-insensitivity that exists in the
 * alphabet but not in the comparison is a claim rather than a behaviour, and the failure it
 * produces is the worst kind: a correct human being told they typed it wrong.
 *
 * `I` and `L` read as `1`, `O` reads as `0` — so someone who transcribes what they think
 * they saw still gets in. Hyphens are dropped, since people group long strings.
 */
export declare function normalizeLinkToken(token: string): string;
/** Constant-time compare that tolerates unequal lengths without throwing. */
export declare function safeEqual(a: string, b: string): boolean;
export interface AuthState {
    /** unspent link tokens → when they expire */
    links: Map<string, number>;
    /** live session tokens → when they expire */
    sessions: Map<string, number>;
}
export declare function createAuthState(): AuthState;
/** Drop anything expired. Called on every use so the maps cannot grow without bound. */
export declare function prune(state: AuthState, now: number): void;
/** Issue a link token to put in a URL. `ttlMs` overrides the 15-minute default. */
export declare function issueLink(state: AuthState, now: number, ttlMs?: number): string;
/**
 * Read the link settings off a site config, with the defaults applied.
 *
 * A non-finite or non-positive `linkTtlMinutes` falls back to the default rather than
 * minting a token that is already expired — a config typo should not silently produce links
 * that never work, which reads as "the tunnel is broken".
 */
export declare function resolveLinkSettings(tunnel?: {
    linkPolicy?: LinkPolicy;
    linkTtlMinutes?: number;
}): {
    policy: LinkPolicy;
    ttlMs: number;
};
/**
 * Redeem a link token for a session token, or return null.
 *
 * Under `'single-use'` the token is deleted BEFORE returning — and deleted whether or not it
 * had expired, so a replay of an expired token cannot linger. Under `'window'` it survives
 * until `prune` ages it out, so the same link works on a second device inside its lifetime.
 *
 * Either way an EXPIRED token is refused: `prune` runs first, so a stale link is gone from
 * the set before the lookup. Widening reuse must not widen lifetime.
 */
export declare function redeemLink(state: AuthState, token: string, now: number, policy?: LinkPolicy): string | null;
export declare const REDEEM_MIN_MS = 100;
/** Consecutive failures after which the slot widens. A human never reaches this. */
export declare const SLOW_AFTER_FAILURES = 10;
/** The widened slot. Ten times slower for anyone guessing; unnoticed by anyone who is not. */
export declare const REDEEM_SLOW_MS = 1000;
/**
 * How many attempts may be WAITING at once before the rest are turned away.
 *
 * Without a cap, serialization is itself the weapon: the queue is unbounded and reachable
 * unauthenticated, so junk requests accumulate and a legitimate redemption waits behind all
 * of them. Measured at the real constants — 50 fire-and-forget requests delayed a valid link
 * by **42 seconds**, and a 2/sec trickle grew the backlog faster than it drained, so the
 * denial outlasted the attack. Worse, the link's own 5-minute TTL is evaluated when the work
 * finally runs, so the valid token can EXPIRE while queued.
 *
 * This is the exact denial of service the no-lockout design was chosen to avoid, reintroduced
 * by the mechanism meant to prevent guessing. A depth cap turns it back into what it should
 * be: overflow is refused instantly and cheaply, while the ~16 in front still pay the full
 * slot, so the rate limit is untouched.
 *
 * **What this does NOT fix, stated plainly:** under a sustained flood a legitimate redemption
 * is *refused* (503, `Retry-After: 2`) rather than served. There is no way around that here —
 * every request over the tunnel arrives from loopback, so there is no identity to prioritise
 * on. What the cap buys is that the failure is immediate and honest instead of a 42-second
 * wait, and that the caller can retry into a queue which drains in ~1.6s at depth 16. The
 * caller also captures the clock on ARRIVAL, so time spent queued can no longer expire the
 * very token being redeemed.
 */
export declare const REDEEM_MAX_WAITING = 16;
export type RedemptionGate = <T>(work: () => T) => Promise<T>;
/** Thrown when the queue is full. The caller answers 503 rather than waiting. */
export declare class RedemptionBusyError extends Error {
    constructor();
}
export interface RedemptionGateOptions {
    minMs?: number;
    slowMs?: number;
    slowAfter?: number;
    maxWaiting?: number;
    /** Did this evaluation succeed? Defaults to truthiness, which suits `string | null`. */
    isSuccess?: (result: unknown) => boolean;
    now?: () => number;
}
/**
 * Run redemptions one at a time, each occupying a fixed slot.
 *
 * The constants are parameters so tests can use small ones; nothing else should change them.
 */
export declare function createRedemptionGate(options?: RedemptionGateOptions): RedemptionGate;
/** Is this session token live? */
export declare function validSession(state: AuthState, token: string | undefined | null, now: number): boolean;
/** Pull one cookie out of a Cookie header. */
export declare function readCookie(header: string | null | undefined, name: string): string | undefined;
/** The Set-Cookie value for a freshly minted session. See the header comment. */
export declare function sessionCookie(token: string, maxAgeMs?: number): string;
/**
 * Strip the link token from a URL so the redirect target is clean.
 *
 * The point of the exchange is that the token stops existing in the address bar, in
 * history, and in anything the browser sends onward. Leaving it on the redirect would
 * defeat the entire design.
 */
export declare function urlWithoutToken(rawUrl: string, param: string): string;
export declare function mayWriteSource(opts: {
    /** did this arrive on the loopback listener dedicated to the tunnel? */
    viaTunnel: boolean;
    /** peer address as reported by the server, for the direct case */
    peer?: string | null;
    /** does the request carry a live session cookie? */
    hasValidSession: boolean;
}): boolean;
/**
 * THE loopback test. dev-server re-exports this as `isLoopbackAddress`; it used to
 * carry its own byte-identical copy.
 *
 * IPv4-mapped IPv6 (`::ffff:127.0.0.1`) counts — that is how a v4 client shows up on a
 * dual-stack listener, and missing it would lock out the local machine on some setups.
 */
export declare function isLoopbackAddressForAuth(address: string | undefined | null): boolean;
export declare function isProxiedRequest(headers: {
    get(name: string): string | null;
}): boolean;
export declare function mayReadSite(opts: {
    lockedDown: boolean;
    viaTunnel: boolean;
    proxied: boolean;
    hasLinkToken: boolean;
    hasValidSession: boolean;
}): boolean;
export declare function shouldInterceptLinkToken(opts: {
    tunnelConfigured: boolean;
    method: string;
}): boolean;
export declare const TUNNEL_LINK_CMD = "tosijs-tunnel --link";
export declare function isLockedDown(config: {
    preview?: {
        tunnel?: {
            requireToken?: boolean;
        };
    };
}): boolean;
/** Does this config have a tunnel at all? The `?t=` interception gate. */
export declare function hasTunnel(config: {
    preview?: {
        tunnel?: unknown;
    };
}): boolean;
export type LinkArrival = 'issue-session' | 'already-authenticated' | 'reject';
export declare function resolveLinkArrival(opts: {
    /** the session redeemLink() minted, or null if the token was invalid/spent */
    redeemed: string | null;
    hasValidSession: boolean;
}): LinkArrival;
