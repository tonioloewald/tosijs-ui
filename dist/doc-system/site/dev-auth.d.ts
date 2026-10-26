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
 * The session itself is durable only WITHIN a process: the token lives in memory and is never
 * written to disk. That used to be the whole story, argued as "a credential should not outlive
 * the process that granted it" — but `bun start` restarts on any edit in its import graph, so in
 * practice it meant a reader lost their session to the developer's own saves. A redeemed link now
 * also sets a signed LINK PASS (see LINK PASSES) that mints a fresh session after a restart, for
 * 24 hours from redemption. Past that, a restart still ends access, and a cookie from a previous
 * run is told apart from a forged one so the page can say why (tosijs-ui#114).
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
    /**
     * unspent link tokens → when they expire.
     *
     * READ-ONLY on purpose: a code leaves only through `dropLink`, which records why in `retired`.
     * A path that deleted one directly (a future revoke, say) would have its holders told "check
     * for a typo" about a code that was killed on purpose (board #3506). `issueLink` and `dropLink`
     * are the only writers; dev-auth.test.ts holds that.
     */
    links: ReadonlyMap<string, number>;
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
    /**
     * Link tokens that also hand over a global key (see {@link GlobalGrant}). Such a link is
     * spent on first use, whatever `linkPolicy` says: it gives the browser a key that outlives
     * this server.
     */
    grants: Map<string, GlobalGrant>;
    /** Sessions minted from a granting link, until the redirect that sets the key takes them. */
    sessionGrants: Map<string, GlobalGrant>;
    /** Sessions minted from a device pass → that device, so revoking it ends them too. */
    sessionDevices: Map<string, string>;
    /**
     * Link codes that have left `links`, folded, with why and until when they are remembered:
     * so a refused code can be told apart as mistyped, spent or expired (see linkRejection).
     */
    retired: Map<string, {
        why: 'used' | 'expired';
        until: number;
    }>;
}
/** How long a spent or expired code is remembered, for the message only. */
export declare const RETIRED_LINK_MEMORY_MS: number;
/**
 * What a single-use link hands over besides a session here: the box's global `key`, as a
 * cookie across `domain`, so this browser opens every workspace (and the box's root list)
 * without another link. The link carries a one-use code; the key itself never appears in a
 * URL, a terminal or a log.
 */
export interface GlobalGrant {
    key: 'edit' | 'view';
    domain: string;
    /** An edit grant's device id and label, which the pass it becomes carries. */
    device?: string;
    label?: string;
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
    grant?: GlobalGrant;
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
 * How long a link that hands over a global key (edit or view) is redeemable: the edit-link
 * window, and never more than five minutes.
 *
 * The maintainer's rule: the cookie is what lasts, the code that delivers it does not. A view
 * grant used to live as long as a share link (a day), on the grounds that a person opens it
 * when they get to it; but what it hands over is a 30-day key to every workspace, so the code
 * gets the short window whatever it opens. `linkTtlMinutes` may shorten it, never lengthen it.
 */
export declare function resolveGrantTtlMs(tunnel?: {
    linkTtlMinutes?: number;
}): number;
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
export declare function linkRejection(state: AuthState, token: string, now: number): 'used' | 'expired' | 'unknown';
/**
 * How many unspent granting links may exist at once. Each is a live code that, guessed, hands
 * over a global credential; a bound keeps the guessing odds where a handful of real links put them.
 */
export declare const MAX_OUTSTANDING_GRANTS = 32;
/** Unspent, unexpired granting links. */
export declare function outstandingGrants(state: AuthState, now: number): number;
/** The global key a just-redeemed link hands over with `session`, once. */
export declare function takeSessionGrant(state: AuthState, session: string): GlobalGrant | undefined;
/** How long a browser keeps a global key it was given by a link: 30 days. */
export declare const GLOBAL_KEY_COOKIE_MAX_AGE_S: number;
/**
 * The cookie that gives this browser the box's global key across the preview domain, the same
 * one Caddy sets for `?t=<view key>` and checks for both keys, so the box's root and every workspace holding the key accept
 * it. `null` when this server does not hold that key, or would not honour it: a link must not
 * hand over a key that opens less than it claims.
 */
export declare function globalKeyCookie(grant: GlobalGrant, keys: GlobalKeys, now?: number): string | null;
/**
 * Every cookie a redeemed granting link sets: the key cookie itself, and for an edit grant the
 * view key too (Caddy can only compare a fixed value, so the box's root list and the static
 * previews still open on the shared view key), and an expiry for any raw edit key cookie an
 * earlier version left in the browser.
 */
export declare function grantCookies(grant: GlobalGrant, keys: GlobalKeys, now?: number): string[];
/** The cookie holding an edit device pass, across the preview domain. */
export declare const GLOBAL_PASS_COOKIE = "tosi_pass";
export interface DevicePass {
    device: string;
    domain: string;
    label: string;
    /** ms since the epoch */
    exp: number;
}
/** Device ids: ten lowercase letters and digits, safe in a shell line and a file name. */
export declare const DEVICE_ID_PATTERN: RegExp;
export declare function mintDeviceId(): string;
/** A device label: what `--label` may say, kept to characters any listing can print. */
export declare function cleanDeviceLabel(label: unknown): string;
export declare function signPass(pass: DevicePass, key: string): string;
/** The pass in this cookie header, if it is signed with `key` and unexpired; else null. */
export declare function readPass(cookieHeader: string | null | undefined, key: string | undefined, now: number): DevicePass | null;
/** `__Host-`: the browser keeps it to the host that set it, and no sibling can set one. */
export declare const LINK_PASS_COOKIE = "__Host-tosi_link_pass";
export declare const LINK_PASS_TTL_MS: number;
export interface LinkPass {
    kind: 'edit' | 'view';
    host: string;
    /** ms since the epoch */
    exp: number;
}
/** A Host header as a pass records it: lowercase, no port, no trailing dot. */
export declare function passHost(host: string | null | undefined): string;
export declare function signLinkPass(pass: LinkPass, secret: string): string;
/** The Set-Cookie for a pass of `kind`, issued now on `host`. */
export declare function linkPassCookie(kind: LinkPass['kind'], host: string, secret: string, now: number): string;
/**
 * The link pass on this request, if `secret` signed it for this `host` and it is unexpired;
 * else null. A null secret (none created yet) means no pass can be good.
 */
export declare function readLinkPass(cookieHeader: string | null | undefined, secret: string | null | undefined, host: string | null | undefined, now: number): LinkPass | null;
/** End every session minted from a pass for a device that is now revoked. */
export declare function revokeDeviceSessions(state: AuthState, revoked: ReadonlySet<string>): number;
/**
 * The preview domain a granting link may set its cookie on: a plain hostname that the
 * workspace's own host sits under. Anything else would set a cookie this browser drops (a
 * domain the host is not under), or one far wider than the preview host (`net`).
 */
export declare function grantDomainFor(domain: string | null | undefined, workspaceHost: string): string | null;
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
/**
 * A request's path, query and hash, for a `Location` that cannot leave this origin.
 *
 * A path is not always same-origin as a Location: `GET //evil.example/x` has the pathname
 * `//evil.example/x`, which a browser reads as a protocol-relative URL to another host. Runs of
 * leading slashes collapse to one.
 */
export declare function sameOriginPath(rawUrl: string): string;
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
/**
 * Caddy's cookie for the raw edit key. Browsers no longer get it (they get a device pass); a
 * dev server presents it to read the revoked list, and a redeemed edit link expires any copy an
 * earlier version left in a browser.
 */
export declare const GLOBAL_EDIT_COOKIE = "tosi_edit";
/** Shorter keys are refused: Caddy compares them with no rate limit in front. */
export declare const GLOBAL_KEY_MIN_LENGTH = 24;
/**
 * A session minted from a global key lasts a day, or until this dev server stops (sessions
 * live in memory). While the key cookie lasts, the next page load or same-origin request mints
 * another, so for a key holder it is the COOKIE's lifetime that ends access, not this. Revoking a
 * device ends the sessions its pass opened within a minute (revokeDeviceSessions); rotating a
 * key ends the sessions it already opened only when each workspace restarts.
 */
export declare const GLOBAL_KEY_SESSION_TTL_MS: number;
/**
 * The most live sessions one server holds; past it the oldest goes. Only a key holder can mint
 * one: per page load, and per request from a page left open across a restart until its first
 * renewed cookie lands. So this bounds a browser stuck reloading, not an attacker.
 */
export declare const MAX_SESSIONS = 1000;
export interface GlobalKeys {
    edit?: string;
    view?: string;
    /**
     * What the edit key grants here: `'edit'`, or `'view'` on a workspace that refuses edit
     * (`globalKeys: 'view'`). The edit key always opens at least what the view key does, as it
     * does on the box.
     */
    editGrants?: 'edit' | 'view';
}
/**
 * The keys this workspace accepts, from `tunnel.globalKeys` and the two secrets.
 *
 * `false` accepts neither; `'view'` lets either key browse and neither edit, so this workspace
 * can be opened from the box's list and never edited through it. A key that is too short or has
 * characters Caddy's cookie match cannot hold is not used, and `problems` says why, so the server
 * can say so at launch rather than leave a key that silently opens nothing. So does a setting
 * that is none of these, which accepts neither key: a misspelt `'off'` must not mean "both".
 */
export declare function resolveGlobalKeys(setting: unknown, secrets: {
    PREVIEW_TOKEN?: string;
    PREVIEW_EDIT_TOKEN?: string;
}): {
    keys: GlobalKeys;
    problems: string[];
};
/** What a device pass needs checked besides its signature: the time, and the revoked list. */
export interface PassCheck {
    now: number;
    /** Revoked device ids, or null when the list could not be read: then no pass is honoured. */
    revoked: ReadonlySet<string> | null;
}
/**
 * What the global-key cookies on a request grant: an edit pass wins over the view key. The raw
 * edit key in a cookie is no longer accepted: it could not be revoked per device.
 */
export declare function globalKeyAccess(cookieHeader: string | null | undefined, keys: GlobalKeys, check?: PassCheck): 'edit' | 'view' | null;
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
interface KeyOpts {
    auth: AuthState;
    keys: GlobalKeys;
    now: number;
    /** See PassCheck: omitted or null, no edit pass is honoured. */
    revoked?: ReadonlySet<string> | null;
    /**
     * The request's link pass, already checked with `readLinkPass` against this host (see LINK
     * PASSES). It counts as a key of its kind.
     */
    linkPass?: LinkPass | null;
}
/**
 * How long a session minted for `grant` lives: a day when a global key grants it, and no longer
 * than the link pass has left when only the pass does, so a pass never stretches its own day.
 */
export declare function keyedSessionTtlMs(grant: 'edit' | 'view', header: string | null, opts: KeyOpts): number;
export declare function globalKeyExchange(request: {
    method: string;
    headers: {
        get(name: string): string | null;
    };
}, opts: KeyOpts & {
    viaTunnel: boolean;
}): 'edit' | 'view' | null;
/**
 * Should a request from this workspace's OWN page, that is not a page load, trade a global key
 * for a session in place?
 *
 * Sessions live in memory, and `bun start` restarts the process whenever a file in its import
 * graph changes, which includes every component source and so every doc-comment example. Save
 * to source writes exactly such a file. So the save restarts the server, and the next save from
 * the same page arrived holding a dead session and was told "This workspace needs an invite
 * link". A reload would have exchanged the key, and lost the unsaved edit (the maintainer,
 * 2026-10-20: a restart must not reset a key holder).
 *
 * The answer is the page-load exchange's, with two extra conditions, because no redirect is
 * involved: the session is issued and used on this same request.
 * - Positive evidence that the request comes from this origin: `Sec-Fetch-Site: same-origin`,
 *   or, from a browser that sends no fetch metadata, an `Origin` that is this host. Absence of
 *   both is NOT enough here (unlike `isSameOriginRequest`, which allows it for curl and our
 *   own CLI, whose requests are not a browser spending an ambient cookie): every host under the preview domain
 *   is the same site and receives the key cookie, so a sibling workspace's page must not be
 *   able to spend it here.
 *
 * A WebSocket upgrade (the haltija bridge) qualifies too; browsers send `Origin` and
 * `Sec-Fetch-Site` on the handshake, and the 101 carries the cookie.
 */
export declare function globalKeyRefresh(request: {
    method: string;
    headers: {
        get(name: string): string | null;
    };
}, opts: KeyOpts & {
    viaTunnel: boolean;
    host: string;
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
 * The whole haltija-bridge gate for one request, as the dev server applies it.
 *
 * `mayDriveWithAgent` on the request's session (a read-only one may not drive), and, for the
 * component and the socket (`sameOriginRequired`), a same-origin request over the tunnel: a
 * sibling host under the preview domain is the same SITE, so its pages carry the cookie. The
 * page load that injects the loader is a navigation, often from the box's list, so it is not
 * held to same-origin.
 */
export declare function haltijaBridgeAdmission(request: {
    url?: string;
    headers: {
        get(name: string): string | null;
    };
}, opts: {
    viaTunnel: boolean;
    peer?: string | null;
    auth: AuthState;
    now: number;
    sameOriginRequired: boolean;
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
export {};
