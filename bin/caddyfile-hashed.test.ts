import { test, expect } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

/*
deploy/Caddyfile long-caches content-hashed files by a regex that names Bun's hash length
(8 characters). If a Bun upgrade changed it, every hashed file (the hydrate entry, every chunk)
would silently drop to `no-cache`: nothing errors, pages just reload slower (#2446). The `@rest`
rule repeats the regex verbatim (a named matcher cannot be negated there), so both copies must
agree. Checked against what the committed build actually emits.
*/
const caddyfile = readFileSync('deploy/Caddyfile', 'utf8')
const toRegExp = (caddy: string) => new RegExp(caddy.replace(/\\\\-/g, '-'))
const hashed = caddyfile.match(/@hashed path_regexp (\S+)/)![1]
const restCopy = caddyfile.match(/@rest \{[^}]*not path_regexp (\S+)/)![1]

const emitted = [
  ...readdirSync('docs').filter((f) => /^hydrate-.+\.js$/.test(f)),
  ...readdirSync(join('docs', '_chunks')).map((f) => `_chunks/${f}`),
]

test('the @hashed rule matches every hashed file the build emits', () => {
  expect(emitted.length).toBeGreaterThan(1)
  const missed = emitted.filter((f) => !toRegExp(hashed).test(`/${f}`))
  expect(missed).toEqual([])
})

test('@rest excludes exactly what @hashed matches', () => {
  expect(restCopy).toBe(hashed)
})

test('an unhashed file is not long-cached', () => {
  for (const f of ['/iife.js', '/doc-system.css', '/index.html', '/docs.json'])
    expect(toRegExp(hashed).test(f)).toBe(false)
})
