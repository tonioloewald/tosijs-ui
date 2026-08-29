import path from 'path'
import { tmpdir } from 'os'
import { appendFileSync, existsSync, mkdirSync, statSync } from 'fs'

/*
An append-only telemetry sink for pages that are not on this machine.
*/

/** Bodies larger than this are refused. A diagnostic line is small; a payload is not. */
export const MAX_BODY_BYTES = 64 * 1024

/** The file stops growing here, so a looping page cannot fill a disk while nobody is looking. */
export const MAX_FILE_BYTES = 32 * 1024 * 1024

/**
 * Where the sink lives.
 *
 * Outside the repo by default, and that is deliberate rather than tidy-mindedness: a file under
 * the project root gets swept into a build, a `git add -A`, or a published tarball by whichever
 * broad glob notices it first. Keyed by project path so two checkouts do not interleave their
 * telemetry into one file.
 *
 * An explicit string is taken as given — you asked for it, and confining it further would just
 * be second-guessing a path you typed.
 */
export function sinkPathFor(
  setting: boolean | string | undefined,
  root: string,
  dir: string = tmpdir()
): string | null {
  if (!setting) return null
  if (typeof setting === 'string') return path.resolve(root, setting)
  const resolved = path.resolve(root)
  // FNV-1a — short, stable, no crypto import for what is only a filename.
  let hash = 0x811c9dc5
  for (let i = 0; i < resolved.length; i++) {
    hash ^= resolved.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return path.join(dir, `tosijs-debug-${hash.toString(16)}.jsonl`)
}

export type SinkResult =
  | { ok: true }
  | { ok: false; status: 413 | 507; reason: string }

/**
 * Append one line, or explain why not.
 *
 * The body is written as ONE line with newlines escaped, because the format's whole value is
 * that `tail -f` shows one event per line — a payload containing a newline would otherwise split
 * into two events, and the reader would never know which.
 *
 * Nothing here parses or validates the JSON. The sink is a log: a page mid-crash may well send
 * something malformed, and that is exactly the moment you least want the server to drop it.
 */
export function appendToSink(
  file: string,
  body: string,
  opts: {
    maxBody?: number
    maxFile?: number
    sizeOf?: (p: string) => number
    append?: (p: string, line: string) => void
  } = {}
): SinkResult {
  const maxBody = opts.maxBody ?? MAX_BODY_BYTES
  const maxFile = opts.maxFile ?? MAX_FILE_BYTES
  if (Buffer.byteLength(body, 'utf8') > maxBody) {
    return {
      ok: false,
      status: 413,
      reason: `debug-sink body over ${maxBody} bytes`,
    }
  }
  const sizeOf =
    opts.sizeOf ?? ((p: string) => (existsSync(p) ? statSync(p).size : 0))
  if (sizeOf(file) >= maxFile) {
    return {
      ok: false,
      status: 507,
      reason: `debug-sink is full (${maxFile} bytes) — delete it to continue`,
    }
  }
  const line = body.replace(/\r?\n/g, '\\n') + '\n'
  const write =
    opts.append ??
    ((p: string, l: string) => {
      mkdirSync(path.dirname(p), { recursive: true })
      appendFileSync(p, l, 'utf8')
    })
  write(file, line)
  return { ok: true }
}
