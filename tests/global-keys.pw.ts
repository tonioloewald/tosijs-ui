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

/*
The preview host's global keys, through the real dev server's TUNNEL listener.

Caddy sets `tosi_edit` / `tosi_preview` across the preview domain and forwards to the tunnel
listener with the public Host. These requests do what Caddy would, so they are plain HTTP to
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
})

test.afterAll(() => {
  server?.kill('SIGTERM')
  if (dir) rmSync(dir, { recursive: true, force: true })
})

test('the edit key opens the workspace and can save from its own origin only', async () => {
  expect((await navigate('')).status, 'no key, no session').toBe(401)

  const exchanged = await navigate(`tosi_edit=${EDIT}`)
  expect(exchanged.status).toBe(302)
  expect(exchanged.headers.location).toBe('/')
  const session = sessionFrom(exchanged)

  const page = await navigate(`tosi_edit=${EDIT}; ${session}`)
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
  expect((await navigate(`tosi_edit=${EDIT}; ${session}`)).status).toBe(302)
})

test('the exchange never redirects off this origin', async () => {
  const reply = await navigate(`tosi_edit=${EDIT}`, '//evil.example/x')
  expect(reply.status).toBe(302)
  expect(reply.headers.location).toBe('/evil.example/x')
})

test('a wrong key, or a key in the wrong cookie, is no key', async () => {
  expect((await navigate(`tosi_edit=${EDIT}x`)).status).toBe(401)
  expect((await navigate(`tosi_preview=${EDIT}`)).status).toBe(401)
  // A fetch is not a page load: no exchange, so no session.
  const fetched = await viaTunnel('/', {
    headers: { cookie: `tosi_edit=${EDIT}`, 'sec-fetch-mode': 'cors' },
  })
  expect(fetched.status).toBe(401)
})

test('the box root may ask what the reader can do here, and no one else may', async () => {
  const probe = (origin: string | undefined, cookie: string) =>
    viaTunnel('/__alive', {
      headers: { cookie, ...(origin ? { origin } : {}) },
    })
  const edit = await probe(LIST, `tosi_edit=${EDIT}`)
  expect(edit.status).toBe(200)
  expect(edit.headers['access-control-allow-origin']).toBe(LIST)
  expect(edit.headers['access-control-allow-credentials']).toBe('true')
  expect(JSON.parse(edit.body)).toEqual({ name: 'Keys Test', access: 'edit' })
  expect(JSON.parse((await probe(LIST, `tosi_preview=${VIEW}`)).body)).toEqual({
    name: 'Keys Test',
    access: 'view',
  })
  expect(JSON.parse((await probe(LIST, '')).body).access).toBe(null)

  const elsewhere = await probe('https://evil.example', `tosi_edit=${EDIT}`)
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
  expect(cookies).toContain(
    `tosi_edit=${EDIT}; Domain=.dev.example.test; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`
  )
  // Spent: a second browser gets nothing from it.
  const again = await navigate('', `/?t=${code}`)
  expect([again.headers['set-cookie'] ?? []].flat().join()).not.toContain(
    'tosi_edit='
  )
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
