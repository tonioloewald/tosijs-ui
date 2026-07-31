/*
Magic-link auth for the dev server, so a workspace exposed through `bun run tunnel`
can be edited from anywhere.

TWO TOKENS, ON PURPOSE.

  LINK token   — travels in a URL (`https://…/?t=…`). Therefore it is the one that
                 LEAKS: browser history, Referer headers, reverse-proxy access logs,
                 link previews in chat apps that fetch what you paste, and anyone
                 reading over your shoulder. So it is SINGLE-USE and short-lived: the
                 first request spends it, and a copy scraped out of a log later is
                 worthless.

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

import { randomBytes, timingSafeEqual } from 'node:crypto'

/** A URL token is spent on first use, but must also age out if never used. */
export const LINK_TOKEN_TTL_MS = 15 * 60 * 1000

/** Sessions are the durable half — long enough that you are not re-linking daily. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const SESSION_COOKIE = 'tosi_dev_session'

/** 128 bits, base64url — long enough that guessing is not a threat model. */
export function mintToken(): string {
  return randomBytes(16).toString('base64url')
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

/** Issue a link token to put in a URL. */
export function issueLink(state: AuthState, now: number): string {
  prune(state, now)
  const token = mintToken()
  state.links.set(token, now + LINK_TOKEN_TTL_MS)
  return token
}

/**
 * Spend a link token for a session token, or return null.
 *
 * Deleting BEFORE returning is what makes it single-use — and the delete happens
 * whether or not the token had expired, so a replay of an expired token cannot linger.
 */
export function redeemLink(
  state: AuthState,
  token: string,
  now: number
): string | null {
  prune(state, now)
  // Constant-time lookup over the (tiny) set rather than Map.get, so a timing signal
  // can't distinguish "no such token" from "wrong token".
  let matched: string | null = null
  for (const candidate of state.links.keys()) {
    if (safeEqual(candidate, token)) matched = candidate
  }
  if (matched === null) return null
  state.links.delete(matched)
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
