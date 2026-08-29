import { test, expect } from 'bun:test'
import { sourcemapWarning } from './sourcemap-check.js'

const BUNDLE = 'console.log(1)\n//# sourceMappingURL=iife.js.map\n'

test('#103: warns when the referenced map is not in the served root', () => {
  /*
  `--sourcemap=linked` appends the comment, so devtools fetches the map on every load. When it
  is not served the request fails — in exactly the session where someone is reading the console
  for something else. The reporter lost a hypothesis to it while chasing a slow load.
  */
  const msg = sourcemapWarning(BUNDLE, '/srv/docs', () => false)
  expect(msg).toBeTruthy()
  expect(msg, 'names the file it expected').toContain('iife.js.map')
  expect(msg, 'and where it expected it').toContain('/srv/docs')
})

test('#103: silent when the map is served', () => {
  expect(sourcemapWarning(BUNDLE, '/srv/docs', () => true)).toBe(null)
})

test('#103: checks what is SERVED, not what was built', () => {
  /*
  The two differ whenever `bundleOutDir` is set, and the copy across is best-effort by design —
  a missing map must never fail a build. So the check has to look at the end state; trusting the
  copy step is what let this ship.
  */
  const exists = (p: string) => p.startsWith('/build/')
  expect(sourcemapWarning(BUNDLE, '/build', exists)).toBe(null)
  expect(sourcemapWarning(BUNDLE, '/srv/docs', exists)).toBeTruthy()
})

test('#103: a bundle with no sourcemap comment says nothing', () => {
  expect(sourcemapWarning('console.log(1)\n', '/srv/docs', () => false)).toBe(
    null
  )
})

test('#103: an inline data: map has nothing to serve', () => {
  // There is no file, so there is no missing file. Warning here would be pure noise.
  const inline = 'x\n//# sourceMappingURL=data:application/json;base64,AAAA\n'
  expect(sourcemapWarning(inline, '/srv/docs', () => false)).toBe(null)
})

test('#103: the last comment wins, as the browser reads it', () => {
  // A bundler may emit debugId and sourceMappingURL together; only the URL matters here.
  const withDebugId = 'x\n//# debugId=ABC\n//# sourceMappingURL=app.js.map\n'
  const msg = sourcemapWarning(withDebugId, '/srv', () => false)
  expect(msg).toContain('app.js.map')
})
