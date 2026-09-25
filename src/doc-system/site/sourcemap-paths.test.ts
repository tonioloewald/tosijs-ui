import { test, expect } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'fs'
import { homedir } from 'os'
import * as path from 'path'

/*
Every committed sourcemap's `sources` must stay inside the project (#178).

The hydration bundle was built in the OS temp dir, and `bun build` writes `sources` relative to
the output dir — so every chunk map in docs/ climbed to `/` and back down into the builder's
home: `../../../../../../Users/<name>/tosijs-ui/node_modules/…`. That published the build
machine's layout, and made docs/ differ between any two machines, which is how the publish
workflow's rebuild check found it: CI on Linux rebuilt 35 chunk maps differently.

This reads the COMMITTED output, so it guards what actually ships and deploys.
*/

const ROOT = path.resolve(import.meta.dir, '../../..')

function mapsUnder(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) out.push(...mapsUnder(full))
    else if (name.endsWith('.map')) out.push(full)
  }
  return out
}

test('no committed sourcemap points outside the project or names a home directory', () => {
  const maps = ['docs', 'dist'].flatMap((d) => mapsUnder(path.join(ROOT, d)))
  expect(maps.length).toBeGreaterThan(0)
  const home = homedir()
  const escapes: string[] = []
  for (const map of maps) {
    const { sources = [] } = JSON.parse(readFileSync(map, 'utf8'))
    for (const source of sources as string[]) {
      if (/^[a-z]+:/i.test(source)) continue // bundler-internal virtual modules
      const resolved = path.resolve(path.dirname(map), source)
      if (
        !resolved.startsWith(ROOT + path.sep) ||
        (home && source.includes(home))
      ) {
        escapes.push(`${path.relative(ROOT, map)}: ${source}`)
        break // one per map is enough to name it
      }
    }
  }
  expect(escapes).toEqual([])
})
