/*
Build orchestrator for the static doc-site system.

`buildSite(config)` runs the full pipeline:
  prebuild — stamp version, extract docs, (icon data), copy static assets
  build    — type declarations, IIFE bundle, llms.txt, static-site generation,
             burned-in theme stylesheet

NOTE: keep heavy/icon imports OUT of this module's static graph. generate-css
and icon-data run as SEPARATE subprocesses on purpose — importing the full
tosijs module or the icon system here would put src/icon-data.ts into
`bun --watch`'s graph and cause an endless rebuild loop.
*/

import * as path from 'path'
import { gzipSync } from 'zlib'
import { $ } from 'bun'
import type { SiteConfig } from './site-config'
import { extractDocs } from './docs'
import { generateLlmsTxt } from './make-llms-txt'
import { generateSite } from './generate-site'

declare global {
  var Bun: any
}

export async function buildSite(config: SiteConfig): Promise<boolean> {
  const PROJECT_ROOT = './'
  const PUBLIC = path.resolve(PROJECT_ROOT, config.outputDir ?? 'docs')
  const DIST = path.resolve(PROJECT_ROOT, 'dist')

  // ── prebuild ──────────────────────────────────────────────────────────────
  console.time('prebuild')
  const pkg = JSON.parse(await Bun.file('package.json').text())
  await Bun.write('src/version.ts', `export const version = '${pkg.version}'`)
  console.log(pkg.version)

  await $`rm -rf ${PUBLIC}`.text()
  await $`mkdir ${PUBLIC}`.text()
  extractDocs({
    paths: config.docPaths ?? ['src', 'README.md', 'bin', 'icons'],
    output: 'demo/docs.json',
  })
  await $`bun ./bin/make-icon-data.js`.text()
  await $`cp -R ./demo/static/. ${PUBLIC}`.text()

  await $`rm -rf ${DIST}`.text()
  await $`mkdir ${DIST}`.text()
  console.timeEnd('prebuild')

  // ── build ─────────────────────────────────────────────────────────────────
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
  const docs = JSON.parse(await Bun.file('demo/docs.json').text())
  const pageCount = await generateSite({
    docs,
    outputDir: PUBLIC,
    projectName: config.name,
    description: config.description,
    baseUrl: config.baseUrl,
    lang: config.lang,
    projectLinks: config.projectLinks,
    navbarLinks: config.navbarLinks,
    localizedStrings: config.localizedStrings,
    favicon: config.favicon,
    ogImage: config.ogImage,
    headExtra: config.headExtra,
  })
  // Burn the theme into a static stylesheet (separate subprocess — see
  // generate-css.ts for why).
  await $`bun ./src/doc-system/site/generate-css.ts ${PUBLIC}/doc-system.css ${JSON.stringify(
    config.theme || {}
  )}`.text()
  console.log(`generated ${pageCount} static pages`)

  console.timeEnd('build')
  return true
}
