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

  let testReportResolve: ((results: any) => void) | undefined

  await killStrayServer(PORT)

  function serveFromDir(cfg: { directory: string; path: string }): Response | null {
    const basePath = path.join(cfg.directory, cfg.path)
    const suffixes = ['', '.html', 'index.html']
    for (const suffix of suffixes) {
      try {
        const pathWithSuffix = path.join(basePath, suffix)
        const stat = statSync(pathWithSuffix)
        if (stat && stat.isFile()) {
          return new Response(Bun.file(pathWithSuffix))
        }
      } catch {
        // not found at this suffix — try the next
      }
    }
    return null
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

      if (reqPath === '/') reqPath = '/index.html'

      const buildResponse = serveFromDir({ directory: PUBLIC, path: reqPath })
      if (buildResponse) return buildResponse

      if (isSPA) {
        const spaResponse = serveFromDir({
          directory: PUBLIC,
          path: '/index.html',
        })
        console.log(spaResponse)
        if (spaResponse) return spaResponse
      }
      return new Response('File not found', { status: 404 })
    },
  })

  console.log(`Listening on https://localhost:${PORT}`)

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
