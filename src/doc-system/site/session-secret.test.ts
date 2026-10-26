import { test, expect, afterEach } from 'bun:test'
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import {
  assertSecretNotServed,
  ensureSessionSecret,
  readSessionSecret,
  sessionSecretPath,
} from './session-secret.js'

/*
The per-project secret that signs link passes (#3416): outside the served folder, never
committed, readable by its owner only, and rotated by deleting it.
*/

const dirs: string[] = []
const project = () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'tosijs-secret-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

test('none until first use, then created 0600 in a 0700 folder that ignores itself', () => {
  const file = sessionSecretPath(project())
  expect(readSessionSecret(file)).toBeNull()
  const secret = ensureSessionSecret(file)
  expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(readSessionSecret(file)).toBe(secret)
  expect(ensureSessionSecret(file), 'the same secret next time').toBe(secret)
  if (process.platform !== 'win32') {
    expect(statSync(file).mode & 0o777).toBe(0o600)
    expect(statSync(path.dirname(file)).mode & 0o777).toBe(0o700)
  }
  expect(
    readFileSync(path.join(path.dirname(file), '.gitignore'), 'utf8')
  ).toContain('\n*\n')
})

test('deleting it rotates it', () => {
  const file = sessionSecretPath(project())
  const first = ensureSessionSecret(file)
  rmSync(file)
  expect(readSessionSecret(file)).toBeNull()
  expect(ensureSessionSecret(file)).not.toBe(first)
})

test('refuses a secret others can read, or one it did not write, saying how to fix it', () => {
  const file = sessionSecretPath(project())
  ensureSessionSecret(file)
  if (process.platform !== 'win32') {
    chmodSync(file, 0o644)
    expect(() => readSessionSecret(file)).toThrow('chmod 600')
    chmodSync(file, 0o600)
  }
  writeFileSync(file, 'hunter2\n', { mode: 0o600 })
  expect(() => readSessionSecret(file)).toThrow('Delete it')
})

test('a secret inside the served folder is refused', () => {
  const root = project()
  const file = sessionSecretPath(root)
  expect(() => assertSecretNotServed(file, root)).toThrow('output folder')
  expect(() =>
    assertSecretNotServed(file, path.join(root, 'docs'))
  ).not.toThrow()
  // A sibling whose name merely starts the same is not inside.
  expect(() =>
    assertSecretNotServed(file, path.join(root, '.tosijs'))
  ).not.toThrow()
  expect(existsSync(file)).toBe(false)
})
