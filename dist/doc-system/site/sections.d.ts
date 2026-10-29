export interface EnsureSectionsOptions {
    /** path to the generated corpus (e.g. demo/docs.json) */
    docsJsonPath: string;
    /** directory for auto-created section docs (e.g. src/docs) */
    sectionsDir: string;
    /** re-run doc extraction so docsJsonPath reflects on-disk changes */
    reExtract: () => void;
    /**
     * The site's `docPaths`. A stub outside all of them would never be read back, so none is
     * written there (#3584).
     */
    docPaths?: string[];
    /**
     * Whether this build may create stubs. A watch rebuild may not: a parent that is missing for
     * a second, mid-rename, is not a missing parent (#3584). Default true.
     */
    createStubs?: boolean;
    /** where warnings and the list of created files go (default console.warn) */
    log?: (message: string) => void;
}
/** True when `dir` is one of `docPaths`, or inside one. */
export declare function insideDocPaths(dir: string, docPaths: string[]): boolean;
export declare function ensureSections(opts: EnsureSectionsOptions): void;
