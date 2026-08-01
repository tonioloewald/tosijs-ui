import { test, expect } from 'bun:test'
import {
  haltijaLoaderSnippet,
  isLoopbackAddress,
  resolveIdleMs,
  resolveLimitMb,
} from './dev-server.js'

const HOUR = 3600_000

test('haltija loader is gated to the top window — never nested test iframes', () => {
  const s = haltijaLoaderSnippet(8701)
  // The load-bearing guard: without `self===top` the background test runner's
  // per-page hidden iframes each import dev.js. Regressing this reintroduces the
  // N-redundant-loads annoyance, so assert it explicitly.
  expect(s).toContain('self===top')
  // Still localhost-gated and pointed at the passed channel port.
  expect(s).toContain("import('https://localhost:8701/dev.js')")
  expect(s).toContain('location.hostname')
})

test('defaults to 8 hours when neither config nor env says otherwise', () => {
  expect(resolveIdleMs(undefined, undefined)).toBe(8 * HOUR)
})

test('config sets the timeout; env overrides config', () => {
  expect(resolveIdleMs(2, undefined)).toBe(2 * HOUR)
  expect(resolveIdleMs(2, '4')).toBe(4 * HOUR)
})

test('an explicit zero or negative disables it — the only way to turn it off', () => {
  expect(resolveIdleMs(0, undefined)).toBe(0)
  expect(resolveIdleMs(-1, undefined)).toBe(0)
  expect(resolveIdleMs(undefined, '0')).toBe(0)
})

test('an empty env var means unset, not disabled', () => {
  expect(resolveIdleMs(2, '')).toBe(2 * HOUR)
  expect(resolveIdleMs(undefined, '  ')).toBe(8 * HOUR)
})

test('a garbage env value falls back to the default — never silently OFF', () => {
  // The guard exists to stop a forgotten server from becoming a runaway. A typo
  // that quietly disables it would be worse than having no guard at all, because
  // you would believe you were covered.
  expect(resolveIdleMs(undefined, '8h')).toBe(8 * HOUR)
  expect(resolveIdleMs(undefined, 'off')).toBe(8 * HOUR)
  expect(resolveIdleMs(4, 'nonsense')).toBe(8 * HOUR)
})

test('fractional hours work, for anyone who wants a short leash', () => {
  expect(resolveIdleMs(0.5, undefined)).toBe(0.5 * HOUR)
})

// ── the RSS ceiling ─────────────────────────────────────────────────────────
// This was `Number(env ?? config ?? 4096)`, which failed in BOTH directions.

test('the ceiling defaults to 4096MB', () => {
  expect(resolveLimitMb(undefined, undefined)).toBe(4096)
  expect(resolveLimitMb(2048, undefined)).toBe(2048)
  expect(resolveLimitMb(2048, '1024')).toBe(1024) // env wins
})

test('AN EMPTY ENV VAR IS UNSET, NOT ZERO — the ceiling must not become 0', () => {
  // `??` let '' through to Number('') === 0, making the ceiling ZERO: `rss >= 0` is
  // true on the first sample, so the dev server killed itself on every rebuild.
  // `DEV_MEMORY_LIMIT_MB=` is an utterly ordinary shell accident.
  expect(resolveLimitMb(undefined, '')).toBe(4096)
  expect(resolveLimitMb(2048, '   ')).toBe(2048)
})

test('a garbage ceiling falls back to the default — never silently OFF', () => {
  // Number('4gb') is NaN, and every `rss >= NaN` is false — so the guard vanished
  // for the one person who was actively trying to configure it.
  expect(resolveLimitMb(undefined, '4gb')).toBe(4096)
  expect(resolveLimitMb(undefined, 'none')).toBe(4096)
})

test('only an explicit non-positive number disables the ceiling', () => {
  expect(resolveLimitMb(undefined, '0')).toBe(0)
  expect(resolveLimitMb(0, undefined)).toBe(0)
})

// ── source endpoints are loopback-only ───────────────────────────────────────
//
// The dev server binds every interface on purpose (the mkcert cert covers
// <host>.local so you can open the site on a phone). But an unauthenticated
// POST /__docstore/source from the LAN is remote code execution: it writes a repo
// file, the watcher rebuilds, and the build runs it. Reading is bad too — it serves
// any file in the repo. So those endpoints check the PEER address.

test('isLoopbackAddress accepts this machine', () => {
  for (const a of [
    '127.0.0.1',
    '127.1.2.3',
    '::1',
    '[::1]',
    'localhost',
    '::ffff:127.0.0.1',
  ]) {
    expect(isLoopbackAddress(a)).toBe(true)
  }
})

test('isLoopbackAddress rejects everything else', () => {
  for (const a of [
    '192.168.1.50', // the LAN — the case that matters
    '10.0.0.7',
    '172.16.4.2',
    '212.147.248.15', // a public address
    '::ffff:192.168.1.50', // v4-mapped LAN address must NOT sneak through
    '2a04:3540:1000:310::1',
    '',
    undefined,
    null,
  ]) {
    expect(isLoopbackAddress(a as any)).toBe(false)
  }
})

test('isLoopbackAddress is not fooled by a lookalike', () => {
  // Not loopback: 127 must be the FIRST octet.
  expect(isLoopbackAddress('10.127.0.1')).toBe(false)
  expect(isLoopbackAddress('127.0.0.1.evil.com')).toBe(false)
  expect(isLoopbackAddress('1127.0.0.1')).toBe(false)
})

// ── tunnel port resolution (tosijs-ui#39) ────────────────────────────────────
//
// The dev server derived the tunnel listener from PORT+1 while `bin/tunnel.ts` fell back
// to a hard-coded 8788. Those agree ONLY when PORT is 8787 — i.e. only on this repo — so
// every other adopter ran a server on one port and a tunnel probing another. tosijs hit
// it on their first session (PORT 8018 → listener 8019 → bin probed 8788). Both sides now
// call the same function; these pin its behaviour.

import { resolveDevPort, resolveTunnelLocalPort } from './site-config.js'

test('the tunnel port follows the dev port, not a constant', () => {
  // The exact case that broke: a project on its own port, no explicit localPort.
  expect(resolveTunnelLocalPort({ port: 8018 }, {})).toBe(8019)
  expect(resolveTunnelLocalPort({ port: 3000 }, {})).toBe(3001)
  // This repo's own numbers — the coincidence that hid the bug.
  expect(resolveTunnelLocalPort({ port: 8787 }, {})).toBe(8788)
})

test('an explicit localPort always wins', () => {
  expect(
    resolveTunnelLocalPort(
      { port: 8018, preview: { tunnel: { localPort: 9999 } } },
      {}
    )
  ).toBe(9999)
  // …even when PORT would say otherwise.
  expect(
    resolveTunnelLocalPort(
      { port: 8018, preview: { tunnel: { localPort: 9999 } } },
      { PORT: '4000' }
    )
  ).toBe(9999)
})

test('env PORT outranks the config, and both sides see it the same way', () => {
  expect(resolveDevPort({ port: 8018 }, { PORT: '4000' })).toBe(4000)
  expect(resolveTunnelLocalPort({ port: 8018 }, { PORT: '4000' })).toBe(4001)
  expect(resolveDevPort({}, {})).toBe(8787)
})

// ── is a haltija server drivable? ────────────────────────────────────────────

import { haltijaIsDrivable } from './dev-server.js'

const HINT = '\n\x1b[2m\nhj windows : --json | see: tabs-open, tabs-close\x1b[0m'

test('a server with no connected tab is NOT drivable', () => {
  expect(
    haltijaIsDrivable(JSON.stringify({ windows: [], count: 0, ready: false }))
  ).toBe(false)
})

test('a server with a tab is drivable', () => {
  expect(
    haltijaIsDrivable(JSON.stringify({ windows: [{ id: 1 }], ready: true }))
  ).toBe(true)
})

test('REGRESSION: a trailing CLI hint line must not make a dead server look drivable', () => {
  /*
  Bare `hj windows` appends a dim hint to STDOUT after the JSON on any npm-installed CLI.
  The first version of this check parsed bare output and fell through to `return true` on
  a parse error — so the gate was inert everywhere except this machine, whose `hj` is a
  standalone bundle with no hints.json and therefore never emits the hint. The fix passes
  `--json`; this pins the parser against the hinted shape regardless.
  */
  expect(
    haltijaIsDrivable(JSON.stringify({ windows: [], ready: false }) + HINT)
  ).toBe(false)
  expect(haltijaIsDrivable('not json at all')).toBe(false)
  expect(haltijaIsDrivable('')).toBe(false)
})

test('an older CLI with no `ready` falls back to counting windows', () => {
  expect(haltijaIsDrivable(JSON.stringify({ windows: [] }))).toBe(false)
  expect(haltijaIsDrivable(JSON.stringify({ windows: [{ id: 1 }] }))).toBe(true)
})

test('unrecognised JSON is not drivable', () => {
  // A future shape we cannot read is a reason to spawn our own, not to adopt blindly.
  expect(haltijaIsDrivable(JSON.stringify({ something: 'else' }))).toBe(false)
})
