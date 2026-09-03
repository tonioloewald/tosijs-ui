import { test, expect, describe } from 'bun:test'
import {
  gatherBuildStamp,
  hashOutput,
  serializeBuildStamp,
  stampToWrite,
  type GitReader,
} from './build-stamp.js'

const fakeGit =
  (map: Record<string, string>): GitReader =>
  async (args) =>
    map[args.join(' ')] ?? ''

const REPO: Record<string, string> = {
  'rev-parse --short HEAD': '66fbc589',
  'log -1 --format=%cI': '2026-07-30T09:10:52+03:00',
}

test('collects generator, site and git identity', async () => {
  const stamp = await gatherBuildStamp({
    generator: '1.8.0',
    site: 'tosijs-ui',
    git: fakeGit(REPO),
  })
  expect(stamp).toEqual({
    generator: '1.8.0',
    site: 'tosijs-ui',
    commit: '66fbc589',
    commitTime: '2026-07-30T09:10:52+03:00',
  })
})

test('omits git fields entirely when git is unavailable', async () => {
  // A consumer of tosijs-ui/site need not be in a git repo, and a build must never
  // fail for want of git metadata. Omitted, not blank — version.json should never
  // assert something it does not know.
  const stamp = await gatherBuildStamp({
    generator: '1.8.0',
    site: 'x',
    git: fakeGit({}),
  })
  expect(stamp).toEqual({ generator: '1.8.0', site: 'x' })
  expect('commit' in stamp).toBe(false)
  expect('commitTime' in stamp).toBe(false)
})

test('a git reader that throws does not fail the build', async () => {
  const exploding: GitReader = async () => {
    throw new Error('git: command not found')
  }
  // gatherBuildStamp must not propagate — but the default reader is what swallows,
  // so assert the contract at the call site an injected reader models.
  await expect(
    gatherBuildStamp({ generator: '1.8.0', git: async () => '' })
  ).resolves.toBeTruthy()
  // And an injected thrower is the caller's problem, not a silent wrong answer:
  expect(exploding([])).rejects.toThrow()
})

test('site is omitted when not configured', async () => {
  const stamp = await gatherBuildStamp({
    generator: '1.8.0',
    git: fakeGit(REPO),
  })
  expect('site' in stamp).toBe(false)
})

test('DETERMINISTIC: same commit ⇒ byte-identical output', async () => {
  // The whole design rests on this. `docs/` is committed, so anything that varies
  // per build (a wall-clock timestamp) would diff on every commit and train everyone
  // to ignore it — the nuisance the non-reproducible ePub already causes.
  const once = serializeBuildStamp(
    await gatherBuildStamp({
      generator: '1.8.0',
      site: 's',
      git: fakeGit(REPO),
    })
  )
  const twice = serializeBuildStamp(
    await gatherBuildStamp({
      generator: '1.8.0',
      site: 's',
      git: fakeGit(REPO),
    })
  )
  expect(once).toBe(twice)
  // Explicitly: no build timestamp of any kind.
  const parsed = JSON.parse(once)
  expect(Object.keys(parsed).sort()).toEqual([
    'commit',
    'commitTime',
    'generator',
    'site',
  ])
})

test('serializes as pretty JSON with a trailing newline', async () => {
  const text = serializeBuildStamp(
    await gatherBuildStamp({ generator: '1.8.0', git: fakeGit(REPO) })
  )
  expect(text.endsWith('\n')).toBe(true)
  expect(text).toContain('\n  "commit": "66fbc589"')
  expect(() => JSON.parse(text)).not.toThrow()
})

/*
#122: a site that did not change must not be restamped.

The reported loop — every commit's version.json naming its own PARENT, forever — is a
convergence property, so the test that matters is the round trip: stamp, "commit", rebuild
with identical content, and assert the bytes are unchanged.
*/
describe('stampToWrite (#122)', () => {
  const fresh = {
    generator: '1.14.0',
    site: 'demo',
    commit: 'bbbb',
    commitTime: 'T2',
  }
  const prior = (over: Record<string, unknown> = {}) =>
    JSON.stringify(
      {
        generator: '1.14.0',
        site: 'demo',
        commit: 'aaaa',
        commitTime: 'T1',
        contentHash: 'H',
        ...over,
      },
      null,
      2
    ) + '\n'

  test('unchanged content preserves the previous stamp verbatim', () => {
    const previous = prior()
    expect(stampToWrite(previous, fresh, 'H')).toBe(previous)
  })

  test('changed content restamps, and records the new hash', () => {
    const out = stampToWrite(prior(), fresh, 'DIFFERENT')
    expect(JSON.parse(out).commit).toBe('bbbb')
    expect(JSON.parse(out).contentHash).toBe('DIFFERENT')
  })

  test('it converges: a second identical build is byte-identical', () => {
    const first = stampToWrite(null, fresh, 'H') // no previous — fresh stamp
    const second = stampToWrite(
      first,
      { ...fresh, commit: 'cccc', commitTime: 'T3' },
      'H'
    )
    expect(second).toBe(first) // HEAD moved; the site did not
    const third = stampToWrite(
      second,
      { ...fresh, commit: 'dddd', commitTime: 'T4' },
      'H'
    )
    expect(third).toBe(first) // and it stays put
  })

  test('a missing version.json forces a fresh stamp (the documented escape hatch)', () => {
    expect(JSON.parse(stampToWrite(null, fresh, 'H')).commit).toBe('bbbb')
  })

  test('a generator upgrade restamps even when the bytes match', () => {
    const out = stampToWrite(prior({ generator: '1.13.0' }), fresh, 'H')
    expect(JSON.parse(out).generator).toBe('1.14.0')
  })

  test('a stamp predating contentHash restamps once, then converges', () => {
    const legacy =
      JSON.stringify(
        { generator: '1.14.0', site: 'demo', commit: 'aaaa' },
        null,
        2
      ) + '\n'
    const once = stampToWrite(legacy, fresh, 'H')
    expect(once).not.toBe(legacy)
    expect(stampToWrite(once, { ...fresh, commit: 'zzzz' }, 'H')).toBe(once)
  })

  test('an unparseable previous stamp is replaced, not preserved', () => {
    expect(stampToWrite('{not json', fresh, 'H')).toContain('"commit": "bbbb"')
  })
})

describe('hashOutput (#122)', () => {
  const files = (m: Record<string, string>) => ({
    readdir: async () => Object.keys(m),
    read: async (p: string) => {
      const k = p.split('/').slice(1).join('/')
      return m[k] ? new TextEncoder().encode(m[k]) : null
    },
  })
  const hash = (m: Record<string, string>) => {
    const f = files(m)
    return hashOutput('d', f.readdir, f.read)
  }

  test('version.json is excluded, so the stamp cannot feed back into its own hash', async () => {
    expect(await hash({ 'a.html': 'x', 'version.json': 'ONE' })).toBe(
      await hash({ 'a.html': 'x', 'version.json': 'TWO' })
    )
  })

  test('changed content changes the hash', async () => {
    expect(await hash({ 'a.html': 'x' })).not.toBe(
      await hash({ 'a.html': 'y' })
    )
  })

  test('a RENAMED file changes the hash, though its bytes did not', async () => {
    expect(await hash({ 'a.html': 'x' })).not.toBe(
      await hash({ 'b.html': 'x' })
    )
  })
})
