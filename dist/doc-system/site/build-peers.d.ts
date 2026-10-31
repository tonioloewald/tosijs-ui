/**
 * The install command for each build peer that cannot be resolved, or none.
 * `resolve` is injectable for tests.
 */
export declare function missingBuildPeers(moduleDir: string, resolve?: (name: string, from: string) => string): string[];
export declare function missingBuildPeersMessage(missing: string[]): string;
