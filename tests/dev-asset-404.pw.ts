import { test, expect } from '@playwright/test'

/*
A missing ASSET must 404. A missing route may still get the SPA shell.

Falling back to the shell for everything meant a missing `waterbump.png` answered `200
text/html`. Babylon's `Texture` fetched it, failed to decode a web page as an image, and
substituted its checkerboard — so a missing asset presented as a *styling choice* and was
complimented before it was diagnosed (#116). A 404 shows red in the network panel in seconds; a
200 of the wrong type can hide for days.
*/

test('a missing asset 404s instead of returning the SPA shell', async ({
  request,
}) => {
  for (const path of [
    '/waterbump.png',
    '/missing.js',
    '/nope.css',
    '/deep/nested/thing.glb',
  ]) {
    const res = await request.get(path)
    expect(res.status(), `${path} should not exist`).toBe(404)
    const type = res.headers()['content-type'] ?? ''
    expect(
      type,
      `${path} must not answer as HTML — that is what made it invisible`
    ).not.toContain('text/html')
  }
})

test('the 404 names the path, so the reader looks in the right layer', async ({
  request,
}) => {
  // The reporter went through their texture pipeline before suspecting the server. A bare
  // "File not found" would have sent them the same way.
  const res = await request.get('/waterbump.png')
  expect(await res.text()).toContain('waterbump.png')
})

test('an unknown ROUTE still gets the SPA shell', async ({ request }) => {
  /*
  The other half, and it must not regress: client-side routing depends on unknown paths
  reaching the shell. The distinguishing signal is a dot in the LAST path segment — an
  extension was asked for, so a file was meant.
  */
  const res = await request.get('/no-such-page/')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type'] ?? '').toContain('text/html')
})

test('a dot earlier in the path is not an extension', async ({ request }) => {
  // `/v1.2/guide` is a route that happens to contain a dot. Only the final segment counts.
  const res = await request.get('/v1.2/guide')
  expect(res.status(), 'a versioned route is still a route').toBe(200)
  expect(res.headers()['content-type'] ?? '').toContain('text/html')
})

test('real assets are unaffected', async ({ request }) => {
  for (const path of ['/iife.js', '/doc-system.css']) {
    const res = await request.get(path)
    expect(res.status(), `${path} should be served`).toBe(200)
    expect(res.headers()['content-type'] ?? '').not.toContain('text/html')
  }
})

test('the liveness probe answers 204 and is not a page', async ({
  request,
}) => {
  /*
  The dev server's own health tick probes this every minute. Two consecutive failures and it
  exits non-zero rather than sitting there as a live process with a dead listener — the state
  reported in #91, where `pgrep` said running, `curl` got nothing, the last log line was a
  successful build, and nothing was logged at the moment of death. Every diagnostic a person
  reaches for answered "fine".

  It must stay a bare 204: the question is only "is this listener answering", and any extra
  machinery in the answer is a way for the answer to be wrong.
  */
  const res = await request.get('/__alive')
  expect(res.status()).toBe(204)
  expect((await res.body()).length, 'no body — it is not a page').toBe(0)
})
