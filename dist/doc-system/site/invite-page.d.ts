export type SessionRejection = 'none' | 'stale' | 'unknown';
/**
 * The invite screen, with a code box.
 *
 * It used to offer only a CLI command, which assumes a keyboard attached to the machine running
 * the server. The devices a tunnel exists for have neither that keyboard nor, in the case of an
 * installed PWA, an address bar — iOS gives a Home Screen app its own cookie jar, so an
 * unauthenticated launch was a black rectangle with no way out (tosijs-ui#75).
 *
 * A plain GET form needs no new server code: it produces `/?t=CODE`, the same path the link
 * takes. The 7-character Crockford-base32 code exists precisely because it is typeable on a
 * floating keyboard, and it is case-insensitive — so the input disables every "helpful"
 * transformation a phone keyboard would otherwise apply.
 *
 * What this deliberately does NOT attempt: carrying a session across a PWA install. The separate
 * cookie jar is a privacy feature rather than a bug, and keeping the token in the URL so the
 * installed app captures it would bake a credential into a home-screen icon that works once and
 * then fails forever, with no address bar to correct it. Seven characters is the better trade.
 */
export declare function invitePageHtml(rejection: SessionRejection, linkCommand: string): string;
