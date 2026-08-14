import { test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  lockDecision,
  lockPathFor,
  acquireBuildLock,
  describeHolder,
  type LockHolder,
} from './build-lock'

const holder = (over: Partial<LockHolder> = {}): LockHolder => ({
  pid: 4242,
  role: 'dev-server',
  startedAt: 1,
  root: '/proj',
  ...over,
})

const alive = () => true
const dead = () => false

// ── who gets to write ────────────────────────────────────────────────────────

test('an unheld tree is taken', () => {
  expect(lockDecision(null, { pid: 1 }, alive)).toEqual({ action: 'take' })
})

test('a live OTHER process is refused, and reported', () => {
  const d = lockDecision(holder(), { pid: 1 }, alive)
  expect(d.action).toBe('refuse')
  expect((d as any).holder.pid).toBe(4242)
})

test('REGRESSION: a dead holder is debris, not a claim', () => {
  /*
  Staleness has to be decided by LIVENESS. If a crashed dev server's lock survived, the
  project would be unbuildable until someone found a file in the temp dir they do not know
  exists — a worse failure than the race this prevents, and harder to diagnose.
  */
  expect(lockDecision(holder(), { pid: 1 }, dead)).toEqual({ action: 'take' })
})

test('REGRESSION: the holder re-entering does not deadlock against itself', () => {
  // The dev server holds the lock for its whole life and calls buildSite() on EVERY
  // rebuild. Without this, the first file change would refuse to build.
  expect(lockDecision(holder({ pid: 77 }), { pid: 77 }, alive)).toEqual({
    action: 'reenter',
  })
})

test('staleness is never decided by age — a slow build is not a dead one', () => {
  // A legitimate build can take minutes; a timeout would eventually be wrong for both a
  // long build (killed early) and a fast crash (waited out for nothing).
  const ancient = holder({ startedAt: 0 })
  expect(lockDecision(ancient, { pid: 1 }, alive).action).toBe('refuse')
  const justNow = holder({ startedAt: Date.now() })
  expect(lockDecision(justNow, { pid: 1 }, dead).action).toBe('take')
})

// ── the lock file ────────────────────────────────────────────────────────────

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'build-lock-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

test('the path is per-project and stable', () => {
  expect(lockPathFor('/proj/a', dir)).toBe(lockPathFor('/proj/a', dir))
  expect(lockPathFor('/proj/a', dir)).not.toBe(lockPathFor('/proj/b', dir))
})

test('the lock is NOT in the output tree, which gets deleted mid-build', () => {
  // `buildSite` does `rm -rf <outputDir>`; a lock living there would delete itself.
  expect(lockPathFor('/proj', dir).startsWith(dir)).toBe(true)
  expect(lockPathFor('/proj', dir)).not.toContain('/proj')
})

test('a second builder is refused while the first holds it', () => {
  const first = acquireBuildLock('/proj', 'dev-server', {
    dir,
    pid: 111,
    port: 8030,
    isAlive: alive,
  })
  expect(first.ok).toBe(true)

  const second = acquireBuildLock('/proj', 'build', {
    dir,
    pid: 222,
    isAlive: alive,
  })
  expect(second.ok).toBe(false)
  expect(second.holder?.pid).toBe(111)
  expect(second.holder?.port).toBe(8030)
})

test('after release the tree is free again', () => {
  const first = acquireBuildLock('/proj', 'dev-server', {
    dir,
    pid: 111,
    isAlive: alive,
  })
  first.release()
  expect(
    acquireBuildLock('/proj', 'build', { dir, pid: 222, isAlive: alive }).ok
  ).toBe(true)
})

test('REGRESSION: a re-entrant release does NOT free the holder’s lock', () => {
  // The dev server's own rebuild acquires re-entrantly; if its release removed the file,
  // the server would silently stop owning the tree after its first rebuild.
  const server = acquireBuildLock('/proj', 'dev-server', {
    dir,
    pid: 111,
    isAlive: alive,
  })
  const rebuild = acquireBuildLock('/proj', 'build', {
    dir,
    pid: 111,
    isAlive: alive,
  })
  expect(rebuild.ok).toBe(true)
  rebuild.release()
  expect(existsSync(lockPathFor('/proj', dir))).toBe(true)
  expect(
    acquireBuildLock('/proj', 'build', { dir, pid: 222, isAlive: alive }).ok
  ).toBe(false)
  server.release()
})

test('a late release does not delete somebody else’s lock', () => {
  // Crash, someone else takes the stale lock, then our `finally` finally runs.
  const first = acquireBuildLock('/proj', 'build', {
    dir,
    pid: 111,
    isAlive: alive,
  })
  acquireBuildLock('/proj', 'dev-server', { dir, pid: 222, isAlive: dead })
  first.release()
  expect(existsSync(lockPathFor('/proj', dir))).toBe(true)
})

test('an unparseable lock is treated as absent rather than wedging the project', () => {
  writeFileSync(lockPathFor('/proj', dir), 'not json{{')
  expect(
    acquireBuildLock('/proj', 'build', { dir, pid: 1, isAlive: alive }).ok
  ).toBe(true)
})

test('the refusal names the holder and what to do', () => {
  const msg = describeHolder(holder({ pid: 999, port: 8030 }))
  expect(msg).toContain('999')
  expect(msg).toContain('8030')
  expect(msg).toContain('/proj')
  expect(msg.toLowerCase()).toContain('stale')
})
