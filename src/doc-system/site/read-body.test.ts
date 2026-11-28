import { describe, expect, test } from 'bun:test'
import { readBodyCapped, readJsonCapped } from './read-body'

/*
#4379: every body-reading endpoint read the whole body before checking its size. These prove the
cap stops the read: a stream that would go on for far longer than the cap is cancelled after
pulling just past it.
*/
const streamOf = (chunk: Uint8Array, chunks: number) => {
  let pulled = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled >= chunks) return controller.close()
      pulled += 1
      controller.enqueue(chunk)
    },
  })
  return { body, pulled: () => pulled }
}

const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request('https://example.test/x', {
    method: 'POST',
    body,
    headers,
    // @ts-expect-error: a streamed request body needs half-duplex
    duplex: 'half',
  })

describe('readBodyCapped (#4379)', () => {
  test('a declared Content-Length over the cap is refused before reading', async () => {
    const { body, pulled } = streamOf(new Uint8Array(1024), 10)
    const out = await readBodyCapped(
      post(body, { 'Content-Length': '10240' }),
      1000
    )
    expect(out).toBeNull()
    // A stream pulls one chunk as it is constructed; reading would pull the other nine.
    expect(pulled()).toBeLessThanOrEqual(1)
  })

  test('an undeclared stream is cancelled at the cap, not read to its end', async () => {
    const { body, pulled } = streamOf(new Uint8Array(64 * 1024), 20 * 16) // 20 MB
    const out = await readBodyCapped(post(body), 1024 * 1024)
    expect(out).toBeNull()
    expect(pulled()).toBeLessThan(20)
  })

  test('a body within the cap is read whole', async () => {
    const out = await readBodyCapped(post('hello'), 1024)
    expect(new TextDecoder().decode(out!)).toBe('hello')
  })

  test('JSON: too large, not JSON, and a value', async () => {
    expect(await readJsonCapped(post('x'.repeat(2000)), 1000)).toEqual({
      tooLarge: true,
    })
    expect(await readJsonCapped(post('{nope'), 1000)).toEqual({ invalid: true })
    expect(await readJsonCapped(post('{"a":1}'), 1000)).toEqual({
      value: { a: 1 },
    })
  })
})

/*
The closed set (#4379, and the 1.20.0 review, which found a `request.clone().json()` the first
pass missed): nothing in the site code reads a request body except through read-body.ts.
*/
test('no site module reads a request body except through read-body.ts', async () => {
  const { Glob } = await import('bun')
  const { readFileSync } = await import('fs')
  const offenders: string[] = []
  for (const file of new Glob('src/doc-system/site/*.ts').scanSync({
    cwd: process.cwd(),
  })) {
    if (file.endsWith('.test.ts') || file.endsWith('/read-body.ts')) continue
    // Over the whole file, so a chain split across lines (`request\n.clone()\n.json()`) counts.
    const source = readFileSync(file, 'utf8')
    for (const m of source.matchAll(
      /\b(request|req)\s*\.\s*(json|text|arrayBuffer|formData|blob|bytes|clone|body)\b/g
    )) {
      const line = source.slice(0, m.index).split('\n').length
      offenders.push(`${file}:${line}: ${m[0].replace(/\s+/g, '')}`)
    }
  }
  expect(offenders).toEqual([])
})
