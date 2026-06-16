export interface EnsureSectionsOptions {
    /** path to the generated corpus (e.g. demo/docs.json) */
    docsJsonPath: string;
    /** directory for auto-created section docs (e.g. src/docs) */
    sectionsDir: string;
    /** re-run doc extraction so docsJsonPath reflects on-disk changes */
    reExtract: () => void;
}
export declare function ensureSections(opts: EnsureSectionsOptions): void;
