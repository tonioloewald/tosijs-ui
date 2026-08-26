import { test, expect } from '@playwright/test'

/*
The dev server must never let a client USE a stale copy — which is not the same as forbidding it
to keep one, and the difference is worth a paragraph because getting it wrong cost real time in
both directions.

Sending no `Cache-Control` at all is not neutral: browsers may invent a freshness lifetime when
you decline to state one, and Safari is the most willing to. The server rebuilds correctly while
the browser shows the previous build, which presents as "the fix did not work" — a bug was
reported here against code that had already been fixed.

The first attempt was `no-store` on everything, which fixed that and taxed every page load
forever: this repo's own Playwright lane went from ~1.3 minutes to 1.9-2.7 and firefox started
flaking, because the bundle was re-downloaded on every navigation. `no-cache` is the accurate
header — "keep it, but revalidate before every use" — and with an ETag the revalidation is a 304
with no body.

So the property is: assets revalidate and a changed file always wins; HTML, which is injected
per request, is simply never stored.
*/

test('HTML can never be used without checking first', async ({ request }) => {
  const res = await request.get('/')
  expect(res.status()).toBe(200)
  const cache = res.headers()['cache-control'] ?? ''
  const etag = res.headers()['etag']

  /*
  TWO correct answers here, which is why this asserts the property rather than a header.

  When the dev server injects into a page — the haltija loader, the build-status widget, whether
  the requester holds a session — the body is not the file, so it is sent `no-store`: a validator
  derived from disk would be a lie about what was served.

  When nothing is injected, as in this lane (haltija off, status off in test mode), the body IS
  the file, and it takes the ordinary asset path: `no-cache` plus a real ETag. That is not a
  weaker guarantee, it is the same one done cheaper.

  Both mean "you may not use this without asking me". Pinning one spelling would have made this
  test fail for a reason that is not a defect — which is exactly what it did on first writing.
  */
  const neverStale =
    cache.includes('no-store') || (cache.includes('no-cache') && Boolean(etag))
  expect(
    neverStale,
    `HTML must be unusable without revalidation; got cache=${JSON.stringify(
      cache
    )} etag=${JSON.stringify(etag)}`
  ).toBe(true)
})

test('assets carry a validator and revalidate to 304', async ({ request }) => {
  const paths = ['/iife.js', '/doc-system.css', '/docs.json']
  for (const path of paths) {
    const first = await request.get(path)
    expect(first.status(), `${path} should be served`).toBe(200)

    const cache = first.headers()['cache-control'] ?? ''
    expect(
      cache,
      `${path} must revalidate before use, got ${JSON.stringify(cache)}`
    ).toContain('no-cache')

    const etag = first.headers()['etag']
    expect(
      etag,
      `${path} needs a validator or no-cache costs a full re-fetch`
    ).toBeTruthy()

    const second = await request.get(path, {
      headers: { 'If-None-Match': etag },
    })
    expect(
      second.status(),
      `${path} should revalidate to 304, not re-send the body`
    ).toBe(304)
  }
})

test('a binary that streams untouched revalidates too', async ({ request }) => {
  // The path with no compression and no injection — the one that returns a bare file response
  // and therefore carries only the headers you remember to attach.
  const first = await request.get('/tosijs-ui.epub')
  expect(first.status()).toBe(200)
  expect(first.headers()['content-encoding'] ?? '', 'streamed as-is').toBe('')
  const etag = first.headers()['etag']
  expect(etag).toBeTruthy()
  const second = await request.get('/tosijs-ui.epub', {
    headers: { 'If-None-Match': etag },
  })
  expect(second.status()).toBe(304)
})

test('the brotli and gzip bodies do not share a validator', async ({
  request,
}) => {
  /*
  The two encodings produce different bytes, so honouring one's validator against the other
  would hand the client a body it cannot decode. The encoding is part of the tag; this asserts
  the consequence rather than the tag's spelling.
  */
  const br = await request.get('/iife.js', {
    headers: { 'Accept-Encoding': 'br' },
  })
  const gz = await request.get('/iife.js', {
    headers: { 'Accept-Encoding': 'gzip' },
  })
  const brTag = br.headers()['etag']
  const gzTag = gz.headers()['etag']
  if (br.headers()['content-encoding'] === gz.headers()['content-encoding']) {
    test.skip(true, 'this client negotiated the same encoding twice')
  }
  expect(brTag).not.toBe(gzTag)
})
