import { test, expect } from 'bun:test'
import {
  revocationList,
  revocationUrl,
  parseRevoked,
  REVOCATION_FRESH_MS,
  REVOCATION_STALE_MS,
} from './device-revocation.js'

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
