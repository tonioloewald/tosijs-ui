#!/usr/bin/env bun
/*
Expose THIS machine's dev server at an authenticated public URL.

  tosijs-tunnel          # open the tunnel (foreground; Ctrl-C closes it)
  tosijs-tunnel --status # is one already up?
  tosijs-tunnel --close  # close any tunnel this project opened
  tosijs-tunnel --link   # ask the dev server to print a fresh edit link

(In this repo `bun run tunnel` is a shortcut for the same thing.)

The work happens where the data is. The repo, the dev server, the build and the
watcher all stay here; the box terminates TLS and checks a password and does no
compute at all. That is what makes it scale — N projects tunnel their own workspace
to one small VPS, rather than the VPS trying to be a build farm.

WHY THIS IS SAFE — and note the guarantee does NOT rest on the proxy:

  - The dev server binds a SEPARATE loopback-only port for tunnel traffic. Anything
    arriving there is treated as remote and needs a valid session to write, whatever
    its peer address says. Which listener a request landed on is not something a
    client can forge; a header is. (An earlier version inferred "local" from missing
    X-Forwarded-* headers and therefore failed OPEN for any forwarder that omits them.)
  - The box should also run sshd with `GatewayPorts no` so the forwarded port binds
    127.0.0.1 there rather than the internet. That is defence in depth, not the wall —
    and this command does NOT check it, so verify it on the host yourself:
    `sshd -T | grep gatewayports` should say `gatewayports no`.

So: reading is open to whoever has the URL (unless `tunnel.requireToken`), writing
always requires a session.
*/

import { $ } from 'bun'
import {
  planGlobalLinks,
  previewBoxKeys,
  previewRootFor,
  readLocalSecret,
  registerCaddyFragment,
  refreshHostIndex,
  resolveGlobalKeys,
  resolveDevPort,
  resolvePreviewHost,
  resolveSiteConfig,
  resolveTunnelLocalPort,
  parseArgv,
  deviceRegistryLine,
  groupCode,
  shortCodeScript,
  parseDeviceListing,
  DEVICE_LISTING_SEPARATOR,
  DEVICE_ID_PATTERN,
  tunnelFlagProblems,
} from './resolve-site-config.ts'

const { has, flag } = parseArgv(process.argv.slice(2), {
  bin: 'tosijs-tunnel',
  summary: 'expose the local dev server through the preview host',
  flags: ['close', 'link', 'status', 'share', 'global', 'devices'],
  values: [
    'host',
    'port',
    'local-port',
    'remote-port',
    'url',
    'share-ttl',
    'label',
    'revoke',
  ],
  usage:
    `  tosijs-tunnel                        open the tunnel (foreground)\n` +
    `  --status                             report whether a tunnel is up\n` +
    `  --close                              close a running tunnel\n` +
    `  --link                               print a magic edit link\n` +
    `  --link --share                       print a READ-ONLY link to send to a person\n` +
    `  --link --global [--share]            a SINGLE-USE 5-minute link that also keeps that\n` +
    `                                       browser in every workspace and the root list for\n` +
    `                                       30 days (edit: a revocable device pass)\n` +
    `  --label=<name>                       name the device a --global edit link is for\n` +
    `  --devices                            list the devices given an edit pass, and which are revoked\n` +
    `  --revoke=<device id>                 revoke one device's edit pass, on every workspace\n` +
    `  --share-ttl=<minutes>                how long a plain share link lives (default 1440)\n` +
    `  --host=user@box                      override the configured preview host\n` +
    `  --port= --local-port= --remote-port= override the resolved ports`,
})

{
  const problems = tunnelFlagProblems({ has, flag })
  if (problems.length) {
    for (const problem of problems) console.error(`\n${problem}`)
    console.error('')
    process.exit(1)
  }
}

const siteConfig = await resolveSiteConfig()

const preview = siteConfig.preview
const host = resolvePreviewHost(flag('host'), preview?.host)
const localPort = Number(
  flag('port') ?? resolveDevPort(siteConfig, process.env)
)
const projectName = String(siteConfig.name ?? 'site')

/*
Derive a per-project remote port instead of defaulting every project to 9787.

A flat default collides the moment two projects share a host: B's `tosijs-tunnel` sees
A's forward, prints "tunnel already up" and exits 0 having exposed nothing — and B's
`--close` kills A's tunnel. Where the local ports differ it is worse: B's Caddy fragment
routes B's public hostname at A's workspace.

FNV-1a over the project name into 9000-9899. Deterministic (the same project gets the
same port on every machine and across restarts, so a stale fragment still matches), and
an explicit `remotePort` always wins.
*/
function derivePort(name: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return 9000 + (h % 900)
}
const remotePort = Number(
  flag('remote-port') ?? preview?.tunnel?.remotePort ?? derivePort(projectName)
)
// Forward to the dedicated LOOPBACK listener, not the TLS dev port. Arriving there is
// what marks a request as remote, so writes require a session — an unforgeable signal,
// unlike a header. It is plain HTTP, which also removes the proxy's need to skip TLS
// verification against a self-signed dev cert.
// ONE resolver, shared with the dev server (#39) — a matching-but-separate copy is how
// these drifted in the first place. An explicit --local-port still wins.
/*
`process.env`, NOT `{}`.

The empty object was written to silence a type error and quietly defeated the resolver's
own `process.env` default — so the bin ignored `PORT` (and `--port=`) while the dev server
honoured it, re-creating the exact drift the shared resolver was introduced to abolish,
inside the commit that claimed it could not happen again. `--status` printed two
inconsistent numbers because the line above DID read the env.
*/
const tunnelLocalPort = Number(
  flag('local-port') ??
    resolveTunnelLocalPort({ ...siteConfig, port: localPort }, {})
)
const publicUrl = flag('url') ?? preview?.tunnel?.url
// Set by the registration step below; no public URL means there is no route to fail.
let routed = true

/** Ask the dev server (loopback only) for a link; `query` selects the kind. */
async function askForLink(
  query: string
): Promise<{ url?: string; device?: string; error?: string }> {
  const res =
    await $`curl -sk --max-time 5 https://localhost:${localPort}/__devlink${query}`
      .nothrow()
      .quiet()
  try {
    return JSON.parse(res.stdout.toString())
  } catch {
    return {}
  }
}

/*
Single-use links that also give the browser the box's global key (see GlobalGrant in
dev-auth.ts): one click opens this workspace, and from then on that browser opens every
workspace holding the key, and the box's root list, for 30 days, across restarts. The link
carries a one-use code, never the key. Offered only for keys this workspace accepts and the box
holds too; `notes` says why any other is missing.
*/
async function globalLinks(
  kinds: ('edit' | 'view')[] = ['edit', 'view']
): Promise<{
  links: { kind: 'edit' | 'view'; url: string; short?: string }[]
  notes: string[]
}> {
  const local = resolveGlobalKeys(preview?.tunnel?.globalKeys, {
    PREVIEW_TOKEN:
      process.env.PREVIEW_TOKEN ?? readLocalSecret('PREVIEW_TOKEN'),
    PREVIEW_EDIT_TOKEN:
      process.env.PREVIEW_EDIT_TOKEN ?? readLocalSecret('PREVIEW_EDIT_TOKEN'),
  })
  const box =
    local.keys.edit || local.keys.view ? await previewBoxKeys(host!) : {}
  const plan = planGlobalLinks(local, box)
  const links: { kind: 'edit' | 'view'; url: string; short?: string }[] = []
  for (const kind of plan.kinds.filter((k) => kinds.includes(k))) {
    const label = flag('label')
    const answer = await askForLink(
      `?global=${kind}&domain=${encodeURIComponent(plan.domain!)}${
        label ? `&label=${encodeURIComponent(label)}` : ''
      }`
    )
    if (answer.url && answer.device) {
      // Recorded before the link is shown, so every pass in a browser is on the box's list.
      const recorded = await registerDevice({
        id: answer.device,
        project: projectName,
        // The links printed at start are recorded too, used or not; say which they were.
        label: label ?? (has('link') ? '' : 'printed at tunnel start'),
      })
      if (!recorded) {
        plan.notes.push(
          `could not record device ${answer.device} on ${host}, so no ${kind} link: it could not be listed or revoked`
        )
        continue
      }
    }
    if (answer.url) {
      const short = await registerShortCode(answer.url, plan.domain!)
      if (!short)
        plan.notes.push(
          `no short link (${
            shortLinkProblem || `could not record it on ${host}`
          }); the full link still works`
        )
      links.push({ kind, url: answer.url, short })
    } else
      plan.notes.push(
        answer.error ??
          `the dev server on :${localPort} did not answer, so no ${kind} link: start it (\`bun start\`), then \`tosijs-tunnel --link\``
      )
  }
  return { links, notes: plan.notes }
}
let startLinks: Awaited<ReturnType<typeof globalLinks>> | undefined

/*
DEVICES (board #3416). Each --global edit link is a pass for one device. The box keeps the
record: `_devices/registry.tsv` (not served) lists every pass issued, and `_index/revoked.txt`
(served beside the root list, behind its cookie gate) is what every workspace reads before it
honours a pass. Both live under the preview root, written over the same ssh as the rest.
*/
const devicesRoot = () =>
  previewRootFor(
    preview?.path ?? '/srv/preview/placeholder',
    preview?.caddySitesDir
  )

async function registerDevice(device: {
  id: string
  project: string
  label: string
}): Promise<boolean> {
  const line = deviceRegistryLine({ ...device, issued: new Date() })
  if (!line) return false
  const root = devicesRoot()
  const run =
    await $`ssh -o BatchMode=yes -o ConnectTimeout=10 ${host!} ${`mkdir -p ${root}/_devices && printf '%s\\n' '${line}' >> ${root}/_devices/registry.tsv`}`
      .nothrow()
      .quiet()
  return run.exitCode === 0
}

/*
SHORT LINKS (board #3504): record which workspace a code belongs to, so `https://<domain>/<CODE>`
(or the code typed into the box on the gate and root pages) finds it. See shortCodeScript.
Returns the short link, or undefined if it could not be recorded.
*/
let shortLinkProblem = ''
async function registerShortCode(
  url: string,
  domain: string
): Promise<string | undefined> {
  const code = new URL(url).searchParams.get('t') ?? ''
  const script = shortCodeScript(devicesRoot(), code, url)
  if (!script) {
    shortLinkProblem = `${url} is not a link the box can shorten`
    return undefined
  }
  const run =
    await $`ssh -o BatchMode=yes -o ConnectTimeout=10 ${host!} ${script}`
      .nothrow()
      .quiet()
  if (run.exitCode !== 0) return undefined
  // Read it back through Caddy: a box whose Caddyfile predates short links answers with its
  // gate, and a short link printed over that would lead nowhere.
  const served = await fetch(`https://${domain}/_codes/${code}`, {
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => (res.ok ? res.text() : ''))
    .catch(() => '')
  if (served.trim() !== url) {
    shortLinkProblem = `the box's Caddyfile does not serve short links yet: run \`tosijs-caddy-install --go\``
    return undefined
  }
  return `https://${domain}/${code}`
}

/*
Say where this is going, and where the address came from, BEFORE acting on it.

`tosijs-deploy` is dry-run by default and prints its target; this bin is not — it `ssh`s,
`scp`s a Caddy fragment and reloads Caddy on the resolved host. Now that a machine-global
`~/local-secrets/tosijs-preview.env` can supply the address, "which box is this?" has to be
answerable without reading three files. The config outranks that file precisely so a project
that names its own host cannot be redirected, but silence would still be wrong.
*/
const hostSource = flag('host')
  ? '--host'
  : process.env.PREVIEW_HOST
  ? 'PREVIEW_HOST'
  : process.env.PREVIEW_SSH
  ? 'PREVIEW_SSH (legacy)'
  : preview?.host
  ? 'site config'
  : '~/local-secrets/tosijs-preview.env'

if (!host) {
  console.error(
    `\nNo tunnel host. Set \`preview.host\` in your site config, or pass --host=user@box.\n`
  )
  process.exit(1)
}

/*
pgrep pattern that matches only OUR forward, so --close can't kill someone else's.

`host` is interpolated into a REGEX, so it must be escaped: it is user config
(`user@box.example.com`), and an unescaped `.` matches any character while `+`, `(` or
`*` change the pattern's meaning outright. Unescaped, `me@a.b` also matches `me@axb`.
*/
const rx = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
console.log(`🔌 tunnel host: ${host}  (from ${hostSource})`)

const pattern = `ssh .*-R ${remotePort}:localhost:${tunnelLocalPort} ${rx(
  String(host)
)}`

async function running(): Promise<number[]> {
  const out = await $`pgrep -f ${pattern}`.nothrow().quiet().text()
  return out.trim().split('\n').filter(Boolean).map(Number)
}

if (has('devices')) {
  const root = devicesRoot()
  const read =
    await $`ssh -o BatchMode=yes -o ConnectTimeout=10 ${host!} ${`cat ${root}/_devices/registry.tsv 2>/dev/null; echo ${DEVICE_LISTING_SEPARATOR}; cat ${root}/_index/revoked.txt 2>/dev/null; true`}`
      .nothrow()
      .quiet()
  if (read.exitCode !== 0) {
    console.error(
      `\nCould not read the device list on ${host}: ${read.stderr
        .toString()
        .trim()}\n`
    )
    process.exit(1)
  }
  const devices = parseDeviceListing(read.stdout.toString())
  if (!devices.length) {
    console.log(
      '\nNo edit passes issued yet (`tosijs-tunnel --link --global`).\n'
    )
  } else {
    console.log('')
    for (const d of devices)
      console.log(
        `  ${d.id}  ${d.revoked ? 'REVOKED' : 'active '}  ${d.issued}  ${
          d.project
        }${d.label ? `  "${d.label}"` : ''}`
      )
    console.log(
      `\n  Revoke one with \`tosijs-tunnel --revoke=<id>\`. A pass also expires 30 days after it was issued.\n`
    )
  }
  process.exit(0)
}

if (flag('revoke') !== undefined) {
  const id = flag('revoke')!
  if (!DEVICE_ID_PATTERN.test(id)) {
    console.error(
      `\n${JSON.stringify(
        id
      )} is not a device id (ten letters and digits; see --devices).\n`
    )
    process.exit(1)
  }
  const root = devicesRoot()
  const run =
    await $`ssh -o BatchMode=yes -o ConnectTimeout=10 ${host!} ${`mkdir -p ${root}/_index && printf '%s\\n' ${id} >> ${root}/_index/revoked.txt && chmod 644 ${root}/_index/revoked.txt`}`
      .nothrow()
      .quiet()
  if (run.exitCode !== 0) {
    console.error(
      `\nCould not revoke ${id} on ${host}: ${run.stderr.toString().trim()}\n`
    )
    process.exit(1)
  }
  console.log(
    `\n🔒 ${id} revoked. Every workspace stops honouring its edit pass, and ends its edit sessions, within a minute. It keeps the shared view key until you rotate that.\n`
  )
  process.exit(0)
}

if (has('link')) {
  /*
  Ask the dev server over loopback. The previous version ran
  `pgrep -f 'bun bin/dev.ts'` and signalled every match with SIGUSR2 — which never
  matched the documented `bun start` (`bun --watch bin/dev.ts`), so this command was
  simply broken, and DID match `bun bin/dev.ts --build-only`, killing in-flight builds
  because that process exits before the signal handler is registered. Guessing at a
  process by argv substring was the mistake; an HTTP request to a known port is not a
  guess.
  */
  /*
  `--share` asks for the OTHER kind of link: read-only, and long enough to survive being
  texted to someone. Deliberately one flag rather than `--ttl` + `--read-only`, because two
  orthogonal knobs let you build the combination nobody should have — a week-long
  write-capable token sitting in a chat log.
  */
  const share = has('share')
  const shareTtl = flag('share-ttl')
  const ttl = shareTtl ? `&ttl=${encodeURIComponent(shareTtl)}` : ''
  /*
  `--global` asks for a link that also hands over a global credential (see globalLinks): single-use,
  valid five minutes whatever `--share-ttl` says, and the browser keeps every workspace for 30
  days. Opt-in, because it is a different promise
  from the two links above, which are reusable for their window and open this workspace only.
  A share link spent by a chat app's link preview, or one that opens every workspace, would
  break the promise `--share` makes to the person you send it to.
  */
  let url: string
  let short: string | undefined
  if (has('global')) {
    const global = await globalLinks([share ? 'view' : 'edit'])
    for (const note of global.notes) console.log(`note: ${note}`)
    url = global.links[0]?.url ?? ''
    short = global.links[0]?.short
    if (!url) {
      console.error('\nNo single-use global link (see the note above).\n')
      process.exit(1)
    }
  } else {
    url = (await askForLink(share ? `?share=1${ttl}` : '')).url ?? ''
  }
  if (!url) {
    console.error(
      `\nCould not get a link from https://localhost:${localPort}.\n` +
        `  Is \`bun start\` running? (This asks the dev server directly — it does not\n` +
        `  guess at processes.)\n`
    )
    process.exit(1)
  }
  // Wording derived from nothing is wording that goes stale: this said "single-use, 15 min"
  // for a link that has been reusable for five minutes since 1.11.0. The server prints the
  // authoritative version (with the code on its own line); this is the one-line echo.
  /*
  Print the CODE as well as the URL — the docs said so and the bin did not.

  `doc-site-system.md` documents `tosijs-tunnel --link` printing the link and its
  7-character code, with sample output; only the dev server's own banner did. On the device
  this exists for you are not pasting a URL, you are reading characters off one screen and
  typing them on another, so the code is the part that matters.
  */
  const code = new URL(url).searchParams.get('t')
  console.log(
    `\n🔗 ${
      has('global')
        ? `Single-use ${
            share ? 'READ-ONLY ' : ''
          }link (that browser keeps every workspace for 30 days)`
        : share
        ? 'Share link (READ ONLY)'
        : 'Edit link'
    }:\n   ${url}\n` +
      (short ? `   ${short}   (the same link, shorter)\n` : '') +
      (code
        ? `\n   code:  ${groupCode(code)}   (case-insensitive${
            short
              ? `; or open ${new URL(short).host} and type it into the box`
              : ''
          })\n`
        : '')
  )

  /*
  A link nobody can reach is worse than no link.

  `--link` asks the dev server for a token, which succeeds whether or not a tunnel exists — the
  URL is well-formed and the token is real, it just resolves to a 503 from the reverse proxy
  because nothing is listening upstream. Printed with exit 0 and no comment, that is
  indistinguishable from the far side being down, and the reporter lost a chunk of an afternoon
  to the difference (#94).

  Checked AFTER printing, deliberately: the link is still the thing you asked for, and you may
  be about to start the tunnel. What changes is that the output says so and the exit code agrees
  — a script that treats 0 as "a usable link was produced" is now telling the truth.

  `running()` is the same predicate `--status` uses, matching this project's own forward by its
  exact ports and host rather than by an argv substring.
  */
  const forwards = await running()
  if (forwards.length === 0) {
    console.error(
      `⚠️  No tunnel is running, so that link will answer 503.\n` +
        `    The token is real — nothing is listening on the far side yet.\n` +
        `    Start one with \`tosijs-tunnel\` (or \`bun run tunnel\`), then use the link.\n`
    )
    process.exit(1)
  }
  process.exit(0)
}

if (has('status')) {
  const pids = await running()
  console.log(
    pids.length
      ? `tunnel UP (pid ${pids.join(', ')}) — ${
          publicUrl ?? `remote :${remotePort}`
        }`
      : 'tunnel down'
  )
  /*
  Always say which ports this would use.

  "tunnel down" alone is unfalsifiable: it looks identical whether the tunnel is really
  down or whether this command is simply looking at the wrong port — which is exactly
  what #39 was (server on PORT+1, bin probing a hard-coded 8788, and the advice naming
  the stale default). Printing the numbers makes a mismatch visible at a glance, and
  gives the consumer smoke lane something real to assert on.
  */
  console.log(
    `  forwards localhost:${tunnelLocalPort} → ${
      host ?? '<no host configured>'
    } :${remotePort}  (dev server on :${localPort})`
  )
  process.exit(0)
}

if (has('close')) {
  /*
  Confirm identity before signalling, and leave a receipt.

  `pgrep -f` matches an argv SUBSTRING, so anything whose command line happens to contain
  this pattern matches — a shell running an `echo` of the command, an editor holding a log
  path, another agent tailing output. Signalling on a substring match alone is how a tool
  kills something it never started.

  `killStrayServer` in dev-server.ts already set this norm ("reclaiming a port is
  destructive, so the log says exactly which pid/comm"), but the discipline lived in
  another file and did not travel. Same rule here: check `comm` is really ssh, say what
  was signalled, and name what was skipped and why.
  */
  const pids = await running()
  const closed: number[] = []
  for (const pid of pids) {
    const comm = (
      await $`ps -p ${pid} -o comm=`.nothrow().quiet().text()
    ).trim()
    if (!/(^|\/)ssh$/.test(comm)) {
      console.warn(
        `⚠️  pid ${pid} matched the tunnel pattern but is ${
          comm || 'unknown'
        }, not ssh — leaving it alone.`
      )
      continue
    }
    try {
      process.kill(pid, 'SIGTERM')
      closed.push(pid)
      console.log(`  SIGTERM → pid ${pid} (${comm})`)
    } catch {
      /* already gone between pgrep and here */
    }
  }
  console.log(
    closed.length ? `closed (pid ${closed.join(', ')})` : 'nothing to close'
  )
  process.exit(0)
}

// Refuse to open a second one: two forwards racing for the same remote port means
// whichever sshd accepted first wins and the other silently does nothing, which
// presents as "my edits go to the wrong machine".
const existing = await running()
if (existing.length) {
  console.log(
    `Tunnel already up (pid ${existing.join(', ')}). ` +
      `Use --close first, or --status.\n${publicUrl ?? ''}`
  )
  process.exit(0)
}

/*
Probe the port the tunnel ACTUALLY forwards to, and refuse rather than warn.

This checked the TLS dev port (`localPort`) while forwarding the plain-HTTP tunnel
listener (`tunnelLocalPort`), so a dev server that was up but had no tunnel listener —
exactly what happens on a published version that predates the two-listener design —
passed the check and then 502'd at the public URL with nothing in the logs. `ssh -R`
cannot catch it either: the REMOTE bind succeeds, so `ExitOnForwardFailure` is silent;
it is the local end that connects to nothing. (Reported from a real adoption:
tosijs-ui#28.)

Fail hard. Forwarding to a closed port is not a degraded mode, it is a guaranteed 502,
and a loud local error beats a mystery at the far end.
*/
const tunnelUp =
  await $`curl -s --max-time 4 -o /dev/null http://127.0.0.1:${tunnelLocalPort}/`
    .nothrow()
    .quiet()
if (tunnelUp.exitCode !== 0) {
  console.error(
    `\n🛑 Nothing is listening on http://127.0.0.1:${tunnelLocalPort} — the port this\n` +
      `   tunnel forwards to. Opening it anyway would give you a 502 at ${
        publicUrl ?? 'the public URL'
      }\n` +
      `   with a healthy-looking dev server locally.\n\n` +
      `   Check that:\n` +
      `     • \`bun start\` is running, and\n` +
      `     • your site config sets \`preview.tunnel.localPort\` (defaults to PORT + 1), and\n` +
      `     • your installed tosijs-ui is new enough to bind a tunnel listener —\n` +
      `       versions before 1.9.0-beta.3 served only one TLS port and had no such listener.\n`
  )
  process.exit(1)
}

/*
Self-register this workspace's hostname, exactly as a static deploy does.

Writes /srv/preview/_sites/<name>-tunnel.caddy and reloads only if the whole config
still validates — so a bad fragment leaves the previous good routing serving rather than
breaking every project on the box. Before this, tunnelled hosts were the one thing still
hand-edited into the shared Caddyfile (tosijs-ui#29).
*/
if (publicUrl) {
  let hostname = ''
  try {
    hostname = new URL(publicUrl).hostname
  } catch {
    /* not a URL — skip registration rather than write nonsense */
  }
  if (hostname) {
    /*
    An edit host with no tunnel behind it must EXPLAIN itself, not 502 and not quietly
    serve something else.

    The fragment outlives the tunnel — it stays registered so the hostname keeps its
    certificate and its identity — so the common state is "this host exists, the
    workspace is not running". A bare 502 says nothing. Falling back to the static
    preview would be worse: you would think you were looking at live work when you were
    looking at a snapshot, which is precisely the confusion /version.json exists to
    prevent. So: say the workspace is offline, and link to the preview that IS there.
    */
    const staticUrl = preview?.url ?? ''
    const offline =
      `<!doctype html><meta charset=utf-8><title>Workspace offline</title>` +
      `<style>body{font:16px/1.6 system-ui;margin:15vh auto;max-width:32rem;padding:0 1.5rem;color:#222}` +
      `@media(prefers-color-scheme:dark){body{background:#16171a;color:#e8e8ea}}` +
      `code{background:#8881;padding:.1em .4em;border-radius:4px}</style>` +
      `<h1>${projectName} workspace is offline</h1>` +
      `<p>This is a <em>live</em> workspace — it only answers while its dev server and ` +
      `tunnel are running. Nothing is being served from here right now.</p>` +
      (staticUrl
        ? `<p>The last deployed snapshot is at <a href="${staticUrl}">${staticUrl}</a>.</p>`
        : '') +
      `<p>To bring it back, on the machine that hosts it: <code>bun start</code> then ` +
      `<code>tosijs-tunnel</code>.</p>`
    const fragment =
      `# Generated by \`tosijs-tunnel\` for ${projectName}. Do not hand-edit.\n` +
      `${hostname} {\n` +
      `\treverse_proxy http://127.0.0.1:${remotePort}\n` +
      `\thandle_errors {\n` +
      `\t\theader Content-Type "text/html; charset=utf-8"\n` +
      `\t\theader Cache-Control "no-store"\n` +
      `\t\trespond ${JSON.stringify(offline)} 503\n` +
      `\t}\n` +
      `\timport tunnel_site\n` +
      `}\n`
    const previewRoot = previewRootFor(
      preview?.path ?? '/srv/preview/placeholder',
      preview?.caddySitesDir
    )
    routed = await registerCaddyFragment({
      host: host!,
      previewRoot,
      name: `${projectName}-tunnel`,
      describe: `${hostname} → this workspace`,
      body: fragment,
    })
    if (routed) {
      // The root's list of live workspaces is read from these fragments.
      await refreshHostIndex(host!)
      startLinks = await globalLinks()
    }
  }
}

console.log(`\n🔌 ${host}  :${remotePort} → localhost:${tunnelLocalPort}`)
/*
Only claim the URL works if the route was actually registered.

Printing a public URL over a failed registration is the same lie as printing ✅ over a
failed deploy: it sends you to a hostname that will not resolve to this workspace, and the
natural conclusion is that the tunnel is broken rather than the routing.
*/
if (publicUrl) {
  console.log(
    routed
      ? `   ${publicUrl}`
      : `   ${publicUrl}  ⚠️  NOT routed — registration failed above; this URL will not reach here`
  )
  if (startLinks?.links.length) {
    console.log(
      `\n   Single-use links: each opens this workspace, then keeps that browser in every` +
        `\n   workspace on the box (and its root list) for 30 days:`
    )
    for (const { kind, url, short } of startLinks.links) {
      const code = new URL(url).searchParams.get('t') ?? ''
      console.log(
        `   ${kind}: ${url}${kind === 'view' ? '  (read-only)' : ''}` +
          (short ? `\n         ${short}   code ${groupCode(code)}` : '')
      )
    }
  }
  for (const note of startLinks?.notes ?? []) console.log(`   note: ${note}`)
}
console.log(`   Ctrl-C to close.\n`)

// -N: forwarding only, no remote command.
// ExitOnForwardFailure: if the remote port is taken, fail loudly instead of sitting
// there forwarding nothing while the URL 502s.
// ServerAliveInterval: NAT and hotel wifi drop idle connections silently.
const proc = Bun.spawn(
  [
    'ssh',
    '-N',
    '-o',
    'ExitOnForwardFailure=yes',
    '-o',
    'ServerAliveInterval=30',
    '-o',
    'ServerAliveCountMax=3',
    '-R',
    `${remotePort}:localhost:${tunnelLocalPort}`,
    host,
  ],
  { stdout: 'inherit', stderr: 'inherit' }
)

const close = () => {
  try {
    proc.kill()
  } catch {
    /* already gone */
  }
}
process.on('SIGINT', () => {
  close()
  process.exit(0)
})
process.on('SIGTERM', () => {
  close()
  process.exit(0)
})

const code = await proc.exited
if (code !== 0) console.error(`\nssh exited ${code}`)
process.exit(code ?? 0)
