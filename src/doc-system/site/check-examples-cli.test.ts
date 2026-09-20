import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

/*
The parent → child seam, which nothing exercised (review F14).

`checkExamples` runs in a subprocess and the example policy crosses that boundary through
`TOSI_LIVE_EXAMPLES`. Every build we run sends `'auto'`, so the `'opt-in'` value had never
crossed a process boundary anywhere — and this is exactly where review major M2 lived: the
child assumed `'auto'` regardless, so a fence that never runs could still hard-fail a build.

Three things are only checkable from outside the process, which is why this spawns rather than
calling the function: that the env KEY is the one the child reads, that stdout stays a clean
JSON channel, and that the `skipped` Map survives serialization.
*/
const CLI = path.join(import.meta.dir, 'check-examples-cli.ts')

describe('checkExamples CLI env seam (F14)', () => {
  let dir: string
  let docsJson: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cec-'))
    docsJson = path.join(dir, 'docs.json')
    fs.writeFileSync(
      docsJson,
      JSON.stringify([
        {
          filename: 'a.md',
          title: 'A',
          path: 'a.md',
          // Deliberately broken JS. Under 'auto' it is an example and must be reported;
          // under 'opt-in' it never runs, so reporting it would be the M2 defect.
          text: '# A\n\n```js\nthis is ( not javascript\n```',
        },
      ])
    )
  })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  const run = (env: Record<string, string>) => {
    const proc = Bun.spawnSync(['bun', CLI, docsJson], {
      env: { ...process.env, ...env },
      cwd: path.dirname(CLI),
    })
    const stdout = proc.stdout.toString().trim()
    return { stdout, stderr: proc.stderr.toString(), exitCode: proc.exitCode }
  }

  test("'auto' reports the broken fence — stdout is parseable JSON", () => {
    const { stdout } = run({ TOSI_LIVE_EXAMPLES: 'auto' })
    const last = stdout.split('\n').pop() ?? ''
    expect(
      last.startsWith('{'),
      `stdout is the channel the parent parses; it must stay clean JSON. Got:\n${stdout}`
    ).toBe(true)
    const result = JSON.parse(last)
    expect(Array.isArray(result.problems)).toBe(true)
    expect(result.problems.length).toBeGreaterThan(0)
  })

  test("'opt-in' crosses the boundary — the same fence is NOT a problem (M2)", () => {
    const { stdout } = run({ TOSI_LIVE_EXAMPLES: 'opt-in' })
    const result = JSON.parse(stdout.split('\n').pop() ?? '{}')
    expect(
      result.problems.length,
      'a fence that never runs under `opt-in` must not fail the build — if this is ' +
        'non-zero the env value did not reach the child, which is review major M2.'
    ).toBe(0)
  })

  test('an absent env var defaults to auto, not to silence', () => {
    // The dangerous default would be "nothing runs, nothing is checked".
    const { stdout } = run({ TOSI_LIVE_EXAMPLES: '' })
    const result = JSON.parse(stdout.split('\n').pop() ?? '{}')
    expect(result.problems.length).toBeGreaterThan(0)
  })
})
