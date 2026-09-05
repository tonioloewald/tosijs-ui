/*
Does an EXISTING host config actually serve what we just built? (tosijs-ui#134)

`host: 'firebase'` scaffolds a `firebase.json` for a fresh project and — correctly — keeps its
hands off an existing one. The gap was that it then checked nothing: if `hosting.public` names
a different directory than `outputDir`, `buildSite` writes one place and `firebase deploy`
publishes another. Both commands succeed. The site goes live serving whatever was in that
directory last.

Reported by tjs-lang, whose `firebase.json` says `"public": ".demo"` against a default
`outputDir` of `docs`. They had already been bitten by the sibling of this — Cloud Functions
running an eight-releases-old `tjs-lang` for months, because publishing to npm and deploying to
Firebase are separate acts and nothing compared them.

Pure, because the shape has more edge cases than it looks:

  - `hosting` may be an OBJECT or an ARRAY (multi-site projects).
  - `public` may be ABSENT — framework-aware hosting uses `source` instead, and comparing
    against a directory we did not build would be a false positive.
  - paths may be spelled `./docs`, `docs`, or `docs/`.

A false alarm here is worse than the silence it replaces: it would fire on every build of a
correctly-configured multi-site project, and the first thing anyone does with a warning that is
usually wrong is stop reading warnings.
*/

/** Normalise a config path for comparison: `./docs/` and `docs` are the same directory. */
const normalizeDir = (p: string): string =>
  p.replace(/^\.\//, '').replace(/\/+$/, '')

export interface HostConfigMismatch {
  /** every `hosting.public` we found, in file order */
  declared: string[]
  /** the directory this build actually wrote */
  built: string
}

/**
 * `null` when there is nothing to complain about — which includes "cannot tell".
 *
 * Returns a mismatch only when EVERY declared `public` disagrees with `outputDir`. A
 * multi-site config that serves the built directory from any of its targets is fine.
 */
export function firebasePublicMismatch(
  firebaseJson: string,
  outputDir: string
): HostConfigMismatch | null {
  let parsed: any
  try {
    parsed = JSON.parse(firebaseJson)
  } catch {
    return null // not ours to diagnose; `firebase` itself will complain
  }
  const hosting = parsed?.hosting
  if (!hosting) return null
  const entries = Array.isArray(hosting) ? hosting : [hosting]
  const declared = entries
    .map((h: any) => h?.public)
    .filter((p: unknown): p is string => typeof p === 'string')
  // No `public` anywhere — framework-aware hosting, or a config we do not understand.
  if (declared.length === 0) return null
  const built = normalizeDir(outputDir)
  if (declared.some((p) => normalizeDir(p) === built)) return null
  return { declared, built }
}
