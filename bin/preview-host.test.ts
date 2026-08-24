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

test('precedence: flag > env > legacy env > config > ~/local-secrets', () => {
  expect(resolvePreviewHost('a@flag', 'c@config')).toBe('a@flag')
  process.env.PREVIEW_HOST = 'b@env'
  expect(resolvePreviewHost(undefined, 'c@config')).toBe('b@env')
  delete process.env.PREVIEW_HOST
  process.env.PREVIEW_SSH = 'l@legacy'
  expect(resolvePreviewHost(undefined, 'c@config')).toBe('l@legacy')
})

test('REGRESSION: a project that names its own host is never redirected', () => {
  /*
  `~/local-secrets/tosijs-preview.env` holds ONE host for the whole machine. When it
  outranked the site config — which is how this shipped earlier today — checking out someone
  else's repo and running `tosijs-tunnel` pointed it at YOUR box, and that bin does not merely
  print a target: it ssh's, scp's a Caddy fragment and reloads Caddy there.

  A machine-wide default must lose to a project that was explicit. It is still ahead of
  nothing, which is what makes it useful for a repo that follows the practice and commits no
  host at all.
  */
  const configWins = resolvePreviewHost(undefined, 'theirs@their-box')
  expect(configWins).toBe('theirs@their-box')
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

test('every place that documents the precedence says the same thing', async () => {
  /*
  This sentence was written THREE different ways in one release — the code, four docs and a
  shipped CHANGELOG disagreed about whether the machine-global file outranks a project's own
  config. That is not cosmetic: `tosijs-tunnel` ssh's, scp's a Caddy fragment and reloads
  Caddy on the resolved host, so an adopter who trusts the published order believes a
  machine-wide file protects them from a committed project host.

  The invariant: config BEFORE `~/local-secrets`, everywhere it is stated.
  */
  const sources = [
    'bin/resolve-site-config.ts',
    'src/doc-system/site/site-config.ts',
    'src/doc-system/doc-site-system.md',
    'CHANGELOG.md',
  ]
  for (const file of sources) {
    const text = await Bun.file(new URL(`../${file}`, import.meta.url)).text()
    for (const line of text.split('\n')) {
      if (!line.includes('PREVIEW_SSH') || !line.includes('>')) continue
      const cfg = line.search(/config|\*\*this\*\*/)
      const secrets = line.indexOf('local-secrets')
      // Only lines that mention both are making the ordering claim.
      if (cfg === -1 || secrets === -1) continue
      expect(cfg).toBeLessThan(secrets)
    }
  }
})
