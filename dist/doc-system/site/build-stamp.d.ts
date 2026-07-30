export interface BuildStamp {
    /** the tosijs-ui version that generated this site */
    generator: string;
    /** the project's name, from site config */
    site?: string;
    /** short commit hash the site was built from, when available */
    commit?: string;
    /** ISO-8601 commit timestamp, when available */
    commitTime?: string;
}
/** Injectable git seam for tests. Returns '' when the command can't run. */
export type GitReader = (args: string[]) => Promise<string>;
/**
 * Collect build identity. Git fields are omitted (not blank) when unavailable, so
 * `version.json` never asserts something it doesn't know.
 */
export declare function gatherBuildStamp(opts?: {
    generator: string;
    site?: string;
    git?: GitReader;
}): Promise<BuildStamp>;
/** Serialize for `/version.json` (trailing newline so the file is diff-friendly). */
export declare function serializeBuildStamp(stamp: BuildStamp): string;
