import type { ExampleTab } from '../example-policy.js';
export interface PageGlobalsConfig {
    liveExamples?: 'auto' | 'opt-in' | 'no-code';
    exampleConsole?: boolean;
    exampleTabs?: ExampleTab[];
    dialects?: string[];
}
/**
 * A site config switch set to a value nothing reads, or null. Each silently fell back to its
 * default: `liveExamples: 'nocode'` ran every example on a site meant to run none (under a CSP
 * that was the point), and `kind: 'Book'` built a documentation site (1.17.0 review).
 */
export declare function siteSwitchProblem(config: {
    liveExamples?: string;
    kind?: string;
}): string | null;
export declare function pageGlobalsHead(config: PageGlobalsConfig): string;
