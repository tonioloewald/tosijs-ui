export declare class DataStoreError extends Error {
    status: number;
    constructor(message: string, status: number);
}
/** Every editable file, project-relative, newest first. */
export declare function listData(): Promise<{
    files: {
        file: string;
        size: number;
        modified: string;
    }[];
}>;
/** A file's text, or parsed JSON with `json: true`; `at` reads it as of a commit. */
export declare function readData(file: string, options: {
    at?: string;
    json: true;
}): Promise<any>;
export declare function readData(file: string, options?: {
    at?: string;
    json?: false;
}): Promise<string>;
/** Save a file: a string as it is, anything else as formatted JSON. */
export declare function saveData(file: string, content: unknown): Promise<{
    ok: true;
    file: string;
    commit?: string | null;
    commitError?: string;
}>;
/** A file's committed versions, newest first. */
export declare function dataHistory(file: string): Promise<{
    commit: string;
    date: string;
    author: string;
    subject: string;
}[]>;
