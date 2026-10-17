/** Formats a data folder may hold. Text only: the endpoint takes and returns strings. */
export declare const DATA_EXTENSIONS: readonly [".json", ".jsonc", ".json5", ".ndjson", ".txt", ".csv", ".tsv", ".yaml", ".yml", ".toml"];
/** The largest save accepted, in bytes. A level is kilobytes; this stops a runaway client. */
export declare const MAX_DATA_BYTES: number;
export interface EditableDataOptions {
    /** Folders, relative to the project root. */
    dirs: string[];
    /** Extensions to allow, from DATA_EXTENSIONS. Default `['.json']`. */
    extensions?: string[];
    /** Commit each save to git, so every save is a version. Default false. */
    commit?: boolean;
}
export interface DataStore {
    root: string;
    /** Real paths of the folders, and the names they were configured as. */
    dirs: {
        real: string;
        name: string;
    }[];
    extensions: string[];
    commit: boolean;
}
/** The folder setting, checked and resolved, or null when the project has none. Throws. */
export declare function resolveDataStore(setting: string[] | EditableDataOptions | undefined, root: string): DataStore | null;
/**
 * The absolute path a client's file name may be read or written at, or the reason it may not.
 * `file` is project-relative (`static/levels/ocean.json`).
 */
export declare function resolveDataFile(store: DataStore, file: unknown): {
    path: string;
    rel: string;
} | {
    refused: string;
};
/** Why `content` may not be saved as `rel`, or null. JSON must parse: a half-edit is not a level. */
export declare function dataContentProblem(rel: string, content: unknown): string | null;
/** Write through a temporary file and a rename, so a reader never sees half a file. */
export declare function writeDataFile(target: string, content: string): void;
/** Every editable file in the named folders, project-relative, newest first. */
export declare function listDataFiles(store: DataStore): {
    file: string;
    size: number;
    modified: string;
}[];
/** Whether `root` is in a git work tree, for `commit: true` to be checked at launch. */
export declare function isGitWorkTree(root: string): boolean;
/**
 * Commit this one file, leaving anything else staged as it was. The commit hash, or null when
 * the save changed nothing. Repository hooks run, as they would for any commit.
 */
export declare function commitDataFile(store: DataStore, rel: string, savedBy: string): Promise<string | null>;
/** One file's committed versions, newest first. */
export declare function dataHistory(store: DataStore, rel: string, limit?: number): Promise<{
    commit: string;
    date: string;
    author: string;
    subject: string;
}[]>;
/** A file as it was at `commit`, or null if the commit is not a hash or lacks the file. */
export declare function readDataAt(store: DataStore, rel: string, commit: string): Promise<string | null>;
