import { test, expect, describe } from 'bun:test'
import { shouldCleanDist } from './orchestrator.js'

/*
#130: `buildSite` must not wipe a directory it does not wholly generate.

`dist/` is not a site artifact. For the repos this API exists to serve it is the PUBLISHED
PACKAGE OUTPUT — an input to `npm publish` — and the wipe ran on every `buildSite`, including
from `devServer` and including for projects configuring no library build at all.

Reported from tosijs: two bundles built only under `--build` (too slow for the dev loop) were
deleted by `bun start`, and by Playwright's `webServer` which runs it. A publish from that tree
ships `./debug` and `./safe` subpaths that throw ERR_MODULE_NOT_FOUND. Their release checklist
walks straight into it — build at step 3, browser tests at step 4, publish at step 8 — and it
reached a commit once already. Local gates could not catch it: they iterate the bundles the
current run BUILT, so a deleted bundle is invisible to all of them.

The doc `outputDir` wipe is fine and stays: that directory is wholly generated and announced.
*/
describe('shouldCleanDist (#130)', () => {
  test('a consumer-supplied libraryBuild owns dist — never cleaned', () => {
    expect(shouldCleanDist({ libraryBuild: () => {} })).toBe(false)
  })

  test('…even alongside the other flags, because the consumer function is the authority', () => {
    expect(shouldCleanDist({ libraryBuild: () => {}, emitLibrary: true })).toBe(
      false
    )
    expect(
      shouldCleanDist({
        libraryBuild: () => {},
        libraryTsconfig: 'tsconfig.lib.json',
      })
    ).toBe(false)
  })

  test('no library build configured — nothing here owns dist, so leave it alone', () => {
    expect(shouldCleanDist({})).toBe(false)
    expect(shouldCleanDist({ emitLibrary: false })).toBe(false)
  })

  test('tsc-based builds emit the complete set, so cleaning is safe and keeps renames from lingering', () => {
    expect(shouldCleanDist({ emitLibrary: true })).toBe(true)
    expect(shouldCleanDist({ libraryTsconfig: 'tsconfig.lib.json' })).toBe(true)
  })
})
