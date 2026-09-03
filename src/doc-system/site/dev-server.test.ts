import { test, expect, describe } from 'bun:test'
import {
  haltijaLoaderSnippet,
  haltijaTunnelLoaderSnippet,
  HALTIJA_BRIDGE_WS,
  HALTIJA_BRIDGE_COMPONENT,
  isLoopbackAddress,
  resolveIdleMs,
  resolveLimitMb,
  nextBuildStep,
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

const HINT =
  '\n\x1b[2m\nhj windows : --json | see: tabs-open, tabs-close\x1b[0m'

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

// ── which haltija do we spawn? ───────────────────────────────────────────────

import { resolveHaltijaChannel } from './dev-server'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir as osTmpdir } from 'os'
import * as nodePath from 'path'

function projectWithHaltija(version?: string): string {
  const dir = mkdtempSync(nodePath.join(osTmpdir(), 'tosi-hj-'))
  if (version) {
    mkdirSync(nodePath.join(dir, 'node_modules', '.bin'), { recursive: true })
    mkdirSync(nodePath.join(dir, 'node_modules', 'haltija'), {
      recursive: true,
    })
    writeFileSync(
      nodePath.join(dir, 'node_modules', '.bin', 'haltija'),
      '#!/bin/sh\n'
    )
    writeFileSync(
      nodePath.join(dir, 'node_modules', 'haltija', 'package.json'),
      JSON.stringify({ name: 'haltija', version })
    )
  }
  return dir
}

test("REGRESSION: the project's OWN haltija wins over our bunx fallback", () => {
  /*
  An adopter bumped `haltija` to ^1.11.2 for a fix, restarted, and still got 1.11.0 —
  because we spawned our own channel via `bunx haltija@^1.6.1` and bunx CACHES the
  resolution, so a range that resolves forward never re-resolves. `hj where` reported the
  spawned server, so the version indicator agreed with them. (tosijs-ui#48)
  */
  const dir = projectWithHaltija('1.11.2')
  const { argv, describe } = resolveHaltijaChannel(dir, {})
  expect(argv[0]).toContain('node_modules/.bin/haltija')
  expect(describe).toContain('1.11.2')
  expect(describe).toContain("this project's dependency")
  rmSync(dir, { recursive: true, force: true })
})

test('with no local haltija we fall back to bunx, and say so', () => {
  const dir = projectWithHaltija()
  const { argv, describe } = resolveHaltijaChannel(dir, {})
  expect(argv[0]).toBe('bunx')
  expect(describe).toContain('bunx')
  rmSync(dir, { recursive: true, force: true })
})

test('HALTIJA_VERSION overrides even a local install, and names itself', () => {
  const dir = projectWithHaltija('1.11.2')
  const { argv, describe } = resolveHaltijaChannel(dir, {
    HALTIJA_VERSION: 'haltija@beta',
  })
  expect(argv).toEqual(['bunx', 'haltija@beta'])
  expect(describe).toContain('HALTIJA_VERSION')
  rmSync(dir, { recursive: true, force: true })
})

test('a local install with an unreadable manifest is still preferred', () => {
  // Prefer the adopter's copy even when we cannot name its version — getting the right
  // binary matters more than labelling it.
  const dir = mkdtempSync(nodePath.join(osTmpdir(), 'tosi-hj-'))
  mkdirSync(nodePath.join(dir, 'node_modules', '.bin'), { recursive: true })
  writeFileSync(
    nodePath.join(dir, 'node_modules', '.bin', 'haltija'),
    '#!/bin/sh\n'
  )
  const { argv, describe } = resolveHaltijaChannel(dir, {})
  expect(argv[0]).toContain('node_modules/.bin/haltija')
  expect(describe).toContain('unknown version')
  rmSync(dir, { recursive: true, force: true })
})

// ── asset compression ────────────────────────────────────────────────────────

import { negotiateEncoding, isCompressible } from './dev-server'

test('brotli is preferred, gzip is the fallback, neither is forced', () => {
  expect(negotiateEncoding('br, gzip, deflate')).toBe('br')
  expect(negotiateEncoding('gzip, deflate')).toBe('gzip')
  expect(negotiateEncoding('deflate')).toBe(null)
  expect(negotiateEncoding(null)).toBe(null)
  expect(negotiateEncoding('')).toBe(null)
})

test('only text-shaped assets are compressed', () => {
  for (const f of [
    '/a.js',
    '/a.css',
    '/a.html',
    '/a.json',
    '/a.svg',
    '/a.map',
    '/a.wasm',
  ])
    expect(isCompressible(f)).toBe(true)
  // Already compressed — re-encoding these only makes them bigger, and wastes the cache.
  for (const f of [
    '/a.png',
    '/a.jpg',
    '/a.woff2',
    '/a.epub',
    '/a.glb',
    '/a.mp4',
  ])
    expect(isCompressible(f)).toBe(false)
})

// ── what the dev server watches (tosijs-ui#49) ───────────────────────────────

import { resolveWatchPaths, isUnderRoot } from './dev-server.js'
import * as nodePath from 'path'

/** How many watched entries resolve to the same directory — `./demo/src` also ends in
 * 'src', so a suffix test counts the wrong things. */
const timesResolvingTo = (watched: string[], target: string, root = '.') =>
  watched.filter(
    (p) => nodePath.resolve(root, p) === nodePath.resolve(root, target)
  ).length

test('REGRESSION: docPaths are watched — a root-level doc is not served-but-stale', () => {
  /*
  The watch list was hardcoded defaults plus an opt-in `watchPaths`, while adopters declare
  their docs in `docPaths`. A root-level doc was therefore served and rendered but never
  watched: edit, save, refresh, stale page, no rebuild, no message. Indistinguishable from
  bunx cache / browser cache / a restored last-good build, which is why it cost the reporter
  several sessions.
  */
  const watched = resolveWatchPaths({ docPaths: ['Migration.md', 'guide'] })
  expect(watched).toContain('Migration.md')
  expect(watched).toContain('guide')
})

test('the built-in defaults survive for projects that declare no docPaths', () => {
  const watched = resolveWatchPaths({})
  expect(watched).toContain('README.md')
  expect(watched).toContain('./src')
})

test('watchPaths remains an additive override', () => {
  const watched = resolveWatchPaths({ watchPaths: ['extra'] })
  expect(watched).toContain('extra')
  expect(watched).toContain('README.md')
})

test('staticDirs are watched, so a replaced asset is not served stale (#110)', () => {
  /*
  `buildSite` COPIES staticDirs into the output on every build, so without a watcher a replaced
  asset is only picked up when something else happens to rebuild. Re-export a GLB over
  `static/model.glb` and the previous copy is served indefinitely — no error, no hint, and both
  files exist so only their contents differ. The workaround people find is touching a source
  file to provoke a rebuild, which is the tool asking to be fixed.

  Same shape as #49, where `docPaths` was the omission.
  */
  const watched = resolveWatchPaths({ staticDirs: ['static', 'assets'] })
  expect(watched).toContain('static')
  expect(watched).toContain('assets')
})

test('a directory named in two roles is watched once', () => {
  // Deduped by resolved path — otherwise one keystroke fires two rebuilds.
  const watched = resolveWatchPaths({
    staticDirs: ['./static'],
    watchPaths: ['static'],
  })
  expect(watched.filter((p) => p.replace('./', '') === 'static').length).toBe(1)
})

test('paths are deduped by RESOLVED path, so one keystroke is one rebuild', () => {
  // `src` and `./src` are the same directory. Watching it twice means two change events
  // and two rebuilds for one save — on a build that already does `rm -rf` on its output.
  const watched = resolveWatchPaths({
    docPaths: ['src', './src'],
    watchPaths: ['./src'],
  })
  expect(timesResolvingTo(watched, 'src')).toBe(1)
})

test('an absolute docPath collapses against its relative form', () => {
  const watched = resolveWatchPaths({ docPaths: ['/proj/src'] }, '/proj')
  expect(timesResolvingTo(watched, '/proj/src', '/proj')).toBe(1)
})

// ── the compression cache key (tosijs-ui#50) ─────────────────────────────────

test('REGRESSION: mtime alone does not distinguish two rapid writes', async () => {
  /*
  The dev server cached compressed bodies under `encoding:path:lastModified`, on the stated
  assumption that "a rebuild invalidates naturally". It does not: `lastModified` is
  MILLISECOND granularity, so a rebuild that rewrote a file inside one millisecond reused the
  previous compressed body until the process restarted.

  What that looked like: served `/docs.json` disagreed with the file on disk, the doc
  browser's route match failed, and live examples silently stopped being inserted — no error
  anywhere. It read as random flakiness across several sessions before being pinned.

  This asserts the PREMISE rather than the fix, because the premise is the part that was
  wrong and the part a future refactor would re-assume.
  */
  const { mkdtempSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')
  const file = join(mkdtempSync(join(tmpdir(), 'mtime-')), 'f.json')

  const stamps: number[] = []
  for (let i = 0; i < 6; i++) {
    await Bun.write(file, `content-${i}`)
    stamps.push(Bun.file(file).lastModified)
  }
  // If this ever starts failing, mtime resolution improved and the ORIGINAL key would be
  // safe — but the fix (size in the key + clearing on rebuild) stays correct either way.
  expect(new Set(stamps).size).toBeLessThan(stamps.length)
})

test('size in the key separates same-millisecond writes of different content', async () => {
  const key = (path: string, mtime: number, size: number) =>
    `br:${path}:${mtime}:${size}`
  // Same path, same millisecond, different content — the case that served staleness.
  expect(key('/docs.json', 1000, 400)).not.toBe(key('/docs.json', 1000, 402))
  // …and identical inputs still hit, or the cache would be pointless.
  expect(key('/docs.json', 1000, 400)).toBe(key('/docs.json', 1000, 400))
})

test('the tunnel loader derives its socket URL from the page origin, not localhost', () => {
  const s = haltijaTunnelLoaderSnippet()
  /*
  The entire point of the tunnel bridge. Over the tunnel `localhost` is the HEADSET, so a
  hardcoded `localhost:8701` — which is what every file in the upstream loader chain contains
  — resolves on the wrong machine. Anything that reintroduces one here silently breaks the
  remote case while still passing on the developer's own laptop, where it happens to work.
  */
  expect(s).not.toContain('localhost')
  expect(s).not.toContain('8701')
  expect(s).toContain('location.origin')
})

test('the tunnel loader upgrades the scheme rather than assuming one', () => {
  const s = haltijaTunnelLoaderSnippet()
  // http -> ws and https -> wss both fall out of replacing the `http` prefix. The tunnel
  // listener is plain HTTP and the public origin is HTTPS, so BOTH occur in practice.
  expect(s).toContain("replace(/^http/,'ws')")
  expect(s).toContain(HALTIJA_BRIDGE_WS)
  expect(s).toContain(HALTIJA_BRIDGE_COMPONENT)
})

test('the tunnel loader does not attach inside an iframe', () => {
  // Same reason as the localhost loader: the doc-test runner executes pages in hidden
  // iframes, and a second widget per frame is both wrong and noisy.
  expect(haltijaTunnelLoaderSnippet()).toContain('self===top')
})

test('the two loaders are different mechanisms and neither leaks into the other', () => {
  const local = haltijaLoaderSnippet(8701)
  const tunnel = haltijaTunnelLoaderSnippet()
  // The localhost loader must keep its hostname gate — it is what makes `haltijaDev: true`
  // safe to leave on. The tunnel loader must NOT carry it, since it exists to run elsewhere.
  expect(local).toContain('location.hostname')
  expect(tunnel).not.toContain('location.hostname')
})

test('#96: a path outside the served root is refused', () => {
  /*
  Defence in depth — there is no live traversal. The reporter checked the classes carefully and
  all of them stay contained today: `/../../../etc/passwd`, percent-encoded and double-encoded
  forms alike. But they stay contained for two reasons the static handler does not own — the
  WHATWG URL parser collapses `../` before `.pathname` is read, and `.pathname` is never the raw
  request line. Both are properties of the CALLER, so a future call with a path from a config
  value, a manifest or a header inherits nothing.
  */
  expect(isUnderRoot('/srv/docs', '/srv/docs/index.html')).toBe(true)
  expect(isUnderRoot('/srv/docs', '/srv/docs')).toBe(true)
  expect(isUnderRoot('/srv/docs', '/srv/docs/a/b/c.png')).toBe(true)

  expect(isUnderRoot('/srv/docs', '/etc/passwd')).toBe(false)
  expect(isUnderRoot('/srv/docs', '/srv/docs/../secrets')).toBe(false)
  expect(isUnderRoot('/srv/docs', '/srv')).toBe(false)
})

test('#96: a sibling with the root as a prefix is not inside it', () => {
  // The reason for `root + sep` rather than a bare startsWith — `/srv/docs-evil` shares the
  // prefix and is a different directory entirely.
  expect(isUnderRoot('/srv/docs', '/srv/docs-evil/x')).toBe(false)
  expect(isUnderRoot('/srv/docs', '/srv/docsomething')).toBe(false)
})

test('#96: relative roots resolve before comparison', () => {
  // The dev server passes a relative directory; comparing unresolved strings would be a
  // guarantee about text rather than about the filesystem.
  expect(isUnderRoot('.', './docs/index.html')).toBe(true)
  expect(isUnderRoot('./docs', './docs/../package.json')).toBe(false)
})

describe('nextBuildStep — the delegated-build queue (the loop that spun forever)', () => {
  /*
  The bug this exists to prevent: the first version called `rebuild()` on EVERY pass. When a
  watch rebuild was already in flight, `rebuild()` only set `pending`, so the next pass failed
  the settled check and re-armed again — an unbounded build storm that ended when the loop
  detector called `process.exit(1)` on the developer's dev server, blaming their watcher config.

  It hid because it is correct when idle (one pass, one build) and only diverges under
  contention — which is the exact case delegation exists for. Zero tests reached it.
  */
  const step = (
    attempt: number,
    building: boolean,
    pending: boolean,
    maxAttempts = 5
  ) => nextBuildStep({ attempt, building, pending, maxAttempts })

  test('starts exactly one build, on the first pass only', () => {
    expect(step(0, false, false)).toBe('start')
    // Idle: the build we started has finished and nothing queued behind it.
    expect(step(1, false, false)).toBe('settled')
  })

  test('CONTENDED: waits instead of re-arming — never "start" after the first pass', () => {
    // A build is running (ours, or a watcher's) with another queued behind it.
    expect(step(1, true, true)).toBe('wait')
    expect(step(2, true, true)).toBe('wait')
    expect(step(3, false, true)).toBe('wait')
    // The regression in one assertion: a second 'start' is what caused the storm.
    for (let attempt = 1; attempt < 5; attempt += 1) {
      expect(step(attempt, true, true)).not.toBe('start')
    }
  })

  test('gives up with a message rather than parking forever', () => {
    // A watcher that keeps firing must degrade to a sentence, not an unbounded wait.
    expect(step(5, true, true)).toBe('gave-up')
    expect(step(9, true, true)).toBe('gave-up')
  })

  test('settles as soon as the queue is empty, whatever the attempt', () => {
    expect(step(4, false, false)).toBe('settled')
    // Settled wins over gave-up: reaching the cap on the very pass that quiesces is a success.
    expect(step(5, false, false)).toBe('settled')
  })
})
