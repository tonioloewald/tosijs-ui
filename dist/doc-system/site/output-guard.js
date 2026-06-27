import * as path from 'path';
/**
 * Return the first `docPaths` entry that overlaps `outputDir` (the same
 * directory, or either nested inside the other), or null if none overlap.
 *
 * `buildSite()` runs `rm -rf <outputDir>` before it extracts docs, so an overlap
 * means the source docs get deleted *before* they're read — silently producing
 * an empty site with no error. Callers throw an actionable message instead.
 */
export function findOutputDirOverlap(docPaths, outputDir, root = '.') {
    // Compare as directory prefixes (trailing separator) so '/docs' doesn't
    // falsely match '/docs-site', while genuine nesting ('/docs' vs '/docs/api')
    // and exact matches still do.
    const withSep = (p) => (p.endsWith(path.sep) ? p : p + path.sep);
    const out = withSep(path.resolve(root, outputDir));
    for (const docPath of docPaths) {
        const resolved = withSep(path.resolve(root, docPath));
        if (resolved.startsWith(out) || out.startsWith(resolved))
            return docPath;
    }
    return null;
}
