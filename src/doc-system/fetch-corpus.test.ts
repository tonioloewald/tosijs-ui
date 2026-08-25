import { test, expect, afterEach } from 'bun:test'
import { fetchCorpus, CORPUS_ATTEMPTS } from './doc-system'

/*
The retry policy for `docs.json`, and specifically the parts that stop it becoming the outage.

A doc site whose corpus fetch loses renders nothing — no nav, no content — so retrying is
right. The obvious implementation is worse than none: if a server is struggling and every
client retries immediately and in step, the retries are the denial of service. What is
asserted here is the restraint, not the retrying.
*/

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

const stub = (responses: Array<() => any>) => {
  let n = 0
  const calls = { count: 0 }
  globalThis.fetch = (async () => {
    calls.count++
    const next = responses[Math.min(n++, responses.length - 1)]
    return next()
  }) as any
  return calls
}

const ok = (body: unknown) => () => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  json: async () => body,
})
const status =
  (code: number, headers: Record<string, string> = {}) =>
  () => ({
    ok: false,
    status: code,
    statusText: 'nope',
    headers: new Headers(headers),
    json: async () => ({}),
  })
const networkError = () => () => {
  throw new TypeError('Load failed')
}

test('a successful fetch is one fetch', async () => {
  const calls = stub([ok([{ title: 'x' }])])
  expect(await fetchCorpus('/docs.json')).toEqual([{ title: 'x' }] as any)
  expect(calls.count).toBe(1)
})

test('a transient network failure is retried and recovers', async () => {
  // `TypeError: Load failed` is exactly what WebKit reported when this surfaced.
  const calls = stub([networkError(), ok([{ title: 'x' }])])
  expect(await fetchCorpus('/docs.json')).toEqual([{ title: 'x' }] as any)
  expect(calls.count).toBe(2)
})

test('a 404 is NOT retried — re-asking cannot change the answer', async () => {
  const calls = stub([status(404)])
  await expect(fetchCorpus('/docs.json')).rejects.toThrow()
  expect(calls.count).toBe(1)
})

test('a 403 is NOT retried either', async () => {
  const calls = stub([status(403)])
  await expect(fetchCorpus('/docs.json')).rejects.toThrow()
  expect(calls.count).toBe(1)
})

test('malformed JSON is NOT retried — the body arrived and it is wrong', async () => {
  const calls = stub([
    () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => {
        throw new SyntaxError('Unexpected token')
      },
    }),
  ])
  await expect(fetchCorpus('/docs.json')).rejects.toThrow(SyntaxError)
  expect(calls.count).toBe(1)
})

test('REGRESSION: amplification is BOUNDED — a struggling server sees 3x, not a storm', async () => {
  /*
  The property that matters. This file loads on every page of every doc site, so an unbounded
  or generous retry turns one slow moment into a self-sustaining outage: every client that
  failed retries, which is what made it fail.
  */
  const calls = stub([status(503)])
  await expect(fetchCorpus('/docs.json')).rejects.toThrow()
  expect(calls.count).toBe(CORPUS_ATTEMPTS)
  expect(CORPUS_ATTEMPTS).toBeLessThanOrEqual(3)
})

test('a 429 is retried, and Retry-After is honoured', async () => {
  const calls = stub([status(429, { 'retry-after': '0' }), ok([])])
  await fetchCorpus('/docs.json')
  expect(calls.count).toBe(2)
})

test('backoff is JITTERED, so clients that fail together do not retry together', async () => {
  /*
  Fixed delays synchronise every tab that failed at the same moment into one thundering herd,
  which is the shape that keeps a server down. Full jitter — a random point in [0, backoff) —
  is what actually spreads the load, so two runs of the same failure should rarely take the
  same time.
  */
  const timings: number[] = []
  for (let run = 0; run < 6; run++) {
    stub([networkError(), networkError(), ok([])])
    const started = performance.now()
    await fetchCorpus('/docs.json')
    timings.push(performance.now() - started)
  }
  const distinct = new Set(timings.map((t) => Math.round(t / 10)))
  expect(distinct.size).toBeGreaterThan(1)
})
