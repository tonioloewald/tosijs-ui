export interface BuildStamp {
    /** the tosijs-ui version that generated this site */
    generator: string;
    /** the project's name, from site config */
    site?: string;
    /** short commit hash the site was built from, when available */
    commit?: string;
    /** ISO-8601 commit timestamp, when available */
    commitTime?: string;
    /**
     * Hash of the rest of the output. Lets the next build tell "nothing changed" from
     * "changed" without keeping the old tree, so an unchanged site is not restamped
     * (tosijs-ui#122). See `stampToWrite`.
     */
    contentHash?: string;
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
export declare function stampToWrite(previousJson: string | null, fresh: BuildStamp, contentHash: string): string;
/**
 * Hash every file under `dir` except `version.json`, path-sensitively.
 *
 * Paths are sorted so the digest does not depend on directory iteration order, and each
 * path is fed in beside its bytes so that MOVING a file changes the hash — content-only
 * hashing would call a renamed page an unchanged site.
 *
 * Best-effort like the rest of this module: an unreadable file contributes its path alone
 * rather than failing a build over a stamp.
 */
export declare function hashOutput(dir: string, readdir: (d: string) => Promise<string[]>, readFile: (p: string) => Promise<Uint8Array | null>): Promise<string>;
