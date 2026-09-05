/*
Where in the tree does an advisory's package actually sit? (tosijs-ui#56)

The gate classifies findings on ONE axis — severity — so a HIGH in a webpack plugin under
`react-scripts` fails a build exactly as hard as a HIGH in the HTTP client. Reported by a
consumer running `buildSite` inside an app monorepo: **18 high/critical advisories in the tree,
of which the runtime-reachable subset was a small fraction.** Blocking on the rest would have
bricked local dev for a team over risk they do not carry.

`bun audit` offers no help here — its only filters are `--audit-level` and `--ignore` — so the
walk has to be done from manifests.

CONSERVATIVE BY CONSTRUCTION. Every ambiguity resolves to `runtime`:

  - Root `dependencies` AND `optionalDependencies` AND `peerDependencies` are all runtime
    seeds. A peer is provided by the consumer and ends up in *their* app, so from a blast-radius
    point of view it is production code even though it is not installed here.
  - A package we cannot resolve is `runtime`, not build-only. The failure mode of guessing
    wrong in the other direction is a security finding silently downgraded, and that is the one
    outcome worth engineering against.

This DOES NOT decide policy — it only labels. What blocks is decided by the caller, which by
default still blocks on severity alone (see `AuditConfig.blockOn`); changing that silently
would be weakening a security gate on someone else's behalf.
*/

export type Reach = 'runtime' | 'build-only'

export interface RootManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/**
 * Mark every package reachable from the root's runtime edges.
 *
 * `depsOf` returns an installed package's own `dependencies` (plus optional), or `undefined`
 * when it cannot be resolved — which counts as reachable, per the note above.
 */
export function runtimeReachable(
  root: RootManifest,
  depsOf: (pkg: string) => Record<string, string> | undefined
): Set<string> {
  const seen = new Set<string>()
  const queue = [
    ...Object.keys(root.dependencies ?? {}),
    ...Object.keys(root.optionalDependencies ?? {}),
    ...Object.keys(root.peerDependencies ?? {}),
  ]
  while (queue.length) {
    const pkg = queue.shift() as string
    if (seen.has(pkg)) continue
    seen.add(pkg)
    const deps = depsOf(pkg)
    // Unresolvable: we already counted it as reachable by adding it to `seen`; we simply
    // cannot follow it further. Deliberately not an error — a partial install must not
    // turn the gate into a crash.
    if (deps) queue.push(...Object.keys(deps))
  }
  return seen
}

/** `runtime` when the package is reachable from a runtime edge, else `build-only`. */
export function classifyReach(pkg: string, reachable: Set<string>): Reach {
  return reachable.has(pkg) ? 'runtime' : 'build-only'
}
