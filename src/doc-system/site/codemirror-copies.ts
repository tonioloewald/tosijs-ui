/*
Two copies of CodeMirror in one install (board #3248, item 2; the same failure as #131).

Every CodeMirror package must share ONE `@codemirror/state` (and one `@codemirror/view`):
extensions are recognised by identity, so a language package holding a different copy hands
the editor values it rejects ("Unrecognized extension value in extension set"), and every
`<tosi-code>` renders blank while the build and the tests stay green.

It arrives through an ordinary upgrade. A lockfile that pinned an older hoisted
`@codemirror/state` keeps it, the package manager nests the newer one tosijs-ui now needs
under `node_modules/tosijs-ui/`, and the `lang-*` packages go on resolving the hoisted copy.

Build-time only: it asks the module resolver, which is the thing that decides what loads.
*/

import * as path from 'path'
import { existsSync, readFileSync, realpathSync } from 'fs'

declare global {
  var Bun: any
}

const SHARED = ['@codemirror/state', '@codemirror/view']

/** The package directory a resolved file belongs to (the one holding its package.json). */
function packageDirOf(file: string): string {
  let dir = path.dirname(file)
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'package.json'))) return dir
    dir = path.dirname(dir)
  }
  return path.dirname(file)
}

function resolveFrom(specifier: string, from: string): string | null {
  try {
    return realpathSync(Bun.resolveSync(specifier, from))
  } catch {
    return null
  }
}

/**
 * For each package that must be shared, the distinct copies reachable from the project and
 * from every `@codemirror/*` package tosijs-ui depends on. More than one path for a name is
 * the defect. `uiDir` is where tosijs-ui itself is installed.
 */
export function codemirrorCopies(
  root: string,
  uiDir: string
): Record<string, string[]> {
  let deps: string[] = []
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(uiDir, 'package.json'), 'utf8')
    )
    deps = Object.keys(pkg.dependencies ?? {}).filter((name) =>
      name.startsWith('@codemirror/')
    )
  } catch {
    // no package.json to read: only the two direct resolutions are compared
  }
  // Where each CodeMirror package tosijs-ui uses actually lives: each resolves its OWN
  // dependencies from there, which is where a second copy shows up.
  const origins = new Set<string>([root, uiDir])
  for (const dep of deps) {
    const resolved = resolveFrom(dep, uiDir)
    if (resolved) origins.add(packageDirOf(resolved))
  }
  const copies: Record<string, string[]> = {}
  for (const name of SHARED) {
    const found = new Set<string>()
    for (const origin of origins) {
      const resolved = resolveFrom(name, origin)
      if (resolved) found.add(packageDirOf(resolved))
    }
    copies[name] = [...found].sort()
  }
  return copies
}

/** What to say about `codemirrorCopies`' answer, or null when each package has one copy. */
export function duplicateCodemirrorWarning(
  copies: Record<string, string[]>
): string | null {
  const doubled = Object.entries(copies).filter(([, dirs]) => dirs.length > 1)
  if (doubled.length === 0) return null
  return (
    `\n⚠️  This install has more than one copy of a CodeMirror package that must be shared:\n` +
    doubled
      .map(
        ([name, dirs]) =>
          `    ${name}\n` + dirs.map((dir) => `      ${dir}\n`).join('')
      )
      .join('') +
    `    CodeMirror recognises extensions by identity, so with two copies every <tosi-code>\n` +
    `    renders blank ("Unrecognized extension value in extension set") and nothing fails.\n` +
    `    It usually follows an upgrade: the lockfile kept an older hoisted copy. Run:\n` +
    `        bun update ${doubled.map(([name]) => name).join(' ')}\n`
  )
}

/** tosijs-ui's own package directory, found from this module's location. */
export function tosijsUiDir(moduleDir: string): string {
  let dir = moduleDir
  while (dir !== path.dirname(dir)) {
    const file = path.join(dir, 'package.json')
    if (existsSync(file)) {
      try {
        if (JSON.parse(readFileSync(file, 'utf8')).name === 'tosijs-ui') {
          return dir
        }
      } catch {
        // unreadable: keep walking up
      }
    }
    dir = path.dirname(dir)
  }
  return moduleDir
}
