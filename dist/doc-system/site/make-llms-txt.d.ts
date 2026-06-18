export interface LlmsTxtMeta {
    name?: string;
    description?: string;
    /** site origin, used for the Docs link */
    baseUrl?: string;
    /** project links — `github` / `npm` (or any) become Source/npm links */
    projectLinks?: Record<string, string | undefined>;
    /** optional framing line(s) under the description */
    tagline?: string;
}
export declare function generateLlmsTxt(outputPath: string, meta?: LlmsTxtMeta): void;
