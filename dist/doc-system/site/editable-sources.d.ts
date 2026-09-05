/** Absolute paths the source editor may read or write, from the doc corpus. */
export declare function editableSourcePaths(corpus: Array<{
    path?: string;
}> | null | undefined, projectRoot: string): Set<string>;
/**
 * May the editor touch this resolved path?
 *
 * Takes the already-root-confined path, so this is the SECOND gate rather than a replacement
 * for the first — `resolveInRepo` still runs, and a path that escapes the root never reaches
 * here.
 */
export declare function mayEditSource(resolved: string | null, allowed: Set<string>): boolean;
