import { test, expect } from 'bun:test'
import * as fs from 'fs'

// dist/ is committed, so this runs in CI without a build. Guards the `exports`
// map (and its subpath entry points) against the dist layout drifting.
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))

test('every concrete export target resolves to an existing file', () => {
  const missing: string[] = []
  for (const [subpath, conditions] of Object.entries(pkg.exports)) {
    if (conditions === null) continue // an excluded path: checked below
    for (const [condition, target] of Object.entries(
      conditions as Record<string, string>
    )) {
      if (target.includes('*')) continue // wildcard pattern — checked below
      if (!fs.existsSync(target))
        missing.push(`${subpath} (${condition}) -> ${target}`)
    }
  }
  expect(missing).toEqual([])
})

test('the "./*" wildcard exposes per-component dist files', () => {
  const star = pkg.exports['./*'] as Record<string, string>
  expect(star).toBeDefined()
  expect(star.import).toBe('./dist/*.js')
  // a representative component the wildcard would resolve (tosijs-ui/rating etc.)
  for (const f of ['dist/rating.js', 'dist/carousel.js', 'dist/select.js']) {
    expect(fs.existsSync(f)).toBe(true)
  }
})

test('the documented independent subpaths are all exported', () => {
  for (const subpath of [
    './site',
    './icons',
    './code-editor',
    './live-example',
    './doc-browser',
    './diff',
    './theme',
  ]) {
    expect(pkg.exports[subpath]).toBeDefined()
  }
})

/*
#4390 (1.20.0): the dev server's internals are not API. The `./*` wildcard made every module
under `doc-system/site/` importable, `dev-auth` (the dev server's security boundary) with 90
runtime exports among them, and no consumer imported any of it. `tosijs-ui/site` is the API.
*/
test('site internals are not importable; tosijs-ui/site and data-client still are', () => {
  const resolve = (spec: string) => {
    try {
      return Bun.resolveSync(spec, process.cwd())
    } catch {
      return null
    }
  }
  expect(pkg.exports['./doc-system/site/*']).toBeNull()
  expect(pkg.exports['./doc-system/site/*.js']).toBeNull()
  for (const internal of [
    'tosijs-ui/doc-system/site/dev-auth',
    'tosijs-ui/doc-system/site/dev-auth.js',
    'tosijs-ui/doc-system/site/build-lock',
  ]) {
    expect({ internal, resolved: resolve(internal) }).toEqual({
      internal,
      resolved: null,
    })
  }
  expect(resolve('tosijs-ui/site')).toContain('dist/doc-system/site/index.js')
  expect(resolve('tosijs-ui/doc-system/data-client')).toContain(
    'dist/doc-system/data-client.js'
  )
})
