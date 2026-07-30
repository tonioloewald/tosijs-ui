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
} from './dev-auth'

const NOW = 1_700_000_000_000

test('a link token is spent on first use', () => {
  const s = createAuthState()
  const link = issueLink(s, NOW)
  const session = redeemLink(s, link, NOW)
  expect(session).toBeTruthy()
  // THE property: a token scraped from a log, history entry or chat preview is
  // worthless because the first redemption consumed it.
  expect(redeemLink(s, link, NOW)).toBe(null)
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
  expect(urlWithoutToken('https://x.dev/?t=SECRET&keep=1', 't')).toBe('/?keep=1')
  expect(urlWithoutToken('https://x.dev/a/b/?t=S#frag', 't')).toBe('/a/b/#frag')
})
