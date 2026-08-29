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

/*
STOP THIS PROJECT'S dev server — by pid, from the lock it already writes.

The thing people reach for is `pkill -f 'bun bin/dev.ts'`, which matches every dev server on the
machine because every project on this pipeline runs an identical command line. A sibling
checkout or another agent's session dies to a command that reads as "restart mine", and the
victim's symptoms — a live pid with no listener — are indistinguishable from the zombie in #91,
so it costs a fresh diagnosis every time (#117).

The lock record already carried pid, port and root; it needed a reader and a command.
*/
if (process.argv.includes('--stop')) {
  const { currentHolder } = await import('../src/doc-system/site/build-lock.js')
  const holder = currentHolder('.')
  if (!holder) {
    console.log('No dev server is running for this project.')
    process.exit(0)
  }
  try {
    process.kill(holder.pid, 'SIGTERM')
    console.log(
      `Stopped this project's dev server (pid ${holder.pid}` +
        (holder.port ? `, port ${holder.port}` : '') +
        `).`
    )
    process.exit(0)
  } catch (e) {
    console.error(
      `Could not signal pid ${holder.pid}: ${(e as Error).message}\n` +
        `  It may have exited already; the lock is cleared on the next start.\n`
    )
    process.exit(1)
  }
}

const buildOnly = process.argv.includes('--build-only')
const testMode = process.argv.includes('--test')

const config = {
  ...siteConfig,
  // tosijs-ui-specific codegen, run before doc extraction + build.
  prebuild: async () => {
    const pkg = JSON.parse(await Bun.file('package.json').text())
    // Write ONLY if the content actually changed.
    //
    // `bun --watch` restarts on any change to a file in the module graph, so an
    // unconditional rewrite of a generated file that something imports is a rebuild
    // loop — build → rewrite → restart → build. We hit exactly that (899 restarts in
    // ~40s) the moment the build stamp imported src/version.ts. The import is gone,
    // but idempotent writes are the durable fix: they make the whole class of
    // self-write loops impossible rather than relying on nobody ever importing a
    // generated file again.
    const versionSrc = `export const version = '${pkg.version}'`
    const existing = await Bun.file('src/version.ts')
      .text()
      .catch(() => '')
    if (existing.trim() !== versionSrc.trim()) {
      await Bun.write('src/version.ts', versionSrc)
    }
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
