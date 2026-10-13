import { test, expect, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import {
  codemirrorCopies,
  duplicateCodemirrorWarning,
  tosijsUiDir,
} from './codemirror-copies'

let dir: string | undefined
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

function pkg(at: string, name: string, extra: object = {}) {
  mkdirSync(at, { recursive: true })
  writeFileSync(
    path.join(at, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', main: 'index.js', ...extra })
  )
  writeFileSync(path.join(at, 'index.js'), 'module.exports = {}')
}

/** The install an upgrade leaves: an old hoisted state, a newer one nested under tosijs-ui. */
function install(nested: boolean) {
  dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'cm-copies-')))
  const nm = path.join(dir, 'node_modules')
  pkg(dir, 'app')
  pkg(path.join(nm, '@codemirror/state'), '@codemirror/state')
  pkg(path.join(nm, '@codemirror/view'), '@codemirror/view')
  pkg(
    path.join(nm, '@codemirror/lang-javascript'),
    '@codemirror/lang-javascript'
  )
  const ui = path.join(nm, 'tosijs-ui')
  pkg(ui, 'tosijs-ui', {
    dependencies: {
      '@codemirror/state': '^6',
      '@codemirror/view': '^6',
      '@codemirror/lang-javascript': '^6',
      prismjs: '^1',
    },
  })
  if (nested) {
    pkg(path.join(ui, 'node_modules/@codemirror/state'), '@codemirror/state')
  }
  return { root: dir, ui }
}

test('a nested copy under tosijs-ui beside a hoisted one is two copies', () => {
  const { root, ui } = install(true)
  const copies = codemirrorCopies(root, ui)
  expect(copies['@codemirror/state']).toEqual([
    path.join(root, 'node_modules/@codemirror/state'),
    path.join(ui, 'node_modules/@codemirror/state'),
  ])
  expect(copies['@codemirror/view'].length).toBe(1)
  const warning = duplicateCodemirrorWarning(copies)!
  expect(warning).toContain('bun update @codemirror/state')
  expect(warning).not.toContain('@codemirror/view\n')
  expect(warning).toContain(path.join(ui, 'node_modules/@codemirror/state'))
})

test('one hoisted copy is fine', () => {
  const { root, ui } = install(false)
  const copies = codemirrorCopies(root, ui)
  expect(copies['@codemirror/state'].length).toBe(1)
  expect(duplicateCodemirrorWarning(copies)).toBeNull()
})

test('this repo has one copy of each, and finds itself', () => {
  const ui = tosijsUiDir(import.meta.dir)
  expect(ui).toBe(path.resolve(import.meta.dir, '../../..'))
  const copies = codemirrorCopies(process.cwd(), ui)
  expect(copies['@codemirror/state'].length).toBe(1)
  expect(copies['@codemirror/view'].length).toBe(1)
})
