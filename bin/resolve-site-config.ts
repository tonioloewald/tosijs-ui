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

import { $ } from 'bun'
import { existsSync } from 'fs'
import * as path from 'path'

export interface PreviewConfig {
  host?: string
  path?: string
  url?: string
  /** where the host's Caddyfile globs fragments from; default /srv/preview/_sites */
  caddySitesDir?: string
  tunnel?: {
    remotePort?: number
    localPort?: number
    url?: string
    requireToken?: boolean
    /** see `tunnel.globalKeys` in site-config.ts */
    globalKeys?: boolean | 'view'
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

/*
Re-exported so the bins and the dev server cannot drift apart on port defaults (#39).

Imported from `dist/`, not `src/`: `src` is not in package `files`, so a bin resolving
into it works in this checkout and breaks the moment anyone installs the package — the
exact class of bug that put four packaging regressions into published prereleases.
`site-config.js` is ~700 bytes of pure functions and type-only imports, so this costs a
bin nothing.
*/
export {
  resolveDevPort,
  resolveTunnelLocalPort,
} from '../dist/doc-system/site/site-config.js'

/*
`readLocalSecret` lives in the package (`src/doc-system/site/local-secrets.ts`) because the dev
server reads the global tunnel keys from the same file; it is re-exported here for the bins.
*/
export { readLocalSecret } from '../dist/doc-system/site/local-secrets.js'
export {
  resolveGlobalKeys,
  DEVICE_ID_PATTERN,
} from '../dist/doc-system/site/dev-auth.js'
import {
  DEVICE_ID_PATTERN,
  cleanDeviceLabel,
} from '../dist/doc-system/site/dev-auth.js'

/*
The box's device registry (board #3416): one tab-separated line per edit pass issued, written
by `tosijs-tunnel` over ssh as `printf '%s\n' '<line>'`. So a line may hold no quote, tab or
newline of its own: every field is checked or cleaned here, and a line that cannot be made safe
is not written.
*/
export const DEVICE_LISTING_SEPARATOR = '--revoked--'

export function deviceRegistryLine(device: {
  id: string
  issued: Date
  project: string
  label: string
}): string | null {
  if (!DEVICE_ID_PATTERN.test(device.id)) return null
  const project = device.project.replace(/[^\w.-]/g, '').slice(0, 60)
  return [
    device.id,
    device.issued.toISOString(),
    project,
    cleanDeviceLabel(device.label),
  ].join('\t')
}

export interface DeviceRecord {
  id: string
  issued: string
  project: string
  label: string
  revoked: boolean
}

/** `cat registry.tsv; echo --revoked--; cat revoked.txt` → one record per device, newest first. */
export function parseDeviceListing(text: string): DeviceRecord[] {
  const [registry = '', revokedText = ''] = text.split(
    `${DEVICE_LISTING_SEPARATOR}\n`
  )
  const revoked = new Set(revokedText.split('\n').map((line) => line.trim()))
  const devices: DeviceRecord[] = []
  for (const line of registry.split('\n')) {
    const [id = '', issued = '', project = '', label = ''] = line.split('\t')
    if (!DEVICE_ID_PATTERN.test(id)) continue
    devices.push({ id, issued, project, label, revoked: revoked.has(id) })
  }
  return devices.reverse()
}
import type { GlobalKeys } from '../dist/doc-system/site/dev-auth.js'
import { readLocalSecret } from '../dist/doc-system/site/local-secrets.js'

/**
 * `--host=` > `PREVIEW_HOST` > `PREVIEW_SSH` (legacy) > **site config** > `~/local-secrets`.
 *
 * The project's own config outranks the machine-global file, and that ordering is the whole
 * point of the file being last. `~/local-secrets/tosijs-preview.env` holds ONE host for the
 * whole machine; if it outranked a project that names its own, then checking out someone
 * else's repo and running `tosijs-tunnel` would quietly point it at YOUR box — and the tunnel
 * does not merely print a target, it `ssh`s, `scp`s a Caddy fragment and reloads Caddy there.
 * A machine-wide default must not silently redirect a project that was explicit.
 *
 * It still sits above nothing at all, which is what makes it useful: a repo following the
 * practice has no host in its config, so the file is what supplies one — including for
 * scripts and agents, which inherit no interactive shell profile.
 */
export function resolvePreviewHost(
  flagHost?: string,
  configHost?: string
): string | undefined {
  /*
  Truthiness, not `??` — an EMPTY value must fall through.

  `??` only skips null/undefined, so `PREVIEW_HOST=''` counted as "set" and swallowed the site
  config AND the `~/local-secrets` rung below it. That is not a hypothetical spelling: a GitHub
  Actions `env: PREVIEW_HOST: ${{ secrets.X }}` renders `''` when the secret is missing, and
  the result was "No preview host" with remediation text telling you to create a file that
  already existed and worked. Precisely the symptom the local-secrets rung was added to
  abolish. `bin/tunnel.ts` already used truthiness for its `hostSource` label, so one file
  disagreed with itself about what "set" means.
  */
  return [
    flagHost,
    process.env.PREVIEW_HOST,
    process.env.PREVIEW_SSH,
    configHost,
    readLocalSecret('PREVIEW_HOST'),
  ]
    .map((value) => value?.trim())
    .find(Boolean)
}

/*
Register a Caddy fragment on the preview host — ONE implementation.

This existed twice, ~40 lines each, in `tosijs-deploy` and `tosijs-tunnel`, and had
already drifted: the tunnel copy lost the `mkdir -p _sites` AND the failure warning, so a
failed scp produced literally no output and the bin went on to print the public URL as
though routing were live. Both copies also hardcoded `/srv/preview` while the config and
docs advertise four possible roots.

Every step's exit code is read and every failure says so. A partial success that prints ✅
is the specific failure this project refuses to ship.
*/
export async function registerCaddyFragment(opts: {
  host: string
  /** absolute path of the preview root on the host, e.g. /srv/preview */
  previewRoot: string
  /** fragment basename without .caddy, e.g. "my-project" or "my-project-tunnel" */
  name: string
  body: string
  /** what this fragment routes, for the success line */
  describe: string
}): Promise<boolean> {
  const { $ } = await import('bun')
  const { tmpdir } = await import('os')
  const sitesDir = `${opts.previewRoot}/_sites`
  const remote = `${sitesDir}/${opts.name}.caddy`
  const local = `${tmpdir()}/${opts.name}.caddy`
  await Bun.write(local, opts.body)

  const mk = await $`ssh ${opts.host} mkdir -p ${sitesDir}`.nothrow().quiet()
  if (mk.exitCode !== 0) {
    console.warn(
      `⚠️  could not create ${sitesDir} on ${opts.host} — routing unchanged.\n` +
        `   ${mk.stderr.toString().trim().slice(0, 200)}`
    )
    return false
  }
  const put = await $`scp -q ${local} ${`${opts.host}:${remote}`}`
    .nothrow()
    .quiet()
  if (put.exitCode !== 0) {
    console.warn(
      `⚠️  could not copy the Caddy fragment to ${remote} — routing unchanged.\n` +
        `   ${put.stderr.toString().trim().slice(0, 200)}`
    )
    return false
  }

  /*
  Validate with the SAME environment systemd gives Caddy — a bare `caddy validate` does
  not load the EnvironmentFile, so `{env.…}` placeholders resolve empty and a config that
  is actually fine fails to validate. That would fail CLOSED forever.
  */
  const check = await $`ssh ${
    opts.host
  } ${'set -a; . /etc/caddy/preview.env 2>/dev/null; set +a; caddy validate --config /etc/caddy/Caddyfile'}`
    .nothrow()
    .quiet()
  if (check.exitCode !== 0) {
    const detail = (check.stderr.toString() || check.stdout.toString()).trim()
    // Leave the fragment so the error is inspectable, but do NOT reload: one bad
    // fragment would fail the reload for EVERY project on the box.
    console.error(
      `\n🛑 Caddy config invalid after registering ${opts.describe} — NOT reloading.\n` +
        `   The previous config keeps serving. Fix or remove ${remote} on the host.\n` +
        (/unrecognized directive|unknown snippet|not defined/i.test(detail)
          ? `   Likely cause: this host has not been bootstrapped — the fragment imports a\n` +
            `   snippet (preview_site / tunnel_site) that only exists once you have installed\n` +
            `   a Caddyfile defining it. See "Host bootstrap" in the doc-site-system docs.\n`
          : '') +
        detail.split('\n').slice(-4).join('\n')
    )
    return false
  }

  const reload = await $`ssh ${opts.host} systemctl reload caddy`
    .nothrow()
    .quiet()
  if (reload.exitCode !== 0) {
    console.warn(
      `⚠️  fragment written, but \`systemctl reload caddy\` failed — the route is NOT live.\n` +
        `   ${reload.stderr.toString().trim().slice(0, 200)}`
    )
    return false
  }
  console.log(`   registered ${opts.describe}`)
  return true
}

/*
Where the installed Caddyfile actually looks for fragments.

`previewRootFor` used to derive this from the project's own `remotePath`, which
de-hardcoded the WRITE side only: `deploy/Caddyfile` globs `/srv/preview/_sites/*.caddy`
and `build-index.sh` sets `ROOT=/srv/preview`. So deploying to `/opt/preview/foo` wrote a
fragment somewhere nothing imports — `caddy validate` passed trivially, `systemctl reload`
succeeded, and the bin printed `registered … → /opt/preview/foo` over a dead route. That
was a REGRESSION: before, both bins hardcoded `/srv/preview/_sites` and every root worked.

One place decides, and a mismatch is refused rather than silently written. Override with
`preview.caddySitesDir` if your host's Caddyfile imports somewhere else.
*/
export const DEFAULT_CADDY_ROOT = '/srv/preview'

export function previewRootFor(
  remotePath: string,
  caddySitesRoot?: string
): string {
  if (caddySitesRoot) return caddySitesRoot.replace(/\/_sites\/?$/, '')
  const root = safeRemoteRoots().find((r) => remotePath.startsWith(r + '/'))
  /*
  A path under a non-default root is only routable if the host's Caddyfile imports from
  there — which the shipped template does not. Refuse loudly instead of registering into
  a directory nothing reads.
  */
  if (root && root !== DEFAULT_CADDY_ROOT) {
    console.warn(
      `⚠️  ${remotePath} is under ${root}, but the shipped Caddyfile imports\n` +
        `   ${DEFAULT_CADDY_ROOT}/_sites/*.caddy. Registering there instead.\n` +
        `   If your host imports elsewhere, set \`preview.caddySitesDir\`.`
    )
  }
  return DEFAULT_CADDY_ROOT
}

/*
ONE argv parser for every bin.

`caddy-install`, `deploy-preview`, `tunnel` and `release-notes` each carried their own
`flag()`/`has()` pair — four copies of a parser, which is how three of them drifted into
resolving `--host=` differently and only ONE of them ever rejected an unknown flag
(tosijs-ui#85).

Rejecting the unknown is the load-bearing part. An ignored flag is not a harmless typo in a
tool that contacts a machine: `tosijs-caddy-install --status` — a flag it has never had —
read as "no flags at all", and the bin proceeded to ssh into the configured host. `--status`
is still ignored by `tosijs-deploy` today, where it reaches the host with an `rsync
--dry-run`. Nothing destructive there, but a tool that touches someone's server must not
read an instruction it does not understand as consent to proceed.

`--help` comes free with it, and that is not incidental: NO test lane runs a shipped bin's
argument handling (`smoke-consumer.ts` checks shebangs, and deliberately does not execute
the bins that reach the network), so `tosijs-release-notes --help` shipped unrecognised and
died on a raw `ShellError` in any directory that was not a git repo. A parser that has to be
told its own flags can answer `--help` without anyone remembering to write one.
*/
export interface ArgvSpec {
  /** the installed command name, for the usage banner */
  bin: string
  /** one line: what the command is for */
  summary: string
  /** valueless flags, without dashes — `--go`, `--status` */
  flags?: string[]
  /** `--name=value` flags, without dashes — `--host=…` */
  values?: string[]
  /** the usage body, printed verbatim under the banner */
  usage: string
}

export interface Argv {
  has(name: string): boolean
  flag(name: string): string | undefined
  /** everything that was not a recognised `--flag` */
  rest: string[]
}

/**
 * `tosijs-tunnel` flag combinations that would otherwise be silently ignored, each with what to
 * do instead (1.16.31 review). A flag that changes nothing is a promise the bin does not keep.
 */
export function tunnelFlagProblems(args: {
  has: (name: string) => boolean
  flag: (name: string) => string | undefined
}): string[] {
  const problems: string[] = []
  const link = args.has('link')
  const share = args.has('share')
  const global = args.has('global')
  if (args.flag('share-ttl') !== undefined) {
    if (global)
      problems.push(
        '--share-ttl does not apply to --global links: they always expire after 5 minutes. For a longer-lived view link, use --link --share --share-ttl=… without --global.'
      )
    else if (!(link && share))
      problems.push('--share-ttl only applies to --link --share.')
  }
  if (args.flag('label') !== undefined) {
    if (!(link && global) || share)
      problems.push(
        '--label names the device a --link --global EDIT link is for; it does nothing elsewhere.'
      )
  }
  return problems
}

/**
 * Parse `argv` against `spec`. Prints usage and exits on `--help` (0) or on an
 * unrecognised flag (1); returns a reader otherwise.
 */
export function parseArgv(argv: string[], spec: ArgvSpec): Argv {
  const flags = new Set([...(spec.flags ?? []), 'help'])
  const values = new Set(spec.values ?? [])

  const unknown = argv.filter((a) => {
    if (!a.startsWith('--')) return false
    const name = a.slice(2).split('=')[0]
    return a.includes('=') ? !values.has(name) : !flags.has(name)
  })

  if (unknown.length || argv.includes('--help')) {
    const bad = unknown.length > 0
    const banner =
      (bad ? `\nUnknown option(s): ${unknown.join(' ')}\n` : '') +
      `\n${spec.bin} — ${spec.summary}\n\n${spec.usage}\n`
    // Usage goes to stderr when it is a complaint and stdout when it was asked for, so
    // `cmd --help | less` works and a misuse still shows up in a redirected log.
    if (bad) console.error(banner)
    else console.log(banner)
    process.exit(bad ? 1 : 0)
  }

  return {
    has: (name: string) => argv.includes(`--${name}`),
    flag: (name: string) => {
      const hit = argv.find((a) => a.startsWith(`--${name}=`))
      return hit ? hit.slice(name.length + 3) : undefined
    },
    rest: argv.filter((a) => !a.startsWith('--')),
  }
}

/**
 * Refresh the host's index so a deploy, or a newly registered tunnel, shows up immediately.
 * Shared by `tosijs-deploy` and `tosijs-tunnel`.
 */
export async function refreshHostIndex(host: string): Promise<void> {
  const remote = `/tmp/tosi-build-index-${process.pid}.sh`
  /*
  Resolve the script against THIS PACKAGE, not the adopter's cwd.

  `deploy/` is in `files`, so the asset ships at node_modules/tosijs-ui/deploy/ — only
  the resolution was wrong, which meant every adopter's scp failed, the failure was
  swallowed by a bare `return`, and the deploy still printed "✅ Deployed". Exactly the
  #37 class of bug, one cycle later: a package asset located relative to whoever called us.
  */
  const script = `${import.meta.dir}/../deploy/build-index.sh`
  const put = await $`scp -q ${script} ${`${host}:${remote}`}`.nothrow().quiet()
  if (put.exitCode !== 0) {
    // Loudly: the deploy or tunnel itself succeeded, so this must not read as total
    // failure — but a silently stale index is how you conclude it did not land.
    console.warn(
      `⚠️  Could not refresh the host index (scp of ${script} failed).\n` +
        `   The listing at the root will be stale until the next refresh.\n` +
        `   ${put.stderr.toString().trim().slice(0, 200)}`
    )
    return
  }
  const run = await $`ssh ${host} bash ${remote}`.nothrow().quiet()
  await $`ssh ${host} rm -f ${remote}`.nothrow().quiet()
  // build-index.sh is `set -euo pipefail`; a non-root user on a root-owned tree dies at
  // mkdir. Discarding this exit code meant the deploy printed ✅ over a failed index.
  if (run.exitCode !== 0) {
    console.warn(
      `⚠️  the host index was not refreshed (exit ${run.exitCode}). The listing at\n` +
        `   the root will be stale until the next successful refresh.\n` +
        `   ${(run.stderr.toString() || run.stdout.toString())
          .trim()
          .slice(0, 200)}`
    )
    return
  }
  const out = run.stdout.toString().trim()
  if (out) console.log(`   ${out}`)
}

/** What the box says about its global keys: its domain, and a fingerprint of each key. */
export interface BoxKeys {
  domain?: string
  /** sha256 hex of the box's PREVIEW_EDIT_TOKEN / PREVIEW_TOKEN, '' when it has none */
  editSha?: string
  viewSha?: string
  problem?: string
}

/**
 * Read the box's preview domain, and fingerprints of its two keys, in one ssh call.
 *
 * The file is SOURCED, as the installer and Caddy's own install read it, so all three agree on
 * quoting, `export` and comments. The keys never leave the box: only their sha256 does, which is
 * enough to say "this machine's key is not the box's", the one mismatch that makes a link
 * open this workspace and nothing else.
 */
export async function previewBoxKeys(host: string): Promise<BoxKeys> {
  const script =
    // Checked first: bash as a login shell carries on past a failed `.`, which read as "sets
    // no PREVIEW_DOMAIN" when the file was missing or unreadable.
    '[ -r /etc/caddy/preview.env ] || { echo "/etc/caddy/preview.env is missing or unreadable" >&2; exit 1; }; ' +
    'set -a; . /etc/caddy/preview.env; set +a; ' +
    'printf "%s\\n" "${PREVIEW_DOMAIN:-}"; ' +
    'for k in "${PREVIEW_EDIT_TOKEN:-}" "${PREVIEW_TOKEN:-}"; do ' +
    'if [ -n "$k" ]; then printf %s "$k" | { sha256sum 2>/dev/null || shasum -a 256; } | cut -d" " -f1; else echo; fi; done'
  // Never prompt or hang: `--link --global` waits on this.
  const read =
    await $`ssh -o BatchMode=yes -o ConnectTimeout=10 ${host} ${script}`
      .nothrow()
      .quiet()
  if (read.exitCode !== 0) {
    return {
      problem: `could not read /etc/caddy/preview.env on ${host}: ${read.stderr
        .toString()
        .trim()
        .slice(0, 160)}`,
    }
  }
  const [domain = '', editSha = '', viewSha = ''] = read.stdout
    .toString()
    .split('\n')
    .map((line) => line.trim())
  if (!/^[a-z0-9.-]+$/i.test(domain)) {
    return {
      problem: `/etc/caddy/preview.env on ${host} sets no PREVIEW_DOMAIN`,
    }
  }
  return { domain, editSha, viewSha }
}

const sha256 = (text: string) =>
  new Bun.CryptoHasher('sha256').update(text).digest('hex')

/**
 * Which single-use links `tosijs-tunnel` can honestly offer, and why not the rest.
 *
 * A link hands the browser this machine's key as a cookie across the box's domain, so it is
 * only worth printing when this workspace accepts the key AND the box holds the same one; with a
 * different key on the box, the cookie would open this workspace and not the box's root or any
 * other workspace, which is not what the link says.
 */
export function planGlobalLinks(
  local: { keys: GlobalKeys; problems: string[] },
  box: BoxKeys
): { kinds: ('edit' | 'view')[]; domain?: string; notes: string[] } {
  const notes = [...local.problems]
  const { keys } = local
  const wanted: ('edit' | 'view')[] = []
  if (keys.edit && (keys.editGrants ?? 'edit') === 'edit') wanted.push('edit')
  if (keys.view) wanted.push('view')
  if (wanted.length === 0) {
    if (notes.length === 0)
      notes.push(
        'no global key on this machine (PREVIEW_EDIT_TOKEN / PREVIEW_TOKEN in ~/local-secrets/tosijs-preview.env), or tunnel.globalKeys turns them off'
      )
    return { kinds: [], notes }
  }
  if (!box.domain) {
    notes.push(box.problem ?? 'the box did not say what its preview domain is')
    return { kinds: [], notes }
  }
  const kinds = wanted.filter((kind) => {
    const mine = kind === 'edit' ? keys.edit! : keys.view!
    const theirs = kind === 'edit' ? box.editSha : box.viewSha
    if (theirs === sha256(mine)) return true
    const name = kind === 'edit' ? 'PREVIEW_EDIT_TOKEN' : 'PREVIEW_TOKEN'
    notes.push(
      theirs
        ? `${name} here is not the box's, so no ${kind} link: put the same value in both files`
        : `the box has no ${name}, so no ${kind} link: add it to /etc/caddy/preview.env and re-run tosijs-caddy-install`
    )
    return false
  })
  return { kinds, domain: box.domain, notes }
}
