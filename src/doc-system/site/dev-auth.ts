/*
Magic-link auth for the dev server, so a workspace exposed through `bun run tunnel`
can be edited from anywhere.

TWO TOKENS, ON PURPOSE.

  LINK token   — travels in a URL (`https://…/?t=…`). Therefore it is the one that
                 LEAKS: browser history, Referer headers, reverse-proxy access logs,
                 link previews in chat apps that fetch what you paste, and anyone
                 reading over your shoulder. So it is SHORT-LIVED — five minutes — and
                 it is short enough to type: 8 letters, no digits.

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
                      NOT on cross-SITE POST. It is not the CSRF defence, though: "site"
                      is the registrable domain, so a sibling host under the same preview
                      domain is the same site and its POSTs carry the cookie. Writes are
                      refused unless same-ORIGIN (`sourceRequestAdmission`).
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

/**
 * Sessions are the durable half — long enough that you are not re-linking daily.
 *
 * Durable WITHIN a process, which is the whole design and not an oversight: the credential's
 * lifetime should not outlive the process that granted it, and nothing about a session is ever
 * written to disk. What was wrong is that a stale cookie was indistinguishable from a forged
 * one, so a reader whose server had restarted was told "link required" and reasonably concluded
 * their cookies were expiring — the one explanation the evidence ruled out (tosijs-ui#114).
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * A READ-ONLY session is shorter, because it belongs to someone else.
 *
 * A normal session is yours and dies with the process anyway — 30 days is really "until you
 * restart the dev server". A read-only session was handed to a colleague from a link in a chat
 * log, so its horizon should be the demo, not the dev server's uptime. Seven days is long
 * enough that "look at this when you get a minute" works across a weekend and short enough
 * that it is not a standing grant nobody remembers issuing.
 */
export const READONLY_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Default lifetime of a SHARED (read-only) link — long enough to survive being texted. */
export const SHARE_LINK_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Identifies THIS run of the server, so a cookie from a previous run is recognisable as stale
 * rather than merely unknown.
 *
 * Not a secret and not a credential — it is prefixed to the cookie value purely so the server
 * can tell "you had a session and I restarted" from "I have never seen this". Both are refused
 * identically; only the message differs, and the message was the entire complaint.
 */
export const BOOT_ID = randomBytes(4).toString('base64url')

/** Split a presented cookie into the run that issued it and the token itself. */
export function parseSessionCookie(value: string | undefined | null): {
  bootId: string
  token: string
} | null {
  if (!value) return null
  const dot = value.indexOf('.')
  if (dot < 1) return null
  return { bootId: value.slice(0, dot), token: value.slice(dot + 1) }
}

/**
 * Why a presented cookie was refused — so the page can say something true.
 *
 * `'stale'` means it was issued by an earlier run of this server. That is the common case after
 * any restart (a config edit, a dependency bump, a crash), and it is the one worth naming.
 */
export function sessionRejection(
  cookieValue: string | undefined | null,
  _now?: number
): 'none' | 'stale' | 'unknown' {
  if (!cookieValue) return 'none'
  const parsed = parseSessionCookie(cookieValue)
  if (!parsed) return 'unknown'
  /*
  Only the boot id is consulted. Whether the token is still in the map is a different question
  and not the one being asked: a cookie from a previous run is stale whatever its token said,
  and saying so does not depend on state we no longer have.
  */
  return parsed.bootId === BOOT_ID ? 'none' : 'stale'
}

export const SESSION_COOKIE = 'tosi_dev_session'

/** 128 bits, base64url — long enough that guessing is not a threat model. */
export function mintToken(): string {
  return randomBytes(16).toString('base64url')
}

/*
LETTERS ONLY — no digits — and case-insensitive.

The link token is TYPED BY HAND, into a floating keyboard on a headset. Crockford base32 (the
previous alphabet) was already chosen for typo-resistance, and that reasoning was right as far
as it went — but it still contained digits, and **on a headset the letter↔number switch is a
trip to a different keyboard page**. Reported from an XR test session (tosijs-ui#132): two of
the four codes minted that day were `A70MDCD` and `X9Q3Z53` — three digits each in seven
characters, so three round trips to the number page for a code you are gaze-and-pinching one
glyph at a time.

THE EXTRA CHARACTER IS FREE; THE MODE SWITCH IS NOT. Eight characters of a 22-letter alphabet
is 35.7 bits against the previous seven-of-32's 35.0 — so this is very slightly STRONGER while
never leaving the alphabetic keyboard. (The report suggested all 26 letters at 37.6 bits; the
four exclusions below are worth the 1.9 bits, and length is the cheap axis anyway.)

Exclusions, all inherited from Crockford and all still earning their place with digits gone:

  I, L  mutually confusable, and uppercase `I` versus lowercase `l` is indistinguishable in
        most keyboard fonts — which matters MORE here, not less, because the token is
        case-insensitive so the reader cannot use case to tell them apart.
  O     kept out although `0` no longer exists to confuse it with: `O`/`Q` is a real misread
        at headset rendering resolution, and dropping one of the pair is cheaper than a
        support conversation.
  U     Crockford drops it so an unfortunate token cannot spell an obscenity.

Case-insensitivity is not a nicety here either: a headset keyboard that auto-capitalises the
first character would otherwise burn an attempt on its own behaviour.
*/
const LINK_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ'
const LINK_TOKEN_LEN = 8

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
export function normalizeLinkToken(token: string): string {
  return token
    .replace(/[\s-]/g, '')
    .toUpperCase()
    .replace(/5/g, 'S')
    .replace(/2/g, 'Z')
    .replace(/8/g, 'B')
    .replace(/6/g, 'G')
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
  /**
   * Tokens — link OR session — that grant READ ONLY. Absence means full access, so every
   * pre-existing token keeps the capability it already had and nothing has to be migrated.
   *
   * One set for both kinds because the tokens are distinct random values and the question
   * asked of it is the same either way: "may whoever holds this write?"
   */
  readOnly: Set<string>
  /**
   * Link tokens that also hand over a global key (see {@link GlobalGrant}). Such a link is
   * spent on first use, whatever `linkPolicy` says: it gives the browser a key that outlives
   * this server.
   */
  grants: Map<string, GlobalGrant>
  /** Sessions minted from a granting link, until the redirect that sets the key takes them. */
  sessionGrants: Map<string, GlobalGrant>
}

/**
 * What a single-use link hands over besides a session here: the box's global `key`, as a
 * cookie across `domain`, so this browser opens every workspace (and the box's root list)
 * without another link. The link carries a one-use code; the key itself never appears in a
 * URL, a terminal or a log.
 */
export interface GlobalGrant {
  key: 'edit' | 'view'
  domain: string
}

export function createAuthState(): AuthState {
  return {
    links: new Map(),
    sessions: new Map(),
    readOnly: new Set(),
    grants: new Map(),
    sessionGrants: new Map(),
  }
}

/** Drop anything expired. Called on every use so the maps cannot grow without bound. */
export function prune(state: AuthState, now: number): void {
  for (const [t, exp] of state.links)
    if (exp <= now) {
      state.links.delete(t)
      state.readOnly.delete(t)
      state.grants.delete(t)
    }
  for (const [t, exp] of state.sessions)
    if (exp <= now) {
      state.sessions.delete(t)
      state.readOnly.delete(t)
      state.sessionGrants.delete(t)
    }
}

/**
 * Issue a link token to put in a URL. `ttlMs` overrides the default.
 *
 * `readOnly` marks the token — and, through `redeemLink`, the session it becomes — as unable
 * to write source. That is what makes a LONG-lived link safe to hand to another person: the
 * short default window is what pays for a write-capable token, and stretching it without
 * dropping the capability would put a month of write access to the working tree into whatever
 * chat log the URL lands in.
 */
export function issueLink(
  state: AuthState,
  now: number,
  ttlMs: number = LINK_TOKEN_TTL_MS,
  opts: { readOnly?: boolean; grant?: GlobalGrant } = {}
): string {
  prune(state, now)
  const token = mintLinkToken()
  state.links.set(token, now + ttlMs)
  if (opts.readOnly) state.readOnly.add(token)
  if (opts.grant) state.grants.set(token, opts.grant)
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
 * How long a SHARED (read-only) link lives: the `--share=<minutes>` argument, else
 * `tunnel.shareTtlMinutes`, else 24 hours.
 *
 * Capped at the read-only session horizon. Beyond that the link would outlive the session it
 * can mint, so the last hour of its advertised life would hand over a credential that expires
 * immediately — a link that is "valid" and does not work, which is the worst of both.
 */
export function resolveShareTtlMs(
  tunnel?: { shareTtlMinutes?: number },
  override?: number
): number {
  const minutes = override ?? tunnel?.shareTtlMinutes
  const wanted =
    typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
      ? minutes * 60 * 1000
      : SHARE_LINK_TTL_MS
  return Math.min(wanted, READONLY_SESSION_TTL_MS)
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
  const readOnly = state.readOnly.has(matched)
  const grant = state.grants.get(matched)
  if (policy === 'single-use' || grant) {
    state.links.delete(matched)
    state.readOnly.delete(matched)
    state.grants.delete(matched)
  }
  /*
  The capability rides from the link to the session it mints, and so does the shorter horizon.
  Minting a full 30-day session from a read-only link would make the capability true and the
  LIFETIME a lie — the link said "for the next day"; the session it handed over would outlive
  that by a month.
  */
  const session = issueSession(
    state,
    now,
    readOnly ? READONLY_SESSION_TTL_MS : SESSION_TTL_MS,
    readOnly
  )
  if (grant) state.sessionGrants.set(session, grant)
  return session
}

/**
 * How many unspent granting links may exist at once. Each is a live code that, guessed, hands
 * over the box's key; a bound keeps the guessing odds where a handful of real links put them.
 */
export const MAX_OUTSTANDING_GRANTS = 32

/** Unspent, unexpired granting links. */
export function outstandingGrants(state: AuthState, now: number): number {
  prune(state, now)
  return state.grants.size
}

/** The global key a just-redeemed link hands over with `session`, once. */
export function takeSessionGrant(
  state: AuthState,
  session: string
): GlobalGrant | undefined {
  const grant = state.sessionGrants.get(session)
  state.sessionGrants.delete(session)
  return grant
}

/** How long a browser keeps a global key it was given by a link: 30 days. */
export const GLOBAL_KEY_COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60

/**
 * The cookie that gives this browser the box's global key across the preview domain, the same
 * one Caddy sets for `?t=<key>`, so the box's root and every workspace holding the key accept
 * it. `null` when this server does not hold that key, or would not honour it: a link must not
 * hand over a key that opens less than it claims.
 */
export function globalKeyCookie(
  grant: GlobalGrant,
  keys: GlobalKeys
): string | null {
  const value =
    grant.key === 'edit'
      ? (keys.editGrants ?? 'edit') === 'edit'
        ? keys.edit
        : undefined
      : keys.view
  if (!value) return null
  const name = grant.key === 'edit' ? GLOBAL_EDIT_COOKIE : GLOBAL_VIEW_COOKIE
  return `${name}=${value}; Domain=.${grant.domain}; Path=/; Max-Age=${GLOBAL_KEY_COOKIE_MAX_AGE_S}; HttpOnly; Secure; SameSite=Lax`
}

/**
 * The preview domain a granting link may set its cookie on: a plain hostname that the
 * workspace's own host sits under. Anything else would set a cookie this browser drops (a
 * domain the host is not under), or one far wider than the preview host (`net`).
 */
export function grantDomainFor(
  domain: string | null | undefined,
  workspaceHost: string
): string | null {
  const d = (domain ?? '').toLowerCase().replace(/\.$/, '')
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) return null
  return workspaceHost.toLowerCase().endsWith(`.${d}`) ? d : null
}

/** Mint a session token directly: what a redeemed link or a global key turns into. */
export function issueSession(
  state: AuthState,
  now: number,
  ttlMs: number,
  readOnly: boolean
): string {
  prune(state, now)
  // A Map iterates in insertion order, so the first key is the oldest session.
  while (state.sessions.size >= MAX_SESSIONS) {
    const oldest = state.sessions.keys().next().value!
    state.sessions.delete(oldest)
    state.readOnly.delete(oldest)
  }
  const session = mintToken()
  state.sessions.set(session, now + ttlMs)
  if (readOnly) state.readOnly.add(session)
  return session
}

/*
Guess-rate control: redemption is SERIALIZED, and every attempt takes at least 100ms.

Two lines of policy, and between them brute force stops being a thing that can happen.
Concurrency of one means an attacker cannot parallelise across connections; a 100ms floor
means the whole server answers at most ten redemption attempts per second no matter how many
they open. Against 22⁸ ≈ 5.5 × 10¹⁰ that is ~174 years to exhaust, and within a single
five-minute link window it is ~2,900 guesses — odds of about 1 in 18 million.

(Those figures moved with the alphabet: the token was seven Crockford base32 characters
(32⁷ ≈ 3.4 × 10¹⁰, ~111 years, ~1 in 11 million) before it became eight letters. This is the
one file where the numbers ARE the argument, so they are updated rather than left
conservative-but-stale.)

After **ten consecutive failures the slot widens to a second**, which costs a guesser another
factor of ten and costs a human nothing: nobody mistypes eight characters ten times running,
and if they somehow do, they wait a second. It is still not a lockout — the door never closes,
it only gets slower to knock on.

**No lockout, deliberately.** An earlier version of this escalated the delay and then refused
outright after N failures. Both were unnecessary once the rate is floored, and the lockout
was actively worse: a lockout an attacker can trigger is a denial of service against the
developer, on the one credential they need in order to work. There is no counter to reset, no
threshold to tune, and no state that can be poisoned. What remains is a constant.

**The floor applies to SUCCESS too**, which is the part worth not optimising away. Delaying
only failures would leak the answer through response time and undo `safeEqual`'s constant-time
comparison — the throttle would become the oracle. A uniform floor makes every attempt
indistinguishable from the outside.

**Global rather than per-IP, and that is not laziness.** Every request arriving over the
tunnel comes from LOOPBACK — a reverse tunnel counterfeits "local" by construction, which is
why `mayWriteSource` keys on the listener rather than the peer address. A per-IP limiter would
bucket every remote attacker together with the legitimate user under `127.0.0.1`: it would not
slow the attacker down, and it WOULD get in the developer's way. Global is also the honest
unit, because legitimate redemptions are rare — you mint a link and type it once, maybe twice.

100ms is below the threshold at which a person notices a page responding, so the cost lands
entirely on the only party making thousands of attempts.
*/
export const REDEEM_MIN_MS = 100
/** Consecutive failures after which the slot widens. A human never reaches this. */
export const SLOW_AFTER_FAILURES = 10
/** The widened slot. Ten times slower for anyone guessing; unnoticed by anyone who is not. */
export const REDEEM_SLOW_MS = 1000
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
export const REDEEM_MAX_WAITING = 16

export type RedemptionGate = <T>(work: () => T) => Promise<T>

/** Thrown when the queue is full. The caller answers 503 rather than waiting. */
export class RedemptionBusyError extends Error {
  constructor() {
    super('redemption queue is full')
    this.name = 'RedemptionBusyError'
  }
}

export interface RedemptionGateOptions {
  minMs?: number
  slowMs?: number
  slowAfter?: number
  maxWaiting?: number
  /** Did this evaluation succeed? Defaults to truthiness, which suits `string | null`. */
  isSuccess?: (result: unknown) => boolean
  now?: () => number
}

/**
 * Run redemptions one at a time, each occupying a fixed slot.
 *
 * The constants are parameters so tests can use small ones; nothing else should change them.
 */
export function createRedemptionGate(
  options: RedemptionGateOptions = {}
): RedemptionGate {
  const {
    minMs = REDEEM_MIN_MS,
    slowMs = REDEEM_SLOW_MS,
    slowAfter = SLOW_AFTER_FAILURES,
    maxWaiting = REDEEM_MAX_WAITING,
    isSuccess = (result: unknown) => Boolean(result),
    now = Date.now,
  } = options
  let tail: Promise<unknown> = Promise.resolve()
  let failures = 0
  let waiting = 0
  return <T>(work: () => T): Promise<T> => {
    /*
    Refuse instantly when the queue is full — BEFORE joining it, and without a slot.

    Rejecting cheaply is the point: an attacker's surplus costs them nothing and costs us
    nothing, while the bounded queue in front still pays full price. It also cannot become a
    timing oracle, because a full queue says nothing about any token.
    */
    if (waiting >= maxWaiting) {
      return Promise.reject(new RedemptionBusyError())
    }
    waiting += 1
    const result = tail.then(async () => {
      /*
      The slot is decided BEFORE the work runs, from the failure count as it already stood.

      This is the subtle half. If the duration were computed afterwards, a success would reset
      the counter and return in 100ms while a failure returned in 1000ms — so the tenth
      attempt would announce its own outcome by how long it took, which is precisely the
      oracle `safeEqual`'s constant-time comparison exists to deny. Deciding up front makes
      every attempt in a given state indistinguishable; the reset only affects what comes
      after.
      */
      const slot = failures >= slowAfter ? slowMs : minMs
      const started = now()
      try {
        const value = work()
        failures = isSuccess(value) ? 0 : failures + 1
        return value
      } catch (error) {
        // A throw is a failure, and still occupies its slot — otherwise an input that
        // reliably throws would be a way to run the gate at full speed.
        failures += 1
        throw error
      } finally {
        const remaining = slot - (now() - started)
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining))
        }
        waiting -= 1
      }
    })
    // The queue must not stall on a rejection, and must not surface one as unhandled.
    tail = result.then(
      () => undefined,
      () => undefined
    )
    return result as Promise<T>
  }
}

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
export async function redeemThroughGate(opts: {
  gate: RedemptionGate
  state: AuthState
  token: string
  arrivedAt: number
  policy?: LinkPolicy
}): Promise<{ session: string | null; busy: boolean }> {
  try {
    const session = await opts.gate(() =>
      redeemLink(opts.state, opts.token, opts.arrivedAt, opts.policy)
    )
    return { session, busy: false }
  } catch (error) {
    if (error instanceof RedemptionBusyError)
      return { session: null, busy: true }
    throw error
  }
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

/**
 * Validate a presented COOKIE (as opposed to a bare token).
 *
 * The cookie carries `<bootId>.<token>`, so this is where the two halves meet: a cookie from a
 * previous run fails on the boot id without ever touching the session map, and a cookie from
 * this run is checked against it in constant time as before.
 */
export function validSessionCookie(
  state: AuthState,
  cookieValue: string | undefined | null,
  now: number
): boolean {
  const parsed = parseSessionCookie(cookieValue)
  if (!parsed || parsed.bootId !== BOOT_ID) return false
  return validSession(state, parsed.token, now)
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

/**
 * The Set-Cookie value for a freshly minted session. See the header comment.
 *
 * The value is `<bootId>.<token>`. The prefix is not a secret and adds no security — it exists
 * so that when this process is gone, the next one can tell a cookie it ISSUED from a cookie it
 * has simply never seen. Both are refused; only the message differs, and the missing message was
 * the whole of #114: a reader whose server had restarted was told "link required" and reasonably
 * concluded their cookies were expiring.
 */
export function sessionCookie(
  token: string,
  maxAgeMs = SESSION_TTL_MS
): string {
  return (
    `${SESSION_COOKIE}=${BOOT_ID}.${token}; ` +
    `Max-Age=${Math.floor(maxAgeMs / 1000)}; ` +
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
  return sameOriginPath(url.href)
}

/**
 * A request's path, query and hash, for a `Location` that cannot leave this origin.
 *
 * A path is not always same-origin as a Location: `GET //evil.example/x` has the pathname
 * `//evil.example/x`, which a browser reads as a protocol-relative URL to another host. Runs of
 * leading slashes collapse to one.
 */
export function sameOriginPath(rawUrl: string): string {
  const url = new URL(rawUrl)
  const pathname = '/' + url.pathname.replace(/^\/+/, '')
  return pathname + url.search + url.hash
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
/*
CSRF: a loopback peer is not a same-origin caller (#90).

`mayWriteSource`'s direct path is peer-address-only — no credential — and the handlers parse
JSON regardless of `Content-Type`. That makes a cross-site `fetch(…, {mode:'no-cors'})` with a
CORS-safelisted type a SIMPLE request: no preflight, peer is 127.0.0.1, gate passes. Any page
the developer happens to visit could therefore write any file under the repo root — including
`.git/hooks/*`, i.e. code execution at the next git operation. `POST /__build` then turns that
into "and run it now".

The file already claimed CSRF protection from `SameSite=Lax`. The default loopback path needs
no cookie, so that defence never covered the primary case, and on the tunnel it was weaker than
it looked: "site" is the registrable domain, so every sibling host under the preview domain
could POST with the cookie (fixed in `sourceRequestAdmission`, which now checks both paths).

Fetch metadata is the fix, and it is cheap: browsers send `Sec-Fetch-Site` on every request and
scripts cannot forge it. A same-origin page sends `same-origin`; a page on evil.example sends
`cross-site`. Non-browser callers (our own CLI, curl) send neither header — so the rule must
accept ABSENCE, or it breaks every legitimate tool. That is not a hole: the attack this closes
is specifically "a browser the developer is using is induced to make the request", and a
browser always tells us.

UPSTREAM.md records that rejecting cross-site outright breaks haltija's widget, which
legitimately calls :8700 from a page on :3000 on THIS machine; that is why `/report` and
`/__build` (loopback only) use it through `csrfOk`. Source and data writes, and the haltija
bridge over the tunnel, come from the workspace's own origin and require it on both paths.
*/
export function isSameOriginRequest(request: {
  url?: string
  headers: { get(name: string): string | null }
}): boolean {
  /*
  TWO signals, because neither alone covers the population.

  `Sec-Fetch-Site` is the strong one — unforgeable by script, sent on every request by any
  engine that has it. But Safari < 16.4, Firefox < 90 and older WKWebViews send NO fetch
  metadata, and an earlier version of this function allowed absence outright with a comment
  claiming "a browser always sends it". That was false for exactly the browsers a developer
  might have open, leaving them in the pre-fix position: a forged simple request writing
  `.git/hooks/pre-commit`.

  `Origin` closes that gap, because those same browsers DO send it on cross-origin POSTs. So:
  refuse a cross-site `Sec-Fetch-Site`, and independently refuse an `Origin` that is not ours.

  Absence of BOTH is still allowed, and that is deliberate rather than an oversight: our own
  CLI and `curl` send neither, and the threat model here is a browser being induced to make
  the request. A request carrying no browser fingerprint at all is not that.
  */
  const site = request.headers.get('sec-fetch-site')
  if (site !== null && site !== 'same-origin' && site !== 'none') return false

  const origin = request.headers.get('origin')
  /*
  NOTE there is no `origin !== 'null'` exemption, deliberately.

  An earlier version had one, and it was the single worst value to allow: `Origin: null` is
  exactly what a sandboxed iframe, `srcdoc`, a `data:` document and a cross-origin-redirected
  POST send — i.e. the one Origin an attacker can choose. Modern engines stayed protected only
  because they ALSO send `Sec-Fetch-Site: cross-site`; the unprotected set was precisely the
  old-browser population this Origin check exists for. Nothing we ship requests from an opaque
  origin, so the exemption bought nothing. It now falls through to the unparseable-origin
  refusal below.
  */
  if (origin !== null) {
    // Compare against the origin the request was actually addressed to, which is what the
    // browser would have had to match. `Host` is what the client dialled.
    const host = request.headers.get('host')
    let ours: string | null
    try {
      ours = request.url !== undefined ? new URL(request.url).host : null
    } catch {
      ours = null
    }
    const expected = ours ?? host
    let originHost: string | null
    try {
      originHost = new URL(origin).host
    } catch {
      return false // an Origin we cannot parse is not one we can accept
    }
    if (expected === null || originHost !== expected) return false
  }

  return true
}

export function mayWriteSource(opts: {
  /** did this arrive on the loopback listener dedicated to the tunnel? */
  viaTunnel: boolean
  /** peer address as reported by the server, for the direct case */
  peer?: string | null
  /** does the request carry a live session cookie? */
  hasValidSession: boolean
  /**
   * May that session write? Defaults to `true`, so a caller that predates read-only links
   * behaves exactly as before — the capability is a NARROWING, and an omitted narrowing must
   * never be the permissive-by-accident case for anything but the status quo.
   */
  sessionMayWrite?: boolean
  /**
   * The project opted in to trusting its LAN (`trustLan`, #227): a direct, unproxied peer at a
   * private address (inside the listed networks, when it lists some) counts as this machine.
   * Off unless the caller says so.
   */
  trustLan?: LanTrust
  /** did the request carry forwarding headers? A proxied request is never LAN trust */
  proxied?: boolean
}): boolean {
  if (opts.viaTunnel)
    return opts.hasValidSession && opts.sessionMayWrite !== false
  if (isLoopbackAddressForAuth(opts.peer)) return true
  /*
  LAN trust leans on the same-origin check the caller applies (`isSameOriginRequest`), and that
  check rules out DNS rebinding from a LAN browser only because the dev server is HTTPS-only,
  with a certificate for localhost and <host>.local: a rebound hostname fails TLS. A plain-HTTP
  listener would turn this into a rebinding path. Do not add one without revisiting this.
  */
  return opts.proxied !== true && lanTrusts(opts.trustLan, opts.peer)
}

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
export function sourceRequestAdmission(
  request: { url?: string; headers: { get(name: string): string | null } },
  opts: {
    viaTunnel: boolean
    peer?: string | null
    auth: AuthState
    trustLan?: LanTrust
    now: number
  }
): 'loopback' | 'lan' | 'session' | null {
  const session = readCookie(request.headers.get('cookie'), SESSION_COOKIE)
  const allowed =
    mayWriteSource({
      viaTunnel: opts.viaTunnel,
      peer: opts.peer,
      hasValidSession: validSessionCookie(opts.auth, session, opts.now),
      // A share link's session may browse and may not save (asked AFTER validity, which is
      // the call-order `cookieMayWrite` documents).
      sessionMayWrite: cookieMayWrite(opts.auth, session),
      trustLan: opts.trustLan,
      proxied: isProxiedRequest(request.headers),
    }) &&
    /*
    CSRF (#90), on BOTH paths. The tunnel path used to skip this and lean on `SameSite=Lax`, but
    "site" is the registrable domain: every sibling host under the preview domain (another
    project's static preview, its live examples) is the same site, so its pages could POST here
    with the session cookie attached. The editor that calls this is served from this origin.
    */
    isSameOriginRequest(request)
  if (!allowed) return null
  if (opts.viaTunnel) return 'session'
  return isLoopbackAddressForAuth(opts.peer) ? 'loopback' : 'lan'
}

/**
 * Whether to tell a refused source request about `trustLan`: only a direct, unproxied device on
 * a private network, the one case turning it on would admit, and only while it is off. Anyone
 * else is pointed at an edit link, which is what would help them.
 */
export function suggestsTrustLan(opts: {
  viaTunnel: boolean
  peer?: string | null
  proxied: boolean
  trustLan: LanTrust
}): boolean {
  return (
    !opts.trustLan &&
    !opts.viaTunnel &&
    !opts.proxied &&
    isPrivateNetworkAddress(opts.peer)
  )
}

/**
 * What the refusal log adds about `trustLan`, or ''. Off: that turning it on would admit this
 * device. Naming networks this device is outside: which, and the one-run override. A device it
 * could never admit (tunnel, proxied, public) hears nothing about it.
 */
export function trustLanRefusalHint(opts: {
  viaTunnel: boolean
  peer?: string | null
  proxied: boolean
  trustLan: LanTrust
}): string {
  if (suggestsTrustLan(opts))
    return '; trustLan in the site config, or TOSIJS_TRUST_LAN=1 for this run, admits devices on this network'
  if (
    Array.isArray(opts.trustLan) &&
    !opts.viaTunnel &&
    !opts.proxied &&
    isPrivateNetworkAddress(opts.peer) &&
    !lanTrusts(opts.trustLan, opts.peer)
  )
    return `; ${opts.peer} is outside trustLan (${opts.trustLan.join(
      ', '
    )}), and TOSIJS_TRUST_LAN=<network> overrides it for one run`
  return ''
}

/**
 * The log line for a source write admitted only by `trustLan`. The file name is the client's,
 * so it is quoted as JSON: a newline or an escape sequence in it cannot forge a log line.
 */
export function trustLanWriteRecord(
  peer: string | null | undefined,
  file: unknown,
  status: number
): string {
  const name = typeof file === 'string' ? JSON.stringify(file) : '(no file)'
  const outcome =
    status >= 200 && status < 300 ? 'saved' : `refused (${status})`
  return `✎ trustLan: ${peer ?? 'unknown'} ${outcome} ${name}`
}

/**
 * May the holder of this session token write?
 *
 * `true` for an unknown token as well as a full one — this answers only "is this session
 * NARROWED?", never "is it valid", which is `validSession`'s job. Conflating them would make
 * a typo in the cookie look like a read-only session instead of no session at all.
 */
export function sessionMayWrite(
  state: AuthState,
  token: string | null | undefined
): boolean {
  return !token || !state.readOnly.has(token)
}

/**
 * The cookie-level counterpart, mirroring `validSession` / `validSessionCookie`.
 *
 * MUST be asked only about a cookie that already passed `validSessionCookie`. A plain `Set.has`
 * is right here and `safeEqual` is not, because the token is no longer a guess by the time this
 * runs — but that is a property of the CALL ORDER, so keep the two together at every call site.
 */
export function cookieMayWrite(
  state: AuthState,
  cookieValue: string | undefined | null
): boolean {
  const parsed = parseSessionCookie(cookieValue)
  return sessionMayWrite(state, parsed?.token)
}

/*
GLOBAL KEYS: one visit to the preview host's root, and every workspace on it opens.

The per-workspace link is tuned for handing ONE workspace to ONE device, and it costs a
redemption per project per server run: sessions live in memory, so every restart walls every
device again. With several projects tunnelled through one box that was the recurring pain.

So the box can hold two machine-wide keys, the same pair on the box and on this machine:

  PREVIEW_TOKEN       the VIEW key. Already the static previews' invite secret.
  PREVIEW_EDIT_TOKEN  the EDIT key. New, and only ever a credential you keep.

The cookie (`tosi_preview` or `tosi_edit`, across the whole preview domain) arrives one of two
ways: a workspace's single-use link sets it on redemption (see GlobalGrant, the usual way in,
which never puts the key in a URL), or Caddy sets it for `?t=<key>` on any preview host. A workspace that sees a matching cookie on a page load mints
an ordinary session of the matching kind (read-only for the view key) and carries on, so the
write gates below are unchanged: a key only ever becomes a session, at a navigation.

The cookie holds the key itself, because Caddy can compare a fixed value and cannot sign
anything. A leaked edit cookie is therefore write access to every workspace that accepts the
key until the key is rotated, and that is why the key must be long (it is compared online,
with no throttle in front of Caddy) and why a project can refuse it (`tunnel.globalKeys`).
The domain-wide cookie is also why writes over the tunnel now need a same-origin request:
`SameSite=Lax` treats every sibling host as the same site.
*/

/** Caddy's cookie for the view key; the static previews' invite gate already sets it. */
export const GLOBAL_VIEW_COOKIE = 'tosi_preview'
/** Caddy's cookie for the edit key. */
export const GLOBAL_EDIT_COOKIE = 'tosi_edit'
/** Shorter keys are refused: Caddy compares them with no rate limit in front. */
export const GLOBAL_KEY_MIN_LENGTH = 24
/**
 * A session minted from a global key lasts a day, or until this dev server stops (sessions
 * live in memory). The key is NOT re-checked while the session lives, so rotating a key ends
 * the sessions it already opened only when each workspace restarts.
 */
export const GLOBAL_KEY_SESSION_TTL_MS = 24 * 60 * 60 * 1000

/**
 * The most live sessions one server holds; past it the oldest goes. Only a key holder can mint
 * one per page load, so this bounds a browser stuck reloading, not an attacker.
 */
export const MAX_SESSIONS = 1000

export interface GlobalKeys {
  edit?: string
  view?: string
  /**
   * What the edit key grants here: `'edit'`, or `'view'` on a workspace that refuses edit
   * (`globalKeys: 'view'`). The edit key always opens at least what the view key does, as it
   * does on the box.
   */
  editGrants?: 'edit' | 'view'
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
export function resolveGlobalKeys(
  setting: unknown,
  secrets: { PREVIEW_TOKEN?: string; PREVIEW_EDIT_TOKEN?: string }
): { keys: GlobalKeys; problems: string[] } {
  const problems: string[] = []
  if (
    setting !== undefined &&
    setting !== true &&
    setting !== false &&
    setting !== 'view'
  ) {
    problems.push(
      `tunnel.globalKeys is ${JSON.stringify(
        setting
      )}, which is not true, false or 'view': neither global key is accepted`
    )
    return { keys: {}, problems }
  }
  const usable = (name: string, value: string | undefined) => {
    if (!value) return undefined
    if (value.length < GLOBAL_KEY_MIN_LENGTH || !/^[\w-]+$/.test(value)) {
      problems.push(
        `${name} is not used as a global key: it must be at least ${GLOBAL_KEY_MIN_LENGTH} letters, digits, - or _`
      )
      return undefined
    }
    return value
  }
  if (setting === false) return { keys: {}, problems }
  const keys: GlobalKeys = {
    view: usable('PREVIEW_TOKEN', secrets.PREVIEW_TOKEN),
    edit: usable('PREVIEW_EDIT_TOKEN', secrets.PREVIEW_EDIT_TOKEN),
    editGrants: setting === 'view' ? 'view' : 'edit',
  }
  if (keys.edit && keys.edit === keys.view) {
    problems.push(
      'PREVIEW_EDIT_TOKEN equals PREVIEW_TOKEN, so anyone with a preview link could edit: neither is used as a global key'
    )
    return { keys: {}, problems }
  }
  return { keys, problems }
}

/** What the global-key cookies on a request grant: the edit key wins over the view key. */
export function globalKeyAccess(
  cookieHeader: string | null | undefined,
  keys: GlobalKeys
): 'edit' | 'view' | null {
  const edit = readCookie(cookieHeader, GLOBAL_EDIT_COOKIE)
  if (keys.edit && edit && safeEqual(edit, keys.edit))
    return keys.editGrants ?? 'edit'
  const view = readCookie(cookieHeader, GLOBAL_VIEW_COOKIE)
  if (keys.view && view && safeEqual(view, keys.view)) return 'view'
  return null
}

/** Is this a browser loading a page (not a fetch, a script or a socket)? */
export function isNavigation(request: {
  method: string
  headers: { get(name: string): string | null }
}): boolean {
  if (request.method !== 'GET') return false
  const mode = request.headers.get('sec-fetch-mode')
  if (mode !== null) return mode === 'navigate'
  return (request.headers.get('accept') ?? '').includes('text/html')
}

/**
 * Should this request trade a global key for a session, and of which kind?
 *
 * Only over the tunnel, only on a page load, and only when it would add something: no valid
 * session yet, or a read-only one when the edit key is held.
 */
export function globalKeyExchange(
  request: { method: string; headers: { get(name: string): string | null } },
  opts: { viaTunnel: boolean; auth: AuthState; keys: GlobalKeys; now: number }
): 'edit' | 'view' | null {
  if (!opts.viaTunnel || !isNavigation(request)) return null
  return keyAddsAccess(request.headers.get('cookie'), opts)
}

/** What a global key would add to this request's session: nothing, or a session of a kind. */
function keyAddsAccess(
  header: string | null,
  opts: { auth: AuthState; keys: GlobalKeys; now: number }
): 'edit' | 'view' | null {
  const access = globalKeyAccess(header, opts.keys)
  if (!access) return null
  const held = readCookie(header, SESSION_COOKIE)
  if (validSessionCookie(opts.auth, held, opts.now)) {
    if (access === 'view' || cookieMayWrite(opts.auth, held)) return null
  }
  return access
}

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
 *   both is NOT enough here (unlike `isSameOriginRequest`): every host under the preview domain
 *   is the same site and receives the key cookie, so a sibling workspace's page must not be
 *   able to spend it here.
 * - Not a WebSocket upgrade, which has no response to carry the cookie.
 */
export function globalKeyRefresh(
  request: { method: string; headers: { get(name: string): string | null } },
  opts: {
    viaTunnel: boolean
    host: string
    auth: AuthState
    keys: GlobalKeys
    now: number
  }
): 'edit' | 'view' | null {
  if (!opts.viaTunnel || isNavigation(request)) return null
  if (request.headers.get('upgrade')) return null
  const site = request.headers.get('sec-fetch-site')
  const origin = request.headers.get('origin')
  const ours =
    site !== null
      ? site === 'same-origin'
      : origin !== null && origin === `https://${opts.host.toLowerCase()}`
  if (!ours) return null
  return keyAddsAccess(request.headers.get('cookie'), opts)
}

/**
 * The origin allowed to read this workspace's liveness answer: the box's own list.
 *
 * Only an https origin whose host is a parent domain of this host, so `dev.example.com` may ask
 * `ui.edit.dev.example.com` and nothing else may.
 */
export function liveProbeOrigin(
  origin: string | null,
  host: string | null
): string | null {
  if (!origin || !host) return null
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' || parsed.port) return null
  const bare = host.replace(/:\d+$/, '').toLowerCase()
  return bare.endsWith(`.${parsed.hostname.toLowerCase()}`)
    ? parsed.origin
    : null
}

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
export function mayDriveWithAgent(opts: {
  viaTunnel: boolean
  peer?: string | null
  hasValidSession: boolean
  /** a read-only session (a share link, the view key) may look, never drive */
  sessionMayWrite?: boolean
}): boolean {
  // LAN trust (#227) is for reading and editing source, and is never passed here: driving a
  // page with an agent stays this machine and authorized tunnel sessions only.
  const { viaTunnel, peer, hasValidSession, sessionMayWrite } = opts
  return mayWriteSource({ viaTunnel, peer, hasValidSession, sessionMayWrite })
}

/**
 * The whole haltija-bridge gate for one request, as the dev server applies it.
 *
 * `mayDriveWithAgent` on the request's session (a read-only one may not drive), and, for the
 * component and the socket (`sameOriginRequired`), a same-origin request over the tunnel: a
 * sibling host under the preview domain is the same SITE, so its pages carry the cookie. The
 * page load that injects the loader is a navigation, often from the box's list, so it is not
 * held to same-origin.
 */
export function haltijaBridgeAdmission(
  request: { url?: string; headers: { get(name: string): string | null } },
  opts: {
    viaTunnel: boolean
    peer?: string | null
    auth: AuthState
    now: number
    sameOriginRequired: boolean
  }
): boolean {
  const held = readCookie(request.headers.get('cookie'), SESSION_COOKIE)
  return (
    mayDriveWithAgent({
      viaTunnel: opts.viaTunnel,
      peer: opts.peer,
      hasValidSession: validSessionCookie(opts.auth, held, opts.now),
      // Asked after validity, the call order cookieMayWrite documents.
      sessionMayWrite: cookieMayWrite(opts.auth, held),
    }) &&
    (!opts.viaTunnel ||
      !opts.sameOriginRequired ||
      isSameOriginRequest(request))
  )
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

/**
 * A private-network peer: RFC 1918 IPv4 (10/8, 172.16/12, 192.168/16), IPv6 unique-local
 * (fc00::/7) or link-local (fe80::/10), including IPv4 mapped into IPv6. Loopback is not
 * included; ask `isLoopbackAddressForAuth` for that. Used ONLY behind the `trustLan` opt-in.
 */
export function isPrivateNetworkAddress(
  address: string | undefined | null
): boolean {
  if (!address) return false
  const a = address
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/%.*$/, '') // an IPv6 zone id (fe80::1%en0)
  const v4 = (a.startsWith('::ffff:') ? a.slice(7) : a).match(
    /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/
  )
  if (v4) {
    const [first, second] = [Number(v4[1]), Number(v4[2])]
    return (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    )
  }
  if (!a.includes(':')) return false
  const head = parseInt(a.split(':')[0] || '0', 16)
  return (head & 0xfe00) === 0xfc00 || (head & 0xffc0) === 0xfe80
}

/**
 * Who `trustLan` admits: nobody (`false`), any private-network peer (`true`), or private peers
 * inside these networks (CIDR strings, validated by `resolveLanTrust`).
 */
export type LanTrust = boolean | readonly string[]

/** An address as a number, or null if it is not one. IPv4 mapped into IPv6 reads as IPv4. */
function addressValue(address: string): { v6: boolean; value: bigint } | null {
  const a = address
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/%.*$/, '')
  const v4 = (a.startsWith('::ffff:') ? a.slice(7) : a).match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  )
  if (v4) {
    const octets = v4.slice(1).map(Number)
    if (octets.some((o) => o > 255)) return null
    return {
      v6: false,
      value: octets.reduce((n, o) => (n << 8n) | BigInt(o), 0n),
    }
  }
  if (!/^[0-9a-f:]+$/.test(a) || a.split('::').length > 2) return null
  const [head, tail] = a.includes('::') ? a.split('::') : [a, null]
  const groups = (s: string) => (s ? s.split(':') : [])
  const left = groups(head)
  const right = tail === null ? [] : groups(tail)
  const missing = 8 - left.length - right.length
  if (tail === null ? missing !== 0 : missing < 1) return null
  const all = [
    ...left,
    ...Array(tail === null ? 0 : missing).fill('0'),
    ...right,
  ]
  if (all.some((g) => g.length === 0 || g.length > 4)) return null
  return {
    v6: true,
    value: all.reduce((n, g) => (n << 16n) | BigInt(parseInt(g, 16)), 0n),
  }
}

/** Whether `address` is inside `cidr` (`192.168.1.0/24`, `fd00::/8`). False for a bad CIDR. */
export function inNetwork(
  address: string | null | undefined,
  cidr: string
): boolean {
  if (!address) return false
  const [net, bitsText] = cidr.split('/')
  const ip = addressValue(address)
  const base = addressValue(net ?? '')
  if (!ip || !base || ip.v6 !== base.v6 || !/^\d{1,3}$/.test(bitsText ?? ''))
    return false
  const width = base.v6 ? 128 : 32
  const bits = Number(bitsText)
  if (bits > width) return false
  const shift = BigInt(width - bits)
  return ip.value >> shift === base.value >> shift
}

/** Whether `trust` admits `peer`. Every form requires a private address first. */
export function lanTrusts(
  trust: LanTrust | undefined,
  peer: string | null | undefined
): boolean {
  if (!trust || !isPrivateNetworkAddress(peer)) return false
  return trust === true || trust.some((cidr) => inNetwork(peer, cidr))
}

/**
 * The `trustLan` in force, and where it came from. `TOSIJS_TRUST_LAN` wins over the config,
 * so trust can be turned on for one session without committing it, or off when a committed
 * setting is wrong for the network you are on: `1`/`true`/`on`, `0`/`false`/`off`, or a
 * comma-separated list of networks. Throws on a network it cannot parse, rather than trusting
 * more or less than was written.
 */
export function resolveLanTrust(
  configured: boolean | string | readonly string[] | undefined,
  env: string | undefined
): { trust: LanTrust; from: 'TOSIJS_TRUST_LAN' | 'config' | null } {
  const fromEnv = env != null && env.trim() !== ''
  const raw = fromEnv ? env!.trim() : configured
  const from = fromEnv ? 'TOSIJS_TRUST_LAN' : 'config'
  if (raw === undefined || raw === false) return { trust: false, from: null }
  if (raw === true) return { trust: true, from }
  if (typeof raw === 'string' && /^(1|true|on|yes)$/i.test(raw))
    return { trust: true, from }
  if (typeof raw === 'string' && /^(0|false|off|no)$/i.test(raw))
    return { trust: false, from: null }
  const list = (typeof raw === 'string' ? raw.split(/[\s,]+/) : [...raw])
    .map((s) => s.trim())
    .filter(Boolean)
  for (const cidr of list) {
    const [net, bits] = cidr.split('/')
    const base = addressValue(net ?? '')
    if (
      !base ||
      !/^\d{1,3}$/.test(bits ?? '') ||
      Number(bits) > (base.v6 ? 128 : 32)
    ) {
      throw new Error(
        `trustLan (${from}): ${JSON.stringify(cidr)} is not a network. ` +
          `Write it as an address and a prefix length, e.g. 192.168.1.0/24.`
      )
    }
  }
  if (list.length === 0) return { trust: false, from: null }
  return { trust: list, from }
}

/** How the launch message names what `trust` admits. */
export function describeLanTrust(trust: LanTrust): string {
  if (trust === false) return 'nobody'
  if (trust === true) return 'any device on a private network'
  return `devices on ${trust.join(', ')} (private addresses only)`
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
