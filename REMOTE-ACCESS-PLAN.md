# Remote Access Plan

Make it easy to reach a `tosijs-ui` dev server from anywhere — a phone, a client's
browser, a reviewer on another continent — without deploying anything.

> **Revision note.** The first draft of this plan was drafted against a generic
> Express/Connect dev server. `tosijs-ui`'s dev server is `Bun.serve`, HTTPS-only, and
> ships a **source-file write endpoint**, so several steps needed reworking rather than
> transcribing. The corrections are marked **⚠️ CHANGED** and explained where they
> appear, so the reasoning survives even if the code drifts.

---

## 0. Threat model — read before implementing

This is the part that determines the design, so it goes first.

A `tosijs-ui` dev server is **not** a static preview. Exposing it publicly exposes:

| Surface | What it does | Risk if reachable |
| --- | --- | --- |
| `POST /__docstore/source` | **Writes arbitrary content to any file in the repo** (`handleWriteSource` → `Bun.write`) | **Remote code execution.** Path traversal *is* blocked (`resolveInRepo` confines to `PROJECT_ROOT`), but "any file in the repo" includes `package.json` scripts and any source the watcher rebuilds — and the dev server rebuilds and executes repo code. |
| `GET /__docstore/source` | Reads any file in the repo | Source disclosure, including anything gitignored that happens to sit in the tree (`.env`, `tls/key.pem`). |
| `POST /report` | Accepts test-result payloads | Log/state injection; low severity. |
| The site itself | Unreleased work | Disclosure. Usually the *reason* you're sharing it, but be deliberate. |

The write endpoint already refuses unless `editableSources` is on. **That flag plus a
public tunnel is the dangerous combination**, and the whole point of "edit in the
browser, save to source" means people will have it on.

**Design consequence:** remote mode must **force-disable source writing**, not merely
authenticate it. Auth is a control that can be misconfigured, phished, or shoulder-
surfed; removing the capability is not. Sharing a preview and editing your source from
a café are different features and should not share a mode.

---

## 1. UpCloud instance + DNS

Unchanged from the original plan, and a sound choice — a €3/month Helsinki Developer
instance gives a dedicated IPv4, 1 GB RAM, and **zero-cost egress**, which matters for
a tunnel carrying full page reloads.

1. Deploy a €3/month Developer instance (Helsinki), Debian or Ubuntu minimal.
2. Wildcard A-record `*.dev.yourdomain.com` → the instance's static IPv4.
3. Firewall: inbound `80`, `443` (web) and `2222` (SSH multiplexer).

**⚠️ CHANGED — restrict on-demand certificates.** `--https-ondemand-certificate` makes
`sish` request a Let's Encrypt certificate for *any* hostname that gets hit. Under a
wildcard DNS record, a stranger (or a scanner) hitting `random-junk.dev.yourdomain.com`
triggers issuance, and LE's rate limits are per registered domain — enough scanning
locks you out of issuing certs for the domain entirely. Either pin the subdomains you
actually use, or accept it knowingly with a bounded set.

## 2. Deploy the multiplexer (`sish`)

```bash
mkdir -p ~/sish/pubkeys ~/sish/keys
echo "ssh-ed25519 AAAAC3... your-mac-key" > ~/sish/pubkeys/mac.pub

docker run -itd --name sish \
  -v ~/sish/pubkeys:/pubkeys \
  -v ~/sish/keys:/keys \
  --net=host antoniomika/sish:latest \
  --ssh-address=:2222 \
  --http-address=:80 \
  --https-address=:443 \
  --https=true \
  --https-ondemand-certificate \
  --https-ondemand-certificate-accept-terms \
  --domain=dev.yourdomain.com \
  --authentication=true \
  --authentication-keys-directory=/pubkeys \
  --private-keys-directory=/keys
```

`--authentication=true` with a pubkeys directory is the important line: only your key
can bind a tunnel, so nobody else can claim `yourapp.dev.yourdomain.com`. Keep it.

Mounting `~/sish/keys` persists the server's SSH host identity across restarts —
without it every reboot changes the host key and your client refuses to connect.

## 3. ⚠️ CHANGED — a plain-HTTP loopback listener for the tunnel

**The original plan cannot connect.** It forwards `-R subdomain:80:localhost:<port>`,
i.e. `sish` opens a **plain HTTP** connection to your local port. But this dev server
is **HTTPS-only** — it binds with `tls: { key, cert }` from `./tls/` and
`ensureDevCerts()` refuses to start without them. `sish` would speak HTTP at a TLS
socket and every request would fail.

Three ways out; the third is the one to build:

1. *Serve HTTP locally in remote mode* — breaks the local HTTPS workflow, and some
   browser APIs are secure-context-only, so the remote view would differ from the local
   one. No.
2. *Have `sish` speak TLS to the backend* — it would have to trust your mkcert CA, which
   it has no reason to. No.
3. **Bind a second, loopback-only, plain-HTTP listener used solely by the tunnel.** ✅

Only `127.0.0.1` traffic is unencrypted, and it is immediately picked up by SSH for the
wire. Public TLS is terminated by `sish` with a real Let's Encrypt certificate. Local
HTTPS is untouched.

```ts
// In devServer(), when remote mode is on. Same fetch handler, different transport.
const remoteServer = Bun.serve({
  port: REMOTE_LOOPBACK_PORT,   // e.g. PORT + 1
  hostname: '127.0.0.1',        // NEVER 0.0.0.0 — this listener has no TLS
  fetch: withRemoteAuth(fetchHandler),
})
```

`hostname: '127.0.0.1'` is load-bearing. Bound to `0.0.0.0` this is an unauthenticated
plaintext copy of your dev server on the LAN — the exact hole the tunnel was supposed to
avoid.

## 4. ⚠️ CHANGED — ephemeral auth, `Bun.serve`-shaped

The original middleware is Express/Connect (`app.use`, `req/res/next`). This server is
`Bun.serve` with a single `fetch(request)`. Rewritten as a wrapper, with three
substantive fixes:

- **⚠️ Entropy: `randomBytes(4)` is 32 bits.** That's ~4.3 billion — brute-forceable in
  hours against a public URL with no lockout, and the attacker gets source read/write if
  they land it. Use **16 bytes / 128 bits**. It costs nothing: you paste it once.
- **⚠️ Timing-safe comparison.** `password === sessionPassword` short-circuits on the
  first differing byte. Use `crypto.timingSafeEqual` with an explicit length guard
  (it throws on length mismatch).
- **⚠️ Fail closed.** If remote mode is on and a secret was somehow not generated, refuse
  every request. Never let a missing secret mean "no auth required."

```ts
import { randomBytes, timingSafeEqual } from 'node:crypto'

let remoteSecret: string | null = null

function startRemoteAuth(subdomain: string, port: number) {
  remoteSecret = randomBytes(16).toString('base64url')   // 128 bits
  console.log(`\n🌐 Remote access: https://${subdomain}.dev.yourdomain.com`)
  console.log(`   user: dev`)
  console.log(`   pass: ${remoteSecret}`)
  console.log(`   Source editing is DISABLED while remote access is on.\n`)
}

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a), bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

const unauthorized = () =>
  new Response('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="tosijs-ui dev"' },
  })

function withRemoteAuth(handler: (req: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    if (!remoteSecret) return unauthorized()      // fail closed

    const url = new URL(request.url)
    // Belt and braces: the capability is already disabled in remote mode (§5),
    // so this can only ever fire if that wiring regresses.
    if (url.pathname === '/__docstore/source') {
      return new Response('disabled for remote access', { status: 403 })
    }

    const b64 = (request.headers.get('authorization') || '').split(' ')[1] || ''
    const [user, pass] = Buffer.from(b64, 'base64').toString().split(':')
    if (user !== 'dev' || !pass || !safeEqual(pass, remoteSecret)) {
      // Cheap throttle: makes online guessing hopeless without real state.
      await Bun.sleep(250)
      return unauthorized()
    }
    return handler(request)
  }
}
```

**Note on Basic auth.** It replays the secret on every request and browsers cache it for
the session. Over `sish`'s real TLS that is acceptable for a dev tunnel, and it is the
only scheme that works in *any* client with no UI to build. The 128-bit secret is what
makes it safe; do not economise there.

## 5. ⚠️ NEW — force-disable source writing in remote mode

The single most important change to the plan.

```ts
// Remote mode is a PREVIEW mode. Editing your source from a coffee shop and
// sharing a preview are different features; sharing must not imply the other.
if (remote && config.editableSources) {
  console.warn(
    '⚠️  editableSources is ON but remote access was requested — source editing is\n' +
    '    DISABLED for this session. The write endpoint takes a repo-relative path and\n' +
    '    arbitrary content, and the watcher rebuilds and runs what it writes, so\n' +
    '    exposing it publicly is remote code execution behind one password.\n' +
    '    Run without --remote to edit source.'
  )
}
const effectiveEditableSources = config.editableSources && !remote
```

Disable the **capability**, not just the route — one flag consulted by both the router
and the client-side "edit" affordance, so the UI doesn't offer a button that 403s.

## 6. ⚠️ CHANGED — tunnel lifecycle

The original relies on `process.on('exit')`, which does **not** fire on `SIGKILL`, and
kills only the direct child.

This repo already learned this the hard way with haltija: *"`kill()` on the `bunx`
wrapper does not kill Electron; a survivor holds the inherited stdout open so the
command looks hung after it has exited."* `dev-server.ts` grew `descendantsOf()` for
exactly this. Reuse it.

```ts
const tunnel = spawn([
  'ssh',
  '-o', 'ExitOnForwardFailure=yes',   // fail fast if the subdomain is taken
  '-o', 'ServerAliveInterval=30',     // survive NAT idle timeouts
  '-N',                               // no remote command; forwarding only
  '-p', '2222',
  '-R', `${subdomain}:80:127.0.0.1:${REMOTE_LOOPBACK_PORT}`,
  'dev.yourdomain.com',
], { stdio: ['ignore', 'inherit', 'inherit'] })

const stopTunnel = async () => {
  for (const pid of await descendantsOf(tunnel.pid)) {
    try { process.kill(pid, 'SIGTERM') } catch {}
  }
  try { tunnel.kill() } catch {}
}
process.on('SIGINT', () => { void stopTunnel().then(() => process.exit(0)) })
process.on('SIGTERM', () => { void stopTunnel().then(() => process.exit(0)) })
```

`ExitOnForwardFailure=yes` matters: without it, a subdomain collision leaves you with a
live SSH session forwarding nothing, and a URL that silently 404s.

**Also raise the idle-exit guard's priority.** A tunnelled server is one you walk away
from — that's the point. `idleTimeoutHours` (default 8) now bounds *public exposure*, not
just memory. Consider a shorter timeout in remote mode, and print when it will fire.

## 7. ⚠️ CORRECTED — how this interacts with haltija

The original follow-up answer says haltija will work over the tunnel but may hit a Basic
Auth challenge. **The more important fact is different, and it's in our own code.**

The haltija dev-channel loader is injected at serve time and **gated to localhost**:

```js
self===top && /^localhost$|^127\./.test(location.hostname) && import('https://localhost:8701/dev.js')
```

Over `https://app.dev.yourdomain.com` that regex fails, so **the dev channel never
loads**. This is correct and deliberate — the channel is a private, server-only HTTPS
socket on 8701 that exists to let an agent drive *your* page. It must not follow the
page onto the public internet, and it couldn't work anyway (the remote browser can't
reach your Mac's 8701).

So:

- **Agent driving the page → keep haltija local.** Point `hj` at
  `https://localhost:8787`. No tunnel, no auth challenge, no round-trip to Helsinki.
- **The tunnel is for humans** — a phone, a reviewer, a client. Different job.
- Do not "fix" the localhost gate to make haltija work remotely. That gate is a security
  boundary, not an oversight.

For the record, the rest of that answer is right: `sish` provisions genuine LE certs so
no TLS-verification flags are needed, and it passes `Upgrade` headers if you later add
websockets. (Today the dev server has none — reloads are full page loads — so there is
no HMR socket to preserve.)

## 8. CLI surface

```bash
bun start --remote                 # random subdomain
bun start --remote=myapp           # stable subdomain
```

Remote mode should print, at startup, in one block: the public URL, the credentials, that
source editing is off, and when the idle timeout fires. If any part of the setup fails
(no SSH key, tunnel refused, subdomain taken), **fail loudly and serve locally only** —
never silently fall back to an unauthenticated public listener.

---

## Implementation order

1. **§5 first** (disable source writes in remote mode). It is the one that turns a
   vulnerability into a feature, and it's a few lines.
2. §3 loopback listener — without it nothing connects at all.
3. §4 auth wrapper.
4. §6 tunnel spawn + teardown.
5. §1/§2 infra last; it's independent and can be stood up any time.

## Open questions

- **Is Basic auth enough, or do you want a one-time link?** A signed cookie set by a
  `?token=…` first visit is friendlier to share over chat (no separate password) and
  keeps the secret out of the browser's credential store. More code, better UX.
- **Should remote mode force `haltijaDev: false`?** The loader self-disables off
  localhost, so it's belt-and-braces — but the served HTML would still carry a snippet
  referencing your machine, which is a small information leak.
- **Multi-project.** Several projects tunnelling at once need distinct subdomains;
  deriving one from the directory name (as haltija does for its socket routing) would
  avoid collisions without a flag.
