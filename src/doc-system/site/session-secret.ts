/*
The per-project secret that signs link passes (dev-auth.ts, LINK PASSES), so a session started
from a plain `--link` / `--share` survives a dev-server restart (board #3416).

It lives at `<project>/.tosijs-dev/session-secret`:

- OUTSIDE the served output. The dev server serves the output folder and, through the source
  editor, only files the doc corpus names; a launch whose output folder would contain the secret
  is refused (`assertSecretNotServed`).
- NOT COMMITTED. The folder carries its own `.gitignore` of `*`, so this holds in an adopter's
  repo without editing theirs.
- READABLE BY ITS OWNER ONLY. Created 0600 in a 0700 folder, and refused at use if its mode lets
  anyone else read it, the way ssh refuses a private key.

Deleting it ROTATES it: every link pass it signed stops opening anything, at once, on the next
request (it is read per use, never cached), and the next redeemed link creates a fresh one.

Build-time only. Never import this from browser code.
*/

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs'
import { randomBytes } from 'node:crypto'
import * as path from 'path'

export const SESSION_SECRET_DIR = '.tosijs-dev'
export const SESSION_SECRET_FILE = 'session-secret'

/** 256 bits, base64url: 43 characters. */
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function sessionSecretPath(projectRoot: string): string {
  return path.join(
    path.resolve(projectRoot),
    SESSION_SECRET_DIR,
    SESSION_SECRET_FILE
  )
}

/**
 * Refuse a configuration whose output folder holds the secret: the dev server would serve it,
 * and anyone who read it could sign a pass of their own.
 */
export function assertSecretNotServed(file: string, outputDir: string): void {
  const out = path.resolve(outputDir) + path.sep
  if (path.resolve(file).startsWith(out)) {
    throw new Error(
      `the link-pass secret ${file} is inside the output folder ${outputDir}, which the dev ` +
        `server serves. Use an output folder that does not contain ${SESSION_SECRET_DIR}/.`
    )
  }
}

/**
 * The secret, or null when there is none yet (nothing has been signed with it, so no pass can
 * be valid). Throws when it exists but is unusable, saying how to fix it: a secret others can
 * read, or one that is not what this module writes.
 */
export function readSessionSecret(file: string): string | null {
  if (!existsSync(file)) return null
  if (process.platform !== 'win32' && (statSync(file).mode & 0o077) !== 0) {
    throw new Error(
      `${file} can be read by users other than its owner. Run \`chmod 600 ${file}\`, or delete ` +
        `it to rotate it (every restart-surviving link session ends).`
    )
  }
  const secret = readFileSync(file, 'utf8').trim()
  if (!SECRET_PATTERN.test(secret)) {
    throw new Error(
      `${file} is not a link-pass secret. Delete it and a new one is made on the next ` +
        `redeemed link (every restart-surviving link session ends).`
    )
  }
  return secret
}

/** The secret, created (0600, in a self-ignoring 0700 folder) if there is none yet. */
export function ensureSessionSecret(file: string): string {
  const existing = readSessionSecret(file)
  if (existing) return existing
  const dir = path.dirname(file)
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  if (process.platform !== 'win32') chmodSync(dir, 0o700)
  const ignore = path.join(dir, '.gitignore')
  if (!existsSync(ignore))
    writeFileSync(
      ignore,
      '# Machine-local secrets for the tosijs-ui dev server. Never commit.\n*\n'
    )
  try {
    // `wx`: if two requests race to create it, the second reads the first's.
    writeFileSync(file, randomBytes(32).toString('base64url') + '\n', {
      mode: 0o600,
      flag: 'wx',
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
  return readSessionSecret(file)!
}
