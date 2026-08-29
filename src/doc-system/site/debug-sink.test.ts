import { test, expect } from 'bun:test'
import {
  sinkPathFor,
  appendToSink,
  MAX_BODY_BYTES,
  MAX_FILE_BYTES,
} from './debug-sink.js'

test('#99: off unless asked for', () => {
  // An unauthenticated write endpoint on a LAN-reachable server should be a decision somebody
  // made, not a default they inherited.
  expect(sinkPathFor(undefined, '/proj')).toBe(null)
  expect(sinkPathFor(false, '/proj')).toBe(null)
})

test('#99: the default path is outside the project', () => {
  /*
  A file under the project root gets swept into a build, a `git add -A` or a published tarball by
  whichever broad glob notices it first. Keyed by project path so two checkouts do not interleave
  their telemetry into one file.
  */
  const a = sinkPathFor(true, '/proj/one', '/tmp')
  const b = sinkPathFor(true, '/proj/two', '/tmp')
  expect(a).toStartWith('/tmp/')
  expect(a).not.toContain('/proj/one')
  expect(a).not.toBe(b)
})

test('#99: an explicit path is taken as given', () => {
  // You typed it; confining it further would be second-guessing.
  expect(sinkPathFor('logs/xr.jsonl', '/proj')).toBe('/proj/logs/xr.jsonl')
})

test('#99: one event is one line, whatever the payload contains', () => {
  /*
  The format's whole value is that `tail -f` shows one event per line. A payload containing a
  newline would otherwise split into two, and the reader would have no way to tell which.
  */
  const written: string[] = []
  const res = appendToSink('/sink', '{"a":1}\nnot a second event', {
    sizeOf: () => 0,
    append: (_p, l) => written.push(l),
  })
  expect(res.ok).toBe(true)
  expect(written).toHaveLength(1)
  expect(written[0].endsWith('\n')).toBe(true)
  expect(written[0].slice(0, -1)).not.toContain('\n')
})

test('#99: an oversize body is refused rather than truncated', () => {
  // Truncating would produce a line that looks like an event and is not one.
  const res = appendToSink('/sink', 'x'.repeat(MAX_BODY_BYTES + 1), {
    sizeOf: () => 0,
    append: () => {
      throw new Error('must not write')
    },
  })
  expect(res.ok).toBe(false)
  if (!res.ok) expect(res.status).toBe(413)
})

test('#99: the file stops growing, so a looping page cannot fill a disk', () => {
  const res = appendToSink('/sink', '{}', {
    sizeOf: () => MAX_FILE_BYTES,
    append: () => {
      throw new Error('must not write')
    },
  })
  expect(res.ok).toBe(false)
  if (!res.ok) expect(res.status).toBe(507)
})

test('#99: malformed input is still recorded', () => {
  /*
  The sink is a log, not an API. A page mid-crash may well send something unparseable, and that
  is exactly the moment you least want the server to drop it.
  */
  const written: string[] = []
  const res = appendToSink('/sink', 'not json at all {{{', {
    sizeOf: () => 0,
    append: (_p, l) => written.push(l),
  })
  expect(res.ok).toBe(true)
  expect(written[0]).toContain('not json at all')
})
