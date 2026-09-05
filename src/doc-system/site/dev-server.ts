/*
Dev server for the static doc-site system.

`devServer(config, { test })` serves the built site over HTTPS with SPA
fallback, rebuilds on source changes, and — in test mode — drives a haltija
headless browser through the inline doc tests and exits with their pass/fail.

Build-time only (Bun APIs). Never import this from browser code.
*/

import * as path from 'path'
import { editableSourcePaths, mayEditSource } from './editable-sources.js'
import { statSync, existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { $, spawn, gzipSync } from 'bun'
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import type { SiteConfig } from './site-config.js'
import { buildSite } from './orchestrator.js'
import { preflight } from './preflight.js'
import { auditDependencies, reportAudit } from './audit-guard.js'
import { openDevBrowser } from './open-browser.js'
import { resolveTunnelLocalPort } from './site-config.js'
import { acquireBuildLock, describeHolder } from './build-lock.js'
import { sinkPathFor, appendToSink } from './debug-sink.js'
import { invitePageHtml } from './invite-page.js'
import {
  TUNNEL_LINK_CMD,
  resolveLinkArrival,
  isLockedDown,
  hasTunnel,
  isLoopbackAddressForAuth as isLoopbackAddress,
  mayReadSite,
  shouldInterceptLinkToken,
  createAuthState,
  issueLink,
  readCookie,
  redeemThroughGate,
  createRedemptionGate,
  resolveLinkSettings,
  sessionCookie,
  urlWithoutToken,
  mayWriteSource,
  isSameOriginRequest,
  validSessionCookie,
  sessionRejection,
  mayDriveWithAgent,
  isProxiedRequest,
  SESSION_COOKIE,
} from './dev-auth.js'

/**
 * Every path the dev server watches for changes.
 *
 * `docPaths` is included because that is where an adopter DECLARES their documentation —
 * omitting it meant a root-level doc (`Migration.md`, say) was served and rendered but never
 * watched: edit, save, refresh, stale page, no rebuild, and no message anywhere. The failure
 * is indistinguishable from the other stale-page causes (bunx cache, browser cache, a
 * restored last-good build), which is what made it cost several sessions to pin (#49).
 *
 * `staticDirs` is included for exactly the same reason, one bug later (#110). `buildSite`
 * COPIES those directories into the output on every build, so a replaced asset is only picked
 * up when something else happens to trigger a rebuild — re-export a GLB over `static/model.glb`
 * and the dev server keeps serving the previous copy indefinitely, with no error and no hint.
 * Both files exist and only their contents differ, which is the hardest version of stale to
 * see. The workaround people find is touching a source file to provoke a rebuild, which is a
 * strong signal the tool should be doing it.
 *
 * The built-in defaults stay for projects that declare no `docPaths`. `watchPaths` remains
 * the additive override. Deduped by RESOLVED path, so `src`, `./src` and an absolute form
 * collapse to one watcher rather than three firing three rebuilds for one keystroke.
 */
/**
 * Is `candidate` inside `root` — the same directory, or below it?
 *
 * Exported so it can be tested directly. The dev server's static handler cannot reach a
 * containment violation over HTTP, because the WHATWG URL parser collapses `../` before
 * `.pathname` is read — which is exactly the problem: the guarantee belongs to the CALLER, so a
 * test that goes through the server proves nothing about this rule (tosijs-ui#96).
 *
 * `root + sep` rather than a bare `startsWith`, or `/srv/docs-evil` counts as inside `/srv/docs`.
 */
export function isUnderRoot(root: string, candidate: string): boolean {
  const base = path.resolve(root)
  const target = path.resolve(candidate)
  return target === base || target.startsWith(base + path.sep)
}

export function resolveWatchPaths(
  config: {
    docPaths?: string[]
    watchPaths?: string[]
    staticDirs?: string[]
  },
  root = '.'
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of [
    'README.md',
    './src',
    './demo/src',
    './icons',
    ...(config.docPaths ?? []),
    ...(config.staticDirs ?? []),
    ...(config.watchPaths ?? []),
  ]) {
    const key = path.resolve(root, p)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

declare global {
  var Bun: any
}

const TEST_RESULTS_FILE = '.browser-tests.json'

const DEFAULT_IDLE_HOURS = 8

/**
 * The haltija the dev server spawns (`bunx <this>`).
 *
 * Pinned to a **range with a floor**, not `@latest`. This is library code: every
 * adopter's dev server runs whatever this string resolves to, so `@latest` means a
 * floating executable fetch — the tool can change under every consumer overnight,
 * with haltija in nobody's lockfile and no version contract. A caret range still
 * picks up fixes without letting a major land unannounced.
 *
 * Override with `HALTIJA_VERSION` (e.g. `HALTIJA_VERSION=haltija@beta` to test a
 * pre-release, or a local path/tarball) — you should not have to edit library code
 * to try a different haltija.
 *
 * Floor is **1.4.0** — the first release whose behavior this integration can rely on:
 *   - `hj` routes to the server owning the current directory, so `hj` inside a project
 *     drives THAT project's browser instead of falling back to a shared port and
 *     silently driving whoever was focused there.
 *   - a haltija server no longer overwrites the machine-wide `hj` binary with an older
 *     copy on startup — so OUR spawning one can't downgrade the CLI for an unrelated,
 *     up-to-date project (the exact "unpinned executable fetch from library code"
 *     hazard this pin exists to bound).
 *   - HTTPS-only servers stopped advertising an HTTP port they weren't listening on.
 *   - `hj` action commands (`navigate`, `click`, …) exit NON-ZERO on failure, so the
 *     test lane below can trust an exit code instead of racing to a timeout.
 */
/*
The FALLBACK channel, used only when the project has no haltija of its own.

`^1.12.6` because that is where the agent-facing fixes people upgrade for currently live;
the floor's practical job is to make bunx re-resolve rather than to express a minimum.

What 1.12.6 specifically buys a lane that spawns Electron — this floor encodes fixes, not a
date, so each of these is the reason it moved off `^1.11.2`:

  - **a `--private` instance finally has a lifetime bound** (haltija#39, filed from here). A
    SIGKILLed session, a slept laptop or a crashed harness leaves teardown un-run, and the
    only previous bound was spawner-pid polling, which cannot help when nothing runs. The
    report was a 12-day-old instance at 5.7 GB and ~150% CPU on a machine at load average
    212 — which is the incident that confounded a timing measurement here and got blamed on
    unrelated local code. It exits after 8h idle and says why; `HALTIJA_IDLE_TIMEOUT_HOURS`
    overrides. This is the single best reason to be on 1.12.6.
  - **LAN and Bonjour access work at all.** `/inject.js` handed the browser URLs built as
    `localhost:<port>`, and `localhost` in a served script means the BROWSER's machine — a
    page opened from a phone was told to connect to itself. The host is now derived from the
    request. Our TLS certs already cover `<hostname>.local` for exactly this.
  - **the widget sends `X-Haltija-Token`**, so a `--token` server and a page that can talk
    back stopped being mutually exclusive — which matters most over a tunnel.
  - **results carry `paintAgeMs`**, so "this tab says visible but is not compositing" is now
    something a caller can DETECT rather than a rule it has to remember. `visibilityState`
    means "is this tab selected", not "is it painting".
  - Electron 40.6.1 → 43.4.1, clearing two context-isolation bypasses (haltija#35). Context
    isolation is haltija's security boundary, and we spawn it.

The floor before `^1.11.2` was `^1.6.1`, and an adopter with `haltija@^1.11.2` in their own
devDependencies still got **1.11.0** — new enough to look current, old enough to lack the
fix they had just upgraded for (tosijs-ui#48).

Two things conspired, and the second is the nasty one:

  - we spawned our own channel and ignored theirs entirely, and
  - **`bunx` caches the resolution**, so a range that resolves forward does not RE-resolve
    once its cache key is populated. `^1.6.1` froze at whatever satisfied it first.

That is the stale-but-satisfying-cache hazard this project filed against haltija (#11) and
then shipped an instance of. A range is not a pin, and a cached range is not even a range.

`resolveHaltijaChannel()` below prefers the project's own installed haltija, so the version
is something an adopter controls with the tool they already use. `HALTIJA_VERSION` still
overrides everything.
*/
/**
 * Seconds `Bun.serve` will wait on a slow transfer before closing it. Bun's default is 10,
 * sized for API responses rather than multi-MB bundles over LAN wifi (#63). Override with
 * `DEV_REQUEST_TIMEOUT_SECONDS`; Bun caps this at 255.
 */
const DEV_IDLE_TIMEOUT_SECONDS = Math.min(
  255,
  Number(process.env.DEV_REQUEST_TIMEOUT_SECONDS) || 120
)

/*
How many settle-waits a delegated build will sit through before giving up.

A watcher that keeps firing (a build writing a file it also watches, a `prebuild` copying into
`staticDirs`) would otherwise keep the caller parked indefinitely. Five is generous — each pass
is a whole build — and failing with a sentence beats hanging.
*/
const MAX_SETTLE_ATTEMPTS = 5

/**
 * What a delegated build should do next, given the queue's state.
 *
 * Extracted and exported because the loop that used to be inline shipped an unbounded rebuild
 * storm — `rebuild()` on every iteration re-queued the very build being waited on — and no test
 * could reach it. This is the whole decision, and it is pure.
 */
export function nextBuildStep(state: {
  attempt: number
  building: boolean
  pending: boolean
  maxAttempts: number
}): 'start' | 'wait' | 'settled' | 'gave-up' {
  // Nothing running and nothing queued: the tree reflects the latest change.
  if (state.attempt > 0 && !state.building && !state.pending) return 'settled'
  // Kick exactly one build, on the first pass only.
  if (state.attempt === 0) return 'start'
  if (state.attempt >= state.maxAttempts) return 'gave-up'
  return 'wait'
}

const HALTIJA_PKG = process.env.HALTIJA_VERSION ?? 'haltija@^1.12.6'

/*
Which haltija do we actually run, and can we say so out loud?

Prefer the one in the project's own node_modules. An adopter who bumps their haltija
devDependency to get a fix expects that to be the haltija they get; anything else makes
the upgrade look like it did nothing — with `hj where` agreeing, since it reports the
SPAWNED server's version and therefore looks authoritative.

Returns the argv prefix plus a human description, because an invisible divergence is the
whole bug: one startup line naming the channel and where it came from turns "the fix
doesn't work" into "oh, it's running a different one".
*/
export function resolveHaltijaChannel(
  cwd = process.cwd(),
  env: Record<string, string | undefined> = process.env
): { argv: string[]; describe: string } {
  // An explicit override always wins, and is worth saying so.
  if (env.HALTIJA_VERSION) {
    return {
      argv: ['bunx', env.HALTIJA_VERSION],
      describe: `${env.HALTIJA_VERSION} (HALTIJA_VERSION)`,
    }
  }
  const local = `${cwd}/node_modules/.bin/haltija`
  if (existsSync(local)) {
    let version = 'unknown version'
    try {
      version =
        JSON.parse(
          readFileSync(`${cwd}/node_modules/haltija/package.json`, 'utf8')
        ).version ?? version
    } catch {
      /* installed but unreadable manifest — still prefer it, just unnamed */
    }
    return { argv: [local], describe: `${version} (this project's dependency)` }
  }
  return { argv: ['bunx', HALTIJA_PKG], describe: `${HALTIJA_PKG} (bunx)` }
}

/**
 * Resolve the idle-exit timeout to milliseconds (0 = disabled).
 *
 * Env wins over config, config over the default. An unparseable value falls back
 * to the default rather than to 0: a typo'd `DEV_IDLE_TIMEOUT_HOURS=8h` must not
 * silently turn the guard OFF — that is the exact failure it exists to prevent.
 * Only an explicit non-positive number disables it.
 */
export function resolveIdleMs(
  configHours: number | undefined,
  envHours: string | undefined
): number {
  const env = envHours?.trim()
  const raw = env ? Number(env) : configHours ?? DEFAULT_IDLE_HOURS
  const hours = Number.isFinite(raw) ? raw : DEFAULT_IDLE_HOURS
  return hours > 0 ? hours * 3600_000 : 0
}

const DEFAULT_LIMIT_MB = 4096

/**
 * Resolve the RSS ceiling in MB (0 = disabled).
 *
 * Same rule as `resolveIdleMs`, and it was NOT being applied: the ceiling was read as
 * `Number(env ?? config ?? 4096)`, which fails in both directions at once —
 *
 *   DEV_MEMORY_LIMIT_MB=''   → `??` passes '' through → Number('') === 0 → the ceiling
 *                              is ZERO, so `rss >= limit` is true on the first sample
 *                              and the dev server kills itself on every rebuild.
 *   DEV_MEMORY_LIMIT_MB=4gb  → NaN → every `>=` comparison is false → the guard is
 *                              silently OFF, on the machine of someone who was
 *                              explicitly trying to configure it.
 *
 * An empty env var is *unset*, not zero. Garbage falls back to the default, never to
 * off. Only an explicit non-positive number disables the ceiling.
 */
export function resolveLimitMb(
  configMb: number | undefined,
  envMb: string | undefined
): number {
  const env = envMb?.trim()
  const raw = env ? Number(env) : configMb ?? DEFAULT_LIMIT_MB
  const mb = Number.isFinite(raw) ? raw : DEFAULT_LIMIT_MB
  return mb > 0 ? mb : 0
}

/**
 * The localhost-gated haltija dev-channel loader injected into served HTML at
 * serve time (never bundled, never in the built output).
 *
 * `self===top` keeps it in the TOP window only. The doc-browser's background test
 * runner loads every page-with-tests in a hidden iframe (`?_testMode=1`), each
 * served this same HTML — without the guard, haltija's `dev.js` gets imported
 * once per test page (N redundant loads in throwaway frames). An agent only ever
 * drives the top page, so nested frames never need the channel.
 */
/**
 * Is this request coming from THIS machine?
 *
 * The dev server binds every interface (`Bun.serve` with no `hostname`), which is
 * deliberate — the mkcert dev cert covers `<host>.local` precisely so you can open the
 * site on a phone or a second laptop. But "anyone on this network may READ the preview"
 * and "anyone on this network may REWRITE my source files" are wildly different
 * propositions, and the source endpoints were getting the first one's treatment.
 *
 * On any shared network — a café, a conference, a hotel — an unauthenticated
 * `POST /__docstore/source` is remote code execution: it writes a file in the repo, the
 * watcher rebuilds, and the build runs what was written. So those endpoints are
 * loopback-only, while the site itself stays reachable from your other devices.
 *
 * IPv4-mapped IPv6 (`::ffff:127.0.0.1`) counts — that is how a v4 client shows up on a
 * dual-stack listener, and missing it would lock out the local machine on some setups.
 *
 * ONE definition, in dev-auth. This existed twice — character for character — with each
 * copy guarding a different authorization door (`/report` + `/__devlink` here, the
 * RCE-class `POST /__docstore/source` there), so a "tidy-up" of either would silently
 * have changed a security boundary while every test stayed green.
 */
export { isLoopbackAddress }

/*
Is a haltija server DRIVABLE, from the CLI's stdout?

Pure, and exported, because the live probe cannot be trusted to represent an adopter: a
standalone `hj` bundle emits clean JSON while an npm-installed one appends a dim hint line
to stdout. Verifying against a local binary proved a fix that was inert everywhere else.
Fixtures can hold both shapes; a machine can only hold its own.

`ready` (haltija >= 1.6.1) is server-up AND a tab connected. Older CLIs lack it, so fall
back to counting windows. Anything unparseable is NOT drivable — failing closed just means
spawning a fresh instance with `-f`.
*/
export function haltijaIsDrivable(stdout: string): boolean {
  try {
    const status = JSON.parse(stdout)
    if (typeof status.ready === 'boolean') return status.ready
    if (Array.isArray(status.windows)) return status.windows.length > 0
    return false
  } catch {
    return false
  }
}

export function haltijaLoaderSnippet(httpsPort: number): string {
  return (
    `<script>self===top&&/^localhost$|^127\\./.test(location.hostname)` +
    `&&import('https://localhost:${httpsPort}/dev.js')</script>`
  )
}

/**
 * The SAME-ORIGIN loader, for a page reached over the tunnel (`haltijaDev: 'tunnel'`).
 *
 * Over the tunnel `localhost` is the HEADSET, so every hardcoded `https://localhost:8701` in
 * the upstream chain points at the wrong machine. This skips that chain entirely rather than
 * asking haltija to change: `dev.js` and `inject.js` exist only to set `__haltija_config__`
 * and load `component.js`, and both carry their own localhost gates. `component.js` has NO
 * such gate — it reads `__haltija_config__.serverUrl` and falls back to localhost only when
 * the config is absent — so setting the config ourselves and loading the component directly
 * is both sufficient and the only part that can work remotely.
 *
 * `serverUrl` is derived from the page's own origin at runtime, not baked in, because the
 * tunnel hostname is not known when this string is built and can differ per request.
 *
 * `self===top` is kept from the localhost loader: an iframe should not attach a second widget,
 * and the doc-test runner executes pages in hidden iframes.
 */
export function haltijaTunnelLoaderSnippet(): string {
  return (
    `<script>self===top&&(function(){` +
    `window.__haltija_config__={serverUrl:location.origin.replace(/^http/,'ws')+'${HALTIJA_BRIDGE_WS}'};` +
    `var s=document.createElement('script');s.src='${HALTIJA_BRIDGE_COMPONENT}';` +
    `document.head.appendChild(s)})()</script>`
  )
}

/** Same-origin paths the tunnel bridge serves. One place, so the loader and the routes agree. */
export const HALTIJA_BRIDGE_PREFIX = '/__haltija/'
export const HALTIJA_BRIDGE_WS = '/__haltija/ws'
export const HALTIJA_BRIDGE_COMPONENT = '/__haltija/component.js'

/**
 * Reclaim the port we are about to bind, from the process LISTENING on it.
 *
 * That sentence is the predicate, and the old code did not implement it. It ran
 * `lsof -ti:${port} | xargs kill -9`, and **`lsof -i:PORT` matches sockets whose
 * LOCAL *or REMOTE* port is PORT** — so it returned every process merely *connected*
 * to that port and SIGKILLed them all. Not theoretical: on this machine
 * `lsof -ti:443` returns GitHub Desktop, Proton Bridge and two `claude` processes,
 * none of which listen on 443. Aimed at our own dev port it would take out the
 * browser reading the page, Playwright's browsers, the haltija Electron — anything
 * with an open connection.
 *
 * We shipped that reasoning in this very file for `pkill -f haltija` ("a test lane
 * that reaches outside the repo and kills the developer's tools presents as 'my tools
 * got weird', never as a red test") and then failed to apply it here.
 *
 * So: listeners only; confirm each pid is actually a JS runtime before signalling
 * (if something else owns our port, that is the user's business — say so, don't shoot
 * it); SIGTERM first and give it a moment; SIGKILL only what refuses to die.
 */
async function killStrayServer(port: number) {
  // Number('') is 0, and `lsof -ti:0` matches sockets with an UNBOUND port — on this
  // machine, system daemons. Never let a bad port become a kill list.
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return

  const pids = await $`lsof -ti:${port} -sTCP:LISTEN`
    .quiet()
    .text()
    .then((out) =>
      out
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(Number)
        .filter((p) => Number.isInteger(p) && p > 0 && p !== process.pid)
    )
    .catch(() => [] as number[]) // nothing listening — the normal case

  for (const pid of pids) {
    const comm = await $`ps -p ${pid} -o comm=`
      .quiet()
      .text()
      .then((s) => s.trim())
      .catch(() => '')
    if (!/\b(bun|node|deno)\b/.test(comm)) {
      console.warn(
        `⚠️  port ${port} is held by pid ${pid} (${
          comm || 'unknown'
        }), which is not a\n` +
          `    dev server — leaving it alone. Free the port, or set PORT to another one.`
      )
      continue
    }
    /*
    "A JS runtime" is not "OUR dev server", and only the second earns a signal (#77).

    The runtime check above passes for any `bun`/`node`/`deno` — a colleague's unrelated
    dev server, a language server, a test runner that happened to bind the port. Killing one
    of those is not a nuisance, it is destroying someone's work with a receipt in OUR log.

    So require the process to be working in THIS project. If the cwd cannot be read (denied,
    or no lsof) we skip rather than guess: refusing to start with a clear message costs a
    developer ten seconds, and shooting the wrong process costs them an afternoon.
    */
    const theirCwd = await $`lsof -a -d cwd -p ${pid} -Fn`
      .quiet()
      .text()
      .then((out) =>
        out
          .split('\n')
          .find((l) => l.startsWith('n'))
          ?.slice(1)
          .trim()
      )
      .catch(() => undefined)
    if (theirCwd !== process.cwd()) {
      console.warn(
        `⚠️  port ${port} is held by pid ${pid} (${comm}) working in\n` +
          `    ${
            theirCwd ?? 'an unreadable directory'
          } — not this project, so leaving it\n` +
          `    alone. Stop it yourself, or set PORT to another one.`
      )
      continue
    }
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      continue // already gone
    }
    // Leave a receipt: reclaiming a port is destructive, so if it ever hits a server
    // the developer actually wanted, the log says exactly which pid/comm on which port.
    console.warn(
      `↻ reclaimed port ${port}: SIGTERM → pid ${pid} (${comm || 'unknown'})`
    )
    // Give it a moment to close the listener, then insist.
    for (let i = 0; i < 20; i++) {
      await Bun.sleep(50)
      try {
        process.kill(pid, 0)
      } catch {
        break // exited
      }
      if (i === 19) {
        try {
          process.kill(pid, 'SIGKILL')
          console.warn(`   pid ${pid} ignored SIGTERM — sent SIGKILL`)
        } catch {
          // gone between the check and the signal — fine
        }
      }
    }
  }
}

/**
 * Reuse-or-spawn a haltija dev-channel server (server-only, no desktop app) on
 * `port` over HTTPS, so the loader injected into the dev pages has something to
 * connect to. Best-effort: if the reachability check fails we still spawn, and
 * if the spawn fails we just log — the injected loader degrades to a no-op, so
 * dev startup is never blocked on haltija.
 */
async function ensureHaltijaChannel(port: number): Promise<void> {
  const base = `https://localhost:${port}`
  const up = await fetch(`${base}/status`, {
    // The 8701 cert is mkcert-signed, but don't let a TLS/availability hiccup
    // in the probe stop us — we only care whether something is answering.
    tls: { rejectUnauthorized: false },
  } as any)
    .then((r) => r.ok)
    .catch(() => false)
  if (up) {
    console.log(`Haltija dev-channel: reusing existing server at ${base}`)
    return
  }
  console.log(
    `Haltija dev-channel: starting server-only channel (HTTP 8700 + HTTPS ${port}) …`
  )
  try {
    // --server = channel server only (no Electron desktop app). --both = HTTP on
    // 8700 AND HTTPS on 8701: the injected loader/widget use HTTPS 8701 (so an
    // HTTPS dev page has no mixed-content), while the `hj` CLI drives over its
    // default HTTP 8700 — one server, both transports, shared state. HTTPS cert
    // is mkcert-trusted. Output quiet so it doesn't drown the dev log.
    const channel = resolveHaltijaChannel()
    // Name the channel: an adopter who upgraded their own haltija and got ours instead
    // sees the divergence here rather than concluding the fix does not work (#48).
    console.log(`haltija channel: ${channel.describe}`)
    spawn([...channel.argv, '--server', '--both'], {
      stdout: 'ignore',
      stderr: 'ignore',
    })
    console.log(
      `Haltija dev-channel ready — drive this page with \`hj\` (e.g. \`hj tree\`). ` +
        `The widget appears when the channel is active (Option+Tab to toggle).`
    )
  } catch (err) {
    console.warn(
      `Haltija dev-channel: could not start (${String(
        err
      )}). The page loader ` +
        `will no-op until you run \`bunx haltija --server --https\` yourself.`
    )
  }
}

// The HTTPS dev server needs a cert in tls/. On a fresh clone/adopter there
// isn't one, so warn with the exact command rather than serving a broken
// server. We don't generate it automatically because it runs `mkcert -install`,
// which prompts for sudo — not something to spring on someone mid-startup.
async function ensureDevCerts() {
  const haveCerts =
    (await Bun.file('./tls/key.pem').exists()) &&
    (await Bun.file('./tls/certificate.pem').exists())
  if (haveCerts) return
  console.error(
    '\nNo dev TLS certificate found in tls/.\n\n' +
      'Generate one (locally-trusted, no browser warnings) with:\n\n' +
      '    bunx tosijs-dev-certs\n\n' +
      'then start the dev server again. Requires mkcert — the command prints\n' +
      'install instructions if it is missing.\n'
  )
  process.exit(1)
}

/*
Compress text-shaped assets on the way out.

The dev server serves REAL DEVICES over the LAN — that is what the mkcert cert covers
`<host>.local` for — and a doc site's bundle can be multiple MB. Everything text-shaped
here compresses to about 30%: this repo's 1.21MB iife goes to 0.39MB gzipped, 0.36MB
brotli; tosijs-3d's 10MB one goes to roughly 3MB. That is the real fix for the LAN stalls
behind #63 — raising `idleTimeout` stopped the connection dying, this stops it needing the
extra time.

Deliberately DEV-SERVER ONLY. Distribution is a host's job — Cloudflare, Firebase and
friends do this better and for free — so the build emits nothing precompressed.

Brotli at quality 5, not 11: measured on the 1.21MB iife, q5 takes 19ms for 0.36MB while
q11 takes **1169ms** for 0.32MB. Sixty times the cost for four percent.
*/
const COMPRESSIBLE = /\.(js|mjs|css|html|json|svg|map|txt|xml|md|wasm)$/i

/*
A BOUNDED cache, because this process lives for days.

Recompressing a 10MB bundle per request would cost more than it saves, so the bytes have
to be kept — but an unbounded cache in a long-lived dev server is precisely the failure
that took this machine down twice, and it is invisible to the JS heap until it is not.
Keyed on path + mtime + SIZE, and emptied outright on every completed rebuild — mtime
alone does NOT invalidate naturally, because its resolution is coarser than a rebuild
(#50). Capped in total bytes with
oldest-out eviction.
*/
const COMPRESS_CACHE_MAX_BYTES = 64 * 1024 * 1024
const compressCache = new Map<string, Uint8Array<ArrayBuffer>>()
let compressCacheBytes = 0

/** Drop everything. Called on every completed rebuild — see the note at its call site. */
function clearCompressCache(): void {
  compressCache.clear()
  compressCacheBytes = 0
}

function cacheCompressed(key: string, bytes: Uint8Array<ArrayBuffer>): void {
  // A single asset bigger than the whole budget is not worth evicting everything for.
  if (bytes.byteLength > COMPRESS_CACHE_MAX_BYTES / 2) return
  while (
    compressCacheBytes + bytes.byteLength > COMPRESS_CACHE_MAX_BYTES &&
    compressCache.size
  ) {
    const oldest = compressCache.keys().next().value as string
    compressCacheBytes -= compressCache.get(oldest)!.byteLength
    compressCache.delete(oldest)
  }
  compressCache.set(key, bytes)
  compressCacheBytes += bytes.byteLength
}

function compressBytes(
  bytes: Uint8Array,
  encoding: 'br' | 'gzip'
): Uint8Array<ArrayBuffer> {
  return encoding === 'br'
    ? (new Uint8Array(
        brotliCompressSync(bytes, {
          params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 },
        })
      ) as Uint8Array<ArrayBuffer>)
    : gzipSync(bytes as Uint8Array<ArrayBuffer>)
}

/** br if the client takes it, else gzip, else nothing. */
export function negotiateEncoding(accept: string | null): 'br' | 'gzip' | null {
  if (!accept) return null
  const a = accept.toLowerCase()
  if (a.includes('br')) return 'br'
  if (a.includes('gzip')) return 'gzip'
  return null
}

/** Is this worth compressing? Already-compressed formats only get bigger. */
export function isCompressible(filePath: string): boolean {
  return COMPRESSIBLE.test(filePath)
}

export async function devServer(
  config: SiteConfig,
  opts: { test?: boolean; build?: () => unknown | Promise<unknown> } = {}
): Promise<void> {
  // PORT env wins over the config, so a test harness can bring up its own instance on
  // its own port instead of adopting (or killing — killStrayServer takes the port)
  // the dev server you already have running.
  // `||`, not `??`: an EMPTY `PORT=` is unset, not "port zero". `??` only catches
  // null/undefined, so `PORT=''` yielded `Number('') === 0` — and port 0 fed
  // killStrayServer, whose `lsof -ti:0` matches sockets with an unbound port (system
  // daemons, on this machine). An env var set to empty is the most ordinary shell
  // accident there is; it must not become a kill list.
  /*
  THE TEST LANE GETS ITS OWN PORT, so it cannot evict an interactive server.

  `--test` used to default to 8787 like everything else, and then `killStrayServer(PORT)`
  below reclaimed that port — by killing whatever was listening, which is routinely the
  `bun start` someone is looking at. Twice in one session that silently took a live tunnel
  offline: the tunnel survives, the dev server behind it does not, and the page just reports
  "offline" with no hint which half died.

  Two dev servers in one tree are already tolerated (see the lock warning above), so the
  only real conflict was the PORT. Playwright solved this the same way with 8799; this is
  8798. An explicit `PORT` or a configured `port` still wins, so nothing is taken away.
  */
  const DEFAULT_PORT = opts.test ? 8798 : 8787
  const PORT = Number(process.env.PORT || config.port || DEFAULT_PORT)

  /*
  Own the output tree for this server's lifetime (#51).

  A standalone `buildSite()` in the same repo while this is watching means two writers on
  one tree: each `rm -rf`s the directory the other is writing into. That silently killed a
  dev server and left `docs/` at 16 entries instead of ~2600, with nothing anywhere saying
  why — the cost was never the crash, it was that "the server is gone" was a forensic
  exercise.

  Held for the whole session rather than per rebuild, because the hazard is the WATCHER: it
  reacts to the other builder's thousands of file events between our own builds. Our own
  rebuilds re-enter it (same pid), so this does not block us.

  Released on exit rather than in a `finally` — this process leaves via `process.exit`,
  which skips them. A lock that outlived its process would still be harmless (the next
  acquirer sees a dead pid and takes it), but leaving debris that LOOKS like a held lock is
  the sort of thing that costs someone an hour.
  */
  const treeLock = acquireBuildLock('.', 'dev-server', { port: PORT })
  if (!treeLock.ok) {
    /*
    WARN, do not exit.

    Exiting here broke two of the four documented release lanes: `bun playwright test` and
    `bun run test-browser` each bring up their OWN dev server, so with one already running
    the second was refused and the lane died — a guard against racing builders killing the
    very lanes it was added to protect.

    A standalone `buildSite()` still REFUSES (see orchestrator), which is the case #51
    actually reported: a one-shot build wiping the tree under a live watcher. Two dev servers
    is the milder shape — each rebuilds its own way and the loser is a stale page, not a
    half-populated site — and it was the status quo before this lock existed, so warning
    restores previous behaviour instead of inventing a new failure.

    Also: `devServer` is a public export. Library code that calls `process.exit` on a
    condition the caller did not ask about is the pattern this file already argues against
    fifteen lines below, for `preflight`.
    */
    console.warn(
      describeHolder(treeLock.holder!) +
        `   Continuing anyway — two dev servers race less destructively than a\n` +
        `   standalone build does, and refusing here would break the test lanes.\n`
    )
  }
  const releaseTreeLock = () => treeLock.release()
  process.on('exit', releaseTreeLock)
  // `process.exit` runs 'exit' handlers, but a bare Ctrl-C does NOT — the default SIGINT
  // action terminates without them, leaving a lock whose owner is gone. Harmless (the next
  // acquirer sees a dead pid) but it looks like a held lock, which costs someone a minute.
  process.on('SIGINT', () => {
    releaseTreeLock()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    releaseTreeLock()
    process.exit(143)
  })
  const PUBLIC = path.resolve('./', config.outputDir ?? 'docs')
  const isSPA = true
  const testMode = !!opts.test

  // Don't add a days-long watch process to a machine that is already drowning — and
  // don't quietly become the fourth stale dev server. `buildSite` preflights too, but a
  // consumer's custom `build` need not go through it, and "on launch" is the moment a
  // human is actually looking at the terminal.
  //
  // THROWS; does not `process.exit`. `devServer` is a public export, and library code
  // killing the host process is not ours to do — the caller catches and decides. (The
  // health tick below is different: by then we own a running server on a dying machine,
  // and stopping it is the entire point of the guard.)
  if (
    !(await preflight({
      label: 'Dev server',
      devLimitMb: config.memoryLimitMb,
      mode: config.preflight,
    }))
  ) {
    throw new Error(
      'dev server: refusing to start — see the machine-health report above. ' +
        'Override with DEV_SKIP_PREFLIGHT=1, or set `preflight: "warn"` in your site config.'
    )
  }

  // Haltija dev-channel — give a coding agent eyes on the running page. Opt-in
  // (config.haltijaDev or HALTIJA_DEV=1), never in test mode. The loader is a
  // localhost-gated runtime import() of the local channel's dev.js, so haltija
  // is never bundled and self-disables off-localhost; it's injected only at
  // serve time (below), so it never lands in the built output.
  //
  // Explicitly OFF under `HALTIJA_DEV=0` and in CI, which both override a config
  // `haltijaDev: true`: the E2E lane starts this server, and there is no agent on
  // the other end of the channel there — spawning it would only download an Electron
  // app into the runner for nobody to look at.
  const HALTIJA_HTTPS_PORT = 8701
  const haltijaOff =
    process.env.HALTIJA_DEV === '0' ||
    process.env.HALTIJA_DEV === 'false' ||
    process.env.CI === 'true'
  const haltijaDev =
    !testMode &&
    !haltijaOff &&
    (config.haltijaDev === true ||
      config.haltijaDev === 'tunnel' ||
      process.env.HALTIJA_DEV === '1' ||
      process.env.HALTIJA_DEV === 'true')
  /*
  Serving the channel over the TUNNEL is a second, narrower opt-in — `haltijaDev: 'tunnel'`,
  never `true` and never the env var. `true` means "an agent may drive the page on THIS
  machine", and the localhost gate is what makes that safe to leave on; turning it into "an
  agent may drive the page wherever it is reachable" on a config upgrade would be the sort of
  silent privilege escalation nobody asks for. The env var is deliberately excluded too: it is
  a convenience toggle, and this is not a convenience.
  */
  const haltijaTunnel = haltijaDev && config.haltijaDev === 'tunnel'

  /*
  The debug sink (#99): telemetry FROM a page that is not on this machine.

  Off unless asked for. It is safe off-loopback in a way the source endpoint is not — it appends
  opaque bytes to a scratch file outside the repo that the build never reads and nothing serves
  back — but an unauthenticated write endpoint on a LAN-reachable server should still be a
  decision somebody made rather than a default they inherited.
  */
  const SINK_PATH = testMode ? null : sinkPathFor(config.debugSink, '.')
  const HALTIJA_SNIPPET = haltijaLoaderSnippet(HALTIJA_HTTPS_PORT)
  const HALTIJA_TUNNEL_SNIPPET = haltijaTunnelLoaderSnippet()

  /*
  What the far end has to tell you. `ok: true` means nothing to report and nothing
  is injected into served pages. A failed rebuild sets it; the next good build
  clears it. Surfaced through the page's existing floating widget — see
  statusSnippet() below and the `__tosiDevStatus` reader in doc-browser.ts.
  */
  /*
  Set once the watch machinery exists, so `/__build` can reach it. The handler is
  declared in an outer scope than `rebuild`, and a build endpoint that only works in
  watch mode is correct: with no watcher there is no server to delegate to.
  */
  let requestBuild:
    | (() => Promise<{ ok: boolean; detail?: string }>)
    | undefined

  let buildStatus: {
    ok: boolean
    label?: string
    detail?: string
    at?: number
  } = { ok: true }

  /*
  Magic-link auth, so a workspace exposed via `tosijs-tunnel` can be edited from
  anywhere. A LINK token rides in a URL and is redeemable until it expires (or once, under
  `linkPolicy: 'single-use'`); it is exchanged for
  a durable SESSION cookie that never appears in a URL. See dev-auth.ts for why that
  asymmetry is the whole design.

  In memory on purpose: a dev server restart invalidating sessions is a feature, not a
  gap — the credential's lifetime should not outlive the process that granted it, and
  re-linking is one command.
  */
  const auth = createAuthState()
  /*
  Guess-rate control for the 7-character link token: one redemption at a time, each taking at
  least 100ms. Ten attempts a second against 32^7 is ~108 years; a person does not notice
  100ms. Global rather than per-IP because every request over the tunnel arrives from
  loopback — see dev-auth.ts.
  */
  const redeemGate = createRedemptionGate()
  const LINK_PARAM = 't'

  /**
   * Print a fresh edit link. Called on demand (SIGUSR2) and by --link.
   *
   * The wording is derived from the POLICY IN FORCE. It used to say "single-use … then it is
   * spent" unconditionally, and kept saying it after the default became a reusable window —
   * a false statement printed at the exact moment someone decides who to share a link with,
   * which is the worst possible place to be wrong about a credential.
   */
  const printLink = (): string => {
    const { policy, ttlMs } = resolveLinkSettings(config.preview?.tunnel)
    const token = issueLink(auth, Date.now(), ttlMs)
    const base = config.preview?.tunnel?.url ?? `https://localhost:${PORT}`
    const url = `${base}/?${LINK_PARAM}=${token}`
    const minutes = Math.round(ttlMs / 60000)
    /*
    The CODE gets its own line, because on the device this feature exists for you are not
    pasting a URL — you are reading eight letters off one screen and typing them into a
    floating keyboard on another. Print what has to be transcribed, on its own, in the
    largest visual unit the terminal has.
    */
    console.log(
      policy === 'single-use'
        ? `\n🔗 Single-use edit link (valid ${minutes} min, and spent once redeemed):\n   ${url}\n\n   code:  ${token}\n`
        : `\n🔗 Edit link — usable on more than one device for ${minutes} min, then it expires:\n   ${url}\n\n   code:  ${token}   (case-insensitive)\n`
    )
    return url
  }
  /*
  `kill -USR2` still works for a human at the terminal, but it is NOT how `--link`
  finds us any more. That used `pgrep -f 'bun bin/dev.ts'`, which never matches the
  documented start command (`bun --watch bin/dev.ts`) — so the release's headline flow
  was unreachable — while it DID match `bun bin/dev.ts --build-only`, whose process
  exits before this handler is registered, so the default SIGUSR2 disposition killed
  in-flight builds. Broadcasting a signal at a guessed pattern was the whole mistake.

  `--link` now asks over HTTP on the loopback listener, which is unambiguous, needs no
  process discovery, and cannot signal a sibling project.
  */
  process.on('SIGUSR2', () => printLink())

  let testReportResolve: ((results: any) => void) | undefined

  // Source read/write for in-browser "edit page source" (config.editableSources).
  // Local dev only — your machine, your files — so the lone guard is correctness:
  // confine paths to the repo root so a stray path can't escape it. No auth/token.
  const PROJECT_ROOT = path.resolve('./')
  const resolveInRepo = (rel: string): string | null => {
    const resolved = path.resolve(PROJECT_ROOT, rel.replace(/^\/+/, ''))
    if (
      resolved !== PROJECT_ROOT &&
      !resolved.startsWith(PROJECT_ROOT + path.sep)
    ) {
      return null
    }
    return resolved
  }

  async function handleReadSource(request: Request): Promise<Response> {
    const rel = new URL(request.url).searchParams.get('file') ?? ''
    const resolved = resolveInRepo(rel)
    if (!resolved) return new Response('path outside repo', { status: 400 })
    const file = Bun.file(resolved)
    if (!(await file.exists()))
      return new Response('not found', { status: 404 })
    return new Response(await file.text(), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  /*
  The set of files the editor may touch, derived from the corpus (tosijs-ui#128).

  Read per request rather than cached: a rebuild rewrites the corpus, writes are
  human-frequency, and a stale allow-list would refuse a page the author is looking at —
  which is the one failure that would make someone turn this off.
  */
  const allowedSources = async (): Promise<Set<string>> => {
    const corpus = await Bun.file(config.docsJson ?? 'demo/docs.json')
      .json()
      .catch(() => null)
    return editableSourcePaths(corpus, PROJECT_ROOT)
  }

  async function handleWriteSource(request: Request): Promise<Response> {
    try {
      const { file, content } = (await request.json()) as {
        file?: string
        content?: string
      }
      const resolved = resolveInRepo(file ?? '')
      /*
      Second gate: root containment is not enough. `resolveInRepo` permits `.git/hooks/*`,
      `bunfig.toml`, `package.json` and `bin/` — every one of which executes on the next
      ordinary command. The editor only ever needs the source of a page (#128).
      */
      if (resolved && !mayEditSource(resolved, await allowedSources())) {
        return new Response(
          JSON.stringify({
            error:
              'not an editable doc source — this endpoint only writes files the doc ' +
              'extractor scraped',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (!resolved || typeof content !== 'string') {
        return new Response(JSON.stringify({ error: 'bad request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      await Bun.write(resolved, content)
      console.log('wrote', resolved)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  await killStrayServer(PORT)

  function resolveUnder(directory: string, reqPath: string): string | null {
    const basePath = path.join(directory, reqPath)
    /*
    ASSERT containment; do not inherit it.

    There is no live traversal here, and the reporter checked the classes carefully
    (tosijs-ui#96): `/../../../etc/passwd`, percent-encoded, and double-encoded forms all stay
    inside the root today. But they stay inside for two reasons this function does not own —
    the WHATWG URL parser collapses `../` before `.pathname` is read, and `.pathname` is never
    the raw request line. Both are properties of the CALLER. A future call with a path from
    anywhere else — a config value, a manifest entry, a header — inherits nothing.

    The asserted version already lived ten lines away in this same file for another purpose,
    which is the argument for making this one match: a rule enforced in one place and assumed
    in another is the shape of a bug that has not happened yet.
    */
    if (!isUnderRoot(directory, basePath)) return null
    const suffixes = ['', '.html', 'index.html']
    for (const suffix of suffixes) {
      try {
        const pathWithSuffix = path.join(basePath, suffix)
        const stat = statSync(pathWithSuffix)
        if (stat && stat.isFile()) {
          return pathWithSuffix
        }
      } catch {
        // not found at this suffix — try the next
      }
    }
    return null
  }

  /*
  Fall back to the last good build while a rebuild is repopulating the tree.

  `buildSite` moves the output dir ASIDE (`mv docs docs.last-good`) and repopulates from
  empty, so for the length of a build every served path is simply absent. Two failures
  follow, both reported as a mysterious LAN-only stall (#63): a request that STARTS in the
  window gets a plain 404 and the page never hydrates, and a request already IN FLIGHT has
  its file vanish underneath it, so the response stops producing data and idles until
  something kills it.

  Measured here: continuous requests across one rebuild returned 2 non-200s, and at the
  moment of each, `docs/iife.js` was absent while `docs.last-good/iife.js` existed.

  Neither earlier fix touches this. Compression shortens the exposure; `idleTimeout` only
  decides how long a stalled request waits before failing — raising it actually made the
  in-flight case wait LONGER for the same failure.

  The fallback is self-scoping: the last-good copy is created by the stash at the start of
  a build and removed on success, so outside a build there is nothing to fall back to and
  no stale content can be served by accident. Serving one-build-old bytes for two seconds
  beats 404ing a page mid-edit.
  */
  function resolveFile(cfg: {
    directory: string
    path: string
  }): string | null {
    return (
      resolveUnder(cfg.directory, cfg.path) ??
      resolveUnder(`${cfg.directory}.last-good`, cfg.path)
    )
  }

  /*
  Serve-time status for the page's floating widget.

  The widget already exists and already means "the far end has something to tell
  you" — it is how browser-test results surface. A failed rebuild is the same kind
  of news, so it uses the same surface rather than inventing a second one.

  Injected as a plain global rather than pushed over a socket: the case that matters
  is "the build broke and I hit refresh", and a refresh re-reads this. (When Phase 2
  of REMOTE-ACCESS-PLAN.md adds a socket, it can update the same global live.)

  Only emitted when there IS something to say, so a healthy dev server injects
  nothing at all.
  */
  function statusSnippet(request?: Request, viaTunnel = false): string {
    if (buildStatus.ok) return ''
    /*
    The LABEL is safe to publish; the DETAIL is not.

    `detail` is up to 2000 characters of build error — in practice absolute paths from
    this machine, and sometimes source excerpts. It was injected into every served page
    with no auth check, so anyone who could load the workspace read it. Anonymous
    visitors get "Build failed" and nothing else; the person holding a session, or
    sitting at the keyboard, gets the text they actually need.
    */
    const trusted =
      !viaTunnel ||
      validSessionCookie(
        auth,
        readCookie(request?.headers.get('cookie'), SESSION_COOKIE),
        Date.now()
      )
    const payload = JSON.stringify({
      ok: false,
      label: buildStatus.label,
      detail: trusted ? buildStatus.detail : undefined,
      at: buildStatus.at,
    })
    return `<script>window.__tosiDevStatus=${payload}</script>`
  }

  // Serve a resolved file, injecting the haltija dev-channel loader and/or a build
  // status into HTML pages. Serve-time only — neither touches the built output on
  /*
  MAY THIS REQUEST ATTACH THE HALTIJA BRIDGE?

  One predicate, used by all three pieces — the injected loader, the component proxy, and the
  socket upgrade — because a gate that covers two of the three is not a gate. `mayDriveWithAgent`
  delegates to `mayWriteSource`, so this is the same rule that decides source writes: driving a
  page with an agent is at least as powerful as writing to it.

  `peer` is only consulted for the direct case; over the tunnel the session is the whole answer,
  because "looks local" is exactly what a reverse tunnel counterfeits.
  */
  function haltijaBridgeAllowed(
    request: Request | undefined,
    srv: any,
    viaTunnel: boolean
  ): boolean {
    // No request, no cookie, no session — and respondFile can legitimately be called without
    // one (the build's own reads). Refusing is the only safe reading of "cannot tell".
    if (!haltijaTunnel || !request) return false
    return mayDriveWithAgent({
      viaTunnel,
      peer: srv?.requestIP?.(request)?.address,
      hasValidSession: validSessionCookie(
        auth,
        readCookie(request.headers.get('cookie'), SESSION_COOKIE),
        Date.now()
      ),
    })
  }

  // disk, and non-HTML assets are streamed untouched.
  /*
  NOTHING the dev server serves may be cached. Ever.

  None of the file paths below sent `Cache-Control`, so browsers applied HEURISTIC caching —
  they are free to invent a freshness lifetime when you decline to state one, and Safari is the
  most willing to. The result is a dev server that rebuilds correctly while the browser keeps
  showing the previous build, which presents as "the fix did not work" and costs whoever is
  looking at it far more than a re-download. It cost exactly that here: a bug was reported
  against code that had already been fixed.

  WHY THIS IS WORSE THAN STALE PROSE, from a second sighting (tosijs-ui#129, on 1.12.0, before
  this landed): live examples are EXECUTABLE, so a stale `docs.json` runs OLD CODE against the
  NEW library. That failure is indistinguishable from a genuine library regression, and it
  survives the reload that would normally rule staleness out. It produced a confident, false
  "the library has a security bug" conclusion: a cached example fence calling a bare
  `enableAgentInterface()` was refused by the current bundle, and the refusal was correct,
  precisely worded, and described a file that no longer existed on disk. Every reading of the
  source contradicted the running page. A stale paragraph is obvious; a stale example that
  throws is a false bug report, and it cost a full working session.

  The intended workflow is EXPLICIT reload rather than hot reload — automatic reloads fire
  mid-thought and cost you your context. That model only works if a reload is authoritative,
  which is precisely what heuristic caching takes away.

  `no-store` rather than `no-cache`: no-cache still stores and revalidates, which needs
  validators we do not emit, and a dev server has nothing to gain from the round trip. The cost
  is re-fetching the bundle on a full page load — a doc site navigates client-side after that,
  and the responses are brotli/gzip compressed anyway.

  Deliberately NOT applied to the built output: `docs/` is a static site for a real host, and
  telling a CDN never to store it would be actively wrong. This is the dev server only.
  */
  const NO_CACHE = {
    'Cache-Control': 'no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  }

  async function respondFile(
    filePath: string,
    request?: Request,
    viaTunnel = false
  ): Promise<Response> {
    /*
    WHICH loader, decided per request rather than once at boot.

    Direct requests get the localhost loader, whose own hostname test makes it inert anywhere
    else. Tunnel requests get the same-origin bridge, and ONLY with a live session — the same
    credential and the same predicate that gate source writes. A tunnel request without one
    gets no loader at all rather than a broken one, so an unauthenticated reader cannot even
    tell the bridge is configured.
    */
    const haltijaExtra = !haltijaDev
      ? ''
      : viaTunnel
      ? haltijaTunnel && haltijaBridgeAllowed(request, undefined, viaTunnel)
        ? HALTIJA_TUNNEL_SNIPPET
        : ''
      : HALTIJA_SNIPPET
    const extras =
      haltijaExtra + (testMode ? '' : statusSnippet(request, viaTunnel))
    const encoding = negotiateEncoding(
      request?.headers.get('accept-encoding') ?? null
    )

    if (extras && filePath.endsWith('.html')) {
      const html = await Bun.file(filePath).text()
      const injected = html.includes('</body>')
        ? html.replace('</body>', `${extras}</body>`)
        : html + extras
      // Injected HTML is built per request, so it is compressed but never cached — the
      // cache key would have to include the injected extras, and HTML is small anyway.
      const body = encoding
        ? compressBytes(new TextEncoder().encode(injected), encoding)
        : injected
      return new Response(body, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...NO_CACHE,
          ...(encoding
            ? { 'Content-Encoding': encoding, Vary: 'Accept-Encoding' }
            : {}),
        },
      })
    }

    if (encoding && isCompressible(filePath)) {
      const file = Bun.file(filePath)
      const key = `${encoding}:${filePath}:${file.lastModified}:${file.size}`
      let bytes = compressCache.get(key)
      if (!bytes) {
        bytes = compressBytes(
          new Uint8Array(await file.arrayBuffer()),
          encoding
        )
        cacheCompressed(key, bytes)
      }
      return new Response(bytes, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          ...NO_CACHE,
          'Content-Encoding': encoding,
          Vary: 'Accept-Encoding',
        },
      })
    }

    // Everything else streams untouched — images, fonts, epubs and glb are already
    // compressed, and re-encoding them only makes them bigger. Still uncacheable: an icon or a
    // font you just changed is no more welcome stale than a script is.
    return new Response(Bun.file(filePath), { headers: { ...NO_CACHE } })
  }

  async function handleTestReport(request: Request): Promise<Response> {
    try {
      const results = await request.json()
      await Bun.write(TEST_RESULTS_FILE, JSON.stringify(results, null, 2))

      if (results.failed > 0) {
        console.error(
          `\n❌ Browser tests: ${results.failed} failed, ${results.passed} passed`
        )
        for (const [pageName, pageResults] of Object.entries(results.pages) as [
          string,
          any
        ][]) {
          if (!pageResults.passed) {
            console.error(`\n  ${pageName}:`)
            for (const test of pageResults.tests) {
              if (!test.passed) {
                console.error(
                  `    ✗ ${test.name}${test.error ? `: ${test.error}` : ''}`
                )
              }
            }
          }
        }
        console.error('')
      } else if (results.passed > 0) {
        console.log(`\n✅ Browser tests: ${results.passed} passed\n`)
      }

      if (testReportResolve && (results.passed > 0 || results.failed > 0)) {
        testReportResolve(results)
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e) {
      console.error('Failed to process test report:', e)
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Idle self-exit.
  //
  // The memory ceiling below bounds how bad one server gets; this bounds how many
  // there are. A dev server is trivially forgotten — and a forgotten one is not
  // inert, it is a days-old process still running the code it loaded at launch,
  // leaking whatever that code leaked (updating the package does nothing for a
  // process that is already running). Three of those, left over from before a leak
  // fix landed, wedged a 32GB machine at ~210GB of demand. An idle server has no
  // value to weigh against that, so it exits and lets you start a current one.
  //
  // Activity is a request served or a rebuild — i.e. someone is actually reading or
  // editing. Off in test mode, which has its own timeout and exits on its own.
  const idleMs = resolveIdleMs(
    config.idleTimeoutHours,
    process.env.DEV_IDLE_TIMEOUT_HOURS
  )
  const verboseLog = process.env.DEV_VERBOSE === '1'
  let lastActivity = Date.now()
  const touch = () => {
    lastActivity = Date.now()
  }

  // Memory watchdog.
  //
  // The build hands work to native code (the bundler, the HTML parser, the SVG
  // rasterizer) which can strand memory the JS heap never sees — so nothing
  // here can GC it away, and `heapUsed` stays flat while RSS climbs. A watch
  // process lives for DAYS across thousands of rebuilds, so a per-rebuild leak
  // compounds until the machine swaps itself to death. That is not
  // hypothetical: a 2-day session reached 136GB RSS and took the machine down
  // (Bun.build's native arena — see orchestrator.ts and oven-sh/bun#34053).
  // Dying loudly beats being the reason a laptop overheats: the dev server is
  // one keystroke to restart, the machine is not.
  //
  // Sampled after every rebuild AND on the periodic health tick below. The tick
  // matters: a rebuild-only check is blind to a process that is already over the
  // ceiling but has stopped rebuilding — which is exactly the shape of a server
  // you have walked away from, i.e. the one that kills the machine.
  const rssMb = () => Math.round(process.memoryUsage().rss / 1e6)
  const limitMb = resolveLimitMb(
    config.memoryLimitMb,
    process.env.DEV_MEMORY_LIMIT_MB
  )
  let baselineMb = 0
  let rebuilds = 0
  let warned = false
  const checkMemory = (fromRebuild = true) => {
    if (limitMb <= 0) return // explicitly disabled
    const mb = rssMb()
    if (fromRebuild) {
      rebuilds += 1
      if (!baselineMb) baselineMb = mb
    }
    if (!baselineMb) baselineMb = mb
    const growth = mb - baselineMb
    const each = rebuilds > 1 ? growth / (rebuilds - 1) : 0
    if (mb >= limitMb) {
      // Distinguish the two ways to get here, because the advice is opposite:
      // memory that GREW across rebuilds is a leak (report it); a build that was
      // simply born bigger than the ceiling just needs a bigger ceiling.
      const leaking = rebuilds > 1 && each >= 1
      const diagnosis = leaking
        ? `   ${rebuilds} rebuilds, +${growth}MB since the first ` +
          `(~${each.toFixed(1)}MB per rebuild).\n\n` +
          `   Growth per rebuild should be ~0, so this is a leak, not your project\n` +
          `   getting bigger. Restarting reclaims it — please report the numbers\n` +
          `   above. If this build genuinely needs the headroom, raise the ceiling\n` +
          `   with DEV_MEMORY_LIMIT_MB=<mb> or memoryLimitMb in your site config.\n`
        : `   ${rebuilds} rebuild${rebuilds === 1 ? '' : 's'}, ` +
          `+${growth}MB since the first — i.e. it is not growing.\n\n` +
          `   This build's baseline footprint is simply above the ceiling, which is\n` +
          `   not a leak. Raise it with DEV_MEMORY_LIMIT_MB=<mb> or memoryLimitMb in\n` +
          `   your site config.\n`
      console.error(
        `\n🛑 dev server stopping: ${mb}MB RSS, over the ${limitMb}MB limit.\n\n` +
          diagnosis
      )
      process.exit(1)
    }
    if (!warned && mb > limitMb * 0.6) {
      warned = true
      console.warn(
        `⚠️  dev server at ${mb}MB RSS after ${rebuilds} rebuilds (+${growth}MB, ` +
          `~${each.toFixed(
            1
          )}MB each; limit ${limitMb}MB). Growth per rebuild ` +
          `should be ~0 — if this keeps climbing, restart and report it.`
      )
    }
  }

  /*
  Serve WITHOUT watching (`DEV_NO_WATCH=1`).

  An automated suite wants a server, not a rebuilder. Playwright's `webServer` ran
  `bun start`, so a watcher sat live for the whole run and `rm -rf docs/` +
  regenerate could land underneath a test that was mid-navigation — the lane
  flaked against its own build system, which reads as a product bug and is the
  worst kind of red. `testMode` already implied this, but that flag also means
  "drive haltija", so it could not be reused. Pair this with dropping `--watch`
  from the command to silence bun's own watcher too.
  */
  const noWatch =
    process.env.DEV_NO_WATCH === '1' || process.env.DEV_NO_WATCH === 'true'
  if (noWatch) console.log('Watching disabled (DEV_NO_WATCH) — serving only.')

  if (!testMode && !noWatch) {
    // Rebuild on any source change. By default that's just buildSite(), but a
    // consumer whose full build has steps BEYOND buildSite — e.g. a custom IIFE
    // bundle built separately (because it needs a Bun plugin buildSite can't
    // take) — MUST pass opts.build with their whole pipeline. buildSite() starts
    // with `rm -rf <outputDir>`, so any artifact those extra steps produced
    // (iife.js, etc.) is deleted on the first rebuild and, without opts.build,
    // never regenerated — leaving the page's /iife.js to 404 into the SPA
    // fallback (it "loads as html"). Serialize builds and coalesce bursts.
    // Watch rebuilds skip the dependency audit: it hits the registry over the
    // network, and re-running it on every hot-reload save would add latency to the
    // edit loop and break offline dev. The audit ran once at launch (below).
    const runBuild =
      opts.build ?? (() => buildSite(config, { skipAudit: true }))

    /*
    The last-good stash/restore now lives in `buildSite` (orchestrator.ts), next to the
    `rm -rf` that makes it necessary — so `bun run build`, CI, adopters and this
    server's own INITIAL build are protected too, not just watch rebuilds. This wrapper
    only records status for the page widget.
    */
    const runBuildReporting = async (): Promise<void> => {
      try {
        const result = await runBuild()
        if (result === false) throw new Error('build reported failure')
        /*
        Drop every compressed body a rebuild may have invalidated.

        The cache was keyed on `path + lastModified`, and `lastModified` is MILLISECOND
        granularity — six rapid writes to one file report the same value (measured). So a
        rebuild that rewrote a file inside one millisecond kept serving the FIRST compressed
        body until the process restarted: served `/docs.json` disagreed with the file on
        disk, the doc browser's route match failed, and live examples silently stopped
        appearing with no error anywhere. It presented as random flakiness across several
        sessions (#50).

        A completed rebuild is a definite signal and clearing is O(1) — far better than
        guessing from timestamps. The key also carries `size` now, for anything that writes
        outside a rebuild.
        */
        clearCompressCache()
        if (!buildStatus.ok)
          console.log('✅ build recovered — serving fresh output')
        buildStatus = { ok: true, at: Date.now() }
      } catch (error) {
        buildStatus = {
          ok: false,
          label: 'Build failed',
          detail: String(error instanceof Error ? error.message : error).slice(
            0,
            2000
          ),
          at: Date.now(),
        }
        throw error
      }
    }

    // Rebuild-storm detector.
    //
    // The other way this process eats the machine is not a leak but a LOOP: if the
    // build writes a file that the watcher watches, every rebuild triggers the next
    // one, forever. Each iteration spawns children (bundler, css, ePub), pegs the
    // CPU, and adds the per-rebuild residual — so a loop is a leak with a throttle
    // removed. The known self-writes (`version.ts`, `icon-data.ts`) are in `ignored`
    // below, but `config.prebuild` is arbitrary consumer code: anything it writes
    // into a watched path loops, and the failure looks like "my fan is on" rather
    // than like a bug.
    //
    // RATE is the wrong signal, and it is worth saying why, because it is the obvious
    // thing to reach for and it does not work: this project's build takes ~3s, so a
    // real loop can only manage ~19 rebuilds a minute — under any "20 a minute" limit
    // you would think to set. Meanwhile a 200ms build loops at 300 a minute. No single
    // rate threshold is both blind to human editing and sensitive to a slow-build loop.
    //
    // The signal that actually separates them is that a loop is SELF-SUSTAINING: the
    // next rebuild is always already queued the instant the current one ends. There is
    // never a human-scale pause, because no human is involved. So count *consecutive
    // immediate* rebuilds, and let any ordinary gap — someone pausing to think, even
    // for two seconds — reset the count.
    const IMMEDIATE_MS = 1500
    const LOOP_STREAK = 30 // fatal: 30 rebuilds with no human-scale gap between any
    const LOOP_WARN = 15
    let lastBuildEnd = 0
    let streak = 0
    let stormWarned = false
    const triggers = new Map<string, number>()
    const topTriggers = () =>
      [...triggers.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([p, n]) => `   ${String(n).padStart(4)}x  ${p}`)
        .join('\n')

    let building = false
    let pending = false
    /*
    Let an out-of-process build ASK this server to build, instead of being refused.

    The build lock exists because two builders `rm -rf` the same output tree, so
    `bun run build` refuses while a dev server is up — and the workflow that fell out of
    that was "kill the server, build, forget to restart it". The server is already the
    thing that builds this tree; having it do one more build is strictly safer than a
    second process racing it, and it is what the caller wanted anyway.

    Waiters resolve when the CURRENT build finishes. If a watch rebuild is already in
    flight, the request joins it rather than queueing another.
    */
    const buildWaiters: Array<() => void> = []
    const buildNow = async (): Promise<{ ok: boolean; detail?: string }> => {
      /*
      Resolve only when the tree is SETTLED — nothing building and nothing queued.

      The first version pushed a waiter and released it from whichever build's `finally` ran
      next. If a watch rebuild was already in flight, `rebuild()` merely set `pending`, the
      RUNNING build released the waiter, and the queued one then started `mv docs
      docs.last-good` one line later — so `bun run build` printed success and exited while
      the output tree was being wiped, immediately before the documented `git add`. It got
      both halves wrong at once: it paid for the extra build and answered from the earlier
      one.

      Waiting for quiescence is what the caller actually asked: "the tree reflects the latest
      change." The loop re-arms because a watcher event during our build queues another.
      */
      for (let attempt = 0; ; attempt += 1) {
        const step = nextBuildStep({
          attempt,
          building,
          pending,
          maxAttempts: MAX_SETTLE_ATTEMPTS,
        })
        if (step === 'settled') break
        if (step === 'gave-up') {
          return {
            ok: false,
            detail:
              'the tree never settled — something is rewriting watched files faster than it can build',
          }
        }
        const done = new Promise<void>((resolve) => buildWaiters.push(resolve))
        // START ONCE. Re-arming on every pass is what made this spin: `rebuild()` sets
        // `pending` when a build is in flight, which guarantees the next pass fails the
        // settled check, which re-armed again — an unbounded build storm ending only at the
        // loop detector's process.exit(1). After the first, we just park and wait.
        if (step === 'start') void rebuild()
        await done
      }
      return { ok: buildStatus.ok, detail: buildStatus.detail }
    }
    requestBuild = buildNow

    const rebuild = async () => {
      if (building) {
        pending = true
        return
      }
      building = true
      // "Immediate" covers both shapes a loop takes: for a SLOW build the self-write
      // lands mid-build and `pending` is already set when it ends (so the next rebuild
      // starts at once); for a FAST build the watcher event arrives just after the end.
      // Both look like: started again with no gap.
      const immediate =
        lastBuildEnd > 0 && Date.now() - lastBuildEnd < IMMEDIATE_MS
      try {
        await runBuildReporting()
      } catch (error) {
        console.error('rebuild failed:', error)
      } finally {
        building = false
        lastBuildEnd = Date.now()
        // Release anyone waiting on /__build. Splice so a later build gets a fresh set.
        buildWaiters.splice(0).forEach((resolve) => resolve())
        streak = immediate ? streak + 1 : 0
        touch()
        checkMemory()

        if (streak >= LOOP_STREAK) {
          console.error(
            `\n🛑 dev server stopping: rebuild loop — ${streak} rebuilds back to back, ` +
              `with no pause between any of them.\n\n` +
              `   The files that keep triggering it:\n\n${topTriggers()}\n\n` +
              `   A build that writes a file it also watches rebuilds forever, spawning a\n` +
              `   bundler every time until the machine gives up — a loop is a leak with the\n` +
              `   throttle removed. If a file above is generated by your build, stop writing\n` +
              `   it into a watched path, or add it to the watcher's ignore list (\`ignored\`\n` +
              `   in dev-server.ts; see the \`prebuild\` notes in the doc-site-system docs).\n`
          )
          process.exit(1)
        }
        if (streak >= LOOP_WARN && !stormWarned) {
          stormWarned = true
          console.warn(
            `⚠️  ${streak} rebuilds back to back with no pause — this looks like a rebuild\n` +
              `    loop (a build writing a file it also watches). Top triggers:\n${topTriggers()}`
          )
        }

        if (pending) {
          pending = false
          void rebuild()
        }
      }
    }
    // Ignore the files the build itself writes, or the watch would loop.
    const ignored = (p: string) =>
      /node_modules|(^|[/\\])(version|icon-data)\.ts$/.test(p)
    const watchPaths = resolveWatchPaths(config)
    /*
    Lazy — a BUILD must not pull in a file watcher.

    This was a top-level `import { watch } from 'chokidar'`, and dev-server.js is part of
    the shipped `tosijs-ui/site` pipeline that a consumer's `bin/site.ts` loads even in
    `--build` mode. chokidar was declared only in devDependencies, so every adopter hit
    `Cannot find package 'chokidar'` on a plain build and had to add it themselves
    (tosijs-ui#32). Importing it here means the build path never touches it, and it is now
    an OPTIONAL peer with a clear message rather than a hard runtime dependency inflicted
    on everyone who only wanted to build a site.
    */
    let watch: typeof import('chokidar').watch
    try {
      ;({ watch } = await import('chokidar'))
    } catch {
      console.error(
        `\n🛑 The dev server watches for changes with \`chokidar\`, which is not installed.\n\n` +
          `   bun add -d chokidar\n\n` +
          `   It is an OPTIONAL peer: only the watching dev server needs it, so\n` +
          `   \`bun run build\` and DEV_NO_WATCH=1 work without it.\n`
      )
      process.exit(1)
    }

    watch(watchPaths, { ignored, ignoreInitial: true }).on(
      'all',
      (_event: string, changedPath: string) => {
        if (changedPath) {
          triggers.set(changedPath, (triggers.get(changedPath) ?? 0) + 1)
        }
        void rebuild()
      }
    )
  }

  /*
  ── dependency audit (NON-BLOCKING — the port comes up first) ─────────────────

  This used to run synchronously before binding, on the argument that "the audit is
  sub-second … a gate you wait for cannot be raced."

  The premise was false, and measuring it is the whole story. `bun audit` against the live
  registry measured **79.5 seconds**; the guard's own `AUDIT_TIMEOUT_MS` capped that at
  **20.1s**, then gave up and failed OPEN. So the twenty-second stall on every `bun start`
  bought exactly nothing on that run — it was the cost of a check that did not happen. It
  was 20 of the 23 seconds a full build took, against a startup budget of ~5s.

  The race the old comment worried about is real but small, and it is bounded by reporting
  rather than by waiting: the audit result cannot retroactively un-serve a page, so the
  honest thing is to let the server come up and say something loud when the answer lands.

  What is deliberately NOT quieter: the finding itself. `reportAudit` stays exactly as loud
  as it was, and an advisory arriving late is prefixed so it cannot be mistaken for part of
  the startup banner it now comes after. Non-blocking must not mean easy to miss.

  RELEASE BUILDS STILL BLOCK. `buildSite` audits synchronously (and `--test` gates there
  too), which is where waiting is the right trade: nobody is watching a release build with
  a five-second budget, and a gate that ships is worth twenty seconds.
  */
  if (!testMode) {
    void auditDependencies(config.audit)
      .then((audit) => {
        if (audit.mode === 'off') return
        if (!audit.ok) {
          console.warn(
            `\n🚨 DEPENDENCY ADVISORY — reported after startup, so it is easy to miss.\n` +
              `   The server is already running; this does not stop it.`
          )
        }
        reportAudit(audit, 'Dev server')
        if (!audit.ok && audit.mode === 'fail') {
          console.warn(
            `   This would have REFUSED to start a release build. Fix it, gate it with a\n` +
              `   reason + expiry in \`audit.allow\`, or set \`audit: { mode: 'warn' }\`.\n`
          )
        }
      })
      .catch(() => {
        // Never let a diagnostic take down a running server.
      })
  }

  await ensureDevCerts()

  /*
  ONE handler, TWO listeners.

  `viaTunnel` says which socket the request arrived on, and that is the whole point: a
  client cannot forge which port it connected to, whereas it can forge (or a proxy can
  omit) any header. The previous design inferred "local" from the ABSENCE of
  X-Forwarded-*, which fails OPEN for every forwarder that doesn't set it.
  */
  /*
  ONE CSRF gate for every state-changing endpoint (#90, MAJ-3).

  The first fix spliced `isSameOriginRequest(request)` into two call sites by hand and missed
  `POST /report` entirely — and the next endpoint added would inherit nothing, because there
  was nothing to inherit. A named predicate is the thing a new handler can be pointed at.

  Non-tunnel only: the tunnel path is legitimately cross-site (a page on :3000 calling :8700)
  and is gated by a session cookie instead.
  */
  const csrfOk = (request: Request, viaTunnel: boolean): boolean =>
    viaTunnel || isSameOriginRequest(request)

  const handleRequest = async (
    request: Request,
    srv:
      | {
          requestIP?: (r: Request) => { address?: string } | null
          /*
          Present on a real `Bun.Server`, absent in the unit tests that call this directly.
          Typed optional for that reason rather than cast at the call site — the WebSocket
          route has to cope with its absence anyway, and a cast would hide that.
          */
          upgrade?: (r: Request, opts?: { data?: unknown }) => boolean
        }
      | undefined,
    viaTunnel: boolean
  ): Promise<Response> => {
    /*
    A REQUEST is activity. This was lost in the two-listener refactor, leaving the only
    touch() in the rebuild `finally` — so the 8h idle-exit measured time since the last
    BUILD. Someone reading the tunnelled workspace all day got the server killed under
    them, with a message ("no requests, no rebuilds") that was flatly untrue.
    */
    /*
    THE LIVENESS PROBE, answered before anything else and WITHOUT touching activity.

    A self-check that counted as activity would hold the idle timer open forever, so the very
    guard meant to bound a server's life would be what makes it immortal. It also exits early so
    a probe can never be affected by auth, routing or the SPA fallback — the question is only
    "is this listener answering", and any additional machinery in the answer is a way for the
    answer to be wrong.
    */
    if (new URL(request.url).pathname === '/__alive') {
      return new Response(null, { status: 204, headers: { ...NO_CACHE } })
    }

    touch()
    /*
      TWO POSTURES, because projects differ.

      DEFAULT — read open, write gated. Without a session the site RENDERS: read the
      docs, click around, run live examples. You just cannot change anything. This is
      usually what you want, for two reasons: the read-only view is the thing you most
      often hand someone, and an expired link degrades to a readable page rather than a
      wall — which matters when you already hold a session and open a second window or
      a second device.

      `tunnel.requireToken: true` — locked. No session, nothing at all, including the
      page. For work that must not be readable by whoever finds the hostname.

      Either way WRITES always need a session (see /__docstore/source below). The
      option only moves where READING sits.
      */

    /*
      Magic-link exchange. A `?t=` on ANY path is spent immediately for a session
      cookie, then we 302 to the same URL with the token stripped.

      Redirecting is not cosmetic: it is what stops the token existing in the address
      bar, in history, and in the Referer of anything the page subsequently loads.
      `Referrer-Policy: no-referrer` covers the one request that DID carry it.

      An invalid or already-spent token is not an error — it just falls through
      unauthenticated, so a stale link behaves like no link rather than leaking whether
      that token was ever real.
      */
    const reqUrl = new URL(request.url)
    /*
    Only intercept `?t=` when a tunnel is configured, and only on GET.

    `t` is the classic cache-buster name. Ungated, ANY adopter's dev server answered
    `GET /?t=12345` with "That invite link has been used" instead of the page, and 401'd
    POSTs carrying a `t` param. This gate was claimed in the rc.1 CHANGELOG and in commit
    52286147 — which never touched this file. Two published releases asserted a fix that
    did not exist.
    */
    const linkToken = shouldInterceptLinkToken({
      tunnelConfigured: hasTunnel(config),
      method: request.method,
    })
      ? reqUrl.searchParams.get(LINK_PARAM)
      : null

    /*
      PROXIED REQUESTS NEED A SESSION FOR EVERYTHING, not just for writing.

      The workspace mirrors dev, so it carries unreleased work — viewing it is as
      private as editing it. Gating only the write endpoint would have left the whole
      site readable to anyone who found the hostname.

      This is also what removes the basic-auth dialog. Putting basicauth in front
      defeated the point of a magic link: you clicked the link and the browser asked
      for a password anyway. One credential, one prompt-free click.

      Redemption itself must stay reachable without a session — it is how you GET one.
      Direct (unproxied) requests are unaffected: at this keyboard, the site is just
      the dev server it has always been.
      */
    /*
    Key on the LISTENER first, exactly like every other gate in this file.

    This read gate was left on `X-Forwarded-*` when the WRITE path was moved off
    headers — so the two halves of the same door used different signals. Any forwarder
    that omits those headers (`ssh -R` with GatewayPorts yes, ngrok tcp, socat, iptables
    DNAT, nginx proxy_pass, HAProxy without `option forwardfor` — the list dev-auth.ts
    enumerates as the reason writes moved) arrived with viaProxy === false and read the
    entire uncommitted working tree, while `requireToken` promises "nothing at all, not
    even the page". Invisible in testing because the blessed path is Caddy, which sets
    XFF by default.

    `viaTunnel` cannot be forged by a client; the header check stays only as a
    belt-and-braces OR for a proxy in front of the MAIN listener.
    */
    /*
    Defaults to TRUE **when a tunnel is configured** — and only then.

    Reading `requireToken !== false` off an absent `preview.tunnel` armed the lock on
    servers that have no tunnel at all. The read gate then denied every proxied request
    without a session, while `shouldInterceptLinkToken` (correctly gated on the tunnel
    block) refused to read `?t=` — so the invite link could never be redeemed, and the
    401's own advice was unrunnable. Two gates, two different predicates for the same
    question. One predicate now.
    */
    const lockedDown = isLockedDown(config)
    {
      const cookie = readCookie(request.headers.get('cookie'), SESSION_COOKIE)
      if (
        !mayReadSite({
          lockedDown,
          viaTunnel,
          proxied: isProxiedRequest(request.headers),
          hasLinkToken: Boolean(linkToken),
          hasValidSession: validSessionCookie(auth, cookie, Date.now()),
        })
      ) {
        /*
        SAY WHICH of the two happened.

        Sessions live in memory and die with the process, deliberately: a credential should not
        outlive the thing that granted it, and nothing about a session is ever written to disk.
        What was wrong is that a cookie from a previous run and a cookie we have never seen
        produced the identical screen — so a reader whose server had restarted was told "invite
        links expire" and reasonably concluded their COOKIE was expiring, which was the one
        explanation the evidence ruled out (#114). They are still refused identically; only the
        sentence differs, and that sentence was the entire report.
        */
        const rejection = sessionRejection(
          readCookie(request.headers.get('cookie'), SESSION_COOKIE),
          Date.now()
        )
        return new Response(invitePageHtml(rejection, TUNNEL_LINK_CMD), {
          status: 401,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          },
        })
      }
    }
    if (linkToken) {
      /*
      Through the gate: serialized, and floored at 100ms whether it succeeds or fails.

      Awaiting it here — rather than only on the failure branch — is what stops response time
      answering "was that the right token?" for free.
      */
      /*
      The clock is read on ARRIVAL, not when the work runs.

      `Date.now()` inside the closure meant a token that was valid when the user clicked
      could EXPIRE while queued behind other attempts — the queue silently consuming the
      credential's five-minute life. Capturing it here makes the wait cost latency and
      nothing else.
      */
      const arrivedAt = Date.now()
      const outcome = await redeemThroughGate({
        gate: redeemGate,
        state: auth,
        token: linkToken,
        arrivedAt,
        policy: resolveLinkSettings(config.preview?.tunnel).policy,
      })
      if (outcome.busy) {
        /*
        The queue was full. Answer immediately and cheaply rather than joining it — an
        unbounded queue on an unauthenticated path IS the denial of service, and the one it
        would hit hardest is the developer holding a real link whose 5-minute TTL is ticking
        while they wait behind junk.
        */
        return new Response('Busy — try that link again.', {
          status: 503,
          headers: {
            'Retry-After': '2',
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          },
        })
      }
      const session = outcome.session
      const clean = urlWithoutToken(request.url, LINK_PARAM)
      const headers: Record<string, string> = {
        Location: clean,
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store',
      }
      const heldCookie = readCookie(
        request.headers.get('cookie'),
        SESSION_COOKIE
      )
      const arrival = resolveLinkArrival({
        redeemed: session,
        hasValidSession: validSessionCookie(auth, heldCookie, Date.now()),
      })
      if (arrival === 'issue-session') {
        headers['Set-Cookie'] = sessionCookie(session!)
        console.log('🔓 edit link redeemed — session issued')
        return new Response(null, { status: 302, headers })
      }

      /*
      A VALID SESSION TRUMPS A STALE LINK.

      The comment that used to sit here asserted that a session holder "never lands
      here, their cookie is sent automatically" — and nothing enforced it. The token is
      read before any session check, so anyone already signed in who clicks an older link
      (a second window, a link scrolled back to in chat, a bookmark) got walled with
      "that invite link has been used" while holding a perfectly good session. The stale
      token is simply irrelevant to them.

      Strip it and carry on. No new session is issued: they already have one, and
      re-issuing on a spent token would make expiry meaningless.
      */
      if (arrival === 'already-authenticated') {
        return new Response(null, { status: 302, headers })
      }
      /*
      Genuinely unauthenticated, and the likely culprit is not an attacker but a
      chat-app link-preview bot, whose GET *is* the first use. dev-auth.ts names
      unfurlers as a reason for single-use without handling the consequence: you click
      a dead link, get silently redirected, and the next signal is a save failing.
      */
      const spent =
        `<!doctype html><meta charset=utf-8><title>Link already used</title>` +
        `<style>body{font:16px/1.6 system-ui;margin:15vh auto;max-width:32rem;padding:0 1.5rem;color:#222}` +
        `@media(prefers-color-scheme:dark){body{background:#16171a;color:#e8e8ea}}` +
        `code{background:#8881;padding:.1em .4em;border-radius:4px}</style>` +
        `<h1>That invite link has been used</h1>` +
        `<p>Invite links expire. If you pasted this ` +
        `link into a chat app, its link preview may have spent it before you clicked — ` +
        `which is exactly why they expire.</p>` +
        `<p>Ask for a fresh one: <code>${TUNNEL_LINK_CMD}</code></p>`
      return new Response(spent, {
        status: 401,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      })
    }
    let reqPath = new URL(request.url).pathname
    // Every request, unconditionally, was drowning the warnings this release added.
    // Keep the two kinds that carry information: anything off the tunnel, and anything
    // that is not a plain success (logged at the response, below). DEV_VERBOSE=1 brings
    // back the firehose.
    if (verboseLog || viaTunnel) console.log(request.method, reqPath)

    /*
    Test results are LOCAL-ONLY.

    This sat above the hardened source endpoint and inherited none of its gating: a
    stranger reaching the tunnel could POST arbitrary JSON into `.browser-tests.json`
    and, in `--test` mode, resolve the lane with a fabricated `{passed: N, failed: 0}` —
    a green exit code for a suite that never ran. That is a worse failure than a leak:
    it makes the gate lie. It was LAN-reachable with no tunnel at all, too.

    Same rule as source writes, for the same reason — arriving on the tunnel listener
    means remote, whatever the peer address claims.
    */
    if (request.method === 'POST' && reqPath === '/report') {
      const peer = srv?.requestIP?.(request)?.address
      // Same CSRF gate as the other state-changing endpoints — this one was missed on the
      // first pass, which is the argument for a named predicate over an inline term.
      if (
        viaTunnel ||
        !isLoopbackAddress(peer) ||
        !csrfOk(request, viaTunnel)
      ) {
        console.warn(
          `⚠️  refused POST /report from ${
            peer ?? 'unknown'
          } — test results are local-only.`
        )
        return new Response('not authorized', { status: 403 })
      }
      return handleTestReport(request)
    }

    // Source read/write for in-browser "edit page source" (opt-in, dev only).
    // A write lands in the repo file; the chokidar watcher then rebuilds and
    // the page refreshes — the build itself is the preview.
    /*
    THE HALTIJA TUNNEL BRIDGE — two routes, both gated by `haltijaBridgeAllowed`.

    Over the tunnel, `localhost` is the remote device, so the upstream chain's hardcoded
    `https://localhost:8701` URLs all point at the wrong machine. These re-serve the two things
    the page actually needs from the page's OWN origin: the component, and the socket.

    404 rather than 403 when the bridge is off or unauthorized. A reader with no session should
    not be able to distinguish "this project enabled the bridge" from "this path means nothing
    here" — the paths are guessable and the answer is nobody's business but the session holder's.
    */
    if (reqPath.startsWith(HALTIJA_BRIDGE_PREFIX)) {
      if (!haltijaBridgeAllowed(request, srv, viaTunnel)) {
        return new Response('not found', { status: 404 })
      }

      if (reqPath === HALTIJA_BRIDGE_COMPONENT) {
        /*
        Proxied, not redirected. A redirect would send the DEVICE to `https://localhost:8701`,
        which is the device's own loopback — the exact confusion this bridge exists to remove.
        The fetch happens here, on the machine where that URL means something.
        */
        try {
          const upstream = await fetch(
            `https://localhost:${HALTIJA_HTTPS_PORT}/component.js`,
            { tls: { rejectUnauthorized: false } } as RequestInit
          )
          if (!upstream.ok) {
            return new Response(
              `haltija channel returned ${upstream.status} — is it running?`,
              { status: 502, headers: { 'Content-Type': 'text/plain' } }
            )
          }
          return new Response(await upstream.arrayBuffer(), {
            headers: {
              'Content-Type': 'application/javascript; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          })
        } catch (e) {
          return new Response(
            `haltija channel unreachable on ${HALTIJA_HTTPS_PORT}: ${
              (e as Error).message
            }`,
            { status: 502, headers: { 'Content-Type': 'text/plain' } }
          )
        }
      }

      if (reqPath === HALTIJA_BRIDGE_WS) {
        if (srv?.upgrade?.(request, { data: { kind: 'haltija-bridge' } })) {
          // Upgraded — Bun takes the socket from here; returning a Response would be an error.
          return undefined as unknown as Response
        }
        return new Response('expected a websocket upgrade', { status: 400 })
      }

      return new Response('not found', { status: 404 })
    }

    if (reqPath === '/__debug-sink') {
      /*
      Append-only, and answered before auth deliberately.

      The case is a headset over the tunnel or the LAN, mid-WebXR, where there is no console, no
      devtools, and `requestAnimationFrame` is suspended — every usual way of saying anything is
      gone at once. Requiring a session here would mean the page that most needs to report a
      problem is the one that cannot, and what it can write is a line in a scratch file nobody
      serves back.

      `sendBeacon` sends POST with no way to set headers or read the response, which is what
      makes it survive a page going away — so this takes the body as-is and answers 204.
      */
      if (!SINK_PATH)
        return new Response('debug sink is not enabled', { status: 404 })
      if (request.method !== 'POST') {
        return new Response('POST only', { status: 405 })
      }
      const body = await request.text()
      const result = appendToSink(SINK_PATH, body)
      if (!result.ok) {
        console.warn(`⚠️  ${result.reason}`)
        return new Response(result.reason, { status: result.status })
      }
      return new Response(null, { status: 204, headers: { ...NO_CACHE } })
    }

    if (reqPath === '/__docstore/source') {
      // Handle this endpoint UNCONDITIONALLY so it never falls through to the SPA
      // index.html fallback below. A 200-with-HTML there is silently corrupting:
      // the client loads the PAGE as the "source" (edit-page-source shows HTML;
      // save-to-source reads HTML). When editing isn't enabled, answer with a clean
      // status so `loadSource` falls back to the GitHub raw source (read-only), which
      // is what the deployed static site already does.
      if (!config.editableSources) {
        return new Response(
          'editableSources is not enabled in this doc-site config (set editableSources: true to edit/save source in dev)',
          {
            status: 501,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          }
        )
      }
      /*
        WHO MAY WRITE — decided by mayWriteSource() in dev-auth.ts, which is pure and
        tested. The signal is the LISTENER this arrived on, not a header: tunnel
        traffic lands on a dedicated loopback port and always needs a session, because
        "looks local" is precisely what a tunnel counterfeits.
        */
      const peer = srv?.requestIP?.(request)?.address
      const session = readCookie(request.headers.get('cookie'), SESSION_COOKIE)
      const authorized =
        mayWriteSource({
          viaTunnel,
          peer,
          hasValidSession: validSessionCookie(auth, session, Date.now()),
        }) &&
        /*
        CSRF (#90). The direct path is peer-address-only, so without this any page the
        developer visits can write any file under the repo root — `.git/hooks/*` included.
        Non-tunnel only: the tunnel path is legitimately cross-site and is gated by the
        session cookie instead.
        */
        csrfOk(request, viaTunnel)
      if (!authorized) {
        console.warn(
          `⚠️  refused ${request.method} /__docstore/source from ${
            peer ?? 'unknown'
          } — ` + `no session (use \`${TUNNEL_LINK_CMD}\` for an edit link).`
        )
        return new Response('not authorized to edit source', {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
      if (request.method === 'GET') return handleReadSource(request)
      if (request.method === 'POST') return handleWriteSource(request)
      return new Response('method not allowed', { status: 405 })
    }

    /*
      Mint an invite link. Loopback and NOT via the tunnel: you must already be at this
      keyboard to hand out access. Reachable over the tunnel it would be a privilege
      escalation — a read-only visitor minting themselves a write session.
      */
    /*
      Build on request. Same gate as `/__devlink` — loopback and NOT via the tunnel: a
      remote visitor triggering builds is a denial-of-service at best, and this runs the
      project's own build code at worst.
      */
    if (reqPath === '/__build' && request.method === 'POST') {
      const peer = srv?.requestIP?.(request)?.address
      // Cross-site callers refused too (#90): this triggers a destructive rebuild, so a
      // forged simple request from any page would be a denial of service at best.
      if (
        viaTunnel ||
        !isLoopbackAddress(peer) ||
        !csrfOk(request, viaTunnel)
      ) {
        return new Response('not available', { status: 404 })
      }
      if (requestBuild === undefined) {
        return new Response('no watcher — nothing to delegate to', {
          status: 409,
        })
      }
      /*
      Identify OURSELVES in the reply (#M4/#M6).

      The caller reads a lock file from a shared tmpdir to find us, and this machine already
      carries stale locks from six project roots — one recording the ecosystem-default 8787.
      Without this, `bun run build` in project A could drive a rebuild of project B and report
      success for a tree nothing touched; a planted lock plus any listener answering
      `{"ok":true}` reproduced exactly that, exit 0 with docs/ and dist/ untouched.

      `outputDir` travels for the same reason: `buildSite` is a public export, and a delegated
      build writes the config the SERVER launched with, not the caller's. The caller compares
      and refuses rather than accepting a build of something else.
      */
      const requestedRoot = new URL(request.url).searchParams.get('root')
      if (requestedRoot !== null && requestedRoot !== path.resolve('./')) {
        return new Response(
          JSON.stringify({
            ok: false,
            detail: `this server builds ${path.resolve(
              './'
            )}, not ${requestedRoot}`,
            pid: process.pid,
            root: path.resolve('./'),
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        )
      }
      const result = await requestBuild()
      return new Response(
        JSON.stringify({
          ...result,
          pid: process.pid,
          root: path.resolve('./'),
          outputDir: PUBLIC,
        }),
        {
          status: result.ok ? 200 : 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    if (reqPath === '/__devlink') {
      const peer = srv?.requestIP?.(request)?.address
      if (viaTunnel || !isLoopbackAddress(peer)) {
        return new Response('not available', { status: 404 })
      }
      return new Response(JSON.stringify({ url: printLink() }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      })
    }

    if (reqPath === '/') reqPath = '/index.html'

    const buildFile = resolveFile({ directory: PUBLIC, path: reqPath })
    if (buildFile) return await respondFile(buildFile, request, viaTunnel)

    /*
    The SPA shell answers unknown ROUTES, never unknown ASSETS.

    Falling back for everything meant a missing `waterbump.png` came back `200 text/html`.
    Babylon's `Texture` fetched it, failed to decode a web page as an image, and substituted its
    checkerboard — so a missing asset presented as a styling choice, and was complimented before
    it was diagnosed (tosijs-ui#116). The same fallback made a page that had just been DELETED
    still appear to exist. A 404 shows red in the network panel in seconds; a 200 of the wrong
    type can hide for days.

    The test is the last path segment: a dot in it means a file extension was asked for, and a
    file extension means an asset. `/data-table/` and `/some/route` are routes; `/thing.png` and
    `/app.js` are not. A dot EARLIER in the path is not a signal — `/v1.2/guide` is a route — so
    only the final segment is examined.
    */
    const lastSegment = reqPath.slice(reqPath.lastIndexOf('/') + 1)
    const looksLikeAsset = lastSegment.includes('.')
    if (isSPA && !looksLikeAsset) {
      const spaFile = resolveFile({ directory: PUBLIC, path: '/index.html' })
      if (spaFile) return await respondFile(spaFile, request, viaTunnel)
    }
    if (looksLikeAsset) {
      // Say what was asked for. "File not found" alone sends people to the wrong layer —
      // the reporter spent time on their texture pipeline before suspecting the server.
      return new Response(`No such file: ${reqPath}\n`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NO_CACHE },
      })
    }
    return new Response('File not found', { status: 404 })
  }

  /*
  Not bound to a name: nothing stops these listeners. `process.exit()` ends the process
  and the OS closes the sockets, and calling `.stop()` first is what segfaulted on the
  idle path (#47). A handle we would never legitimately use is an invitation to use it.
  */
  /*
  A generous idleTimeout, because this serves BUNDLES to REAL DEVICES.

  `Bun.serve` defaults to 10s, which is sized for small API responses. A doc site's iife
  can be multiple MB — tosijs-3d ships ~10MB unminified on purpose, so its source stays
  browseable — and over LAN wifi to a phone or a second laptop that legitimately takes
  longer than 10s. Bun then closes the connection mid-transfer and the page half-loads.

  It never reproduces on loopback, so it presents as a mysterious client-side stall; the
  reporter first suspected a bundle-size regression (tosijs-ui#63). Serving real devices
  over the LAN is exactly what the mkcert cert covers `<host>.local` FOR, so the default
  is wrong for this server specifically.
  */
  /*
  THE SOCKET PUMP: page <-> dev server <-> haltija.

  The page dials OUT (that is what makes this work at all — nothing has to reach INTO a headset),
  so the bridge is a plain bidirectional relay between the socket the device opened and a socket
  we open to the local haltija channel. `hj` then talks to that same channel exactly as it does
  for a localhost page; it never learns the page is remote.

  The queue is not optional. The device's socket is open the moment `open()` fires, while the
  upstream connection is still being established, and a widget that says hello immediately would
  otherwise have that first frame dropped — which presents as "it attached but the agent sees
  nothing", the least debuggable possible symptom.

  `rejectUnauthorized: false` is scoped to this one hop: it is loopback, to a cert this machine
  minted, and the alternative is making the bridge fail on any machine whose mkcert CA is not
  installed for Bun specifically. It grants nothing a local process could not already do.
  */
  const haltijaSockets = new WeakMap<
    object,
    { upstream: WebSocket; queue: (string | Uint8Array)[]; ready: boolean }
  >()

  const haltijaWebSocketHandlers = {
    open(ws: any) {
      const upstream = new WebSocket(
        `wss://localhost:${HALTIJA_HTTPS_PORT}/ws/browser`,
        { tls: { rejectUnauthorized: false } } as any
      )
      const state = {
        upstream,
        queue: [] as (string | Uint8Array)[],
        ready: false,
      }
      haltijaSockets.set(ws, state)
      upstream.onopen = () => {
        state.ready = true
        for (const frame of state.queue) upstream.send(frame)
        state.queue.length = 0
      }
      upstream.onmessage = (event: any) => {
        try {
          ws.send(event.data)
        } catch {
          // The device went away mid-frame; close() will tidy up.
        }
      }
      upstream.onclose = () => {
        try {
          ws.close()
        } catch {
          /* already gone */
        }
      }
      upstream.onerror = () => {
        console.warn(
          `⚠️  haltija bridge: could not reach the channel on ${HALTIJA_HTTPS_PORT}. ` +
            `Is haltija running?`
        )
        try {
          ws.close()
        } catch {
          /* already gone */
        }
      }
    },
    message(ws: any, message: string | Uint8Array) {
      const state = haltijaSockets.get(ws)
      if (!state) return
      if (state.ready) state.upstream.send(message)
      else state.queue.push(message)
    },
    close(ws: any) {
      const state = haltijaSockets.get(ws)
      if (!state) return
      haltijaSockets.delete(ws)
      try {
        state.upstream.close()
      } catch {
        /* already gone */
      }
    },
  }

  Bun.serve({
    port: PORT,
    idleTimeout: DEV_IDLE_TIMEOUT_SECONDS,
    tls: {
      key: Bun.file('./tls/key.pem'),
      cert: Bun.file('./tls/certificate.pem'),
    },
    fetch: (request: Request, srv: any) => handleRequest(request, srv, false),
    websocket: haltijaWebSocketHandlers,
  })

  /*
  The TUNNEL listener: plain HTTP, bound to loopback, and the ONLY thing `ssh -R`
  should forward to.

  Separate from the main port on purpose. Arriving here is what marks a request as
  remote — an unforgeable fact, unlike a header — so writes through it always require
  a session even though the peer address is 127.0.0.1.

  Plain HTTP is fine and simpler: the hop is inside the SSH tunnel already, and it
  removes the `tls_insecure_skip_verify` the proxy previously needed to talk to a
  self-signed dev cert. `hostname: '127.0.0.1'` is load-bearing — on 0.0.0.0 this
  would be an unauthenticated plaintext copy of the dev server on the LAN.
  */
  /*
  Default the tunnel listener to PORT + 1, not a constant.

  A fixed `localPort` ignores PORT, so a second dev server on another port still tried
  to bind the SAME tunnel port and died with EADDRINUSE — which is exactly what happened
  to this repo's own Playwright lane (its server runs on 8799, and it collided with the
  8788 held by a `bun start` on 8787). Any adopter running two projects, or a test lane
  beside a dev server, hits it. Deriving it from PORT keeps them disjoint by
  construction; an explicit `tunnel.localPort` still wins for the machine that actually
  tunnels.
  */
  const tunnelPort = config.preview?.tunnel
    ? resolveTunnelLocalPort(config, process.env)
    : undefined
  const configuredTunnelPort = config.preview?.tunnel?.localPort
  if (tunnelPort && !testMode && !process.env.DEV_NO_TUNNEL) {
    try {
      Bun.serve({
        port: tunnelPort,
        // Same reasoning as the main listener — a tunnelled load is slower, not faster.
        idleTimeout: DEV_IDLE_TIMEOUT_SECONDS,
        hostname: '127.0.0.1',
        fetch: (request: Request, srv: any) =>
          handleRequest(request, srv, true),
        websocket: haltijaWebSocketHandlers,
      })
      console.log(
        `Tunnel listener on http://127.0.0.1:${tunnelPort} (loopback only; writes require a session)`
      )
    } catch (e) {
      /*
      A busy tunnel port must not take the dev server down. It is an optional extra —
      you only need it if you are actually tunnelling — and killing the whole server
      over it turns "another instance is running" into "my dev server won't start".
      `tosijs-tunnel` already refuses loudly when nothing is listening, so the failure
      still surfaces at the moment it matters.
      */
      console.warn(
        `⚠️  Could not bind the tunnel listener on 127.0.0.1:${tunnelPort} ` +
          `(${e instanceof Error ? e.message : String(e)}).\n` +
          `   Serving normally; \`tosijs-tunnel\` will not work until this is free` +
          `${configuredTunnelPort ? '' : ' — it defaults to PORT + 1'}.`
      )
    }
  }

  /*
  Exit WITHOUT stopping the listeners first.

  Every one of these six sites called `server.stop()` (and `tunnelServer?.stop()`)
  immediately before `process.exit()`. That buys nothing — `process.exit` terminates the
  process and the OS closes the listening sockets — and it is where the process was
  dying: tosijs-3d reported a reproducible **segfault at ~7.95h** against the 8h idle
  timer, twice, on the shutdown path, with flat 0.34GB RSS (so not the Bun.build native
  leak) and a faulting address that decodes to ASCII text rather than a null — the shape
  of a use-after-free inside Bun's own teardown. tosijs-ui#47.

  A `try/catch` around the stops would NOT help: a segfault is not a JS exception. Not
  making the call is the only fix available to us. Filed upstream separately, because
  Bun should not crash here either.

  Child processes we spawned are a different matter — those we must still reap, since the
  OS will not do it for a detached Electron grandchild. Callers do that before calling in.
  */
  const shutdown = (code: number): never => {
    process.exit(code)
  }

  console.log(`Listening on https://localhost:${PORT}`)
  if (SINK_PATH) {
    console.log(`Debug sink: POST /__debug-sink  ->  tail -f ${SINK_PATH}`)
  }

  // ── open (or bring to front) this project's browser tab ─────────────────────
  //
  // create-react-app's "open the tab" trick: reuse the project's existing tab
  // instead of spawning a new one on every launch/restart. Interactive only, off
  // by default (config.openBrowser), and self-skips in CI / non-TTY. Best-effort,
  // fire-and-forget — never blocks startup, never throws. See open-browser.ts.
  if (!testMode) {
    void openDevBrowser({
      url: `https://localhost:${PORT}/`,
      setting: config.openBrowser,
      name: config.name,
    })
  }

  // ── health tick ───────────────────────────────────────────────────────────
  //
  // Everything else in this file is edge-triggered: the RSS check fires after a
  // rebuild, the preflight fires at launch. Both are blind to the state that
  // actually kills machines — a server nobody is touching any more, sitting on
  // gigabytes, on a box that is quietly filling up around it. Nothing rebuilds,
  // so nothing looks. So look on a timer, not only on an event.
  //
  // Three checks, cheapest first:
  //   1. RSS ceiling — catches a process already over the line that has stopped
  //      rebuilding (the walked-away-from server).
  //   2. Idle exit — bounds how MANY servers exist, not just how big one gets.
  //   3. Machine preflight (every tick) — catches the box going bad around us,
  //      including other projects' runaways. If the machine is dying we exit too, and
  //      print the PIDs and the kill command on the way out. Exiting IS the guard here,
  //      unlike at launch where we throw: by now we own a running server on a dying
  //      machine, and the whole point is to stop being part of the problem.
  if (!testMode) {
    if (idleMs > 0) {
      console.log(
        `Exits after ${
          idleMs / 3600_000
        }h idle (DEV_IDLE_TIMEOUT_HOURS=0 to disable).`
      )
    }
    // Every minute, not every five. The runaway that killed the machine went 0→100GB
    // in about twenty minutes; on a box whose dev budget is a fraction of its RAM
    // (most of it held by a resident model), the trip from healthy to unrecoverable
    // fits comfortably inside a five-minute window — and with swap on a fast, large
    // disk, macOS will thrash for a very long time before it gives up, which is more
    // rope to hang the machine with, not less. A `ps` + `vm_stat` per minute is free.
    const TICK_MS = 60_000
    /*
    A dead listener in a live process is the worst failure this server has had.

    Reported after a ~9.4h run (#91): `pgrep` said running, `curl` got nothing, the last log line
    was a SUCCESSFUL build, and there was no error, signal or exit anywhere. Every diagnostic a
    person would reach for answered "fine". It was found the next day because a human said the
    site was down.

    Worth being precise about the cause, because the report's own diagnosis does not survive the
    evidence: the idle path ANNOUNCES itself ("💤 dev server exiting") before it exits, and no
    such line was logged — so the idle timeout is not what stopped that listener. What did remains
    unknown, and that is exactly why this checks the SYMPTOM rather than any particular cause.

    Two consecutive failures before acting, so one blip during a heavy rebuild cannot evict a
    healthy server. Exits non-zero and says why: a process that cannot serve has no value, and
    the one thing it can still do is stop lying about being alive.
    */
    let missedProbes = 0
    const listenerAnswers = async (): Promise<boolean> => {
      try {
        const res = await fetch(`https://localhost:${PORT}/__alive`, {
          signal: AbortSignal.timeout(5000),
          // The dev cert is ours and this never leaves loopback.
          tls: { rejectUnauthorized: false },
        } as RequestInit)
        return res.status === 204
      } catch {
        return false
      }
    }
    const timer = setInterval(async () => {
      checkMemory(false) // exits if we are over the ceiling

      if (!(await listenerAnswers())) {
        missedProbes += 1
        if (missedProbes >= 2) {
          console.error(
            `\n🛑 dev server exiting: the listener stopped answering on port ${PORT}, ` +
              `but the process is still alive.\n\n` +
              `   Two consecutive loopback probes to /__alive failed. A process that cannot\n` +
              `   serve is worse than one that has exited: \`pgrep\` still says "running", so\n` +
              `   every check you would run answers "fine" while the site is down.\n\n` +
              `   Restart it. If this recurs, please report it with the last ~50 log lines —\n` +
              `   the cause of the original sighting (tosijs-ui#91) was never established.\n`
          )
          clearInterval(timer)
          shutdown(1)
        }
      } else {
        missedProbes = 0
      }

      const idleFor = Date.now() - lastActivity
      if (idleMs > 0 && idleFor >= idleMs) {
        console.log(
          `\n💤 dev server exiting: idle for ${Math.round(
            idleFor / 3600_000
          )}h — no requests, no rebuilds.\n\n` +
            `   Restart it when you need it; a fresh one also picks up any dependency\n` +
            `   updates, which a long-running process never does. Disable with\n` +
            `   DEV_IDLE_TIMEOUT_HOURS=0 or idleTimeoutHours in your site config.\n`
        )
        clearInterval(timer)
        shutdown(0)
      }

      const ok = await preflight({
        label: 'Dev server',
        devLimitMb: config.memoryLimitMb,
        mode: config.preflight,
      })
      if (!ok) {
        clearInterval(timer)
        shutdown(1)
      }
    }, TICK_MS)
    // Never let the health check itself be the thing keeping the process alive.
    timer.unref?.()
  }

  if (haltijaDev) {
    await ensureHaltijaChannel(HALTIJA_HTTPS_PORT)
  }

  if (testMode) {
    const testTimeout = 120_000
    const testResults = new Promise<any>((resolve, reject) => {
      testReportResolve = resolve
      setTimeout(
        () => reject(new Error('Browser tests timed out')),
        testTimeout
      )
    })

    /**
     * Tear down the haltija WE started — including the Electron grandchild. Defined up
     * front so EVERY failure path can call it, including the start-timeout below, which
     * used to call the naive `haltija.kill()` — that only signals the `bunx` wrapper and
     * leaves the Electron alive, so a failed run left an orphan that poisoned the next.
     *
     * The predicate is **descendants of the process we spawned** — NOT `pkill -f
     * haltija/apps/desktop`, which matches every haltija on the machine and would kill
     * the one YOU are running. And it is the *test suite* that runs this. The tree is
     * collected BEFORE the wrapper dies: once it's gone, Electron is reparented to init
     * and `pgrep -P` can no longer find it.
     */
    const descendantsOf = async (pid: number): Promise<number[]> => {
      const out = await $`pgrep -P ${pid}`
        .quiet()
        .text()
        .catch(() => '')
      const kids = out
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
      const all = [...kids]
      for (const kid of kids) all.push(...(await descendantsOf(kid)))
      return all
    }

    const stopHaltija = async (): Promise<void> => {
      if (!haltija?.pid) return
      const tree = await descendantsOf(haltija.pid)
      haltija.kill()
      for (const pid of tree) {
        try {
          process.kill(pid, 'SIGTERM')
        } catch {
          // already gone — fine
        }
      }
    }

    /*
    Adoptable means DRIVABLE, not merely "the server answered".

    This used to adopt any server that answered `hj windows`, on the reasoning that
    `hj navigate` creates a window if there is none. That is not what happens: a server
    with `windows: []` answers fine and then `hj navigate` fails with "no browser
    reachable" — three times in one release here, each needing a manual `pkill` before
    the lane would pass. (The rule before THAT required `windows.length > 0` and raced a
    second instance; the honest signal is neither of those.)

    haltija >= 1.6.1 reports `ready` — server up AND a tab connected — which is exactly
    this distinction, added in response to tosijs-ui filing it (haltija#11). Older CLIs
    have no such field, so fall back to counting windows, which is closer to right than
    assuming.

    Declining to adopt is safe: we spawn with `-f`, which stomps the stale instance.
    */
    /*
    ALWAYS an isolated instance. Never adopt, never stomp.

    The lane used to reuse any reachable haltija and otherwise spawn with `-f`, which
    reclaims the shared default port and SIGTERMs whatever held it — often another
    project's session. Both halves were a problem:

      - adopting meant inheriting the DESKTOP app's window, whose visibility depends on
        whatever else is on screen. `hj` refuses to drive a hidden tab (rightly — a
        backgrounded tab throttles rAF, so results are plausible-but-wrong), so the lane
        failed intermittently, roughly two runs in three, with no programmatic way out.
      - `-f` made this project's test run destructive to everyone else's.

    `--private` gives us our own server on an EPHEMERAL port, so there is nothing to
    contend for and nothing to kill. The port is written to a file rather than guessed.
    (tosijs-ui#18, #21.)
    */
    const portFile = `${tmpdir()}/tosijs-haltija-${process.pid}.json`
    const channel = resolveHaltijaChannel()
    console.log(`Starting a private haltija… (${channel.describe})`)
    const haltija = spawn(
      [...channel.argv, '--private', '--port-file', portFile],
      {
        // stdout/stderr are NOT inherited: `bunx haltija` launches Electron as a
        // grandchild, and killing the bunx wrapper does not kill it. An orphan holding
        // our inherited stdout keeps the pipe open forever, so the command looks hung
        // long after it exited.
        stdout: 'ignore',
        stderr: 'ignore',
      }
    )

    // Read the port it actually bound, rather than assuming one.
    let hjPort = ''
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      try {
        const info = JSON.parse(await Bun.file(portFile).text())
        hjPort = String(info.port ?? info.address?.port ?? '')
        if (hjPort) break
      } catch {
        /* not written yet */
      }
    }
    if (!hjPort) {
      console.error(
        `haltija did not report a private port within 30s (${portFile}).\n` +
          `  Is \`${channel.argv.join(' ')}\` able to run? Try it by hand.`
      )
      await stopHaltija()
      shutdown(1)
    }
    console.log(`  private haltija on port ${hjPort}`)

    console.log('Opening demo site...')
    // haltija 1.4: `hj navigate` exits NON-ZERO on failure (no browser reachable, a
    // window that didn't take the URL, …). Before 1.4 it exited 0 regardless, so a
    // failed navigate silently sailed on and the run died 120s later at the test
    // timeout with a misleading "Browser tests timed out". Now we can read the exit
    // code: fail immediately, say why, and tear down the haltija we spawned so the
    // next run isn't inheriting a half-navigated browser.
    const nav = await $`hj --port ${hjPort} navigate https://localhost:${PORT}`
      .nothrow()
      .quiet()
    if (nav.exitCode !== 0) {
      console.error(
        `hj navigate failed (exit ${nav.exitCode}): ${
          nav.stderr.toString().trim() || 'no browser reachable'
        }`
      )
      await stopHaltija()
      shutdown(1)
    }

    try {
      const results = await testResults
      const exitCode = results.failed > 0 ? 1 : 0
      await stopHaltija()
      shutdown(exitCode)
    } catch (e: any) {
      console.error(e.message)
      await stopHaltija()
      shutdown(1)
    }
  }
}
