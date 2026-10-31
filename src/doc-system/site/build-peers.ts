/*
Optional peers a site BUILD cannot do without (#3600).

`happy-dom` is an optional peer of tosijs-ui because a project that only uses the components
never needs it, and npm installs a required peer whether or not it is used. But `buildSite`
does need it: the theme stylesheet is generated with tosijs imported under a DOM shim. Without
it the build died several steps in with "Cannot find package 'happy-dom'" from a file inside
tosijs-ui, which says nothing about whose job it is to install it. So the build checks first,
and says what to run.
*/

import { readFileSync } from 'fs'
import * as path from 'path'
import { tosijsUiDir } from './codemirror-copies.js'

/** What a site build requires, resolved from tosijs-ui's own location (where it is imported). */
const BUILD_PEERS = ['happy-dom']

/**
 * The install command for each build peer that cannot be resolved, or none.
 * `resolve` is injectable for tests.
 */
export function missingBuildPeers(
  moduleDir: string,
  resolve: (name: string, from: string) => string = Bun.resolveSync
): string[] {
  let ranges: Record<string, string> = {}
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(tosijsUiDir(moduleDir), 'package.json'), 'utf8')
    )
    ranges = pkg.peerDependencies ?? {}
  } catch {
    // no manifest found: name the package without a range
  }
  return BUILD_PEERS.filter((name) => {
    try {
      resolve(name, moduleDir)
      return false
    } catch {
      return true
    }
  }).map((name) => (ranges[name] ? `${name}@${ranges[name]}` : name))
}

export function missingBuildPeersMessage(missing: string[]): string {
  return (
    `\n🛑 Building a site needs ${missing.join(
      ', '
    )}, an optional peer of tosijs-ui ` +
    `(a project that only uses the components does not).\n` +
    `   bun add -d ${missing.map((m) => `'${m}'`).join(' ')}\n`
  )
}
