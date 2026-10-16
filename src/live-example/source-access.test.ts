import { test, expect, afterEach } from 'bun:test'
import {
  sourceAccess,
  sourceWritable,
  hasSourceEndpoint,
  resetSourceAccess,
  SOURCE_ACCESS_HEADER,
  SOURCE_ENDPOINT_SNIPPET,
} from './source-access.js'

afterEach(() => {
  resetSourceAccess()
  delete (window as any).__tosiSourceEndpoint
})

const answering = (status: number, headers: Record<string, string> = {}) => {
  const asked: { url: string; method?: string }[] = []
  const fetcher = (async (url: string, init?: RequestInit) => {
    asked.push({ url, method: init?.method })
    return new Response(null, { status, headers })
  }) as unknown as typeof fetch
  return { fetcher, asked }
}

test('the dev server admitting a HEAD of the file means Save to source is offered', async () => {
  const { fetcher, asked } = answering(200, {
    [SOURCE_ACCESS_HEADER]: 'editable',
  })
  expect(sourceWritable('src/docs/a b.md')).toBe(false)
  expect(await sourceAccess('src/docs/a b.md', fetcher)).toBe(true)
  expect(sourceWritable('src/docs/a b.md')).toBe(true)
  expect(asked).toEqual([
    { url: '/__docstore/source?file=src%2Fdocs%2Fa%20b.md', method: 'HEAD' },
  ])
})

test('a 200 without the header is a static host, not the dev server', async () => {
  // A host that rewrites every path to index.html answers 200 too.
  expect(await sourceAccess('a.md', answering(200).fetcher)).toBe(false)
})

test('refused, missing or unreachable all mean no', async () => {
  for (const status of [403, 404, 501]) {
    resetSourceAccess()
    expect(await sourceAccess('a.md', answering(status).fetcher)).toBe(false)
  }
  resetSourceAccess()
  const failing = (async () => {
    throw new Error('offline')
  }) as unknown as typeof fetch
  expect(await sourceAccess('a.md', failing)).toBe(false)
})

test('asked once per file: one refusal does not decide for other files', async () => {
  const refused = answering(403)
  await sourceAccess('a.md', refused.fetcher)
  await sourceAccess('a.md', refused.fetcher)
  expect(refused.asked.length).toBe(1)
  const admitted = answering(200, { [SOURCE_ACCESS_HEADER]: 'editable' })
  expect(await sourceAccess('b.md', admitted.fetcher)).toBe(true)
  expect(sourceWritable('a.md')).toBe(false)
})

test('only a page the dev server marked has an endpoint to ask', () => {
  expect(hasSourceEndpoint()).toBe(false)
  const holder = document.createElement('div')
  holder.innerHTML = SOURCE_ENDPOINT_SNIPPET
  // The marker is a script the server injects; run what it says.
  new Function(holder.querySelector('script')!.textContent!)()
  expect(hasSourceEndpoint()).toBe(true)
})
