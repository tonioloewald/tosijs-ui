import { test, expect } from 'bun:test'
import {
  revocationList,
  revocationUrl,
  parseRevoked,
  REVOCATION_FRESH_MS,
  REVOCATION_STALE_MS,
  startRevocationSweep,
} from './device-revocation.js'
import {
  createAuthState,
  globalKeyExchange,
  issueSession,
  sessionCookie,
  signPass,
  sourceRequestAdmission,
  GLOBAL_KEY_SESSION_TTL_MS,
  GLOBAL_PASS_COOKIE,
} from './dev-auth.js'

/*
The revoked-device list a workspace reads from the box before it honours a device pass. It must
fail CLOSED: a list it cannot read and has no recent copy of means no pass is honoured.
*/

function box(answers: Array<() => Response | Promise<Response>>) {
  const calls: { url: string; cookie: string | null }[] = []
  const changes: Array<[string, string | null]> = []
  let clock = 1_000_000
  const list = revocationList({
    editKey: 'the-edit-key-for-these-tests',
    now: () => clock,
    onChange: (domain, problem) => changes.push([domain, problem]),
    fetch: async (url, init) => {
      calls.push({
        url,
        cookie: new Headers(init.headers).get('cookie'),
      })
      const answer = answers.shift()
      if (!answer) throw new Error('no more answers')
      return answer()
    },
  })
  return { list, calls, changes, tick: (ms: number) => (clock += ms) }
}

const ok = (body: string) => () => new Response(body, { status: 200 })

test('reads the box list behind its cookie gate, and parses only ids', async () => {
  const { list, calls } = box([ok('device0001\n  device0002 \nnot an id\n\n')])
  expect(await list.current('dev.example.com')).toEqual(
    new Set(['device0001', 'device0002'])
  )
  expect(calls[0].url).toBe('https://dev.example.com/revoked.txt')
  expect(calls[0].cookie).toBe('tosi_edit=the-edit-key-for-these-tests')
  expect(list.domains()).toEqual(['dev.example.com'])
})

test('a 404 is an empty list: a box that never revoked anything has no file', async () => {
  const { list } = box([() => new Response('', { status: 404 })])
  expect(await list.current('dev.example.com')).toEqual(new Set())
})

test('is cached for a minute, then served stale while it is fetched again behind', async () => {
  const { list, calls, tick } = box([ok('device0001\n'), ok('device0002\n')])
  await list.current('d.example')
  tick(REVOCATION_FRESH_MS - 1)
  expect(await list.current('d.example')).toEqual(new Set(['device0001']))
  expect(calls).toHaveLength(1)
  tick(2)
  // No request waits on the box while a trusted copy exists.
  expect(await list.current('d.example')).toEqual(new Set(['device0001']))
  expect(calls).toHaveLength(2)
  await new Promise((r) => setTimeout(r, 0))
  expect(await list.current('d.example')).toEqual(new Set(['device0002']))
})

test('refresh fetches whatever the cache holds (the sweep)', async () => {
  const { list, calls } = box([ok('device0001\n'), ok('device0002\n')])
  await list.current('d.example')
  expect(await list.refresh('d.example')).toEqual(new Set(['device0002']))
  expect(calls).toHaveLength(2)
})

test('a box that fails is asked again at most once a minute, and the failure is reported once', async () => {
  const fail = () => new Response('Link required', { status: 401 })
  const { list, calls, changes, tick } = box([fail, fail, ok('')])
  expect(await list.current('d.example')).toBeNull()
  expect(await list.current('d.example')).toBeNull()
  expect(calls).toHaveLength(1)
  tick(REVOCATION_FRESH_MS)
  expect(await list.current('d.example')).toBeNull()
  expect(calls).toHaveLength(2)
  expect(changes).toEqual([
    ['d.example', 'https://d.example/revoked.txt answered 401'],
  ])
  tick(REVOCATION_FRESH_MS)
  expect(await list.current('d.example')).toEqual(new Set())
  expect(changes.at(-1)).toEqual(['d.example', null])
})

test('concurrent checks share one fetch', async () => {
  const { list, calls } = box([ok('device0001\n')])
  const [a, b] = await Promise.all([
    list.current('d.example'),
    list.current('d.example'),
  ])
  expect(a).toEqual(b)
  expect(calls).toHaveLength(1)
})

test('fails closed: unreadable with no recent copy honours nothing', async () => {
  for (const failure of [
    () => new Response('Link required', { status: 401 }),
    () => new Response('', { status: 500 }),
    () => new Response('', { status: 302, headers: { location: '/' } }),
    () => Promise.reject(new Error('offline')),
  ]) {
    const { list } = box([failure])
    expect(await list.current('d.example')).toBeNull()
  }
})

test('a failed refresh keeps the last good list for ten minutes, then gives up', async () => {
  const fail = () => Promise.reject(new Error('offline'))
  const { list, tick, changes } = box([ok('device0001\n'), fail, fail])
  await list.current('d.example')
  tick(REVOCATION_FRESH_MS + 1)
  expect(await list.current('d.example')).toEqual(new Set(['device0001']))
  await new Promise((r) => setTimeout(r, 0))
  expect(changes).toEqual([])
  tick(REVOCATION_STALE_MS)
  expect(await list.current('d.example')).toBeNull()
  expect(changes[0][1]).toContain('could not be read (offline)')
})

test('a test may point the list elsewhere', () => {
  expect(
    revocationUrl('dev.example.com', 'http://127.0.0.1:9/r?d={domain}')
  ).toBe('http://127.0.0.1:9/r?d=dev.example.com')
  expect(parseRevoked('a\nabcdefghij\nABCDEFGHIJ\n')).toEqual(
    new Set(['abcdefghij'])
  )
})

/*
#3484: a request that already holds a writing session never consults the revoked list (the dev
server's withKeySession short-circuits it), so the once-a-minute sweep is the only thing that ends
a revoked device's open session. Driven through the real pieces: the pass, the page-load
exchange, the session tagged with its device, the sweep the dev server starts, and the write gate.
*/
test('the sweep ends a revoked device’s writing session, and its next write is refused', async () => {
  const EDIT = 'the-edit-key-for-these-tests'
  const HOST = 'proj.edit.dev.example.com'
  const DOMAIN = 'dev.example.com'
  const keys = { edit: EDIT, editGrants: 'edit' as const }
  let clock = 1_000_000
  const answers = [ok(''), ok('device0001\n')]
  const list = revocationList({
    editKey: EDIT,
    now: () => clock,
    fetch: async () => answers.shift()!(),
  })
  const auth = createAuthState()
  const ticks: Array<() => void> = []
  startRevocationSweep({
    list,
    auth,
    every: (tick, ms) => {
      expect(ms).toBe(REVOCATION_FRESH_MS)
      ticks.push(tick)
    },
  })

  // Grant: the device's pass, on a page load over the tunnel, becomes a writing session.
  const pass = `${GLOBAL_PASS_COOKIE}=${signPass(
    { device: 'device0001', domain: DOMAIN, label: '', exp: clock + 86400_000 },
    EDIT
  )}`
  const revoked = await list.current(DOMAIN)
  expect(revoked).toEqual(new Set())
  const navigation = new Request(`https://${HOST}/`, {
    headers: { cookie: pass, 'sec-fetch-mode': 'navigate' },
  })
  expect(
    globalKeyExchange(navigation, {
      viaTunnel: true,
      auth,
      keys,
      now: clock,
      revoked,
    })
  ).toBe('edit')
  const session = issueSession(auth, clock, GLOBAL_KEY_SESSION_TTL_MS, false)
  auth.sessionDevices.set(session, 'device0001')
  const cookie = sessionCookie(session).split(';')[0]
  const write = () =>
    sourceRequestAdmission(
      new Request(`https://${HOST}/__docstore/source`, {
        method: 'POST',
        headers: {
          cookie: `${pass}; ${cookie}`,
          origin: `https://${HOST}`,
          'sec-fetch-site': 'same-origin',
        },
      }),
      { viaTunnel: true, peer: '127.0.0.1', auth, now: clock }
    )
  expect(write()).toBe('session')

  // Revoked on the box. Until a sweep runs the open session still writes: nothing on its
  // request path asks the list.
  clock += REVOCATION_FRESH_MS + 1
  expect(write()).toBe('session')

  expect(ticks).toHaveLength(1)
  ticks[0]()
  await new Promise((r) => setTimeout(r, 0))
  expect(answers).toHaveLength(0)
  expect(auth.sessionDevices.size).toBe(0)
  expect(write()).toBeNull()
})
