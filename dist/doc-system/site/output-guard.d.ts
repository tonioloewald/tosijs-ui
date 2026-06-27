/**
 * Return the first `docPaths` entry that overlaps `outputDir` (the same
 * directory, or either nested inside the other), or null if none overlap.
 *
 * `buildSite()` runs `rm -rf <outputDir>` before it extracts docs, so an overlap
 * means the source docs get deleted *before* they're read — silently producing
 * an empty site with no error. Callers throw an actionable message instead.
 */
export declare function findOutputDirOverlap(docPaths: string[], outputDir: string, root?: string): string | null;
