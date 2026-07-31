/*
Find and load the CONSUMER's site config.

`bin/tunnel.ts` and `bin/deploy-preview.ts` ship as package bins (`tosijs-tunnel`,
`tosijs-deploy`), so they run from an adopter's repo, not this one. They used to
`import siteConfig from '../tosijs-site.config'` — a path that only resolves inside
tosijs-ui, which is exactly why every adopter had to hand-copy ~390 lines of
security-sensitive glue and then own the drift forever (tosijs-ui#27).

Resolution order, first hit wins:
  1. `--config=<path>`            explicit beats clever
  2. `TOSIJS_SITE_CONFIG`         for CI and one-offs
  3. ./tosijs-site.config.ts      what this repo and its siblings use
  4. ./site.config.ts             what doc-site-system.md's quick-start suggests
  5. ./tosijs-site.config.js / ./site.config.js

Deliberately does NOT walk up the tree. These commands deploy and expose a workspace;
silently picking up a parent directory's config would mean publishing the wrong project,
and "it found something" is not the same as "it found yours".
*/

import { existsSync } from 'fs'
import * as path from 'path'

export interface PreviewConfig {
  host?: string
  path?: string
  url?: string
  tunnel?: {
    remotePort?: number
    localPort?: number
    url?: string
    requireToken?: boolean
  }
}

export interface ResolvedSiteConfig {
  name?: string
  outputDir?: string
  port?: number
  preview?: PreviewConfig
  /** absolute path of the file this came from, for error messages */
  __configPath: string
}

const CANDIDATES = [
  'tosijs-site.config.ts',
  'site.config.ts',
  'tosijs-site.config.js',
  'site.config.js',
]

/** Where would we look? Exported so a failure message can list it. */
export function candidatePaths(cwd = process.cwd()): string[] {
  return CANDIDATES.map((c) => path.resolve(cwd, c))
}

export async function resolveSiteConfig(
  argv: string[] = process.argv.slice(2),
  cwd = process.cwd()
): Promise<ResolvedSiteConfig> {
  const flag = argv.find((a) => a.startsWith('--config='))?.slice(9)
  const explicit = flag ?? process.env.TOSIJS_SITE_CONFIG

  let file: string | undefined
  if (explicit) {
    file = path.resolve(cwd, explicit)
    if (!existsSync(file)) {
      console.error(`\n🛑 No site config at ${file}\n`)
      process.exit(1)
    }
  } else {
    file = candidatePaths(cwd).find((p) => existsSync(p))
  }

  if (!file) {
    console.error(
      `\n🛑 No site config found in ${cwd}\n\n` +
        `   Looked for:\n` +
        CANDIDATES.map((c) => `     ${c}`).join('\n') +
        `\n\n   Pass one explicitly with --config=<path>, or set TOSIJS_SITE_CONFIG.\n` +
        `   (Parent directories are deliberately NOT searched — these commands deploy\n` +
        `   and expose a workspace, and picking up a neighbour's config silently would\n` +
        `   publish the wrong project.)\n`
    )
    process.exit(1)
  }

  try {
    const mod = await import(file)
    const cfg = mod.default ?? mod
    return { ...cfg, __configPath: file }
  } catch (e) {
    console.error(`\n🛑 Could not load ${file}:\n   ${String(e)}\n`)
    process.exit(1)
  }
}

/*
Is this a safe target for `rsync --delete`?

The original guard was "absolute and at least two segments deep", which happily admits
/usr/lib, /var/www, /etc/caddy and /home/deploy — all of which would be MIRRORED to a
doc-site build, i.e. emptied of everything else. A depth heuristic cannot express
"somewhere set aside for previews"; an allowlist of roots can.

Exported and pure so it is testable — the previous version was top-level script code
inside the deploy, which is exactly why nothing pinned it.
*/
const SAFE_ROOTS = [
  '/srv/preview',
  '/srv/www',
  '/var/www/preview',
  '/opt/preview',
]

export function isSafeRemotePath(p: string): boolean {
  if (!p.startsWith('/')) return false
  // No traversal, no trailing weirdness that could re-root the path.
  if (p.includes('..')) return false
  const norm = p.replace(/\/+$/, '')
  if (norm.split('/').filter(Boolean).length < 2) return false
  /*
  The ROOT ITSELF is not a safe target — only something INSIDE it.

  `rsync --delete` mirrors, so `--path=/srv/preview` (one dropped path segment) deletes
  every OTHER project's directory, the generated index, and all of
  /srv/preview/_sites/*.caddy — the fragments the Caddyfile glob-imports. The deploy then
  reloads Caddy in the same breath, so every preview on the box loses its route at once.
  One missing segment should not be able to do that.
  */
  return SAFE_ROOTS.some((root) => norm.startsWith(root + '/'))
}

export const safeRemoteRoots = (): string[] => [...SAFE_ROOTS]
