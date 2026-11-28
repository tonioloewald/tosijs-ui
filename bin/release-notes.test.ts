import { afterAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

const BIN = path.resolve(import.meta.dir, 'release-notes.ts')
const work = mkdtempSync(path.join(tmpdir(), 'tosi-release-notes-'))
afterAll(() => rmSync(work, { recursive: true, force: true }))

const git = (...args: string[]) => {
  const run = Bun.spawnSync(['git', ...args], {
    cwd: work,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  })
  if (run.exitCode !== 0) throw new Error(run.stderr.toString())
}

/*
#4373: the "already tagged" error tells you to pass --version, and --version used to be ignored
by the bump check, which compared the tag with package.json (the same version), classified the
bump as unknown, and let a [break] bullet through a patch.
*/
test('--check --version=<patch> still blocks a [break] bullet (#4373)', () => {
  git('init', '-q')
  writeFileSync(
    path.join(work, 'package.json'),
    '{"name":"x","version":"1.2.3"}\n'
  )
  writeFileSync(path.join(work, 'CHANGELOG.md'), '# Changelog\n')
  git('add', '.')
  git('commit', '-q', '-m', 'chore: 1.2.3')
  git('tag', 'v1.2.3')
  writeFileSync(path.join(work, 'a.ts'), 'export const a = 1\n')
  git('add', '.')
  git(
    'commit',
    '-q',
    '-m',
    'feat: remove the widget\n\n[break] removed the deprecated widget entirely'
  )
  writeFileSync(
    path.join(work, 'CHANGELOG.md'),
    '# Changelog\n\n## 1.2.4\n\n- removed the deprecated widget entirely\n'
  )
  git('add', '.')
  git('commit', '-q', '-m', 'docs: notes\n\n[note] write-up')

  const run = Bun.spawnSync(['bun', BIN, '--check', '--version=1.2.4'], {
    cwd: work,
  })
  const out = run.stdout.toString() + run.stderr.toString()
  // Written up, so the only thing that can fail it is the bump check.
  expect(out).not.toContain('not mentioned')
  if (run.exitCode !== 1) console.error(out)
  expect(run.exitCode).toBe(1)
  expect(out).toMatch(/patch/i)
})
