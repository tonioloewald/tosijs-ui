declare global {
    var Bun: any;
}
export interface AssetStampResult {
    /** the stamp to put in `?v=` */
    stamp: string;
    /** inputs that were named but not present — a build defect, never silent */
    missing: string[];
    /** true when nothing existed to hash and the fallback was used */
    usedFallback: boolean;
}
/**
 * Hash the assets the stamp guards.
 *
 * Every named input that is missing is reported in `missing` — it is not skipped quietly.
 * A missing input means the stamp does not cover that asset, which is precisely the #151
 * failure: the file changes, the URL does not, and the browser serves what it cached.
 *
 * Returns the fallback only when NOTHING existed to hash (an early build with no assets yet),
 * because falling back to the version is the bug this replaced: `package.json` does not change
 * while you work, so `hydrate.js?v=0.2.0` is byte-identical across every rebuild and the page
 * keeps executing the bundle it cached hours ago — through edits, through reloads.
 */
export declare function computeAssetStamp(paths: string[], fallback: string): Promise<AssetStampResult>;
/**
 * The message for a named-but-missing input. Separate so the test asserts the real string
 * rather than a paraphrase of it.
 */
export declare function missingStampInputWarning(missing: string[]): string;
