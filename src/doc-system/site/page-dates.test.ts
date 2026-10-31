import { test, expect } from 'bun:test'
import { sourceDates } from './page-dates.js'

/*
A fake git: `rev-parse` names the repo root, `log` prints newest-first commits (a NUL, the date,
then the files), `status` lists edited files. The site lives in a subfolder, so the docs' paths
(relative to cwd) and git's (relative to the root) differ.
*/
const fakeGit =
  (log: string, status = '') =>
  (args: string[]) =>
    args[0] === 'rev-parse'
      ? '/repo\n'
      : args[0] === 'log'
      ? log
      : args[0] === 'status'
      ? status
      : ''

const log = [
  '\x002026-03-01T00:00:00Z',
  '',
  'site/a.md',
  '',
  '\x002026-02-01T00:00:00Z',
  '',
  'site/a.md',
  'site/b.md',
  'site/section/c.md',
].join('\n')

test("each page gets its source's last commit, matched from the repo root", () => {
  const dates = sourceDates(
    ['a.md', 'b.md', 'never.md'],
    '/repo/site',
    fakeGit(log)
  )
  expect(Object.fromEntries(dates)).toEqual({
    'a.md': '2026-03-01T00:00:00Z',
    'b.md': '2026-02-01T00:00:00Z',
  })
})

test('a directory (an auto-created section) takes the newest change inside it', () => {
  expect(
    sourceDates(['section'], '/repo/site', fakeGit(log)).get('section')
  ).toBe('2026-02-01T00:00:00Z')
})

test('a file with uncommitted edits is dated by its mtime', () => {
  const dates = sourceDates(
    ['a.md', 'b.md'],
    '/repo/site',
    fakeGit(log, ' M site/b.md\n'),
    (file) =>
      file === '/repo/site/b.md' ? new Date('2026-04-01T00:00:00Z') : undefined
  )
  expect(dates.get('a.md')).toBe('2026-03-01T00:00:00Z')
  expect(dates.get('b.md')).toBe('2026-04-01T00:00:00.000Z')
})

test('no git, no dates: nothing is invented', () => {
  expect(sourceDates(['a.md'], '/x', () => '').size).toBe(0)
})
