import { test, expect } from 'bun:test'
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

test('tokens are long and distinct', () => {
  const s = createAuthState()
  const seen = new Set<string>()
  for (let i = 0; i < 50; i++) seen.add(issueLink(s, NOW))
  expect(seen.size).toBe(50)
  for (const t of seen) expect(t.length).toBeGreaterThanOrEqual(20) // 128 bits b64url
})

test('safeEqual is correct on equal, unequal and mismatched lengths', () => {
  expect(safeEqual('abc', 'abc')).toBe(true)
  expect(safeEqual('abc', 'abd')).toBe(false)
  expect(safeEqual('abc', 'abcd')).toBe(false) // must not throw
  expect(safeEqual('', '')).toBe(true)
})

test('the session cookie carries the flags the design depends on', () => {
  const c = sessionCookie('tok123')
  expect(c).toContain(`${SESSION_COOKIE}=tok123`)
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

import {
  issueLink,
  redeemLink,
  validSession,
  resolveLinkSettings,
  createAuthState,
} from './dev-auth.js'

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

test('defaults are window/15min, and a nonsense TTL falls back rather than expiring instantly', () => {
  expect(resolveLinkSettings()).toEqual({ policy: 'window', ttlMs: 900_000 })
  expect(resolveLinkSettings({}).policy).toBe('window')
  for (const bad of [0, -5, NaN, Infinity]) {
    // A typo must not mint links that never work — that reads as "the tunnel is broken".
    expect(resolveLinkSettings({ linkTtlMinutes: bad }).ttlMs).toBe(900_000)
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
