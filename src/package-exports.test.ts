import { test, expect } from 'bun:test'
import * as fs from 'fs'

// dist/ is committed, so this runs in CI without a build. Guards the `exports`
// map (and its subpath entry points) against the dist layout drifting.
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))

test('every package.json export target resolves to an existing file', () => {
  const missing: string[] = []
  for (const [subpath, conditions] of Object.entries(pkg.exports)) {
    for (const [condition, target] of Object.entries(
      conditions as Record<string, string>
    )) {
      if (!fs.existsSync(target)) missing.push(`${subpath} (${condition}) -> ${target}`)
    }
  }
  expect(missing).toEqual([])
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
