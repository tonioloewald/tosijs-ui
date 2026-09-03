import { test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  lockDecision,
  lockPathFor,
  acquireBuildLock,
  describeHolder,
  currentHolder,
  type LockHolder,
} from './build-lock'
import { canDelegateTo } from './orchestrator.js'

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

test("currentHolder reports this project's live dev server (#117)", () => {
  /*
  What `--stop` uses instead of `pkill -f 'bun bin/dev.ts'`, which matches EVERY dev server on
  the machine because every project on this pipeline runs an identical command line. A sibling
  checkout dies to a command that reads as "restart mine", and the victim's symptoms — live pid,
  no listener — are indistinguishable from #91's zombie, so it costs a fresh diagnosis each time.
  */
  const dir = mkdtempSync(join(tmpdir(), 'holder-'))
  try {
    const lock = acquireBuildLock('/proj/a', 'dev-server', {
      dir,
      pid: 4242,
      port: 8030,
      isAlive: () => true,
    })
    expect(lock.ok).toBe(true)
    const held = currentHolder('/proj/a', { dir, isAlive: () => true })
    expect(held?.pid).toBe(4242)
    expect(held?.port).toBe(8030)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('currentHolder ignores a dead holder rather than reporting a stale pid', () => {
  // Staleness is decided by liveness, never by age — otherwise a crashed server wedges the
  // project, and `--stop` would signal a pid that has since been reused by something else.
  const dir = mkdtempSync(join(tmpdir(), 'holder-'))
  try {
    acquireBuildLock('/proj/b', 'dev-server', {
      dir,
      pid: 999999,
      isAlive: () => true,
    })
    expect(currentHolder('/proj/b', { dir, isAlive: () => false })).toBe(null)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('two checkouts of one project hold independently', () => {
  // The whole point: stopping one must not touch the other.
  const dir = mkdtempSync(join(tmpdir(), 'holder-'))
  try {
    acquireBuildLock('/checkout/one', 'dev-server', {
      dir,
      pid: 111,
      isAlive: () => true,
    })
    acquireBuildLock('/checkout/two', 'dev-server', {
      dir,
      pid: 222,
      isAlive: () => true,
    })
    expect(
      currentHolder('/checkout/one', { dir, isAlive: () => true })?.pid
    ).toBe(111)
    expect(
      currentHolder('/checkout/two', { dir, isAlive: () => true })?.pid
    ).toBe(222)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

/*
Delegation, not refusal (the "kill the server to build" friction).

`bun run build` used to refuse whenever a dev server held the lock, and the workflow that
produced was: kill the server, build, forget to restart it — which cost cycles and twice took
a live tunnel offline mid-session. It now asks the server to build instead. These pin the
DECISION of when that is allowed; the wire behaviour is covered end-to-end by driving a real
server, which is the only place the loopback gate can be exercised honestly.
*/
test('only a live dev-server holder with a usable port can be delegated to', () => {
  /*
  Imports the SHIPPED predicate. The previous version declared its own `canDelegate` inside
  this file — a verbatim copy of the production condition — so it passed forever and stayed
  green when the real one was broadened to accept `role: 'build'`. Mutation-tested by the
  1.13.0 review, which is how it was found.
  */
  expect(canDelegateTo({ role: 'dev-server', port: 8787 })).toBe(true)
  // A second `bun run build` is not something to hand work to — refuse, as before.
  expect(canDelegateTo({ role: 'build', port: 8787 })).toBe(false)
  // Unreachable, or a value that has no business being interpolated into a URL.
  expect(canDelegateTo({ role: 'dev-server' })).toBe(false)
  expect(canDelegateTo({ role: 'dev-server', port: 0 })).toBe(false)
  expect(canDelegateTo({ role: 'dev-server', port: 99999 })).toBe(false)
  expect(canDelegateTo({ role: 'dev-server', port: 1.5 })).toBe(false)
})
