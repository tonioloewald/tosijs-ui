import { test, expect, describe } from 'bun:test'

/*
#158 / #159: `import 'tosijs-ui/doc-browser'` must DEFINE `<tosi-doc-system>`.

It is the line every adoption doc tells you to write, and the line the build's own remediation
warning prints — and for several releases it did not define the element. `doc-browser.ts` is a
library module (types, helpers, `createDocBrowser()`); the element lives in
`doc-system/doc-system.ts`, which imports FROM doc-browser, so the arrow ran the wrong way.

The failure is invisible in every cheap way of looking at it. The import is a PARTIAL success —
the leaf components register, so the bundle looks healthy, pages serve 200, and the element sits
in the markup inert. And the costly half is silent: no doc system means no
`window.__docTestResults`, so an adopter's whole inline doc-test corpus stops existing without
one red test.

So the load-bearing assertion here is the RUNTIME one: define the element, or fail. The source
and exports-map checks are there to name the cause when it breaks, not to stand in for it.
*/

const ROOT = `${import.meta.dir}/..`

describe('tosijs-ui/doc-browser registers the doc system (#158, #159)', () => {
  test('the exports map points at the entry, not the library module', async () => {
    const pkg = JSON.parse(await Bun.file(`${ROOT}/package.json`).text())
    const entry = pkg.exports['./doc-browser']
    for (const condition of ['types', 'import', 'default']) {
      expect(
        entry[condition],
        `exports["./doc-browser"].${condition} must resolve to the entry that registers ` +
          `<tosi-doc-system>. Pointing it at dist/doc-browser.js is the #158 defect: that ` +
          `module registers the leaf components and leaves the doc system undefined.`
      ).toContain('doc-browser-entry')
    }
  })

  test('the entry imports the registrar for side effect', async () => {
    const src = await Bun.file(`${ROOT}/src/doc-browser-entry.ts`).text()
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).toContain(`import './doc-system/doc-system.js'`)
    // Re-export, so the subpath keeps its documented API surface.
    expect(code).toContain(`export * from './doc-browser.js'`)
  })

  /*
  In a SUBPROCESS deliberately. Importing the built bundle registers a few dozen custom
  elements into the shared happy-dom registry, and `bun test` runs files in one process — so
  doing it inline would leak that registry into every test that ran afterwards.
  */
  test('importing the built entry defines <tosi-doc-system>', async () => {
    const probe = `
      const before = !!customElements.get('tosi-doc-system')
      await import('${ROOT}/dist/doc-browser-entry.js')
      console.log(JSON.stringify({
        before,
        docSystem: !!customElements.get('tosi-doc-system'),
        sidenav: !!customElements.get('tosi-sidenav'),
      }))
    `
    const proc = Bun.spawnSync(
      ['bun', '--preload', `${ROOT}/test-setup.ts`, '-e', probe],
      {
        cwd: ROOT,
      }
    )
    const stdout = proc.stdout.toString()
    const line = stdout.trim().split('\n').pop() ?? ''
    expect(
      line.startsWith('{'),
      `probe produced no result — stdout:\n${stdout}\nstderr:\n${proc.stderr.toString()}`
    ).toBe(true)
    const result = JSON.parse(line)

    expect(result.before).toBe(false)
    expect(
      result.docSystem,
      `dist/doc-browser-entry.js did not define <tosi-doc-system>. An adopter following the ` +
        `adoption page gets an inert site AND no window.__docTestResults, so their doc-test ` +
        `corpus silently stops existing (#158, #159).`
    ).toBe(true)
    // The partial success that disguised the bug: leaf components registered all along.
    expect(result.sidenav).toBe(true)
  })
})
