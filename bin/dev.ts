/*
tosijs-ui's own build entry — a thin wrapper over the reusable doc-site system
(src/doc-system/site, shipped as `tosijs-ui/site`). Declarative project config
lives in tosijs-site.config.ts; the imperative prebuild codegen (version stamp +
icon-data regeneration) is wired here.

  bun bin/dev.ts                # build, then start the dev server
  bun bin/dev.ts --build-only   # build and exit (0/1)
  bun bin/dev.ts --test         # build, serve, run browser tests, exit (0/1)
*/

import { $ } from 'bun'
import siteConfig from '../tosijs-site.config'
import { buildSite, devServer } from '../src/doc-system/site'

declare global {
  var Bun: any
}

const buildOnly = process.argv.includes('--build-only')
const testMode = process.argv.includes('--test')

const config = {
  ...siteConfig,
  // tosijs-ui-specific codegen, run before doc extraction + build.
  prebuild: async () => {
    const pkg = JSON.parse(await Bun.file('package.json').text())
    await Bun.write('src/version.ts', `export const version = '${pkg.version}'`)
    console.log(pkg.version)
    await $`bun ./bin/make-icon-data.js`.text()
  },
}

const ok = await buildSite(config)
if (buildOnly) process.exit(ok ? 0 : 1)

await devServer(config, { test: testMode })
