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
/**
 * Sessions are the durable half — long enough that you are not re-linking daily.
 *
 * Durable WITHIN a process, which is the whole design and not an oversight: the credential's
 * lifetime should not outlive the process that granted it, and nothing about a session is ever
 * written to disk. What was wrong is that a stale cookie was indistinguishable from a forged
 * one, so a reader whose server had restarted was told "link required" and reasonably concluded
 * their cookies were expiring — the one explanation the evidence ruled out (tosijs-ui#114).
 */
export declare const SESSION_TTL_MS: number;
/**
 * A READ-ONLY session is shorter, because it belongs to someone else.
 *
 * A normal session is yours and dies with the process anyway — 30 days is really "until you
 * restart the dev server". A read-only session was handed to a colleague from a link in a chat
 * log, so its horizon should be the demo, not the dev server's uptime. Seven days is long
 * enough that "look at this when you get a minute" works across a weekend and short enough
 * that it is not a standing grant nobody remembers issuing.
 */
export declare const READONLY_SESSION_TTL_MS: number;
/** Default lifetime of a SHARED (read-only) link — long enough to survive being texted. */
export declare const SHARE_LINK_TTL_MS: number;
/**
 * Identifies THIS run of the server, so a cookie from a previous run is recognisable as stale
 * rather than merely unknown.
 *
 * Not a secret and not a credential — it is prefixed to the cookie value purely so the server
 * can tell "you had a session and I restarted" from "I have never seen this". Both are refused
 * identically; only the message differs, and the message was the entire complaint.
 */
export declare const BOOT_ID: string;
/** Split a presented cookie into the run that issued it and the token itself. */
export declare function parseSessionCookie(value: string | undefined | null): {
    bootId: string;
    token: string;
} | null;
/**
 * Why a presented cookie was refused — so the page can say something true.
 *
 * `'stale'` means it was issued by an earlier run of this server. That is the common case after
 * any restart (a config edit, a dependency bump, a crash), and it is the one worth naming.
 */
export declare function sessionRejection(cookieValue: string | undefined | null, _now?: number): 'none' | 'stale' | 'unknown';
export declare const SESSION_COOKIE = "tosi_dev_session";
/** 128 bits, base64url — long enough that guessing is not a threat model. */
export declare function mintToken(): string;
export declare function mintLinkToken(): string;
/**
 * Fold a typed token to canonical form.
 *
 * Applied on REDEMPTION, not only when minting. Case-insensitivity that exists in the
 * alphabet but not in the comparison is a claim rather than a behaviour, and the failure it
 * produces is the worst kind: a correct human being told they typed it wrong.
 *
 * Hyphens and whitespace go, since people group long strings and a headset keyboard is
 * generous with spaces.
 *
 * Digits map back to the letters they are misread AS. The alphabet is letters-only, so a
 * digit can never be part of a real token — which makes every one of these mappings pure
 * upside: it can rescue a transcription error and cannot collide with a valid code. Only
 * digits whose letter is actually IN the alphabet are mapped; `0` and `1` are left alone
 * because `O`, `I` and `L` are excluded, so there is nothing honest to map them to.
 */
export declare function normalizeLinkToken(token: string): string;
/** Constant-time compare that tolerates unequal lengths without throwing. */
export declare function safeEqual(a: string, b: string): boolean;
export interface AuthState {
    /** unspent link tokens → when they expire */
    links: Map<string, number>;
    /** live session tokens → when they expire */
    sessions: Map<string, number>;
    /**
     * Tokens — link OR session — that grant READ ONLY. Absence means full access, so every
     * pre-existing token keeps the capability it already had and nothing has to be migrated.
     *
     * One set for both kinds because the tokens are distinct random values and the question
     * asked of it is the same either way: "may whoever holds this write?"
     */
    readOnly: Set<string>;
}
export declare function createAuthState(): AuthState;
/** Drop anything expired. Called on every use so the maps cannot grow without bound. */
export declare function prune(state: AuthState, now: number): void;
/**
 * Issue a link token to put in a URL. `ttlMs` overrides the default.
 *
 * `readOnly` marks the token — and, through `redeemLink`, the session it becomes — as unable
 * to write source. That is what makes a LONG-lived link safe to hand to another person: the
 * short default window is what pays for a write-capable token, and stretching it without
 * dropping the capability would put a month of write access to the working tree into whatever
 * chat log the URL lands in.
 */
export declare function issueLink(state: AuthState, now: number, ttlMs?: number, opts?: {
    readOnly?: boolean;
}): string;
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
 * How long a SHARED (read-only) link lives: the `--share=<minutes>` argument, else
 * `tunnel.shareTtlMinutes`, else 24 hours.
 *
 * Capped at the read-only session horizon. Beyond that the link would outlive the session it
 * can mint, so the last hour of its advertised life would hand over a credential that expires
 * immediately — a link that is "valid" and does not work, which is the worst of both.
 */
export declare function resolveShareTtlMs(tunnel?: {
    shareTtlMinutes?: number;
}, override?: number): number;
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
/** Mint a session token directly: what a redeemed link or a global key turns into. */
export declare function issueSession(state: AuthState, now: number, ttlMs: number, readOnly: boolean): string;
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
 * **Under flood, everyone is refused — including you. That is the intended behaviour, not a
 * shortfall.** Redeeming a link *during* an attack on the endpoint is an explicit non-goal:
 * what has to hold is that brute force fails hard, and it does. There is no identity to
 * prioritise on anyway, because every request over the tunnel arrives from loopback. So the
 * cap makes the failure immediate and cheap for both sides rather than a 42-second wait, the
 * queue drains in ~1.6s once the burst stops, and the caller captures the clock on ARRIVAL so
 * queueing can never expire the very token being redeemed.
 *
 * Worth being precise about what does the security work here: **the guess rate is set by the
 * SLOT, not by the queue.** Depth changes how a flood is absorbed and nothing about how fast
 * anyone can guess — that stays at ten attempts a second, or one after ten consecutive
 * failures. The cap is a denial-of-service control; the slot is the brute-force control.
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
/**
 * Redeem a link the way the DEV SERVER must: through the gate, with the clock read on arrival.
 *
 * Extracted because the gate itself had 21 tests and the wiring that makes any of it real had
 * none — `handleRequest` is an unexported closure, so nothing could reach it. Reverting to a
 * bare `redeemLink(...)` call restored both the unbounded queue and the unthrottled guess rate
 * while type-checking cleanly and leaving every lane green. That is the one security control
 * on a path reachable unauthenticated over the tunnel, and it was held in place by nothing but
 * the diff.
 *
 * This is the same shape as `mayWriteSource` / `shouldInterceptLinkToken` / `resolveLinkArrival`
 * — the file's established answer to "the decision lives in a closure, so pull the decision
 * out".
 *
 * `arrivedAt` is a PARAMETER because the caller must read the clock when the request lands,
 * not when the queued work runs: `Date.now()` inside the closure let a token that was valid
 * when the user clicked expire while it waited behind other attempts.
 */
export declare function redeemThroughGate(opts: {
    gate: RedemptionGate;
    state: AuthState;
    token: string;
    arrivedAt: number;
    policy?: LinkPolicy;
}): Promise<{
    session: string | null;
    busy: boolean;
}>;
/** Is this session token live? */
export declare function validSession(state: AuthState, token: string | undefined | null, now: number): boolean;
/**
 * Validate a presented COOKIE (as opposed to a bare token).
 *
 * The cookie carries `<bootId>.<token>`, so this is where the two halves meet: a cookie from a
 * previous run fails on the boot id without ever touching the session map, and a cookie from
 * this run is checked against it in constant time as before.
 */
export declare function validSessionCookie(state: AuthState, cookieValue: string | undefined | null, now: number): boolean;
/** Pull one cookie out of a Cookie header. */
export declare function readCookie(header: string | null | undefined, name: string): string | undefined;
/**
 * The Set-Cookie value for a freshly minted session. See the header comment.
 *
 * The value is `<bootId>.<token>`. The prefix is not a secret and adds no security — it exists
 * so that when this process is gone, the next one can tell a cookie it ISSUED from a cookie it
 * has simply never seen. Both are refused; only the message differs, and the missing message was
 * the whole of #114: a reader whose server had restarted was told "link required" and reasonably
 * concluded their cookies were expiring.
 */
export declare function sessionCookie(token: string, maxAgeMs?: number): string;
/**
 * Strip the link token from a URL so the redirect target is clean.
 *
 * The point of the exchange is that the token stops existing in the address bar, in
 * history, and in anything the browser sends onward. Leaving it on the redirect would
 * defeat the entire design.
 */
export declare function urlWithoutToken(rawUrl: string, param: string): string;
export declare function isSameOriginRequest(request: {
    url?: string;
    headers: {
        get(name: string): string | null;
    };
}): boolean;
export declare function mayWriteSource(opts: {
    /** did this arrive on the loopback listener dedicated to the tunnel? */
    viaTunnel: boolean;
    /** peer address as reported by the server, for the direct case */
    peer?: string | null;
    /** does the request carry a live session cookie? */
    hasValidSession: boolean;
    /**
     * May that session write? Defaults to `true`, so a caller that predates read-only links
     * behaves exactly as before — the capability is a NARROWING, and an omitted narrowing must
     * never be the permissive-by-accident case for anything but the status quo.
     */
    sessionMayWrite?: boolean;
    /**
     * The project opted in to trusting its LAN (`trustLan`, #227): a direct, unproxied peer at a
     * private address (inside the listed networks, when it lists some) counts as this machine.
     * Off unless the caller says so.
     */
    trustLan?: LanTrust;
    /** did the request carry forwarding headers? A proxied request is never LAN trust */
    proxied?: boolean;
}): boolean;
/**
 * Who a `/__docstore/source` request is admitted as, or null to refuse it.
 *
 * The WHOLE gate for that endpoint, taking the real `Request`: `mayWriteSource` on the peer and
 * listener, `trustLan` refused through a proxy, and the same-origin check (#90) on the direct
 * path. It was inline in the server closure, where the 1.16.22 review could only verify LAN
 * trust by hand (#3346); here it is tested with the headers a browser actually sends.
 *
 * `'lan'` is a write admitted only because the project trusts its LAN, which the server logs.
 */
export declare function sourceRequestAdmission(request: {
    url?: string;
    headers: {
        get(name: string): string | null;
    };
}, opts: {
    viaTunnel: boolean;
    peer?: string | null;
    auth: AuthState;
    trustLan?: LanTrust;
    now: number;
}): 'loopback' | 'lan' | 'session' | null;
/**
 * Whether to tell a refused source request about `trustLan`: only a direct, unproxied device on
 * a private network, the one case turning it on would admit, and only while it is off. Anyone
 * else is pointed at an edit link, which is what would help them.
 */
export declare function suggestsTrustLan(opts: {
    viaTunnel: boolean;
    peer?: string | null;
    proxied: boolean;
    trustLan: LanTrust;
}): boolean;
/**
 * What the refusal log adds about `trustLan`, or ''. Off: that turning it on would admit this
 * device. Naming networks this device is outside: which, and the one-run override. A device it
 * could never admit (tunnel, proxied, public) hears nothing about it.
 */
export declare function trustLanRefusalHint(opts: {
    viaTunnel: boolean;
    peer?: string | null;
    proxied: boolean;
    trustLan: LanTrust;
}): string;
/**
 * The log line for a source write admitted only by `trustLan`. The file name is the client's,
 * so it is quoted as JSON: a newline or an escape sequence in it cannot forge a log line.
 */
export declare function trustLanWriteRecord(peer: string | null | undefined, file: unknown, status: number): string;
/**
 * May the holder of this session token write?
 *
 * `true` for an unknown token as well as a full one — this answers only "is this session
 * NARROWED?", never "is it valid", which is `validSession`'s job. Conflating them would make
 * a typo in the cookie look like a read-only session instead of no session at all.
 */
export declare function sessionMayWrite(state: AuthState, token: string | null | undefined): boolean;
/**
 * The cookie-level counterpart, mirroring `validSession` / `validSessionCookie`.
 *
 * MUST be asked only about a cookie that already passed `validSessionCookie`. A plain `Set.has`
 * is right here and `safeEqual` is not, because the token is no longer a guess by the time this
 * runs — but that is a property of the CALL ORDER, so keep the two together at every call site.
 */
export declare function cookieMayWrite(state: AuthState, cookieValue: string | undefined | null): boolean;
/** Caddy's cookie for the view key; the static previews' invite gate already sets it. */
export declare const GLOBAL_VIEW_COOKIE = "tosi_preview";
/** Caddy's cookie for the edit key. */
export declare const GLOBAL_EDIT_COOKIE = "tosi_edit";
/** Shorter keys are refused: Caddy compares them with no rate limit in front. */
export declare const GLOBAL_KEY_MIN_LENGTH = 24;
/** A session minted from a global key: the cookie behind it is re-checked every page load. */
export declare const GLOBAL_KEY_SESSION_TTL_MS: number;
export interface GlobalKeys {
    edit?: string;
    view?: string;
}
/**
 * The keys this workspace accepts, from `tunnel.globalKeys` and the two secrets.
 *
 * `false` accepts neither; `'view'` only the view key, so this workspace can be browsed from
 * the box's list and never edited through it. A key that is too short or has characters Caddy's
 * cookie match cannot hold is not used, and `problems` says why, so the server can say so at
 * launch rather than leave a key that silently opens nothing.
 */
export declare function resolveGlobalKeys(setting: boolean | 'view' | undefined, secrets: {
    PREVIEW_TOKEN?: string;
    PREVIEW_EDIT_TOKEN?: string;
}): {
    keys: GlobalKeys;
    problems: string[];
};
/** What the global-key cookies on a request grant: the edit key wins over the view key. */
export declare function globalKeyAccess(cookieHeader: string | null | undefined, keys: GlobalKeys): 'edit' | 'view' | null;
/** Is this a browser loading a page (not a fetch, a script or a socket)? */
export declare function isNavigation(request: {
    method: string;
    headers: {
        get(name: string): string | null;
    };
}): boolean;
/**
 * Should this request trade a global key for a session, and of which kind?
 *
 * Only over the tunnel, only on a page load, and only when it would add something: no valid
 * session yet, or a read-only one when the edit key is held.
 */
export declare function globalKeyExchange(request: {
    method: string;
    headers: {
        get(name: string): string | null;
    };
}, opts: {
    viaTunnel: boolean;
    auth: AuthState;
    keys: GlobalKeys;
    now: number;
}): 'edit' | 'view' | null;
/**
 * The origin allowed to read this workspace's liveness answer: the box's own list.
 *
 * Only an https origin whose host is a parent domain of this host, so `dev.example.com` may ask
 * `ui.edit.dev.example.com` and nothing else may.
 */
export declare function liveProbeOrigin(origin: string | null, host: string | null): string | null;
/**
 * Who may attach the haltija dev channel — i.e. let an agent DRIVE this page.
 *
 * Deliberately the same rule as `mayWriteSource`, delegating rather than restating it, because
 * driving a page with an agent is at least as powerful as writing source: an agent that can
 * evaluate script in the page can read whatever the page can read and act as the logged-in
 * user. A weaker gate here would quietly become the weakest link, and a *parallel* copy of the
 * rule would be a second thing to keep in step — which is how the two drift.
 *
 * It is a separate NAME because the capability is separate: if the policies ever need to
 * diverge, this is the one place to change, and every caller already says which it means.
 */
export declare function mayDriveWithAgent(opts: {
    viaTunnel: boolean;
    peer?: string | null;
    hasValidSession: boolean;
    /** a read-only session (a share link, the view key) may look, never drive */
    sessionMayWrite?: boolean;
}): boolean;
/**
 * THE loopback test. dev-server re-exports this as `isLoopbackAddress`; it used to
 * carry its own byte-identical copy.
 *
 * IPv4-mapped IPv6 (`::ffff:127.0.0.1`) counts — that is how a v4 client shows up on a
 * dual-stack listener, and missing it would lock out the local machine on some setups.
 */
export declare function isLoopbackAddressForAuth(address: string | undefined | null): boolean;
/**
 * A private-network peer: RFC 1918 IPv4 (10/8, 172.16/12, 192.168/16), IPv6 unique-local
 * (fc00::/7) or link-local (fe80::/10), including IPv4 mapped into IPv6. Loopback is not
 * included; ask `isLoopbackAddressForAuth` for that. Used ONLY behind the `trustLan` opt-in.
 */
export declare function isPrivateNetworkAddress(address: string | undefined | null): boolean;
/**
 * Who `trustLan` admits: nobody (`false`), any private-network peer (`true`), or private peers
 * inside these networks (CIDR strings, validated by `resolveLanTrust`).
 */
export type LanTrust = boolean | readonly string[];
/** Whether `address` is inside `cidr` (`192.168.1.0/24`, `fd00::/8`). False for a bad CIDR. */
export declare function inNetwork(address: string | null | undefined, cidr: string): boolean;
/** Whether `trust` admits `peer`. Every form requires a private address first. */
export declare function lanTrusts(trust: LanTrust | undefined, peer: string | null | undefined): boolean;
/**
 * The `trustLan` in force, and where it came from. `TOSIJS_TRUST_LAN` wins over the config,
 * so trust can be turned on for one session without committing it, or off when a committed
 * setting is wrong for the network you are on: `1`/`true`/`on`, `0`/`false`/`off`, or a
 * comma-separated list of networks. Throws on a network it cannot parse, rather than trusting
 * more or less than was written.
 */
export declare function resolveLanTrust(configured: boolean | string | readonly string[] | undefined, env: string | undefined): {
    trust: LanTrust;
    from: 'TOSIJS_TRUST_LAN' | 'config' | null;
};
/** How the launch message names what `trust` admits. */
export declare function describeLanTrust(trust: LanTrust): string;
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
