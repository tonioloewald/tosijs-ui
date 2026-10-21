import { test, expect } from './fixtures'
import { spawn, type ChildProcess } from 'child_process'
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs'
import { request as httpRequest } from 'http'
import { request as httpsRequest } from 'https'
import { createServer } from 'net'
import { tmpdir } from 'os'
import * as path from 'path'
import { createServer as createHttpServer, type Server } from 'http'
import { signPass } from '../src/doc-system/site/dev-auth'

/*
The preview host's global keys, through the real dev server's TUNNEL listener.

A redeemed edit link sets a signed device pass (`tosi_pass`), a view link the view key
(`tosi_preview`), across the preview domain, and Caddy forwards to the tunnel listener with the
public Host. The box's revoked-device list is served here by a stand-in (`TOSIJS_REVOKED_URL`). These requests do what Caddy would, so they are plain HTTP to
127.0.0.1 with that Host, sent with node's http client for full control over the headers (a
browser would refuse the Secure cookies over plain HTTP, which is fine: in use the hop to the
browser is HTTPS).
*/

test.describe.configure({ mode: 'serial' })

const REPO = path.resolve('.')
const HOST = 'proj.edit.dev.example.test'
const LIST = 'https://dev.example.test'
const EDIT = 'edit_key_for_the_global_keys_spec'
const VIEW = 'view_key_for_the_global_keys_spec'
let dir = ''
let tunnelPort = 0
let port = 0
let server: ChildProcess | undefined
let revokedServer: Server | undefined
let revokedPort = 0
/** What the stand-in for the box's revoked.txt answers. */
const revokedList = { status: 200, body: 'revokedd01\n' }

/** A pass for `device`, signed with the workspace's edit key (or `key`). */
const passFor = (device: string, key = EDIT, exp = Date.now() + 86400_000) =>
  `tosi_pass=${signPass(
    { device, domain: 'dev.example.test', label: '', exp },
    key
  )}`
const PASS = passFor('activedev1')

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, () => {
      const { port } = probe.address() as { port: number }
      probe.close(() => resolve(port))
    })
  })

interface Reply {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

/** One request to the tunnel listener, as Caddy would forward it. */
const viaTunnel = (
  pathname: string,
  opts: {
    method?: string
    headers?: Record<string, string>
    body?: string
  } = {}
) =>
  new Promise<Reply>((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port: tunnelPort,
        path: pathname,
        method: opts.method ?? 'GET',
        headers: { host: HOST, ...opts.headers },
      },
      (res) => {
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () =>
          resolve({ status: res.statusCode!, headers: res.headers, body })
        )
      }
    )
    req.once('error', reject)
    req.end(opts.body)
  })

const navigate = (cookie: string, pathname = '/') =>
  viaTunnel(pathname, {
    headers: { cookie, 'sec-fetch-mode': 'navigate', accept: 'text/html' },
  })

/** The session cookie a 302 handed over, as `name=value`. */
const sessionFrom = (reply: Reply) => {
  const set = [reply.headers['set-cookie'] ?? []].flat()
  const cookie = set.find((c) => c.startsWith('tosi_dev_session='))
  expect(cookie, 'a session cookie').toBeTruthy()
  expect(cookie).toContain('Max-Age=86400')
  return cookie!.split(';')[0]
}

const save = (cookie: string, origin: string) =>
  viaTunnel('/__docstore/data', {
    method: 'POST',
    headers: {
      cookie,
      origin,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      file: 'static/levels/ocean.json',
      content: '{"name":"saved"}\n',
    }),
  })

test.beforeAll(async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'one server is enough to test a server')
  test.setTimeout(120_000)
  dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'tosijs-keys-')))
  mkdirSync(path.join(dir, 'docs'))
  writeFileSync(path.join(dir, 'docs/index.html'), '<!doctype html><p>home')
  mkdirSync(path.join(dir, 'static/levels'), { recursive: true })
  writeFileSync(path.join(dir, 'static/levels/ocean.json'), '{}\n')
  writeFileSync(path.join(dir, 'package.json'), '{"name":"keys-test"}\n')
  symlinkSync(path.join(REPO, 'tls'), path.join(dir, 'tls'))

  port = await freePort()
  tunnelPort = await freePort()
  revokedServer = createHttpServer((_req, res) => {
    res.writeHead(revokedList.status, { 'content-type': 'text/plain' })
    res.end(revokedList.body)
  })
  await new Promise<void>((resolve) => revokedServer!.listen(0, resolve))
  revokedPort = (revokedServer.address() as { port: number }).port
  await startServer()
})

/** Start the dev server on the spec's ports; called again to restart it. */
async function startServer() {
  const config = {
    name: 'Keys Test',
    outputDir: 'docs',
    audit: false,
    editableData: ['static/levels'],
    preview: {
      host: 'nobody@example.invalid',
      tunnel: { url: `https://${HOST}`, localPort: tunnelPort },
    },
  }
  server = spawn(
    'bun',
    [
      '-e',
      `
      import { devServer } from ${JSON.stringify(
        path.join(REPO, 'src/doc-system/site/index.ts')
      )}
      await devServer(${JSON.stringify(config)}, { build: () => {} })
      `,
    ],
    {
      cwd: dir,
      env: {
        ...process.env,
        // The developer's own ~/local-secrets must not reach this server.
        HOME: dir,
        PORT: String(port),
        PREVIEW_EDIT_TOKEN: EDIT,
        PREVIEW_TOKEN: VIEW,
        DEV_SKIP_PREFLIGHT: '1',
        DEV_NO_WATCH: '1',
        HALTIJA_DEV: '0',
        TOSIJS_TRUST_LAN: '',
        TOSIJS_REVOKED_URL: `http://127.0.0.1:${revokedPort}/revoked.txt?d={domain}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  let output = ''
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`dev server did not start:\n${output}`)),
      60_000
    )
    const listen = (chunk: Buffer) => {
      output += chunk
      if (output.includes('Tunnel listener on')) {
        clearTimeout(timer)
        resolve()
      }
    }
    server!.stdout!.on('data', listen)
    server!.stderr!.on('data', listen)
    server!.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`dev server exited ${code}:\n${output}`))
    })
  })
}

/** Stop the dev server and wait for it to go, as `bun --watch` does on a source edit. */
async function stopServer() {
  const exited = new Promise((resolve) => server!.once('exit', resolve))
  server!.kill('SIGTERM')
  await exited
}

test.afterAll(() => {
  server?.kill('SIGTERM')
  revokedServer?.close()
  if (dir) rmSync(dir, { recursive: true, force: true })
})

test('the edit key opens the workspace and can save from its own origin only', async () => {
  expect((await navigate('')).status, 'no key, no session').toBe(401)

  const exchanged = await navigate(PASS)
  expect(exchanged.status).toBe(302)
  expect(exchanged.headers.location).toBe('/')
  const session = sessionFrom(exchanged)

  const page = await navigate(`${PASS}; ${session}`)
  expect(page.status).toBe(200)
  expect(page.body).toContain('home')

  expect((await save(session, `https://${HOST}`)).status).toBe(200)
  // Every host under the preview domain is the same SITE, so its POSTs carry the cookie.
  expect((await save(session, 'https://other.dev.example.test')).status).toBe(
    403
  )
})

test('the view key opens the workspace read-only', async () => {
  const exchanged = await navigate(`tosi_preview=${VIEW}`)
  expect(exchanged.status).toBe(302)
  const session = sessionFrom(exchanged)
  expect((await navigate(session)).status).toBe(200)
  expect((await save(session, `https://${HOST}`)).status).toBe(403)
  // The edit key on top of a read-only session upgrades it.
  expect((await navigate(`${PASS}; ${session}`)).status).toBe(302)
})

test('the exchange never redirects off this origin', async () => {
  const reply = await navigate(PASS, '//evil.example/x')
  expect(reply.status).toBe(302)
  expect(reply.headers.location).toBe('/evil.example/x')
})

test('the raw edit key, a pass signed with another key, an expired or a revoked pass is no key', async () => {
  // Through 1.16.30 the cookie held the key itself; it could not be revoked per device.
  expect((await navigate(`tosi_edit=${EDIT}`)).status).toBe(401)
  expect((await navigate(passFor('activedev1', VIEW))).status).toBe(401)
  expect(
    (await navigate(passFor('activedev1', EDIT, Date.now() - 1))).status
  ).toBe(401)
  expect((await navigate(passFor('revokedd01'))).status).toBe(401)
  // A pass for a device not on the list still opens it.
  expect((await navigate(passFor('otherdev01'))).status).toBe(302)
})

test('a wrong key, or a key in the wrong cookie, is no key', async () => {
  expect((await navigate(`${PASS}x`)).status).toBe(401)
  expect((await navigate(`tosi_preview=${EDIT}`)).status).toBe(401)
  // A fetch is not a page load: no exchange, so no session.
  const fetched = await viaTunnel('/', {
    headers: { cookie: PASS, 'sec-fetch-mode': 'cors' },
  })
  expect(fetched.status).toBe(401)
  // Nor is one from a sibling workspace, which receives the same domain cookie.
  const sibling = await viaTunnel('/', {
    headers: {
      cookie: PASS,
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
  })
  expect(sibling.status).toBe(401)
})

test('the box root may ask what the reader can do here, and no one else may', async () => {
  const probe = (origin: string | undefined, cookie: string) =>
    viaTunnel('/__alive', {
      headers: { cookie, ...(origin ? { origin } : {}) },
    })
  const edit = await probe(LIST, PASS)
  expect(edit.status).toBe(200)
  expect(edit.headers['access-control-allow-origin']).toBe(LIST)
  expect(edit.headers['access-control-allow-credentials']).toBe('true')
  expect(JSON.parse(edit.body)).toEqual({ name: 'Keys Test', access: 'edit' })
  expect(JSON.parse((await probe(LIST, `tosi_preview=${VIEW}`)).body)).toEqual({
    name: 'Keys Test',
    access: 'view',
  })
  expect(JSON.parse((await probe(LIST, '')).body).access).toBe(null)

  const elsewhere = await probe('https://evil.example', PASS)
  expect(elsewhere.status).toBe(204)
  expect(elsewhere.headers['access-control-allow-origin']).toBeUndefined()
  // The tunnel bin's own liveness check is unchanged.
  expect((await probe(undefined, '')).status).toBe(204)
})

/** Ask the dev server for a link, as `tosijs-tunnel` does: loopback, the main listener. */
const devlink = (query: string, headers: Record<string, string> = {}) =>
  new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = httpsRequest(
      {
        host: '127.0.0.1',
        port,
        path: `/__devlink${query}`,
        headers,
        rejectUnauthorized: false,
      },
      (res) => {
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () =>
          resolve({
            status: res.statusCode!,
            body: body.startsWith('{') ? JSON.parse(body) : body,
          })
        )
      }
    )
    req.once('error', reject)
    req.end()
  })

test('a single-use link opens the workspace and hands this browser the global key', async () => {
  // The link carries a one-use code, never the key; the key arrives as a domain cookie.
  const { status, body } = await devlink('?global=edit&domain=dev.example.test')
  expect(status).toBe(200)
  expect(body.url).not.toContain(EDIT)
  const code = new URL(body.url).searchParams.get('t')!
  const redeemed = await navigate('', `/?t=${code}`)
  expect(redeemed.status).toBe(302)
  const cookies = [redeemed.headers['set-cookie'] ?? []].flat()
  expect(cookies.some((c) => c.startsWith('tosi_dev_session='))).toBe(true)
  // A pass for one device, never the key; the view key for the box's list and static
  // previews; and any raw edit key an earlier version left, expired.
  expect(body.device).toMatch(/^[a-z0-9]{10}$/)
  const pass = cookies.find((c) => c.startsWith('tosi_pass='))!
  expect(pass).toContain(
    '; Domain=.dev.example.test; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax'
  )
  expect(pass).not.toContain(EDIT)
  expect(
    cookies.some((c) =>
      c.startsWith(`tosi_preview=${VIEW}; Domain=.dev.example.test;`)
    )
  ).toBe(true)
  expect(cookies).toContain(
    'tosi_edit=; Domain=.dev.example.test; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
  )
  // The pass opens the workspace in a later visit, after the session is gone.
  expect((await navigate(pass.split(';')[0])).status).toBe(302)
  // Spent: a second browser gets nothing from it.
  const again = await navigate('', `/?t=${code}`)
  expect([again.headers['set-cookie'] ?? []].flat().join()).not.toContain(
    'tosi_pass='
  )
})

test('when the revoked list cannot be read, no pass is honoured', async () => {
  // A fresh device id: the server has no cached answer for this domain only if it never
  // fetched, so restart it with the list failing.
  revokedList.status = 500
  await stopServer()
  await startServer()
  try {
    expect((await navigate(PASS)).status).toBe(401)
    // The view key does not depend on the list.
    expect((await navigate(`tosi_preview=${VIEW}`)).status).toBe(302)
  } finally {
    revokedList.status = 200
    await stopServer()
    await startServer()
  }
})

test('a view link hands over the view key, and opens read-only', async () => {
  const { body } = await devlink('?global=view&domain=dev.example.test')
  const code = new URL(body.url).searchParams.get('t')!
  const redeemed = await navigate('', `/?t=${code}`)
  const cookies = [redeemed.headers['set-cookie'] ?? []].flat()
  expect(
    cookies.some((c) =>
      c.startsWith(`tosi_preview=${VIEW}; Domain=.dev.example.test;`)
    )
  ).toBe(true)
  expect(cookies.join()).not.toContain('tosi_edit=')
  const session = cookies
    .find((c) => c.startsWith('tosi_dev_session='))!
    .split(';')[0]
  expect((await save(session, `https://${HOST}`)).status).toBe(403)
})

test('no granting link for a domain the workspace is not under', async () => {
  for (const domain of ['elsewhere.test', 'test', 'xample.test']) {
    const { status, body } = await devlink(`?global=edit&domain=${domain}`)
    expect(status).toBe(400)
    expect(body.error).toContain('is not a domain')
  }
  expect((await devlink('?global=admin&domain=dev.example.test')).status).toBe(
    400
  )
})

test('a page in the browser cannot mint links', async () => {
  // Every code is a live credential, and a granting one carries the box's key.
  for (const headers of [
    { 'sec-fetch-site': 'cross-site' },
    { origin: 'https://evil.example' },
  ] as Record<string, string>[]) {
    expect(
      (await devlink('?global=view&domain=dev.example.test', headers)).status
    ).toBe(404)
    expect((await devlink('', headers)).status).toBe(404)
  }
})

test('outstanding single-use global links are capped', async () => {
  let minted = 0
  for (; minted < 40; minted++) {
    const { status, body } = await devlink(
      '?global=view&domain=dev.example.test'
    )
    if (status !== 200) {
      expect(status).toBe(400)
      expect(body.error).toContain('already outstanding')
      break
    }
  }
  expect(minted).toBeLessThanOrEqual(32)
  expect(minted).toBeGreaterThan(25)
})

/*
A restart must not cost a key holder their session (the maintainer, 2026-10-20). `bun start`
runs under `bun --watch`, whose graph holds the component sources, so editing an example in a
doc comment restarts the whole process. Sessions live in memory and die with it; the key cookie
is what brings the reader back.
*/
test('a restart costs a key holder nothing', async () => {
  const before = sessionFrom(await navigate(PASS))
  expect((await save(before, `https://${HOST}`)).status).toBe(200)

  await stopServer()
  await startServer()

  // A save from the page that was open across the restart: renewed in place, no reload.
  const key = PASS
  const stale = `${key}; ${before}`
  const saved = await save(stale, `https://${HOST}`)
  expect(saved.status).toBe(200)
  const renewed = [saved.headers['set-cookie'] ?? []]
    .flat()
    .find((c) => c.startsWith('tosi_dev_session='))
  expect(renewed, 'the save hands back a fresh session').toBeTruthy()
  expect((await save(renewed!.split(';')[0], `https://${HOST}`)).status).toBe(
    200
  )
  // A sibling workspace's page shares the key cookie, and must not spend it here.
  const sibling = await save(stale, 'https://other.dev.example.test')
  expect(sibling.status).not.toBe(200)
  expect(sibling.headers['set-cookie']).toBeUndefined()
  // Nor may a request with no evidence of where it came from.
  const bare = await viaTunnel('/__docstore/data', {
    method: 'POST',
    headers: { cookie: stale, 'content-type': 'application/json' },
    body: '{}',
  })
  expect(bare.status).toBe(401)
  expect(bare.headers['set-cookie']).toBeUndefined()

  // The reload: the stale session plus the key cookie is exchanged for a fresh session.
  const reloaded = await navigate(`${PASS}; ${before}`)
  expect(reloaded.status).toBe(302)
  const after = sessionFrom(reloaded)
  expect(after).not.toBe(before)
  expect((await navigate(`${PASS}; ${after}`)).status).toBe(200)
  expect((await save(after, `https://${HOST}`)).status).toBe(200)
})
