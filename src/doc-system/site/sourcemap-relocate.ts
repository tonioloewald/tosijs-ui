/*
Rewrite sourcemaps for a bundle that is BUILT in one directory and SERVED from another.

`bun build` writes each `sources` entry relative to the output directory. The hydration bundle
is built outside the served tree (so it can never be swept into a published `dist/`, #31) and
then copied into it, which leaves every relative path pointing somewhere else. Built in the OS
temp dir, those paths climbed to `/` and into the builder's home directory — publishing the
machine's layout and making the site differ between machines (#178).

For each `.map` under `builtDir`, this re-expresses every source relative to the map's place
under `servedDir`. The result is correct for devtools, identical on every machine, and
names no home directory. Virtual sources (`bun:…`, `data:…`) are left alone.
*/

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import * as path from 'path'

function mapsUnder(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) out.push(...mapsUnder(full))
    else if (name.endsWith('.map')) out.push(full)
  }
  return out
}

/** Re-express one map's sources, as if the map moved from `fromDir` to `toDir`. */
export function relocateSources(
  sources: string[],
  fromDir: string,
  toDir: string
): string[] {
  return sources.map((source) =>
    /^[a-z][a-z0-9+.-]*:/i.test(source)
      ? source
      : path
          .relative(toDir, path.resolve(fromDir, source))
          .split(path.sep)
          .join('/')
  )
}

/**
 * For every `.map` under `builtDir`, write a copy at the same relative path under
 * `servedDir` with its `sources` rewritten for that location.
 */
export function relocateSourcemaps(builtDir: string, servedDir: string): void {
  for (const map of mapsUnder(builtDir)) {
    const rel = path.relative(builtDir, map)
    const target = path.join(servedDir, rel)
    const json = JSON.parse(readFileSync(map, 'utf8'))
    if (Array.isArray(json.sources)) {
      json.sources = relocateSources(
        json.sources,
        path.dirname(map),
        path.dirname(target)
      )
    }
    writeFileSync(target, JSON.stringify(json))
  }
}
