/*
One writer at a time for the output tree.

`buildSite()` does `rm -rf <outputDir>` and repopulates it. Run a standalone build while a
dev server is watching the same repo and there are two writers on one tree: the watcher sees
the other builder's thousands of file events and rebuilds INTO directories that are being
concurrently wiped. Observed in tosijs-3d — the dev server was simply gone afterwards, with
no error anywhere, and `docs/` left at 16 entries instead of ~2600 (tosijs-ui#51).

The expensive part of that was never the crash. It was that "the server is gone" is a
forensic exercise: nothing said what happened, so it read as a mystery rather than as two
builds colliding.

So: whoever owns the tree says so, and the second writer refuses with a message naming the
first. Deliberately REFUSE rather than wait — the second build was started by someone who
believes nothing else is running, and blocking silently for an unknown time is a worse answer
than telling them what is.

The lock lives in the system temp dir keyed by the project root, NOT in the output tree
(which gets deleted mid-build) and not in the repo (which would need gitignoring by every
adopter). It is advisory: it coordinates this tool with itself, and claims nothing about
other processes.
*/

import * as path from 'path'
import { tmpdir } from 'os'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'

export interface LockHolder {
  pid: number
  role: 'dev-server' | 'build'
  /** epoch ms, for the message only — staleness is decided by liveness, never by age */
  startedAt: number
  root: string
  /** dev server only */
  port?: number
}

/** A stable per-project lock path. Two checkouts of one project lock independently. */
export function lockPathFor(root: string, dir: string = tmpdir()): string {
  const resolved = path.resolve(root)
  // FNV-1a — short, stable, and no crypto import for what is just a filename.
  let hash = 0x811c9dc5
  for (let i = 0; i < resolved.length; i++) {
    hash ^= resolved.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return path.join(dir, `tosijs-build-${hash.toString(16)}.lock`)
}

export type LockDecision =
  | { action: 'take' }
  | { action: 'reenter' }
  | { action: 'refuse'; holder: LockHolder }

/**
 * Who gets to write, given who currently holds the lock.
 *
 * Kept separate from the filesystem because every interesting case is a rule, not an I/O
 * result: a dead holder's lock must not wedge the project (a crashed server would otherwise
 * lock the repo until someone found a file they do not know exists), and a dev server
 * running its OWN rebuild must not deadlock against the lock it is holding.
 */
export function lockDecision(
  existing: LockHolder | null,
  self: { pid: number },
  isAlive: (pid: number) => boolean
): LockDecision {
  if (!existing) return { action: 'take' }
  // Our own lock — the dev server calls buildSite() on every rebuild while holding it.
  if (existing.pid === self.pid) return { action: 'reenter' }
  // A lock whose owner is gone is debris, not a claim. Staleness is liveness, never age:
  // a legitimate build can take minutes, and a timeout would eventually be wrong for both.
  if (!isAlive(existing.pid)) return { action: 'take' }
  return { action: 'refuse', holder: existing }
}

/** The message the refused build prints. Names the holder, and what to do about it. */
export function describeHolder(holder: LockHolder): string {
  const what =
    holder.role === 'dev-server'
      ? `A dev server (pid ${holder.pid}${
          holder.port ? `, port ${holder.port}` : ''
        })`
      : `Another build (pid ${holder.pid})`
  return (
    `\n🛑 ${what} is already building in ${holder.root}\n\n` +
    `   Two builders on one output tree race: each does \`rm -rf\` on the directory the\n` +
    `   other is writing into, which has silently killed a dev server and left a\n` +
    `   half-populated site.\n\n` +
    `   Stop it first, or run this build elsewhere.\n` +
    `   If that process is already gone, this lock is stale and the next run will take it.\n`
  )
}

export function isProcessAlive(pid: number): boolean {
  try {
    // Signal 0 performs the permission/existence check without delivering anything.
    process.kill(pid, 0)
    return true
  } catch (e) {
    // EPERM means it exists but belongs to another user — alive for our purposes.
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Who, if anyone, holds this project's lock right now — or `null` if nobody live does.
 *
 * Exported so a `--stop` can target THIS project's dev server by pid instead of by argv
 * pattern. `pkill -f 'bun bin/site.ts'` matches every dev server on the machine, because every
 * project on this pipeline runs an identical command line — so a sibling checkout, a worktree
 * or another agent's session dies to a command that reads as "restart mine" (tosijs-ui#117).
 * Observed five times in one working day, twice while a tunnel link was in use by a remote
 * reviewer.
 *
 * The record already existed for the build lock; only a reader and a command were missing.
 */
export function currentHolder(
  root = '.',
  opts: { dir?: string; isAlive?: (pid: number) => boolean } = {}
): LockHolder | null {
  const holder = readLock(lockPathFor(root, opts.dir))
  if (!holder) return null
  const alive = opts.isAlive ?? isProcessAlive
  // Staleness is decided by liveness, never by age — a crashed server must not wedge a project.
  return alive(holder.pid) ? holder : null
}

function readLock(file: string): LockHolder | null {
  try {
    if (!existsSync(file)) return null
    return JSON.parse(readFileSync(file, 'utf8')) as LockHolder
  } catch {
    // Unparseable (a truncated write, someone's editor) — treat as absent rather than
    // wedging the project over a file nobody meant to create.
    return null
  }
}

export interface AcquiredLock {
  ok: boolean
  holder?: LockHolder
  release: () => void
}

/**
 * Claim the output tree, or report who has it.
 *
 * `release` is always safe to call — including after a re-entrant acquire, where it
 * deliberately does nothing so an inner build cannot release the dev server's lock.
 */
export function acquireBuildLock(
  root: string,
  role: LockHolder['role'],
  opts: {
    port?: number
    dir?: string
    isAlive?: (pid: number) => boolean
    pid?: number
  } = {}
): AcquiredLock {
  const file = lockPathFor(root, opts.dir)
  const pid = opts.pid ?? process.pid
  const decision = lockDecision(
    readLock(file),
    { pid },
    opts.isAlive ?? isProcessAlive
  )
  if (decision.action === 'refuse') {
    return { ok: false, holder: decision.holder, release: () => {} }
  }
  if (decision.action === 'reenter') {
    return { ok: true, release: () => {} }
  }
  const holder: LockHolder = {
    pid,
    role,
    startedAt: Date.now(),
    root: path.resolve(root),
    ...(opts.port === undefined ? {} : { port: opts.port }),
  }
  try {
    writeFileSync(file, JSON.stringify(holder))
  } catch {
    // An unwritable temp dir must not stop a build. The lock is an aid, not a gate on
    // whether the project can be built at all.
    return { ok: true, release: () => {} }
  }
  return {
    ok: true,
    release: () => {
      // Only remove a lock we still own — a stale-takeover by someone else must not be
      // deleted out from under them by our late release.
      const current = readLock(file)
      if (current?.pid !== pid) return
      try {
        unlinkSync(file)
      } catch {
        /* already gone */
      }
    },
  }
}
