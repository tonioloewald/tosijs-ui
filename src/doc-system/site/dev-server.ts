/*
Dev server for the static doc-site system.

`devServer(config, { test })` serves the built site over HTTPS with SPA
fallback, rebuilds on source changes, and — in test mode — drives a haltija
headless browser through the inline doc tests and exits with their pass/fail.

Build-time only (Bun APIs). Never import this from browser code.
*/

import * as path from 'path'
import { statSync } from 'fs'
import { watch } from 'chokidar'
import { $, spawn } from 'bun'
import type { SiteConfig } from './site-config'
import { buildSite } from './orchestrator'

declare global {
  var Bun: any
}

const TEST_RESULTS_FILE = '.browser-tests.json'

async function killStrayServer(port: number) {
  try {
    await $`lsof -ti:${port} | xargs kill -9 2>/dev/null`.quiet()
  } catch {
    // No process on port, that's fine
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
    // `@latest` (1.3.2+): the widget-mode WebRTC screen capture (which makes the
    // Electron app CI-only) is on the stable channel now, along with the fix for
    // an accidental Electron launch. (Was pinned to `@beta` before 1.3.2.)
    spawn(['bunx', 'haltija@latest', '--server', '--both'], {
      stdout: 'ignore',
      stderr: 'ignore',
    })
    console.log(
      `Haltija dev-channel ready — drive this page with \`hj\` (e.g. \`hj tree\`). ` +
        `The widget appears when the channel is active (Option+Tab to toggle).`
    )
  } catch (err) {
    console.warn(
      `Haltija dev-channel: could not start (${String(err)}). The page loader ` +
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

export async function devServer(
  config: SiteConfig,
  opts: { test?: boolean; build?: () => unknown | Promise<unknown> } = {}
): Promise<void> {
  const PORT = config.port ?? 8787
  const PUBLIC = path.resolve('./', config.outputDir ?? 'docs')
  const isSPA = true
  const testMode = !!opts.test

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
      process.env.HALTIJA_DEV === '1' ||
      process.env.HALTIJA_DEV === 'true')
  const HALTIJA_SNIPPET =
    `<script>/^localhost$|^127\\./.test(location.hostname)` +
    `&&import('https://localhost:${HALTIJA_HTTPS_PORT}/dev.js')</script>`

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

  async function handleWriteSource(request: Request): Promise<Response> {
    try {
      const { file, content } = (await request.json()) as {
        file?: string
        content?: string
      }
      const resolved = resolveInRepo(file ?? '')
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

  function resolveFile(cfg: { directory: string; path: string }): string | null {
    const basePath = path.join(cfg.directory, cfg.path)
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

  // Serve a resolved file, injecting the haltija dev-channel loader into HTML
  // pages when enabled. Serve-time only — the loader never touches the built
  // output on disk, and non-HTML assets are streamed untouched.
  async function respondFile(filePath: string): Promise<Response> {
    if (haltijaDev && filePath.endsWith('.html')) {
      const html = await Bun.file(filePath).text()
      const injected = html.includes('</body>')
        ? html.replace('</body>', `${HALTIJA_SNIPPET}</body>`)
        : html + HALTIJA_SNIPPET
      return new Response(injected, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
    return new Response(Bun.file(filePath))
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
        console.log(`\n✓ Browser tests: ${results.passed} passed\n`)
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

  if (!testMode) {
    // Rebuild on any source change. By default that's just buildSite(), but a
    // consumer whose full build has steps BEYOND buildSite — e.g. a custom IIFE
    // bundle built separately (because it needs a Bun plugin buildSite can't
    // take) — MUST pass opts.build with their whole pipeline. buildSite() starts
    // with `rm -rf <outputDir>`, so any artifact those extra steps produced
    // (iife.js, etc.) is deleted on the first rebuild and, without opts.build,
    // never regenerated — leaving the page's /iife.js to 404 into the SPA
    // fallback (it "loads as html"). Serialize builds and coalesce bursts.
    const runBuild = opts.build ?? (() => buildSite(config))

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
    const rssMb = () => Math.round(process.memoryUsage().rss / 1e6)
    const limitMb = Number(
      process.env.DEV_MEMORY_LIMIT_MB ?? config.memoryLimitMb ?? 4096
    )
    let baselineMb = 0
    let rebuilds = 0
    let warned = false
    const checkMemory = () => {
      const mb = rssMb()
      rebuilds += 1
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
            `~${each.toFixed(1)}MB each; limit ${limitMb}MB). Growth per rebuild ` +
            `should be ~0 — if this keeps climbing, restart and report it.`
        )
      }
    }

    let building = false
    let pending = false
    const rebuild = async () => {
      if (building) {
        pending = true
        return
      }
      building = true
      try {
        await runBuild()
      } catch (error) {
        console.error('rebuild failed:', error)
      } finally {
        building = false
        checkMemory()
        if (pending) {
          pending = false
          void rebuild()
        }
      }
    }
    // Ignore the files the build itself writes, or the watch would loop.
    const ignored = (p: string) =>
      /node_modules|(^|[/\\])(version|icon-data)\.ts$/.test(p)
    const watchPaths = [
      'README.md',
      './src',
      './demo/src',
      './icons',
      ...(config.watchPaths ?? []),
    ]
    watch(watchPaths, { ignored, ignoreInitial: true }).on('all', () =>
      void rebuild()
    )
  }

  await ensureDevCerts()

  const server = Bun.serve({
    port: PORT,
    tls: {
      key: Bun.file('./tls/key.pem'),
      cert: Bun.file('./tls/certificate.pem'),
    },
    async fetch(request: Request) {
      let reqPath = new URL(request.url).pathname
      console.log(request.method, reqPath)

      if (request.method === 'POST' && reqPath === '/report') {
        return handleTestReport(request)
      }

      // Source read/write for in-browser "edit page source" (opt-in, dev only).
      // A write lands in the repo file; the chokidar watcher then rebuilds and
      // the page refreshes — the build itself is the preview.
      if (config.editableSources && reqPath === '/__docstore/source') {
        if (request.method === 'GET') return handleReadSource(request)
        if (request.method === 'POST') return handleWriteSource(request)
      }

      if (reqPath === '/') reqPath = '/index.html'

      const buildFile = resolveFile({ directory: PUBLIC, path: reqPath })
      if (buildFile) return await respondFile(buildFile)

      if (isSPA) {
        const spaFile = resolveFile({ directory: PUBLIC, path: '/index.html' })
        if (spaFile) return await respondFile(spaFile)
      }
      return new Response('File not found', { status: 404 })
    },
  })

  console.log(`Listening on https://localhost:${PORT}`)

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

    let haltija: ReturnType<typeof spawn> | undefined
    let hjAvailable = false

    try {
      const result = await $`hj windows`.quiet()
      const { windows } = JSON.parse(result.stdout.toString())
      hjAvailable = windows.length > 0
    } catch {
      // haltija not running
    }

    if (!hjAvailable) {
      console.log('Starting haltija...')
      haltija = spawn(['bunx', 'haltija@latest', '-f'], {
        stdout: 'inherit',
        stderr: 'inherit',
      })

      console.log('Waiting for browser...')
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        try {
          const result = await $`hj windows`.quiet()
          const { windows } = JSON.parse(result.stdout.toString())
          if (windows.length > 0 && windows[0].url !== 'about:blank') {
            break
          }
        } catch {
          // not ready yet
        }
        if (i === 19) {
          console.error('Haltija browser did not become available within 10s')
          haltija.kill()
          server.stop()
          process.exit(1)
        }
      }
    } else {
      console.log('Using existing haltija browser')
    }

    console.log('Opening demo site...')
    await $`hj navigate https://localhost:${PORT}`

    try {
      const results = await testResults
      const exitCode = results.failed > 0 ? 1 : 0
      if (haltija) haltija.kill()
      server.stop()
      process.exit(exitCode)
    } catch (e: any) {
      console.error(e.message)
      if (haltija) haltija.kill()
      server.stop()
      process.exit(1)
    }
  }
}
