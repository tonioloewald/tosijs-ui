/*
The links `tosijs-tunnel` prints: single-use global links (`--link --global`, and the ones
printed at tunnel start), the device record behind each edit pass, and the short link the box
can answer for a code.

Split out of bin/tunnel.ts so it can be tested without a box (board #3416 item 2, #3506): the
bin is a script that runs on import, so everything that reaches the network is passed in here
(`ssh`, `fetchText`, `askForLink`) and the bin wires the real ones.
*/

import { $ } from 'bun'
import {
  deviceRegistryLine,
  groupCode,
  planGlobalLinks,
  shortCodeScript,
  type BoxKeys,
} from './resolve-site-config.ts'
import type { GlobalKeys } from '../dist/doc-system/site/dev-auth.js'

export type LinkKind = 'edit' | 'view'

export interface DevLinkAnswer {
  url?: string
  device?: string
  error?: string
}

export interface GlobalLink {
  kind: LinkKind
  url: string
  short?: string
}

export interface TunnelLinkDeps {
  /** The preview box, as ssh names it. */
  host: string
  /** The preview root on the box (`/srv/preview`), where `_devices/` and `_codes/` live. */
  root: string
  projectName: string
  /** The dev server's TLS port, for messages. */
  localPort: number
  /** `--label=`, naming the device a `--global` edit link is for. */
  label?: string
  /** True for `--link`; false for the links printed at tunnel start. */
  onRequest: boolean
  /** This machine's global keys, as `resolveGlobalKeys` read them. */
  local: { keys: GlobalKeys; problems: string[] }
  /** The box's domain and key fingerprints (`previewBoxKeys`). */
  boxKeys: () => Promise<BoxKeys>
  /** Run one command on the box; only the exit code is used. */
  ssh: (command: string) => Promise<{ exitCode: number }>
  /** Ask the dev server (loopback only) for a link; `query` selects the kind. */
  askForLink: (query: string) => Promise<DevLinkAnswer>
  /** GET a URL and return its body, or '' for anything but a 2xx. Never throws. */
  fetchText: (url: string) => Promise<string>
}

/*
SHORT LINKS (board #3504): record which workspace a code belongs to, so `https://<domain>/<CODE>`
(or the code typed into the box on the gate and root pages) finds it. See shortCodeScript.
Returns the short link, or the reason there is none (the full link still works either way).
*/
export async function registerShortCode(
  deps: Pick<TunnelLinkDeps, 'host' | 'root' | 'ssh' | 'fetchText'>,
  url: string,
  domain: string
): Promise<{ short?: string; problem?: string }> {
  const code = new URL(url).searchParams.get('t') ?? ''
  const script = shortCodeScript(deps.root, code, url)
  if (!script) return { problem: `${url} is not a link the box can shorten` }
  const run = await deps.ssh(script)
  if (run.exitCode !== 0)
    return { problem: `could not record it on ${deps.host}` }
  // Read it back through Caddy: a box whose Caddyfile predates short links answers with its
  // gate, and a short link printed over that would lead nowhere.
  const served = await deps.fetchText(`https://${domain}/_codes/${code}`)
  if (served.trim() !== url)
    return {
      problem: `the box's Caddyfile does not serve short links yet: run \`tosijs-caddy-install --go\``,
    }
  return { short: `https://${domain}/${code}` }
}

/** Append one line to the box's device registry. False if it could not be recorded. */
export async function registerDevice(
  deps: Pick<TunnelLinkDeps, 'root' | 'ssh'>,
  device: { id: string; project: string; label: string },
  issued = new Date()
): Promise<boolean> {
  const line = deviceRegistryLine({ ...device, issued })
  if (!line) return false
  const run = await deps.ssh(
    `mkdir -p ${deps.root}/_devices && printf '%s\\n' '${line}' >> ${deps.root}/_devices/registry.tsv`
  )
  return run.exitCode === 0
}

/*
Single-use links that also give the browser the box's global key (see GlobalGrant in
dev-auth.ts): one click opens this workspace, and from then on that browser opens every
workspace holding the key, and the box's root list, for 30 days, across restarts. The link
carries a one-use code, never the key. Offered only for keys this workspace accepts and the box
holds too; `notes` says why any other is missing.
*/
export async function globalLinks(
  deps: TunnelLinkDeps,
  kinds: LinkKind[] = ['edit', 'view']
): Promise<{ links: GlobalLink[]; notes: string[] }> {
  const { local, label } = deps
  const box: BoxKeys =
    local.keys.edit || local.keys.view ? await deps.boxKeys() : {}
  const plan = planGlobalLinks(local, box)
  const links: GlobalLink[] = []
  for (const kind of plan.kinds.filter((k) => kinds.includes(k))) {
    const answer = await deps.askForLink(
      `?global=${kind}&domain=${encodeURIComponent(plan.domain!)}${
        label ? `&label=${encodeURIComponent(label)}` : ''
      }`
    )
    if (answer.url && answer.device) {
      // Recorded before the link is shown, so every pass in a browser is on the box's list.
      const recorded = await registerDevice(deps, {
        id: answer.device,
        project: deps.projectName,
        // The links printed at start are recorded too, used or not; say which they were.
        label: label ?? (deps.onRequest ? '' : 'printed at tunnel start'),
      })
      if (!recorded) {
        plan.notes.push(
          `could not record device ${answer.device} on ${deps.host}, so no ${kind} link: it could not be listed or revoked`
        )
        continue
      }
    }
    if (answer.url) {
      const { short, problem } = await registerShortCode(
        deps,
        answer.url,
        plan.domain!
      )
      if (!short)
        plan.notes.push(`no short link (${problem}); the full link still works`)
      links.push({ kind, url: answer.url, short })
    } else
      plan.notes.push(
        answer.error ??
          `the dev server on :${deps.localPort} did not answer, so no ${kind} link: start it (\`bun start\`), then \`tosijs-tunnel --link\``
      )
  }
  return { links, notes: plan.notes }
}

/** What the tunnel prints under its public URL at start: the links, then the notes. */
export function startLinkLines(start: {
  links: GlobalLink[]
  notes: string[]
}): string[] {
  const lines: string[] = []
  if (start.links.length) {
    lines.push(
      `\n   Single-use links: each opens this workspace, then keeps that browser in every` +
        `\n   workspace on the box (and its root list) for 30 days:`
    )
    for (const { kind, url, short } of start.links) {
      const code = new URL(url).searchParams.get('t') ?? ''
      lines.push(
        `   ${kind}: ${url}${kind === 'view' ? '  (read-only)' : ''}` +
          (short ? `\n         ${short}   code ${groupCode(code)}` : '')
      )
    }
  }
  for (const note of start.notes) lines.push(`   note: ${note}`)
  return lines
}

/** The real `askForLink`: the dev server's `/__devlink`, on loopback, over its TLS port. */
export async function askDevServer(
  localPort: number,
  query: string
): Promise<DevLinkAnswer> {
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

/** The real `ssh`: never prompts or hangs, since a link is waiting on it. */
export async function sshTo(
  host: string,
  command: string
): Promise<{ exitCode: number }> {
  return $`ssh -o BatchMode=yes -o ConnectTimeout=10 ${host} ${command}`
    .nothrow()
    .quiet()
}

/** The real `fetchText`. */
export async function fetchText(url: string): Promise<string> {
  return fetch(url, { signal: AbortSignal.timeout(5000) })
    .then((res) => (res.ok ? res.text() : ''))
    .catch(() => '')
}
