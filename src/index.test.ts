import { test, expect, describe } from 'bun:test'

/*
#133: the root barrel must not drag the doc-system cluster into every consumer bundle.

`code-editor` pulls CodeMirror; `live-example` and `doc-system/doc-system` each pull `tjs-lang`
independently. The package has no `sideEffects` field — correctly, since `elementCreator()`
registers custom elements at import time and a blanket `sideEffects: false` shakes a bare
`import 'tosijs-ui'` down to zero registrations — so a bundler must treat every re-exported
module as side-effectful and cannot drop it.

Measured on a real 15MB React bundle (snowfox-app): 1.35 MB / 8.9% saved. Re-measured here on
the barrel alone: 1.68 MB → 0.38 MB, i.e. the cluster was 77% of it.

A SOURCE-level assertion rather than a size budget: a byte threshold would drift with every
dependency bump and fail for reasons that have nothing to do with this, whereas the invariant
is exactly "these four are not re-exported here".
*/
const DOC_SYSTEM_MODULES = [
  './code-editor.js',
  './doc-browser.js',
  './doc-system/doc-system.js',
  './live-example.js',
]

describe('root barrel (#133)', () => {
  test('does not re-export the doc-system cluster', async () => {
    const barrel = await Bun.file(`${import.meta.dir}/index.ts`).text()
    // Ignore the explanatory comment block, which names all four on purpose.
    const code = barrel.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const mod of DOC_SYSTEM_MODULES) {
      expect(
        code.includes(mod),
        `${mod} is re-exported from the root barrel — that puts CodeMirror or tjs-lang in ` +
          `every consumer bundle. Import it by subpath instead.`
      ).toBe(false)
    }
  })

  test('the iife entry DOES pull them, so the doc site and CDN users are unaffected', async () => {
    const iife = await Bun.file(`${import.meta.dir}/index-iife.ts`).text()
    for (const mod of DOC_SYSTEM_MODULES) {
      expect(iife.includes(mod), `${mod} must be in the iife bundle`).toBe(true)
    }
  })

  test('ordinary components are still exported from the barrel', async () => {
    const m = (await import('./index.js')) as Record<string, unknown>
    for (const name of ['tosiTable', 'tosiDialog', 'tosiForm', 'tosiField']) {
      expect(typeof m[name]).toBe('function')
    }
  })
})
