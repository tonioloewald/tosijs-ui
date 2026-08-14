/**
 * Return the first `docPaths` entry that overlaps `outputDir` (the same
 * directory, or either nested inside the other), or null if none overlap.
 *
 * `buildSite()` runs `rm -rf <outputDir>` before it extracts docs, so an overlap
 * means the source docs get deleted *before* they're read — silently producing
 * an empty site with no error. Callers throw an actionable message instead.
 */
export declare function findOutputDirOverlap(docPaths: string[], outputDir: string, root?: string): string | null;
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
export declare function resolveBundleDir(bundleOutDir: string | undefined, publicDir: string, root?: string): {
    dir: string;
    copyToPublic: boolean;
};
