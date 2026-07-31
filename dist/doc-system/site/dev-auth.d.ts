/** A URL token is spent on first use, but must also age out if never used. */
export declare const LINK_TOKEN_TTL_MS: number;
/** Sessions are the durable half — long enough that you are not re-linking daily. */
export declare const SESSION_TTL_MS: number;
export declare const SESSION_COOKIE = "tosi_dev_session";
/** 128 bits, base64url — long enough that guessing is not a threat model. */
export declare function mintToken(): string;
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
/** Issue a link token to put in a URL. */
export declare function issueLink(state: AuthState, now: number): string;
/**
 * Spend a link token for a session token, or return null.
 *
 * Deleting BEFORE returning is what makes it single-use — and the delete happens
 * whether or not the token had expired, so a replay of an expired token cannot linger.
 */
export declare function redeemLink(state: AuthState, token: string, now: number): string | null;
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
