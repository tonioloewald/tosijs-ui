export interface HostConfigMismatch {
    /** every `hosting.public` we found, in file order */
    declared: string[];
    /** the directory this build actually wrote */
    built: string;
}
/**
 * `null` when there is nothing to complain about — which includes "cannot tell".
 *
 * Returns a mismatch only when EVERY declared `public` disagrees with `outputDir`. A
 * multi-site config that serves the built directory from any of its targets is fine.
 */
export declare function firebasePublicMismatch(firebaseJson: string, outputDir: string): HostConfigMismatch | null;
