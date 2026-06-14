import * as path from 'path'
import { statSync } from 'fs'
import { gzipSync } from 'zlib'
import { watch } from 'chokidar'
import { extractDocs } from './docs'
import { generateLlmsTxt } from '../src/doc-system/site/make-llms-txt'
import { generateSite } from '../src/doc-system/site/generate-site'
import siteConfig from '../tosijs-site.config'
import { $, spawn } from 'bun'

declare global {
  var Bun: any
}

const PORT = siteConfig.port ?? 8787
const PROJECT_ROOT = './'
const PUBLIC = path.resolve(PROJECT_ROOT, siteConfig.outputDir ?? 'docs')
const DIST = path.resolve(PROJECT_ROOT, 'dist')
const isSPA = true

async function killStrayServer() {
  try {
    await $`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`.quiet()
  } catch {
    // No process on port, that's fine
  }
}

// The HTTPS dev server needs a cert in tls/. On a fresh clone there isn't one, so
// warn with the exact command to run rather than serving a broken server. We don't
// generate it automatically because `bun tls` runs `mkcert -install`, which prompts
// for sudo — not something to spring on someone mid-startup.
async function ensureDevCerts() {
  const haveCerts =
    (await Bun.file('./tls/key.pem').exists()) &&
    (await Bun.file('./tls/certificate.pem').exists())
  if (haveCerts) return
  console.error(
    '\nNo dev TLS certificate found in tls/.\n\n' +
      'Generate one (locally-trusted, no browser warnings) with:\n\n' +
      '    bun tls\n\n' +
      'then start the dev server again. Requires mkcert — `bun tls` prints\n' +
      'install instructions if it is missing.\n'
  )
  process.exit(1)
}

async function prebuild() {
  console.time('prebuild')
  const config = JSON.parse(await Bun.file('package.json').text())
  await Bun.write(
    'src/version.ts',
    `export const version = '${config.version}'`
  )
  console.log(config.version)

  await $`rm -rf ${PUBLIC}`.text()
  await $`mkdir ${PUBLIC}`.text()
  extractDocs({
    paths: siteConfig.docPaths ?? ['src', 'README.md', 'bin', 'icons'],
    output: 'demo/docs.json',
  })
  await $`bun ./bin/make-icon-data.js`.text()
  await $`cp -R ./demo/static/. ${PUBLIC}`.text()

  await $`rm -rf ${DIST}`.text()
  await $`mkdir ${DIST}`.text()
  console.timeEnd('prebuild')
}

async function build(): Promise<boolean> {
  console.time('build')
  // Emit unbundled ESM + declarations (tree-shakeable by consumers)
  try {
    await $`bun tsc --declaration --incremental --outDir dist`
  } catch {
    console.log('esm + types created')
  }

  const result = await Bun.build({
    entrypoints: ['./src/index-iife.ts'],
    outdir: DIST,
    sourcemap: 'linked',
    format: 'iife',
    minify: true,
    naming: 'iife.js',
    external: ['sucrase'],
  })
  if (!result.success) {
    console.error('dist build failed')
    for (const message of result.logs) {
      console.error(message)
    }
    return false
  }
  await $`cp ./dist/iife.js ${PUBLIC}`.text()

  generateLlmsTxt('llms.txt')

  // Report gzipped sizes
  const iifeFile = await Bun.file(`${DIST}/iife.js`).arrayBuffer()
  const iifeGzip = gzipSync(Buffer.from(iifeFile))
  console.log(
    `dist/iife.js: ${(iifeFile.byteLength / 1024).toFixed(1)}kb (${(
      iifeGzip.length / 1024
    ).toFixed(1)}kb gzip)`
  )

  // Generate the static, pre-rendered doc site (one /slug/index.html per doc).
  // Runs after the static-asset copy so the generated index.html (README) wins,
  // and after the iife copy so every page's <script src="/iife.js"> resolves.
  // Everything project-specific comes from tosijs-site.config.ts.
  const docs = JSON.parse(await Bun.file('demo/docs.json').text())
  const pageCount = await generateSite({
    docs,
    outputDir: PUBLIC,
    projectName: siteConfig.name,
    description: siteConfig.description,
    baseUrl: siteConfig.baseUrl,
    lang: siteConfig.lang,
    projectLinks: siteConfig.projectLinks,
    navbarLinks: siteConfig.navbarLinks,
    localizedStrings: siteConfig.localizedStrings,
    favicon: siteConfig.favicon,
    ogImage: siteConfig.ogImage,
    headExtra: siteConfig.headExtra,
  })
  // Burn the theme into a static stylesheet (separate subprocess — see generate-css.ts).
  await $`bun ./src/doc-system/site/generate-css.ts ${PUBLIC}/doc-system.css ${JSON.stringify(
    siteConfig.theme || {}
  )}`.text()
  console.log(`generated ${pageCount} static pages`)

  console.timeEnd('build')
  return true
}

const buildOnly = process.argv.includes('--build-only')
const testMode = process.argv.includes('--test')

let testReportResolve: ((results: any) => void) | undefined

if (!buildOnly) {
  await killStrayServer()
}
await prebuild()
const ok = await build()

if (buildOnly) {
  process.exit(ok ? 0 : 1)
}

if (!testMode) {
  watch('./icons').on('change', () => $`bun ./bin/make-icon-data.js`)
  watch(['README.md', './src']).on('change', () =>
    $`bun ./bin/docs.js`.then(build)
  )
  watch('./demo/src').on('change', build)
}

function serveFromDir(config: {
  directory: string
  path: string
}): Response | null {
  const basePath = path.join(config.directory, config.path)
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

const TEST_RESULTS_FILE = '.browser-tests.json'

async function handleTestReport(request: Request): Promise<Response> {
  try {
    const results = await request.json()

    // Save to file
    await Bun.write(TEST_RESULTS_FILE, JSON.stringify(results, null, 2))

    // Log failures to console
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

await ensureDevCerts()

const server = Bun.serve({
  port: PORT,
  tls: {
    key: Bun.file('./tls/key.pem'),
    cert: Bun.file('./tls/certificate.pem'),
  },
  async fetch(request) {
    let reqPath = new URL(request.url).pathname
    console.log(request.method, reqPath)

    // Handle test report endpoint
    if (request.method === 'POST' && reqPath === '/report') {
      return handleTestReport(request)
    }

    if (reqPath === '/') reqPath = '/index.html'

    const buildResponse = serveFromDir({
      directory: PUBLIC,
      path: reqPath,
    })
    if (buildResponse) return buildResponse

    if (isSPA) {
      const spaResponse = serveFromDir({
        directory: PUBLIC,
        path: '/index.html',
      })
      console.log(spaResponse)
      if (spaResponse) return spaResponse
    }
    return new Response('File not found', {
      status: 404,
    })
  },
})

console.log(`Listening on https://localhost:${PORT}`)

if (testMode) {
  const testTimeout = 120_000
  const testResults = new Promise<any>((resolve, reject) => {
    testReportResolve = resolve
    setTimeout(() => reject(new Error('Browser tests timed out')), testTimeout)
  })

  // Check if haltija is already running
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
