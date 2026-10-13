import type { SiteConfig } from './site-config.js';
export interface RestampResult {
    /** the stamp now in every page */
    stamp: string;
    /** the stamp `buildSite` had written */
    previous: string;
    /** pages that carried a stamp */
    pages: number;
    /** pages whose stamp changed (0 when the bundle was not actually replaced) */
    changed: number;
}
/** The hydration entry `buildSite` emitted for a `bundleEntry`, if there is one. */
export declare function hydrateEntryIn(publicDir: string): string | undefined;
/**
 * What is wrong with the bundle the pages will load, or null. `source` is the text of every
 * script the pages hydrate from.
 */
export declare function servedBundleProblem(source: string, scriptName: string, docsHaveExamples: boolean): string | null;
/**
 * Re-stamp a built site from the assets actually on disk, and check the hydration bundle.
 * Call it after replacing `/iife.js` (or whatever `scriptUrl` names) in `outputDir`.
 *
 * Throws when no page carries a stamp (the build did not run, or `outputDir` is wrong): a
 * restamp that silently did nothing is the failure it exists to prevent. A bundle that does
 * not register the doc system is a warning, and fails under `strict: true`, as in
 * `buildSite`.
 */
export declare function restampSite(config: SiteConfig): Promise<RestampResult>;
