#!/usr/bin/env bun
/*
Deploy the built site to a preview host.

  tosijs-deploy                 # DRY RUN — shows what would change
  tosijs-deploy --go            # actually sync
  tosijs-deploy --host=me@1.2.3.4 --path=/srv/preview/tosijs-ui --go

(In this repo `bun run deploy` is a shortcut for the same thing.)

Phase 1 of REMOTE-ACCESS-PLAN.md. The whole artifact is ~9MB / ~95 files and a typical
doc change touches 3, so this is a copy, not a deployment pipeline — rsync has done
delta transfer since 1996 and there is no protocol to invent.

Two deliberate safety properties:

  DRY RUN BY DEFAULT. This runs `rsync --delete`, which removes files on the remote
  that aren't present locally. That is correct (the remote should mirror the build)
  and it is destructive if pointed somewhere wrong, so the destructive form must be
  typed on purpose. `--go` is the whole ceremony.

  IT WARNS WHEN THE TREE IS DIRTY. `/version.json` deliberately carries no `dirty`
  flag: it records the last COMMIT, and a build made from a dirty tree may not match
  that commit. Rather than bake a permanently-wrong flag into a committed file, the
  warning lives here — at the moment a human is deciding to publish something, and can
  act on it. This is the other half of that decision (see build-stamp.ts).
*/

import { $ } from 'bun'
import { existsSync } from 'fs'
import {
  previewRootFor,
  registerCaddyFragment,
  resolvePreviewHost,
  parseArgv,
} from './resolve-site-config'
import {
  resolveSiteConfig,
  isSafeRemotePath,
  safeRemoteRoots,
} from './resolve-site-config'

const { has, flag } = parseArgv(process.argv.slice(2), {
  bin: 'tosijs-deploy',
  summary: 'rsync the built site to the preview host',
  flags: ['go'],
  values: ['host', 'path', 'url'],
  usage:
    `  tosijs-deploy                        DRY RUN — shows what would transfer\n` +
    `  tosijs-deploy --go                   actually transfer\n` +
    `  --host=user@box                      override the configured preview host\n` +
    `  --path=/srv/site                     override the remote path\n` +
    `  --url=https://…                      override the reported URL`,
})

const siteConfig = await resolveSiteConfig()

const OUT = siteConfig.outputDir ?? 'docs'
const PROJECT = siteConfig.name ?? 'site'
const preview = siteConfig.preview

// Precedence: explicit flag > env > site config. The config is the "just works"
// default; the flag exists so you can push a one-off somewhere else without editing
// (and committing) a config file.
const host = resolvePreviewHost(flag('host'), preview?.host)
const remotePath =
  flag('path') ??
  process.env.PREVIEW_PATH ??
  preview?.path ??
  `/srv/preview/${PROJECT}`
const publicUrl = flag('url') ?? preview?.url
const go = has('go')

if (!host) {
  console.error(
    `\nNo preview host.\n\n` +
      `  Put it where machine-local credentials live — a 700 directory beside the\n` +
      `  repos, so it cannot be committed:\n` +
      `      mkdir -p ~/local-secrets && chmod 700 ~/local-secrets\n` +
      `      echo 'PREVIEW_HOST=user@example.com' >> ~/local-secrets/tosijs-preview.env\n` +
      `      chmod 600 ~/local-secrets/tosijs-preview.env\n` +
      `      echo '[ -f ~/local-secrets/tosijs-preview.env ] && . ~/local-secrets/tosijs-preview.env' >> ~/.zshenv\n` +
      `      # ~/.zshenv, not ~/.zshrc — scripts and agents get no interactive profile\n\n` +
      `  ...or pass it per-run:\n` +
      `      tosijs-deploy --host=user@example.com [--path=/srv/preview/x] [--go]\n` +
      `      PREVIEW_HOST=user@example.com tosijs-deploy\n`
  )
  process.exit(1)
}

// Never let a typo'd path become `rsync --delete` against something important.
// An allowlist of preview roots, not a depth heuristic — "two segments deep" admits
// /usr/lib and /etc/caddy, and mirroring a doc-site build into either would empty it.
if (!isSafeRemotePath(remotePath)) {
  console.error(
    `\n🛑 Refusing to deploy to "${remotePath}".\n\n` +
      `   This runs \`rsync --delete\`, which mirrors — anything already at the target\n` +
      `   that isn't in the build gets removed. Targets must live under one of:\n` +
      safeRemoteRoots()
        .map((r) => `     ${r}/…`)
        .join('\n') +
      `\n`
  )
  process.exit(1)
}

if (!existsSync(OUT) || !existsSync(`${OUT}/index.html`)) {
  console.error(
    `\n🛑 No build at ./${OUT} (or it has no index.html). Run \`bun run build\` first.\n`
  )
  process.exit(1)
}

// What are we about to publish? /version.json is the build's identity; printing it
// here closes the loop the stamp exists for — you see the commit BEFORE it ships,
// not only when someone asks "what am I looking at".
let stamp = '(no version.json — build with a current tosijs-ui)'
try {
  const v = JSON.parse(await Bun.file(`${OUT}/version.json`).text())
  stamp = `${v.commit ?? '?'} — ${v.commitTime ?? '?'} (generator ${
    v.generator
  })`
} catch {
  // best effort; never block a deploy on the stamp
}

const dirty = (await $`git status --porcelain`.nothrow().quiet().text()).trim()

console.log(`\n📦 ${PROJECT} → ${host}:${remotePath}`)
console.log(`   building from: ${stamp}`)

if (dirty) {
  const n = dirty.split('\n').length
  console.warn(
    `\n⚠️  Working tree has ${n} uncommitted change${n === 1 ? '' : 's'}.\n` +
      `    /version.json records the last COMMIT, so the preview will claim a commit\n` +
      `    that does not describe what you are about to publish. Commit first if the\n` +
      `    identity matters (it usually does when someone else is reviewing).\n`
  )
}

// --delete so the remote mirrors the build exactly (stale pages must not linger);
// -z compresses; --checksum is NOT used — mtime+size is enough and much faster.
const rsyncArgs = [
  '-az',
  '--delete',
  '--human-readable',
  ...(go ? [] : ['--dry-run']),
  '--itemize-changes',
  `${OUT}/`,
  `${host}:${remotePath}/`,
]

if (!go) console.log(`\n🔍 DRY RUN — nothing will change. Add --go to sync.\n`)

const result = await $`rsync ${rsyncArgs}`.nothrow()
if (result.exitCode !== 0) {
  console.error(`\n🛑 rsync failed (exit ${result.exitCode}).`)
  process.exit(1)
}

/*
Self-registration.

When `preview.url` is set, this project publishes its own Caddy fragment naming the
hostname and the directory it serves. The central Caddyfile glob-imports
/srv/preview/_sites/*.caddy, so a new project needs no edit to any shared file and no
DNS change — deploying IS registering.

The fragment is the single source of truth for hostname→directory: the index page
reads these same files, so the listing cannot drift from the router. (It did, once:
the index derived hostnames from directory names and linked
tosijs-ui.dev.tosijs.net at a site actually served from ui.dev.tosijs.net.)

Validate before reloading, and do not reload if invalid. One malformed fragment would
otherwise fail the reload for EVERY project on the box — so a bad config leaves the
previous good one serving, exactly as a failed build leaves the last good site up.
*/
async function registerSite(): Promise<boolean> {
  // Nothing configured to register is not a failure — there is no route to fail.
  if (!publicUrl) return true
  let hostname: string
  try {
    hostname = new URL(publicUrl).hostname
  } catch {
    console.warn(
      `⚠️  preview.url is not a URL (${publicUrl}) — skipping registration.`
    )
    return false
  }

  // Staged through a local temp file and scp'd: Bun's shell has no herestring, and
  // building a remote `cat > file` out of an interpolated string is how you end up
  // with a quoting bug that writes something surprising as root.
  const ok = await registerCaddyFragment({
    // guarded at module scope; the narrowing does not survive into this closure
    host: host!,
    previewRoot: previewRootFor(remotePath, preview?.caddySitesDir),
    name: PROJECT,
    describe: `${hostname} → ${remotePath}`,
    body:
      `# Generated by \`tosijs-deploy\` for ${PROJECT}. Do not hand-edit.\n` +
      `${hostname} {\n\troot * ${remotePath}\n\timport preview_site\n}\n`,
  })
  return ok
}

/** Refresh the host's index so this deploy shows up immediately. */
async function refreshIndex(): Promise<void> {
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
    // Loudly: the deploy itself succeeded, so this must not read as total failure —
    // but a silently stale index is how you conclude a deploy did not land.
    console.warn(
      `⚠️  Could not refresh the host index (scp of ${script} failed).\n` +
        `   The deploy landed; the listing at the root will be stale until the next one.\n` +
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
      `⚠️  the host index was not refreshed (exit ${run.exitCode}). The deploy landed;\n` +
        `   the listing at the root will be stale until the next successful one.\n` +
        `   ${(run.stderr.toString() || run.stdout.toString())
          .trim()
          .slice(0, 200)}`
    )
    return
  }
  const out = run.stdout.toString().trim()
  if (out) console.log(`   ${out}`)
}

let routed = true
if (go) {
  routed = await registerSite()
  await refreshIndex()
}

/*
"Deployed" and "routed" are different claims.

The files can land perfectly while the Caddy fragment fails to register — and printing
one ✅ over both is exactly what `registerCaddyFragment`'s docblock refuses. Say which
happened, and exit non-zero when the site is not actually reachable, so a script or CI
step cannot treat a dead route as a success.
*/
if (!go) {
  console.log(`\nDry run complete — re-run with --go to apply.\n`)
} else if (routed) {
  console.log(
    `\n✅ Deployed. ${stamp}` + (publicUrl ? `\n   ${publicUrl}\n` : '\n')
  )
} else {
  console.error(
    `\n🛑 Files deployed, but the site is NOT routed. ${stamp}\n` +
      `   The content is on the host; nothing serves it until registration succeeds.\n` +
      (publicUrl ? `   ${publicUrl} will not resolve to it yet.\n` : '')
  )
  process.exit(1)
}
