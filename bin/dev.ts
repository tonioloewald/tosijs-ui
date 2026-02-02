import * as path from 'path'
import { statSync } from 'fs'
import { gzipSync } from 'zlib'
import { watch } from 'chokidar'
import { extractDocs } from './docs'
// @ts-ignore-error
import { $ } from 'bun'

declare global {
  var Bun: any
}

const PORT = 8787
const PROJECT_ROOT = './'
const PUBLIC = path.resolve(PROJECT_ROOT, 'docs')
const DIST = path.resolve(PROJECT_ROOT, 'dist')
const isSPA = true

async function killStrayServer() {
  try {
    await $`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`.quiet()
  } catch {
    // No process on port, that's fine
  }
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
    paths: ['src', 'README.md', 'bin'],
    output: 'demo/docs.json',
  })
  await $`bun ./bin/make-icon-data.js`.text()
  await $`cp ./demo/static/* ${PUBLIC}`.text()

  await $`rm -rf ${DIST}`.text()
  await $`mkdir ${DIST}`.text()
  console.timeEnd('prebuild')
}

async function build() {
  console.time('build')
  let result: any

  try {
    await $`bun tsc --declaration --emitDeclarationOnly --incremental --outDir dist`
  } catch (e) {
    console.log('types created')
  }
  result = await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: DIST,
    sourcemap: 'linked',
    format: 'esm',
    minify: true,
    external: ['tosijs', 'marked'],
  })
  if (!result.success) {
    console.error('dist build failed')
    for (const message of result.logs) {
      console.error(message)
    }
    return
  }

  result = await Bun.build({
    entrypoints: ['./src/index-iife.ts'],
    outdir: DIST,
    sourcemap: 'linked',
    format: 'iife',
    minify: true,
    naming: 'iife.js',
  })
  if (!result.success) {
    console.error('dist build failed')
    for (const message of result.logs) {
      console.error(message)
    }
    return
  }
  await $`cp ./dist/iife.js ${PUBLIC}`.text()

  // Report gzipped sizes
  const esmFile = await Bun.file(`${DIST}/index.js`).arrayBuffer()
  const iifeFile = await Bun.file(`${DIST}/iife.js`).arrayBuffer()
  const esmGzip = gzipSync(Buffer.from(esmFile))
  const iifeGzip = gzipSync(Buffer.from(iifeFile))
  console.log(
    `dist/index.js: ${(esmFile.byteLength / 1024).toFixed(1)}kb (${(
      esmGzip.length / 1024
    ).toFixed(1)}kb gzip)`
  )
  console.log(
    `dist/iife.js: ${(iifeFile.byteLength / 1024).toFixed(1)}kb (${(
      iifeGzip.length / 1024
    ).toFixed(1)}kb gzip)`
  )

  await Bun.build({
    entrypoints: ['./demo/src/index.ts'],
    outdir: PUBLIC,
    target: 'browser',
  })
  if (!result.success) {
    console.error('demo build failed')
    for (const message of result.logs) {
      console.error(message)
    }
    return
  }

  console.timeEnd('build')
}

watch('./demo/xin-icon-font').on('change', () => $`bun ./bin/make-icon-data.js`)
watch(['README.md', './src']).on('change', () =>
  $`bun ./bin/docs.js`.then(build)
)
watch('./demo/src').on('change', build)

await killStrayServer()
await prebuild()
await build()

function serveFromDir(config: {
  directory: string
  path: string
}): Response | null {
  let basePath = path.join(config.directory, config.path)
  const suffixes = ['', '.html', 'index.html']

  for (const suffix of suffixes) {
    try {
      const pathWithSuffix = path.join(basePath, suffix)
      const stat = statSync(pathWithSuffix)
      if (stat && stat.isFile()) {
        return new Response(Bun.file(pathWithSuffix))
      }
    } catch (err) {}
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
