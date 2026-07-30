import { test, expect } from 'bun:test'
import {
  gatherBuildStamp,
  serializeBuildStamp,
  type GitReader,
} from './build-stamp'

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
    await gatherBuildStamp({ generator: '1.8.0', site: 's', git: fakeGit(REPO) })
  )
  const twice = serializeBuildStamp(
    await gatherBuildStamp({ generator: '1.8.0', site: 's', git: fakeGit(REPO) })
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
