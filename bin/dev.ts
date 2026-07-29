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

// The dependency audit runs synchronously in every mode — it is sub-second, and a
// gate you wait for cannot be raced. One-shot builds (`--build-only`, `--test`)
// audit inside buildSite; the interactive dev server skips it here and audits in
// devServer() just before it binds the port, so `bun start` audits exactly once.
// Watch rebuilds skip it (see dev-server.ts).
const interactive = !buildOnly && !testMode
const ok = await buildSite(config, { skipAudit: interactive })

// A failed one-shot build is fatal — including `--test`, which used to compute this
// and then launch the test run anyway, so a blocking advisory (or any build failure)
// still went green. Interactive keeps serving on a failed build: you want the server
// up to fix it, and devServer() gates the audit itself.
if (!ok && !interactive) process.exit(1)
if (buildOnly) process.exit(0)

await devServer(config, { test: testMode })
