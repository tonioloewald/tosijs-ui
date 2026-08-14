import * as path from 'path'

/**
 * Return the first `docPaths` entry that overlaps `outputDir` (the same
 * directory, or either nested inside the other), or null if none overlap.
 *
 * `buildSite()` runs `rm -rf <outputDir>` before it extracts docs, so an overlap
 * means the source docs get deleted *before* they're read — silently producing
 * an empty site with no error. Callers throw an actionable message instead.
 */
export function findOutputDirOverlap(
  docPaths: string[],
  outputDir: string,
  root = '.'
): string | null {
  // Compare as directory prefixes (trailing separator) so '/docs' doesn't
  // falsely match '/docs-site', while genuine nesting ('/docs' vs '/docs/api')
  // and exact matches still do.
  const withSep = (p: string) => (p.endsWith(path.sep) ? p : p + path.sep)
  const out = withSep(path.resolve(root, outputDir))
  for (const docPath of docPaths) {
    const resolved = withSep(path.resolve(root, docPath))
    if (resolved.startsWith(out) || out.startsWith(resolved)) return docPath
  }
  return null
}

/**
 * Where the hydration bundle is built, and whether it then has to be copied into the site.
 *
 * Defaults to the site output. It used to be `dist` unconditionally — the LIBRARY tree —
 * and only the `.js` was copied out, stranding the sourcemap in a directory the project
 * publishes and commits but never serves (tosijs-ui#69). `bundleOutDir` is the opt-in for
 * projects whose bundle is itself a published artifact.
 *
 * Returns `copyToPublic: false` when the two coincide: copying a file onto itself with `cp`
 * truncates it, which would silently ship an empty bundle.
 */
export function resolveBundleDir(
  bundleOutDir: string | undefined,
  publicDir: string,
  root = '.'
): { dir: string; copyToPublic: boolean } {
  const dir = bundleOutDir ? path.resolve(root, bundleOutDir) : publicDir
  return { dir, copyToPublic: dir !== publicDir }
}
