#!/usr/bin/env bun
/*
Expose THIS machine's dev server at an authenticated public URL.

  tosijs-tunnel          # open the tunnel (foreground; Ctrl-C closes it)
  tosijs-tunnel --status # is one already up?
  tosijs-tunnel --close  # close any tunnel this project opened
  tosijs-tunnel --link   # ask the dev server to print a fresh single-use edit link

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
import { tmpdir } from 'os'
import {
  resolveSiteConfig,
  resolveTunnelLocalPort,
} from './resolve-site-config'

const siteConfig = await resolveSiteConfig()

const args = process.argv.slice(2)
const has = (n: string) => args.includes(`--${n}`)
const flag = (n: string) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.slice(n.length + 3) : undefined
}

const preview = siteConfig.preview
const host = flag('host') ?? process.env.PREVIEW_HOST ?? preview?.host
const localPort = Number(
  flag('port') ?? process.env.PORT ?? siteConfig.port ?? 8787
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
const tunnelLocalPort = Number(
  flag('local-port') ?? resolveTunnelLocalPort(siteConfig, {})
)
const publicUrl = flag('url') ?? preview?.tunnel?.url

if (!host) {
  console.error(
    `\nNo tunnel host. Set \`preview.host\` in your site config, or pass --host=user@box.\n`
  )
  process.exit(1)
}

/** pgrep pattern that matches only OUR forward, so --close can't kill someone else's. */
const pattern = `ssh .*-R ${remotePort}:localhost:${tunnelLocalPort} ${host}`

async function running(): Promise<number[]> {
  const out = await $`pgrep -f ${pattern}`.nothrow().quiet().text()
  return out.trim().split('\n').filter(Boolean).map(Number)
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
  const res =
    await $`curl -sk --max-time 5 https://localhost:${localPort}/__devlink`
      .nothrow()
      .quiet()
  let url = ''
  try {
    url = JSON.parse(res.stdout.toString()).url
  } catch {
    /* fall through to the error below */
  }
  if (!url) {
    console.error(
      `\nCould not get a link from https://localhost:${localPort}.\n` +
        `  Is \`bun start\` running? (This asks the dev server directly — it does not\n` +
        `  guess at processes.)\n`
    )
    process.exit(1)
  }
  console.log(`\n🔗 Single-use edit link (valid 15 min):\n   ${url}\n`)
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
  const pids = await running()
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      /* already gone */
    }
  }
  console.log(
    pids.length ? `closed (pid ${pids.join(', ')})` : 'nothing to close'
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
    const local = `${tmpdir()}/${projectName}-tunnel.caddy`
    await Bun.write(local, fragment)
    const put =
      await $`scp -q ${local} ${`${host}:/srv/preview/_sites/${projectName}-tunnel.caddy`}`
        .nothrow()
        .quiet()
    if (put.exitCode === 0) {
      const check =
        await $`ssh ${host} ${'set -a; . /etc/caddy/preview.env 2>/dev/null; set +a; caddy validate --config /etc/caddy/Caddyfile'}`
          .nothrow()
          .quiet()
      if (check.exitCode === 0) {
        await $`ssh ${host} systemctl reload caddy`.nothrow().quiet()
        console.log(`   registered ${hostname} → :${remotePort}`)
      } else {
        console.error(
          `\n🛑 Caddy config invalid after registering ${hostname} — NOT reloading.\n` +
            `   The previous config keeps serving. Fix or remove\n` +
            `   /srv/preview/_sites/${projectName}-tunnel.caddy on the host.\n`
        )
      }
    }
  }
}

console.log(`\n🔌 ${host}  :${remotePort} → localhost:${tunnelLocalPort}`)
if (publicUrl) console.log(`   ${publicUrl}`)
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
