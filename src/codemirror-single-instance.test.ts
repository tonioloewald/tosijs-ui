import { test, expect } from 'bun:test'
import { readFileSync } from 'fs'
import * as path from 'path'

/*
One @codemirror/state and one @codemirror/view, not nested copies.

CodeMirror extensions only work against the SAME state/view instance as the editor; a second copy
silently no-ops (CLAUDE.md, Key Dependencies). Dependabot's bun updater once raised the top-level
packages and left 19 nested copies of the OLD ones under each CodeMirror package (fixed in
de4077a7a). src/codemirror.test.ts imports both from the top level, so it cannot see a nested
copy; the lockfile can.
*/
test('bun.lock has no nested copy of @codemirror/state or @codemirror/view', () => {
  const lock = readFileSync(
    path.resolve(import.meta.dir, '../bun.lock'),
    'utf8'
  )
  const nested = [
    ...lock.matchAll(/"([^"]+\/@codemirror\/(?:state|view))":/g),
  ].map((m) => m[1])
  expect(nested).toEqual([])
})
