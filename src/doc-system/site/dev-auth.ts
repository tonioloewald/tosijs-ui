/*
Magic-link auth for the dev server, so a workspace exposed through `bun run tunnel`
can be edited from anywhere.

TWO TOKENS, ON PURPOSE.

  LINK token   — travels in a URL (`https://…/?t=…`). Therefore it is the one that
                 LEAKS: browser history, Referer headers, reverse-proxy access logs,
                 link previews in chat apps that fetch what you paste, and anyone
                 reading over your shoulder. So it is SHORT-LIVED — five minutes — and
                 it is short enough to type: 7 Crockford base32 characters.

                 It is a BEARER token for those five minutes, and that is a deliberate
                 reversal of the single-use rule this comment used to state. Two things
                 bought the change. Single-use meant "glance at the link and close the
                 tab, mint another" and "open it on the laptop, now your phone can't" —
                 the workspace is the thing you read on a phone, so the rule collided
                 with the feature's own purpose, and an adopter routed around it with a
                 never-expiring token of their own. And a 22-character mixed-case string
                 typed into a headset's floating keyboard was painful enough that people
                 gave up and used LAN IP addresses instead. A credential nobody can face
                 using is not protecting anything.

                 ~35 bits is ample for what this is: an ONLINE-only guess against a Map
                 lookup — no offline attack — for a token that is redeemed seconds after
                 it is minted, and which mints nothing but a write session that
                 `mayWriteSource` still gates. At an absurd sustained 10⁴ guesses/sec
                 across the entire five-minute window, P(hit) ≈ 0.01%.

  SESSION token — never appears in a URL. Set as an HttpOnly cookie by the exchange
                 and sent automatically thereafter, so it can be durable without being
                 exposed. This is the one that actually authorises writes.

That asymmetry is the whole design. A single durable token pasted into a URL would be
strictly WORSE than basic auth: it would sit in five different logs forever. Exchanging
it immediately for a cookie, then redirecting to a clean URL, is what makes "just send
me a link" both convenient and defensible.

Cookie flags, and why each:
  HttpOnly          — script cannot read it, so an XSS in a rendered doc cannot exfil it
  Secure            — never sent over plaintext
  SameSite=Lax      — sent on top-level GET navigation (so clicking your link works),
                      NOT on cross-site POST. That last part is free CSRF protection for
                      the write endpoint: another origin cannot make your browser POST
                      to /__docstore/source with your cookie attached.
  Path=/            — the whole workspace, since editing spans the site

Build-time only. Never import this from browser code.
*/

import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

/**
 * How long a link is redeemable. Overridable per project — see `LinkPolicy`.
 *
 * Five minutes, not fifteen: the window is what pays for the short token below. A link is
 * redeemed within seconds of being typed, so the extra ten minutes bought nothing and
 * widened the interval in which an observed URL is a live bearer token.
 */
export const LINK_TOKEN_TTL_MS = 5 * 60 * 1000

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
export type LinkPolicy = 'window' | 'single-use'

/** Sessions are the durable half — long enough that you are not re-linking daily. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const SESSION_COOKIE = 'tosi_dev_session'

/** 128 bits, base64url — long enough that guessing is not a threat model. */
export function mintToken(): string {
  return randomBytes(16).toString('base64url')
}

/*
Crockford base32: no `I`, `L`, `O` or `U`, and case-insensitive.

The link token is TYPED BY HAND, into a floating keyboard on a headset, and 22 characters of
mixed-case base64url is brutal enough that people give up and type LAN IP addresses instead —
which is the feature failing, not the user. The alphabet is chosen for the mistakes it makes
impossible: `0`/`O` and `1`/`l` are the two that hurt most on a virtual keyboard, and here
they cannot happen because `O` and `L` are not in it.

Base36 would buy about half a bit per character and cost exactly that typo-resistance.
`U` is excluded too — Crockford drops it so an unfortunate token cannot spell an obscenity.
*/
const LINK_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const LINK_TOKEN_LEN = 7

/*
`randomInt` rather than `randomBytes[i] % 32`.

256 is a multiple of 32, so modulo happens to be unbiased HERE — but it stops being so the
moment the alphabet length changes, and a bias introduced by editing a constant is the kind
nobody sees. `randomInt` is unbiased by construction and says so.
*/
export function mintLinkToken(): string {
  let token = ''
  for (let i = 0; i < LINK_TOKEN_LEN; i++) {
    token += LINK_ALPHABET[randomInt(LINK_ALPHABET.length)]
  }
  return token
}

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
export function normalizeLinkToken(token: string): string {
  return token
    .replace(/-/g, '')
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
}

/** Constant-time compare that tolerates unequal lengths without throwing. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export interface AuthState {
  /** unspent link tokens → when they expire */
  links: Map<string, number>
  /** live session tokens → when they expire */
  sessions: Map<string, number>
}

export function createAuthState(): AuthState {
  return { links: new Map(), sessions: new Map() }
}

/** Drop anything expired. Called on every use so the maps cannot grow without bound. */
export function prune(state: AuthState, now: number): void {
  for (const [t, exp] of state.links) if (exp <= now) state.links.delete(t)
  for (const [t, exp] of state.sessions)
    if (exp <= now) state.sessions.delete(t)
}

/** Issue a link token to put in a URL. `ttlMs` overrides the 15-minute default. */
export function issueLink(
  state: AuthState,
  now: number,
  ttlMs: number = LINK_TOKEN_TTL_MS
): string {
  prune(state, now)
  const token = mintLinkToken()
  state.links.set(token, now + ttlMs)
  return token
}

/**
 * Read the link settings off a site config, with the defaults applied.
 *
 * A non-finite or non-positive `linkTtlMinutes` falls back to the default rather than
 * minting a token that is already expired — a config typo should not silently produce links
 * that never work, which reads as "the tunnel is broken".
 */
export function resolveLinkSettings(tunnel?: {
  linkPolicy?: LinkPolicy
  linkTtlMinutes?: number
}): { policy: LinkPolicy; ttlMs: number } {
  const minutes = tunnel?.linkTtlMinutes
  const ttlMs =
    typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
      ? minutes * 60 * 1000
      : LINK_TOKEN_TTL_MS
  return { policy: tunnel?.linkPolicy ?? 'window', ttlMs }
}

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
export function redeemLink(
  state: AuthState,
  token: string,
  now: number,
  policy: LinkPolicy = 'window'
): string | null {
  prune(state, now)
  // Constant-time lookup over the (tiny) set rather than Map.get, so a timing signal
  // can't distinguish "no such token" from "wrong token".
  const typed = normalizeLinkToken(token)
  let matched: string | null = null
  for (const candidate of state.links.keys()) {
    if (safeEqual(normalizeLinkToken(candidate), typed)) matched = candidate
  }
  if (matched === null) return null
  if (policy === 'single-use') state.links.delete(matched)
  const session = mintToken()
  state.sessions.set(session, now + SESSION_TTL_MS)
  return session
}

/** Is this session token live? */
export function validSession(
  state: AuthState,
  token: string | undefined | null,
  now: number
): boolean {
  if (!token) return false
  prune(state, now)
  for (const candidate of state.sessions.keys()) {
    if (safeEqual(candidate, token)) return true
  }
  return false
}

/** Pull one cookie out of a Cookie header. */
export function readCookie(
  header: string | null | undefined,
  name: string
): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return undefined
}

/** The Set-Cookie value for a freshly minted session. See the header comment. */
export function sessionCookie(
  token: string,
  maxAgeMs = SESSION_TTL_MS
): string {
  return (
    `${SESSION_COOKIE}=${token}; Max-Age=${Math.floor(maxAgeMs / 1000)}; ` +
    `Path=/; HttpOnly; Secure; SameSite=Lax`
  )
}

/**
 * Strip the link token from a URL so the redirect target is clean.
 *
 * The point of the exchange is that the token stops existing in the address bar, in
 * history, and in anything the browser sends onward. Leaving it on the redirect would
 * defeat the entire design.
 */
export function urlWithoutToken(rawUrl: string, param: string): string {
  const url = new URL(rawUrl)
  url.searchParams.delete(param)
  const qs = url.searchParams.toString()
  return url.pathname + (qs ? `?${qs}` : '') + url.hash
}

/*
WHO MAY WRITE SOURCE.

Extracted and pure because the previous version was an inline expression inside a
closure behind a TLS-requiring `Bun.serve` — untestable in practice, and it is the
single decision standing between a tunnelled request and arbitrary repo writes (which
the watcher then rebuilds and RUNS). A decision that guards code execution must be
reachable from a test.

It also fixes a fail-OPEN. The previous rule inferred "is this request local?" from the
ABSENCE of `X-Forwarded-*`:

    proxied ? validSession(...) : isLoopbackAddress(peer)

Absence of a header is not evidence of presence at the keyboard. Any path that delivers
to loopback without setting those headers — `ssh -R` against a box with
`GatewayPorts yes`, `ngrok tcp`, `socat`, iptables DNAT, bare nginx `proxy_pass` or
HAProxy without `option forwardfor` — produced `{peer:127.0.0.1, xff:null}` for an
off-machine caller and authorized it. The safety argument rested on remote sshd
configuration the tool could not see and did not check.

So the signal is now the LISTENER the request arrived on, which is not forgeable by a
client: the dev server binds a separate loopback-only port for tunnel traffic, and
anything arriving there is treated as remote no matter what it claims.

  viaTunnel  → a valid session is REQUIRED. Always. There is no local shortcut,
               because "local" is exactly what a tunnel counterfeits.
  direct     → a loopback peer is sufficient; you are at this keyboard.
*/
export function mayWriteSource(opts: {
  /** did this arrive on the loopback listener dedicated to the tunnel? */
  viaTunnel: boolean
  /** peer address as reported by the server, for the direct case */
  peer?: string | null
  /** does the request carry a live session cookie? */
  hasValidSession: boolean
}): boolean {
  if (opts.viaTunnel) return opts.hasValidSession
  return isLoopbackAddressForAuth(opts.peer)
}

/**
 * THE loopback test. dev-server re-exports this as `isLoopbackAddress`; it used to
 * carry its own byte-identical copy.
 *
 * IPv4-mapped IPv6 (`::ffff:127.0.0.1`) counts — that is how a v4 client shows up on a
 * dual-stack listener, and missing it would lock out the local machine on some setups.
 */
export function isLoopbackAddressForAuth(
  address: string | undefined | null
): boolean {
  if (!address) return false
  const a = address
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
  if (a === '::1' || a === 'localhost') return true
  const mapped = a.startsWith('::ffff:') ? a.slice(7) : a
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(mapped)
}

/*
Was this request proxied (i.e. did it arrive through something in front of us)?

Extracted because the predicate was duplicated character-for-character at two call
sites, only ONE of which was load-bearing — so a future tidy-up that "simplified" the
other would have silently changed the write model. One definition, one meaning.

Note this is a WEAK signal used only where a false negative is harmless. Write
authorization deliberately does NOT use it (see mayWriteSource): a forwarder that omits
these headers would otherwise look local. Which listener a request arrived on is the
strong signal; this one just answers "is a browser reaching us through a proxy?" for
things like deciding how much detail to put in an error page.
*/
export function isProxiedRequest(headers: {
  get(name: string): string | null
}): boolean {
  return (
    headers.get('x-forwarded-for') !== null ||
    headers.get('x-forwarded-host') !== null
  )
}

/*
May this request READ the site at all?

Extracted from an inline expression inside the server closure — which is precisely why it
shipped a fail-open through two releases with no test able to see it. It is the same shape
as mayWriteSource and belongs beside it.

The signal that decides is `viaTunnel`: which LISTENER the request arrived on, which a
client cannot forge. The header check is a belt-and-braces OR for a reverse proxy placed in
front of the MAIN listener; it must never be the ONLY signal, because every forwarder in
the list above omits those headers and would then read the whole uncommitted tree.
*/
export function mayReadSite(opts: {
  lockedDown: boolean
  viaTunnel: boolean
  proxied: boolean
  hasLinkToken: boolean
  hasValidSession: boolean
}): boolean {
  if (!opts.lockedDown) return true
  // Direct traffic at this keyboard is the dev server it has always been.
  if (!opts.viaTunnel && !opts.proxied) return true
  // Redemption must stay reachable without a session — it is how you GET one.
  if (opts.hasLinkToken) return true
  return opts.hasValidSession
}

/*
Should `?t=` be treated as an invite link on this request?

`t` is the classic cache-buster name, so claiming it unconditionally means ANY adopter's
dev server answers `GET /?t=12345` with "that invite link has been used" instead of the
page, and 401s a POST that happens to carry `t` — losing its body to a redirect. Only a
server that actually has a tunnel configured has any business reading it, and only on GET.
*/
export function shouldInterceptLinkToken(opts: {
  tunnelConfigured: boolean
  method: string
}): boolean {
  return opts.tunnelConfigured && opts.method === 'GET'
}

/*
The command an adopter actually has.

`bun run tunnel` is a script in THIS repo's package.json; the installed package exposes
the bin. The 401 pages — the one thing a locked-out collaborator reads — named the script,
so the instruction was unrunnable for everyone outside this checkout. The client-side
copies in doc-browser/live-example already said the right thing, which is how the drift
went unnoticed: the message you saw while developing was not the message they saw.
*/
export const TUNNEL_LINK_CMD = 'tosijs-tunnel --link'

/*
Is this server's workspace locked down?

Extracted because the predicate existed three times — twice in dev-server, once
*recomputed inside its own regression test*, which meant the test asserted a copy and
could not fail. Reverting the fix left all 822 tests green. That is the second time this
shape has appeared in this file; `isLoopbackAddressForAuth` was collapsed for exactly the
same reason, and its test asserts function identity so it cannot recur.

Locked down requires a tunnel to be configured at all: arming off an absent
`preview.tunnel` denied proxied reads while nothing could redeem a link.
*/
export function isLockedDown(config: {
  preview?: { tunnel?: { requireToken?: boolean } }
}): boolean {
  return (
    Boolean(config.preview?.tunnel) &&
    config.preview?.tunnel?.requireToken !== false
  )
}

/** Does this config have a tunnel at all? The `?t=` interception gate. */
export function hasTunnel(config: { preview?: { tunnel?: unknown } }): boolean {
  return Boolean(config.preview?.tunnel)
}

/*
What should happen when a request arrives carrying a `?t=` link token?

Three outcomes, and the middle one is the whole point: a stale token in the hands of
someone who is ALREADY signed in is irrelevant, not a reason to wall them. That case is
ordinary — a second window, a link scrolled back to in a chat, a bookmark — and it was
previously rejected, because the token was examined before the cookie and a comment
asserted (without enforcing) that a session holder could never reach it.

No session is re-issued on a spent token: they already have one, and minting a fresh
session from a dead link would make expiry meaningless.
*/
export type LinkArrival = 'issue-session' | 'already-authenticated' | 'reject'

export function resolveLinkArrival(opts: {
  /** the session redeemLink() minted, or null if the token was invalid/spent */
  redeemed: string | null
  hasValidSession: boolean
}): LinkArrival {
  if (opts.redeemed) return 'issue-session'
  if (opts.hasValidSession) return 'already-authenticated'
  return 'reject'
}
