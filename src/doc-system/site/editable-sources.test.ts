import { test, expect, describe } from 'bun:test'
import { editableSourcePaths, mayEditSource } from './editable-sources.js'
import * as path from 'path'

/*
#128: source writes were contained only to the repo root, which includes every file that
executes on the developer's next ordinary command — `.git/hooks/*`, `bunfig.toml` (preload),
`package.json` scripts, `bin/`.

Split out of #121 so closing that issue did not bury this half. With CSRF closed there is no
known path to an unauthorised write; this removes the consequence of a future one.
*/
const ROOT = '/repo'
const corpus = [
  { path: 'src/data-table.ts' },
  { path: 'src/docs/components.md' },
  { path: 'README.md' },
]

describe('editableSourcePaths (#128)', () => {
  const allowed = editableSourcePaths(corpus, ROOT)

  test('a file the extractor scraped is editable', () => {
    expect(
      mayEditSource(path.resolve(ROOT, 'src/data-table.ts'), allowed)
    ).toBe(true)
    expect(mayEditSource(path.resolve(ROOT, 'README.md'), allowed)).toBe(true)
  })

  test('the execution surfaces are NOT — this is the point of the issue', () => {
    for (const danger of [
      '.git/hooks/pre-commit',
      'bunfig.toml',
      'package.json',
      'bin/dev.ts',
      'tosijs-site.config.ts',
    ]) {
      expect(
        mayEditSource(path.resolve(ROOT, danger), allowed),
        `${danger} must not be writable`
      ).toBe(false)
    }
  })

  test('a repo file that is simply not a doc source is also refused', () => {
    // Correct by default: the set is derived, so anything new is denied until it is a doc.
    expect(mayEditSource(path.resolve(ROOT, 'src/not-a-doc.ts'), allowed)).toBe(
      false
    )
  })

  test('FAILS CLOSED — no corpus permits nothing', () => {
    expect(editableSourcePaths(null, ROOT).size).toBe(0)
    expect(editableSourcePaths(undefined, ROOT).size).toBe(0)
    expect(editableSourcePaths([], ROOT).size).toBe(0)
    expect(
      mayEditSource(
        path.resolve(ROOT, 'README.md'),
        editableSourcePaths(null, ROOT)
      )
    ).toBe(false)
  })

  test('a corpus entry escaping the root does not widen the set', () => {
    const escaped = editableSourcePaths([{ path: '../../etc/passwd' }], ROOT)
    expect(escaped.size).toBe(0)
  })

  test('entries with no path are skipped rather than throwing', () => {
    const mixed = editableSourcePaths(
      [{ path: 'README.md' }, {}, { path: '' }] as any,
      ROOT
    )
    expect(mixed.size).toBe(1)
  })

  test('a null resolved path is never editable', () => {
    expect(mayEditSource(null, allowed)).toBe(false)
  })
})
