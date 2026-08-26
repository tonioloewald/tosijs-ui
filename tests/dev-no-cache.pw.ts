import { test, expect } from '@playwright/test'

/*
The dev server must not let anything it serves be cached.

Sending no `Cache-Control` is not neutral: browsers are free to invent a freshness lifetime when
you decline to state one, and Safari is the most willing to. The consequence is a dev server
that rebuilds correctly while the browser keeps showing the previous build — which presents as
"the fix did not work", and did: a bug was reported here against code that had already been
fixed, and the only way out was emptying Safari's cache by hand.

This covers all three of `respondFile`'s exits, because they are separate `Response`
constructions and adding headers to the obvious one is exactly how the other two get missed:
injected HTML, compressed assets, and binaries that stream untouched.
*/

test('every dev-served response is uncacheable', async ({ request }) => {
  const paths = [
    { path: '/', what: 'HTML (injected)' },
    { path: '/iife.js', what: 'a compressible asset' },
    { path: '/doc-system.css', what: 'the stylesheet' },
    { path: '/docs.json', what: 'the corpus' },
  ]
  for (const { path, what } of paths) {
    const res = await request.get(path)
    expect(res.status(), `${path} should be served`).toBe(200)
    const cache = res.headers()['cache-control'] ?? ''
    expect(
      cache,
      `${what} (${path}) must be uncacheable, got: ${JSON.stringify(cache)}`
    ).toContain('no-store')
  }
})

test('a binary that streams untouched is uncacheable too', async ({
  request,
}) => {
  /*
  The path with no compression and no injection — the one that returns `new Response(Bun.file())`
  and therefore carries whatever headers you remember to attach. An icon or a font you just
  changed is no more welcome stale than a script is.
  */
  const res = await request.get('/tosijs-ui.epub')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-encoding'] ?? '', 'streamed as-is').toBe('')
  expect(res.headers()['cache-control'] ?? '').toContain('no-store')
})
