/*
A fingerprint of a site config, so a build handed to a running dev server can tell whether the
server is building the same config (#3772, tosijs-ui#241).

The server builds the config it was LAUNCHED with. Edit the config file without restarting it,
and a delegated build wrote the old config's site and reported success. Comparing the
fingerprints turns that into a refusal that says to restart.

Functions count by their source, so a changed `prebuild` is a changed config. Key order is the
order the config was written in, which is the same for two processes that load the same file.
*/

import { createHash } from 'crypto'

export function configFingerprint(config: unknown): string {
  const seen = new WeakSet<object>()
  const text = JSON.stringify(config, (_key, value) => {
    if (typeof value === 'function') return `fn:${String(value)}`
    if (value instanceof RegExp) return `re:${String(value)}`
    if (typeof value === 'bigint') return `big:${String(value)}`
    if (value !== null && typeof value === 'object') {
      if (seen.has(value)) return '[circular]'
      seen.add(value)
    }
    return value
  })
  return createHash('sha256')
    .update(text ?? '')
    .digest('hex')
    .slice(0, 16)
}
