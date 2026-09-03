import { test, expect, describe } from 'bun:test'
import {
  createAuthState,
  issueLink,
  readCookie,
  redeemLink,
  safeEqual,
  sessionCookie,
  urlWithoutToken,
  validSession,
  LINK_TOKEN_TTL_MS,
  SESSION_TTL_MS,
  SESSION_COOKIE,
  mintToken,
  mintLinkToken,
  normalizeLinkToken,
  createRedemptionGate,
  redeemThroughGate,
  resolveLinkSettings,
  RedemptionBusyError,
  REDEEM_MAX_WAITING,
  REDEEM_MIN_MS,
  REDEEM_SLOW_MS,
  SLOW_AFTER_FAILURES,
  isSameOriginRequest,
} from './dev-auth.js'

const NOW = 1_700_000_000_000

test('a link token is spent on first use — under the single-use policy', () => {
  /*
  This was the DEFAULT until 1.10.0, and the property it protects is real: a token scraped from
  a log, a history entry or a chat preview is worthless because the first redemption consumed
  it. It is now opt-in rather than automatic.

  The default traded it knowingly. Single-use made the link die when you glanced at it and
  closed the tab, or when you opened it on a laptop and reached for your phone — in a feature
  whose purpose is reading your workspace on a phone. An adopter had already replaced it with
  a never-expiring link of their own, so the strict default was not buying the security it
  looked like; it was buying a weaker homemade one next to it.

  What replaces it is a bound on TIME rather than on uses: a scraped token is worthless once
  the window closes, and the window is short and configurable. Anyone whose links travel
  somewhere they do not control sets `linkPolicy: 'single-use'` and gets this back.
  */
  const s = createAuthState()
  const link = issueLink(s, NOW)
  expect(redeemLink(s, link, NOW, 'single-use')).toBeTruthy()
  expect(redeemLink(s, link, NOW, 'single-use')).toBe(null)
})

test('a link token expires even if never used', () => {
  const s = createAuthState()
  const link = issueLink(s, NOW)
  expect(redeemLink(s, link, NOW + LINK_TOKEN_TTL_MS + 1)).toBe(null)
})

test('redeeming yields a session that validates, and garbage does not', () => {
  const s = createAuthState()
  const session = redeemLink(s, issueLink(s, NOW), NOW)!
  expect(validSession(s, session, NOW)).toBe(true)
  expect(validSession(s, 'not-a-session', NOW)).toBe(false)
  expect(validSession(s, '', NOW)).toBe(false)
  expect(validSession(s, undefined, NOW)).toBe(false)
})

test('sessions are durable but not eternal', () => {
  const s = createAuthState()
  const session = redeemLink(s, issueLink(s, NOW), NOW)!
  expect(validSession(s, session, NOW + SESSION_TTL_MS - 1)).toBe(true)
  expect(validSession(s, session, NOW + SESSION_TTL_MS + 1)).toBe(false)
})

test('an unknown link token never mints a session', () => {
  const s = createAuthState()
  issueLink(s, NOW)
  expect(redeemLink(s, 'attacker-guess', NOW)).toBe(null)
  expect(s.sessions.size).toBe(0)
})

test('expired entries are pruned rather than accumulating', () => {
  const s = createAuthState()
  for (let i = 0; i < 5; i++) issueLink(s, NOW)
  expect(s.links.size).toBe(5)
  issueLink(s, NOW + LINK_TOKEN_TTL_MS + 1) // any use prunes
  expect(s.links.size).toBe(1)
})

test('link tokens are SHORT and distinct; session tokens stay long', () => {
  /*
  The asymmetry, asserted rather than described. The link is typed by hand into a headset's
  floating keyboard, so it is 7 characters; the session lives in an HttpOnly cookie, is never
  typed, and is the credential that actually authorises writes — so it stays at 128 bits.
  Blurring the two is the way this design fails.
  */
  const s = createAuthState()
  const seen = new Set<string>()
  for (let i = 0; i < 200; i++) seen.add(issueLink(s, NOW))
  expect(seen.size).toBe(200)
  for (const t of seen) expect(t).toMatch(/^[0-9A-HJKMNP-TV-Z]{7}$/)
  expect(mintToken().length).toBeGreaterThanOrEqual(20) // 128 bits b64url
})

test('the alphabet excludes the characters people mistype', () => {
  /*
  Crockford base32. `I`/`L` look like `1` and `O` looks like `0` on a virtual keyboard, which
  is where this token is entered; `U` is excluded so an unlucky token cannot spell an
  obscenity. 2000 samples is enough to catch an alphabet edit that reintroduces one.
  */
  const all = Array.from({ length: 2000 }, () => mintLinkToken()).join('')
  expect(all).not.toMatch(/[ILOU]/)
  // …and every character it DOES use is in the intended set.
  expect(all).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/)
})

test('redemption is case-insensitive and forgives the lookalikes', () => {
  // The failure being designed out is a correct human being told they typed it wrong.
  expect(normalizeLinkToken('abc1234')).toBe('ABC1234')
  // O 0 o → 0 0 0 ; I i L l → 1 1 1 1
  expect(normalizeLinkToken('O0oIiLl')).toBe('0001111')
  expect(normalizeLinkToken('ABC-1234')).toBe('ABC1234')

  const s = createAuthState()
  const token = issueLink(s, NOW)
  // Type it in lowercase, with a hyphen for grouping, on a second device.
  const typed =
    token.toLowerCase().slice(0, 3) + '-' + token.toLowerCase().slice(3)
  expect(redeemLink(s, typed, NOW + 1000)).toBeTruthy()
})

test('a wrong token is still refused', () => {
  // The normalisation must widen what counts as the SAME token, not what counts as a token.
  const s = createAuthState()
  issueLink(s, NOW)
  expect(redeemLink(s, 'ZZZZZZZ', NOW + 1000)).toBe(null)
  expect(redeemLink(s, '', NOW + 1000)).toBe(null)
})

test('safeEqual is correct on equal, unequal and mismatched lengths', () => {
  expect(safeEqual('abc', 'abc')).toBe(true)
  expect(safeEqual('abc', 'abd')).toBe(false)
  expect(safeEqual('abc', 'abcd')).toBe(false) // must not throw
  expect(safeEqual('', '')).toBe(true)
})

test('the session cookie carries the flags the design depends on', () => {
  const c = sessionCookie('tok123')
  /*
  The value is `<bootId>.<token>`, not the bare token. The prefix is not a secret and grants
  nothing — it exists so a cookie issued by a PREVIOUS run of the server is recognisable as
  stale rather than merely unknown, which is what lets the invite page say "the server
  restarted" instead of "invite links expire" (#114). The token still has to match.
  */
  expect(c).toContain(`${SESSION_COOKIE}=${BOOT_ID}.tok123`)
  expect(c).toContain('HttpOnly') // an XSS in a doc cannot read it
  expect(c).toContain('Secure') // never sent in the clear
  // Lax, NOT None: cross-site POST does not carry it, which is free CSRF protection
  // for /__docstore/source. Strict would break clicking the link from a chat app.
  expect(c).toContain('SameSite=Lax')
  expect(c).toContain('Path=/')
})

test('readCookie finds its cookie among others', () => {
  const h = `other=1; ${SESSION_COOKIE}=abc123; another=2`
  expect(readCookie(h, SESSION_COOKIE)).toBe('abc123')
  expect(readCookie(h, 'other')).toBe('1')
  expect(readCookie(h, 'missing')).toBeUndefined()
  expect(readCookie(null, SESSION_COOKIE)).toBeUndefined()
  expect(readCookie('', SESSION_COOKIE)).toBeUndefined()
})

test('the redirect target has the token stripped', () => {
  // If the token survived the redirect it would land in history and Referer anyway,
  // which is the entire thing the exchange exists to prevent.
  expect(urlWithoutToken('https://x.dev/foo/?t=SECRET', 't')).toBe('/foo/')
  expect(urlWithoutToken('https://x.dev/?t=SECRET&keep=1', 't')).toBe(
    '/?keep=1'
  )
  expect(urlWithoutToken('https://x.dev/a/b/?t=S#frag', 't')).toBe('/a/b/#frag')
})

// ── who may write source ─────────────────────────────────────────────────────
//
// This is the decision that stands between a tunnelled request and arbitrary repo
// writes, which the watcher rebuilds and RUNS. It previously lived as an inline
// expression inside a TLS-requiring server closure with NO tests at any tier — while
// a comment claimed a regression test that did not exist.

import { isLoopbackAddress as serverSideLoopback } from './dev-server.js'
import {
  mayWriteSource,
  mayDriveWithAgent,
  sessionRejection,
  validSessionCookie,
  sessionCookie,
  parseSessionCookie,
  BOOT_ID,
  isLoopbackAddressForAuth,
  isProxiedRequest,
} from './dev-auth.js'

test('tunnel traffic ALWAYS needs a session — loopback is no shortcut', () => {
  // The whole point: a tunnel counterfeits "local", so a loopback peer proves nothing.
  expect(
    mayWriteSource({
      viaTunnel: true,
      peer: '127.0.0.1',
      hasValidSession: false,
    })
  ).toBe(false)
  expect(
    mayWriteSource({ viaTunnel: true, peer: '::1', hasValidSession: false })
  ).toBe(false)
  expect(
    mayWriteSource({
      viaTunnel: true,
      peer: '127.0.0.1',
      hasValidSession: true,
    })
  ).toBe(true)
})

test('direct traffic is authorized by a loopback peer', () => {
  expect(
    mayWriteSource({
      viaTunnel: false,
      peer: '127.0.0.1',
      hasValidSession: false,
    })
  ).toBe(true)
  expect(
    mayWriteSource({
      viaTunnel: false,
      peer: '::ffff:127.0.0.1',
      hasValidSession: false,
    })
  ).toBe(true)
})

test('direct traffic from the LAN is refused — the coffee-shop RCE', () => {
  for (const peer of [
    '192.168.1.50',
    '10.0.0.7',
    '::ffff:192.168.1.50',
    '',
    undefined,
  ]) {
    expect(
      mayWriteSource({ viaTunnel: false, peer, hasValidSession: false })
    ).toBe(false)
  }
})

test('REGRESSION: an off-machine caller that reaches loopback without X-Forwarded-* cannot write', () => {
  // The exact fail-open this replaced. `ssh -R` with GatewayPorts yes, ngrok tcp,
  // socat, iptables DNAT, nginx proxy_pass without forwardfor — all deliver
  // {peer: 127.0.0.1, no forwarded headers}. Under the old header-sniffing rule that
  // authorized an arbitrary repo write. Arriving on the tunnel listener now decides it,
  // and a listener is not something a client can forge.
  expect(
    mayWriteSource({
      viaTunnel: true,
      peer: '127.0.0.1',
      hasValidSession: false,
    })
  ).toBe(false)
})

test('isLoopbackAddressForAuth IS the server-side predicate', () => {
  expect(isLoopbackAddressForAuth('127.0.0.1')).toBe(true)
  expect(isLoopbackAddressForAuth('10.127.0.1')).toBe(false)
  expect(isLoopbackAddressForAuth('127.0.0.1.evil.com')).toBe(false)
  // This test was titled "matches the server-side predicate" while importing nothing
  // from dev-server — it pinned the duplication rather than checking it. They are now
  // one function, and this asserts that rather than hoping.
  expect(serverSideLoopback).toBe(isLoopbackAddressForAuth)
})

// ── proxy detection ──────────────────────────────────────────────────────────
//
// Extracted because the predicate was duplicated character-for-character at two call
// sites, only one of which was load-bearing — a "tidy-up" of the other would have
// silently changed the write model.

test('isProxiedRequest sees either forwarded header, and neither means direct', () => {
  const h = (o: Record<string, string>) => ({
    get: (n: string) => o[n] ?? null,
  })
  expect(isProxiedRequest(h({ 'x-forwarded-for': '1.2.3.4' }))).toBe(true)
  expect(isProxiedRequest(h({ 'x-forwarded-host': 'x.example' }))).toBe(true)
  expect(isProxiedRequest(h({}))).toBe(false)
})

test('isProxiedRequest is NOT what authorizes writes', () => {
  // Deliberate: a forwarder that omits these headers would look direct. Write
  // authorization uses the LISTENER (mayWriteSource), which a client cannot forge.
  // This test exists so nobody "improves" mayWriteSource to use the header again.
  const noHeaders = { get: () => null }
  expect(isProxiedRequest(noHeaders)).toBe(false)
  expect(
    mayWriteSource({
      viaTunnel: true,
      peer: '127.0.0.1',
      hasValidSession: false,
    })
  ).toBe(false)
})

// ── rsync --delete target safety ─────────────────────────────────────────────
//
// The old rule was "absolute, at least two segments" — which admits /usr/lib and
// /etc/caddy. `rsync --delete` MIRRORS, so deploying a doc site into either empties it.

import {
  isSafeRemotePath,
  safeRemoteRoots,
} from '../../../bin/resolve-site-config.js'

test('isSafeRemotePath accepts preview roots', () => {
  for (const p of [
    '/srv/preview/x',
    '/srv/preview/a/b',
    '/srv/www/site',
    '/opt/preview/p',
  ]) {
    expect(isSafeRemotePath(p)).toBe(true)
  }
})

test('isSafeRemotePath refuses system directories the depth rule allowed', () => {
  for (const p of [
    '/usr/lib',
    '/var/www',
    '/etc/caddy',
    '/home/deploy',
    '/srv',
    '/',
    '',
  ]) {
    expect(isSafeRemotePath(p)).toBe(false)
  }
})

test('REGRESSION: the preview ROOT itself is not a deploy target', () => {
  // `rsync --delete` MIRRORS. One dropped path segment (`--path=/srv/preview`) deleted
  // every other project on the shared box, the generated index, and all of
  // /srv/preview/_sites/*.caddy — the fragments the Caddyfile glob-imports — and then
  // reloaded Caddy, so every preview lost its route at once.
  for (const root of safeRemoteRoots()) {
    expect(isSafeRemotePath(root)).toBe(false)
    expect(isSafeRemotePath(root + '/')).toBe(false)
    expect(isSafeRemotePath(root + '/a-project')).toBe(true)
  }
})

test('isSafeRemotePath refuses traversal and relative paths', () => {
  expect(isSafeRemotePath('/srv/preview/../../etc')).toBe(false)
  expect(isSafeRemotePath('srv/preview/x')).toBe(false)
  // A prefix match must not admit a sibling: /srv/previewX is not under /srv/preview
  expect(isSafeRemotePath('/srv/previewX/y')).toBe(false)
})

// ── who may READ the site ────────────────────────────────────────────────────
//
// This gate shipped a fail-open through 1.9.0-beta.1, beta.2, rc.1 and rc.2: it keyed on
// X-Forwarded-*, while the WRITE path beside it had already been moved onto the listener
// for exactly the reason these headers cannot be trusted. Untestable inline in a
// TLS-requiring closure, so nothing could see it.

import {
  mayReadSite,
  shouldInterceptLinkToken,
  isLockedDown,
  hasTunnel,
} from './dev-auth.js'

test('REGRESSION: a forwarder that omits X-Forwarded-* cannot read a locked-down workspace', () => {
  // `ssh -R` with GatewayPorts yes, ngrok tcp, socat, iptables DNAT, nginx proxy_pass,
  // HAProxy without `option forwardfor` — all arrive with NO forwarding headers. Keyed on
  // the header, every one of them read the entire uncommitted working tree anonymously,
  // while requireToken promised "nothing at all — not even the page".
  expect(
    mayReadSite({
      lockedDown: true,
      viaTunnel: true,
      proxied: false,
      hasLinkToken: false,
      hasValidSession: false,
    })
  ).toBe(false)
})

test('a locked-down workspace opens for a session, or for a link being redeemed', () => {
  const base = { lockedDown: true, viaTunnel: true, proxied: true }
  expect(
    mayReadSite({ ...base, hasLinkToken: false, hasValidSession: true })
  ).toBe(true)
  // Redemption must stay reachable without a session — it is how you GET one.
  expect(
    mayReadSite({ ...base, hasLinkToken: true, hasValidSession: false })
  ).toBe(true)
  expect(
    mayReadSite({ ...base, hasLinkToken: false, hasValidSession: false })
  ).toBe(false)
})

test('direct traffic at this keyboard is never gated', () => {
  expect(
    mayReadSite({
      lockedDown: true,
      viaTunnel: false,
      proxied: false,
      hasLinkToken: false,
      hasValidSession: false,
    })
  ).toBe(true)
})

test('requireToken: false opens the workspace to the tunnel deliberately', () => {
  expect(
    mayReadSite({
      lockedDown: false,
      viaTunnel: true,
      proxied: true,
      hasLinkToken: false,
      hasValidSession: false,
    })
  ).toBe(true)
})

test('REGRESSION: `?t=` is not touched without a tunnel, or on a non-GET', () => {
  // `t` is the classic cache-buster. Ungated, EVERY adopter's dev server answered
  // `GET /?t=12345` with a 401 "that invite link has been used" instead of the page, and
  // 401'd POSTs carrying `t` — losing the body to a redirect. Two releases shipped a
  // CHANGELOG entry claiming this gate before the gate was written.
  expect(
    shouldInterceptLinkToken({ tunnelConfigured: false, method: 'GET' })
  ).toBe(false)
  expect(
    shouldInterceptLinkToken({ tunnelConfigured: true, method: 'POST' })
  ).toBe(false)
  expect(
    shouldInterceptLinkToken({ tunnelConfigured: true, method: 'GET' })
  ).toBe(true)
})

test('REGRESSION: with NO preview.tunnel configured, an invite link is still redeemable', () => {
  // The lock armed off a config block that does not exist, so the read gate denied every
  // proxied request without a session while shouldInterceptLinkToken — correctly gated on
  // the tunnel block — refused to read `?t=`. The link became unredeemable.
  //
  // This asserts the REAL predicate. The first version of this test retyped the
  // expression locally, so reverting the fix left all 822 tests green — a test that
  // recomputes what it is checking cannot fail. Same trap `isLoopbackAddressForAuth` fell
  // into, which is why that one asserts function identity.
  expect(isLockedDown({})).toBe(false)
  expect(isLockedDown({ preview: {} })).toBe(false)
  expect(isLockedDown({ preview: { tunnel: {} } })).toBe(true)
  expect(isLockedDown({ preview: { tunnel: { requireToken: false } } })).toBe(
    false
  )
  expect(
    mayReadSite({
      lockedDown: isLockedDown({}),
      viaTunnel: false,
      proxied: true,
      hasLinkToken: false,
      hasValidSession: false,
    })
  ).toBe(true)
})

test('the server and the ?t= gate agree on what "has a tunnel" means', () => {
  // These were two hand-written copies of the same question; disagreeing is what made the
  // link unredeemable in the first place.
  for (const config of [{}, { preview: {} }, { preview: { tunnel: {} } }]) {
    expect(isLockedDown(config)).toBe(hasTunnel(config) && isLockedDown(config))
  }
  expect(hasTunnel({})).toBe(false)
  expect(hasTunnel({ preview: { tunnel: {} } })).toBe(true)
})

// ── arriving with a link token ───────────────────────────────────────────────

import { resolveLinkArrival } from './dev-auth'

test('a good token issues a session', () => {
  expect(
    resolveLinkArrival({ redeemed: 'sess-abc', hasValidSession: false })
  ).toBe('issue-session')
})

test('REGRESSION: a valid session trumps a stale link', () => {
  // Someone already signed in who clicks an older link — a second window, a link
  // scrolled back to in chat, a bookmark — was walled with "that invite link has been
  // used" while holding a perfectly good session. The token is read before the cookie,
  // and a comment asserted (without enforcing) that a session holder could never get
  // here. The stale token is simply irrelevant to them.
  expect(resolveLinkArrival({ redeemed: null, hasValidSession: true })).toBe(
    'already-authenticated'
  )
})

test('a stale link with no session is still refused', () => {
  expect(resolveLinkArrival({ redeemed: null, hasValidSession: false })).toBe(
    'reject'
  )
})

test('a fresh redemption wins even if a session is already held', () => {
  // Redeeming spends the token either way, so honour it rather than leaving a spent
  // token behind with the old session still running its original clock.
  expect(
    resolveLinkArrival({ redeemed: 'sess-new', hasValidSession: true })
  ).toBe('issue-session')
})

// ── link redemption policy ───────────────────────────────────────────────────

test('REGRESSION: by default a link works on a SECOND device inside its window', () => {
  /*
  The link was spent on first redemption. So: glance at it and close the tab, you need a new
  link; open it on a laptop then reach for your phone, dead link — in a feature whose whole
  point is reading your workspace on a phone. One adopter replaced it with a never-expiring
  link of their own, which is the tell. Security people route around is friction plus a worse
  system built beside it.
  */
  const state = createAuthState()
  const token = issueLink(state, 1000)
  const laptop = redeemLink(state, token, 2000)
  const phone = redeemLink(state, token, 3000)
  expect(laptop).toBeTruthy()
  expect(phone).toBeTruthy()
  expect(phone).not.toBe(laptop) // a distinct session each, not a shared one
  expect(validSession(state, laptop, 4000)).toBe(true)
  expect(validSession(state, phone, 4000)).toBe(true)
})

test("'single-use' still spends the token on first redemption", () => {
  const state = createAuthState()
  const token = issueLink(state, 1000)
  expect(redeemLink(state, token, 2000, 'single-use')).toBeTruthy()
  expect(redeemLink(state, token, 2500, 'single-use')).toBe(null)
})

test('REGRESSION: reuse does not widen LIFETIME — an expired link is still refused', () => {
  // The whole safety of the looser default rests on this. A window that never closed would
  // be the never-expiring token we are trying to make unnecessary.
  const state = createAuthState()
  const token = issueLink(state, 0)
  const { ttlMs } = resolveLinkSettings()
  expect(redeemLink(state, token, ttlMs - 1)).toBeTruthy()
  expect(redeemLink(state, token, ttlMs + 1)).toBe(null)
})

test('linkTtlMinutes widens the window, and bounds it', () => {
  const state = createAuthState()
  const { ttlMs } = resolveLinkSettings({ linkTtlMinutes: 60 })
  expect(ttlMs).toBe(60 * 60 * 1000)
  const token = issueLink(state, 0, ttlMs)
  expect(redeemLink(state, token, 59 * 60 * 1000)).toBeTruthy()
  expect(redeemLink(state, token, 61 * 60 * 1000)).toBe(null)
})

test('defaults are window/5min, and a nonsense TTL falls back rather than expiring instantly', () => {
  // Five, not fifteen: the shorter window is what pays for the shorter token. A link is
  // redeemed seconds after it is typed, so the extra ten minutes bought only exposure.
  expect(resolveLinkSettings()).toEqual({ policy: 'window', ttlMs: 300_000 })
  expect(resolveLinkSettings({}).policy).toBe('window')
  for (const bad of [0, -5, NaN, Infinity]) {
    // A typo must not mint links that never work — that reads as "the tunnel is broken".
    expect(resolveLinkSettings({ linkTtlMinutes: bad }).ttlMs).toBe(300_000)
  }
})

test('a session outlives the link that issued it', () => {
  // The link is only the thing that hands over a credential; the cookie is the durable half.
  const state = createAuthState()
  const token = issueLink(state, 0)
  const session = redeemLink(state, token, 1000)!
  expect(redeemLink(state, token, 20 * 60 * 1000)).toBe(null) // link aged out
  expect(validSession(state, session, 20 * 60 * 1000)).toBe(true) // session did not
})

/*
Guess-rate control: one redemption at a time, each occupying at least 100ms.

Ten attempts a second against 32⁷ ≈ 3.4 × 10¹⁰ is roughly a century to exhaust, and 3000
guesses inside a five-minute window — about 1 in 11 million. No lockout, so there is nothing
an attacker can trigger to keep the developer out of their own workspace.
*/

test('attempts are serialized — concurrency is one', async () => {
  const gate = createRedemptionGate({ minMs: 20 })
  let running = 0
  let peak = 0
  await Promise.all(
    Array.from({ length: 6 }, () =>
      gate(() => {
        running += 1
        peak = Math.max(peak, running)
        running -= 1
        return true
      })
    )
  )
  // The point: an attacker cannot buy throughput by opening more connections.
  expect(peak).toBe(1)
})

test('each attempt occupies its slot, so throughput is capped', async () => {
  const gate = createRedemptionGate({ minMs: 20 })
  const started = Date.now()
  for (let i = 0; i < 5; i++) await gate(() => null)
  // 5 attempts × 20ms; allow slop for timer granularity, but it cannot be near zero.
  expect(Date.now() - started).toBeGreaterThanOrEqual(80)
})

test('the floor applies to SUCCESS as well as failure', async () => {
  /*
  Delaying only failures would leak the answer through response time and undo `safeEqual`'s
  constant-time comparison — the throttle itself would become the oracle.
  */
  const gate = createRedemptionGate({ minMs: 30 })
  const time = async (result: unknown) => {
    const t = Date.now()
    await gate(() => result)
    return Date.now() - t
  }
  expect(await time('a-session-token')).toBeGreaterThanOrEqual(25)
  expect(await time(null)).toBeGreaterThanOrEqual(25)
})

test('a throwing attempt still occupies its slot, and does not stall the queue', async () => {
  // Otherwise an input that reliably throws would be a way to run the gate at full speed —
  // and one rejection would wedge every redemption after it.
  const gate = createRedemptionGate({ minMs: 20 })
  const started = Date.now()
  await expect(
    gate(() => {
      throw new Error('boom')
    })
  ).rejects.toThrow('boom')
  expect(Date.now() - started).toBeGreaterThanOrEqual(15)
  expect(await gate(() => 'still works')).toBe('still works')
})

test('the returned value is the work’s own', async () => {
  const gate = createRedemptionGate({ minMs: 1 })
  expect(await gate(() => 42)).toBe(42)
})

test('the default floor is 100ms — a decision, not an accident', () => {
  // Below what a person notices in a page response; ten attempts/sec for anyone brute
  // forcing. If someone lowers this, the arithmetic in dev-auth.ts stops holding.
  expect(REDEEM_MIN_MS).toBe(100)
})

test('after N consecutive failures the slot widens', async () => {
  // Ten times slower for anyone guessing. Nobody mistypes seven characters ten times
  // running, and if they somehow do, they wait a second.
  const gate = createRedemptionGate({ minMs: 5, slowMs: 60, slowAfter: 3 })
  const fail = () => gate(() => null).catch(() => null)
  const time = async (fn: () => Promise<unknown>) => {
    const t = Date.now()
    await fn()
    return Date.now() - t
  }
  expect(await time(fail)).toBeLessThan(40)
  await fail()
  await fail()
  /*
  The FOURTH attempt is the first slow one, with `slowAfter: 3`: the slot is chosen from the
  count as it stands when the attempt begins, so three failures must have completed. That is
  the literal reading of "after ten fails, start waiting a second", and it is forced by the
  timing-safety rule below — the attempt that crosses the threshold must not be the one that
  changes speed, or its duration would report its own outcome.
  */
  expect(await time(fail)).toBeGreaterThanOrEqual(50)
})

test('a success resets the widening', async () => {
  const gate = createRedemptionGate({ minMs: 5, slowMs: 60, slowAfter: 2 })
  await gate(() => null).catch(() => null)
  await gate(() => null).catch(() => null)
  await gate(() => 'a-session') // slow slot, but it resets the count
  const t = Date.now()
  await gate(() => 'a-session')
  expect(Date.now() - t).toBeLessThan(40)
})

test('REGRESSION: the slot is decided BEFORE the work, so it cannot leak the outcome', async () => {
  /*
  The subtle half. If the duration were computed after the work, a success would reset the
  counter and return fast while a failure returned slow — so the attempt that crosses the
  threshold would announce its own outcome by how long it took. That is exactly the oracle
  `safeEqual`'s constant-time comparison exists to deny.
  */
  const mk = () => createRedemptionGate({ minMs: 5, slowMs: 60, slowAfter: 2 })
  const runTo = async (gate: ReturnType<typeof mk>, result: unknown) => {
    await gate(() => null).catch(() => null)
    await gate(() => null).catch(() => null)
    const t = Date.now()
    await gate(() => result).catch(() => null)
    return Date.now() - t
  }
  const whenWrong = await runTo(mk(), null)
  const whenRight = await runTo(mk(), 'a-session')
  // Same state in, same time out — whatever the answer was.
  expect(Math.abs(whenWrong - whenRight)).toBeLessThan(30)
  expect(whenRight).toBeGreaterThanOrEqual(50)
})

test('the escalation constants are decisions, not accidents', () => {
  expect(REDEEM_MIN_MS).toBe(100)
  expect(SLOW_AFTER_FAILURES).toBe(10)
  expect(REDEEM_SLOW_MS).toBe(1000)
  // Still not a lockout: the door never closes, it only gets slower to knock on.
  expect(REDEEM_SLOW_MS).toBeLessThan(5000)
})

test('the queue is BOUNDED — serialization must not become the weapon', async () => {
  /*
  Measured before the cap, at the real constants: 50 fire-and-forget junk requests delayed a
  legitimate redemption by 42 seconds, and a 2/sec trickle grew the backlog faster than it
  drained, so the denial outlasted the attack. The link's own TTL is evaluated when the work
  finally runs, so a valid token could expire while queued — the exact denial of service the
  no-lockout design exists to avoid, reintroduced by the anti-guessing mechanism.
  */
  const gate = createRedemptionGate({ minMs: 30, maxWaiting: 3 })
  const accepted: Array<Promise<unknown>> = []
  let refused = 0
  for (let i = 0; i < 20; i++) {
    const p = gate(() => null).catch((error) => {
      if (error instanceof RedemptionBusyError) refused += 1
      return null
    })
    accepted.push(p)
  }
  await Promise.all(accepted)
  // 3 wait, the other 17 are turned away instantly rather than deepening the queue.
  expect(refused).toBe(17)
})

test('overflow is refused INSTANTLY — it must cost the attacker, not us', async () => {
  const gate = createRedemptionGate({ minMs: 200, maxWaiting: 1 })
  const first = gate(() => null).catch(() => null)
  const started = Date.now()
  await expect(gate(() => null)).rejects.toBeInstanceOf(RedemptionBusyError)
  // No slot paid, so a full queue cannot itself be used to hold connections open.
  expect(Date.now() - started).toBeLessThan(50)
  await first
})

test('the queue drains, so a refusal is momentary rather than sticky', async () => {
  const gate = createRedemptionGate({ minMs: 10, maxWaiting: 2 })
  await Promise.all([
    gate(() => null).catch(() => null),
    gate(() => null).catch(() => null),
    gate(() => null).catch(() => null),
  ])
  // Once the burst clears, a legitimate attempt goes straight through.
  expect(await gate(() => 'a-session')).toBe('a-session')
})

test('the rate limit is untouched by the cap', async () => {
  // The bounded queue in front still pays the full slot: capping depth must not become a way
  // to guess faster.
  const gate = createRedemptionGate({ minMs: 25, maxWaiting: 8 })
  const started = Date.now()
  await Promise.all(
    Array.from({ length: 4 }, () => gate(() => null).catch(() => null))
  )
  expect(Date.now() - started).toBeGreaterThanOrEqual(90)
})

test('the depth cap is a decision, not an accident', () => {
  expect(REDEEM_MAX_WAITING).toBe(16)
})

test('REGRESSION: queue depth does not change the guess rate', async () => {
  /*
  The two controls are separate and must stay separate: the SLOT is the brute-force control,
  the depth cap is a denial-of-service control. If someone ever "optimises" the cap by letting
  overflow skip the slot, or tunes depth expecting it to affect guessing, this says otherwise.

  Same slot, wildly different depths, same achieved rate.
  */
  const rate = async (maxWaiting: number) => {
    const gate = createRedemptionGate({ minMs: 20, maxWaiting })
    const started = Date.now()
    let served = 0
    await Promise.all(
      Array.from({ length: 4 }, () =>
        gate(() => null)
          .then(() => served++)
          .catch(() => undefined)
      )
    )
    return served / ((Date.now() - started) / 1000)
  }
  const shallow = await rate(4)
  const deep = await rate(64)
  // Both are bounded by the slot (~50/sec at minMs 20), not by how many may wait.
  expect(shallow).toBeLessThan(70)
  expect(deep).toBeLessThan(70)
})

/*
The WIRING, not just the gate.

`createRedemptionGate` had 21 tests and the thing that makes any of them real — that the dev
server actually redeems THROUGH the gate, with the clock read on arrival — had none, because
`handleRequest` is an unexported closure. Reverting the server to a bare `redeemLink(...)`
call restored both the unbounded queue and the unthrottled guess rate, type-checked cleanly,
and left every lane green. A security control held in place by nothing but the diff.
*/

test('redemption goes through the gate — the rate limit is not bypassable', async () => {
  const state = createAuthState()
  const gate = createRedemptionGate({ minMs: 25 })
  const token = issueLink(state, NOW)
  const started = Date.now()
  const { session, busy } = await redeemThroughGate({
    gate,
    state,
    token,
    arrivedAt: NOW,
  })
  expect(busy).toBe(false)
  expect(session).toBeTruthy()
  // It paid the slot, which is what "through the gate" means.
  expect(Date.now() - started).toBeGreaterThanOrEqual(20)
})

test('a full queue surfaces as busy, not as a thrown error', async () => {
  // The server answers 503 on this; it must be a value it can branch on, not an exception
  // that escapes into the request handler.
  const state = createAuthState()
  const gate = createRedemptionGate({ minMs: 40, maxWaiting: 1 })
  const token = issueLink(state, NOW)
  const first = redeemThroughGate({ gate, state, token, arrivedAt: NOW })
  const second = await redeemThroughGate({ gate, state, token, arrivedAt: NOW })
  expect(second.busy).toBe(true)
  expect(second.session).toBe(null)
  await first
})

test('REGRESSION: the clock is the ARRIVAL time, not the time the work ran', async () => {
  /*
  `Date.now()` inside the queued closure let a token that was valid when the user clicked
  expire while it waited behind other attempts — the queue silently consuming the credential's
  five-minute life. Passing the arrival time makes queueing cost latency and nothing else.
  */
  const state = createAuthState()
  const gate = createRedemptionGate({ minMs: 1 })
  const { ttlMs } = resolveLinkSettings(undefined)
  const token = issueLink(state, NOW, ttlMs)
  // The work runs long after the token would have aged out, but it arrived in time.
  const { session } = await redeemThroughGate({
    gate,
    state,
    token,
    arrivedAt: NOW + ttlMs - 1000,
  })
  expect(session).toBeTruthy()
})

test('an expired token is still refused — arrival time widens nothing', () => {
  const state = createAuthState()
  const { ttlMs } = resolveLinkSettings(undefined)
  const token = issueLink(state, NOW, ttlMs)
  expect(redeemLink(state, token, NOW + ttlMs + 1)).toBe(null)
})

/*
Driving a page with an agent is at least as powerful as writing source: an agent that can
evaluate script in the page reads whatever the page reads and acts as the logged-in user.
So the rule is not merely SIMILAR to `mayWriteSource`, it is the same rule, and these assert
that rather than trusting the delegation to stay put.
*/
test('mayDriveWithAgent: over the tunnel a session is required, and sufficient', () => {
  expect(
    mayDriveWithAgent({ viaTunnel: true, peer: '::1', hasValidSession: false })
  ).toBe(false)
  expect(
    mayDriveWithAgent({ viaTunnel: true, peer: '::1', hasValidSession: true })
  ).toBe(true)
})

test('mayDriveWithAgent: a loopback peer address does NOT authorize over the tunnel', () => {
  // The whole reason the listener decides: a reverse tunnel makes every peer look local.
  for (const peer of ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']) {
    expect(
      mayDriveWithAgent({ viaTunnel: true, peer, hasValidSession: false })
    ).toBe(false)
  }
})

test('mayDriveWithAgent: direct requests follow the loopback rule, session or not', () => {
  expect(
    mayDriveWithAgent({
      viaTunnel: false,
      peer: '127.0.0.1',
      hasValidSession: false,
    })
  ).toBe(true)
  expect(
    mayDriveWithAgent({
      viaTunnel: false,
      peer: '192.168.1.50',
      hasValidSession: true,
    })
  ).toBe(false)
})

test('mayDriveWithAgent: it agrees with mayWriteSource on every combination', () => {
  // One rule, two names. If they ever diverge it must be a deliberate edit here, not drift.
  for (const viaTunnel of [true, false]) {
    for (const hasValidSession of [true, false]) {
      for (const peer of ['127.0.0.1', '::1', '10.0.0.4', undefined, null]) {
        const opts = { viaTunnel, peer, hasValidSession }
        expect(mayDriveWithAgent(opts)).toBe(mayWriteSource(opts))
      }
    }
  }
})

test('#114: a cookie from a previous run is identifiably STALE, not merely unknown', () => {
  /*
  Sessions live in memory and die with the process by design — a credential should not outlive
  the thing that granted it, and nothing is written to disk. What was wrong is that a cookie
  from a previous run and a cookie never seen produced the identical screen, so a reader whose
  server had restarted was told "invite links expire" and concluded their cookie was expiring —
  the one explanation the evidence ruled out.
  */
  const mine = sessionCookie('abc')
  const value = mine.split('=')[1].split(';')[0]
  expect(sessionRejection(value)).toBe('none')

  // Same token, different run.
  expect(sessionRejection(`OTHERRUN.abc`)).toBe('stale')
})

test('#114: a malformed or absent cookie is not reported as a restart', () => {
  // Claiming a restart we cannot evidence would be its own lie.
  expect(sessionRejection(undefined)).toBe('none')
  expect(sessionRejection('')).toBe('none')
  expect(sessionRejection('no-dot-here')).toBe('unknown')
})

test('#114: the boot prefix is not a credential — it does not admit anyone', () => {
  /*
  It exists only so the message can be true. A cookie carrying the right run id and a wrong
  token is refused exactly as before.
  */
  const state = createAuthState()
  expect(
    validSessionCookie(state, `${BOOT_ID}.not-a-real-token`, Date.now())
  ).toBe(false)
  expect(validSessionCookie(state, `${BOOT_ID}.`, Date.now())).toBe(false)
  expect(validSessionCookie(state, 'anything', Date.now())).toBe(false)
})

test('#114: a session issued this run still validates through the cookie', () => {
  // The round trip: the prefix must not break the thing it annotates.
  const state = createAuthState()
  const now = Date.now()
  const token = issueLink(state, now)
  const session = redeemLink(state, token, now)
  expect(session).toBeTruthy()
  const value = sessionCookie(session!).split('=')[1].split(';')[0]
  expect(parseSessionCookie(value)?.bootId).toBe(BOOT_ID)
  expect(validSessionCookie(state, value, now)).toBe(true)
})

describe('isSameOriginRequest — CSRF gate for the loopback path (#90)', () => {
  /*
  The attack: `mayWriteSource`'s direct path is peer-address-only, and the handlers parse
  JSON regardless of Content-Type — so a cross-site `fetch(…, {mode:'no-cors'})` with a
  CORS-safelisted type is a SIMPLE request that reaches the handler from 127.0.0.1 with no
  credential. Any page the developer visits could write `.git/hooks/pre-commit`.

  These assert the SHIPPED function, not a retyped copy of its condition — the failure mode
  this release's own review caught twice elsewhere.
  */
  const req = (headers: Record<string, string>) => ({
    headers: {
      get: (n: string) => headers[n.toLowerCase()] ?? null,
    },
  })

  test('refuses a cross-site request', () => {
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'cross-site' }))).toBe(
      false
    )
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'same-site' }))).toBe(
      false
    )
  })

  test('allows a same-origin page and a direct navigation', () => {
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'same-origin' }))).toBe(
      true
    )
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'none' }))).toBe(true)
  })

  test('allows a caller carrying no browser fingerprint at all (CLI, curl)', () => {
    /*
    Load-bearing: our own CLI delegating a build, and curl, send neither header. A rule
    requiring fetch metadata would fail closed against every legitimate tool.

    The earlier version of this comment claimed "a browser always sends it". That was FALSE —
    Safari < 16.4, Firefox < 90 and older WKWebViews send no fetch metadata, and the review
    caught that it left exactly those browsers in the pre-fix position. Hence the Origin cases
    below: those browsers DO send Origin, so what is allowed is the absence of BOTH signals,
    not of one.
    */
    expect(isSameOriginRequest(req({}))).toBe(true)
  })

  test('refuses a cross-origin POST with NO fetch metadata (the old-browser gap)', () => {
    expect(
      isSameOriginRequest(
        req({ origin: 'https://evil.example', host: 'localhost:8787' })
      )
    ).toBe(false)
  })

  test('allows a same-origin POST identified only by Origin', () => {
    expect(
      isSameOriginRequest(
        req({ origin: 'https://localhost:8787', host: 'localhost:8787' })
      )
    ).toBe(true)
  })

  test('refuses an OPAQUE origin — the one an attacker can choose', () => {
    /*
    `Origin: null` is what a sandboxed iframe, `srcdoc`, a `data:` document and a
    cross-origin-redirected POST send. An earlier version exempted it explicitly, which left
    exactly the old-browser population this Origin check exists for unprotected — modern
    engines were saved only by also sending `Sec-Fetch-Site: cross-site`. Nothing this project
    ships requests from an opaque origin, so there is nothing to exempt.
    */
    expect(
      isSameOriginRequest(req({ origin: 'null', host: 'localhost:8787' }))
    ).toBe(false)
  })

  test('refuses an Origin it cannot parse rather than shrugging', () => {
    expect(
      isSameOriginRequest(req({ origin: 'not a url', host: 'localhost:8787' }))
    ).toBe(false)
  })

  test('FAILS CLOSED on an odd or unrecognised site value', () => {
    // Anything that is not explicitly same-origin/none is refused, including junk.
    expect(isSameOriginRequest(req({ 'sec-fetch-site': '' }))).toBe(false)
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'weird' }))).toBe(false)
  })
})
