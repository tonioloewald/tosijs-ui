import { test, expect, afterEach } from 'bun:test'
import {
  sourceAccess,
  resetSourceAccess,
  SOURCE_ACCESS_HEADER,
} from './source-access.js'

afterEach(resetSourceAccess)

const answering = (status: number, headers: Record<string, string> = {}) => {
  const asked: string[] = []
  const fetcher = (async (url: string) => {
    asked.push(url)
    return new Response('x', { status, headers })
  }) as unknown as typeof fetch
  return { fetcher, asked }
}

test('the dev server admitting the read means Save to source is offered', async () => {
  const { fetcher, asked } = answering(200, {
    [SOURCE_ACCESS_HEADER]: 'editable',
  })
  expect(await sourceAccess('src/docs/a b.md', fetcher)).toBe(true)
  expect(asked).toEqual(['/__docstore/source?file=src%2Fdocs%2Fa%20b.md'])
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

test('asked once per page', async () => {
  const { fetcher, asked } = answering(403)
  await sourceAccess('a.md', fetcher)
  await sourceAccess('b.md', fetcher)
  expect(asked.length).toBe(1)
})
