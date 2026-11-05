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

export interface BuildServerIdentity {
  root: string
  pid: number
  config: string
}

/**
 * Why a dev server refuses a `/__build` request, as the 409 reply's body, or null to build.
 *
 * A request for another project's tree, or with a config fingerprint other than the one the
 * server was launched with, is refused BEFORE anything is built (#3772, #3863).
 */
export function buildRequestRefusal(
  params: URLSearchParams,
  server: BuildServerIdentity
): Record<string, unknown> | null {
  const root = params.get('root')
  if (root !== null && root !== server.root)
    return {
      ok: false,
      detail: `this server builds ${server.root}, not ${root}`,
      pid: server.pid,
      root: server.root,
    }
  const config = params.get('config')
  if (config !== null && config !== server.config)
    return {
      ok: false,
      detail:
        `🛑 this dev server (pid ${server.pid}) was started with a different site config ` +
        `(edited since, or loaded with a different environment), so it would build the ` +
        `old one. Restart it, then build again. If this happens on every build, the config ` +
        `computes a value that differs per process (Date.now(), a random id, an environment ` +
        `variable one of the two lacks): compute it in a prebuild step instead, or pass it ` +
        `in through the environment both processes share.`,
      pid: server.pid,
      root: server.root,
      config: server.config,
    }
  return null
}

/**
 * What a delegated build says when the server's reply does not prove it built THIS config, or
 * null when it does. A server too old to send a fingerprint has already built with whatever
 * config it was started with, so it cannot be trusted either.
 */
export function staleConfigMessage(
  replyConfig: string | undefined,
  fingerprint: string,
  where: { port: number; pid: number }
): string | null {
  if (replyConfig === fingerprint) return null
  return `🛑 the dev server on ${where.port} is building ${
    replyConfig === undefined
      ? 'with a version of tosijs-ui that cannot say which site config it has'
      : 'a different site config from this one (edited since it started, or loaded with a different environment)'
  }. Restart it (pid ${where.pid}), then build again.\n`
}
