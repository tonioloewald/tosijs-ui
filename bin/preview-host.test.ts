import {
  test,
  expect,
  beforeEach,
  afterEach,
  afterAll,
  describe,
} from 'bun:test'
import {
  planGlobalLinks,
  previewBoxKeys,
  readLocalSecret,
  resolvePreviewHost,
} from './resolve-site-config'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
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

test('REGRESSION: an EMPTY value falls through instead of swallowing the chain', () => {
  /*
  `??` only skips null/undefined, so `PREVIEW_HOST=''` counted as set and hid both the site
  config and `~/local-secrets`. A CI `env: PREVIEW_HOST: ${{ secrets.MISSING }}` renders
  exactly that, and the bin then told you to create a secrets file that already existed and
  worked — the symptom that rung was added to abolish.
  */
  process.env.PREVIEW_HOST = ''
  expect(resolvePreviewHost(undefined, 'c@config')).toBe('c@config')
  process.env.PREVIEW_HOST = '   '
  expect(resolvePreviewHost(undefined, 'c@config')).toBe('c@config')
  delete process.env.PREVIEW_HOST
  process.env.PREVIEW_SSH = ''
  expect(resolvePreviewHost(undefined, 'c@config')).toBe('c@config')
  // …and a bare `--host=` likewise.
  expect(resolvePreviewHost('', 'c@config')).toBe('c@config')
})

test('surrounding whitespace is trimmed, not preserved into an ssh target', () => {
  expect(resolvePreviewHost('  deploy@box  ', undefined)).toBe('deploy@box')
})

describe('what the box says about its keys', () => {
  /*
  The tunnel's single-use links hand the browser this machine's key as a cookie across the
  box's domain, so the box's PREVIEW_DOMAIN and the keys it holds decide whether a link means
  what it says. A fake `ssh` runs the real remote script against a sandboxed preview.env.
  */
  const sandbox = mkdtempSync(path.join(tmpdir(), 'preview-box-'))
  const bin = path.join(sandbox, 'bin')
  mkdirSync(bin)
  writeFileSync(
    path.join(bin, 'ssh'),
    // As real ssh does: join the words with spaces and hand them to a shell, in a fresh
    // environment (the caller's exported keys must not stand in for the box's).
    `#!/bin/sh\nwhile [ "$1" = -o ]; do shift 2; done\nshift\nexec env -i PATH="$PATH" sh -c "$(printf '%s' "$*" | sed "s|/etc/caddy|${sandbox}|g")"\n`
  )
  chmodSync(path.join(bin, 'ssh'), 0o755)
  const PATH = process.env.PATH
  beforeEach(() => {
    process.env.PATH = `${bin}:${PATH}`
  })
  afterEach(() => {
    process.env.PATH = PATH
  })
  afterAll(() => rmSync(sandbox, { recursive: true, force: true }))
  const env = (text: string) =>
    writeFileSync(path.join(sandbox, 'preview.env'), text)
  const sha = (text: string) =>
    new Bun.CryptoHasher('sha256').update(text).digest('hex')

  const EDIT = 'edit_key_edit_key_edit_key_1'
  const VIEW = 'view_key_view_key_view_key_1'

  test('reads the domain and fingerprints the keys, never the keys', async () => {
    // Sourced, as the installer reads it: quotes, `export` and comments all agree.
    env(
      `# box\nexport PREVIEW_DOMAIN='dev.example.test'\nPREVIEW_EDIT_TOKEN=${EDIT}\nPREVIEW_TOKEN="${VIEW}"\n`
    )
    const box = await previewBoxKeys('me@box')
    expect(box).toEqual({
      domain: 'dev.example.test',
      editSha: sha(EDIT),
      viewSha: sha(VIEW),
    })
    expect(JSON.stringify(box)).not.toContain(EDIT)
  })

  test('a key the box does not hold reads as empty', async () => {
    env(`PREVIEW_DOMAIN=dev.example.test\nPREVIEW_TOKEN=${VIEW}\n`)
    expect(await previewBoxKeys('me@box')).toEqual({
      domain: 'dev.example.test',
      editSha: '',
      viewSha: sha(VIEW),
    })
  })

  test('a missing preview.env is named, not read as an empty one', async () => {
    rmSync(path.join(sandbox, 'preview.env'), { force: true })
    const box = await previewBoxKeys('me@box')
    expect(box.problem).toContain('missing or unreadable')
  })

  test('says why when there is no domain', async () => {
    env(`PREVIEW_TOKEN=${VIEW}\n`)
    expect(await previewBoxKeys('me@box')).toEqual({
      problem: '/etc/caddy/preview.env on me@box sets no PREVIEW_DOMAIN',
    })
  })

  describe('planGlobalLinks', () => {
    const keys = { edit: EDIT, view: VIEW, editGrants: 'edit' as const }
    const box = {
      domain: 'dev.example.test',
      editSha: sha(EDIT),
      viewSha: sha(VIEW),
    }

    test('offers a link for each key this workspace and the box share', () => {
      expect(planGlobalLinks({ keys, problems: [] }, box)).toEqual({
        kinds: ['edit', 'view'],
        domain: 'dev.example.test',
        notes: [],
      })
    })

    test('no edit link where the edit key opens read-only', () => {
      expect(
        planGlobalLinks(
          { keys: { ...keys, editGrants: 'view' }, problems: [] },
          box
        ).kinds
      ).toEqual(['view'])
    })

    test("a key that is not the box's gets no link, and says so", () => {
      // Its cookie would open this workspace and not the box's root or any other one.
      const plan = planGlobalLinks(
        { keys, problems: [] },
        { ...box, editSha: sha('rotated') }
      )
      expect(plan.kinds).toEqual(['view'])
      expect(plan.notes).toEqual([
        "PREVIEW_EDIT_TOKEN here is not the box's, so no edit link: put the same value in both files",
      ])
      expect(
        planGlobalLinks({ keys, problems: [] }, { ...box, viewSha: '' }).notes
      ).toEqual([
        'the box has no PREVIEW_TOKEN, so no view link: add it to /etc/caddy/preview.env and re-run tosijs-caddy-install',
      ])
    })

    test("passes on the dev server's own reasons, and the box's", () => {
      expect(
        planGlobalLinks(
          { keys: {}, problems: ['PREVIEW_TOKEN is too short'] },
          box
        )
      ).toEqual({ kinds: [], notes: ['PREVIEW_TOKEN is too short'] })
      expect(
        planGlobalLinks({ keys: {}, problems: [] }, box).notes[0]
      ).toContain('no global key on this machine')
      expect(
        planGlobalLinks({ keys, problems: [] }, { problem: 'no domain' })
      ).toEqual({ kinds: [], notes: ['no domain'] })
    })
  })
})
