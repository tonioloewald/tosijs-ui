export declare class SingleSourceError extends Error {
    constructor(message: string);
}
interface SourceDoc {
    text: string;
    filename: string;
    path?: string;
    title?: string;
    /** the text a book binds, when it differs from `text` (the site's) */
    bookText?: string;
}
/** Is this JSON directive single-sourcing rather than doc metadata? */
export declare function isSingleSourceDirective(json: string): boolean;
export interface ResolveInsetsOptions {
    /**
     * Real paths of the directories a fragment file may be read from: the ones extraction
     * walked. `extractDocs` supplies this. Without it no file inset is read at all.
     */
    fragmentDirs?: ReadonlySet<string>;
    /** read a fragment file; injectable so the rule is testable without a filesystem */
    readFile?: (absolutePath: string) => string | undefined;
    /** resolve symlinks; injectable for the same reason */
    realPath?: (absolutePath: string) => string;
}
export declare function resolveInsets(docs: SourceDoc[], options?: ResolveInsetsOptions): number;
export declare function splitConditions(text: string, where?: string): {
    site: string;
    book: string;
};
export declare function assembleCorpus(docs: SourceDoc[], options?: ResolveInsetsOptions): void;
export {};
