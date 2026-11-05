export interface BoundedResult {
    stdout: string;
    stderr: string;
    code: number | null;
    timedOut: boolean;
}
export declare function runBounded(argv: string[], opts: {
    cwd?: string;
    timeoutMs: number;
}): Promise<BoundedResult>;
