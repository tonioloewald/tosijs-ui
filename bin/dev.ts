/*
tosijs-ui's own build entry — a thin wrapper over the reusable doc-site system
(src/doc-system/site, shipped as `tosijs-ui/site`). All project specifics live
in tosijs-site.config.ts.

  bun bin/dev.ts                # build, then start the dev server
  bun bin/dev.ts --build-only   # build and exit (0/1)
  bun bin/dev.ts --test         # build, serve, run browser tests, exit (0/1)
*/

import siteConfig from '../tosijs-site.config'
import { buildSite, devServer } from '../src/doc-system/site'

const buildOnly = process.argv.includes('--build-only')
const testMode = process.argv.includes('--test')

const ok = await buildSite(siteConfig)
if (buildOnly) process.exit(ok ? 0 : 1)

await devServer(siteConfig, { test: testMode })
