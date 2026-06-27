/** A doc as it appears in the extracted corpus (docs.json). */
interface CorpusDoc {
    title?: string;
    filename: string;
    text?: string;
    description?: string;
    hidden?: boolean;
}
interface LlmsEntry {
    title: string;
    description: string;
    /** rendered-doc URL (corpus mode) or dist/*.js path (legacy scan) */
    link: string;
}
export interface LlmsTxtMeta {
    name?: string;
    description?: string;
    /** site origin, used for the Docs link and to make page links absolute */
    baseUrl?: string;
    /** project links — `github` / `npm` (or any) become Source/npm links */
    projectLinks?: Record<string, string | undefined>;
    /** optional framing line(s) under the description */
    tagline?: string;
}
/**
 * Build entries from the extracted corpus — every doc that was actually
 * extracted (`.md`, `.ts`/`.js`/`.css` doc comments, auto-created sections),
 * linking to its rendered URL. This is what the build uses: it reflects the real
 * docs and needs no `dist/` library output.
 */
export declare function entriesFromCorpus(corpus: CorpusDoc[], meta: LlmsTxtMeta): LlmsEntry[];
/**
 * Write an `llms.txt` index. Pass the extracted `corpus` (the build does) to
 * index every doc by its rendered URL; omit it to fall back to the legacy
 * `src/*.ts`-with-`dist/*.js` scan.
 */
export declare function generateLlmsTxt(outputPath: string, meta?: LlmsTxtMeta, corpus?: CorpusDoc[]): void;
export {};
