import { describe, expect, test } from 'bun:test'
import * as path from 'path'

const ROOT = path.resolve(import.meta.dir, '../..')

/*
#4351: with site data blocked, the `localStorage` accessor itself throws, and the live-example
module read it while loading, so the import threw and the doc site never hydrated for that
reader. CI's browsers never block storage, so this lane is the only place it is seen.

In a SUBPROCESS, so the module is loaded fresh with storage blocked from the start (and so the
custom elements it registers don't leak into this process's registry).
*/
describe('blocked site data (#4351)', () => {
  for (const entry of ['src/live-example/component.ts', 'src/doc-browser.ts']) {
    test(`${entry} imports with localStorage blocked`, () => {
      const probe = `
        Object.defineProperty(globalThis, 'localStorage', {
          configurable: true,
          get() { throw new DOMException('blocked', 'SecurityError') },
        })
        await import('${ROOT}/${entry}')
        console.log('IMPORTED')
      `
      const proc = Bun.spawnSync(
        ['bun', '--preload', `${ROOT}/src/test-setup.ts`, '-e', probe],
        { cwd: ROOT }
      )
      const out = proc.stdout.toString()
      expect(
        out.includes('IMPORTED'),
        `import failed:\n${proc.stderr.toString()}`
      ).toBe(true)
    })
  }
})
