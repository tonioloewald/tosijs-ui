/*
Expose THIS machine's dev server at an authenticated public URL.

  bun run tunnel          # open the tunnel (foreground; Ctrl-C closes it)
  bun run tunnel --status # is one already up?
  bun run tunnel --close  # close any tunnel this project opened
  bun run tunnel --link   # ask the dev server to print a fresh single-use edit link

The work happens where the data is. The repo, the dev server, the build and the
watcher all stay here; the box terminates TLS and checks a password and does no
compute at all. That is what makes it scale — N projects tunnel their own workspace
to one small VPS, rather than the VPS trying to be a build farm.

WHY THIS IS SAFE, given the dev server's source endpoints are otherwise loopback-only:

  - The box runs sshd with `GatewayPorts no`, so the forwarded port is bound to
    127.0.0.1 THERE and is not reachable from the internet. Caddy is the only thing
    that can talk to it, and Caddy demands basicauth first.
  - `ssh -R` delivers to `localhost` HERE, so the dev server sees a loopback peer and
    its read/write endpoints work — correctly, because reaching that socket at all
    required passing the front door. The location check and the authentication check
    compose rather than fight.

So: closed by default, open only through something that authenticates.
*/

import { $ } from 'bun'
import siteConfig from '../tosijs-site.config'

const args = process.argv.slice(2)
const has = (n: string) => args.includes(`--${n}`)
const flag = (n: string) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.slice(n.length + 3) : undefined
}

const preview = (
  siteConfig as {
    preview?: { host?: string; tunnel?: { remotePort?: number; url?: string } }
  }
).preview
const host = flag('host') ?? process.env.PREVIEW_HOST ?? preview?.host
const localPort = Number(
  flag('port') ?? process.env.PORT ?? siteConfig.port ?? 8787
)
const remotePort = Number(
  flag('remote-port') ?? preview?.tunnel?.remotePort ?? 9787
)
// Forward to the dedicated LOOPBACK listener, not the TLS dev port. Arriving there is
// what marks a request as remote, so writes require a session — an unforgeable signal,
// unlike a header. It is plain HTTP, which also removes the proxy's need to skip TLS
// verification against a self-signed dev cert.
const tunnelLocalPort = Number(
  flag('local-port') ?? preview?.tunnel?.localPort ?? 8788
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

// Is the dev server actually up? A tunnel to nothing yields a confusing 502 at the
// far end rather than an obvious local error.
const alive =
  await $`curl -sk --max-time 4 -o /dev/null https://localhost:${localPort}/`
    .nothrow()
    .quiet()
if (alive.exitCode !== 0) {
  console.warn(
    `⚠️  Nothing answering on https://localhost:${localPort} — start \`bun start\` first,\n` +
      `   or the public URL will 502.\n`
  )
}

/*
VERIFY the remote binding rather than assuming it.

The safety argument used to rest entirely on the box running `GatewayPorts no` — remote
configuration this tool could not see, did not check, and would not complain about. If
that box ever says `yes`, the forwarded port binds 0.0.0.0 and the workspace is exposed
to the internet with no proxy in front of it.

The listener split means an exposed port still cannot write without a session, so this
is defence in depth rather than the only wall — but "your workspace is readable by the
internet" deserves to be said out loud, not inferred.
*/
const bind =
  await $`ssh ${host} ${`ss -ltn 2>/dev/null | grep -w ${remotePort} || true`}`
    .nothrow()
    .quiet()
    .text()
if (bind.trim() && !/127\.0\.0\.1:|\[::1\]:/.test(bind)) {
  console.warn(
    `\n⚠️  Remote port ${remotePort} is NOT bound to loopback on ${host}:\n` +
      bind
        .trim()
        .split('\n')
        .map((l) => '     ' + l.trim())
        .join('\n') +
      `\n   That means sshd has GatewayPorts enabled and this port is reachable from\n` +
      `   the internet WITHOUT the authenticating proxy in front of it. Writes still\n` +
      `   require a session, but anyone can read the workspace.\n` +
      `   Fix: set \`GatewayPorts no\` in the box's sshd_config and reload sshd.\n`
  )
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
