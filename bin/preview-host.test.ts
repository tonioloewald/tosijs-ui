import { test, expect, beforeEach } from 'bun:test'
import { readLocalSecret, resolvePreviewHost } from './resolve-site-config'
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

/*
`PREVIEW_HOST` is a credential, and where it comes from is the security-relevant part.

The convention (tosijs-coding-practices → deployment.md) is `~/local-secrets/`: a 700
directory beside the repos, never inside one, so it is structurally impossible to commit.
This repo committed its preview host anyway, for months, while `site-config.ts` documented
"keep it out of a committed config" — which is why the guarantee now needs to be a directory
rather than a rule.
*/

const dir = mkdtempSync(path.join(tmpdir(), 'secrets-'))
const secretsFile = path.join(dir, 'tosijs-preview.env')
writeFileSync(
  secretsFile,
  '# a comment\nexport PREVIEW_HOST="deploy@example.invalid"\nOTHER=x\n'
)
const emptyFile = path.join(dir, 'empty.env')
writeFileSync(emptyFile, '')

beforeEach(() => {
  delete process.env.PREVIEW_HOST
  delete process.env.PREVIEW_SSH
})

test('reads an exported, quoted value; ignores comments and other keys', () => {
  expect(readLocalSecret('PREVIEW_HOST', secretsFile)).toBe(
    'deploy@example.invalid'
  )
  expect(readLocalSecret('NOPE', secretsFile)).toBeUndefined()
  expect(readLocalSecret('PREVIEW_HOST', emptyFile)).toBeUndefined()
})

test('a missing file is not an error — it is the common case', () => {
  expect(readLocalSecret('PREVIEW_HOST', secretsFile + '.nope')).toBeUndefined()
})

test('it is not a shell: a value that looks like code is read as text', () => {
  // A credentials file that needs evaluating is a credentials file that can run code.
  const weird = path.join(dir, 'weird.env')
  writeFileSync(weird, 'PREVIEW_HOST=$(whoami)@box\n')
  expect(readLocalSecret('PREVIEW_HOST', weird)).toBe('$(whoami)@box')
})

test('precedence: flag > env > legacy env > config', () => {
  // `~/local-secrets` sits between the env vars and the config; it is not exercised here
  // because its position is a fact about the developer's machine, and a test that reads the
  // real file passes or fails depending on whose machine it runs on.
  expect(resolvePreviewHost('a@flag', 'c@config')).toBe('a@flag')
  process.env.PREVIEW_HOST = 'b@env'
  expect(resolvePreviewHost(undefined, 'c@config')).toBe('b@env')
  delete process.env.PREVIEW_HOST
  process.env.PREVIEW_SSH = 'l@legacy'
  expect(resolvePreviewHost(undefined, 'c@config')).toBe('l@legacy')
})

test('REGRESSION: this repo does not commit a preview host', async () => {
  /*
  The rule was written in `site-config.ts` and believed while `tosijs-site.config.ts`
  published the address in a public repo's history the whole time. A rule nobody checks is a
  rule that is already broken somewhere; this is the check.
  */
  const config = await Bun.file(
    new URL('../tosijs-site.config.ts', import.meta.url)
  ).text()
  expect(config).not.toMatch(/host:\s*['"][^'"]*@[^'"]+['"]/)
  // …and the pattern is one that would have caught the real thing.
  expect(`preview: { host: 'root@203.0.113.10' }`).toMatch(
    /host:\s*['"][^'"]*@[^'"]+['"]/
  )
})
