import { test, expect } from 'bun:test'
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

/*
tosijs-format's own markdown exclusion, tested where NOTHING else excludes it: a scratch project
with no .prettierignore and no config override. In this repo .prettierignore masks the command's
glob, so deleting the markdown-exclusion argument from bin/format.ts kept every lane green (1.16.0
re-review 3). Here that deletion fails. (The glob itself can't be quoted in this comment: it
contains the characters that close a block comment.)
*/
test('tosijs-format --check never reports markdown, and does report unformatted code', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'tosijs-format-'))
  try {
    const repoModules = path.resolve(import.meta.dir, '../node_modules')
    symlinkSync(repoModules, path.join(dir, 'node_modules'))
    writeFileSync(path.join(dir, 'package.json'), '{"name":"scratch"}')
    const messy = '#  heading\n\n* a *literal* star\n\n|a|b|\n|-|-|\n'
    for (const f of ['a.md', 'b.markdown', 'c.mdx']) {
      writeFileSync(path.join(dir, f), messy)
    }
    writeFileSync(path.join(dir, 'd.js'), 'const x = {a:1}\n')

    const r = Bun.spawnSync(
      ['bun', path.resolve(import.meta.dir, 'format.ts'), '--check'],
      { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
    )
    const out = r.stdout.toString() + r.stderr.toString()
    expect(r.exitCode).toBe(1) // d.js is unformatted
    expect(out).toContain('d.js')
    expect(out).not.toMatch(/a\.md|b\.markdown|c\.mdx/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}, 60_000)
