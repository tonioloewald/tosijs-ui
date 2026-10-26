import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { resolveGlobalKeys } from './resolve-site-config.ts'
import {
  askDevServer,
  globalLinks,
  registerShortCode,
  startLinkLines,
  type DevLinkAnswer,
  type TunnelLinkDeps,
} from './tunnel-links.ts'

/*
The links `tosijs-tunnel` prints (board #3416 item 2, #3506). No lane ran the bin's output, only
its parts, so these drive the link logic end to end with a fake box: `ssh` runs each command
locally under bash against a scratch preview root, `fetchText` plays Caddy by serving
`_codes/<CODE>` from that root (or a gate page, for a box that predates short links), and
`/__devlink` is a real loopback TLS server answering as the dev server does. Nothing here
reaches a real box.
*/

const VIEW = 'view-key-0123456789abcdef'
const EDIT = 'edit-key-0123456789abcdefghijklmn'
const DOMAIN = 'dev.example.com'
const sha256 = (text: string) =>
  new Bun.CryptoHasher('sha256').update(text).digest('hex')

const EDIT_LINK = `https://ui.edit.${DOMAIN}/?t=RCQAMHFX`
const VIEW_LINK = `https://ui.edit.${DOMAIN}/?t=JCYGCCVX`
const DEVICE = 'k3j9x0q2ab'
// For the bin-level test, whose read-back goes over real `fetch`: `.invalid` never resolves
// (RFC 6761), so it fails at once and offline alike, as a box with no short links would.
const BIN_DOMAIN = 'dev.example.invalid'

let root: string
let tlsDir: string
let devServer: ReturnType<typeof Bun.serve>
const devLinkQueries: string[] = []

beforeAll(() => {
  // A self-signed cert for the fake dev server, made here so the lane needs no `tls/`.
  tlsDir = mkdtempSync(join(tmpdir(), 'tunnel-links-tls-'))
  const made = Bun.spawnSync([
    'openssl',
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    join(tlsDir, 'key.pem'),
    '-out',
    join(tlsDir, 'cert.pem'),
    '-subj',
    '/CN=localhost',
    '-days',
    '1',
  ])
  if (made.exitCode !== 0)
    throw new Error(`openssl could not make a test cert: ${made.stderr}`)
  // Answers as dev-server.ts's /__devlink does for `global=`: the link and, for edit, a device.
  devServer = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    tls: {
      key: Bun.file(join(tlsDir, 'key.pem')),
      cert: Bun.file(join(tlsDir, 'cert.pem')),
    },
    fetch(req: Request) {
      const url = new URL(req.url)
      if (url.pathname !== '/__devlink')
        return new Response('not found', { status: 404 })
      devLinkQueries.push(url.search)
      const global = url.searchParams.get('global')
      if (global === null) return new Response('not json')
      const domain = url.searchParams.get('domain')
      if (domain !== DOMAIN && domain !== BIN_DOMAIN)
        return Response.json({ error: 'wrong domain' }, { status: 400 })
      const at = (link: string) => link.replace(DOMAIN, domain)
      if (global === 'edit')
        return Response.json({ url: at(EDIT_LINK), device: DEVICE })
      if (global === 'view') return Response.json({ url: at(VIEW_LINK) })
      return Response.json({ error: 'global must be edit or view' })
    },
  })
})

afterAll(() => {
  devServer.stop(true)
  rmSync(tlsDir, { recursive: true, force: true })
})

/** A fake box under a scratch root, and the deps the bin would pass. */
function fakeBox(
  opts: {
    servesCodes?: boolean
    sshFails?: (command: string) => boolean
    boxKeys?: TunnelLinkDeps['boxKeys']
    askForLink?: (query: string) => Promise<DevLinkAnswer>
    onRequest?: boolean
    label?: string
  } = {}
) {
  root = mkdtempSync(join(tmpdir(), 'tunnel-links-'))
  const commands: string[] = []
  const fetched: string[] = []
  const deps: TunnelLinkDeps = {
    host: 'me@box',
    root,
    projectName: 'ui',
    localPort: devServer.port!,
    label: opts.label,
    onRequest: opts.onRequest ?? false,
    local: resolveGlobalKeys(undefined, {
      PREVIEW_TOKEN: VIEW,
      PREVIEW_EDIT_TOKEN: EDIT,
    }),
    boxKeys:
      opts.boxKeys ??
      (async () => ({
        domain: DOMAIN,
        editSha: sha256(EDIT),
        viewSha: sha256(VIEW),
      })),
    ssh: async (command) => {
      commands.push(command)
      if (opts.sshFails?.(command)) return { exitCode: 255 }
      return { exitCode: Bun.spawnSync(['bash', '-c', command]).exitCode }
    },
    askForLink:
      opts.askForLink ?? ((query) => askDevServer(devServer.port!, query)),
    fetchText: async (url) => {
      fetched.push(url)
      const at = url.match(/^https:\/\/dev\.example\.com\/_codes\/([A-Z]{8})$/)
      if (opts.servesCodes === false)
        // A Caddyfile from before short links: the gate page, for every path.
        return '<!DOCTYPE html><h1>This preview needs an invite link</h1>'
      if (!at || !existsSync(join(root, '_codes', at[1]))) return ''
      return readFileSync(join(root, '_codes', at[1]), 'utf8')
    },
  }
  return { deps, commands, fetched }
}

const cleanup = () => rmSync(root, { recursive: true, force: true })

describe('registerShortCode', () => {
  test('writes the code over ssh, reads it back through Caddy, and returns the short link', async () => {
    const { deps, commands, fetched } = fakeBox()
    try {
      const result = await registerShortCode(deps, EDIT_LINK, DOMAIN)
      expect(result).toEqual({ short: `https://${DOMAIN}/RCQAMHFX` })
      expect(commands.length).toBe(1)
      expect(readFileSync(join(root, '_codes/RCQAMHFX'), 'utf8')).toBe(
        `${EDIT_LINK}\n`
      )
      expect(fetched).toEqual([`https://${DOMAIN}/_codes/RCQAMHFX`])
    } finally {
      cleanup()
    }
  })

  test('a link the box cannot shorten is said so, and nothing is sent to the box', async () => {
    const { deps, commands, fetched } = fakeBox()
    try {
      for (const url of [
        `https://ui.edit.${DOMAIN}/?t=rcqamhfx`,
        `https://ui.edit.${DOMAIN}/?t=RCQ4MHFX`,
        `https://ui.edit.${DOMAIN}/?t=RCQAMHFX&x='`,
      ]) {
        const result = await registerShortCode(deps, url, DOMAIN)
        expect(result.short).toBeUndefined()
        expect(result.problem).toBe(`${url} is not a link the box can shorten`)
      }
      expect(commands).toEqual([])
      expect(fetched).toEqual([])
    } finally {
      cleanup()
    }
  })

  test('a box whose Caddyfile does not serve codes is told to re-run the installer', async () => {
    const { deps } = fakeBox({ servesCodes: false })
    try {
      const result = await registerShortCode(deps, EDIT_LINK, DOMAIN)
      expect(result.short).toBeUndefined()
      expect(result.problem).toBe(
        "the box's Caddyfile does not serve short links yet: run `tosijs-caddy-install --go`"
      )
    } finally {
      cleanup()
    }
  })

  test('an ssh failure is not reported as an old Caddyfile, and nothing is read back', async () => {
    const { deps, fetched } = fakeBox({ sshFails: () => true })
    try {
      const result = await registerShortCode(deps, EDIT_LINK, DOMAIN)
      expect(result).toEqual({ problem: 'could not record it on me@box' })
      expect(fetched).toEqual([])
    } finally {
      cleanup()
    }
  })
})

/** Everything the tunnel would print for these links. */
const printed = (start: { links: unknown[]; notes: string[] }) =>
  startLinkLines(start as Parameters<typeof startLinkLines>[0]).join('\n')

function expectNoKey(text: string) {
  for (const secret of [EDIT, VIEW, sha256(EDIT), sha256(VIEW)])
    expect(text).not.toContain(secret)
}

describe('the links printed at tunnel start', () => {
  test('an edit and a view link, each with its short form and grouped code, and no key', async () => {
    const { deps } = fakeBox()
    try {
      const start = await globalLinks(deps)
      expect(start.notes).toEqual([])
      expect(start.links).toEqual([
        { kind: 'edit', url: EDIT_LINK, short: `https://${DOMAIN}/RCQAMHFX` },
        { kind: 'view', url: VIEW_LINK, short: `https://${DOMAIN}/JCYGCCVX` },
      ])
      const text = printed(start)
      expect(text).toContain(`edit: ${EDIT_LINK}\n`)
      expect(text).toContain(`https://${DOMAIN}/RCQAMHFX   code RCQA MHFX`)
      expect(text).toContain(`view: ${VIEW_LINK}  (read-only)`)
      expect(text).toContain(`https://${DOMAIN}/JCYGCCVX   code JCYG CCVX`)
      expectNoKey(text)
      // The dev server is asked for a link by kind and domain; the key is never sent to it.
      expect(devLinkQueries.slice(-2)).toEqual([
        `?global=edit&domain=${DOMAIN}`,
        `?global=view&domain=${DOMAIN}`,
      ])
      expectNoKey(devLinkQueries.join('\n'))
    } finally {
      cleanup()
    }
  })

  test('the edit pass is recorded on the box first, labelled as printed at start', async () => {
    const { deps, commands } = fakeBox()
    try {
      await globalLinks(deps, ['edit'])
      // Device record, then the short code.
      expect(commands.length).toBe(2)
      expect(commands[0]).toContain('_devices/registry.tsv')
      const [line] = readFileSync(
        join(root, '_devices/registry.tsv'),
        'utf8'
      ).split('\n')
      const [id, issued, project, label] = line.split('\t')
      expect(id).toBe(DEVICE)
      expect(Number.isNaN(Date.parse(issued))).toBe(false)
      expect(project).toBe('ui')
      expect(label).toBe('printed at tunnel start')
      expectNoKey(commands.join('\n'))
    } finally {
      cleanup()
    }
  })

  test('`--link --global --label=…` records that label, and an unlabelled --link records none', async () => {
    for (const [label, expected] of [
      ['headset', 'headset'],
      [undefined, ''],
    ] as const) {
      const { deps } = fakeBox({ onRequest: true, label })
      try {
        await globalLinks(deps, ['edit'])
        const [line] = readFileSync(
          join(root, '_devices/registry.tsv'),
          'utf8'
        ).split('\n')
        expect(line.split('\t')[3] ?? '').toBe(expected)
        if (label)
          expect(devLinkQueries.at(-1)).toBe(
            `?global=edit&domain=${DOMAIN}&label=${label}`
          )
      } finally {
        cleanup()
      }
    }
  })

  test('a box that does not serve codes: the full links still print, each with a note saying why', async () => {
    const { deps } = fakeBox({ servesCodes: false })
    try {
      const start = await globalLinks(deps)
      expect(start.links.map((l) => [l.kind, l.short])).toEqual([
        ['edit', undefined],
        ['view', undefined],
      ])
      const why =
        "no short link (the box's Caddyfile does not serve short links yet: run `tosijs-caddy-install --go`); the full link still works"
      expect(start.notes).toEqual([why, why])
      const text = printed(start)
      expect(text).toContain(`edit: ${EDIT_LINK}`)
      expect(text).not.toContain('code ')
      expect(text).toContain(`note: ${why}`)
      expectNoKey(text)
    } finally {
      cleanup()
    }
  })

  test('a device that cannot be recorded gets no link at all', async () => {
    const { deps } = fakeBox({
      sshFails: (command) => command.includes('registry.tsv'),
    })
    try {
      const start = await globalLinks(deps, ['edit'])
      expect(start.links).toEqual([])
      expect(start.notes).toEqual([
        `could not record device ${DEVICE} on me@box, so no edit link: it could not be listed or revoked`,
      ])
    } finally {
      cleanup()
    }
  })

  test("a key that is not the box's gets no link, and the note names the variable, not the value", async () => {
    const { deps } = fakeBox({
      boxKeys: async () => ({
        domain: DOMAIN,
        editSha: sha256('some-other-edit-key-0123456789'),
        viewSha: sha256(VIEW),
      }),
    })
    try {
      const start = await globalLinks(deps)
      expect(start.links.map((l) => l.kind)).toEqual(['view'])
      expect(start.notes).toEqual([
        "PREVIEW_EDIT_TOKEN here is not the box's, so no edit link: put the same value in both files",
      ])
      expectNoKey(printed(start))
    } finally {
      cleanup()
    }
  })

  test("the dev server's refusal is passed on as the note", async () => {
    const { deps } = fakeBox({
      boxKeys: async () => ({
        domain: 'other.example.com',
        editSha: sha256(EDIT),
        viewSha: sha256(VIEW),
      }),
    })
    try {
      const start = await globalLinks(deps, ['view'])
      expect(start.links).toEqual([])
      expect(start.notes).toEqual(['wrong domain'])
    } finally {
      cleanup()
    }
  })

  test('a dev server that does not answer is named, with how to start it', async () => {
    const { deps } = fakeBox({ askForLink: async () => ({}) })
    try {
      const start = await globalLinks(deps, ['view'])
      expect(start.links).toEqual([])
      expect(start.notes[0]).toContain(
        `the dev server on :${devServer.port} did not answer, so no view link`
      )
    } finally {
      cleanup()
    }
  })

  test('no global key on this machine: no box call, and one note', async () => {
    let asked = false
    const { deps } = fakeBox({
      boxKeys: async () => {
        asked = true
        return {}
      },
    })
    try {
      deps.local = resolveGlobalKeys(undefined, {})
      const start = await globalLinks(deps)
      expect(asked).toBe(false)
      expect(start.links).toEqual([])
      expect(start.notes.length).toBe(1)
      expect(printed(start)).toBe(`   note: ${start.notes[0]}`)
    } finally {
      cleanup()
    }
  })
})

describe('askDevServer, against a loopback server', () => {
  test('passes the query through and parses the answer', async () => {
    expect(
      await askDevServer(devServer.port!, `?global=view&domain=${DOMAIN}`)
    ).toEqual({ url: VIEW_LINK })
  })

  test('an answer that is not JSON, or no server at all, is an empty answer', async () => {
    expect(await askDevServer(devServer.port!, '?share=1')).toEqual({})
    const closed = Bun.serve({ port: 0, fetch: () => new Response('') })
    const port = closed.port!
    closed.stop(true)
    expect(await askDevServer(port, '')).toEqual({})
  })
})

describe('the bin: tosijs-tunnel --link --global', () => {
  /*
  The wiring, which no lane ran: the bin's own `ssh` (a fake on PATH that runs the command
  locally with /etc/caddy and /srv/preview moved into a sandbox, so `previewBoxKeys` reads a real
  preview.env), its curl to the loopback dev server above, and its `fetch` read-back.
  */
  const REPO = new URL('..', import.meta.url).pathname
  // A cold `bun` per test; see SPAWN_TIMEOUT in caddy-install.test.ts.
  const SPAWN_TIMEOUT = 20_000

  async function runTunnel(args: string[]) {
    const sb = mkdtempSync(join(tmpdir(), 'tunnel-bin-'))
    const bin = join(sb, 'bin')
    for (const dir of ['bin', 'etc-caddy', 'srv-preview'])
      mkdirSync(join(sb, dir))
    writeFileSync(
      join(sb, 'etc-caddy/preview.env'),
      `PREVIEW_DOMAIN=${BIN_DOMAIN}\nPREVIEW_TOKEN=${VIEW}\nPREVIEW_EDIT_TOKEN=${EDIT}\n`
    )
    writeFileSync(
      join(bin, 'ssh'),
      `#!/bin/sh\nfor a; do cmd=$a; done\nprintf '%s' "$cmd" | sed -e "s|/etc/caddy|${sb}/etc-caddy|g" -e "s|/srv/preview|${sb}/srv-preview|g" | bash\n`
    )
    // A forward is "running", so --link exits 0 once it has printed.
    writeFileSync(join(bin, 'pgrep'), '#!/bin/sh\necho 4242\n')
    for (const f of ['ssh', 'pgrep']) chmodSync(join(bin, f), 0o755)
    writeFileSync(
      join(sb, 'tosijs-site.config.ts'),
      `export default { name: 'ui', preview: { path: '/srv/preview/ui' } }\n`
    )
    const proc = Bun.spawn(
      [
        'bun',
        join(REPO, 'bin/tunnel.ts'),
        '--host=fake@box',
        `--port=${devServer.port}`,
        ...args,
      ],
      {
        cwd: sb,
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(
              ([k]) => !/^(PREVIEW_|TOSIJS_SITE_CONFIG$)/.test(k)
            )
          ),
          HOME: sb,
          PREVIEW_TOKEN: VIEW,
          PREVIEW_EDIT_TOKEN: EDIT,
          PATH: `${bin}:${process.env.PATH}`,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    )
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    return { code: await proc.exited, out: stdout + stderr, sb }
  }

  test(
    'prints the single-use link and its code, records the device and the code, and never the key',
    async () => {
      const { code, out, sb } = await runTunnel([
        '--link',
        '--global',
        '--label=headset',
      ])
      try {
        expect(out).toContain(`https://ui.edit.${BIN_DOMAIN}/?t=RCQAMHFX`)
        expect(out).toContain('code:  RCQA MHFX')
        // The read-back failed, so no short link is claimed, and the note says why.
        expect(out).not.toContain(`https://${BIN_DOMAIN}/RCQAMHFX`)
        expect(out).toContain(
          "note: no short link (the box's Caddyfile does not serve short links yet"
        )
        expect(code).toBe(0)
        const registry = readFileSync(
          join(sb, 'srv-preview/_devices/registry.tsv'),
          'utf8'
        )
        expect(registry).toMatch(
          new RegExp(`^${DEVICE}\\t[^\\t]+\\tui\\theadset\\n$`)
        )
        expect(
          readFileSync(join(sb, 'srv-preview/_codes/RCQAMHFX'), 'utf8')
        ).toBe(`https://ui.edit.${BIN_DOMAIN}/?t=RCQAMHFX\n`)
        expectNoKey(out)
      } finally {
        rmSync(sb, { recursive: true, force: true })
      }
    },
    SPAWN_TIMEOUT
  )

  test(
    '--share asks for the view link, and prints no key either',
    async () => {
      const { code, out, sb } = await runTunnel([
        '--link',
        '--global',
        '--share',
      ])
      try {
        expect(code).toBe(0)
        expect(out).toContain('Single-use READ-ONLY link')
        expect(out).toContain(`https://ui.edit.${BIN_DOMAIN}/?t=JCYGCCVX`)
        expectNoKey(out)
      } finally {
        rmSync(sb, { recursive: true, force: true })
      }
    },
    SPAWN_TIMEOUT
  )
})
